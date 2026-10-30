/* ================= export per LMU: TGA, zip, PNG, controllo prima dell'export ================= */
/* Modulo isolato: vede solo quello che riceve. use = costanti e funzioni degli altri moduli,
   live = variabili condivise che altri moduli cambiano (si leggono e scrivono come live.nome). */
LL_MODULES.export=function(use,live){
"use strict";
const {
  N,NN,$,el,tick,perfLog,pnow,wcall,mk,S,toast,setStatus,
  busy,fillsReady,drawScene,regionPalette,drawRegions,hhmm
}=use;
async function getDownloads(){try{return window.claude&&claude.use?await claude.use('downloads'):null;}catch(e){return null;}}
async function saveFile(name,data){
  const dl=await getDownloads();
  if(dl){try{await dl.save({filename:name,data});toast('Salvato: '+name);}catch(e){toast(e&&e.code==='declined'?'Salvataggio annullato.':'Non riesco a salvare: '+(e&&e.message||e));}return;}
  const blob=data instanceof Blob?data:new Blob([data]),a=el('a',{href:URL.createObjectURL(blob),download:name});document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},5000);
}
// lettura dei pixel qui, conversione in TGA (e pulizia dei materiali) nel worker
async function canvasTGA(cv,pal){const t=pnow(),d=cv.getContext('2d',{willReadFrequently:true}).getImageData(0,0,N,N).data;const tr=pnow()-t;
  const r=await wcall('tga',{buf:d.buffer,pal},[d.buffer]);perfLog(pal?'Export: TGA materiali':'Export: TGA livrea',tr+r.ms,`lettura pixel ${Math.round(tr)} ms + worker ${Math.round(r.ms)} ms`);return r.tga;}
function renderTo(fn){const c=mk(N,N),x=c.getContext('2d');fn(x);return c;}
// TGA 32 bit: scambio rosso e blu lavorando su 32 bit alla volta (molto più veloce che byte per byte)
function toTGA(c){const d=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,N,N).data,src=new Uint32Array(d.buffer,d.byteOffset,NN),px=new Uint32Array(NN);
  for(let i=0;i<NN;i++){const v=src[i];px[i]=(v&0x0000FF00)|((v&0xFF)<<16)|((v>>>16)&0xFF)|0xFF000000;}
  const t=new Uint8Array(18+NN*4);t[2]=2;t[12]=N&255;t[13]=N>>8;t[14]=N&255;t[15]=N>>8;t[16]=32;t[17]=0x28;t.set(new Uint8Array(px.buffer),18);return t;}
const crcT=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(u){let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=crcT[(c^u[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0;}
async function deflate(u){if(typeof CompressionStream==='undefined')return null;try{const cs=new CompressionStream('deflate-raw'),w=cs.writable.getWriter();w.write(u);w.close();return new Uint8Array(await new Response(cs.readable).arrayBuffer());}catch(e){return null;}}
async function makeZip(files){
  const parts=[],cds=[];let off=0;
  for(const f of files){
    const nb=new TextEncoder().encode(f.name),crc=crc32(f.data),comp=await deflate(f.data),method=comp?8:0,body=comp||f.data;
    const lh=new DataView(new ArrayBuffer(30));lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);lh.setUint16(6,0x0800,true);lh.setUint16(8,method,true);lh.setUint16(12,0x21,true);lh.setUint32(14,crc,true);lh.setUint32(18,body.length,true);lh.setUint32(22,f.data.length,true);lh.setUint16(26,nb.length,true);
    const cd=new DataView(new ArrayBuffer(46));cd.setUint32(0,0x02014b50,true);cd.setUint16(4,20,true);cd.setUint16(6,20,true);cd.setUint16(8,0x0800,true);cd.setUint16(10,method,true);cd.setUint16(14,0x21,true);cd.setUint32(16,crc,true);cd.setUint32(20,body.length,true);cd.setUint32(24,f.data.length,true);cd.setUint16(28,nb.length,true);cd.setUint32(42,off,true);
    parts.push(lh.buffer,nb,body);cds.push(cd.buffer,nb);off+=30+nb.length+body.length;
  }
  const cdSize=cds.reduce((s,b)=>s+(b.byteLength??b.length),0),eo=new DataView(new ArrayBuffer(22));
  eo.setUint32(0,0x06054b50,true);eo.setUint16(8,files.length,true);eo.setUint16(10,files.length,true);eo.setUint32(12,cdSize,true);eo.setUint32(16,off,true);
  return new Blob([...parts,...cds,eo.buffer],{type:'application/zip'});
}
$('#bPng').onclick=async()=>{busy('Preparo il PNG…');await fillsReady();const c=renderTo(drawScene),b=await new Promise(r=>c.toBlob(r,'image/png'));busy(null);await saveFile('livrea_4096.png',b);};
async function buildLmuFiles(quiet){
  const busy_=quiet?()=>{}:busy;busy_('Preparo la livrea…');await fillsReady();const t0=pnow();
  let t=pnow();const cv=renderTo(drawScene);perfLog('Export: disegno livrea',pnow()-t);
  const files=[{name:'customskin.tga',data:await canvasTGA(cv,null)}];
  if(hasRegion()){busy_('Preparo i materiali…');
    t=pnow();const rc=renderTo(x=>drawRegions(x,true,true));perfLog('Export: disegno materiali',pnow()-t);
    files.push({name:'customskin_region.tga',data:await canvasTGA(rc,regionPalette())});}
  perfLog('Export: totale',pnow()-t0,quiet?'automatico':'');
  return files;
}
$('#bLmu').onclick=async()=>{
  if(!S.layers.length&&!live.wireCv){toast('Apri prima un template.');return;}
  if(!await exportCheck({zip:true}))return;
  try{const files=await buildLmuFiles();busy('Comprimo…');await tick();const z=await makeZip(files);busy(null);await saveFile('livrea_lmu.zip',z);live.dirty=false;exportDone({zip:true,files:files.map(f=>f.name)});}
  catch(e){busy(null);toast('Esportazione non riuscita: '+e.message,5000);}
};
let expCheck=true;try{expCheck=localStorage.getItem('liverylab-expcheck')!=='0';}catch(e){}
const expCheckOn=()=>expCheck;
const doneShown=new Set();
const hasRegion=()=>!!(live.regionCv||S.layers.some(l=>l.mat&&l.mat!=='keep')||(S.baseMat&&S.baseMat!=='keep'));
const exportNames=()=>['customskin.tga'].concat(hasRegion()?['customskin_region.tga']:[]);
function miniCv(fn){const T=144,c=mk(T,T),x=c.getContext('2d');x.save();x.scale(T/N,T/N);fn(x);x.restore();return c;}
// finestra semplice: risolve con il valore del pulsante premuto (null se chiusa)
function dialog(title,body,buttons){return new Promise(res=>{
  let m;const close=v=>{m.remove();document.removeEventListener('keydown',kd,true);res(v);};
  const kd=e=>{if(e.key==='Escape'){e.stopPropagation();close(null);}};
  m=el('div',{class:'modal',role:'dialog','aria-modal':'true','aria-label':title},el('div',{class:'mbox sm'},el('h2',{},title),...body,
    el('div',{class:'row',style:'justify-content:flex-end;gap:8px;margin-top:12px'},...buttons.map(([lab,v,pri])=>el('button',{class:'btn'+(pri?' pri':''),onclick:()=>close(v)},lab)))));
  document.addEventListener('keydown',kd,true);document.body.append(m);const f=m.querySelector('.btn.pri');if(f)f.focus();});}
async function exportCheck(o){
  if(!expCheck)return true;
  await fillsReady();
  const names=exportNames(),own=S.layers.filter(l=>!l.fromTemplate).length,warn=[];
  if(!own&&S.baseMat==='keep')warn.push('Non hai ancora aggiunto niente: esporti il template così com’è.');
  if(!live.regionCv)warn.push('Il template non ha una mappa materiali: '+(names.length>1?'nel file materiali conta solo quello che hai assegnato tu.':'esporto solo la livrea, senza file dei materiali.'));
  if(o.exist&&o.exist.length)warn.push(`Nella cartella ci sono già ${o.exist.join(' e ')}: verranno sostituiti.`);
  const files=el('div',{class:'xfiles'},el('div',{class:'xfile'},miniCv(x=>drawScene(x,false)),el('div',{},el('b',{},'customskin.tga'),el('small',{},'La livrea · 4096 × 4096, TGA 32 bit'))),
    names.length>1?el('div',{class:'xfile'},miniCv(x=>drawRegions(x,false)),el('div',{},el('b',{},'customskin_region.tga'),el('small',{},'I materiali · nero Base, rosso Carbonio, verde Opzione 1, blu Opzione 2, bianco Adesivi'))):null);
  const chk=el('input',{type:'checkbox'});
  const v=await dialog('Prima di esportare',[
    el('div',{class:'xkv'},el('span',{},'Template'),el('div',{},S.tplName||'nessuno'),el('span',{},'Livelli tuoi'),el('div',{},String(own)),
      el('span',{},'Destinazione'),el('div',{},o.zip?'livrea_lmu.zip nei Download del browser':`cartella “${o.dir}”`)),
    el('h3',{},'File che creo'),files,...warn.map(w=>el('p',{class:'xwarn'},'⚠ '+w)),
    o.zip?el('p',{class:'note'},'Dopo il download estrai lo zip e copia i file nella cartella della livrea (UserData/Liveries nella cartella di LMU).'):null,
    el('label',{class:'chk'},chk,'Non mostrare più questo controllo')],[['Annulla',false],[o.zip?'Scarica lo zip':'Esporta nel gioco',true,true]]);
  if(v&&chk.checked){expCheck=false;try{localStorage.setItem('liverylab-expcheck','0');}catch(e){}}
  return !!v;
}
function exportDone(o){
  const key=(o.zip?'zip':o.dir)+'|'+S.tplName;
  setStatus(o.zip?'Zip pronto alle '+hhmm():`Esportato in ${o.dir} alle ${hhmm()}`);
  if(doneShown.has(key)){toast(`Fatto: ${o.files.join(' e ')} ${o.zip?'nello zip':'scritti in “'+o.dir+'”'}. Nello showroom premi RELOAD.`,4500);return;}
  doneShown.add(key);
  dialog('Livrea esportata',[el('p',{},o.zip?`Lo zip contiene ${o.files.join(' e ')}.`:`${o.files.join(' e ')} ${o.files.length>1?'sono stati scritti':'è stato scritto'} in “${o.dir}”.`),
    el('h3',{},'Per vederla in Le Mans Ultimate'),
    el('ol',{},o.zip?el('li',{},'Estrai lo zip e copia i file nella cartella della livrea, in UserData/Liveries.'):null,
      el('li',{},'Apri lo showroom e scegli la stessa auto del template'+(S.tplName?` (${S.tplName.replace(/\.psd$/i,'')})`:'')+'.'),
      el('li',{},'Seleziona la livrea personalizzata.'),
      el('li',{},'Premi RELOAD: lo showroom rilegge i file. Dopo ogni nuova esportazione basta premere di nuovo RELOAD.')),
    el('p',{class:'note'},'Ricorda di salvare anche il progetto (Ctrl+S) per poterlo modificare in futuro.')],[['Ho capito',true,true]]);
}
return {
  saveFile,renderTo,toTGA,buildLmuFiles,expCheckOn,exportNames,exportCheck,exportDone
};
};

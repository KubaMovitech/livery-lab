/* ================= salvataggio automatico nel browser ================= */
let asTimer=null,asBusy=false,wireBlob=null,regionBlob=null;
function scheduleSave(){clearTimeout(asTimer);asTimer=setTimeout(autosave,2500);}
const canvasBlob=c=>new Promise(r=>c.toBlob(r,'image/png'));
function urlToBlob(u){const [h,b64]=u.split(','),mime=(h.match(/:(.*?);/)||[,'image/png'])[1],bin=atob(b64),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return new Blob([a],{type:mime});}
const MAXREC=12;
async function flushSave(){clearTimeout(asTimer);if(!(S.layers.length||wireCv))return;let n=0;while(asBusy&&n++<50)await new Promise(r=>setTimeout(r,50));await autosave();}
// miniatura della livrea (con le linee del template) per la lista dei lavori recenti; rifatta al massimo ogni 20 s
async function makeThumb(){
  const T=256,c=mk(T,T),x=c.getContext('2d');x.save();x.scale(T/N,T/N);drawScene(x,false);
  if(wireCv){x.globalAlpha=.55;x.globalCompositeOperation=wireDark?'difference':'multiply';x.drawImage(wireCv,0,0,N,N);}
  x.restore();return new Promise(r=>c.toBlob(r,'image/jpeg',.8));
}
const userLayers=st=>{try{return (typeof st==='string'?JSON.parse(st):st).layers.filter(l=>!l.fromTemplate).length;}catch(e){return 0;}};
function idbReq(d,mode,fn){return new Promise((res,rej)=>{const t=d.transaction('autosave',mode),st=t.objectStore('autosave');let out;const q=fn(st);if(q)q.onsuccess=()=>{out=q.result;};t.oncomplete=()=>res(out);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error);});}
async function autosave(){
  if(asBusy){scheduleSave();return;}
  if(!S.layers.length&&!wireCv)return;
  const d=lib||await idb();if(!d||!d.objectStoreNames.contains('autosave'))return;
  asBusy=true;const ta=pnow();
  try{
    const imgs={};
    for(const id in images){if(!usesImg(id))continue;const im=images[id];
      if(!im.blob)im.blob=im.url?urlToBlob(im.url):await canvasBlob(im.img instanceof HTMLCanvasElement?im.img:(()=>{const c=mk(im.w,im.h);c.getContext('2d').drawImage(im.img,0,0);return c;})());
      imgs[id]={blob:im.blob,name:im.name};}
    if(wireCv&&!wireBlob)wireBlob=await canvasBlob(wireCv);
    if(regionCv&&!regionBlob)regionBlob=await canvasBlob(regionCv);
    if(!thumbBlob||Date.now()-thumbAt>20000){try{await fillsReady();thumbBlob=await makeThumb();thumbAt=Date.now();}catch(e){}}
    const state=snapshot();
    const rec={when:Date.now(),tpl:S.tplName,name:S.projName||'',state,images:imgs,wire:wireCv?wireBlob:null,wireDark,region:regionCv?regionBlob:null,thumb:thumbBlob,unsaved:projDirty,saved:projSaved,n:userLayers(state),
      ref:REF.src&&REF.blob?{blob:REF.blob,name:REF.name,cfg:{on:REF.on,op:REF.op,above:REF.above,dx:REF.dx,dy:REF.dy,sc:REF.sc}}:null};
    await idbReq(d,'readwrite',st=>st.put(rec,docId));perfLog('Salvataggio automatico',pnow()-ta);
    // tengo solo i più recenti
    const all=await listAutosaves(true);for(const r of all.slice(MAXREC))await idbReq(d,'readwrite',st=>st.delete(r.key));
    $('#saved').textContent=`Copia nel browser alle ${hhmm()}`;$('#saved').title='Salvataggio automatico: lo ritrovi in File → Lavori recenti anche dopo aver chiuso il browser.';
  }catch(e){$('#saved').textContent='Salvataggio automatico non riuscito';}
  finally{asBusy=false;}
}
// tutti i salvataggi automatici, dal più recente; con all=false solo quelli con qualcosa dentro
async function listAutosaves(all){
  const d=lib||await idb();if(!d||!d.objectStoreNames.contains('autosave'))return [];
  const out=[];
  await new Promise(res=>{try{const q=d.transaction('autosave').objectStore('autosave').openCursor();q.onsuccess=()=>{const c=q.result;if(!c){res();return;}out.push(Object.assign({key:c.key},c.value));c.continue();};q.onerror=()=>res();}catch(e){res();}});
  out.sort((a,b)=>(b.when||0)-(a.when||0));
  return all?out:out.filter(r=>(r.n??userLayers(r.state))>0||r.wire);
}
async function readAutosave(){const l=await listAutosaves(false);return l[0]||null;}
async function deleteAutosave(key){const d=lib||await idb();if(d)try{await idbReq(d,'readwrite',st=>st.delete(key));}catch(e){}}
async function resumeAutosave(rec){
  try{
    if(rec.key!==docId)await flushSave();
    busy('Riprendo il lavoro…');await tick();
    for(const k in images)delete images[k];
    for(const id in rec.images){const b=rec.images[id].blob,img=await loadImg(await blobToURL(b));images[id]={img,w:img.naturalWidth,h:img.naturalHeight,url:null,blob:b,name:rec.images[id].name};}
    regionCv=null;regionNP=null;wireCv=null;LAB=null;wireBlob=rec.wire||null;regionBlob=rec.region||null;
    if(rec.region){const i=await loadImg(await blobToURL(rec.region)),c=mk(N,N);c.getContext('2d').drawImage(i,0,0,N,N);regionCv=c;}
    if(rec.wire){const i=await loadImg(await blobToURL(rec.wire)),c=mk(N,N),x=c.getContext('2d');x.drawImage(i,0,0,N,N);wireCv=c;wireDark=rec.wireDark!==false;await analyze(x.getImageData(0,0,N,N).data);}
    if(rec.ref&&rec.ref.blob){const f=new File([rec.ref.blob],rec.ref.name||'riferimento.png',{type:rec.ref.blob.type||'image/png'});await loadRef(f,rec.ref.cfg||{});}
    else{REF.src=null;REF.blob=null;refBake();}
    docId=rec.key||docId;thumbBlob=rec.thumb||null;thumbAt=Date.now();projHandle=null;projSaved=!!rec.saved;
    S.tplName=rec.tpl||null;S.projName=rec.name||'';restore(rec.state);hist=[];histPos=-1;hist.push(snapshot());histPos=0;updateUndo();dirty=false;projDirty=rec.unsaved!==false;updUnsaved();fit();busy(null);
    $('#resumeBox').hidden=true;closeRecent();if(FS_OK)loadOutDir();
    if(S.tplName)$('#docinfo').textContent=S.tplName;projTitle();guideAfterTemplate();
    toast('Lavoro ripreso'+(projDirty?': ha modifiche non ancora salvate nel file del progetto (Ctrl+S).':'.'),4000);
  }catch(e){busy(null);toast('Non riesco a riprendere il lavoro salvato: '+e.message,5000);}
}
const recDate=w=>new Date(w).toLocaleString('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
function recentCards(list,box,after){
  box.innerHTML='';
  for(const r of list){
    const n=r.n??userLayers(r.state),cur=r.key===docId&&(wireCv||S.layers.length);
    const img=r.thumb?el('img',{alt:'',src:URL.createObjectURL(r.thumb)}):el('div',{class:'ph'},'nessuna anteprima');
    const card=el('div',{class:'rcard'},img,el('b',{title:r.name||r.tpl||''},r.name||(r.tpl||'livrea').replace(/\.psd$/i,'').replace(/^Template_/,'')),
      el('small',{},(r.name&&r.tpl?r.tpl.replace(/\.psd$/i,'')+' · ':'')+`${n} ${n===1?'livello tuo':'livelli tuoi'} · ${recDate(r.when)}`),
      r.unsaved?el('small',{class:'unsv'},'● con modifiche non salvate nel progetto'):null,
      el('button',{class:'btn sm'+(cur?'':' pri'),disabled:cur||false,onclick:()=>resumeAutosave(r)},cur?'Aperto ora':'Riprendi'),
      cur?null:el('button',{class:'rdel',title:'Elimina dai lavori recenti','aria-label':'Elimina dai lavori recenti',onclick:async()=>{if(!confirm('Elimino questo lavoro dai recenti? Non si può annullare.'))return;await deleteAutosave(r.key);after();}},'✕'));
    box.append(card);}
}
async function offerResume(){
  const list=(await listAutosaves(false)).filter(r=>r.key!==docId||!(wireCv||S.layers.length));
  const box=$('#resumeBox');if(!list.length){box.hidden=true;return;}
  recentCards(list,$('#recentGrid'),offerResume);box.hidden=false;
}
let recentModal=null;
function closeRecent(){if(recentModal){recentModal.remove();recentModal=null;}}
async function openRecent(){
  if(dirty||projDirty)await flushSave();
  const list=await listAutosaves(false);closeRecent();
  const grid=el('div',{class:'recent-grid'});
  recentModal=el('div',{class:'modal',role:'dialog','aria-modal':'true','aria-label':'Lavori recenti',onclick:e=>{if(e.target===recentModal)closeRecent();}},
    el('div',{class:'mbox'},el('div',{class:'row',style:'justify-content:space-between;margin:0 0 6px'},el('h2',{},'Lavori recenti'),el('button',{class:'btn sm',onclick:closeRecent},'Chiudi')),
      el('p',{class:'note'},`Gli ultimi ${MAXREC} lavori vengono salvati da soli nel browser mentre lavori, ognuno con la sua anteprima. Per conservarli per sempre o spostarli su un altro PC usa File → Salva progetto.`),
      list.length?grid:el('p',{class:'note'},'Ancora nessun lavoro salvato.')));
  recentCards(list,grid,openRecent);document.body.append(recentModal);
}


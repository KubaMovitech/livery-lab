/* ================= stato ================= */
// nomi come in LMU (Impostazioni materiali): cosa sono Base, Opzione 1 e Opzione 2 (metallizzato, cromo, wrap, adesivi…) si sceglie nel gioco
const MATS=[['keep','Non cambia',null],['paint','Base (nero)','#000000'],['carbon','Carbonio (rosso)','#FF0000'],['chrome','Opzione 1 (verde)','#00FF00'],['wrap','Opzione 2 (blu)','#0000FF'],['sticker','Adesivi (bianco)','#FFFFFF']];
const MATCOL=Object.fromEntries(MATS.map(m=>[m[0],m[2]]));
/* materiali personalizzati: un colore esatto della mappa region (es. #000400) con un nome e un colore per vederlo nella vista Materiali.
   Stanno nel progetto (S.customMats) e si ricordano anche per i prossimi lavori. */
const STDMATS=MATS.length,MATVIEW={};
const matName=k=>{const m=MATS.find(m=>m[0]===k);return m?m[1]:'Non cambia';};
const matCol=(k,hard)=>hard?MATCOL[k]:(MATVIEW[k]||MATCOL[k]);
const normHex=h=>{h=String(h||'').trim().replace(/^#/,'');if(/^[0-9a-f]{3}$/i.test(h))h=h.split('').map(c=>c+c).join('');return /^[0-9a-f]{6}$/i.test(h)?'#'+h.toUpperCase():null;};
const custKey=hex=>'x'+hex.slice(1).toLowerCase();
/* PART: nella mappa dei materiali un livello si può disegnare in due passate, corpo ('body') e contorno ('edge'),
   quando il contorno ha un materiale suo (l.outMat) */
let PART=null;
const OUTMATS=[['same','Come il livello'],...MATS.filter(m=>m[0]!=='keep').map(m=>[m[0],m[1]]),['keep','Nessuno (non cambia)']];
function syncMats(){
  MATS.splice(STDMATS);for(const k in MATVIEW)delete MATVIEW[k];
  for(const k in MATCOL)if(k[0]==='x')delete MATCOL[k];
  for(const c of S.customMats||[]){MATS.push([c.k,`${c.n} (${c.hex})`,c.hex]);MATCOL[c.k]=c.hex;if(c.hl&&c.show)MATVIEW[c.k]=c.show;}
  OUTMATS.splice(0,OUTMATS.length,['same','Come il livello'],...MATS.filter(m=>m[0]!=='keep').map(m=>[m[0],m[1]]),['keep','Nessuno (non cambia)']);
  const lg=document.getElementById('legend');if(lg)lg.innerHTML='';
}
let savedCust=[];try{savedCust=JSON.parse(localStorage.getItem('liverylab-custmats')||'[]');}catch(e){}
function rememberCust(){const m=new Map(savedCust.map(c=>[c.k,c]));for(const c of S.customMats)m.set(c.k,c);savedCust=[...m.values()];try{localStorage.setItem('liverylab-custmats',JSON.stringify(savedCust));}catch(e){}}
function addCustomMat(hex,n,show,quiet){
  hex=normHex(hex);if(!hex){toast('Colore non valido: scrivilo come #000400.');return null;}
  if(['#000000','#FF0000','#00FF00','#0000FF','#FFFFFF'].includes(hex)){toast('Questo colore è già uno dei materiali standard.');return null;}
  const k=custKey(hex);let c=S.customMats.find(c=>c.k===k);
  if(!c){c={k,hex,n:n||'Materiale '+hex,show:show||'#C9A24B'};S.customMats.push(c);}
  syncMats();rememberCust();if(!quiet){commit();refreshAll();}return c;
}
function hasOutline(l){return (l.type==='fill'&&l.edge&&l.edge.on&&l.edge.width>0)||(l.type==='shape'&&((l.stroke&&l.stroke.on&&l.stroke.width>0)||(l.pin&&l.pin.on)))||(l.type==='text'&&l.outline&&l.outline.on&&l.outline.width>0)||(l.type==='image'&&l.fx&&l.fx.outline&&l.fx.outline.on&&l.fx.outline.width>0);}
const sepOutline=l=>!!(l.outMat&&l.outMat!=='same'&&hasOutline(l));
function outMatCtl(l){return selectCtl('Materiale del contorno',OUTMATS,()=>l.outMat||'same',v=>{l.outMat=v;});}
const PATS=[['none','Tinta unita'],['grad','Sfumatura a 2 colori'],['grad3','Camaleonte a 3 colori'],['carbon','Carbonio'],['stripes','Righe'],['hex','Esagoni'],['dots','Mezzitoni'],['chevron','Chevron'],['checker','Scacchi'],['camo','Mimetico'],
  ['pin','Gessato'],['grid','Griglia'],['zigzag','Zigzag'],['waves','Onde'],['tri','Triangoli'],['splinter','Schegge'],['pixel','Mimetico digitale'],['tiger','Tigrato'],['scales','Squame'],['diamond','Rombi'],['flake','Glitter'],['brushed','Metallo spazzolato'],['speed','Linee di velocità'],['veins','Venature'],['arteries','Arterie'],['circuit','Circuito'],['topo','Topografico'],['image','Da un’immagine']];
const PAL=['#F4F5F0','#FFFFFF','#1B1D20','#6D6D6D','#C0202B','#006B3C','#0B3D91','#C9A24B','#E0A100','#E86A10'];
const S={
  layers:[], sel:null, base:'#F4F5F0', axis:2048, tool:'select', uid:1,
  wire:{on:true,op:0.85}, view:{z:0.2,x:0,y:0}, mode:'livery', preview:false,
  act:{fstyle:'fill', ew:10, color:'#C0202B', pat:'none', bg:'#1B1D20', scale:1, angle:0, c2:'#006B3C', c3:'#C9A24B', gangle:0}, brush:40, eraser:60,
  tplName:null, projName:'', customMats:[], msel:[], snap:true, groups:{}, baseMat:'keep', basePaint:{pat:'none',bg:'#1B1D20',scale:1,angle:0},
};
const images={};          // id -> {img (canvas|img), w, h, url, name}
let wireCv=null, wireDark=true, regionCv=null, regionNP=null;
let LAB=null;             // etichette dei pezzi
let hist=[],histPos=-1,dirty=false;
// docId: ogni lavoro ha il suo salvataggio automatico; projDirty: modifiche non ancora salvate nel file del progetto
let docId='d'+Date.now(),projDirty=false,projSaved=false;
const newDoc=()=>{docId='d'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);thumbAt=0;thumbBlob=null;projSaved=false;};
let thumbAt=0,thumbBlob=null;
let drawing=null, drag=null, hover=null;
const FONTS=['Barlow Condensed','Oswald','Playfair Display','Pacifico','Arial','Georgia','Courier New'];
let myFonts=[];   // font caricati dall'utente: {id,name,blob}

function toast(m,ms=2800){document.querySelectorAll('.toast').forEach(x=>x.remove());const t=el('div',{class:'toast',role:'status'},m);document.body.append(t);setTimeout(()=>t.remove(),ms);}
function setStatus(s){$('#status').textContent=s;}
function busy(msg){const b=$('#busy');if(msg){b.textContent=msg;b.hidden=false;}else b.hidden=true;}
function newId(){return 'L'+(S.uid++);}
const getLayer=id=>S.layers.find(l=>l.id===id), selLayer=()=>getLayer(S.sel);
function snapshot(){return JSON.stringify({customMats:S.customMats,layers:S.layers,base:S.base,baseMat:S.baseMat,basePaint:S.basePaint,projName:S.projName,groups:S.groups,axis:S.axis,uid:S.uid,sel:S.sel});}
function commit(){hist=hist.slice(0,histPos+1);hist.push(snapshot());if(hist.length>80)hist.shift();histPos=hist.length-1;dirty=true;if(!projDirty){projDirty=true;updUnsaved();}updateUndo();afterChange();}
function projClean(saved){projDirty=false;if(saved)projSaved=true;updUnsaved();}
function updUnsaved(){const u=$('#unsaved');if(!u)return;const has=!!(wireCv||S.layers.length);u.hidden=!has||(!projDirty&&!projSaved);
  u.className=projDirty?'warn':'ok';u.textContent=projDirty?'● Modifiche non salvate':'✓ Progetto salvato';
  u.title=projDirty?'Le modifiche sono al sicuro nel browser (Lavori recenti), ma non ancora nel file del progetto. Clic o Ctrl+S per salvarlo.':'Il file del progetto contiene tutte le modifiche.';
  if(typeof projTitle==='function')projTitle();}
function afterChange(){if(typeof scheduleSave==='function')scheduleSave();if(typeof scheduleGame==='function')scheduleGame();}
function restore(js){const o=JSON.parse(js);S.customMats=o.customMats||[];syncMats();S.layers=o.layers;S.base=o.base;S.baseMat=o.baseMat||'keep';S.projName=o.projName||S.projName||'';S.basePaint=o.basePaint||{pat:'none',bg:'#1B1D20',scale:1,angle:0};S.groups=o.groups||{};S.axis=o.axis;S.uid=Math.max(S.uid,o.uid);S.sel=getLayer(o.sel)?o.sel:null;S.msel=(S.msel||[]).filter(id=>getLayer(id)&&id!==S.sel);refreshAll();}
function undo(){if(histPos>0){histPos--;restore(hist[histPos]);updateUndo();afterChange();}}
function redo(){if(histPos<hist.length-1){histPos++;restore(hist[histPos]);updateUndo();afterChange();}}
function updateUndo(){$('#bUndo').disabled=histPos<=0;$('#bRedo').disabled=histPos>=hist.length-1;}
window.addEventListener('beforeunload',e=>{if(typeof autosave==='function'&&(dirty||projDirty))autosave();if(dirty&&S.layers.length){e.preventDefault();e.returnValue='';}});


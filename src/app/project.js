/* ================= progetto: salva e apri (file .json) ================= */
function canvasURL(c){return c.toDataURL('image/png');}
function imgURL(im){if(im.url)return im.url;if(im.img instanceof HTMLCanvasElement)return canvasURL(im.img);const c=mk(im.w,im.h);c.getContext('2d').drawImage(im.img,0,0);return canvasURL(c);}
/* progetto con nome e cartella: in Chrome/Edge scegli dove salvarlo e poi Ctrl+S lo riscrive lì; altrove chiede il nome e lo scarica */
let projHandle=null;const SAVE_FS='showSaveFilePicker' in window&&(()=>{try{return window.top===window.self;}catch(e){return false;}})();
const safeName=n=>(n||'livrea').replace(/[\\/:*?"<>|]+/g,'-').replace(/\.json$/i,'').trim()||'livrea';
function projTitle(){document.title=(projDirty&&(wireCv||S.layers.length)?'● ':'')+(S.projName?S.projName+' · ':'')+'Livery Lab per LMU';const d=$('#docinfo');if(d&&S.projName)d.textContent=S.projName+(S.tplName?' · '+S.tplName:'');}
async function projJSON(){
  busy('Preparo il progetto…');await tick();
  const imgs={};for(const id in images){const im=images[id];if(!usesImg(id))continue;imgs[id]={url:imgURL(im),name:im.name};}
  const proj={app:'liverylab',v:2,docId,state:JSON.parse(snapshot()),images:imgs,wire:wireCv?canvasURL(wireCv):null,wireDark,region:regionCv?canvasURL(regionCv):null,tpl:S.tplName,
    ref:REF.src&&REF.blob?{url:await blobToURL(REF.blob),name:REF.name,cfg:{on:REF.on,op:REF.op,above:REF.above,dx:REF.dx,dy:REF.dy,sc:REF.sc}}:null};
  busy(null);return JSON.stringify(proj);
}
async function saveProject(asNew){
  try{
    if(SAVE_FS){
      if(asNew||!projHandle){
        const sug=safeName(S.projName||(S.tplName?S.tplName.replace(/\.psd$/i,'').replace(/^Template_/,''):'livrea'))+'.json';
        const opt={suggestedName:sug,id:'lmu-proj',types:[{description:'Progetto Livery Lab',accept:{'application/json':['.json']}}]};if(projHandle)opt.startIn=projHandle;
        projHandle=await window.showSaveFilePicker(opt);}
      const data=await projJSON(),w=await projHandle.createWritable();await w.write(data);await w.close();
      S.projName=projHandle.name.replace(/\.json$/i,'');dirty=false;projClean(true);buildDoc();scheduleSave();toast('Salvato: '+projHandle.name+(asNew?'':' (Ctrl+S per salvare di nuovo qui)'));return;}
    if(asNew||!S.projName){const v=prompt('Nome del progetto',S.projName||'livrea');if(!v)return;S.projName=safeName(v);}
    const data=await projJSON();await saveFile(safeName(S.projName)+'.json',data);dirty=false;projClean(true);buildDoc();scheduleSave();
  }catch(e){busy(null);if(e&&e.name==='AbortError')return;toast('Non riesco a salvare: '+(e&&e.message||e),5000);}
}
$('#bSave').onclick=()=>saveProject(false);
$('#bSaveAs').onclick=()=>saveProject(true);
$('#bOpen').onclick=async()=>{
  if('showOpenFilePicker' in window&&SAVE_FS){try{const [h]=await window.showOpenFilePicker({id:'lmu-proj',types:[{description:'Progetto Livery Lab',accept:{'application/json':['.json']}}]});await openProject(await h.getFile(),h);}catch(e){if(e&&e.name!=='AbortError')toast('Non riesco ad aprire: '+e.message,5000);}return;}
  $('#fProj').click();};
$('#fProj').addEventListener('change',async()=>{const f=$('#fProj').files[0];$('#fProj').value='';if(f)await openProject(f,null);});
async function openProject(f,handle){
  try{
    busy('Apro il progetto…');await tick();const o=JSON.parse(await f.text());if(o.app!=='liverylab')throw new Error('non è un progetto di Livery Lab');
    await flushSave();if(o.docId)docId=o.docId;else newDoc();thumbAt=0;
    for(const k in images)delete images[k];
    for(const id in o.images){const img=await loadImg(o.images[id].url);images[id]={img,w:img.naturalWidth,h:img.naturalHeight,url:o.images[id].url,name:o.images[id].name};}
    regionCv=null;regionNP=null;wireCv=null;LAB=null;wireBlob=null;regionBlob=null;
    if(o.region){const i=await loadImg(o.region),c=mk(N,N);c.getContext('2d').drawImage(i,0,0,N,N);regionCv=c;}
    if(o.wire){const i=await loadImg(o.wire),c=mk(N,N),x=c.getContext('2d');x.drawImage(i,0,0,N,N);wireCv=c;wireDark=o.wireDark!==false;await analyze(x.getImageData(0,0,N,N).data);}
    if(o.ref&&o.ref.url){const b=urlToBlob(o.ref.url);await loadRef(new File([b],o.ref.name||'riferimento.png',{type:b.type}),o.ref.cfg||{});}
    S.tplName=o.tpl||null;restore(JSON.stringify(o.state));S.projName=(f.name||'').replace(/\.json$/i,'')||S.projName;projHandle=handle||null;
    hist=[];histPos=-1;commit();dirty=false;projClean(true);fit();busy(null);projTitle();guideAfterTemplate();toast('Progetto aperto: '+S.projName+(handle?' (Ctrl+S salva qui)':''));
  }catch(e){busy(null);toast('File non valido: '+e.message,5000);}
}

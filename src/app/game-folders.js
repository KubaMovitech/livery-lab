/* ================= cartelle del gioco (Chrome/Edge, pagina aperta come file) ================= */
const FS_OK=('showDirectoryPicker' in window)&&(()=>{try{return window.top===window.self;}catch(e){return false;}})();
let gameDir=null;const outDirs={};const owOk=new Set();
async function hGet(k){const d=lib||await idb();if(!d||!d.objectStoreNames.contains('handles'))return null;return new Promise(res=>{try{const q=d.transaction('handles').objectStore('handles').get(k);q.onsuccess=()=>res(q.result||null);q.onerror=()=>res(null);}catch(e){res(null);}});}
async function hSet(k,v){const d=lib||await idb();if(!d||!d.objectStoreNames.contains('handles'))return;try{d.transaction('handles','readwrite').objectStore('handles').put(v,k);}catch(e){}}
async function perm(h,mode){if(!h)return false;try{const o={mode};if(await h.queryPermission(o)==='granted')return true;return await h.requestPermission(o)==='granted';}catch(e){return false;}}
async function pickGameDir(){
  try{toast('Scegli la cartella “Le Mans Ultimate” (di solito in steamapps/common): da lì prendo i template e ci salvo le livree.',6000);
    const h=await window.showDirectoryPicker({id:'lmu-game',mode:'readwrite'});gameDir=h;await hSet('game',h);buildDoc();toast('Cartella collegata: '+h.name);return h;}
  catch(e){if(e&&e.name!=='AbortError')toast('Non riesco a collegare la cartella: '+e.message);return null;}
}
async function sub(dir,name){for await(const [n,h] of dir.entries()){if(h.kind==='directory'&&n.toLowerCase()===name.toLowerCase())return h;}return null;}
async function findTplDir(dir){
  if(/^liverytemplates$/i.test(dir.name))return dir;
  const sup=await sub(dir,'Support');if(sup){const lt=await sub(sup,'LiveryTemplates');if(lt)return lt;}
  const lt=await sub(dir,'LiveryTemplates');if(lt)return lt;
  // ricerca limitata
  const q=[[dir,0]];let seen=0;
  while(q.length&&seen<3000){const [d,depth]=q.shift();for await(const [n,h] of d.entries()){seen++;if(h.kind!=='directory')continue;if(/^liverytemplates$/i.test(n))return h;if(depth<3)q.push([h,depth+1]);}}
  return null;
}
async function listPSD(dir,base='',depth=0,out=[]){
  for await(const [n,h] of dir.entries()){
    if(h.kind==='file'&&/\.psd$/i.test(n))out.push({name:n,path:base+n,h});
    else if(h.kind==='directory'&&depth<4)await listPSD(h,base+n+'/',depth+1,out);
  }
  return out;
}
async function openGameTemplates(){
  if(!gameDir||!(await perm(gameDir,'read'))){const h=await pickGameDir();if(!h)return;}
  busy('Cerco i template…');await tick();
  try{
    const tdir=await findTplDir(gameDir);
    const files=tdir?await listPSD(tdir):await listPSD(gameDir,'',2);
    busy(null);
    const L=$('#pkList');L.innerHTML='';
    if(!files.length){L.append(el('p',{class:'note'},tdir?'Nella cartella LiveryTemplates non trovo file PSD.':'Non trovo la cartella Support/LiveryTemplates qui dentro. Collega la cartella di installazione di Le Mans Ultimate.'),el('button',{class:'btn sm',onclick:()=>{$('#picker').hidden=true;pickGameDir().then(h=>{if(h)openGameTemplates();});}},'Scegli un’altra cartella'));}
    else{files.sort((a,b)=>a.path.localeCompare(b.path));
      L.append(el('p',{class:'note'},`${files.length} template in ${tdir?tdir.name:gameDir.name}`));
      for(const f of files)L.append(el('button',{class:'pk',onclick:async()=>{
        $('#picker').hidden=true;
        if(S.layers.some(l=>!l.fromTemplate)&&!confirm('Aprire un nuovo template sostituisce il lavoro attuale. Continuo?'))return;
        try{const file=await f.h.getFile();await importPSD(await file.arrayBuffer(),f.name);await loadOutDir();}catch(e){busy(null);toast('Non riesco ad aprire il file: '+e.message,5000);}
      }},f.name.replace(/\.psd$/i,''),el('small',{},f.path)));}
    $('#picker').hidden=false;$('#empty').hidden=true;
  }catch(e){busy(null);toast('Errore leggendo la cartella: '+e.message,5000);}
}
async function loadOutDir(){if(S.tplName&&!outDirs[S.tplName]){const h=await hGet('out:'+S.tplName);if(h&&h.kind)outDirs[S.tplName]=h;}buildDoc();if(gameDir&&!S.tplName)return;}
async function pickOutDir(){
  if(!S.tplName){toast('Apri prima un template.');return null;}
  try{toast('Scegli la cartella dove salvare customskin.tga e customskin_region.tga per quest’auto.',6000);
    const h=await window.showDirectoryPicker({id:'lmu-livery',mode:'readwrite',startIn:gameDir||'documents'});
    outDirs[S.tplName]=h;await hSet('out:'+S.tplName,h);buildDoc();return h;}
  catch(e){if(e&&e.name!=='AbortError')toast('Non riesco a usare la cartella: '+e.message);return null;}
}
async function liveriesDir(ask){
  if(!gameDir)return null;
  try{if(ask){if(!(await perm(gameDir,'readwrite')))return null;}else if(await gameDir.queryPermission({mode:'readwrite'})!=='granted')return null;}catch(e){return null;}
  try{const ud=await sub(gameDir,'UserData');if(!ud)return null;let lv=await sub(ud,'Liveries');if(!lv)lv=await ud.getDirectoryHandle('Liveries',{create:true});return lv;}catch(e){return null;}
}
async function targetDir(ask){
  const ov=S.tplName&&outDirs[S.tplName];
  if(ov){try{if(ask?await perm(ov,'readwrite'):await ov.queryPermission({mode:'readwrite'})==='granted')return ov;}catch(e){}}
  return liveriesDir(ask);
}
async function useDefaultDir(){if(!S.tplName)return;delete outDirs[S.tplName];await hSet('out:'+S.tplName,null);buildDoc();toast('Le livree tornano in UserData/Liveries.');}
async function exists(dir,name){try{await dir.getFileHandle(name);return true;}catch(e){return false;}}
async function writeFile(dir,name,data){const fh=await dir.getFileHandle(name,{create:true});const w=await fh.createWritable();await w.write(data);await w.close();}
async function exportToGame(){
  if(!S.layers.length&&!wireCv){toast('Apri prima un template.');return;}
  if(!S.tplName)S.tplName='livrea';
  await loadOutDir();
  let dir=await targetDir(true);
  if(!dir&&!gameDir){const h=await pickGameDir();if(h)dir=await targetDir(true);}
  if(!dir){toast('Nella cartella collegata non trovo UserData: scegli tu dove salvare la livrea.',5000);dir=await pickOutDir();if(!dir||!(await perm(dir,'readwrite')))return;}
  {const ex=[];for(const n of exportNames())if(await exists(dir,n))ex.push(n);
    if(!await exportCheck({dir:dir.name,exist:ex}))return;if(expCheck)owOk.add(S.tplName+'|'+dir.name);}
  try{
    const files=await buildLmuFiles();busy(null);
    const key=S.tplName+'|'+dir.name;
    if(!owOk.has(key)){const ex=[];for(const f of files)if(await exists(dir,f.name))ex.push(f.name);
      if(ex.length&&!confirm(`Nella cartella “${dir.name}” ci sono già ${ex.join(' e ')}. Li sostituisco con la nuova livrea?`))return;owOk.add(key);}
    busy('Scrivo i file nel gioco…');await tick();
    for(const f of files)await writeFile(dir,f.name,f.data);
    busy(null);dirty=false;setStatus(`Esportato in ${dir.name} alle ${new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}`);
    exportDone({dir:dir.name,files:files.map(f=>f.name)});
  }catch(e){busy(null);toast('Non riesco a scrivere i file: '+e.message,6000);}
}
if(FS_OK){
  document.querySelectorAll('.gamebtn').forEach(b=>b.hidden=false);
  $('#bTplGame').onclick=$('#bTpl3').onclick=openGameTemplates;$('#bToGame').onclick=exportToGame;
  (async()=>{gameDir=await hGet('game');buildDoc();})();
}
$('#pkClose').onclick=()=>{$('#picker').hidden=true;$('#empty').hidden=!!(wireCv||S.layers.length);};

let autoGame=false;try{autoGame=localStorage.getItem('liverylab-autogame')==='1';}catch(e){}
let agTimer=null,agBusy=false;
const hhmm=()=>new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
function scheduleGame(){if(!FS_OK||!autoGame)return;clearTimeout(agTimer);agTimer=setTimeout(()=>{if('requestIdleCallback' in window)requestIdleCallback(()=>autoExport(),{timeout:3000});else autoExport();},6000);}
async function autoExport(){
  if(agBusy||drag||drawing){scheduleGame();return;}
  const dir=await targetDir(false);if(!dir)return;
  if(!owOk.has(S.tplName+'|'+dir.name))return;
  agBusy=true;
  try{setStatus('Aggiorno il gioco…');await tick();const files=await buildLmuFiles(true);for(const f of files)await writeFile(dir,f.name,f.data);setStatus(`Gioco aggiornato alle ${hhmm()}`);}
  catch(e){setStatus('Aggiornamento del gioco non riuscito: '+e.message);}
  finally{agBusy=false;}
}


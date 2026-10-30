/* ================= libreria: loghi (IndexedDB) e palette ================= */
let lib=null,libItems=[],logoQ='';
function idb(){return new Promise((res)=>{try{const r=indexedDB.open('liverylab',3);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('logos'))d.createObjectStore('logos',{keyPath:'id'});if(!d.objectStoreNames.contains('handles'))d.createObjectStore('handles');if(!d.objectStoreNames.contains('autosave'))d.createObjectStore('autosave');};r.onsuccess=()=>res(r.result);r.onerror=()=>res(null);}catch(e){res(null);}});}
async function libLoad(){lib=await idb();if(!lib)return;try{libItems=await new Promise((res,rej)=>{const q=lib.transaction('logos').objectStore('logos').getAll();q.onsuccess=()=>res(q.result||[]);q.onerror=rej;});}catch(e){libItems=[];}
  myFonts=libItems.filter(i=>i.kind==='font');libItems=libItems.filter(i=>i.kind!=='font');for(const f of myFonts)await registerFont(f);buildLib();}
async function registerFont(f){try{const ff=new FontFace(f.name,await f.blob.arrayBuffer());await ff.load();document.fonts.add(ff);fontReady[f.name]=true;if(!FONTS.includes(f.name))FONTS.push(f.name);requestDraw();return true;}catch(e){return false;}}
async function addFontFile(file){
  const name=file.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').trim()||'Font';
  const it={id:'f'+Date.now()+Math.random().toString(36).slice(2,6),kind:'font',name,blob:file};
  if(!(await registerFont(it))){toast('Non riesco a leggere questo font: usa un file .ttf, .otf o .woff.',5000);return;}
  myFonts.push(it);if(lib){try{lib.transaction('logos','readwrite').objectStore('logos').put(it);}catch(e){}}
  const l=selLayer();if(l&&l.type==='text'){l.font=name;commit();refreshAll();}
  buildLib();toast(`Font “${name}” pronto: lo trovi in Carattere nelle proprietà dei testi.`);
}
async function fontDel(id){const f=myFonts.find(x=>x.id===id);myFonts=myFonts.filter(x=>x.id!==id);if(f){const i=FONTS.indexOf(f.name);if(i>=7)FONTS.splice(i,1);}if(lib){try{lib.transaction('logos','readwrite').objectStore('logos').delete(id);}catch(e){}}buildLib();}
async function libAdd(file){const it={id:'g'+Date.now()+Math.random().toString(36).slice(2,6),name:file.name.replace(/\.[^.]+$/,''),blob:file};libItems.push(it);
  if(lib){try{await new Promise((res,rej)=>{const t=lib.transaction('logos','readwrite');t.objectStore('logos').put(it);t.oncomplete=res;t.onerror=rej;});}catch(e){toast('Non riesco a salvare il logo nella libreria del browser.');}}buildLib();}
async function saveLayerToLib(l){const im=images[l.imgId];if(!im)return;const c=mk(im.w,im.h);c.getContext('2d').drawImage(im.img,0,0,im.w,im.h);
  const b=await new Promise(r=>c.toBlob(r,'image/png'));const name=(prompt('Nome del logo nella libreria',l.name)||'').trim();if(!name)return;
  await libAdd(new File([b],name+'.png',{type:'image/png'}));toast('“'+name+'” salvato in Libreria → I tuoi loghi.');}
async function libDel(id){libItems=libItems.filter(i=>i.id!==id);if(lib){try{lib.transaction('logos','readwrite').objectStore('logos').delete(id);}catch(e){}}buildLib();}
let photoPal=[];try{photoPal=JSON.parse(localStorage.getItem('liverylab-pal')||'[]');}catch(e){}
async function extractPalette(file){
  const img=await loadImg(await blobToURL(file)),c=mk(64,64),x=c.getContext('2d');x.drawImage(img,0,0,64,64);const d=x.getImageData(0,0,64,64).data,px=[];
  for(let i=0;i<d.length;i+=4)if(d[i+3]>128)px.push([d[i],d[i+1],d[i+2]]);
  const k=6;let cen=[];for(let i=0;i<k;i++)cen.push(px[Math.floor((i+.5)/k*px.length)].slice());
  let asg=new Array(px.length).fill(0);
  for(let it=0;it<10;it++){
    for(let i=0;i<px.length;i++){let b=0,bd=1e9;for(let j=0;j<k;j++){const dd=(px[i][0]-cen[j][0])**2+(px[i][1]-cen[j][1])**2+(px[i][2]-cen[j][2])**2;if(dd<bd){bd=dd;b=j;}}asg[i]=b;}
    const s=cen.map(()=>[0,0,0,0]);for(let i=0;i<px.length;i++){const q=s[asg[i]];q[0]+=px[i][0];q[1]+=px[i][1];q[2]+=px[i][2];q[3]++;}
    cen=s.map((q,j)=>q[3]?[q[0]/q[3],q[1]/q[3],q[2]/q[3]]:cen[j]);
  }
  const counts=cen.map((_,j)=>asg.filter(a=>a===j).length);
  photoPal=cen.map((c,j)=>({c:'#'+c.map(v=>Math.round(v).toString(16).padStart(2,'0')).join(''),n:counts[j]})).sort((a,b)=>b.n-a.n).map(o=>o.c);
  try{localStorage.setItem('liverylab-pal',JSON.stringify(photoPal));}catch(e){}buildLib();toast('Palette estratta: clic su un colore per usarlo.');
}
$('#fPhoto').addEventListener('change',()=>{const f=$('#fPhoto').files[0];$('#fPhoto').value='';if(f)extractPalette(f).catch(()=>toast('Foto non leggibile.'));});

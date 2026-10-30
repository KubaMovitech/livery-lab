/* ================= import: PSD ================= */
const STICKER_RE=/sticker|number|plate|board|class|logo|decal|banner|michelin|goodyear/i, GUIDE_RE=/disable\s*for\s*export|position/i;
function toCanvas(px){const c=mk(px.w,px.h);c.getContext('2d').putImageData(new ImageData(px.rgba,px.w,px.h),0,0);return c;}
let importing=false;
async function importPSD(buf,fname){
  if(importing){toast('Sto già aprendo un template: aspetta che finisca.');return;}
  importing=true;try{await importPSD_(buf,fname);}finally{importing=false;}
}
async function importPSD_(buf,fname){
  busy('Leggo il PSD…');const t0=pnow();
  let psd;try{const r=await wcall('psd',{buf},[buf],m=>busy(m));psd=r.psd;perfLog('PSD: lettura',r.ms[0],fname);perfLog('PSD: livelli in pixel',r.ms[1]);}catch(e){busy(null);toast('Non riesco ad aprire il PSD: '+e.message,5000);return;}
  if(psd.W!==N||psd.H!==N)toast(`Il template è ${psd.W}×${psd.H}: l’editor lavora a 4096, lo adatto.`,4000);
  busy('Preparo livelli, adesivi e materiali…');await tick();
  // nuova sessione: il lavoro precedente resta tra i recenti
  await flushSave();newDoc();S.projName='';projHandle=null;
  S.customMats=[];syncMats();
  S.layers=[];S.sel=null;S.groups={};S.baseMat='keep';S.basePaint={pat:'none',bg:'#1B1D20',scale:1,angle:0};for(const k in images)delete images[k];regionCv=null;regionNP=null;wireCv=null;LAB=null;wireBlob=null;regionBlob=null;
  const tl=pnow();let ly=pnow(),uvw=null,regCount=0,imp=0,baseFound=false,over=false;const rc=mk(N,N),rx=rc.getContext('2d');rx.fillStyle='#000';rx.fillRect(0,0,N,N);
  const hex=c=>'#'+c.map(v=>clamp(Math.round(v),0,255).toString(16).padStart(2,'0')).join('');
  for(const l of psd.layers){
    if(pnow()-ly>30){await new Promise(r=>setTimeout(r,0));ly=pnow();}
    if(l.isGroup||l.isDivider||l.adjust)continue;
    const inRegion=l.path.some(p=>/^region/i.test(p))||/^region/i.test(l.name);
    if(/^(uvw|wire)/i.test(l.name)||(l.blend==='scrn'&&/uv/i.test(l.name))){uvw=l;continue;}
    if(inRegion){const px=l.px;if(px){rx.drawImage(toCanvas(px),l.left,l.top);regCount++;}continue;}
    if(/^base colou?r/i.test(l.name)&&l.soco){S.base=hex(l.soco);baseFound=true;continue;}
    // il primo livello in basso, se è un colore unico su tutta la tela, è la base: diventa il “Colore base” modificabile
    if(!baseFound&&!S.layers.length){baseFound=true;const c=l.baseColor;if(c){S.base=hex(c);continue;}}
    const top=l.path[0]||l.name;
    // tutto quello che viene dopo il primo gruppo di adesivi/numeri sta sopra i livelli dell'utente; carrozzeria, carbonio e plastiche sotto
    if(!over&&STICKER_RE.test(top)&&!/carbon/i.test(top))over=true;
    const guide=GUIDE_RE.test(l.name)||l.path.some(p=>GUIDE_RE.test(p));
    const px=l.px;if(!px||!l.any)continue;
    const id='I'+(S.uid++),cv=toCanvas(px);images[id]={img:cv,w:px.w,h:px.h,url:null,name:l.name};
    const onTop=guide||(over&&!l.path.some(p=>/carbon/i.test(p)));
    for(const g of l.gids){const G=psd.groups[g];if(!S.groups[g])S.groups[g]={name:G.name,parent:G.parent,on:!G.hidden};}
    S.layers.push({id:newId(),type:'image',name:l.name,onTop,imgId:id,x:l.left+px.w/2,y:l.top+px.h/2,scale:1,rot:0,mirror:false,mirrorRot:true,
      visible:guide?!/mask|disable/i.test(l.name):!l.hidden,opacity:l.opacity/255,locked:true,mat:'keep',fromTemplate:true,gp:l.gids.slice(),guide:guide||undefined});imp++;
  }
  if(regCount){regionCv=rc;S.customMats=[];syncMats();
    // colori region del template diversi dai 5 standard (es. #000400): li tengo come materiali personalizzati, altrimenti l'export li appiattirebbe
    const d=rx.getImageData(0,0,N,N).data,cnt=new Map();for(let i=0;i<d.length;i+=4*97){if(d[i+3]<255)continue;const v=(d[i]<<16)|(d[i+1]<<8)|d[i+2];cnt.set(v,(cnt.get(v)||0)+1);}
    const STD=new Set([0,0xFF0000,0x00FF00,0x0000FF,0xFFFFFF]);
    for(const [v,n] of cnt)if(!STD.has(v)&&n>200){const h='#'+v.toString(16).padStart(6,'0').toUpperCase();const sv=savedCust.find(c=>c.hex===h);addCustomMat(h,sv?sv.n:'Dal template '+h,sv?sv.show:'#'+((v*2654435761)>>>8&0xFFFFFF).toString(16).padStart(6,'0'),true);}
  }
  perfLog('PSD: livelli e materiali',pnow()-tl,imp+' livelli');
  S.tplName=fname;
  if(uvw){
    const px=uvw.px;const c=mk(N,N);c.getContext('2d').drawImage(toCanvas(px),uvw.left,uvw.top);wireCv=c;wireDark=true;
    const data=c.getContext('2d').getImageData(0,0,N,N).data;await analyze(data);
  }else toast('Nel PSD non trovo il livello UVW: il riempimento dei pezzi non sarà disponibile.',5000);
  S.axis=2048;hist=[];histPos=-1;commit();dirty=false;projClean();refreshAll();fit();busy(null);guideAfterTemplate();
  perfLog('Template aperto (totale)',pnow()-t0,fname);
  $('#docinfo').textContent=`${fname} · ${imp} livelli del template · ${regCount?'materiali importati':'nessuna mappa materiali'}`;
  toast('Template aperto. Gli adesivi ufficiali sono bloccati al loro posto; i tuoi livelli vanno sotto o sopra, come vuoi.',4500);
}
async function importGuideImage(file){
  busy('Carico la guida…');await tick();if(!wireCv&&!S.layers.length)newDoc();
  let url;if(/\.tga$/i.test(file.name))url=await tgaToURL(await file.arrayBuffer());else url=URL.createObjectURL(file);
  const img=await loadImg(url);const c=mk(N,N),x=c.getContext('2d');x.drawImage(img,0,0,N,N);wireCv=c;wireBlob=null;
  const data=x.getImageData(0,0,N,N).data;let s=0;for(let i=0;i<data.length;i+=4*101)s+=data[i]+data[i+1]+data[i+2];wireDark=s/(data.length/(4*101)*3)<110;
  await analyze(data);S.tplName=file.name;refreshAll();fit();busy(null);toast('Guida caricata.');guideAfterTemplate();
}
function loadImg(url){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('immagine non leggibile'));i.src=url;});}
async function tgaToURL(buf){
  const b=new Uint8Array(buf),type=b[2],w=b[12]|b[13]<<8,h=b[14]|b[15]<<8,bpp=b[16],desc=b[17];
  if(![2,10].includes(type)||![24,32].includes(bpp))throw new Error('TGA non supportato');
  const by=bpp/8,out=new Uint8ClampedArray(w*h*4);let p=18+b[0],i=0;
  const put=(k,o)=>{const x=k%w,y=(k/w)|0,yy=(desc&0x20)?y:h-1-y,q=(yy*w+x)*4;out[q]=b[o+2];out[q+1]=b[o+1];out[q+2]=b[o];out[q+3]=by===4?b[o+3]:255;};
  if(type===2){for(let k=0;k<w*h;k++,p+=by)put(k,p);}else{while(i<w*h){const hd=b[p++],n=(hd&127)+1;if(hd&128){for(let j=0;j<n;j++)put(i++,p);p+=by;}else for(let j=0;j<n;j++){put(i++,p);p+=by;}}}
  const c=mk(w,h);c.getContext('2d').putImageData(new ImageData(out,w,h),0,0);return c.toDataURL();
}
$('#bTpl').onclick=$('#bTpl2').onclick=()=>$('#fTpl').click();
$('#fTpl').addEventListener('change',async()=>{
  const f=$('#fTpl').files[0];$('#fTpl').value='';if(!f)return;
  if(S.layers.some(l=>!l.fromTemplate)&&!confirm('Aprire un nuovo template sostituisce il lavoro attuale. Continuo?'))return;
  try{if(/\.psd$/i.test(f.name))await importPSD(await f.arrayBuffer(),f.name);else await importGuideImage(f);}catch(e){busy(null);toast('Errore: '+e.message,5000);}
});

/* trascinare file sulla tela: PSD/guida apre il template, le immagini diventano loghi */
{const st=$('#stage');let dz=null,depth=0;
  st.addEventListener('dragenter',e=>{if(![...(e.dataTransfer.types||[])].includes('Files'))return;e.preventDefault();depth++;if(!dz){dz=el('div',{class:'drop'},'Rilascia qui: PSD per il template, immagini per i loghi');st.append(dz);}});
  st.addEventListener('dragover',e=>{if(dz)e.preventDefault();});
  st.addEventListener('dragleave',()=>{if(--depth<=0&&dz){dz.remove();dz=null;depth=0;}});
  st.addEventListener('drop',async e=>{if(!dz)return;e.preventDefault();dz.remove();dz=null;depth=0;
    const fs=[...e.dataTransfer.files];
    if(wireCv&&fs.length===1&&/\.tga$/i.test(fs[0].name)){await loadRef(fs[0]);return;}
    const tpl=fs.find(f=>/\.(psd|tga)$/i.test(f.name));
    try{
      if(tpl){if(S.layers.some(l=>!l.fromTemplate)&&!confirm('Aprire un nuovo template sostituisce il lavoro attuale. Continuo?'))return;
        if(/\.psd$/i.test(tpl.name))await importPSD(await tpl.arrayBuffer(),tpl.name);else await importGuideImage(tpl);return;}
      if(!wireCv&&!S.layers.length&&fs.length===1&&/image/.test(fs[0].type)&&confirm('Uso questa immagine come guida (wireframe) del template? Annulla per aggiungerla come logo.')){await importGuideImage(fs[0]);return;}
      for(const f of fs)if(/^image\//.test(f.type)){await addImageBlob(f,f.name.replace(/\.[^.]+$/,''));if(lib)libAdd(f);}
    }catch(err){busy(null);toast('Errore: '+err.message,5000);}
  });}
/* trama da un'immagine: l'immagine si ripete come un tessuto */
function pickPatternImage(P){const i=el('input',{type:'file',accept:'image/*'});i.onchange=async()=>{const f=i.files[0];if(!f)return;const url=await blobToURL(f),img=await loadImg(url);
  const id='I'+(S.uid++);images[id]={img,w:img.naturalWidth,h:img.naturalHeight,url,name:f.name};P.pat='image';P.img=id;if(!P.scale||P.scale===1)P.scale=Math.min(1,400/Math.max(img.naturalWidth,img.naturalHeight));commit();refreshAll();};i.click();}
const usesImg=id=>S.layers.some(l=>l.imgId===id||(l.paint&&l.paint.img===id))||(S.basePaint&&S.basePaint.img===id);
/* Ctrl+V: un'immagine copiata (dal browser, da Paint, da uno screenshot) diventa un logo */
window.addEventListener('paste',async e=>{
  const tg=(e.target.tagName||'').toLowerCase();if(tg==='input'||tg==='textarea')return;
  const items=[...(e.clipboardData&&e.clipboardData.items||[])].filter(i=>i.type.startsWith('image/'));
  if(!items.length){const t=e.clipboardData&&e.clipboardData.getData('text');if(t&&t.trim()&&wireCv){e.preventDefault();const r=view.getBoundingClientRect(),c=s2w(r.width/2,r.height/2);ensureFont('Barlow Condensed');
    addLayer({type:'text',name:'Testo '+S.uid,text:t.trim().slice(0,80),x:clamp(c.x,0,N),y:clamp(c.y,0,N),size:180,font:'Barlow Condensed',color:S.act.color,bold:true,italic:false,rot:0,spacing:0,mirror:false,mirrorRot:true,outline:{on:false,color:'#FFFFFF',width:8},shadow:{on:false,color:'#000000',alpha:.6,blur:12,dx:8,dy:8}});setTool('select');toast('Testo incollato.');}return;}
  e.preventDefault();
  for(const it of items){const f=it.getAsFile();if(!f)continue;await addImageBlob(f,'Incollato '+S.uid);if(lib)libAdd(new File([f],'Incollato '+Date.now()+'.png',{type:f.type}));}
  toast('Immagine incollata: trascinala dove vuoi.');
});
/* riferimento: PNG, JPG o TGA (anche il customskin.tga di una livrea già fatta) */
function refPick(){const i=el('input',{type:'file',accept:'image/*,.tga'});i.onchange=()=>{if(i.files[0])loadRef(i.files[0]);};i.click();}
async function loadRef(file,cfg){
  try{busy('Carico il riferimento…');await tick();
    let url,blob=file;if(/\.tga$/i.test(file.name||'')&&!/^image\/(png|jpeg|webp)/.test(file.type||'')){url=await tgaToURL(await file.arrayBuffer());blob=urlToBlob(url);}else url=await blobToURL(file);
    const img=await loadImg(url);REF.src=img;REF.blob=blob;REF.name=file.name||'riferimento';Object.assign(REF,{on:true,op:.6,above:true,dx:0,dy:0,sc:1},cfg||{});
    if(!cfg&&(img.naturalWidth!==img.naturalHeight))toast('Il riferimento non è quadrato: regola scala e posizione in Documento finché combacia con il template.',6000);
    refBake();busy(null);refreshAll();setHint();buildOpts();if(!cfg){setTab('D');toast('Riferimento caricato. Usa “Estrai colore” (X) per trasformare i suoi colori in livelli, o ricalcalo con lame e forme.',6000);scheduleSave();}
  }catch(e){busy(null);toast('Non riesco a leggere questo file: '+e.message,5000);}
}
function refAsLayer(){
  if(!REF.cv)return;const id='I'+(S.uid++);images[id]={img:REF.cv,w:N,h:N,url:null,name:REF.name};
  const l={id:newId(),type:'image',name:'Riferimento · '+REF.name,imgId:id,x:N/2,y:N/2,scale:1,rot:0,mirror:false,mirrorRot:true,visible:true,opacity:1,mat:'keep',locked:true};
  const fi=S.layers.findIndex(x=>!x.fromTemplate),ti=S.layers.findIndex(x=>x.onTop),at=fi>=0?fi:ti>=0?ti:S.layers.length;S.layers.splice(at,0,l);
  REF.on=false;S.sel=l.id;commit();refreshAll();toast('Livrea messa come livello in fondo ai tuoi: ci lavori sopra coprendo e sostituendo sponsor e colori.',6000);
}
/* immagini utente */
$('#fImg').addEventListener('change',async()=>{const fs=[...$('#fImg').files];$('#fImg').value='';for(const f of fs){await addImageBlob(f,f.name.replace(/\.[^.]+$/,''));if(lib)libAdd(f);}});
async function addImageBlob(blob,name){
  const url=await blobToURL(blob);const img=await loadImg(url);const id='I'+(S.uid++);images[id]={img,w:img.naturalWidth,h:img.naturalHeight,url,name};
  const r=view.getBoundingClientRect(),c=s2w(r.width/2,r.height/2),sc=Math.min(1,600/Math.max(img.naturalWidth,img.naturalHeight));
  addLayer({type:'image',name:name||'Immagine',imgId:id,x:clamp(c.x,0,N),y:clamp(c.y,0,N),scale:sc,rot:0,mirror:false,mirrorRot:true});setTool('select');
}
function blobToURL(b){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(b);});}

/* font */
const fontReady={};
function ensureFont(n){if(fontReady[n])return;fontReady[n]=true;if(document.fonts&&document.fonts.load){Promise.all([document.fonts.load(`700 40px "${n}"`),document.fonts.load(`italic 600 40px "${n}"`)]).then(()=>requestDraw()).catch(()=>{});}}


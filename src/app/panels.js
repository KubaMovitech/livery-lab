/* ================= pannelli ================= */
function setTab(t){for(const k of['L','P','B','D']){$('#pane'+k).hidden=k!==t;$('#tab'+k).setAttribute('aria-selected',String(k===t));}if(t==='B')buildLib();}
$('#tabL').onclick=()=>setTab('L');$('#tabP').onclick=()=>setTab('P');$('#tabB').onclick=()=>setTab('B');$('#tabD').onclick=()=>setTab('D');
function refreshAll(){refreshPanels();requestDraw();}
function refreshPanels(){buildLayers();buildProps();buildDoc();$('#empty').hidden=!!(wireCv||S.layers.length);if(typeof buildGuide==='function'){buildGuide();updUnsaved();}}
function deleteLayer(id){const l=getLayer(id);if(l&&l.fromTemplate&&!confirm(`“${l.name}” arriva dal template ufficiale. Lo elimino lo stesso?`))return;S.layers=S.layers.filter(x=>x.id!==id);if(S.sel===id)S.sel=null;commit();refreshAll();}
function moveLayer(id,dir){const i=S.layers.findIndex(l=>l.id===id),j=i+dir;if(j<0||j>=S.layers.length)return;[S.layers[i],S.layers[j]]=[S.layers[j],S.layers[i]];commit();refreshAll();}
function deleteLayers(ids){const L=ids.map(getLayer).filter(Boolean);if(L.some(l=>l.fromTemplate)&&!confirm('Tra i livelli selezionati ce ne sono del template ufficiale. Li elimino lo stesso?'))return;
  if(L.length>1&&!confirm(`Elimino ${L.length} livelli?`))return;S.layers=S.layers.filter(l=>!ids.includes(l.id));setSel([]);commit();refreshAll();}
function dupLayers(ids){const out=[];for(const id of ids){const l=getLayer(id);if(!l)continue;const c=JSON.parse(JSON.stringify(l));c.id=newId();c.name=l.name+' copia';c.fromTemplate=false;c.locked=false;if(c.gp&&!(S.groups[c.gp[0]]&&S.groups[c.gp[0]].user))delete c.gp;delete c.guide;
  if(c.type!=='fill')shiftBy(c,40,40);S.layers.splice(S.layers.indexOf(l)+1,0,c);out.push(c.id);}setSel(out);commit();refreshAll();}
function dupLayer(id){const l=getLayer(id),c=JSON.parse(JSON.stringify(l));c.id=newId();c.name=l.name+' copia';c.fromTemplate=false;c.locked=false;if(c.gp&&!(S.groups[c.gp[0]]&&S.groups[c.gp[0]].user))delete c.gp;delete c.guide;
  if(c.type==='shape')c.pts.forEach(p=>{p.x+=40;p.y+=40;});else if(c.type==='text'||c.type==='image'){c.x+=40;c.y+=40;}
  S.layers.splice(S.layers.indexOf(l)+1,0,c);S.sel=c.id;commit();refreshAll();}
function thumb(im){if(im.thumb)return im.thumb;const k=28/Math.max(im.w,im.h),c=mk(Math.max(1,Math.round(im.w*k)),Math.max(1,Math.round(im.h*k)));c.getContext('2d').drawImage(im.img,0,0,c.width,c.height);return im.thumb=c.toDataURL();}
function chip(l){const s=el('span',{class:'chip'});if(l.type==='image'){const im=images[l.imgId];if(im){s.style.backgroundImage=`url(${thumb(im)})`;s.classList.add('chk-bg');}}else s.style.background=l.type==='paint'?(l.strokes[0]?.color||'#888'):l.color;return s;}
const TYPEN={shape:'forma',fill:'riempimento',paint:'pennello',text:'testo',image:'immagine'};
const openG=new Set();
const VARIANT_RE=/\b(wec|lm|le ?mans|24 ?h|elms|imsa|20\d\d)\b/i;
function gKids(g){return Object.keys(S.groups).filter(k=>S.groups[k].parent===g&&S.layers.some(l=>l.gp&&l.gp.includes(k)));}
function gLayers(g){return S.layers.filter(l=>l.gp&&l.gp.includes(g));}
function varLabel(n){return /^lm$/i.test(n)?'Le Mans 24h':/^wec$/i.test(n)?'WEC':n;}
/* gruppi con più set alternativi (WEC/LM, 2024/2025…): scendo dai gruppi principali finché non trovo una scelta */
function variantHosts(){
  const out=[];
  for(const top of gKids(null)){let g=top;
    for(let d=0;d<4;d++){const k=gKids(g);if(k.length>=2){if(k.filter(x=>VARIANT_RE.test(S.groups[x].name)).length>=2)out.push(g);break;}if(k.length!==1||S.layers.some(l=>l.gp&&l.gp[l.gp.length-1]===g))break;g=k[0];}}
  return out;
}
function variantSeg(g){
  const kids=gKids(g),on=kids.filter(k=>S.groups[k].on),seg=el('div',{class:'seg vset',role:'group','aria-label':'Set di '+S.groups[g].name});
  const pick=k=>{for(const x of kids)S.groups[x].on=k==null||x===k;S.groups[g].on=true;for(let p=S.groups[g].parent;p;p=S.groups[p].parent)S.groups[p].on=true;commit();refreshAll();};
  for(const k of kids)seg.append(el('button',{'aria-pressed':String(on.length===1&&on[0]===k),title:S.groups[k].name,onclick:()=>pick(k)},varLabel(S.groups[k].name)));
  if(kids.length)seg.append(el('button',{'aria-pressed':String(on.length===kids.length&&kids.length>1),title:'Usa tutti i set insieme',onclick:()=>pick(null)},'Tutti'));
  return seg;
}
function layerRow(l){
  return el('li',{class:'layer'+(l.clip?' clip':'')+(isSel(l.id)?' sel':'')+(vis(l)?'':' off')+(l.guide?' guide':'')},
    el('button',{class:'ib eye',title:l.visible?'Nascondi':'Mostra','aria-label':(l.visible?'Nascondi ':'Mostra ')+l.name,onclick:()=>{l.visible=!l.visible;commit();refreshAll();}},l.visible?'●':'○'),
    chip(l),
    el('span',{class:'nm',title:`${l.name} (${l.guide?'guida, non viene esportata':TYPEN[l.type]}) · Maiusc+clic per selezionarne più di uno`,onclick:e=>{if(e.shiftKey){toggleSel(l.id);refreshPanels();requestDraw();return;}setSel([l.id]);if(!['select','eraser','brush'].includes(S.tool)&&!(l.type==='fill'&&(S.tool==='island'||S.tool==='panel')))setTool('select');refreshPanels();buildOpts();requestDraw();}},l.name),
    l.guide?el('span',{class:'tag',title:'Guida del template: si vede solo qui, non finisce nei file'},'guida'):null,
    l.locked?el('span',{class:'note',style:'margin:0',title:'Bloccato'},'🔒'):null,
    l.mat&&l.mat!=='keep'?el('span',{class:'chip',title:'Materiale: '+matName(l.mat),style:`background:${matCol(l.mat)}`}):null,
    sepOutline(l)&&MATCOL[l.outMat]?el('span',{class:'chip ring',title:'Materiale del contorno: '+matName(l.outMat),style:`border-color:${matCol(l.outMat)}`}):null,
    el('button',{class:'ib',title:'Porta avanti','aria-label':'Porta avanti',onclick:()=>moveLayer(l.id,1)},'↑'),
    el('button',{class:'ib',title:'Porta indietro','aria-label':'Porta indietro',onclick:()=>moveLayer(l.id,-1)},'↓'),
    l.fromTemplate?null:el('button',{class:'ib',title:'Duplica (Ctrl+D)','aria-label':'Duplica',onclick:()=>dupLayer(l.id)},'⧉'),
    el('button',{class:'ib',title:'Elimina','aria-label':'Elimina',onclick:()=>deleteLayer(l.id)},'✕'));
}
function groupSel(){
  const L=selLayers().filter(l=>!l.fromTemplate);if(L.length<2){toast('Seleziona almeno due livelli tuoi (Maiusc+clic).');return;}
  const id='u'+(S.uid++);S.groups[id]={name:'Gruppo '+(Object.values(S.groups).filter(g=>g.user).length+1),parent:null,on:true,user:true};
  const idx=L.map(l=>S.layers.indexOf(l)).sort((a,b)=>a-b),top=idx[idx.length-1];
  const moving=idx.map(i=>S.layers[i]);moving.forEach(l=>{l.gp=[id];});
  const rest=S.layers.filter(l=>!moving.includes(l)),at=rest.indexOf(S.layers[top+1]);rest.splice(at<0?rest.length:at,0,...moving);S.layers=rest;
  openG.add(id);commit();refreshAll();toast('Gruppo creato: clic sul nome per selezionarlo tutto, ⊟ per scioglierlo.');
}
function ungroup(g){for(const l of S.layers)if(l.gp&&l.gp[0]===g)delete l.gp;delete S.groups[g];commit();refreshAll();}
function groupNode(g){
  const G=S.groups[g],kids=gKids(g),own=[...S.layers].reverse().filter(l=>l.gp&&l.gp[l.gp.length-1]===g),n=gLayers(g).length;
  const d=el('details',{class:'grp'+(G.on?'':' off')});d.open=openG.has(g);d.addEventListener('toggle',()=>{if(d.open)openG.add(g);else openG.delete(g);});
  const eye=el('button',{class:'ib eye',title:G.on?'Nascondi il gruppo':'Mostra il gruppo','aria-label':(G.on?'Nascondi ':'Mostra ')+G.name,onclick:e=>{e.preventDefault();G.on=!G.on;commit();refreshAll();}},G.on?'●':'○');
  const gn=el('span',{class:'gname',title:G.user?'Clic: seleziona tutto il gruppo':G.name},G.name);
  if(G.user)gn.addEventListener('click',e=>{e.preventDefault();setSel(gLayers(g).map(l=>l.id));setTool('select');refreshPanels();requestDraw();});
  const gm=[...new Set(gLayers(g).map(l=>l.mat||'keep'))];
  d.append(el('summary',{},eye,gn,gm.length===1&&gm[0]!=='keep'?el('span',{class:'chip',title:'Materiale del gruppo: '+matName(gm[0]),style:`background:${matCol(gm[0])}`}):null,el('span',{class:'cnt'},String(n)),
    G.user?el('button',{class:'ib',title:'Rinomina il gruppo','aria-label':'Rinomina '+G.name,onclick:e=>{e.preventDefault();const v=prompt('Nome del gruppo',G.name);if(v&&v.trim()){G.name=v.trim();commit();refreshAll();}}},'✎'):null,
    G.user?el('button',{class:'ib',title:'Sciogli il gruppo (i livelli restano)','aria-label':'Sciogli '+G.name,onclick:e=>{e.preventDefault();ungroup(g);}},'⊟'):null));
  const body=el('ul',{class:'layers'});
  // materiale del gruppo: vale per tutti i livelli dentro, anche nei sottogruppi
  {const GL=gLayers(g),ms=[...new Set(GL.map(l=>l.mat||'keep'))],cur=ms.length===1?ms[0]:'mix';
    const sel=el('select',{class:'gmat','aria-label':'Materiale del gruppo '+G.name});
    if(cur==='mix')sel.append(el('option',{value:'mix',selected:true},'Misto (diversi)'));
    MATS.forEach(([k,n])=>sel.append(el('option',{value:k,selected:k===cur},n)));
    sel.addEventListener('change',()=>{if(sel.value==='mix')return;GL.forEach(l=>{l.mat=sel.value;});commit();refreshAll();
      toast(`Materiale “${matName(sel.value)}” per ${GL.length} livelli di “${G.name}”. Guardalo con la vista Materiali.`,4500);});
    body.append(el('li',{class:'grow'},el('span',{},'Materiale del gruppo'),sel));}
  if(kids.length>=2&&kids.filter(k=>VARIANT_RE.test(S.groups[k].name)).length>=2)body.append(el('li',{class:'vrow'},variantSeg(g)));
  for(const k of kids)body.append(el('li',{},groupNode(k)));
  for(const l of own)body.append(layerRow(l));
  d.append(body);return d;
}
function buildLayers(){
  const p=$('#paneL');p.innerHTML='';
  if(!S.layers.length&&!wireCv){p.append(el('p',{class:'note'},'Apri il template PSD per iniziare.'));return;}
  const hosts=variantHosts();
  if(hosts.length){
    const box=el('div',{class:'sec card'},el('h3',{},'Set di adesivi'),el('p',{class:'note'},'Il template ha più versioni dei numeri e degli adesivi obbligatori: scegli quali usare.'));
    const clean=n=>n.replace(/\s*\(?don'?t move!?\)?\s*/i,'').replace(/\s*-\s*$/,'');
    for(const g of hosts){const names=[];for(let k=g;k;k=S.groups[k].parent)names.unshift(clean(S.groups[k].name));box.append(el('div',{class:'vline'},el('span',{class:'vname'},names.join(' › ')),variantSeg(g)));}
    p.append(box);
  }
  const tplN=S.layers.filter(l=>l.fromTemplate).length;
  if(tplN)p.append(el('div',{class:'row',style:'justify-content:space-between'},el('span',{class:'note',style:'margin:0'},`${tplN} livelli dal template`),
    el('button',{class:'btn sm',onclick:()=>{const T=S.layers.filter(l=>l.fromTemplate&&!l.guide),on=!T.every(vis);T.forEach(l=>{l.visible=on;});if(on)for(const k in S.groups)if(!S.groups[k].parent)S.groups[k].on=true;commit();refreshAll();}},'Mostra/nascondi tutti')));
  const ul=el('ul',{class:'layers'});
  if(!S.layers.some(l=>!l.fromTemplate))p.append(el('p',{class:'note'},'Nessun livello tuo ancora. Prova “Riempi un pezzo” (F) e clicca sulla carrozzeria.'));
  else{const q=el('input',{type:'search',class:'lsearch',placeholder:'Cerca un livello…',value:layerQ,'aria-label':'Cerca un livello'});
    q.addEventListener('input',()=>{layerQ=q.value;fillLayerList(ul);});
    const mine=el('input',{type:'checkbox'});mine.checked=onlyMine;mine.addEventListener('change',()=>{onlyMine=mine.checked;try{localStorage.setItem('liverylab-onlymine',onlyMine?'1':'0');}catch(e){}fillLayerList(ul);});
    p.append(el('div',{class:'lfilter'},q,el('label',{class:'chk',style:'margin:0',title:'Nasconde dalla lista i livelli del template (restano sulla tela)'},mine,'Solo i miei')));}
  fillLayerList(ul);
  p.append(ul);
}
let layerQ='',onlyMine=false;try{onlyMine=localStorage.getItem('liverylab-onlymine')==='1';}catch(e){}
function fillLayerList(ul){
  ul.innerHTML='';const done=new Set(),q=layerQ.trim().toLowerCase();
  [...S.layers].reverse().forEach(l=>{
    if(onlyMine&&l.fromTemplate)return;
    if(q){if(l.name.toLowerCase().includes(q))ul.append(layerRow(l));return;}
    if(l.gp&&l.gp.length&&S.groups[l.gp[0]]){const t=l.gp[0];if(!done.has(t)){done.add(t);ul.append(el('li',{},groupNode(t)));}return;}
    ul.append(layerRow(l));
  });
  if(q&&!ul.childElementCount)ul.append(el('li',{class:'note'},'Nessun livello con questo nome.'));

  ul.append(el('li',{class:'layer base',title:'Colore e materiale della base: si cambiano in Documento'},
    el('span',{class:'ib eye'},'■'),el('span',{class:'chip',style:`background:${S.base}`}),
    el('span',{class:'nm',onclick:()=>setTab('D')},'Base'),
    S.baseMat&&S.baseMat!=='keep'?el('span',{class:'chip',title:'Materiale: '+matName(S.baseMat),style:`background:${matCol(S.baseMat)}`}):null,
    el('button',{class:'btn sm',onclick:()=>setTab('D')},'Modifica')));
}
function ctl(label,input,val){return el('div',{class:'row'},el('label',{},label),input,val||null);}
function rangeCtl(label,get,set,min,max,step,fmt=v=>v){const out=el('span',{class:'val'},fmt(get())),inp=el('input',{type:'range',min,max,step,value:get(),'aria-label':label});inp.addEventListener('input',()=>{set(+inp.value);out.textContent=fmt(+inp.value);requestDraw();});inp.addEventListener('change',()=>commit());return ctl(label,inp,out);}
/* campo esadecimale accanto ai selettori di colore: accetta #RGB, RGB, #RRGGBB, RRGGBB */
function parseHex(v){v=String(v).trim().replace(/^#/,'');if(/^[0-9a-f]{3}$/i.test(v))v=v.split('').map(c=>c+c).join('');return /^[0-9a-f]{6}$/i.test(v)?'#'+v.toUpperCase():null;}
function hexField(get,apply,picker){
  const h=el('input',{type:'text',class:'hex',value:get().toUpperCase(),maxlength:7,spellcheck:'false','aria-label':'Colore in esadecimale'});
  h.addEventListener('change',()=>{const v=parseHex(h.value);if(!v){h.value=get().toUpperCase();toast('Scrivi un colore come #C0202B');return;}h.value=v;if(picker)picker.value=v.toLowerCase();apply(v);});
  h.addEventListener('keydown',e=>{if(e.key==='Enter')h.blur();});
  if(picker)picker.addEventListener('input',()=>{h.value=picker.value.toUpperCase();});
  return h;
}
function colorCtl(label,get,set){const inp=el('input',{type:'color',value:get(),'aria-label':label});inp.addEventListener('input',()=>{set(inp.value);requestDraw();});inp.addEventListener('change',()=>{pushRecent(inp.value);commit();buildLayers();});
  return ctl(label,inp,hexField(get,v=>{set(v.toLowerCase());pushRecent(v);commit();refreshAll();},inp));}
function checkCtl(label,get,set){const inp=el('input',{type:'checkbox'});inp.checked=!!get();inp.addEventListener('change',()=>{set(inp.checked);commit();refreshAll();});return el('label',{class:'chk'},inp,label);}
function selectCtl(label,opts,get,set){const s=el('select',{'aria-label':label});opts.forEach(([k,n])=>s.append(el('option',{value:k,selected:k===get()},n)));s.addEventListener('change',()=>{set(s.value);commit();refreshAll();});return ctl(label,s);}
/* palette salvate: {name, colors[]}; la prima volta ne preparo qualcuna di partenza */
let palettes=null;try{palettes=JSON.parse(localStorage.getItem('liverylab-palettes')||'null');}catch(e){}
if(!Array.isArray(palettes))palettes=[{name:'Nero e oro',colors:['#0b0b0d','#c9a24b','#f2efe8','#3a3f47','#8a6d2c']},{name:'Tricolore',colors:['#009246','#ffffff','#ce2b37','#0b0b0d']},
  {name:'Neon notte',colors:['#07090d','#19e3ff','#c6ff2e','#ff2d95','#ffffff']},{name:'Blu e bianco',colors:['#0b3d91','#ffffff','#0a2a61','#c6ff2e','#1b1d20']}];
let palSel=-1;try{palSel=+(localStorage.getItem('liverylab-palsel')??-1);}catch(e){}
const savePalettes=()=>{try{localStorage.setItem('liverylab-palettes',JSON.stringify(palettes));localStorage.setItem('liverylab-palsel',String(palSel));}catch(e){}};
const curPal=()=>palSel>=0&&palettes[palSel]?palettes[palSel].colors:PAL.slice(0,8);
let recent=[];try{recent=JSON.parse(localStorage.getItem('liverylab-recent')||'[]');}catch(e){}
function pushRecent(c){if(!c||!/^#[0-9a-f]{6}$/i.test(c))return;c=c.toLowerCase();if(recent[0]===c)return;recent=[c,...recent.filter(x=>x!==c)].slice(0,10);try{localStorage.setItem('liverylab-recent',JSON.stringify(recent));}catch(e){}}
/* tutti i colori usati nella livrea, in ordine di comparsa */
function liveryColors(){const o=[],add=c=>{if(c&&/^#[0-9a-f]{6}$/i.test(c)){c=c.toLowerCase();if(!o.includes(c))o.push(c);}};add(S.base);if(S.basePaint&&S.basePaint.pat!=='none')add(S.basePaint.bg);
  for(const l of S.layers){if(l.fromTemplate)continue;add(l.color);if(l.mirror&&l.mirrorSwap)add(l.color2);if(l.paint&&l.paint.pat&&l.paint.pat!=='none'){add(l.paint.bg);if(isGrad(l.paint)){add(l.paint.c2);if(l.paint.pat==='grad3')add(l.paint.c3);}}
    if(l.outline&&l.outline.on)add(l.outline.color);if(l.pin&&l.pin.on)add(l.pin.color);if(l.strokes)l.strokes.forEach(s=>add(s.color));if(l.fx){if(l.fx.tint&&l.fx.tint.on)add(l.fx.tint.color);if(l.fx.outline&&l.fx.outline.on)add(l.fx.outline.color);}}
  return o.slice(0,24);}
function swatchRow(apply){const rc=recent.filter(c=>!PAL.map(x=>x.toLowerCase()).includes(c)).slice(0,12);
  return el('div',{},el('div',{class:'swatches'},...PAL.map(c=>el('button',{class:'sw',style:`background:${c}`,title:c,'aria-label':'Colore '+c,onclick:()=>apply(c)}))),
    curPal()!==PAL.slice(0,8)&&palSel>=0?el('div',{class:'swatches recent'},el('span',{class:'swl'},palettes[palSel].name),...curPal().map(c=>el('button',{class:'sw',style:`background:${c}`,title:c.toUpperCase(),'aria-label':'Colore '+c,onclick:()=>apply(c)}))):null,
    rc.length?el('div',{class:'swatches recent',title:'Colori usati di recente'},el('span',{class:'swl'},'Recenti'),...rc.map(c=>el('button',{class:'sw',style:`background:${c}`,title:c.toUpperCase(),'aria-label':'Colore '+c,onclick:()=>apply(c)}))):null);}
function paintSec(l,title='Colore e trama'){
  l.paint=l.paint||{pat:'none',bg:'#1B1D20',scale:1,angle:0};const P=l.paint;
  return el('div',{class:'sec'},el('h3',{},title),swatchRow(c=>{l.color=c;commit();refreshAll();}),
    colorCtl('Colore',()=>l.color,v=>{l.color=v;}),
    selectCtl('Trama',PATS,()=>P.pat,v=>{P.pat=v;}),
    isGrad(P)?colorCtl('Colore finale',()=>P.c2||'#006B3C',v=>{P.c2=v;}):null,
    P.pat==='grad3'?colorCtl('Colore centrale',()=>P.c3||'#C9A24B',v=>{P.c3=v;}):null,
    isGrad(P)?rangeCtl('Direzione',()=>P.angle||0,v=>{P.angle=v;},0,360,1,v=>v+'°'):null,
    P.pat==='image'?el('div',{class:'row'},el('button',{class:'btn sm',onclick:()=>pickPatternImage(P)},P.img&&images[P.img]?'Cambia immagine della trama':'Scegli l’immagine della trama')):null,
    P.pat!=='none'&&P.pat!=='image'&&!isGrad(P)?colorCtl('Fondo trama',()=>P.bg,v=>{P.bg=v;}):null,
    P.pat!=='none'&&!isGrad(P)?rangeCtl('Scala',()=>Math.round(P.scale*100),v=>{P.scale=v/100;},25,600,1,v=>v+'%'):null,
    P.pat!=='none'&&!isGrad(P)?rangeCtl('Rotazione',()=>P.angle,v=>{P.angle=v;},0,180,1,v=>v+'°'):null);
}
function numCtl(label,get,set,step=1){const inp=el('input',{type:'number',step,value:Math.round(get()*100)/100,'aria-label':label});inp.addEventListener('change',()=>{const v=parseFloat(inp.value);if(isFinite(v)){set(v);commit();refreshAll();}});return el('label',{class:'num'},el('span',{},label),inp);}
function shapeCenter(l){const b=bbox(l.pts);return{x:(b.x0+b.x1)/2,y:(b.y0+b.y1)/2};}
/* posizione, dimensioni, rotazione e riflessione con valori precisi */
function transformSec(l){
  const sec=el('div',{class:'sec'},el('h3',{},'Posizione e dimensioni'));
  if(l.type==='shape'){const c=shapeCenter(l),b=bbox(l.pts);
    sec.append(el('div',{class:'numgrid'},numCtl('X',()=>c.x,v=>{const d=v-c.x;l.pts.forEach(p=>p.x+=d);}),numCtl('Y',()=>c.y,v=>{const d=v-c.y;l.pts.forEach(p=>p.y+=d);}),
      numCtl('Largh.',()=>b.x1-b.x0,v=>{const f=Math.max(1,v)/((b.x1-b.x0)||1);l.pts.forEach(p=>p.x=c.x+(p.x-c.x)*f);}),numCtl('Alt.',()=>b.y1-b.y0,v=>{const f=Math.max(1,v)/((b.y1-b.y0)||1);l.pts.forEach(p=>p.y=c.y+(p.y-c.y)*f);})));
    sec.append(el('div',{class:'row'},el('button',{class:'btn sm',onclick:()=>{l.pts.forEach(p=>p.x=2*c.x-p.x);commit();refreshAll();}},'⇋ Rifletti orizz.'),el('button',{class:'btn sm',onclick:()=>{l.pts.forEach(p=>p.y=2*c.y-p.y);commit();refreshAll();}},'⇵ Rifletti vert.')));
    return sec;}
  sec.append(el('div',{class:'numgrid'},numCtl('X',()=>l.x,v=>{l.x=v;}),numCtl('Y',()=>l.y,v=>{l.y=v;}),
    numCtl('Largh. %',()=>(l.sx||1)*100,v=>{l.sx=Math.max(1,v)/100;}),numCtl('Alt. %',()=>(l.sy||1)*100,v=>{l.sy=Math.max(1,v)/100;}),numCtl('Rotazione °',()=>l.rot||0,v=>{l.rot=((v%360)+540)%360-180;})));
  sec.append(el('div',{class:'row',style:'flex-wrap:wrap'},el('button',{class:'btn sm','aria-pressed':String(!!l.flipX),onclick:()=>{l.flipX=!l.flipX;commit();refreshAll();}},'⇋ Rifletti orizz.'),el('button',{class:'btn sm','aria-pressed':String(!!l.flipY),onclick:()=>{l.flipY=!l.flipY;commit();refreshAll();}},'⇵ Rifletti vert.'),
    el('button',{class:'btn sm',onclick:()=>{l.sx=1;l.sy=1;l.rot=0;l.flipX=false;l.flipY=false;commit();refreshAll();}},'Azzera')));
  sec.append(el('p',{class:'note'},'Sulla tela: gli angoli ingrandiscono in proporzione, i pallini sui lati stirano in larghezza o in altezza, il pallino in alto ruota.'));
  return sec;
}
/* stili: solo l'aspetto (colori, trame, contorni, effetti), mai la posizione */
const STYLE_KEYS=['color','color2','mirrorSwap','paint','stroke','noFill','edge','pin','fade','outline','shadow','font','bold','italic','spacing','arc','fx','adj','blend','blur','mat','opacity'];
const STYLE_PRESETS=[
  {name:'Carbonio',preset:true,st:{color:'#3a3f47',paint:{pat:'carbon',bg:'#0d0f12',scale:1,angle:0},mat:'carbon'}},
  {name:'Metallo spazzolato (Opzione 1)',preset:true,st:{color:'#e3e6ea',paint:{pat:'brushed',bg:'#9aa1a9',scale:1,angle:0},mat:'chrome'}},
  {name:'Contorno bianco',preset:true,st:{stroke:{on:true,color:'#FFFFFF',width:10},edge:{on:true,only:false,color:'#FFFFFF',width:10,pos:'inside'},outline:{on:true,color:'#FFFFFF',width:8},fx:{tint:{on:false,color:'#FFFFFF'},outline:{on:true,color:'#FFFFFF',width:8},shadow:{on:false,color:'#000000',alpha:.6,blur:12,dx:8,dy:8}}}},
  {name:'Ombra morbida',preset:true,st:{shadow:{on:true,color:'#000000',alpha:.55,blur:24,dx:10,dy:10},fx:{tint:{on:false,color:'#FFFFFF'},outline:{on:false,color:'#FFFFFF',width:6},shadow:{on:true,color:'#000000',alpha:.55,blur:24,dx:10,dy:10}}}},
  {name:'Opzione 2 (es. wrap opaco)',preset:true,st:{mat:'wrap'}}];
let myStyles=[];try{myStyles=JSON.parse(localStorage.getItem('liverylab-styles')||'[]');}catch(e){}
const saveStyles=()=>{try{localStorage.setItem('liverylab-styles',JSON.stringify(myStyles));}catch(e){}};
const STYLE_FOR={shape:['color','color2','mirrorSwap','paint','stroke','noFill','pin','fade'],fill:['color','paint','edge'],text:['color','outline','shadow','font','bold','italic','spacing','arc'],image:['fx','adj'],paint:[]};
function grabStyle(l){const st={};for(const k of STYLE_KEYS)if(l[k]!==undefined)st[k]=JSON.parse(JSON.stringify(l[k]));return st;}
function applyStyle(st,L){let n=0;for(const l of L){if(l.fromTemplate)continue;for(const k of Object.keys(st)){if(['blend','blur','mat','opacity'].includes(k)||(STYLE_FOR[l.type]||[]).includes(k)){l[k]=JSON.parse(JSON.stringify(st[k]));n++;}}if(st.font)ensureFont(st.font);}
  if(n){commit();refreshAll();toast('Stile applicato.');}else toast('Questo stile non ha niente che valga per il livello selezionato.');}
function stylesSec(multi){
  const L=selLayers(),all=STYLE_PRESETS.concat(myStyles);
  const chipOf=st=>el('span',{class:'stchip',style:`background:${st.color||(st.fx&&st.fx.tint&&st.fx.tint.on?st.fx.tint.color:'')||'var(--panel2)'}`},st.paint&&st.paint.pat&&st.paint.pat!=='none'?'▦':'');
  return el('div',{class:'sec'},el('h3',{},'Stili'),el('p',{class:'note'},'Un clic applica l’aspetto (colori, trame, contorni, ombre, font) senza spostare niente.'),
    el('div',{class:'stgrid'},...all.map((it,i)=>el('div',{class:'stitem'},el('button',{class:'stbtn',onclick:()=>applyStyle(it.st,L)},chipOf(it.st),it.name),
      it.preset?null:el('button',{class:'ib',title:'Elimina lo stile','aria-label':'Elimina '+it.name,onclick:()=>{myStyles=myStyles.filter(x=>x!==it);saveStyles();refreshPanels();}},'✕')))),
    multi?null:el('button',{class:'btn sm',style:'margin-top:6px',onclick:()=>{const l=selLayer();const v=prompt('Nome dello stile',l.name+' stile');if(!v)return;myStyles.push({name:v.trim(),st:grabStyle(l)});saveStyles();refreshPanels();toast('Stile salvato: lo ritrovi qui e su qualunque altra livrea.');}},'Salva lo stile di questo livello'));
}
function alignSel(how){
  const L=selLayers().filter(movable);if(!L.length)return;const ref=L.length>1?unionB(L):{x0:0,y0:0,x1:N,y1:N};
  for(const l of L){const b=bounds(l);if(!b)continue;let dx=0,dy=0;
    if(how==='l')dx=ref.x0-b.x0;if(how==='r')dx=ref.x1-b.x1;if(how==='cx')dx=(ref.x0+ref.x1)/2-(b.x0+b.x1)/2;
    if(how==='t')dy=ref.y0-b.y0;if(how==='b')dy=ref.y1-b.y1;if(how==='cy')dy=(ref.y0+ref.y1)/2-(b.y0+b.y1)/2;
    if(how==='axis')dy=S.axis-(b.y0+b.y1)/2;shiftBy(l,dx,dy);}
  commit();refreshAll();
}
function distributeSel(axis){
  const L=selLayers().filter(movable).map(l=>({l,b:bounds(l)})).filter(o=>o.b);if(L.length<3){toast('Per distribuire servono almeno tre livelli.');return;}
  const c=o=>axis==='x'?(o.b.x0+o.b.x1)/2:(o.b.y0+o.b.y1)/2;L.sort((a,b)=>c(a)-c(b));const a=c(L[0]),z=c(L[L.length-1]),st=(z-a)/(L.length-1);
  L.forEach((o,i)=>{const d=a+st*i-c(o);shiftBy(o.l,axis==='x'?d:0,axis==='x'?0:d);});commit();refreshAll();
}
function alignSec(multi){
  const B=(t,how,tip)=>el('button',{class:'btn sm',title:tip,onclick:()=>alignSel(how)},t);
  return el('div',{class:'sec'},el('h3',{},multi?'Allinea tra loro':'Allinea sulla tela'),
    el('div',{class:'abtns'},B('⇤','l','A sinistra'),B('↔','cx','Al centro in orizzontale'),B('⇥','r','A destra'),B('⤒','t','In alto'),B('↕','cy','Al centro in verticale'),B('⤓','b','In basso'),B('⇿ asse','axis','Centra sull’asse di specchio')),
    multi?el('div',{class:'row',style:'flex-wrap:wrap'},el('button',{class:'btn sm',onclick:()=>distributeSel('x')},'Distribuisci in orizzontale'),el('button',{class:'btn sm',onclick:()=>distributeSel('y')},'Distribuisci in verticale')):null,
    el('p',{class:'note'},multi?'Rispetto al riquadro che contiene tutti i livelli selezionati.':'Rispetto a tutta la tela; “asse” mette il centro sulla linea arancione.'));
}
function buildProps(){
  const p=$('#paneP');p.innerHTML='';const l=selLayer();
  if(l&&S.msel&&S.msel.length){const L=selLayers();
    {const ms=[...new Set(L.map(l=>l.mat||'keep'))],cur=ms.length===1?ms[0]:'mix',sel=el('select',{'aria-label':'Materiale dei livelli selezionati'});
      if(cur==='mix')sel.append(el('option',{value:'mix',selected:true},'Misto (diversi)'));MATS.forEach(([k,n])=>sel.append(el('option',{value:k,selected:k===cur},n)));
      sel.addEventListener('change',()=>{if(sel.value==='mix')return;L.forEach(l=>{l.mat=sel.value;});commit();refreshAll();});
      p.append(el('div',{class:'sec'},el('h3',{},'Materiale'),ctl('Per tutti',sel)));}
    p.append(el('div',{class:'sec'},el('h3',{},`${L.length} livelli selezionati`),el('p',{class:'note'},'Trascinali insieme sulla tela, spostali con le frecce, duplicali con Ctrl+D. Maiusc+clic aggiunge o toglie un livello.'),
      el('div',{class:'row',style:'flex-wrap:wrap'},el('button',{class:'btn sm pri',onclick:groupSel},'Raggruppa'),el('button',{class:'btn sm',onclick:()=>dupLayers(selIds())},'Duplica'),el('button',{class:'btn sm',onclick:()=>deleteLayers(selIds())},'Elimina'),el('button',{class:'btn sm',onclick:()=>{setSel([S.sel]);refreshAll();}},'Deseleziona gli altri'))));
    p.append(alignSec(true));p.append(stylesSec(true));return;}
  if(!l){p.append(el('p',{class:'note'},'Seleziona un livello per cambiarne colore, trama, materiale, specchio e filetto.'));return;}
  const nm=el('input',{type:'text',value:l.name,'aria-label':'Nome'});nm.addEventListener('change',()=>{l.name=nm.value;commit();buildLayers();});
  p.append(el('div',{class:'sec'},el('h3',{},'Livello'),ctl('Nome',nm),rangeCtl('Opacità',()=>Math.round((l.opacity??1)*100),v=>{l.opacity=v/100;},0,100,1,v=>v+'%'),
    (l.type==='image'||l.type==='text'||l.type==='shape')?checkCtl('Bloccato (non si sposta)',()=>l.locked,v=>{l.locked=v;}):null,
    l.erase&&l.erase.length?el('button',{class:'btn sm',onclick:()=>{l.erase=[];commit();refreshAll();}},`Ripristina le parti cancellate (${l.erase.length})`):null));
  p.append(el('div',{class:'sec'},el('h3',{},'Materiale'),selectCtl('Materiale',MATS.map(m=>[m[0],m[1]]),()=>l.mat||'keep',v=>{l.mat=v;}),
    el('p',{class:'note'},'Finisce nella mappa delle regioni (vista “Materiali”). In LMU, nelle Impostazioni materiali, scegli cosa diventano Base, Opzione 1 e Opzione 2: vernice metallizzata, cromo, wrap, adesivi, opaco o lucido.'),
    el('button',{class:'btn sm',onclick:()=>{setTab('D');setTimeout(()=>{const e=$('#secCust');if(e)e.scrollIntoView({behavior:'smooth'});},50);}},'Materiale personalizzato…')));
  if(!l.fromTemplate)p.append(el('div',{class:'sec'},el('h3',{},'Fusione e maschera'),selectCtl('Fusione',BLENDS,()=>l.blend||'source-over',v=>{l.blend=v;}),
    rangeCtl('Sfoca bordi',()=>l.blur||0,v=>{l.blur=v;},0,60,1,v=>v+' px'),
    checkCtl('Ritaglia sul livello sotto (maschera)',()=>l.clip,v=>{l.clip=v;}),
    l.clip?el('p',{class:'note'},'Questo livello si vede solo dentro la forma del livello sotto: righe, trame e loghi restano dentro il pannello o la forma.'):null));
  if(l.type==='shape'){
    p.append(paintSec(l));
    p.append(el('div',{class:'sec'},el('h3',{},'Forma'),checkCtl('Curve morbide',()=>l.smooth,v=>{l.smooth=v;}),l.smooth?rangeCtl('Tensione',()=>Math.round((l.tension??.5)*100),v=>{l.tension=v/100;},0,100,1,v=>v+'%'):null));
    p.append(el('div',{class:'sec'},el('h3',{},'Specchio sul lato opposto'),checkCtl('Duplica sull’altro lato',()=>l.mirror,v=>{l.mirror=v;}),
      l.mirror?checkCtl('Colore diverso sul lato opposto',()=>l.mirrorSwap,v=>{l.mirrorSwap=v;}):null,
      l.mirror&&l.mirrorSwap?colorCtl('Colore specchio',()=>l.color2,v=>{l.color2=v;}):null,
      el('p',{class:'note'},'La linea arancione tratteggiata è l’asse: regolala in “Documento” finché la copia cade sul fianco giusto.')));
    if(!l.paint||l.paint.pat==='none')p.append(el('div',{class:'sec'},el('h3',{},'Sfumatura'),checkCtl('Dissolvi verso trasparente',()=>l.fade.on,v=>{l.fade.on=v;}),
      l.fade.on?rangeCtl('Direzione',()=>l.fade.angle,v=>{l.fade.angle=v;},0,360,1,v=>v+'°'):null,l.fade.on?rangeCtl('Lunghezza',()=>Math.round(l.fade.len*100),v=>{l.fade.len=v/100;},20,150,1,v=>v+'%'):null));
    l.stroke=l.stroke||{on:false,color:'#FFFFFF',width:8};
    p.append(el('div',{class:'sec'},el('h3',{},'Contorno'),checkCtl('Contorno sulla linea della forma',()=>l.stroke.on,v=>{l.stroke.on=v;if(!v)l.noFill=false;}),
      l.stroke.on?colorCtl('Colore',()=>l.stroke.color,v=>{l.stroke.color=v;}):null,l.stroke.on?rangeCtl('Spessore',()=>l.stroke.width,v=>{l.stroke.width=v;},1,120,1,v=>v+' px'):null,
      l.stroke.on?checkCtl('Solo contorno (forma vuota)',()=>l.noFill,v=>{l.noFill=v;}):null,
      (l.stroke.on||(l.pin&&l.pin.on))?outMatCtl(l):null,
      (l.stroke.on||(l.pin&&l.pin.on))?el('p',{class:'note'},'Vale per contorno e filetto: per esempio la forma in vernice e il bordo in cromo o adesivo.'):null));
    p.append(el('div',{class:'sec'},el('h3',{},'Filetto'),checkCtl('Filetto lungo il bordo',()=>l.pin.on,v=>{l.pin.on=v;}),
      l.pin.on?colorCtl('Colore',()=>l.pin.color,v=>{l.pin.color=v;}):null,l.pin.on?rangeCtl('Spessore',()=>l.pin.width,v=>{l.pin.width=v;},1,40,1,v=>v+' px'):null,l.pin.on?rangeCtl('Distanza',()=>l.pin.offset,v=>{l.pin.offset=v;},0,80,1,v=>v+' px'):null));
  }
  if(l.type==='fill'){
    const c=fillCache(l),n=c?c.ids.size:0;
    p.append(paintSec(l));
    p.append(el('div',{class:'sec'},el('h3',{},l.mode==='island'?'Pezzi colorati':'Pannelli colorati'),
      el('p',{class:'note'},`${n} ${l.mode==='island'?(n===1?'pezzo':'pezzi'):(n===1?'pannello':'pannelli')} in questo livello. Con il livello selezionato e lo strumento attivo, clicca per aggiungerne o toglierne.`),
      el('div',{class:'row',style:'flex-wrap:wrap'},el('button',{class:'btn sm',onclick:()=>setTool(l.mode==='island'?'island':'panel')},l.mode==='island'?'Aggiungi o togli pezzi':'Aggiungi o togli pannelli'),
        el('button',{class:'btn sm pri',onclick:()=>{setTab('B');setTimeout(()=>{const e=$('#secGraphics');if(e)e.scrollIntoView({behavior:'smooth'});},50);}},'Aggiungi una grafica qui dentro')),
      checkCtl('Anche sull’altro fianco (specchio)',()=>l.mirror,v=>{l.mirror=v;}),
      l.mirror?el('p',{class:'note'},'Colora il pezzo che sta nella posizione riflessa rispetto all’asse (linea arancione). Se cade sul pezzo sbagliato, regola l’asse in Documento.'):null,
      rangeCtl('Abbondanza',()=>l.grow??3,v=>{l.grow=v;},0,12,1,v=>v+' px'),
      el('p',{class:'note'},'Allarga un po’ il colore oltre i bordi, così in gioco non restano fessure sulle giunture.')));
    const E=l.edge=l.edge||{on:false,only:false,color:'#FFFFFF',width:10,pos:'inside'};
    p.append(el('div',{class:'sec'},el('h3',{},'Contorno del pezzo'),checkCtl('Contorno lungo il bordo',()=>E.on,v=>{E.on=v;if(!v)E.only=false;}),
      E.on?colorCtl('Colore',()=>E.color,v=>{E.color=v;}):null,
      E.on?rangeCtl('Spessore',()=>E.width,v=>{E.width=v;},1,80,1,v=>v+' px'):null,
      E.on?selectCtl('Posizione',[['inside','Dentro il bordo'],['center','A cavallo del bordo'],['outside','Fuori dal bordo']],()=>E.pos||'inside',v=>{E.pos=v;}):null,
      E.on?checkCtl('Solo contorno (senza riempimento)',()=>E.only,v=>{E.only=v;}):null,
      E.on?outMatCtl(l):null,
      el('p',{class:'note'},'Segue la forma esatta del pezzo o pannello: utile per bordature, filetti e linee di separazione tra colori.')));
  }
  if(l.type==='paint')p.append(el('div',{class:'sec'},el('h3',{},'Pennello'),el('p',{class:'note'},`${l.strokes.length} tratti. Con il pennello attivo e questo livello selezionato, i nuovi tratti finiscono qui.`),
    l.strokes.length?el('button',{class:'btn sm',onclick:()=>{l.strokes.pop();commit();refreshAll();}},'Togli l’ultimo tratto'):null));
  if(l.type==='text'){
    const ta=el('textarea',{rows:2,'aria-label':'Testo'});ta.value=l.text;ta.addEventListener('input',()=>{l.text=ta.value||' ';requestDraw();});ta.addEventListener('change',()=>commit());
    const fs=el('select',{'aria-label':'Carattere'});FONTS.concat(FONTS.includes(l.font)?[]:[l.font]).forEach(f=>fs.append(el('option',{value:f,selected:f===l.font,style:`font-family:"${f}"`},f)));fs.addEventListener('change',()=>{l.font=fs.value;ensureFont(l.font);commit();requestDraw();});
    p.append(el('div',{class:'sec'},el('h3',{},'Testo'),ctl('Contenuto',ta),ctl('Carattere',fs),swatchRow(c=>{l.color=c;commit();refreshAll();}),colorCtl('Colore',()=>l.color,v=>{l.color=v;}),
      rangeCtl('Dimensione',()=>l.size,v=>{l.size=v;},20,900,1,v=>v+' px'),rangeCtl('Rotazione',()=>l.rot||0,v=>{l.rot=v;},-180,180,1,v=>v+'°'),rangeCtl('Spaziatura',()=>l.spacing||0,v=>{l.spacing=v;},-10,80,1,v=>v+' px'),
      rangeCtl('Curva',()=>l.arc||0,v=>{l.arc=v;},-300,300,1,v=>v?(v>0?'⌒ ':'⌣ ')+Math.abs(v)+'°':'dritto'),
      checkCtl('Grassetto',()=>l.bold,v=>{l.bold=v;}),checkCtl('Corsivo',()=>l.italic,v=>{l.italic=v;}),checkCtl('Copia sul lato opposto',()=>l.mirror,v=>{l.mirror=v;}),l.mirror?checkCtl('Ruota la copia di 180°',()=>l.mirrorRot,v=>{l.mirrorRot=v;}):null));
    l.outline=l.outline||{on:false,color:'#FFFFFF',width:8};l.shadow=l.shadow||{on:false,color:'#000000',alpha:.6,blur:12,dx:8,dy:8};
    p.append(el('div',{class:'sec'},el('h3',{},'Contorno'),checkCtl('Contorno attorno alle lettere',()=>l.outline.on,v=>{l.outline.on=v;}),
      l.outline.on?colorCtl('Colore',()=>l.outline.color,v=>{l.outline.color=v;}):null,
      l.outline.on?rangeCtl('Spessore',()=>l.outline.width,v=>{l.outline.width=v;},1,80,1,v=>v+' px'):null,
      l.outline.on?outMatCtl(l):null));
    p.append(el('div',{class:'sec'},el('h3',{},'Ombra'),checkCtl('Ombra dietro al testo',()=>l.shadow.on,v=>{l.shadow.on=v;}),
      l.shadow.on?colorCtl('Colore',()=>l.shadow.color,v=>{l.shadow.color=v;}):null,
      l.shadow.on?rangeCtl('Intensità',()=>Math.round((l.shadow.alpha??.6)*100),v=>{l.shadow.alpha=v/100;},5,100,1,v=>v+'%'):null,
      l.shadow.on?rangeCtl('Morbidezza',()=>l.shadow.blur,v=>{l.shadow.blur=v;},0,120,1,v=>v+' px'):null,
      l.shadow.on?rangeCtl('Spostamento X',()=>l.shadow.dx,v=>{l.shadow.dx=v;},-120,120,1,v=>v+' px'):null,
      l.shadow.on?rangeCtl('Spostamento Y',()=>l.shadow.dy,v=>{l.shadow.dy=v;},-120,120,1,v=>v+' px'):null));
  }
  if((l.type==='image'||l.type==='text'||l.type==='shape')&&!l.fromTemplate){p.append(transformSec(l));p.append(alignSec(false));}
  if(!l.fromTemplate)p.append(stylesSec(false));
  if(l.type==='image')p.append(el('div',{class:'sec'},el('h3',{},'Immagine'),rangeCtl('Scala',()=>Math.round(l.scale*100),v=>{l.scale=v/100;},2,400,1,v=>v+'%'),rangeCtl('Rotazione',()=>l.rot||0,v=>{l.rot=v;},-180,180,1,v=>v+'°'),
    checkCtl('Copia sul lato opposto',()=>l.mirror,v=>{l.mirror=v;}),l.mirror?checkCtl('Ruota la copia di 180°',()=>l.mirrorRot,v=>{l.mirrorRot=v;}):null,
    l.fromTemplate?el('p',{class:'note'},'Questo livello arriva dal template ufficiale: di solito conviene lasciarlo dov’è.'):null,
    el('button',{class:'btn sm',onclick:()=>saveLayerToLib(l)},'Salva nella libreria dei loghi')));
  if(l.type==='image'&&!l.fromTemplate){
    const A=l.adj=l.adj||{bri:100,con:100,sat:100,hue:0};
    p.append(el('div',{class:'sec'},el('h3',{},'Regola immagine'),
      rangeCtl('Luminosità',()=>A.bri??100,v=>{A.bri=v;},0,200,1,v=>v+'%'),rangeCtl('Contrasto',()=>A.con??100,v=>{A.con=v;},0,200,1,v=>v+'%'),
      rangeCtl('Saturazione',()=>A.sat??100,v=>{A.sat=v;},0,200,1,v=>v+'%'),rangeCtl('Tonalità',()=>A.hue||0,v=>{A.hue=v;},-180,180,1,v=>v+'°'),
      el('button',{class:'btn sm',onclick:()=>{l.adj={bri:100,con:100,sat:100,hue:0};commit();refreshAll();}},'Azzera regolazioni')));
    const F=l.fx=l.fx||{};F.tint=F.tint||{on:false,color:'#FFFFFF'};F.outline=F.outline||{on:false,color:'#FFFFFF',width:6};F.shadow=F.shadow||{on:false,color:'#000000',alpha:.6,blur:12,dx:8,dy:8};
    p.append(el('div',{class:'sec'},el('h3',{},'Effetti del logo'),
      checkCtl('Ricolora in tinta unica',()=>F.tint.on,v=>{F.tint.on=v;}),F.tint.on?colorCtl('Colore',()=>F.tint.color,v=>{F.tint.color=v;}):null,
      checkCtl('Contorno',()=>F.outline.on,v=>{F.outline.on=v;}),
      F.outline.on?colorCtl('Colore contorno',()=>F.outline.color,v=>{F.outline.color=v;}):null,
      F.outline.on?rangeCtl('Spessore',()=>F.outline.width,v=>{F.outline.width=v;},1,60,1,v=>v+' px'):null,
      F.outline.on?outMatCtl(l):null,
      checkCtl('Ombra',()=>F.shadow.on,v=>{F.shadow.on=v;}),
      F.shadow.on?colorCtl('Colore ombra',()=>F.shadow.color,v=>{F.shadow.color=v;}):null,
      F.shadow.on?rangeCtl('Intensità',()=>Math.round((F.shadow.alpha??.6)*100),v=>{F.shadow.alpha=v/100;},5,100,1,v=>v+'%'):null,
      F.shadow.on?rangeCtl('Morbidezza',()=>F.shadow.blur,v=>{F.shadow.blur=v;},0,120,1,v=>v+' px'):null,
      F.shadow.on?rangeCtl('Spostamento X',()=>F.shadow.dx,v=>{F.shadow.dx=v;},-120,120,1,v=>v+' px'):null,
      F.shadow.on?rangeCtl('Spostamento Y',()=>F.shadow.dy,v=>{F.shadow.dy=v;},-120,120,1,v=>v+' px'):null,
      el('p',{class:'note'},'Utile per gli sponsor monocromatici: un logo nero diventa bianco su una livrea scura, con un contorno per staccarlo dal fondo.')));
  }
  foldAdvanced(p,l);
}
/* le sezioni avanzate (materiali, maschere, effetti…) vanno in fondo, chiuse; si aprono da sole se l'effetto è attivo */
const ADV_SECS=['Materiale','Fusione e maschera','Contorno','Contorno del pezzo','Filetto','Ombra','Sfumatura','Effetti del logo','Regola immagine','Forma','Specchio sul lato opposto','Posizione e dimensioni','Allinea sulla tela','Stili'];
let advOpen=new Set();try{advOpen=new Set(JSON.parse(localStorage.getItem('liverylab-advopen')||'[]'));}catch(e){}
function advActive(t,l){const on=o=>!!(o&&o.on);
  switch(t){case'Materiale':return !!(l.mat&&l.mat!=='keep');case'Fusione e maschera':return !!(l.clip||l.blur||(l.blend&&l.blend!=='source-over'));
    case'Contorno':return on(l.stroke)||on(l.outline);case'Contorno del pezzo':return on(l.edge);case'Filetto':return on(l.pin);case'Ombra':return on(l.shadow);case'Sfumatura':return on(l.fade);
    case'Effetti del logo':return !!(l.fx&&(on(l.fx.tint)||on(l.fx.outline)||on(l.fx.shadow)));case'Regola immagine':return !!(l.adj&&(l.adj.bri!==100||l.adj.con!==100||l.adj.sat!==100||l.adj.hue));
    case'Forma':return !!l.smooth;case'Specchio sul lato opposto':return !!l.mirror;}return false;}
function foldAdvanced(p,l){
  const secs=[...p.children].filter(e=>e.classList.contains('sec')&&e.firstChild&&e.firstChild.tagName==='H3'&&ADV_SECS.includes(e.firstChild.textContent));
  if(!secs.length)return;
  p.append(el('div',{class:'advhead'},'Materiali, maschere ed effetti'));
  for(const sc of secs){const t=sc.firstChild.textContent,act=advActive(t,l);
    const d=el('details',{class:'sec adv'},el('summary',{},t,act?el('i',{},'attivo'):null));
    d.open=act||advOpen.has(t);sc.firstChild.remove();d.append(...sc.childNodes);sc.remove();
    d.addEventListener('toggle',()=>{if(d.open)advOpen.add(t);else advOpen.delete(t);try{localStorage.setItem('liverylab-advopen',JSON.stringify([...advOpen]));}catch(e){}});
    p.append(d);}
}
function buildDoc(){
  const p=$('#paneD');p.innerHTML='';
  {const pn=el('input',{type:'text',value:S.projName||'',placeholder:'es. Genesis nero-oro #81','aria-label':'Nome del progetto'});pn.addEventListener('change',()=>{S.projName=safeName(pn.value);if(!pn.value.trim())S.projName='';projTitle();commit();});
    p.append(el('div',{class:'sec'},el('h3',{},'Progetto'),ctl('Nome',pn),el('div',{class:'row',style:'flex-wrap:wrap'},el('button',{class:'btn sm pri',onclick:()=>saveProject(false)},'Salva'),el('button',{class:'btn sm',onclick:()=>saveProject(true)},'Salva con nome…'),el('button',{class:'btn sm',onclick:()=>$('#bOpen').click()},'Apri…')),
      el('p',{class:'note'},SAVE_FS?(projHandle?`Salvato in “${projHandle.name}”: Ctrl+S lo aggiorna. “Salva con nome” per un’altra cartella o un altro nome.`:'Al primo salvataggio scegli la cartella e il nome; poi Ctrl+S salva sempre lì.'):'Il file viene scaricato con questo nome; scegli la cartella nelle impostazioni dei download del browser.')));}
  const ax=el('input',{type:'number',value:S.axis,step:.5,min:0,max:N,'aria-label':'Asse di specchio'});ax.addEventListener('change',()=>{S.axis=clamp(+ax.value||0,0,N);commit();requestDraw();});
  const bmat=el('select',{'aria-label':'Materiale della base'});MATS.forEach(([k,n])=>bmat.append(el('option',{value:k,selected:k===(S.baseMat||'keep')},k==='keep'?'Come nel template':n)));
  bmat.addEventListener('change',()=>{S.baseMat=bmat.value;commit();refreshAll();if(S.baseMat!=='keep'&&S.mode!=='regions')toast('Guarda il risultato con la vista “Materiali”. I dettagli che devono restare alla Base: Materiale → Base (nero).',5000);});
  p.append(custMatSec());
  const B={get color(){return S.base;},set color(v){S.base=v;},get paint(){return S.basePaint;},set paint(v){S.basePaint=v;}};
  const bs=paintSec(B,'Base');bs.append(ctl('Materiale',bmat),
    el('p',{class:'note'},'Il colore riempie tutta la tela sotto i tuoi livelli. Il materiale vale per tutta la carrozzeria verniciata: le parti in carbonio e gli adesivi del template restano come sono. Per i dettagli che devono tornare alla Base (region nero), scegli Materiale → Base (nero) nelle loro proprietà.'));p.append(bs);
  {const sec=el('div',{class:'sec'},el('h3',{},'Immagine di riferimento'));
    if(!REF.cv)sec.append(el('p',{class:'note'},'Carica una livrea già fatta (anche il suo customskin.tga) o uno screenshot: la vedi semitrasparente sulla tela per ricalcarla, il contagocce prende i suoi colori ed “Estrai colore” (X) trasforma ogni colore in un livello da ricolorare. Non viene esportata.'),el('button',{class:'btn sm',onclick:refPick},'Carica riferimento'));
    else{const rb=()=>{refBake();requestDraw();};
      sec.append(el('p',{class:'note'},REF.name),checkCtl('Mostra il riferimento',()=>REF.on,v=>{REF.on=v;}),
        rangeCtl('Opacità',()=>Math.round(REF.op*100),v=>{REF.op=v/100;},5,100,1,v=>v+'%'),
        checkCtl('Sopra ai livelli (togli per vederlo sotto)',()=>REF.above,v=>{REF.above=v;}),
        el('div',{class:'numgrid'},numCtl('Sposta X',()=>REF.dx,v=>{REF.dx=v;rb();}),numCtl('Sposta Y',()=>REF.dy,v=>{REF.dy=v;rb();}),numCtl('Scala %',()=>REF.sc*100,v=>{REF.sc=Math.max(1,v)/100;rb();},.1)),
        el('div',{class:'row',style:'flex-wrap:wrap'},el('button',{class:'btn sm pri',onclick:()=>setTool('wand')},'Estrai colore (X)'),el('button',{class:'btn sm',onclick:refAsLayer},'Metti come livello'),
          el('button',{class:'btn sm',onclick:refPick},'Cambia'),el('button',{class:'btn sm',onclick:()=>{REF.src=null;REF.blob=null;refBake();refreshAll();setHint();scheduleSave();}},'Togli')));}
    p.append(sec);}
  p.append(el('div',{class:'sec'},el('h3',{},'Linee del template'),checkCtl('Mostra le linee',()=>S.wire.on,v=>{S.wire.on=v;$('#bWire').setAttribute('aria-pressed',String(v));}),
    rangeCtl('Intensità',()=>Math.round(S.wire.op*100),v=>{S.wire.op=v/100;},10,100,1,v=>v+'%'),el('p',{class:'note'},'Le linee servono solo come guida e non vengono esportate.')));
  p.append(el('div',{class:'sec'},el('h3',{},'Asse di specchio'),ctl('Posizione y',ax),el('p',{class:'note'},'Le forme con “Duplica sull’altro lato” si riflettono rispetto a questa riga orizzontale. Nel template della Genesis i due fianchi sono sopra e sotto la metà della tela: parti da 2048 e correggi guardando la linea arancione.')));
  if(FS_OK){
    p.append(el('div',{class:'sec'},el('h3',{},'Cartelle del gioco'),
      el('p',{class:'note'},gameDir?`Cartella di LMU: ${gameDir.name}`:'Nessuna cartella di LMU collegata.'),
      el('button',{class:'btn sm',onclick:()=>pickGameDir()},gameDir?'Cambia cartella di LMU':'Collega la cartella di LMU'),
      el('p',{class:'note',style:'margin-top:10px'},S.tplName&&outDirs[S.tplName]?`Per “${S.tplName}” la livrea va in una cartella scelta da te: ${outDirs[S.tplName].name}.`:(gameDir?'Le livree vanno in UserData/Liveries dentro la cartella di LMU, dove le legge lo showroom: non devi scegliere niente.':'Collegando la cartella di LMU, le livree finiscono da sole in UserData/Liveries.')),
      S.tplName&&outDirs[S.tplName]?el('button',{class:'btn sm',onclick:()=>useDefaultDir()},'Torna a UserData/Liveries'):(S.tplName?el('button',{class:'btn sm',onclick:()=>pickOutDir()},'Usa un’altra cartella'):null),
      el('label',{class:'chk',style:'margin-top:10px'},(()=>{const i=el('input',{type:'checkbox'});i.checked=autoGame;i.onchange=()=>{autoGame=i.checked;try{localStorage.setItem('liverylab-autogame',autoGame?'1':'0');}catch(e){}if(autoGame){toast('Dopo il primo “Esporta nel gioco”, ogni modifica viene scritta da sola nella cartella della livrea.',5000);scheduleGame();}};return i;})(),'Aggiorna il gioco da solo dopo ogni modifica'),
      el('p',{class:'note'},'Funziona dopo che hai fatto almeno un “Esporta nel gioco” in questa sessione. Per vedere la livrea sull’auto, tieni LMU aperto nello showroom e premi RELOAD.')));
  }
  p.append(perfSec());
  p.append(el('div',{class:'sec'},el('h3',{},'Esportare per LMU'),el('p',{class:'note'},FS_OK?'“Esporta nel gioco” scrive customskin.tga (la livrea) e customskin_region.tga (i materiali) direttamente nella cartella della livrea. “Esporta zip” crea gli stessi file in uno zip, se preferisci copiarli a mano.':'“Esporta zip” crea uno zip con customskin.tga (la livrea) e customskin_region.tga (i materiali). Estrai lo zip e copia i file nella cartella delle livree custom della tua auto. Aprendo Livery Lab come file in Chrome o Edge puoi invece leggere e scrivere direttamente nelle cartelle del gioco.')));
}
function custMatSec(){
  const sec=el('div',{class:'sec',id:'secCust'},el('h3',{},'Materiali personalizzati'),
    el('p',{class:'note'},'Un colore esatto della mappa region, per esempio #000400 per l’oro. Viene scritto così com’è in customskin_region.tga e nella vista Materiali lo vedi con il suo colore vero (#000400 è quasi nero: con “Evidenzia” lo distingui dalla Base). Poi sceglilo come Materiale di un livello, di un gruppo, di un contorno o della base.'));
  for(const c of S.customMats){
    const nm=el('input',{type:'text',value:c.n,'aria-label':'Nome del materiale',style:'flex:1;min-width:0'});nm.addEventListener('change',()=>{c.n=nm.value.trim()||c.n;syncMats();rememberCust();commit();refreshAll();});
    const hx=el('input',{type:'text',value:c.hex,class:'hex','aria-label':'Colore region esatto',style:'width:84px'});
    hx.addEventListener('change',()=>{const h=normHex(hx.value);if(!h||S.customMats.some(o=>o!==c&&o.hex===h)){toast('Colore non valido o già usato.');hx.value=c.hex;return;}
      const ok=c.k,nk=custKey(h);c.hex=h;c.k=nk;for(const l of S.layers){if(l.mat===ok)l.mat=nk;if(l.outMat===ok)l.outMat=nk;}if(S.baseMat===ok)S.baseMat=nk;syncMats();rememberCust();commit();refreshAll();});
    const sh=el('input',{type:'color',value:c.show||'#C9A24B','aria-label':'Colore di evidenziazione',title:c.hl?'Colore con cui lo evidenzi nella vista Materiali':'Attiva “Evidenzia” per vederlo con questo colore'});if(!c.hl)sh.style.opacity='.35';sh.addEventListener('change',()=>{c.show=sh.value;c.hl=true;syncMats();rememberCust();commit();refreshAll();});
    const hl=el('label',{class:'chk',style:'margin:0;white-space:nowrap',title:'Nella vista Materiali mostralo con un colore ben visibile invece del suo colore vero'},(()=>{const i=el('input',{type:'checkbox'});i.checked=!!c.hl;i.onchange=()=>{c.hl=i.checked;syncMats();rememberCust();commit();refreshAll();};return i;})(),'Evidenzia');
    const used=S.layers.filter(l=>l.mat===c.k||l.outMat===c.k).length+(S.baseMat===c.k?1:0);
    sec.append(el('div',{class:'row',style:'gap:6px'},sh,nm,hx,hl,el('button',{class:'ib',title:'Togli il materiale'+(used?` (usato da ${used})`:''),'aria-label':'Togli '+c.n,onclick:()=>{
      if(used&&!confirm(`“${c.n}” è usato da ${used} ${used===1?'elemento':'elementi'}: tornano a “Non cambia”. Continuo?`))return;
      for(const l of S.layers){if(l.mat===c.k)l.mat='keep';if(l.outMat===c.k)l.outMat='same';}if(S.baseMat===c.k)S.baseMat='keep';
      S.customMats=S.customMats.filter(o=>o!==c);syncMats();commit();refreshAll();}},'✕')));}
  const nh=el('input',{type:'text',placeholder:'#000400',class:'hex','aria-label':'Nuovo colore region',style:'width:84px'});
  sec.append(el('div',{class:'row',style:'flex-wrap:wrap;gap:6px'},nh,el('button',{class:'btn sm pri',onclick:()=>{const v=nh.value.trim();if(!v){nh.focus();return;}const n=prompt('Nome del materiale','Oro');if(n===null)return;if(addCustomMat(v,n.trim()))toast('Materiale aggiunto: ora lo trovi nei menu Materiale.');}},'Aggiungi'),
    S.customMats.some(c=>c.hex==='#000400')?null:el('button',{class:'btn sm',onclick:()=>addCustomMat('#000400','Oro','#C9A24B')},'Oro #000400')));
  const extra=savedCust.filter(c=>!S.customMats.some(o=>o.k===c.k));
  if(extra.length)sec.append(el('div',{class:'row',style:'flex-wrap:wrap;gap:6px'},el('span',{class:'note',style:'margin:0'},'Usati prima:'),...extra.map(c=>el('button',{class:'btn sm',title:'Aggiungi a questo lavoro',onclick:()=>addCustomMat(c.hex,c.n,c.show)},`${c.n} ${c.hex}`))));
  return sec;
}
function perfSec(){
  const sec=el('details',{class:'sec adv'},el('summary',{},'Prestazioni'));
  sec.append(el('p',{class:'note'},`Lettura del PSD, riconoscimento dei pezzi, riempimenti e conversione in TGA girano ${wkMode==='Web Worker'?'in un Web Worker: l’interfaccia resta libera mentre lavorano':'nel '+(wkMode||'thread principale')}. Ultimi tempi misurati:`));
  const rows=PERF.slice(-14).reverse();
  sec.append(rows.length?el('div',{class:'xkv'},...rows.flatMap(r=>[el('span',{},r.name),el('div',{},r.ms+' ms'+(r.extra?' · '+r.extra:''))])):el('p',{class:'note'},'Ancora niente: apri un template o esporta.'));
  sec.append(el('button',{class:'btn sm',onclick:async()=>{const t=`Livery Lab ${APP_VERSION} · ${wkMode} · ${navigator.userAgent}\n`+PERF.map(r=>`${new Date(r.t).toLocaleTimeString('it-IT')} ${r.name}: ${r.ms} ms ${r.extra}`).join('\n');
    try{await navigator.clipboard.writeText(t);toast('Tempi copiati: incollali in una segnalazione.');}catch(e){toast('Non riesco a copiare negli appunti.');}}},'Copia i tempi'));
  return sec;
}
function setLegend(){const lg=$('#legend');lg.hidden=S.mode!=='regions';if(!lg.hidden&&!lg.childElementCount)MATS.filter(m=>m[2]).forEach(m=>lg.append(el('span',{},el('i',{style:`background:${matCol(m[0])}`}),m[1].replace(/ \(.*\)/,''))));}
$('#vLiv').onclick=()=>{S.mode='livery';setLegend();$('#vLiv').setAttribute('aria-pressed','true');$('#vMat').setAttribute('aria-pressed','false');requestDraw();};
$('#vMat').onclick=()=>{S.mode='regions';setLegend();$('#vMat').setAttribute('aria-pressed','true');$('#vLiv').setAttribute('aria-pressed','false');requestDraw();if(!regionCv&&!S.layers.some(l=>l.mat&&l.mat!=='keep'))toast('Nessun materiale ancora: imposta “Materiale” nelle proprietà di un livello.');};
function togglePreview(){S.preview=!S.preview;$('#bPrev').setAttribute('aria-pressed',String(S.preview));requestDraw();if(S.preview)toast('Anteprima: la livrea come la vedrà il gioco. G o “Anteprima” per tornare.');}
$('#bPrev').onclick=togglePreview;
try{S.snap=localStorage.getItem('liverylab-snap')!=='0';}catch(e){}
$('#bSnap').setAttribute('aria-pressed',String(S.snap));$('#bSnap').onclick=()=>{S.snap=!S.snap;$('#bSnap').setAttribute('aria-pressed',String(S.snap));try{localStorage.setItem('liverylab-snap',S.snap?'1':'0');}catch(e){}};
$('#bHelp').onclick=()=>{showHints=!showHints;try{localStorage.setItem('liverylab-hints',showHints?'1':'0');}catch(e){}$('#bHelp').setAttribute('aria-pressed',String(showHints));setHint();};
$('#bHelp').setAttribute('aria-pressed',String(showHints));
$('#bWire').onclick=()=>{S.wire.on=!S.wire.on;$('#bWire').setAttribute('aria-pressed',String(S.wire.on));buildDoc();requestDraw();};


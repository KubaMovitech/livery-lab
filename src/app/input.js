/* ================= input ================= */
function evPos(e){const r=view.getBoundingClientRect();return{px:e.clientX-r.left,py:e.clientY-r.top};}
function evWorld(e){const p=evPos(e);return s2w(p.px,p.py);}
function hitHandle(l,w){if(!l||l.type!=='shape'||l.parts)return -1;const r=HR()*1.6;for(let i=l.pts.length-1;i>=0;i--)if(Math.hypot(l.pts[i].x-w.x,l.pts[i].y-w.y)<=r)return i;return -1;}
const hitCtx=mk(2,2).getContext('2d');
function inBox(l,w,y,rot){const b=l.type==='text'?textBox(l):imgBox(l),a=-(rot||0)*Math.PI/180,dx=w.x-l.x,dy=w.y-y;const lx=dx*Math.cos(a)-dy*Math.sin(a),ly=dx*Math.sin(a)+dy*Math.cos(a);return Math.abs(lx)<=b.w/2&&Math.abs(ly)<=b.h/2;}
/* ---- selezione multipla, limiti e spostamenti ---- */
function selIds(){return [S.sel,...(S.msel||[])].filter((id,i,a)=>id&&getLayer(id)&&a.indexOf(id)===i);}
function selLayers(){return selIds().map(getLayer);}
function isSel(id){return id===S.sel||(S.msel||[]).includes(id);}
function setSel(ids){ids=ids.filter(id=>getLayer(id));S.sel=ids[0]||null;S.msel=ids.slice(1);}
function toggleSel(id){const ids=selIds();const i=ids.indexOf(id);if(i>=0)ids.splice(i,1);else ids.push(id);setSel(ids);}
function bounds(l){
  if(l.type==='shape'&&l.pts.length)return bbox(l.pts);
  if(l.type==='text'||l.type==='image'){const H=xformHandles(l);return H?bbox(H.corners):null;}
  if(l.type==='fill'){const c=fillCache(l);return c&&c.w?{x0:c.x,y0:c.y,x1:c.x+c.w,y1:c.y+c.h}:null;}
  if(l.type==='paint'){const q=[];for(const st of l.strokes)for(let i=0;i<st.pts.length;i+=2)q.push({x:st.pts[i],y:st.pts[i+1]});return q.length?bbox(q):null;}
  return null;
}
function unionB(list){let b=null;for(const l of list){const q=bounds(l);if(!q)continue;b=b?{x0:Math.min(b.x0,q.x0),y0:Math.min(b.y0,q.y0),x1:Math.max(b.x1,q.x1),y1:Math.max(b.y1,q.y1)}:{...q};}return b;}
const movable=l=>l&&!l.locked&&l.type!=='fill';
function shiftFrom(l,o,dx,dy){
  if(l.type==='shape')l.pts.forEach((p,i)=>{p.x=o.pts[i].x+dx;p.y=o.pts[i].y+dy;});
  else if(l.type==='paint')l.strokes.forEach((s,i)=>{s.pts=o.strokes[i].pts.map((v,k)=>v+(k%2?dy:dx));});
  else if(l.type==='text'||l.type==='image'){l.x=o.x+dx;l.y=o.y+dy;}
}
function shiftBy(l,dx,dy){shiftFrom(l,JSON.parse(JSON.stringify(l)),dx,dy);}
/* calamita: aggancia bordi e centri al centro della tela, all'asse e agli altri tuoi livelli */
function snapMove(b,dx,dy,ids){
  const th=8/S.view.z,X=[0,N/2,N],Y=[0,N/2,N,S.axis],G=[];
  let n=0;for(const l of S.layers){if(l.fromTemplate||ids.includes(l.id)||!vis(l)||n>80)continue;const q=bounds(l);if(!q)continue;n++;X.push(q.x0,(q.x0+q.x1)/2,q.x1);Y.push(q.y0,(q.y0+q.y1)/2,q.y1);}
  const best=(cands,targets)=>{let m=null;for(const c of cands)for(const t of targets){const d=t-c;if(Math.abs(d)<th&&(!m||Math.abs(d)<Math.abs(m.d)))m={d,t};}return m;};
  const mx=best([b.x0+dx,(b.x0+b.x1)/2+dx,b.x1+dx],X),my=best([b.y0+dy,(b.y0+b.y1)/2+dy,b.y1+dy],Y);
  if(mx){dx+=mx.d;G.push({x:mx.t});}if(my){dy+=my.d;G.push({y:my.t});}
  return{dx,dy,G};
}
/* il pixel dell'immagine sotto il punto è visibile? (gli adesivi del template hanno riquadri enormi quasi tutti trasparenti) */
function imgOpaqueAt(l,w){
  const im=images[l.imgId];if(!im)return false;const a=-(l.rot||0)*Math.PI/180,dx=w.x-l.x,dy=w.y-l.y;
  let lx=(dx*Math.cos(a)-dy*Math.sin(a))/(l.scale*(l.sx||1)),ly=(dx*Math.sin(a)+dy*Math.cos(a))/(l.scale*(l.sy||1));if(l.flipX)lx=-lx;if(l.flipY)ly=-ly;
  const px=Math.floor(lx+im.w/2),py=Math.floor(ly+im.h/2);if(px<0||py<0||px>=im.w||py>=im.h)return false;
  if(!im.hit){const c=im.img instanceof HTMLCanvasElement?im.img:(()=>{const c=mk(im.w,im.h);c.getContext('2d').drawImage(im.img,0,0);return c;})();im.hit=c.getContext('2d',{willReadFrequently:true});}
  try{return im.hit.getImageData(px,py,1,1).data[3]>24;}catch(e){return true;}
}
function hitTest(l,w){
  if(!vis(l)||l.guide)return false;
  if(l.type==='shape'){const p=shapePath(l);return hitCtx.isPointInPath(p,w.x,w.y)||(l.mirror&&hitCtx.isPointInPath(p,w.x,mirrorY(w.y)));}
  if(l.type==='fill'){const c=fillCache(l);return !!(c&&c.ids.has(labelAt(l.mode,w.x,w.y)));}
  if(l.type==='text'||l.type==='image'){
    const box=inBox(l,w,l.y,l.rot)||(l.mirror&&inBox(l,w,mirrorY(l.y),(l.rot||0)+(l.mirrorRot?180:0)));
    return box&&(!l.fromTemplate||l.type!=='image'||imgOpaqueAt(l,w));}
  return false;
}
/* prima i livelli tuoi, poi quelli del template: un adesivo bloccato non “ruba” più il clic ai tuoi loghi */
function hitLayer(w){
  for(const mine of [true,false])for(let i=S.layers.length-1;i>=0;i--){const l=S.layers[i];if(!!l.fromTemplate===mine)continue;if(hitTest(l,w))return l;}
  return null;
}
function nearestSeg(l,w){let best=-1,bd=40/S.view.z;const n=l.pts.length;for(let i=0;i<n;i++){const a=l.pts[i],b=l.pts[(i+1)%n],dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy||1,t=clamp(((w.x-a.x)*dx+(w.y-a.y)*dy)/len,0,1),d=Math.hypot(a.x+t*dx-w.x,a.y+t*dy-w.y);if(d<bd){bd=d;best=i;}}return best;}
let panning=null,spaceDown=false,nudgeT=null,curT=0;
view.addEventListener('pointerdown',e=>{
  view.setPointerCapture(e.pointerId);const w=evWorld(e),{px,py}=evPos(e);
  if(e.button===1||e.button===2||spaceDown||S.tool==='pan'){panning={px,py,vx:S.view.x,vy:S.view.y};view.style.cursor='grabbing';return;}
  const t=S.tool;
  if(t==='pick'||(e.altKey&&t!=='pan')){pickColor(w);return;}
  if(t==='wand'){const wm=S.act.wmode||'color';
    if(wm==='color'){extractColor(w);return;}if(wm==='piece'){extractPiece(w);return;}
    if(!REF.cv){toast('Carica prima la livrea di riferimento (Documento → Immagine di riferimento).',5000);return;}
    if(wm==='lasso'){drawing={lasso:true,wand:true,pts:[w]};return;}if(wm==='rect'){drag={kind:'create',a:w,b:w};return;}}
  if(t==='free'){if(!drawing)drawing={pts:[]};const f=drawing.pts[0];if(f&&drawing.pts.length>=3&&Math.hypot(f.x-w.x,f.y-w.y)<=HR()*1.8){finishDrawing();return;}drawing.pts.push({x:w.x,y:w.y,c:e.shiftKey});requestDraw();setHint();return;}
  if(t==='lasso'){drawing={lasso:true,pts:[w]};return;}
  if(t==='rect'||t==='ellipse'){drag={kind:'create',a:w,b:w};return;}
  if(t==='island'||t==='panel'){doFill(t,w);return;}
  if(t==='brush'){const l=paintTarget();const s={pts:[w.x,w.y],size:S.brush,color:S.act.color};l.strokes.push(s);drag={kind:'stroke',s};requestDraw();return;}
  if(t==='eraser'){const l=selLayer();if(!l){toast('Seleziona il livello da cancellare, poi passa la gomma.');return;}if(l.locked){toast('Il livello è bloccato: sbloccalo nelle proprietà per cancellarlo.');return;}l.erase=l.erase||[];const s={pts:[w.x,w.y],size:S.eraser};l.erase.push(s);drag={kind:'stroke',s};requestDraw();return;}
  if(t==='text'){ensureFont('Barlow Condensed');addLayer({type:'text',name:'Testo '+S.uid,text:'TESTO',x:w.x,y:w.y,size:180,font:'Barlow Condensed',color:S.act.color,bold:true,italic:false,rot:0,spacing:0,mirror:false,mirrorRot:true,outline:{on:false,color:'#FFFFFF',width:8},shadow:{on:false,color:'#000000',alpha:.6,blur:12,dx:8,dy:8}});setTool('select');setTab('P');return;}
  const cur=selLayer();
  {const hx=hitXform(cur,w);if(hx){const t=hx.H.t;drag={kind:hx.kind,id:cur.id,orig:JSON.stringify(cur),cx:t.cx,cy:t.cy,d0:Math.hypot(w.x-t.cx,w.y-t.cy)||1,a0:Math.atan2(w.y-t.cy,w.x-t.cx),rot:t.rot,hw:t.w/2||1,hh:t.h/2||1,moved:false};return;}}
  const hi=hitHandle(cur,w);
  if(hi>=0&&!cur.locked){drag={kind:'pt',idx:hi};return;}
  // clic dentro il livello già selezionato: lo sposto, anche se sopra c'è altro
  const inSel=selLayers().find(l=>movable(l)&&hitTest(l,w));
  const hit=inSel||((cur&&!cur.locked&&cur.type!=='fill'&&hitTest(cur,w))?cur:hitLayer(w));
  if(hit&&e.shiftKey){toggleSel(hit.id);refreshPanels();requestDraw();return;}
  if(hit){if(!isSel(hit.id))setSel([hit.id]);refreshPanels();
    const ms=selLayers().filter(movable);if(ms.length&&movable(hit)){const origs={};ms.forEach(l=>origs[l.id]=JSON.parse(JSON.stringify(l)));drag={kind:'move',start:w,origs,ids:ms.map(l=>l.id),b0:unionB(ms),moved:false};}}
  else if(!e.shiftKey){setSel([]);refreshPanels();panning={px,py,vx:S.view.x,vy:S.view.y};}
  requestDraw();
});
view.addEventListener('pointermove',e=>{
  const w=evWorld(e),{px,py}=evPos(e);hover=w;
  if(panning){S.view.x=panning.vx+(px-panning.px);S.view.y=panning.vy+(py-panning.py);requestDraw();return;}
  if(drawing&&drawing.lasso){const q=drawing.pts[drawing.pts.length-1];if(Math.hypot(q.x-w.x,q.y-w.y)>8/S.view.z)drawing.pts.push(w);requestDraw(true);return;}
  if(!drag){
    const now=performance.now();if(now-curT<50){requestDraw(true);return;}curT=now;
    const cur=selLayer(),hx=S.tool==='select'?hitXform(cur,w):null;
    view.style.cursor=spaceDown?'grab':hx?({rot:'grab',scale:'nwse-resize',sx:'ew-resize',sy:'ns-resize'})[hx.kind]:(S.tool==='select'&&(()=>{const h=(cur&&hitTest(cur,w))?cur:hitLayer(w);return h&&!h.locked&&h.type!=='fill';})()?'move':null)||({free:'crosshair',lasso:'crosshair',rect:'crosshair',ellipse:'crosshair',island:'cell',panel:'cell',pick:'copy',wand:'crosshair',text:'text',pan:'grab',brush:'none',eraser:'none'})[S.tool]||(cur&&hitHandle(cur,w)>=0?'pointer':'default');
    requestDraw(true);return;
  }
  if(drag.kind==='create'){drag.b=w;requestDraw(true);return;}
  else if(drag.kind==='stroke'){const p=drag.s.pts,lx=p[p.length-2],ly=p[p.length-1];if(Math.hypot(lx-w.x,ly-w.y)>Math.max(1.5/S.view.z,drag.s.size*.12))p.push(w.x,w.y);}
  else if(drag.kind==='pt'){const p=selLayer().pts[drag.idx];p.x=w.x;p.y=w.y;drag.moved=true;}
  else if(drag.kind==='sx'||drag.kind==='sy'){
    // maniglie sui lati: stirano solo in larghezza o in altezza
    const l=getLayer(drag.id),o=JSON.parse(drag.orig),a=drag.rot*Math.PI/180,dx=w.x-drag.cx,dy=w.y-drag.cy,lx=dx*Math.cos(a)+dy*Math.sin(a),ly=-dx*Math.sin(a)+dy*Math.cos(a);drag.moved=true;
    const f=Math.max(.02,drag.kind==='sx'?Math.abs(lx)/drag.hw:Math.abs(ly)/drag.hh);
    if(l.type==='shape')l.pts.forEach((p,i)=>{if(drag.kind==='sx')p.x=drag.cx+(o.pts[i].x-drag.cx)*f;else p.y=drag.cy+(o.pts[i].y-drag.cy)*f;});
    else if(drag.kind==='sx')l.sx=(o.sx||1)*f;else l.sy=(o.sy||1)*f;
  }
  else if(drag.kind==='scale'||drag.kind==='rot'){
    const l=getLayer(drag.id),o=JSON.parse(drag.orig);drag.moved=true;
    if(drag.kind==='scale'){const f=Math.max(.02,Math.hypot(w.x-drag.cx,w.y-drag.cy)/drag.d0);
      if(l.type==='image')l.scale=o.scale*f;else if(l.type==='text')l.size=Math.max(4,o.size*f);
      else if(l.type==='shape')l.pts.forEach((p,i)=>{p.x=drag.cx+(o.pts[i].x-drag.cx)*f;p.y=drag.cy+(o.pts[i].y-drag.cy)*f;});}
    else{let da=(Math.atan2(w.y-drag.cy,w.x-drag.cx)-drag.a0)*180/Math.PI;
      if(l.type==='shape'){if(e.shiftKey)da=Math.round(da/15)*15;const r=da*Math.PI/180,c=Math.cos(r),sn=Math.sin(r);l.pts.forEach((p,i)=>{const dx=o.pts[i].x-drag.cx,dy=o.pts[i].y-drag.cy;p.x=drag.cx+dx*c-dy*sn;p.y=drag.cy+dx*sn+dy*c;});}
      else{let nr=(o.rot||0)+da;if(e.shiftKey)nr=Math.round(nr/15)*15;l.rot=((nr%360)+540)%360-180;}}
  }
  else if(drag.kind==='move'){let dx=w.x-drag.start.x,dy=w.y-drag.start.y;if(Math.abs(dx)+Math.abs(dy)>2/S.view.z)drag.moved=true;
    drag.guides=null;if(S.snap&&!(e.ctrlKey||e.metaKey)&&drag.b0){const r=snapMove(drag.b0,dx,dy,drag.ids);dx=r.dx;dy=r.dy;drag.guides=r.G;}
    for(const id of drag.ids){const l=getLayer(id);if(l)shiftFrom(l,drag.origs[id],dx,dy);}}
  requestDraw();
});
view.addEventListener('pointerleave',()=>{hover=null;requestDraw(true);});
view.addEventListener('pointerup',()=>{
  if(panning){panning=null;view.style.cursor='';return;}
  if(drawing&&drawing.lasso){finishLasso();return;}
  if(!drag)return;
  if(drag.kind==='create'&&S.tool==='wand'){const a=drag.a,b=drag.b;drag=null;if(Math.abs(b.x-a.x)>8&&Math.abs(b.y-a.y)>8){const pts=rectPts(a,b);refCut(polyMask(pts),bbox(pts),'Ritaglio dal riferimento',true);}requestDraw();return;}
  if(drag.kind==='create'){const a=drag.a,b=drag.b;drag=null;if(Math.abs(b.x-a.x)>20&&Math.abs(b.y-a.y)>20){const l=newShape(S.tool==='rect'?rectPts(a,b):ellipsePts(a,b),S.tool!=='rect');l.name=(S.tool==='rect'?'Rettangolo ':'Ellisse ')+S.uid;addLayer(l);setTool('select');}requestDraw();return;}
  if(drag.kind==='stroke'){drag=null;commit();refreshAll();return;}
  if(drag.moved){commit();buildProps();}drag=null;requestDraw();
});
view.addEventListener('dblclick',e=>{
  if(S.tool==='free'){if(drawing&&drawing.pts.length>=4)drawing.pts.pop();finishDrawing();return;}
  if(S.tool!=='select')return;
  const w=evWorld(e),cur=selLayer();if(!cur||cur.type!=='shape'||cur.locked)return;
  const hi=hitHandle(cur,w);if(hi>=0){cur.pts[hi].c=!cur.pts[hi].c;commit();requestDraw();return;}
  if(cur.parts)return;const i=nearestSeg(cur,w);if(i>=0){cur.pts.splice(i+1,0,{x:w.x,y:w.y,c:false});commit();requestDraw();}
});
view.addEventListener('contextmenu',e=>{e.preventDefault();const w=evWorld(e),cur=selLayer();if(cur&&cur.type==='shape'&&!cur.locked){const hi=hitHandle(cur,w);if(hi>=0&&cur.pts.length>3){cur.pts.splice(hi,1);commit();requestDraw();}}});
view.addEventListener('wheel',e=>{e.preventDefault();const{px,py}=evPos(e);setZoom(S.view.z*Math.exp(-e.deltaY*.0015),px,py);},{passive:false});
function setZoom(z,px,py){z=clamp(z,.04,6);const r=view.getBoundingClientRect();if(px==null){px=r.width/2;py=r.height/2;}const w=s2w(px,py);S.view.z=z;S.view.x=px-w.x*z;S.view.y=py-w.y*z;requestDraw();}
function fit(){const r=view.getBoundingClientRect(),z=Math.min(r.width,r.height)/N*.96;S.view.z=z;S.view.x=(r.width-N*z)/2;S.view.y=(r.height-N*z)/2;requestDraw();}
$('#zIn').onclick=()=>setZoom(S.view.z*1.25);$('#zOut').onclick=()=>setZoom(S.view.z/1.25);$('#zFit').onclick=fit;
window.addEventListener('keydown',e=>{
  const tg=(e.target.tagName||'').toLowerCase(),typing=tg==='textarea'||tg==='select'||(tg==='input'&&['text','number','search','email'].includes(e.target.type));
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){if(typing)return;e.preventDefault();e.shiftKey?redo():undo();return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();(e.shiftKey?$('#bSaveAs'):$('#bSave')).click();return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){if(typing)return;e.preventDefault();redo();return;}
  if(typing)return;
  if(e.code==='Space'){spaceDown=true;view.style.cursor='grab';e.preventDefault();return;}
  if(e.key==='Enter'&&drawing){finishDrawing();return;}
  if(e.key==='Escape'){drawing=null;drag=null;if((S.tool==='island'||S.tool==='panel')&&S.sel){S.sel=null;refreshPanels();buildOpts();requestDraw();return;}setTool('select');return;}
  if(e.key.startsWith('Arrow')&&S.sel&&tg!=='input'){const ms=selLayers().filter(movable);if(!ms.length){if(selLayer()&&selLayer().locked)toast('Il livello è bloccato.');return;}e.preventDefault();
    const st=e.shiftKey?10:1,dx=e.key==='ArrowLeft'?-st:e.key==='ArrowRight'?st:0,dy=e.key==='ArrowUp'?-st:e.key==='ArrowDown'?st:0;
    for(const l of ms)shiftBy(l,dx,dy);
    requestDraw();clearTimeout(nudgeT);nudgeT=setTimeout(()=>{commit();buildProps();},400);return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'&&S.sel){e.preventDefault();if(S.msel.length)dupLayers(selIds());else dupLayer(S.sel);return;}
  if((e.key==='Delete'||e.key==='Backspace')&&S.sel){if(S.msel.length)deleteLayers(selIds());else deleteLayer(S.sel);return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='a'&&wireCv){e.preventDefault();setSel(S.layers.filter(l=>!l.fromTemplate&&vis(l)&&movable(l)).map(l=>l.id));setTool('select');refreshPanels();requestDraw();return;}
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.key.toLowerCase()==='g'){togglePreview();return;}
  const k=e.key.toLowerCase(),t=TOOLS.find(x=>x&&x[2]===k);if(t){if(t[0]==='image')$('#fImg').click();else setTool(t[0]);}
});
window.addEventListener('keyup',e=>{if(e.code==='Space'){spaceDown=false;view.style.cursor='';}});


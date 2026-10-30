/* ================= rendering ================= */
/* Modulo isolato: vede solo quello che riceve. use = costanti e funzioni degli altri moduli,
   live = variabili condivise che altri moduli cambiano (si leggono e scrivono come live.nome). */
LL_MODULES.render=function(use,live){
"use strict";
const {
  N,$,perfLog,pnow,wcall,mk,matCol,sepOutline,S,images,toast,selLayer,
  paintStyle,shapePath,bbox,mirrorY,labelAt,selLayers,bounds
}=use;
/* PART: nella mappa dei materiali un livello si può disegnare in due passate, corpo ('body') e contorno ('edge'),
   quando il contorno ha un materiale suo (l.outMat) */
let PART=null;
const TMP={};
function tmp(name,w,h){let c=TMP[name];if(!c)c=TMP[name]=mk(w,h);if(c.width!==w||c.height!==h){c.width=w;c.height=h;}const x=c.getContext('2d');x.setTransform(1,0,0,1,0,0);x.globalAlpha=1;x.globalCompositeOperation='source-over';x.clearRect(0,0,w,h);return c;}
function hexA(hex,a){const n=parseInt(hex.slice(1),16);return`rgba(${n>>16&255},${n>>8&255},${n&255},${a})`;}

function fillStyleShape(ctx,l,color){
  if(l.paint&&l.paint.pat&&l.paint.pat!=='none')return paintStyle(ctx,l.paint,color,0,0,bbox(l.pts));
  if(!l.fade||!l.fade.on)return color;
  const b=bbox(l.pts),cx=(b.x0+b.x1)/2,cy=(b.y0+b.y1)/2,a=(l.fade.angle||0)*Math.PI/180,half=Math.hypot(b.x1-b.x0,b.y1-b.y0)/2*(l.fade.len??1);
  const g=ctx.createLinearGradient(cx-Math.cos(a)*half,cy-Math.sin(a)*half,cx+Math.cos(a)*half,cy+Math.sin(a)*half);
  g.addColorStop(0,color);g.addColorStop(1,hexA(color,0));return g;
}
function drawShapeOnce(ctx,l,color,flipped,alpha,flat){
  const path=shapePath(l);
  ctx.save();if(flipped){ctx.translate(0,2*S.axis);ctx.scale(1,-1);}
  ctx.globalAlpha=alpha;if(!l.noFill&&PART!=='edge'){ctx.fillStyle=flat?'#000':fillStyleShape(ctx,l,color);ctx.fill(path);}
  if(PART!=='body'&&l.stroke&&l.stroke.on&&l.stroke.width>0){ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle=l.stroke.color;ctx.lineWidth=l.stroke.width;ctx.stroke(path);}ctx.restore();
  if(PART!=='body'&&l.pin&&l.pin.on){
    const cv=ctx.canvas,tc=tmp('pin',cv.width,cv.height),t=tc.getContext('2d');
    t.setTransform(ctx.getTransform());if(flipped){t.translate(0,2*S.axis);t.scale(1,-1);}
    t.lineJoin='round';t.strokeStyle=l.pin.color;t.lineWidth=2*(l.pin.offset+l.pin.width);t.stroke(path);
    t.globalCompositeOperation='destination-out';t.lineWidth=2*l.pin.offset;t.stroke(path);t.fill(path);
    ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=alpha;ctx.drawImage(tc,0,0);ctx.restore();
  }
}
function strokePath(ctx,s,color){
  const p=s.pts;ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=s.size;
  if(p.length<=2){ctx.beginPath();ctx.arc(p[0],p[1],s.size/2,0,7);ctx.fill();ctx.restore();return;}
  ctx.beginPath();ctx.moveTo(p[0],p[1]);
  for(let i=2;i<p.length-2;i+=2){const mx=(p[i]+p[i+2])/2,my=(p[i+1]+p[i+3])/2;ctx.quadraticCurveTo(p[i],p[i+1],mx,my);}
  ctx.lineTo(p[p.length-2],p[p.length-1]);ctx.stroke();ctx.restore();
}
function drawText(ctx,l,alpha){
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(l.x,l.y);ctx.rotate((l.rot||0)*Math.PI/180);ctx.scale((l.flipX?-1:1)*(l.sx||1),(l.flipY?-1:1)*(l.sy||1));
  ctx.font=`${l.italic?'italic ':''}${l.bold?'700 ':'400 '}${l.size}px "${l.font}", sans-serif`;
  ctx.textAlign='center';ctx.textBaseline='middle';
  if('letterSpacing' in ctx)ctx.letterSpacing=(l.spacing||0)+'px';
  const lines=String(l.text).split('\n'),lh=l.size*1.15,y0=-(lines.length-1)*lh/2;
  const ol=l.outline&&l.outline.on&&l.outline.width>0,sh=l.shadow&&l.shadow.on,m=ctx.getTransform(),k=Math.hypot(m.a,m.b);
  // le ombre del canvas non seguono la trasformazione: le scalo a mano, così restano uguali a ogni zoom e nell'export
  const setSh=on=>{if(on){ctx.shadowColor=hexA(l.shadow.color,l.shadow.alpha??.6);ctx.shadowBlur=(l.shadow.blur||0)*k;ctx.shadowOffsetX=(l.shadow.dx||0)*k;ctx.shadowOffsetY=(l.shadow.dy||0)*k;}else{ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;}};
  const arc=(l.arc||0)*Math.PI/180;
  // testo curvo: ogni lettera sta su un arco; arco positivo = a ponte, negativo = a sorriso
  const put=(fn,t,y)=>{if(!arc){fn(t,0,y);return;}
    const sg=Math.sign(arc),cw=[...t].map(ch=>ctx.measureText(ch).width),tw=cw.reduce((a,b)=>a+b,0)||1,R0=tw/Math.abs(arc),Rr=R0-sg*y;let a=-tw/2/R0;
    [...t].forEach((ch,j)=>{a+=cw[j]/2/R0;ctx.save();ctx.translate(Math.sin(a)*Rr,sg*(R0-Math.cos(a)*Rr));ctx.rotate(sg*a);fn(ch,0,0);ctx.restore();a+=cw[j]/2/R0;});};
  lines.forEach((t,i)=>{const y=y0+i*lh;
    if(ol){if(PART!=='body'){setSh(sh);ctx.lineJoin='round';ctx.strokeStyle=l.outline.color;ctx.lineWidth=l.outline.width*2;put((a,b,c)=>ctx.strokeText(a,b,c),t,y);setSh(false);}if(PART!=='edge'){ctx.fillStyle=l.color;put((a,b,c)=>ctx.fillText(a,b,c),t,y);}}
    else if(PART!=='edge'){setSh(sh);ctx.fillStyle=l.color;put((a,b,c)=>ctx.fillText(a,b,c),t,y);setSh(false);}});
  ctx.restore();
}
/* effetti dei loghi: ricolora in tinta unica e contorno, calcolati una volta e messi in cache */
const FXC={};
function silhouette(im,color){const c=mk(im.w,im.h),x=c.getContext('2d');x.drawImage(im.img,0,0,im.w,im.h);x.globalCompositeOperation='source-in';x.fillStyle=color;x.fillRect(0,0,im.w,im.h);return c;}
function imgFx(l,im){
  const f=l.fx;if(!f||!((f.tint&&f.tint.on)||(f.outline&&f.outline.on&&f.outline.width>0)))return null;
  const key=JSON.stringify([l.imgId,f.tint,f.outline,l.scale]),c=FXC[l.id];if(c&&c.key===key)return c;
  const r=f.outline&&f.outline.on?Math.min(400,f.outline.width/Math.max(l.scale,.01)):0,pad=Math.ceil(r)+1;
  const W=im.w+2*pad,H=im.h+2*pad,out=mk(W,H),x=out.getContext('2d'),body=f.tint&&f.tint.on?silhouette(im,f.tint.color):im.img;
  // corpo e contorno anche separati: nella mappa dei materiali il contorno può avere un materiale suo
  let cb=out,ce=null;
  if(r>0){const sil=silhouette(im,f.outline.color);ce=mk(W,H);const ex=ce.getContext('2d');for(const k of [1,.7,.4])for(let a=0;a<32;a++){const t=a/32*Math.PI*2;ex.drawImage(sil,pad+Math.cos(t)*r*k,pad+Math.sin(t)*r*k);}
    ex.globalCompositeOperation='destination-out';ex.drawImage(im.img,pad,pad,im.w,im.h);ex.globalCompositeOperation='source-over';
    cb=mk(W,H);cb.getContext('2d').drawImage(body,pad,pad,im.w,im.h);x.drawImage(ce,0,0);}
  x.drawImage(body,pad,pad,im.w,im.h);
  return FXC[l.id]={key,cv:out,cb,ce,pad};
}
function drawImg(ctx,l,alpha){
  const im=images[l.imgId];if(!im)return;const w=im.w*l.scale*(l.sx||1),h=im.h*l.scale*(l.sy||1),fx=imgFx(l,im),pd=fx?fx.pad*l.scale*(l.sx||1):0,pe=fx?fx.pad*l.scale*(l.sy||1):0,sh=l.fx&&l.fx.shadow&&l.fx.shadow.on;
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(l.x,l.y);ctx.rotate((l.rot||0)*Math.PI/180);
  if(sh){const m=ctx.getTransform(),k=Math.hypot(m.a,m.b),S_=l.fx.shadow;ctx.shadowColor=hexA(S_.color,S_.alpha??.6);ctx.shadowBlur=(S_.blur||0)*k;ctx.shadowOffsetX=(S_.dx||0)*k;ctx.shadowOffsetY=(S_.dy||0)*k;}
  if(l.flipX||l.flipY)ctx.scale(l.flipX?-1:1,l.flipY?-1:1);
  const src=fx?(PART==='edge'?fx.ce:PART==='body'?fx.cb:fx.cv):(PART==='edge'?null:im.img);
  if(src)ctx.drawImage(src,-w/2-pd,-h/2-pe,w+2*pd,h+2*pe);ctx.restore();
}
function textBox(l){const c=tmp('m',4,4).getContext('2d');c.font=`${l.italic?'italic ':''}${l.bold?'700 ':'400 '}${l.size}px "${l.font}", sans-serif`;if('letterSpacing' in c)c.letterSpacing=(l.spacing||0)+'px';let w=0;const ls=String(l.text).split('\n');for(const t of ls)w=Math.max(w,c.measureText(t).width);const ow=l.outline&&l.outline.on?l.outline.width*2:0;let bw=Math.max(w,l.size*.6)+ow,bh=ls.length*l.size*1.15+ow;
  if(l.arc){const a=Math.abs(l.arc)*Math.PI/180,R0=w/a;if(a<Math.PI){bw=2*R0*Math.sin(a/2)+l.size+ow;}else bw=2*R0+l.size+ow;bh+=R0*(1-Math.cos(Math.min(a,Math.PI)/2))*2;}
  return{w:bw*(l.sx||1),h:bh*(l.sy||1)};}
function imgBox(l){const im=images[l.imgId];return im?{w:im.w*l.scale*(l.sx||1),h:im.h*l.scale*(l.sy||1)}:{w:100,h:100};}

/* maschere: dilatazione con sfocatura + soglia (veloce anche su pezzi grandi) */
function dilate(src,r){const c=mk(src.width,src.height),x=c.getContext('2d');x.filter=`blur(${Math.max(.5,r/2)}px)`;x.drawImage(src,0,0);x.filter='none';
  const id=x.getImageData(0,0,c.width,c.height),d=id.data;for(let i=3;i<d.length;i+=4)d[i]=d[i]>5?255:0;x.putImageData(id,0,0);return c;}
function invertMask(src){const c=mk(src.width,src.height),x=c.getContext('2d');x.fillStyle='#000';x.fillRect(0,0,c.width,c.height);x.globalCompositeOperation='destination-out';x.drawImage(src,0,0);return c;}
function edgeMask(m,w,pos){
  const out=(r)=>{const d=dilate(m,r),x=d.getContext('2d');x.globalCompositeOperation='destination-out';x.drawImage(m,0,0);return d;};
  const ins=(r)=>{const d=dilate(invertMask(m),r),c=mk(m.width,m.height),x=c.getContext('2d');x.drawImage(m,0,0);x.globalCompositeOperation='destination-in';x.drawImage(d,0,0);return c;};
  if(pos==='outside')return out(w);if(pos==='center'){const a=out(w/2);a.getContext('2d').drawImage(ins(w/2),0,0);return a;}return ins(w);
}
/* riempimenti di pezzi/pannelli: maschera calcolata dalle etichette e messa in cache */
const FC={};
function fillIds(l){const s=new Set();for(const p of l.seeds){const v=labelAt(l.mode,p.x,p.y);if(v)s.add(v);if(l.mirror){const m=labelAt(l.mode,p.x,mirrorY(p.y));if(m)s.add(m);}}return s;}
/* il worker calcola le maschere (corpo allargato e contorno) con la distanza euclidea; qui si applicano colore e trama.
   Mentre il worker lavora si vede il riempimento precedente, così l'interfaccia non si blocca. */
function alphaCanvas(a,w,h){const c=mk(w,h),x=c.getContext('2d'),id=x.createImageData(w,h),d=id.data;for(let i=0,q=3;i<a.length;i++,q+=4)d[q]=a[i];x.putImageData(id,0,0);return c;}
function paintFill(ent,l,E){
  const {w,h,x:x0,y:y0}=ent,M=ent.masks;let out=null,cb=null,ce=null;
  if(M.body){out=mk(w,h);const oc=out.getContext('2d');oc.drawImage(M.body,0,0);oc.globalCompositeOperation='source-in';
    oc.fillStyle=paintStyle(oc,l.paint,l.color,-x0,-y0,{x0,y0,x1:x0+w-1,y1:y0+h-1});oc.fillRect(0,0,w,h);oc.globalCompositeOperation='source-over';}
  if(M.edge&&E){ce=mk(w,h);const ex=ce.getContext('2d');ex.drawImage(M.edge,0,0);ex.globalCompositeOperation='source-in';ex.fillStyle=E.color;ex.fillRect(0,0,w,h);
    if(out){cb=mk(w,h);cb.getContext('2d').drawImage(out,0,0);out.getContext('2d').drawImage(ce,0,0);}else{out=mk(w,h);out.getContext('2d').drawImage(ce,0,0);}}
  ent.cv=out;ent.cb=cb;ent.ce=ce;
}
function fillCache(l){
  if(!live.LAB)return null;
  const E=l.edge&&l.edge.on&&l.edge.width>0?l.edge:null;
  const mkey=JSON.stringify([l.mode,l.seeds,l.grow,live.LAB.ver,l.mirror?S.axis:0,E?[E.width,E.pos,E.only]:0]),key=mkey+JSON.stringify([l.color,l.paint,E&&E.color]);
  const c=FC[l.id];if(c&&c.key===key)return c;
  // stessa forma, colore diverso: ricoloro le maschere che ho già
  if(c&&c.mkey===mkey&&c.masks){const ent=Object.assign({},c,{key});paintFill(ent,l,E);FC[l.id]=ent;return ent;}
  const ids=fillIds(l);if(!ids.size){FC[l.id]={key,mkey,ids,cv:null,w:0,h:0};return FC[l.id];}
  const bbs=l.mode==='island'?live.LAB.ib:live.LAB.pb,g=Math.max(l.grow??3,E?Math.ceil(E.width)+2:0);
  let x0=N,y0=N,x1=0,y1=0;for(const id of ids){const b=bbs[id];x0=Math.min(x0,b[0]);y0=Math.min(y0,b[1]);x1=Math.max(x1,b[2]);y1=Math.max(y1,b[3]);}
  x0=Math.max(0,x0-g);y0=Math.max(0,y0-g);x1=Math.min(N-1,x1+g);y1=Math.min(N-1,y1+g);
  const w=x1-x0+1,h=y1-y0+1,ent={key,mkey,ids,x:x0,y:y0,w,h,cv:null,cb:null,ce:null,pending:true,stale:c&&(c.cv?c:c.stale)||null};
  FC[l.id]=ent;const t0=pnow();
  ent.p=wcall('fill',{ver:live.LAB.ver,mode:l.mode,ids:[...ids],x0,y0,w,h,grow:l.grow??3,only:!!(E&&E.only),edge:E?{width:E.width,pos:E.pos||'inside'}:null}).then(r=>{
    ent.pending=false;if(!r)return;
    const t1=pnow();ent.masks={body:r.body?alphaCanvas(r.body,w,h):null,edge:r.edge?alphaCanvas(r.edge,w,h):null};
    const cur=FC[l.id];if(cur!==ent&&!(cur&&cur.mkey===mkey))return;
    if(cur!==ent){cur.masks=ent.masks;cur.pending=false;cur.stale=null;paintFill(cur,l,E);}else{ent.stale=null;paintFill(ent,l,E);}
    perfLog('Riempimento',r.ms+(pnow()-t1),`${ids.size} ${l.mode==='island'?'pezzi':'pannelli'}, ${w}×${h} · worker ${Math.round(r.ms)} ms, attesa ${Math.round(pnow()-t0)} ms`);
    requestDraw();
  }).catch(e=>{ent.pending=false;toast('Riempimento non riuscito: '+e.message,5000);});
  return ent;
}
// prima di esportare o fare una miniatura aspetto che tutti i riempimenti siano pronti
async function fillsReady(){for(let k=0;k<6;k++){const ps=[];for(const l of S.layers)if(l.type==='fill'&&vis(l)){const c=fillCache(l);if(c&&c.pending)ps.push(c.p);}if(!ps.length)return;await Promise.all(ps);}}
function drawBody(ctx,l,alpha){
  if(l.type==='shape'){drawShapeOnce(ctx,l,l.color,false,alpha);if(l.mirror)drawShapeOnce(ctx,l,l.mirrorSwap?l.color2:l.color,true,alpha);}
  else if(l.type==='text'){drawText(ctx,l,alpha);if(l.mirror)drawText(ctx,Object.assign({},l,{y:mirrorY(l.y),rot:(l.rot||0)+(l.mirrorRot?180:0)}),alpha);}
  else if(l.type==='image'){drawImg(ctx,l,alpha);if(l.mirror)drawImg(ctx,Object.assign({},l,{y:mirrorY(l.y),rot:(l.rot||0)+(l.mirrorRot?180:0)}),alpha);}
  else if(l.type==='fill'){const c0=fillCache(l),c=c0&&(c0.pending&&c0.stale?c0.stale:c0),cv=c&&(PART==='edge'?c.ce:PART==='body'?c.cb:c.cv);if(cv){ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(cv,c.x,c.y);ctx.restore();}}
  else if(l.type==='paint'){if(PART==='edge')return;ctx.save();ctx.globalAlpha=alpha;
    if(alpha<1){/* opacità uniforme sui tratti sovrapposti */const cv=ctx.canvas,t=tmp('pa',cv.width,cv.height),tc=t.getContext('2d');tc.setTransform(ctx.getTransform());for(const s of l.strokes)strokePath(tc,s,s.color);ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(t,0,0);}
    else for(const s of l.strokes)strokePath(ctx,s,s.color);ctx.restore();}
}
function vis(l){if(!l.visible)return false;if(l.gp)for(const g of l.gp){const G=S.groups[g];if(G&&!G.on)return false;}return true;}
const BLENDS=[['source-over','Normale'],['multiply','Moltiplica (ombre)'],['screen','Scolora (luci)'],['overlay','Sovrapponi'],['soft-light','Luce soffusa'],['darken','Scurisci'],['lighten','Schiarisci'],['color','Solo colore'],['difference','Differenza']];
/* filtri del livello (sfocatura, regolazioni immagine), in pixel dello schermo */
function layerFilter(ctx,l){
  const f=[],m=ctx.getTransform(),k=Math.hypot(m.a,m.b),A=l.adj;
  if(A){if((A.bri??100)!==100)f.push(`brightness(${A.bri}%)`);if((A.con??100)!==100)f.push(`contrast(${A.con}%)`);if((A.sat??100)!==100)f.push(`saturate(${A.sat}%)`);if(A.hue)f.push(`hue-rotate(${A.hue}deg)`);}
  if(l.blur>0)f.push(`blur(${(l.blur*k).toFixed(2)}px)`);return f.join(' ');
}
// nell'export dei materiali la soglia dei bordi serve solo dove c'è il livello (e la sua copia speculare): non su tutta la tela
function hardRect(l,ctx,cv){
  const full={x:0,y:0,w:cv.width,h:cv.height},m=ctx.getTransform();
  if(!m.isIdentity||cv.width!==N)return full;const b=bounds(l);if(!b)return full;
  const pad=300+(l.blur||0)*3;let y0=b.y0,y1=b.y1;if(l.mirror){const a=mirrorY(b.y0),c=mirrorY(b.y1);y0=Math.min(y0,a,c);y1=Math.max(y1,a,c);}
  const x=Math.max(0,Math.floor(b.x0-pad)),y=Math.max(0,Math.floor(y0-pad)),X=Math.min(N,Math.ceil(b.x1+pad)),Y=Math.min(N,Math.ceil(y1+pad));
  return X>x&&Y>y?{x,y,w:X-x,h:Y-y}:full;
}
function drawLayer(ctx,l,tint,hard,noBlend){
  if(!vis(l))return;
  const alpha=tint?1:(l.opacity??1),hasErase=l.erase&&l.erase.length,fs=tint?'':layerFilter(ctx,l),bl=!tint&&!noBlend&&l.blend&&l.blend!=='source-over'?l.blend:null;
  if(!hasErase&&!tint){if(fs||bl){ctx.save();if(fs)ctx.filter=fs;if(bl)ctx.globalCompositeOperation=bl;drawBody(ctx,l,alpha);ctx.restore();}else drawBody(ctx,l,alpha);return;}
  const cv=ctx.canvas,t=tmp(tint?'tint':'iso',cv.width,cv.height),tc=t.getContext('2d');tc.setTransform(ctx.getTransform());
  drawBody(tc,l,alpha);
  if(hasErase){tc.globalCompositeOperation='destination-out';for(const s of l.erase)strokePath(tc,s,'#000');tc.globalCompositeOperation='source-over';}
  if(tint){tc.setTransform(1,0,0,1,0,0);tc.globalCompositeOperation='source-in';tc.fillStyle=tint;tc.fillRect(0,0,cv.width,cv.height);tc.globalCompositeOperation='source-over';
    // i riempimenti hanno già maschere nette (0 o 255): niente soglia
    if(hard&&l.type!=='fill'){const r=hardRect(l,ctx,cv),id=tc.getImageData(r.x,r.y,r.w,r.h),d=id.data;for(let i=3;i<d.length;i+=4)d[i]=d[i]>=128?255:0;tc.putImageData(id,r.x,r.y);}}
  ctx.save();ctx.setTransform(1,0,0,1,0,0);if(fs)ctx.filter=fs;if(bl)ctx.globalCompositeOperation=bl;ctx.drawImage(t,0,0);ctx.restore();
}
/* disegna i livelli in ordine; quelli con “Ritaglia sul livello sotto” compaiono solo dentro la forma del primo livello normale sotto di loro.
   keep(l): il livello entra in questo disegno; tintOf(l): colore piatto (mappa materiali), null = normale, false = non disegnarlo */
function drawStack(ctx,keep,tintOf,hard,edgeOf){
  const L=S.layers,cv=ctx.canvas,T=ctx.getTransform();
  for(let i=0;i<L.length;i++){const l=L[i];
    if(l.clip&&i>0)continue;
    const tb=tintOf(l),em=edgeOf?edgeOf(l):undefined;
    if(keep(l)){if(em===undefined){if(tb!==false)drawLayer(ctx,l,tb||null,hard);}
      else{try{if(tb!==false){PART='body';drawLayer(ctx,l,tb||null,hard);}if(em){PART='edge';drawLayer(ctx,l,em,hard);}}finally{PART=null;}}}
    const cl=[];for(let j=i+1;j<L.length&&L[j].clip;j++){const c=L[j];if(keep(c)&&vis(c)&&tintOf(c)!==false)cl.push(c);}
    if(!cl.length)continue;
    const m=tmp('cbase',cv.width,cv.height),mc=m.getContext('2d');mc.setTransform(T);drawLayer(mc,l,null,false,true);
    for(const c of cl){const t=tmp('cclip',cv.width,cv.height),tc=t.getContext('2d');tc.setTransform(T);const tn=tintOf(c)||null;drawLayer(tc,c,tn,hard,true);
      tc.setTransform(1,0,0,1,0,0);tc.globalCompositeOperation='destination-in';tc.drawImage(m,0,0);tc.globalCompositeOperation='source-over';
      ctx.save();ctx.setTransform(1,0,0,1,0,0);if(!tn&&c.blend&&c.blend!=='source-over')ctx.globalCompositeOperation=c.blend;ctx.drawImage(t,0,0);ctx.restore();}
  }
}
/* immagine di riferimento (es. il TGA di una livrea già fatta): si vede solo nell'editor, mai nei file.
   REF.src = immagine originale; REF.cv = la stessa già posizionata sulla tela 4096 (serve a ricalco, contagocce ed estrazione) */
const REF={src:null,cv:null,data:null,on:true,op:.6,above:true,dx:0,dy:0,sc:1,blob:null,name:''};
function refBake(){if(!REF.src){REF.cv=REF.data=null;return;}const c=REF.cv&&REF.cv.width===N?REF.cv:mk(N,N),x=c.getContext('2d',{willReadFrequently:true});x.clearRect(0,0,N,N);
  x.drawImage(REF.src,REF.dx,REF.dy,N*REF.sc,N*REF.sc);REF.cv=c;REF.data=x.getImageData(0,0,N,N).data;}
const refShown=()=>REF.cv&&REF.on&&!S.preview;
function drawRef(ctx){ctx.save();ctx.globalAlpha=REF.op;ctx.drawImage(REF.cv,0,0);ctx.restore();}
// forView: le guide del template (maschera, posizione dei display) si vedono solo nell'editor, mai nei file esportati
function drawScene(ctx,forView){ctx.save();ctx.fillStyle=paintStyle(ctx,S.basePaint,S.base,0,0,{x0:0,y0:0,x1:N,y1:N});ctx.fillRect(0,0,N,N);
  if(forView&&refShown()&&!REF.above)drawRef(ctx);drawStack(ctx,l=>forView||!l.guide,()=>null);ctx.restore();}
/* mappa dei materiali del template senza le zone nere (vernice): serve quando la base ha un materiale suo */
function regionNoPaint(){
  if(live.regionNP||!live.regionCv)return live.regionNP;
  const c=mk(N,N),x=c.getContext('2d');x.drawImage(live.regionCv,0,0,N,N);const id=x.getImageData(0,0,N,N),d=id.data;
  for(let i=0;i<d.length;i+=4)if(d[i]+d[i+1]+d[i+2]<96)d[i+3]=0;
  x.putImageData(id,0,0);return live.regionNP=c;
}
/* nel file esportato ogni pixel deve essere esattamente uno dei colori dei materiali: porto i bordi sfumati al più vicino */
// colori region ammessi nel file (come pixel a 32 bit little-endian): i 5 standard più i materiali personalizzati
function regionPalette(){return [0xFF000000,0xFF0000FF,0xFF00FF00,0xFFFF0000,0xFFFFFFFF].concat((S.customMats||[]).map(c=>{const v=parseInt(c.hex.slice(1),16);return (0xFF000000|((v&255)<<16)|(v&0xFF00)|(v>>16))>>>0;}));}
function snapRegions(ctx){
  const W=ctx.canvas.width,H=ctx.canvas.height,id=ctx.getImageData(0,0,W,H),u=new Uint32Array(id.data.buffer),P=[0xFF000000,0xFF0000FF,0xFF00FF00,0xFFFF0000,0xFFFFFFFF];
  if(S.customMats&&S.customMats.length){
    // ogni pixel va al colore region più vicino (standard o personalizzato): i bordi sfumati non creano colori nuovi
    const pal=P.concat(S.customMats.map(c=>{const v=parseInt(c.hex.slice(1),16);return (0xFF000000|((v&255)<<16)|(v&0xFF00)|(v>>16))>>>0;}));
    const pr=pal.map(v=>[v&255,(v>>8)&255,(v>>16)&255]),cache=new Map(pal.map(v=>[v,v]));
    for(let i=0;i<u.length;i++){const v=u[i];let o=cache.get(v);
      if(o===undefined){const r=v&255,g=(v>>8)&255,b=(v>>16)&255;let bd=1e9;for(let j=0;j<pal.length;j++){const q=pr[j],d=(r-q[0])**2+(g-q[1])**2+(b-q[2])**2;if(d<bd){bd=d;o=pal[j];}}cache.set(v,o);}
      if(o!==v)u[i]=o;}
    ctx.putImageData(id,0,0);return;}
  for(let i=0;i<u.length;i++){const v=u[i];if(v===0xFF000000||v===0xFF0000FF||v===0xFF00FF00||v===0xFFFF0000||v===0xFFFFFFFF)continue;
    const r=v&255,g=(v>>8)&255,b=(v>>16)&255;u[i]=P[r>127?(g>127?4:(b>127?4:1)):(g>127?2:(b>127?3:0))];}
  ctx.putImageData(id,0,0);
}
function drawRegions(ctx,hard,noSnap){
  const bm=S.baseMat&&S.baseMat!=='keep'?matCol(S.baseMat,hard):null;
  ctx.save();ctx.fillStyle=bm||'#000';ctx.fillRect(0,0,N,N);
  const rc=bm&&S.baseMat!=='paint'?regionNoPaint():live.regionCv;if(rc)ctx.drawImage(rc,0,0,N,N);
  drawStack(ctx,l=>!l.guide,l=>(l.mat&&matCol(l.mat,hard))||false,false,l=>sepOutline(l)?(matCol(l.outMat,hard)||null):undefined);ctx.restore();
  if(hard&&!noSnap)snapRegions(ctx);
}

const view=$('#view'),vctx=view.getContext('2d');let dpr=1,needs=false;
function resizeView(){const r=view.getBoundingClientRect();dpr=window.devicePixelRatio||1;view.width=Math.max(10,Math.round(r.width*dpr));view.height=Math.max(10,Math.round(r.height*dpr));requestDraw();}
/* prestazioni: la livrea composta resta in una cache alla risoluzione dello schermo.
   requestDraw(true) = cambia solo ciò che sta sopra (mouse, selezione, anteprime): basta ricopiare la cache.
   Mentre trascini, i livelli sotto e sopra quelli che si muovono stanno in due cache e si ridisegna solo ciò che si muove. */
let docVer=0,sceneCv=null,sceneKey='',DC=null;
function requestDraw(overlayOnly){if(!overlayOnly)docVer++;if(needs)return;needs=true;requestAnimationFrame(()=>{needs=false;render();});}
/* se il verde del wireframe non indica i pannelli (es. tutto verde), lo mostro in grigio: sulla vernice resta leggibile */
let wireV=null;
function wireView(){
  if(!live.LAB||live.LAB.seams)return live.wireCv;if(wireV&&wireV.src===live.wireCv)return wireV.cv;
  const c=mk(N,N),x=c.getContext('2d');x.drawImage(live.wireCv,0,0);const id=x.getImageData(0,0,N,N),d=id.data;
  for(let i=0;i<d.length;i+=4){const v=Math.max(d[i],d[i+1],d[i+2]);d[i]=d[i+1]=d[i+2]=v;}
  x.putImageData(id,0,0);wireV={src:live.wireCv,cv:c};return c;
}
const s2w=(px,py)=>({x:(px-S.view.x)/S.view.z,y:(py-S.view.y)/S.view.z});
function worldXf(c){c.setTransform(dpr*S.view.z,0,0,dpr*S.view.z,dpr*S.view.x,dpr*S.view.y);c.beginPath();c.rect(0,0,N,N);c.clip();}
function blit(c,src){c.save();c.setTransform(1,0,0,1,0,0);c.drawImage(src,0,0);c.restore();}
/* quali livelli si stanno modificando con il mouse in questo momento */
function dragIds(){if(!live.drag)return null;if(live.drag.ids)return live.drag.ids;if(live.drag.id)return[live.drag.id];if((live.drag.kind==='pt'||live.drag.kind==='stroke')&&S.sel)return[S.sel];return null;}
/* cache sotto/sopra per il trascinamento; null se non si può (ritagli o fusioni che attraversano il gruppo che si muove) */
function dragCache(vk){
  const ids=dragIds();if(!ids||S.mode==='regions')return null;
  const L=S.layers,idx=ids.map(id=>L.findIndex(l=>l.id===id)).filter(i=>i>=0).sort((a,b)=>a-b);if(!idx.length)return null;
  const a=idx[0],b=idx[idx.length-1];if(b-a+1!==idx.length)return null;
  if(L.slice(a,b+1).some(l=>l.clip)||(L[b+1]&&L[b+1].clip)||L.slice(b+1).some(l=>vis(l)&&l.blend&&l.blend!=='source-over'))return null;
  const key=vk+'|'+a+'|'+b;if(DC&&DC.key===key)return DC;
  const fv=!S.preview,mkc=()=>{const c=mk(view.width,view.height),x=c.getContext('2d');x.save();worldXf(x);return[c,x];};
  const [bc,bx]=mkc();bx.fillStyle=paintStyle(bx,S.basePaint,S.base,0,0,{x0:0,y0:0,x1:N,y1:N});bx.fillRect(0,0,N,N);if(fv&&refShown()&&!REF.above)drawRef(bx);
  const below=new Set(L.slice(0,a).map(l=>l.id)),above=new Set(L.slice(b+1).map(l=>l.id));
  drawStack(bx,l=>below.has(l.id)&&(fv||!l.guide),()=>null);bx.restore();
  const [ac,ax]=mkc();drawStack(ax,l=>above.has(l.id)&&(fv||!l.guide),()=>null);if(refShown()&&REF.above)drawRef(ax);ax.restore();
  return DC={key,below:bc,above:ac,set:new Set(L.slice(a,b+1).map(l=>l.id))};
}
function render(){
  const c=vctx,z=S.view.z,W=view.width,H=view.height;
  const vk=[S.view.z,S.view.x,S.view.y,dpr,W,H,S.mode,S.preview,S.wire.on,S.wire.op,REF.on,REF.op,REF.above,REF.cv?1:0].join('|');
  if(!live.drag)DC=null;
  if(!sceneCv||sceneCv.width!==W||sceneCv.height!==H){sceneCv=mk(W,H);sceneKey='';}
  const key=docVer+'|'+vk;
  if(key!==sceneKey){
    const x=sceneCv.getContext('2d');x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,W,H);x.save();worldXf(x);
    const dc=dragCache(vk);
    if(S.mode==='regions')drawRegions(x);
    else if(dc){blit(x,dc.below);drawStack(x,l=>dc.set.has(l.id)&&(!S.preview||!l.guide),()=>null);blit(x,dc.above);}
    else{drawScene(x,!S.preview);if(refShown()&&REF.above)drawRef(x);}
    if(live.wireCv&&S.wire.on&&!S.preview){x.save();x.globalAlpha=S.wire.op;x.globalCompositeOperation=live.wireDark?'difference':'multiply';x.drawImage(wireView(),0,0,N,N);x.restore();}
    x.restore();sceneKey=key;
  }
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,W,H);c.drawImage(sceneCv,0,0);
  c.setTransform(dpr*z,0,0,dpr*z,dpr*S.view.x,dpr*S.view.y);
  c.save();c.strokeStyle='rgba(120,120,120,.9)';c.lineWidth=1.5/z;c.strokeRect(0,0,N,N);
  if(!S.preview&&S.layers.some(l=>l.mirror&&vis(l))){c.setLineDash([14/z,10/z]);c.strokeStyle='rgba(255,140,0,.6)';c.beginPath();c.moveTo(0,S.axis);c.lineTo(N,S.axis);c.stroke();}
  c.restore();
  if(!S.preview)overlay(c);$('#zVal').textContent=Math.round(z*100)+'%';
}
const HR=()=>6/S.view.z;
function xformInfo(l){
  if(l.type==='text'||l.type==='image'){const b=l.type==='text'?textBox(l):imgBox(l);return{cx:l.x,cy:l.y,w:b.w,h:b.h,rot:l.rot||0};}
  if(l.type==='shape'&&l.pts.length){const b=bbox(l.pts),pad=14/S.view.z;return{cx:(b.x0+b.x1)/2,cy:(b.y0+b.y1)/2,w:b.x1-b.x0+2*pad,h:b.y1-b.y0+2*pad,rot:0};}
  return null;
}
function xformHandles(l){
  const t=xformInfo(l);if(!t)return null;const a=t.rot*Math.PI/180,c=Math.cos(a),sn=Math.sin(a),P=(lx,ly)=>({x:t.cx+lx*c-ly*sn,y:t.cy+lx*sn+ly*c});
  return{t,corners:[P(-t.w/2,-t.h/2),P(t.w/2,-t.h/2),P(t.w/2,t.h/2),P(-t.w/2,t.h/2)],sides:[P(t.w/2,0),P(-t.w/2,0),P(0,t.h/2),P(0,-t.h/2)],top:P(0,-t.h/2),rot:P(0,-t.h/2-34/S.view.z)};
}
function hitXform(l,w){
  if(!l||l.locked||!vis(l)||S.tool!=='select')return null;const H=xformHandles(l);if(!H)return null;const r=HR()*1.8;
  if(Math.hypot(H.rot.x-w.x,H.rot.y-w.y)<=r)return{kind:'rot',H};
  for(const p of H.corners)if(Math.hypot(p.x-w.x,p.y-w.y)<=r)return{kind:'scale',H};
  for(let i=0;i<4;i++){const p=H.sides[i];if(i===3)continue;if(Math.hypot(p.x-w.x,p.y-w.y)<=r)return{kind:i<2?'sx':'sy',H};}
  return null;
}
function overlay(c){
  const z=S.view.z,l=selLayer(),selC=getComputedStyle(document.documentElement).getPropertyValue('--sel').trim()||'#0f7b6c';
  c.save();c.lineWidth=1.5/z;c.strokeStyle=selC;c.fillStyle='#fff';
  if(l&&vis(l)&&S.tool==='select'){
    if(l.type==='shape'){c.stroke(shapePath(l));if(!l.parts)for(const p of l.pts){c.beginPath();if(p.c)c.rect(p.x-HR(),p.y-HR(),HR()*2,HR()*2);else c.arc(p.x,p.y,HR(),0,7);c.fill();c.stroke();}}
    else if(l.type==='text'||l.type==='image'){const b=l.type==='text'?textBox(l):imgBox(l);c.translate(l.x,l.y);c.rotate((l.rot||0)*Math.PI/180);c.setLineDash(l.locked?[6/z,5/z]:[]);c.strokeRect(-b.w/2,-b.h/2,b.w,b.h);}
    else if(l.type==='fill'){const f=FC[l.id];if(f&&f.w){c.setLineDash([8/z,6/z]);c.strokeRect(f.x,f.y,f.w,f.h);}}
  }
  c.restore();
  if(l&&vis(l)&&S.tool==='select'&&!l.locked){const H=xformHandles(l);if(H){
    c.save();c.lineWidth=1.5/z;c.strokeStyle=selC;c.fillStyle='#fff';
    if(l.type==='shape'){c.setLineDash([6/z,5/z]);c.beginPath();H.corners.forEach((q,i)=>i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y));c.closePath();c.stroke();c.setLineDash([]);}
    c.beginPath();c.moveTo(H.top.x,H.top.y);c.lineTo(H.rot.x,H.rot.y);c.stroke();
    for(const q of H.corners){c.beginPath();c.rect(q.x-HR(),q.y-HR(),HR()*2,HR()*2);c.fill();c.stroke();}
    for(let i=0;i<3;i++){const q=H.sides[i];c.beginPath();c.arc(q.x,q.y,HR()*.85,0,7);c.fill();c.stroke();}
    c.beginPath();c.arc(H.rot.x,H.rot.y,HR()*1.15,0,7);c.fill();c.stroke();c.restore();}}
  if(S.tool==='select'&&S.msel&&S.msel.length){c.save();c.lineWidth=1.5/z;c.strokeStyle=selC;c.setLineDash([7/z,5/z]);for(const m of selLayers()){const b=bounds(m);if(b)c.strokeRect(b.x0,b.y0,b.x1-b.x0,b.y1-b.y0);}c.restore();}
  if(live.drag&&live.drag.guides&&live.drag.guides.length){c.save();c.lineWidth=1.5/z;c.strokeStyle='#ff2d95';c.setLineDash([10/z,6/z]);for(const g of live.drag.guides){c.beginPath();if(g.x!=null){c.moveTo(g.x,0);c.lineTo(g.x,N);}else{c.moveTo(0,g.y);c.lineTo(N,g.y);}c.stroke();}c.restore();}
  if(live.hover&&(S.tool==='brush'||S.tool==='eraser')){const r=(S.tool==='brush'?S.brush:S.eraser)/2;c.save();c.lineWidth=1.5/z;c.strokeStyle='#ff8a00';c.beginPath();c.arc(live.hover.x,live.hover.y,r,0,7);c.stroke();c.restore();}
  if(live.hover&&(S.tool==='island'||S.tool==='panel')&&live.LAB&&!live.drag){
    const v=labelAt(S.tool==='island'?'island':'panel',live.hover.x,live.hover.y);
    if(v){const b=(S.tool==='island'?live.LAB.ib:live.LAB.pb)[v];c.save();c.lineWidth=2/z;c.setLineDash([8/z,6/z]);c.strokeStyle='#ff8a00';c.strokeRect(b[0],b[1],b[2]-b[0]+1,b[3]-b[1]+1);c.restore();}
  }
  if(live.drawing){
    c.save();c.lineWidth=2/z;c.strokeStyle='#ff8a00';
    if(live.drawing.lasso){c.beginPath();live.drawing.pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();}
    else{const tmpL={pts:live.drawing.pts.concat(live.hover?[live.hover]:[]),closed:false,smooth:true,tension:.5};c.stroke(shapePath(tmpL));for(const p of live.drawing.pts){c.beginPath();c.fillStyle='#fff';c.arc(p.x,p.y,HR(),0,7);c.fill();c.stroke();}}
    c.restore();
  }
  if(live.drag&&live.drag.kind==='create'){c.save();c.lineWidth=2/z;c.strokeStyle='#ff8a00';const a=live.drag.a,b=live.drag.b;
    if(S.tool==='rect'||S.tool==='wand')c.strokeRect(Math.min(a.x,b.x),Math.min(a.y,b.y),Math.abs(b.x-a.x),Math.abs(b.y-a.y));
    else{c.beginPath();c.ellipse((a.x+b.x)/2,(a.y+b.y)/2,Math.abs(b.x-a.x)/2,Math.abs(b.y-a.y)/2,0,0,7);c.stroke();}c.restore();}
}

return {
  tmp,textBox,imgBox,FC,fillCache,fillsReady,vis,BLENDS,REF,refBake,refShown,drawScene,
  regionPalette,drawRegions,view,resizeView,requestDraw,s2w,render,HR,xformHandles,hitXform
};
};

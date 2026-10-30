/* ================= livelli ================= */
function actPaint(){const g=isGrad({pat:S.act.pat});return{pat:S.act.pat,bg:S.act.bg,scale:S.act.scale,angle:g?S.act.gangle:S.act.angle,c2:S.act.c2,c3:S.act.c3};}
function addLayer(l,select=true,doCommit=true){if(!l.fromTemplate&&l.color)pushRecent(l.color);l.id=l.id||newId();l.visible=l.visible??true;l.opacity=l.opacity??1;l.mat=l.mat||'keep';const ti=S.layers.findIndex(x=>x.onTop);if(ti>=0)S.layers.splice(ti,0,l);else S.layers.push(l);if(select)S.sel=l.id;if(doCommit){commit();refreshAll();}return l;}
function newShape(pts,smooth=true){return{type:'shape',name:'Forma '+S.uid,pts,closed:true,smooth,tension:.5,color:S.act.color,color2:'#006B3C',paint:actPaint(),mirror:false,mirrorSwap:true,fade:{on:false,angle:0,len:1},pin:{on:false,color:'#C9A24B',width:5,offset:9}};}
function ellipsePts(a,b){const cx=(a.x+b.x)/2,cy=(a.y+b.y)/2,rx=Math.abs(b.x-a.x)/2,ry=Math.abs(b.y-a.y)/2,o=[];for(let i=0;i<12;i++){const t=i/12*Math.PI*2;o.push({x:cx+Math.cos(t)*rx,y:cy+Math.sin(t)*ry});}return o;}
function rectPts(a,b){const x0=Math.min(a.x,b.x),x1=Math.max(a.x,b.x),y0=Math.min(a.y,b.y),y1=Math.max(a.y,b.y);return[{x:x0,y:y0,c:true},{x:x1,y:y0,c:true},{x:x1,y:y1,c:true},{x:x0,y:y1,c:true}];}
function finishDrawing(){
  if(!drawing)return;const pts=drawing.pts;drawing=null;
  if(pts.length>=3){const l=newShape(pts.map(p=>({...p})));l.name='Lama '+S.uid;addLayer(l);setTool('select');}else requestDraw();
}
function finishLasso(){
  const raw=drawing.pts,wand=drawing.wand;drawing=null;if(raw.length<6){requestDraw();return;}
  if(wand){refCut(polyMask(raw),bbox(raw),'Area dal riferimento',true);requestDraw();return;}
  const step=Math.max(1,Math.ceil(raw.length/48)),pts=[];for(let i=0;i<raw.length;i+=step)pts.push({x:raw[i].x,y:raw[i].y});
  const l=newShape(pts,true);l.name='Lazo '+S.uid;addLayer(l);
}
function doFill(mode,w){
  if(!LAB){toast('Prima apri il template: servono le linee del wireframe per riconoscere i pezzi.');return;}
  const v=labelAt(mode,w.x,w.y);if(!v){toast('Qui non c’è un pezzo. Clicca dentro una parte della carrozzeria.');return;}
  // se è selezionato un livello di riempimento dello stesso tipo, i clic aggiungono/tolgono da quello (qualunque sia il colore attivo)
  const cur=selLayer(),same=cur&&cur.type==='fill'&&cur.mode===mode&&!cur.locked;
  if(same){
    const c=fillCache(cur);
    if(c&&c.ids.has(v)){cur.seeds=cur.seeds.filter(p=>labelAt(mode,p.x,p.y)!==v&&!(cur.mirror&&labelAt(mode,p.x,mirrorY(p.y))===v));}else cur.seeds.push({x:w.x,y:w.y});
    commit();refreshAll();return;
  }
  const eo=S.act.fstyle==='edge';
  addLayer({type:'fill',name:(eo?'Contorno ':mode==='island'?'Pezzo ':'Pannello ')+S.uid,mode,seeds:[{x:w.x,y:w.y}],color:S.act.color,paint:actPaint(),grow:3,
    edge:{on:eo,only:eo,color:S.act.color,width:S.act.ew||10,pos:'inside'}});buildOpts();
}
function sampleAt(w){const c=tmp('pick',1,1),x=c.getContext('2d');x.setTransform(1,0,0,1,-Math.floor(w.x),-Math.floor(w.y));drawScene(x);const d=x.getImageData(0,0,1,1).data;return '#'+[d[0],d[1],d[2]].map(v=>v.toString(16).padStart(2,'0')).join('');}
function refColorAt(w){const i=((Math.floor(w.y)<<12)+Math.floor(w.x))*4,d=REF.data;if(!d||d[i+3]<16)return null;return '#'+[d[i],d[i+1],d[i+2]].map(v=>v.toString(16).padStart(2,'0')).join('');}
function pickColor(w){if(w.x<0||w.y<0||w.x>=N||w.y>=N)return;const rc=refShown()?refColorAt(w):null;if(rc){S.act.color=rc;pushRecent(rc);buildOpts();toast('Colore preso dal riferimento: '+rc.toUpperCase());return;}const c=sampleAt(w);S.act.color=c;pushRecent(c);buildOpts();toast('Colore preso: '+c.toUpperCase());}
/* “Estrai colore”: tutti i pixel del riferimento con quel colore (o solo la zona collegata) diventano un livello
   che si ricolora con “Ricolora in tinta unica”. Bordi morbidi, così non resta la scalettatura. */
/* copia dal riferimento solo una zona: un pezzo/pannello del template, un'area disegnata a mano o un rettangolo.
   Le parti prese così mantengono i loro colori (anche loghi e scritte); “Togli lo sfondo” rende trasparente il colore del bordo. */
function refCut(maskFn,bb,name,movable){
  if(!REF.cv){toast('Carica prima la livrea di riferimento (Documento → Immagine di riferimento).',5000);return;}
  let {x0,y0,x1,y1}=bb;x0=Math.max(0,Math.floor(x0));y0=Math.max(0,Math.floor(y0));x1=Math.min(N-1,Math.ceil(x1));y1=Math.min(N-1,Math.ceil(y1));
  const w=x1-x0+1,h=y1-y0+1;if(w<4||h<4)return;
  const c=mk(w,h),x=c.getContext('2d');x.drawImage(REF.cv,x0,y0,w,h,0,0,w,h);x.globalCompositeOperation='destination-in';x.drawImage(maskFn(w,h,x0,y0),0,0);x.globalCompositeOperation='source-over';
  if(S.act.knock){const id=x.getImageData(0,0,w,h),d=id.data,k=(()=>{for(const [a,b] of [[0,0],[w-1,0],[0,h-1],[w-1,h-1],[w>>1,0],[0,h>>1]]){const q=(b*w+a)*4;if(d[q+3]>128)return[d[q],d[q+1],d[q+2]];}return null;})();
    if(k){const tol=S.act.tol??30,fe=Math.max(6,tol*.35);for(let q=0;q<d.length;q+=4){const dd=Math.max(Math.abs(d[q]-k[0]),Math.abs(d[q+1]-k[1]),Math.abs(d[q+2]-k[2]));if(dd<tol+fe)d[q+3]=Math.round(d[q+3]*(dd<=tol?0:(dd-tol)/fe));}x.putImageData(id,0,0);}}
  const imgId='I'+(S.uid++);images[imgId]={img:c,w,h,url:null,name};
  addLayer({type:'image',name,imgId,x:x0+w/2,y:y0+h/2,scale:1,rot:0,mirror:false,mirrorRot:true,locked:!movable});
  setTab('P');toast(movable?`“${name}” creato: puoi spostarlo, ricolorarlo o usarlo come logo.`:`“${name}” creato al suo posto: ricoloralo con “Ricolora in tinta unica”.`,5000);
}
function polyMask(pts){return (w,h,x0,y0)=>{const m=mk(w,h),x=m.getContext('2d');x.fillStyle='#000';x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p.x-x0,p.y-y0):x.moveTo(p.x-x0,p.y-y0));x.closePath();x.fill();return m;};}
function extractPiece(w){
  if(!LAB){toast('Apri prima il template: servono i pezzi del wireframe.');return;}
  const mode=S.act.wpanel?'panel':'island',v=labelAt(mode,w.x,w.y);if(!v){toast('Qui non c’è un pezzo. Clicca dentro una parte della carrozzeria.');return;}
  const b=(mode==='island'?LAB.ib:LAB.pb)[v],arr=mode==='island'?LAB.isl:LAB.pan,g=2;
  refCut((W,H,x0,y0)=>{const m=mk(W,H),x=m.getContext('2d'),id=x.createImageData(W,H),d=id.data;for(let y=0;y<H;y++){let o=((y+y0)<<12)+x0,q=y*W*4;for(let i=0;i<W;i++,o++,q+=4)if(arr[o]===v)d[q+3]=255;}x.putImageData(id,0,0);
    const o2=mk(W,H),c2=o2.getContext('2d');for(let dy=-g;dy<=g;dy++)for(let dx=-g;dx<=g;dx++)c2.drawImage(m,dx,dy);return o2;},{x0:b[0]-g,y0:b[1]-g,x1:b[2]+g,y1:b[3]+g},(mode==='island'?'Pezzo':'Pannello')+' dal riferimento',false);
}
async function extractColor(w){
  if(!REF.data){toast('Carica prima la livrea di riferimento (Documento → Immagine di riferimento).',5000);return;}
  const ix=Math.floor(w.x),iy=Math.floor(w.y);if(ix<0||iy<0||ix>=N||iy>=N)return;
  const d=REF.data,i0=((iy<<12)+ix)*4;if(d[i0+3]<16){toast('Qui il riferimento è vuoto.');return;}
  busy('Estraggo il colore…');await tick();
  const r0=d[i0],g0=d[i0+1],b0=d[i0+2],tol=S.act.tol??30,fe=Math.max(6,tol*.35),lim=tol+fe,A=new Uint8ClampedArray(NN);
  const pin=S.act.inPiece&&LAB?labelAt('island',ix,iy):0;
  const dist=q=>Math.max(Math.abs(d[q]-r0),Math.abs(d[q+1]-g0),Math.abs(d[q+2]-b0));
  const al=dd=>dd<=tol?255:dd>=lim?0:Math.round(255*(lim-dd)/fe);
  let x0=N,y0=N,x1=-1,y1=-1;const mark=(p)=>{const x=p&4095,y=p>>12;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;};
  if(S.act.contig){const Q=new Int32Array(NN),seen=new Uint8Array(NN);let h=0,t=0;Q[t++]=(iy<<12)+ix;seen[Q[0]]=1;
    while(h<t){const p=Q[h++],q=p*4;if(d[q+3]<16||(pin&&LAB.isl[p]!==pin))continue;const dd=dist(q);if(dd>=lim)continue;A[p]=al(dd)*d[q+3]/255;mark(p);if(dd>tol)continue;const x=p&4095;
      for(const n of [x>0?p-1:-1,x<N-1?p+1:-1,p-N,p+N])if(n>=0&&n<NN&&!seen[n]){seen[n]=1;Q[t++]=n;}}}
  else for(let p=0,q=0;p<NN;p++,q+=4){if(d[q+3]<16||(pin&&LAB.isl[p]!==pin))continue;const dd=dist(q);if(dd<lim){A[p]=al(dd)*d[q+3]/255;if(A[p])mark(p);}}
  if(x1<0){busy(null);toast('Nessun pixel di quel colore.');return;}
  const w_=x1-x0+1,h_=y1-y0+1,c=mk(w_,h_),cx=c.getContext('2d'),id=cx.createImageData(w_,h_),o=id.data;let n=0;
  for(let y=0;y<h_;y++){let p=((y+y0)<<12)+x0,q=y*w_*4;for(let x=0;x<w_;x++,p++,q+=4){const a=A[p];if(a){o[q]=r0;o[q+1]=g0;o[q+2]=b0;o[q+3]=a;n++;}}}
  cx.putImageData(id,0,0);
  const hex='#'+[r0,g0,b0].map(v=>v.toString(16).padStart(2,'0')).join(''),imgId='I'+(S.uid++);
  images[imgId]={img:c,w:w_,h:h_,url:null,name:'Colore '+hex.toUpperCase()};
  addLayer({type:'image',name:'Colore '+hex.toUpperCase(),imgId,x:x0+w_/2,y:y0+h_/2,scale:1,rot:0,mirror:false,mirrorRot:true,locked:true,
    fx:{tint:{on:true,color:hex},outline:{on:false,color:'#FFFFFF',width:6},shadow:{on:false,color:'#000000',alpha:.6,blur:12,dx:8,dy:8}}});
  busy(null);setTab('P');
  toast(`Livello “Colore ${hex.toUpperCase()}” creato (${Math.round(n/1000)}k pixel): cambia il colore in “Ricolora in tinta unica”. È bloccato al suo posto; sbloccalo per spostarlo.`,6000);
}
function paintTarget(){let l=selLayer();if(l&&l.type==='paint')return l;l=addLayer({type:'paint',name:'Pennello '+S.uid,strokes:[]},true,false);refreshPanels();return l;}


/* ================= messaggi dal thread principale ================= */
/* ritaglio un livello sui pixel visibili: molti livelli del template sono grandi come la tela ma quasi vuoti */
function cropPx(l,px){if(!px)return null;const {w,h,rgba}=px;let x0=w,y0=h,x1=-1,y1=-1;
  for(let y=0;y<h;y++){let o=y*w*4+3,a=-1,b=-1;for(let x=0;x<w;x++,o+=4)if(rgba[o]){if(a<0)a=x;b=x;}if(a>=0){if(a<x0)x0=a;if(b>x1)x1=b;if(y<y0)y0=y;y1=y;}}
  if(x1<0)return null;if(x0===0&&y0===0&&x1===w-1&&y1===h-1)return px;
  const nw=x1-x0+1,nh=y1-y0+1,out=new Uint8ClampedArray(nw*nh*4);
  for(let y=0;y<nh;y++){const st=((y+y0)*w+x0)*4;out.set(rgba.subarray(st,st+nw*4),y*nw*4);}
  l.left+=x0;l.top+=y0;l.right=l.left+nw;l.bottom=l.top+nh;return{w:nw,h:nh,rgba:out};}
self.onmessage=e=>{
  const {id,op,a}=e.data,prog=m=>self.postMessage({id,prog:m});
  try{
    if(op==='ping'){self.postMessage({id,res:'pong'});return;}
    if(op==='psd'){
      const t0=performance.now(),psd=readPSD(a.buf),tr=[];
      const t1=performance.now();prog('Preparo livelli, adesivi e materiali…');
      for(const l of psd.layers){
        if(!l.isGroup&&!l.isDivider&&!l.adjust){
          l.baseColor=baseColorOf(l);
          const px=cropPx(l,layerRGBA(l));
          if(px){l.px=px;l.any=true;tr.push(px.rgba.buffer);}}
        delete l.data;delete l.chans;}
      self.postMessage({id,res:{psd,ms:[t1-t0,performance.now()-t1]}},tr);return;}
    if(op==='analyze'){
      const r=labelTemplate(new Uint8Array(a.buf),prog);
      WL={isl:r.isl,pan:r.pan,ver:a.ver};
      const isl=r.isl.slice(),pan=r.pan.slice();
      self.postMessage({id,res:Object.assign(r,{isl,pan})},[isl.buffer,pan.buffer]);return;}
    if(op==='fill'){const t0=performance.now(),r=fillMasks(a),tr=[];if(r){if(r.body)tr.push(r.body.buffer);if(r.edge)tr.push(r.edge.buffer);r.ms=performance.now()-t0;}
      self.postMessage({id,res:r},tr);return;}
    if(op==='tga'){const t0=performance.now(),t=makeTGA(a.buf,a.pal);self.postMessage({id,res:{tga:t,ms:performance.now()-t0}},[t.buffer]);return;}
    throw new Error('operazione sconosciuta '+op);
  }catch(err){self.postMessage({id,err:String(err&&err.message||err)});}
};

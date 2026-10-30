/* distanza euclidea al quadrato (Felzenszwalb & Huttenlocher): per ogni pixel, distanza dal pixel “dentro” più vicino */
const INF=1e20;
function edt1(f,n,d,v,z){let k=0;v[0]=0;z[0]=-INF;z[1]=INF;
  for(let q=1;q<n;q++){let s;while(true){const p=v[k];s=((f[q]+q*q)-(f[p]+p*p))/(2*q-2*p);if(s<=z[k]){k--;if(k<0){k=0;break;}}else break;}
    k++;v[k]=q;z[k]=s;z[k+1]=INF;}
  k=0;for(let q=0;q<n;q++){while(z[k+1]<q)k++;const p=v[k];d[q]=(q-p)*(q-p)+f[p];}}
function edt(inside,w,h){
  const g=new Float32Array(w*h),n=Math.max(w,h),f=new Float32Array(n),d=new Float32Array(n),v=new Int32Array(n),z=new Float32Array(n+1);
  for(let i=0;i<w*h;i++)g[i]=inside[i]?0:INF;
  for(let x=0;x<w;x++){for(let y=0;y<h;y++)f[y]=g[y*w+x];edt1(f,h,d,v,z);for(let y=0;y<h;y++)g[y*w+x]=d[y];}
  for(let y=0;y<h;y++){const o=y*w;for(let x=0;x<w;x++)f[x]=g[o+x];edt1(f,w,d,v,z);for(let x=0;x<w;x++)g[o+x]=d[x];}
  return g;
}
/* maschere di un riempimento: corpo allargato di “grow” e contorno lungo il bordo (dentro, a cavallo o fuori) */
function fillMasks(o){
  if(!WL||WL.ver!==o.ver)return null;
  const arr=o.mode==='island'?WL.isl:WL.pan,{x0,y0,w,h}=o,tab=new Uint8Array(65536);for(const id of o.ids)tab[id]=1;
  const M=new Uint8Array(w*h);for(let y=0;y<h;y++){let s=((y+y0)<<12)+x0,q=y*w;for(let x=0;x<w;x++,s++,q++)if(tab[arr[s]])M[q]=1;}
  let body=null,edge=null,dOut=null;
  const need=(r)=>dOut||(dOut=edt(M,w,h));
  if(!o.only){const gr=o.grow,lim=gr*gr+1;body=new Uint8Array(w*h);
    if(gr<=0){for(let i=0;i<M.length;i++)if(M[i])body[i]=255;}
    else{const D=need();for(let i=0;i<D.length;i++)if(D[i]<=lim)body[i]=255;}}
  if(o.edge){const W=o.edge.width,pos=o.edge.pos||'inside';edge=new Uint8Array(w*h);
    const rOut=pos==='outside'?W:pos==='center'?W/2:0,rIn=pos==='inside'?W:pos==='center'?W/2:0;
    if(rOut>0){const D=need(),l=rOut*rOut;for(let i=0;i<D.length;i++)if(!M[i]&&D[i]<=l)edge[i]=255;}
    if(rIn>0){const inv=new Uint8Array(w*h);for(let i=0;i<M.length;i++)inv[i]=M[i]?0:1;const D=edt(inv,w,h),l=rIn*rIn;for(let i=0;i<D.length;i++)if(M[i]&&D[i]<=l)edge[i]=255;}}
  return{body,edge};
}


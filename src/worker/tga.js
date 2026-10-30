/* TGA 32 bit (con la pulizia dei materiali se serve): ogni pixel va al colore region più vicino */
function snapPixels(u,pal){
  const pr=pal.map(v=>[v&255,(v>>8)&255,(v>>16)&255]),cache=new Map(pal.map(v=>[v,v]));
  let lv=-1,lo=0;   // pixel uguale al precedente (quasi sempre): niente ricerca
  for(let i=0;i<u.length;i++){const v=u[i];if(v===lv){if(lo!==v)u[i]=lo;continue;}let o=cache.get(v);
    if(o===undefined){const r=v&255,g=(v>>8)&255,b=(v>>16)&255;let bd=1e9;for(let j=0;j<pal.length;j++){const q=pr[j],d=(r-q[0])**2+(g-q[1])**2+(b-q[2])**2;if(d<bd){bd=d;o=pal[j];}}cache.set(v,o);}
    lv=v;lo=o;if(o!==v)u[i]=o;}
}
function makeTGA(buf,pal){
  const src=new Uint32Array(buf,0,NN);if(pal)snapPixels(src,pal);
  for(let i=0;i<NN;i++){const v=src[i];src[i]=(v&0x0000FF00)|((v&0xFF)<<16)|((v>>>16)&0xFF)|0xFF000000;}
  const t=new Uint8Array(18+NN*4);t[2]=2;t[12]=N&255;t[13]=N>>8;t[14]=N&255;t[15]=N>>8;t[16]=32;t[17]=0x28;t.set(new Uint8Array(buf,0,NN*4),18);return t;
}


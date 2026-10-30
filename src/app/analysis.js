/* ================= analisi dei pezzi ================= */
let labVer=0;
async function analyze(rgba){
  busy('Riconosco i pezzi del template…');
  const ver=++labVer,t0=pnow(),r=await wcall('analyze',{buf:rgba.buffer,ver},[rgba.buffer],m=>busy(m));
  perfLog('Analisi pezzi e pannelli',r.ms,`${r.ni} pezzi, ${r.np} pannelli · attesa totale ${Math.round(pnow()-t0)} ms`);
  LAB={isl:r.isl,pan:r.pan,ib:r.ib,pb:r.pb,iarea:r.iarea,iseed:r.iseed,seams:r.seams,ver};
  for(const k in FC)delete FC[k];
  busy(null);
  setStatus(LAB.seams?`Template pronto: ${r.ni} pezzi, ${r.np} pannelli`:`Template pronto: ${r.ni} pezzi. Il wireframe non ha linee verdi dei pannelli: “Riempi pannello” colora il pezzo intero.`);
}
function labelAt(mode,x,y){
  if(!LAB)return 0;const ix=Math.floor(x),iy=Math.floor(y);if(ix<0||iy<0||ix>=N||iy>=N)return 0;
  return (mode==='island'?LAB.isl:LAB.pan)[(iy<<12)|ix];
}


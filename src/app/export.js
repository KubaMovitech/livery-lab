/* ================= export per LMU: il codice sta in src/modules/export.js (modulo isolato) =================
   Qui gli passo le sue dipendenze e prendo quello che offre agli altri moduli. */
const {
  saveFile,renderTo,toTGA,buildLmuFiles,expCheckOn,exportNames,exportCheck,exportDone
}=LL_MODULES.export({
  N,NN,$,el,tick,perfLog,pnow,wcall,
  mk,S,toast,setStatus,busy,fillsReady,drawScene,regionPalette,
  drawRegions,hhmm:(...a)=>hhmm(...a)
},{
  get wireCv(){return wireCv;},
  get regionCv(){return regionCv;},
  get dirty(){return dirty;},set dirty(v){dirty=v;}
});

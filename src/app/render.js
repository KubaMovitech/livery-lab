/* ================= disegno della livrea: il codice sta in src/modules/render.js (modulo isolato) =================
   Qui gli passo le sue dipendenze e prendo quello che offre agli altri moduli. */
const {
  tmp,textBox,imgBox,FC,fillCache,fillsReady,vis,BLENDS,REF,refBake,refShown,drawScene,
  regionPalette,drawRegions,view,resizeView,requestDraw,s2w,render,HR,xformHandles,hitXform
}=LL_MODULES.render({
  N,$,perfLog,pnow,wcall,mk,matCol,sepOutline,
  S,images,toast,selLayer,paintStyle,shapePath,bbox,mirrorY,
  labelAt,selLayers,bounds
},{
  get wireCv(){return wireCv;},
  get wireDark(){return wireDark;},
  get regionCv(){return regionCv;},
  get regionNP(){return regionNP;},set regionNP(v){regionNP=v;},
  get LAB(){return LAB;},
  get drawing(){return drawing;},
  get drag(){return drag;},
  get hover(){return hover;}
});

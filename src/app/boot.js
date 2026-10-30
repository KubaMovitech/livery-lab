/* ================= avvio ================= */
new ResizeObserver(resizeView).observe(view);
FONTS.slice(0,4).forEach(ensureFont);
buildTools();buildOpts();setHint();resizeView();fit();commit();dirty=false;projDirty=false;refreshPanels();buildLib();libLoad().then(offerResume);
wkReady.then(()=>buildDoc());
window.__LL={PERF,fillsReady,toTGA,renderTo,render,requestDraw,refreshAll,commit,autosave,buildLmuFiles,APP_VERSION,REF,loadRef,extractColor,hitLayer,hitTest,selIds,updCheck,pickColor,xformHandles,autosave,readAutosave,resumeAutosave,autoExport,exportToGame,openGameTemplates,S,images,get LAB(){return LAB;},fillCache,drawScene,drawRegions,labelAt};

/* ================= menu: annulla/ripristina, aspetto, menu File ================= */
$('#bUndo').onclick=undo;$('#bRedo').onclick=redo;
function uiLabel(){$('#bUi').textContent='Aspetto: '+(document.documentElement.dataset.ui==='neo'?'futuristico':'classico');}
$('#bUi').onclick=()=>{const neo=document.documentElement.dataset.ui!=='neo';if(neo)document.documentElement.dataset.ui='neo';else delete document.documentElement.dataset.ui;
  try{localStorage.setItem('liverylab-ui',neo?'neo':'classic');}catch(e){}uiLabel();requestDraw(true);};uiLabel();
// il menu File si chiude dopo una scelta o cliccando fuori
document.querySelectorAll('#fileMenu .mi').forEach(b=>b.addEventListener('click',()=>{$('#fileMenu').open=false;}));
document.addEventListener('pointerdown',e=>{const m=$('#fileMenu');if(m.open&&!m.contains(e.target))m.open=false;});


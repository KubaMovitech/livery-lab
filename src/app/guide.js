/* ================= guida: scegli auto → template → colori → personalizza → esporta ================= */
let guideStep=0,guideOn=true;try{guideOn=localStorage.getItem('liverylab-guide')!=='0';}catch(e){}
const GSTEPS=['Auto','Template','Colori','Personalizza','Esporta'];
function hasDoc(){return !!(wireCv||S.layers.length);}
function guideAfterTemplate(){if(guideStep<2)guideStep=2;buildGuide();}
function setGuide(on){guideOn=on;try{localStorage.setItem('liverylab-guide',on?'1':'0');}catch(e){}buildGuide();}
function buildGuide(){
  const g=$('#guide');$('#bGuide').setAttribute('aria-pressed',String(guideOn));
  const ep=$('#empty .path');if(ep)[...ep.children].forEach((li,i)=>li.classList.toggle('on',i===(hasDoc()?2:0)));
  g.hidden=!guideOn||!hasDoc();if(g.hidden)return;
  placeGuide();
  if(guideStep<2)guideStep=2;
  const st=el('ol',{class:'gsteps'},...GSTEPS.map((n,i)=>el('li',{class:i===guideStep?'on':(i<guideStep?'done':''),title:n,onclick:()=>{if(i>=2){guideStep=i;buildGuide();}}},(i<guideStep?'✓ ':'')+n)));
  const b=(lab,fn,pri)=>el('button',{class:'btn sm'+(pri?' pri':''),onclick:fn},lab);
  let body;
  if(guideStep===2){
    const bc=el('input',{type:'color',value:S.base,'aria-label':'Colore di base'});bc.addEventListener('change',()=>{S.base=bc.value;pushRecent(bc.value);commit();refreshAll();buildGuide();});
    const qc=['blackgold','circuitgold','chrome','topo'].map(k=>CONCEPTS.find(c=>c.k===k)).filter(Boolean);
    body=[el('h3',{},'3 · Scegli i colori'),el('p',{class:'note'},'Parti dal colore di base: riempie tutta la carrozzeria sotto ai tuoi livelli.'),
      el('div',{class:'row',style:'flex-wrap:wrap;gap:4px'},el('label',{class:'ccol'},bc,el('span',{},'Base')),
        ...curPal().slice(0,8).map(c=>el('button',{class:'sw',style:`background:${c}`,title:'Base '+c.toUpperCase(),'aria-label':'Base '+c,onclick:()=>{S.base=c;pushRecent(c);commit();refreshAll();buildGuide();}}))),
      el('p',{class:'note'},'Palette: '+(palSel>=0&&palettes[palSel]?palettes[palSel].name:'colori standard')+' (si cambia nella barra in alto o in Libreria). Oppure parti da un concept pronto:'),
      el('div',{class:'gbtns'},...qc.map(cp=>b(cp.n,()=>applyConcept(cp))),b('Tutti i concept…',()=>{setTab('B');})),
      el('p',{class:'note'},'Il materiale della base (metallizzato, cromo…) è in Documento: puoi pensarci dopo.')];
  }else if(guideStep===3){
    body=[el('h3',{},'4 · Personalizza'),el('p',{class:'note'},'Colora pezzi e pannelli, aggiungi sponsor, numero e grafiche. Ogni cosa diventa un livello: selezionalo per cambiarne colore e trama in Proprietà.'),
      el('div',{class:'gbtns'},b('Colora un pezzo (F)',()=>setTool('island'),true),b('Colora un pannello (M)',()=>setTool('panel')),
        b('Aggiungi un logo',()=>$('#fImg').click()),b('Scrivi testo o numero (T)',()=>setTool('text')),
        b('Grafiche pronte',()=>{setTab('B');setTimeout(()=>{const e=$('#secGraphics');if(e)e.scrollIntoView({behavior:'smooth'});},50);}),b('Forme (R, O)',()=>setTool('rect'))),
      el('p',{class:'note'},'Strumenti avanzati (lazo, pennello, estrai colore…) con “⋯” in fondo alla barra a sinistra.')];
  }else{
    body=[el('h3',{},'5 · Esporta'),el('p',{class:'note'},FS_OK?'“Esporta nel gioco” scrive la livrea e i materiali nella cartella di LMU. Prima ti mostro cosa creo e dove.':'Scarica lo zip con la livrea e i materiali e copialo nella cartella della livrea di LMU.'),
      el('div',{class:'gbtns'},FS_OK?b('Esporta nel gioco',()=>exportToGame(),true):null,b(FS_OK?'Scarica zip':'Scarica lo zip per LMU',()=>$('#bLmu').click(),!FS_OK),b('Salva progetto',()=>saveProject(false))),
      el('p',{class:'note'},'Nello showroom di LMU premi RELOAD per vedere la livrea sull’auto.')];
  }
  g.innerHTML='';g.append(st,...body,el('div',{class:'gnav'},guideStep>2?b('‹ Indietro',()=>{guideStep--;buildGuide();}):null,el('span',{style:'flex:1'}),
    guideStep<4?b('Avanti ›',()=>{guideStep++;buildGuide();},true):null,el('button',{class:'ib',title:'Chiudi la guida (riaprila con “Guida” in alto)','aria-label':'Chiudi la guida',onclick:()=>setGuide(false)},'✕')));
}
// sopra la barra dello zoom, che può andare su due righe
function placeGuide(){const g=$('#guide'),h=$('.hud');if(g&&h)g.style.bottom=(h.offsetHeight+20)+'px';}
window.addEventListener('resize',placeGuide);
$('#bGuide').onclick=()=>setGuide(!guideOn);
$('#bRecent').onclick=()=>{$('#fileMenu').open=false;openRecent();};
$('#unsaved').onclick=()=>saveProject(false);$('#unsaved').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();saveProject(false);}};


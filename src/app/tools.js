/* ================= strumenti ================= */
const ICONS={
  wand:'<path d="M4 20l10-10"/><path d="M15 3v3M18.5 4.5l-2 2M21 9h-3M18.5 13.5l-2-2"/><circle cx="15.5" cy="8.5" r="1.3" fill="currentColor"/>',
  pick:'<path d="M14.5 4.5l5 5"/><path d="M17 7l2.2-2.2a1.6 1.6 0 00-2.3-2.3L14.7 4.8"/><path d="M15.8 8.2L7 17l-3 1 1-3 8.8-8.8"/>',
  select:'<path d="M5 3l6 16 2.5-6.5L20 10z"/>',
  island:'<path d="M4 15c0-5 4-9 9-9 4 0 7 2 7 5s-3 4-5 4-3 3-6 3-5-1-5-3z" fill="currentColor" stroke="none" opacity=".35"/><path d="M4 15c0-5 4-9 9-9 4 0 7 2 7 5s-3 4-5 4-3 3-6 3-5-1-5-3z"/>',
  panel:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 5v14"/><rect x="3" y="5" width="9" height="14" rx="2" fill="currentColor" stroke="none" opacity=".35"/>',
  free:'<path d="M3 17c4-1 4-9 9-9s4 8 9 7"/><circle cx="3" cy="17" r="1.4"/><circle cx="21" cy="15" r="1.4"/>',
  lasso:'<path d="M6 15c-3-2-2-8 5-9s10 3 8 6-7 4-10 3"/><path d="M8 14c-1 2 0 4 1 6"/>',
  brush:'<path d="M14 4l6 6-8 8-6-6z"/><path d="M6 12c-2 1-3 4-3 8 4 0 7-1 8-3"/>',
  eraser:'<path d="M8 20h12"/><path d="M4 15l9-9 6 6-8 8H8z"/>',
  rect:'<rect x="4" y="6" width="16" height="12" rx="1"/>',
  ellipse:'<ellipse cx="12" cy="12" rx="8" ry="6"/>',
  text:'<path d="M5 6h14M12 6v13M9 19h6"/>',
  image:'<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M5 17l5-4 3 2 3-3 4 4"/>',
  pan:'<path d="M8 12V6a1.5 1.5 0 013 0v5m0-1V4.5a1.5 1.5 0 013 0V10m0-1.5a1.5 1.5 0 013 0V15a6 6 0 01-6 6h-1a6 6 0 01-5-3l-2-3a1.5 1.5 0 012.5-1.6L8 15"/>'
};
const TOOLS=[['select','Seleziona e sposta','v'],null,['island','Riempi un pezzo intero','f'],['panel','Riempi un pannello','m'],null,['free','Lama: forma a punti','p'],['lasso','Lazo: disegna una forma a mano','q'],['brush','Pennello','b'],['eraser','Gomma (sul livello selezionato)','e'],null,['rect','Rettangolo','r'],['ellipse','Ellisse','o'],['text','Testo','t'],['image','Importa immagine o logo','i'],['pick','Contagocce: prendi un colore dalla livrea (o Alt+clic)','k'],['wand','Estrai colore dal riferimento: diventa un livello ricolorabile','x'],null,['pan','Sposta la vista (o tieni Spazio)','h']];
// all'inizio solo gli strumenti essenziali; gli altri restano con le scorciatoie o con “⋯”
const ESSENTIAL=new Set(['select','island','panel','rect','ellipse','text','image','pan']);
let advTools=false;try{advTools=localStorage.getItem('liverylab-advtools')==='1';}catch(e){}
function buildTools(){
  const box=$('#tools');box.innerHTML='';
  const list=TOOLS.filter(t=>!t||advTools||ESSENTIAL.has(t[0])||S.tool===t[0]).filter((t,i,a)=>t||(i>0&&a[i-1]));
  for(const t of list){if(!t){box.append(el('div',{class:'tsep'}));continue;}
    const [id,tip,k]=t;const b=el('button',{class:'tool',title:`${tip} (${k.toUpperCase()})`,'aria-label':tip,'aria-pressed':String(S.tool===id),onclick:()=>{if(id==='image')$('#fImg').click();else setTool(id);}});
    b.innerHTML=`<svg viewBox="0 0 24 24">${ICONS[id]}</svg><kbd>${k.toUpperCase()}</kbd>`;box.append(b);}
  box.append(el('button',{class:'tool more','aria-pressed':String(advTools),title:advTools?'Mostra solo gli strumenti essenziali':'Strumenti avanzati: lama, lazo, pennello, gomma, contagocce, estrai colore','aria-label':'Strumenti avanzati',
    onclick:()=>{advTools=!advTools;try{localStorage.setItem('liverylab-advtools',advTools?'1':'0');}catch(e){}buildTools();}},advTools?'−':'⋯'));
}
function setTool(t){S.tool=t;if(t!=='free'&&!(drawing&&drawing.lasso))drawing=null;buildTools();buildOpts();setHint();view.style.cursor='';requestDraw();}
let showHints=true;try{showHints=localStorage.getItem('liverylab-hints')!=='0';}catch(e){}
function setHint(){
  const H={select:'Clic per selezionare. Gli angoli del riquadro ridimensionano, il pallino in alto ruota (Maiusc per scatti di 15°). Trascina i punti di una forma per modellarla: doppio clic su un punto lo rende angolo netto, doppio clic sul bordo aggiunge un punto, clic destro lo toglie. Maiusc+clic seleziona più livelli; mentre trascini la calamita li aggancia (Ctrl per sganciare). I pallini sui lati stirano in larghezza o altezza. Frecce: sposta di 1 px (Maiusc 10 px). Ctrl+D duplica.',
    island:LAB?'Clic su un pezzo per colorarlo tutto. Finché il livello è selezionato, altri clic aggiungono pezzi; un clic su un pezzo già colorato lo toglie. Cambiando colore, o con “Nuovo livello” (Esc), il prossimo clic crea un livello nuovo.':'Apri prima il template PSD: i pezzi si ricavano dal wireframe.',
    panel:LAB?'Clic su un pannello: il colore segue le linee verdi del template. Finché il livello è selezionato, altri clic aggiungono o tolgono pannelli. Cambiando colore, o con “Nuovo livello” (Esc), il prossimo clic crea un livello nuovo.':'Apri prima il template PSD: i pannelli si ricavano dal wireframe.',
    free:drawing&&drawing.pts.length?'Altri clic per i punti (Maiusc per un angolo). Doppio clic, Invio o clic sul primo punto per chiudere.':'Clic per il primo punto della lama.',
    lasso:'Tieni premuto e disegna il contorno: al rilascio diventa una forma che puoi rifinire.',
    brush:'Dipingi a mano libera. Ogni sessione di pennello va nel livello pennello selezionato.',
    eraser:'Cancella dal livello selezionato. Le parti cancellate si possono ripristinare dalle proprietà.',
    wand:REF.cv?({color:'Clic su un colore del riferimento: le parti di quel colore diventano un livello da ricolorare. “Solo nel pezzo cliccato” lo limita a quel pezzo.',piece:'Clic su un pezzo (o pannello): quel pezzo del riferimento, con tutti i suoi colori e loghi, diventa un livello.',lasso:'Tieni premuto e disegna attorno alla parte da prendere: diventa un livello che puoi spostare.',rect:'Trascina un rettangolo attorno alla parte da prendere (per esempio uno sponsor): diventa un livello che puoi spostare.'})[S.act.wmode||'color']:'Carica prima una livrea finita come riferimento (Documento → Immagine di riferimento).',
    pick:'Clic sulla livrea per prendere quel colore come colore attivo. Con qualunque strumento puoi anche fare Alt+clic.',
    rect:'Trascina per disegnare un rettangolo.',ellipse:'Trascina per disegnare un’ellisse.',text:'Clic sulla tela per aggiungere un testo.',pan:'Trascina per spostare la vista.'};
  $('#hint').textContent=H[S.tool]||'';$('#hint').hidden=!showHints||!H[S.tool];
}
function buildOpts(){
  const o=$('#opts');o.innerHTML='';const t=S.tool;
  const col=el('input',{type:'color',class:'cbtn',value:S.act.color,'aria-label':'Colore attivo'});col.addEventListener('input',()=>{S.act.color=col.value;});
  // cambiare colore con un riempimento selezionato vuol dire “nuovo colore”: il prossimo clic crea un livello nuovo
  const newColor=()=>{const c=selLayer();if((t==='island'||t==='panel')&&c&&c.type==='fill'){S.sel=null;refreshPanels();requestDraw();buildOpts();}};
  col.addEventListener('change',()=>{pushRecent(col.value);newColor();});
  const hx=hexField(()=>S.act.color,v=>{S.act.color=v.toLowerCase();pushRecent(v);newColor();},col);
  const cp=curPal().slice(0,10),rc=recent.filter(c=>!cp.map(x=>x.toLowerCase()).includes(c)).slice(0,8);
  const psel=el('select',{class:'palsel','aria-label':'Palette',title:'Palette: le tue palette salvate (Libreria → Le mie palette)'},el('option',{value:'-1',selected:palSel<0},'Base'),...palettes.map((pl,i)=>el('option',{value:String(i),selected:palSel===i},pl.name)));
  psel.onchange=()=>{palSel=+psel.value;savePalettes();buildOpts();};
  const mini=el('div',{class:'mini'},psel,...cp.concat(rc.length?['|']:[],rc).map(c=>c==='|'?el('span',{class:'msep',title:'Recenti'}):el('button',{style:`background:${c}`,title:c.toUpperCase(),'aria-label':'Colore '+c,onclick:()=>{S.act.color=c.toLowerCase();col.value=c.toLowerCase();hx.value=c.toUpperCase();newColor();}})));
  if(t==='select'||t==='pan'){o.append(el('label',{},'Colore attivo'),col,hx,mini);return;}
  if(t==='wand'){const wm=S.act.wmode||'color';
    const sg=el('div',{class:'seg',role:'group','aria-label':'Cosa prendere'},...[['color','Colore'],['piece','Pezzo'],['lasso','A mano'],['rect','Rettangolo']].map(([k,n])=>el('button',{'aria-pressed':String(wm===k),onclick:()=>{S.act.wmode=k;buildOpts();setHint();}},n)));
    o.append(el('label',{},'Prendi'),sg);
    const chk=(key,lab,tip)=>{const c=el('input',{type:'checkbox'});c.checked=!!S.act[key];c.onchange=()=>{S.act[key]=c.checked;buildOpts();};return el('label',{class:'chk',style:'margin:0',title:tip||''},c,lab);};
    const tolCtl=()=>{const r=el('input',{type:'range',min:2,max:120,value:S.act.tol??30,'aria-label':'Tolleranza'}),v=el('span',{class:'tgt'},String(S.act.tol??30));r.oninput=()=>{S.act.tol=+r.value;v.textContent=r.value;};return [el('label',{},'Tolleranza'),r,v];};
    if(wm==='color')o.append(...tolCtl(),chk('contig','Solo la zona collegata'),chk('inPiece','Solo nel pezzo cliccato','Prende il colore solo dentro il pezzo del template su cui clicchi'));
    else if(wm==='piece')o.append(chk('wpanel','Pannello invece del pezzo intero'));
    else{o.append(chk('knock','Togli lo sfondo','Rende trasparente il colore del bordo dell’area: utile per ritagliare uno sponsor'));if(S.act.knock)o.append(...tolCtl());}
    if(!REF.cv)o.append(el('button',{class:'btn sm',onclick:()=>refPick()},'Carica riferimento'));return;}
  if(t==='eraser'){const r=el('input',{type:'range',min:4,max:400,value:S.eraser});r.oninput=()=>{S.eraser=+r.value;};o.append(el('label',{},'Dimensione gomma'),r);return;}
  o.append(el('label',{},'Colore'),col,hx,mini);
  if(t==='island'||t==='panel'){const cur=selLayer(),mode=t==='island'?'island':'panel';
    if(cur&&cur.type==='fill'&&cur.mode===mode)o.append(el('span',{class:'tgt',title:'I clic aggiungono o tolgono '+(mode==='island'?'pezzi':'pannelli')+' da questo livello'},'Su: ',el('b',{},cur.name)),el('button',{class:'btn sm',onclick:()=>{S.sel=null;refreshPanels();buildOpts();requestDraw();}},'Nuovo livello'));}
  if(t==='brush'){const r=el('input',{type:'range',min:2,max:400,value:S.brush});r.oninput=()=>{S.brush=+r.value;};o.append(el('label',{},'Dimensione'),r);return;}
  if(t==='text')return;
  if(t==='island'||t==='panel'){
    const sg=el('div',{class:'seg',role:'group','aria-label':'Stile del riempimento'},...[['fill','Pieno'],['edge','Contorno']].map(([k,n])=>el('button',{'aria-pressed':String(S.act.fstyle===k),onclick:()=>{S.act.fstyle=k;const c=selLayer();if(c&&c.type==='fill'){S.sel=null;refreshPanels();}buildOpts();}},n)));
    o.append(el('label',{},'Stile'),sg);
    if(S.act.fstyle==='edge'){const r=el('input',{type:'range',min:1,max:80,value:S.act.ew,'aria-label':'Spessore del contorno'});const v=el('span',{class:'tgt'},S.act.ew+' px');r.oninput=()=>{S.act.ew=+r.value;v.textContent=r.value+' px';};o.append(el('label',{},'Spessore'),r,v);return;}
  }
  const ps=el('select',{'aria-label':'Trama'});PATS.forEach(([k,n])=>ps.append(el('option',{value:k,selected:k===S.act.pat},n)));ps.onchange=()=>{S.act.pat=ps.value;buildOpts();};
  o.append(el('label',{},'Trama'),ps);
  if(isGrad({pat:S.act.pat})){
    const c2=el('input',{type:'color',class:'cbtn',value:S.act.c2,'aria-label':'Colore finale'});c2.oninput=()=>{S.act.c2=c2.value;};
    const ga=el('input',{type:'range',min:0,max:360,value:S.act.gangle,'aria-label':'Direzione'});ga.oninput=()=>{S.act.gangle=+ga.value;};
    o.append(el('label',{},'Verso'),c2);
    if(S.act.pat==='grad3'){const c3=el('input',{type:'color',class:'cbtn',value:S.act.c3,'aria-label':'Colore centrale'});c3.oninput=()=>{S.act.c3=c3.value;};o.append(el('label',{},'Centro'),c3);}
    o.append(el('label',{},'Direzione'),ga);
  }else if(S.act.pat==='image'){o.append(el('span',{class:'tgt'},'Scegli l’immagine nelle proprietà del livello'));
  }else if(S.act.pat!=='none'){const bg=el('input',{type:'color',class:'cbtn',value:S.act.bg,'aria-label':'Colore di fondo della trama'});bg.oninput=()=>{S.act.bg=bg.value;};
    const sc=el('input',{type:'range',min:25,max:600,value:Math.round(S.act.scale*100)});sc.oninput=()=>{S.act.scale=sc.value/100;};
    o.append(el('label',{},'Fondo'),bg,el('label',{},'Scala'),sc);}
}


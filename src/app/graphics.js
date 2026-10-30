/* ================= grafiche pronte =================
   Ogni grafica è fatta di forme (coordinate 0..1) che vengono adattate al riquadro dei pannelli selezionati.
   Restano forme normali: si spostano, ruotano, stirano, specchiano e ricolorano. */
function bez(P,t){const u=1-t;return[u*u*u*P[0][0]+3*u*u*t*P[1][0]+3*u*t*t*P[2][0]+t*t*t*P[3][0],u*u*u*P[0][1]+3*u*u*t*P[1][1]+3*u*t*t*P[2][1]+t*t*t*P[3][1]];}
// lama: linea centrale (curva di Bézier) con spessore che varia, punte affilate
function blade(P,wf,n=40){const up=[],dn=[];for(let i=0;i<=n;i++){const t=i/n,a=bez(P,Math.max(0,t-.01)),b=bez(P,Math.min(1,t+.01)),c=bez(P,t),dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L,w=wf(t)/2;
  up.push([c[0]+nx*w,c[1]+ny*w]);dn.push([c[0]-nx*w,c[1]-ny*w]);}return up.concat(dn.reverse());}
const tip=(m,a=.7,b=1)=>t=>m*Math.pow(Math.sin(Math.PI*Math.pow(t,a)),b);
const GRAPHICS=[
  {k:'swoosh',n:'Lama curva',d:'Una lama che si allunga e si assottiglia.',make:()=>[{c:'a',polys:[blade([[0,.78],[.35,1.02],[.6,.05],[1,.2]],tip(.3,.75,.7))]}]},
  {k:'swoosh2',n:'Doppia lama',d:'Due lame parallele in due colori.',make:()=>[{c:'a',polys:[blade([[0,.62],[.35,.9],[.6,0],[1,.08]],tip(.26,.75,.7))]},{c:'b',polys:[blade([[.08,.95],[.42,1.08],[.66,.3],[1,.42]],tip(.12,.75,.6))]}]},
  {k:'blade',n:'Taglio diagonale',d:'Lama dritta e affilata, come i tagli delle Hypercar.',make:()=>[{c:'a',polys:[blade([[0,.85],[.3,.66],[.7,.32],[1,.1]],t=>.22*Math.pow(t,.35)*Math.pow(1-t,.9)*2.2)]}]},
  {k:'shards',n:'Schegge',d:'Frammenti appuntiti che si disgregano.',make:r=>{const A=[],B=[];for(let i=0;i<11;i++){const t=i/10,cx=.08+t*.84+(r()-.5)*.06,cy=.75-t*.5+(r()-.5)*.18,s=.2*(1-t*.75)*(.7+r()*.5),a=-.6+(r()-.5)*.9;
    const poly=[[cx+Math.cos(a)*s*1.6,cy+Math.sin(a)*s*1.6],[cx+Math.cos(a+2.4)*s*.5,cy+Math.sin(a+2.4)*s*.5],[cx+Math.cos(a+Math.PI)*s*.9,cy+Math.sin(a+Math.PI)*s*.9],[cx+Math.cos(a-2.2)*s*.45,cy+Math.sin(a-2.2)*s*.45]];(i%4===3?B:A).push(poly);}
    return[{c:'a',polys:A},{c:'b',polys:B}];}},
  {k:'claw',n:'Graffi',d:'Tre graffi curvi paralleli.',make:()=>[{c:'a',polys:[0,1,2].map(i=>blade([[.05+i*.1,.95],[.3+i*.1,.75],[.55+i*.1,.3],[.85+i*.1,.02]],tip(.075,.6,.8)))}]},
  {k:'pixel',n:'Disgregazione a pixel',d:'Quadrati che si sfaldano verso un lato.',make:r=>{const P=[],cols=16,rows=8;for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){const x=i/cols,pk=1-Math.pow(x,.75);if(r()<pk){const s=1/cols*.86,X=x,Y=j/rows;P.push([[X,Y],[X+s,Y],[X+s,Y+1/rows*.86],[X,Y+1/rows*.86]]);}}return[{c:'a',polys:P}];}},
  {k:'chevrons',n:'Frecce',d:'Quattro chevron in fila che si rimpiccioliscono.',make:()=>[{c:'a',polys:[0,1,2,3].map(i=>{const x=i*.25,s=1-i*.18,h=.5*s,c=.5,w=.13*s;return[[x,c-h],[x+w,c-h],[x+w+.16*s,c],[x+w,c+h],[x,c+h],[x+.16*s,c]];})}]},
  {k:'wave',n:'Onda',d:'Fascia ondulata con filetto.',make:()=>{const top=[],bot=[],line=[],line2=[];for(let i=0;i<=40;i++){const x=i/40,y=.5+Math.sin(x*Math.PI*1.6-.6)*.22;top.push([x,y-.16*(.4+x*.6)]);bot.push([x,y+.06]);line.push([x,y+.12]);line2.push([x,y+.16]);}
    return[{c:'a',polys:[top.concat(bot.reverse())]},{c:'b',polys:[line.concat(line2.reverse())]}];}},
  {k:'fade',n:'Righe che sfumano',d:'Righe orizzontali sempre più corte.',make:()=>[{c:'a',polys:[0,1,2,3,4,5,6].map(i=>{const y=i/7,l=1-i*.13,h=1/7*.55;return[[0,y],[l,y],[l-.05,y+h],[0,y+h]];})}]},
  {k:'tear',n:'Strappo',d:'Blocco di colore con il bordo strappato.',make:r=>{const P=[[0,0],[.55,0]];let y=0;while(y<1){y=Math.min(1,y+.04+r()*.07);P.push([.48+r()*.2,y]);}P.push([0,1]);return[{c:'a',polys:[P]}];}},
  {k:'hexfade',n:'Esagoni che si sfaldano',d:'Celle esagonali che spariscono verso un lato.',make:r=>{const P=[],R0=.045;for(let i=0;i<20;i++)for(let j=0;j<9;j++){const cx=i*R0*1.55+R0,cy=j*R0*1.8+(i%2?R0*.9:0)+R0;if(cx>1||cy>1)continue;if(r()<1-Math.pow(cx,.8)){const q=[];for(let k=0;k<6;k++){const a=Math.PI/3*k;q.push([cx+R0*.85*Math.cos(a),cy+R0*.85*Math.sin(a)]);}P.push(q);}}return[{c:'a',polys:P}];}},
  {k:'bolt',n:'Fulmine',d:'Saetta a zigzag.',make:()=>[{c:'a',polys:[[[.0,.3],[.42,.38],[.36,.52],[1,.62],[.5,.58],[.56,.45],[.08,.4]]]}]},
];
function graphicTarget(){
  // se è selezionata una grafica già ritagliata, il bersaglio resta il suo livello base (il primo non ritagliato sotto)
  let l=selLayer();if(l&&l.clip){let i=S.layers.indexOf(l);while(i>0&&S.layers[i].clip)i--;l=S.layers[i];}
  if(!l||l.fromTemplate||(l.type!=='fill'&&l.type!=='shape'))return null;
  if(l.type==='fill'){const c=fillCache(l);if(!c||!c.ids.size)return null;const bbs=l.mode==='island'?LAB.ib:LAB.pb;let x0=N,y0=N,x1=0,y1=0;
    for(const p of l.seeds){const v=labelAt(l.mode,p.x,p.y);if(!v)continue;const b=bbs[v];x0=Math.min(x0,b[0]);y0=Math.min(y0,b[1]);x1=Math.max(x1,b[2]);y1=Math.max(y1,b[3]);}
    return x1>x0?{l,b:{x0,y0,x1,y1}}:null;}
  const b=bounds(l);return b?{l,b}:null;
}
function addGraphic(g){
  const tg=graphicTarget(),r=view.getBoundingClientRect(),c=s2w(r.width/2,r.height/2);
  let b=tg?tg.b:{x0:c.x-500,y0:c.y-250,x1:c.x+500,y1:c.y+250};const px=(b.x1-b.x0)*.04,py=(b.y1-b.y0)*.04;b={x0:b.x0-px,y0:b.y0-py,x1:b.x1+px,y1:b.y1+py};
  const W=b.x1-b.x0,H=b.y1-b.y0,parts=g.make(rng(Date.now()%100000)),gid='u'+(S.uid++);
  S.groups[gid]={name:'Grafica · '+g.n,parent:null,on:true,user:true};openG.add(gid);
  const out=[];for(const part of parts){if(!part.polys.length)continue;const pts=[],lens=[];
    for(const q of part.polys){lens.push(q.length);for(const [u,v] of q)pts.push({x:b.x0+u*W,y:b.y0+v*H});}
    const l=newShape(pts,false);Object.assign(l,{name:g.n+(parts.length>1?' '+(out.length+1):''),color:CC[part.c]||CC.a,paint:{pat:'none',bg:'#1B1D20',scale:1,angle:0},gp:[gid],mirrorSwap:false});
    if(lens.length>1)l.parts=lens;if(tg){l.clip=true;l.mirror=!!tg.l.mirror;}l.id=newId();l.visible=true;l.opacity=1;l.mat='keep';out.push(l);}
  let at;if(tg){at=S.layers.indexOf(tg.l)+1;while(S.layers[at]&&S.layers[at].clip)at++;}else{const ti=S.layers.findIndex(x=>x.onTop);at=ti>=0?ti:S.layers.length;}
  S.layers.splice(at,0,...out);setSel(out.map(l=>l.id));setTool('select');commit();refreshAll();
  toast(tg?`“${g.n}” dentro “${tg.l.name}”: resta solo nei suoi pannelli. Spostala, ruotala o stirala con le maniglie; il colore lo cambi nelle proprietà.`:`“${g.n}” aggiunta al centro. Per metterla dentro dei pannelli: prima “Riempi pannello”, selezioni quel livello e poi scegli la grafica.`,6500);
}
function graphicPreview(g){const c=mk(96,56),x=c.getContext('2d');x.fillStyle='#2a2d33';x.fillRect(0,0,96,56);const parts=g.make(rng(7));
  for(const part of parts){x.fillStyle=CC[part.c]||CC.a;x.beginPath();for(const q of part.polys){q.forEach(([u,v],i)=>i?x.lineTo(6+u*84,5+v*46):x.moveTo(6+u*84,5+v*46));x.closePath();}x.fill();}return c;}
function paletteSec(){
  const sec=el('div',{class:'sec'},el('h3',{},'Le mie palette'),el('p',{class:'note'},'Clic su un colore: diventa il colore attivo. La palette scelta compare nella barra in alto e nelle proprietà.'));
  palettes.forEach((pl,i)=>{
    const nm=el('button',{class:'palname'+(palSel===i?' on':''),title:'Usa questa palette nella barra in alto',onclick:()=>{palSel=palSel===i?-1:i;savePalettes();buildOpts();buildLib();refreshPanels();}},pl.name);
    sec.append(el('div',{class:'palrow'},el('div',{class:'palhead'},nm,
      el('button',{class:'ib',title:'Aggiungi il colore attivo','aria-label':'Aggiungi il colore attivo a '+pl.name,onclick:()=>{const c=S.act.color.toLowerCase();if(!pl.colors.includes(c))pl.colors.push(c);savePalettes();buildLib();buildOpts();}},'+'),
      el('button',{class:'ib',title:'Usa i primi tre colori nei concept e nelle grafiche',onclick:()=>{CC.a=pl.colors[0]||CC.a;CC.b=pl.colors[1]||CC.b;CC.c=pl.colors[2]||CC.c;try{localStorage.setItem('liverylab-concept',JSON.stringify(CC));}catch(e){}buildLib();toast('Colori dei concept e delle grafiche presi da “'+pl.name+'”.');}},'◧'),
      el('button',{class:'ib',title:'Rinomina',onclick:()=>{const v=prompt('Nome della palette',pl.name);if(v&&v.trim()){pl.name=v.trim();savePalettes();buildLib();buildOpts();}}},'✎'),
      el('button',{class:'ib',title:'Elimina la palette',onclick:()=>{if(!confirm('Elimino la palette “'+pl.name+'”?'))return;palettes.splice(i,1);if(palSel===i)palSel=-1;else if(palSel>i)palSel--;savePalettes();buildLib();buildOpts();}},'✕')),
      el('div',{class:'swatches'},...pl.colors.map((c,j)=>el('button',{class:'sw',style:`background:${c}`,title:c.toUpperCase()+' · clic destro per toglierlo','aria-label':'Usa '+c,onclick:()=>{S.act.color=c;pushRecent(c);buildOpts();toast('Colore attivo: '+c.toUpperCase());},
        oncontextmenu:e=>{e.preventDefault();pl.colors.splice(j,1);savePalettes();buildLib();buildOpts();}})))));});
  const mkPal=(name,cols)=>{cols=[...new Set(cols.map(c=>c.toLowerCase()))].slice(0,12);if(!cols.length){toast('Non ci sono ancora colori da salvare.');return;}const v=prompt('Nome della nuova palette',name);if(!v)return;palettes.push({name:v.trim(),colors:cols});palSel=palettes.length-1;savePalettes();buildLib();buildOpts();toast('Palette salvata: resta anche le prossime volte.');};
  sec.append(el('div',{class:'row',style:'flex-wrap:wrap'},el('span',{class:'note',style:'margin:0'},'Nuova palette dai colori:'),
    el('button',{class:'btn sm',onclick:()=>mkPal('La mia livrea',liveryColors())},'della livrea'),el('button',{class:'btn sm',onclick:()=>mkPal('Recenti',recent)},'recenti'),
    photoPal.length?el('button',{class:'btn sm',onclick:()=>mkPal('Dalla foto',photoPal)},'della foto'):null,el('button',{class:'btn sm',onclick:()=>mkPal('Nuova palette',[S.act.color])},'vuota')));
  return sec;
}
function graphicSec(){
  const tg=graphicTarget(),g=el('div',{class:'cgrid'});
  for(const gr of GRAPHICS)g.append(el('button',{class:'cbtn2',title:gr.d,onclick:()=>addGraphic(gr)},graphicPreview(gr),el('b',{},gr.n),el('small',{},gr.d)));
  return el('div',{class:'sec',id:'secGraphics'},el('h3',{},'Grafiche pronte'),
    el('p',{class:'note'},tg?`Verranno messe dentro “${tg.l.name}”, ritagliate sui suoi pannelli.`:'Per metterle dentro uno o più pannelli: fai “Riempi pannello” (M) su quei pannelli, seleziona il livello e poi clicca la grafica. I colori sono i tre dei concept qui sotto.'),g);
}
function conceptSec(){
  const cin=(k,lab)=>{const i=el('input',{type:'color',value:CC[k],'aria-label':lab,title:lab});i.addEventListener('change',()=>{CC[k]=i.value;try{localStorage.setItem('liverylab-concept',JSON.stringify(CC));}catch(e){}buildLib();});return el('label',{class:'ccol'},i,el('span',{},lab));};
  const g=el('div',{class:'cgrid'});
  for(const cp of CONCEPTS)g.append(el('button',{class:'cbtn2',title:cp.d,onclick:()=>applyConcept(cp)},conceptPreview(cp),el('b',{},cp.n),el('small',{},cp.d)));
  return el('div',{class:'sec'},el('h3',{},'Concept pronti'),el('p',{class:'note'},'Un clic e la livrea parte da un’idea completa: poi cambi tutto quello che vuoi. Scegli prima i tre colori.'),
    el('div',{class:'row',style:'flex-wrap:wrap'},cin('a','Colore 1'),cin('b','Colore 2'),cin('c','Colore 3'),el('button',{class:'btn sm',title:'Usa i colori della palette da foto o della livrea',onclick:()=>{const src=photoPal.length>=3?photoPal:liveryColors();if(src.length<2){toast('Prima estrai una palette da una foto o usa qualche colore.');return;}CC.a=src[0];CC.b=src[1];CC.c=src[2]||CC.c;try{localStorage.setItem('liverylab-concept',JSON.stringify(CC));}catch(e){}buildLib();}},'Dalla palette')),g);
}
function buildLib(){
  const p=$('#paneB');p.innerHTML='';
  const g=el('div',{class:'grid logos'});
  const fillLogos=()=>{g.innerHTML='';const q=logoQ.trim().toLowerCase();
    for(const it of libItems){if(q&&!it.name.toLowerCase().includes(q))continue;const tb=el('button',{class:'tile',title:'Aggiungi '+it.name+' alla livrea','aria-label':'Aggiungi '+it.name,onclick:()=>addImageBlob(it.blob,it.name)});
      if(!it.url)blobToURL(it.blob).then(u=>{it.url=u;tb.style.backgroundImage=`url(${u})`;});else tb.style.backgroundImage=`url(${it.url})`;
      g.append(el('div',{class:'logo'},tb,el('span',{class:'lname',title:it.name},it.name),
        el('button',{class:'ib x',title:'Togli dalla libreria','aria-label':'Togli '+it.name,onclick:()=>{if(confirm('Tolgo “'+it.name+'” dalla libreria?'))libDel(it.id);}},'✕')));}
    if(!g.childElementCount)g.append(el('p',{class:'note'},q?'Nessun logo con questo nome.':'Ancora nessun logo.'));};
  const ls=el('input',{type:'search',class:'lsearch',placeholder:'Cerca un logo…',value:logoQ,'aria-label':'Cerca un logo'});ls.addEventListener('input',()=>{logoQ=ls.value;fillLogos();});
  fillLogos();
  p.append(el('div',{class:'sec'},el('h3',{},`I tuoi loghi${libItems.length?' ('+libItems.length+')':''}`),
    el('p',{class:'note'},lib?'Ogni logo che importi, trascini o incolli resta qui, salvato nel browser: la prossima volta basta un clic. Per un logo già sulla livrea: proprietà → “Salva nella libreria”.':'In questo browser la libreria non si può salvare: i loghi restano solo per questa sessione.'),
    libItems.length>8?ls:null,g,el('button',{class:'btn sm',style:'margin-top:6px',onclick:()=>$('#fImg').click()},'Carica loghi (PNG trasparenti)')));
  p.append(paletteSec());p.append(graphicSec());p.append(conceptSec());
  const pg=el('div',{class:'grid'});
  for(const [k,n] of PATS.filter(q=>!['none','grad','grad3','image'].includes(q[0]))){const c=mk(96,96),x=c.getContext('2d');x.fillStyle=paintStyle(x,{pat:k,bg:S.act.bg,scale:k==='camo'?.4:1,angle:k==='stripes'?45:0},S.act.color);x.fillRect(0,0,96,96);
    pg.append(el('button',{class:'pt','aria-pressed':String(S.act.pat===k),onclick:()=>{S.act.pat=k;buildOpts();buildLib();toast(`Trama “${n}” attiva per i prossimi riempimenti e forme.`);}},c,n));}
  p.append(el('div',{class:'sec'},el('h3',{},'Trame'),el('p',{class:'note'},'Usano il colore attivo e il colore di fondo scelto nella barra in alto.'),pg,
    el('button',{class:'btn sm',style:'margin-top:8px',onclick:()=>{S.act.pat='none';buildOpts();buildLib();}},'Torna alla tinta unita')));
  const fi=el('input',{type:'file',accept:'.ttf,.otf,.woff,.woff2,font/*',multiple:true,hidden:true});fi.onchange=async()=>{for(const f of fi.files)await addFontFile(f);};
  p.append(el('div',{class:'sec'},el('h3',{},'I tuoi font'),el('p',{class:'note'},'Carica il font del team o di uno sponsor (.ttf, .otf, .woff): resta nel browser come i loghi.'),
    myFonts.length?el('ul',{class:'flist'},...myFonts.map(f=>el('li',{},el('span',{style:`font-family:"${f.name}";font-size:18px`},f.name),el('button',{class:'ib',title:'Togli','aria-label':'Togli '+f.name,onclick:()=>fontDel(f.id)},'✕')))):null,
    fi,el('button',{class:'btn sm',onclick:()=>fi.click()},'Carica un font')));
  const lc=liveryColors();
  p.append(el('div',{class:'sec'},el('h3',{},'Colori di questa livrea'),el('p',{class:'note'},'Tutti i colori che stai usando: un clic e diventa il colore attivo, così riusi esattamente la stessa tinta.'),
    lc.length?el('div',{class:'swatches'},...lc.map(c=>el('button',{class:'sw',style:`background:${c}`,title:c.toUpperCase(),'aria-label':'Usa '+c,onclick:()=>{S.act.color=c;pushRecent(c);buildOpts();toast('Colore attivo: '+c.toUpperCase());}}))):el('p',{class:'note'},'Ancora nessun colore.')));
  const ps=el('div',{class:'swatches'},...photoPal.map(c=>el('button',{class:'sw',style:`background:${c}`,title:c,'aria-label':'Usa '+c,onclick:()=>{S.act.color=c;buildOpts();toast('Colore attivo: '+c);}})));
  p.append(el('div',{class:'sec'},el('h3',{},'Palette da una foto'),el('p',{class:'note'},'Carica una foto di riferimento (una livrea vera, un poster, un paesaggio) e ricavo i suoi colori principali.'),
    photoPal.length?ps:null,el('button',{class:'btn sm',onclick:()=>$('#fPhoto').click()},'Scegli una foto')));
}


/* ================= concept pronti =================
   Funzionano su qualunque auto: usano le trame (che non dipendono dalla forma dei pezzi)
   o i pezzi riconosciuti dal wireframe (carrozzeria principale e dettagli). */
let CC={a:'#C0202B',b:'#1B1D20',c:'#F4F5F0'};try{Object.assign(CC,JSON.parse(localStorage.getItem('liverylab-concept')||'{}'));}catch(e){}
function piecesSplit(){
  if(!LAB||!LAB.iarea)return null;const ids=[];for(let k=1;k<LAB.iarea.length;k++)if(LAB.iarea[k]>=200)ids.push(k);
  ids.sort((a,b)=>LAB.iarea[b]-LAB.iarea[a]);const tot=ids.reduce((s,k)=>s+LAB.iarea[k],0);let acc=0;const main=[],det=[];
  for(const k of ids){(acc<tot*.75?main:det).push(k);acc+=LAB.iarea[k];}
  const seed=k=>{const i=LAB.iseed[k];return{x:(i&4095)+.5,y:(i>>12)+.5};};
  return{main:main.map(seed),det:det.map(seed)};
}
const fullRect=()=>rectPts({x:0,y:0},{x:N,y:N});
function cLayerRect(name,color,paint,opacity=1,extra={}){const l=newShape(fullRect(),false);Object.assign(l,{name:'Concept · '+name,color,paint,opacity},extra);return l;}
function cLayerFill(name,seeds,color,paint,extra={}){return Object.assign({type:'fill',name:'Concept · '+name,mode:'island',seeds,color,paint:paint||{pat:'none',bg:'#1B1D20',scale:1,angle:0},grow:3,edge:{on:false,only:false,color:'#FFFFFF',width:10,pos:'inside'}},extra);}
const P_=(pat,bg,scale=1,angle=0,o={})=>Object.assign({pat,bg,scale,angle},o);
const CONCEPTS=[
  {k:'two',n:'Bicolore',d:'Carrozzeria nel colore 1, dettagli nel colore 2.',pieces:true,make:(c,sp)=>({base:c.a,layers:[cLayerFill('Dettagli',sp.det,c.b)]})},
  {k:'carbon',n:'Carbonio e colore',d:'Tutto in carbonio vero, la carrozzeria principale verniciata.',pieces:true,make:(c,sp)=>({base:'#2b2f36',basePaint:P_('carbon','#0d0f12',1.4),baseMat:'carbon',layers:[cLayerFill('Carrozzeria',sp.main,c.a,null,{mat:'paint'})]})},
  {k:'outline',n:'Contorni',d:'Colore 1 con ogni pezzo bordato nel colore 2.',pieces:true,make:(c,sp)=>({base:c.a,layers:[cLayerFill('Contorni',sp.main.concat(sp.det),c.b,null,{edge:{on:true,only:true,color:c.b,width:14,pos:'inside'}})]})},
  {k:'detcarbon',n:'Dettagli in carbonio',d:'Colore 1 con i pezzi piccoli in carbonio.',pieces:true,make:(c,sp)=>({base:c.a,layers:[cLayerFill('Dettagli carbonio',sp.det,'#3a3f47',P_('carbon','#0d0f12',1),{mat:'carbon'})]})},
  {k:'camo',n:'Mimetico',d:'Macchie nei colori 1 e 2.',make:c=>({base:c.b,basePaint:P_('camo',c.b,3.2),baseColor:c.a})},
  {k:'pixel',n:'Mimetico digitale',d:'Pixel nei colori 1 e 2.',make:c=>({base:c.b,basePaint:P_('pixel',c.b,3),baseColor:c.a})},
  {k:'splinter',n:'Schegge',d:'Schegge geometriche sul colore 2.',make:c=>({base:c.b,layers:[cLayerRect('Schegge',c.a,P_('splinter',c.b,3,20))]})},
  {k:'hex',n:'Esagoni tech',d:'Esagoni del colore 2 sul colore 1.',make:c=>({base:c.a,layers:[cLayerRect('Esagoni',c.b,P_('hex',c.a,4),.55)]})},
  {k:'tiger',n:'Tigrato',d:'Strisce del colore 2 sul colore 1.',make:c=>({base:c.a,layers:[cLayerRect('Tigrato',c.b,P_('tiger',c.a,4,-10))]})},
  {k:'speed',n:'Linee di velocità',d:'Scie del colore 2 sul colore 1.',make:c=>({base:c.a,layers:[cLayerRect('Velocità',c.b,P_('speed',c.a,5))]})},
  {k:'stripes',n:'Righe retrò',d:'Grandi righe diagonali 1 e 3.',make:c=>({base:c.a,layers:[cLayerRect('Righe',c.c,P_('stripes',c.a,10,35))]})},
  {k:'chameleon',n:'Camaleonte',d:'Sfumatura 1 → 3 → 2 su tutta l’auto.',make:c=>({base:c.a,basePaint:P_('grad3','#1B1D20',1,90,{c2:c.b,c3:c.c})})},
  {k:'glitter',n:'Glitter',d:'Metallizzato con scaglie del colore 3.',make:c=>({base:c.a,basePaint:P_('flake',c.a,2),baseColor:c.c})},
  {k:'pinstripe',n:'Gessato',d:'Righine sottili 3 su 1.',make:c=>({base:c.a,basePaint:P_('pin',c.a,2.5),baseColor:c.c})},
  {k:'waves',n:'Onde',d:'Onde del colore 2 sul colore 1.',make:c=>({base:c.a,layers:[cLayerRect('Onde',c.b,P_('waves',c.a,5,-12))]})},
  {k:'veins',n:'Venature',d:'Venature sottili del colore 2 sul colore 1, effetto marmo.',make:c=>({base:c.a,layers:[cLayerRect('Venature',c.b,P_('veins',c.a,3,0))]})},
  {k:'arteries',n:'Arterie',d:'Vasi ramificati del colore 2 sul colore 1.',make:c=>({base:c.a,layers:[cLayerRect('Arterie',c.b,P_('arteries',c.a,3,0))]})},
  {k:'blackgold',n:'Nero e oro',d:'Base nera e ogni pezzo bordato d’oro, come le Hypercar nero-oro.',pieces:true,make:(c,sp)=>({base:'#0b0b0d',layers:[cLayerFill('Bordi oro',sp.main.concat(sp.det),'#c9a24b',null,{edge:{on:true,only:true,color:'#c9a24b',width:10,pos:'inside'}})]})},
  {k:'circuitgold',n:'Circuito oro',d:'Piste di circuito oro sul nero.',make:()=>({base:'#0b0b0d',layers:[cLayerRect('Circuito','#c9a24b',P_('circuit','#0b0b0d',3,0),.9)]})},
  {k:'topo',n:'Topografico',d:'Curve di livello del colore 2 sul colore 1.',make:c=>({base:c.a,layers:[cLayerRect('Topografico',c.b,P_('topo',c.a,4,0),.85)]})},
  {k:'chrome',n:'Metallo',d:'Base metallo spazzolato in Opzione 1 (in LMU scegli Cromo), dettagli nel colore 1.',pieces:true,make:(c,sp)=>({base:'#e3e6ea',basePaint:P_('brushed','#9aa1a9',2),baseMat:'chrome',layers:[cLayerFill('Dettagli',sp.det,c.a,null,{mat:'paint'})]})},
];
function applyConcept(cp){
  const sp=cp.pieces?piecesSplit():null;if(cp.pieces&&!sp){toast('Questo concept usa i pezzi del template: apri prima il PSD.');return;}
  if(S.layers.some(l=>!l.fromTemplate)&&!confirm(`Applico “${cp.n}”: cambia la base e aggiunge i suoi livelli sopra a quelli che hai già. Si annulla con Ctrl+Z.`))return;
  const r=cp.make(CC,sp);
  // con le trame “colore su fondo”, il colore principale è quello della trama e il fondo è la base
  S.base=r.baseColor||r.base;S.basePaint=r.basePaint||{pat:'none',bg:'#1B1D20',scale:1,angle:0};if(r.baseColor)S.basePaint.bg=r.base;if(r.baseMat)S.baseMat=r.baseMat;
  const ti=S.layers.findIndex(x=>x.onTop);let at=ti>=0?ti:S.layers.length;
  for(const l of r.layers||[]){l.id=newId();l.visible=true;l.opacity=l.opacity??1;l.mat=l.mat||'keep';S.layers.splice(at++,0,l);}
  S.sel=null;S.msel=[];commit();refreshAll();toast(`Concept “${cp.n}” applicato: ogni pezzo resta modificabile nei livelli.`,4500);
}
function conceptPreview(cp){
  const c=mk(96,64),x=c.getContext('2d'),sp={main:[],det:[]};let r;try{r=cp.make(CC,sp);}catch(e){r={base:CC.a};}
  const bp=r.basePaint||{pat:'none'},bc=r.baseColor||r.base;x.fillStyle=paintStyle(x,r.baseColor?Object.assign({},bp,{bg:r.base,scale:(bp.scale||1)*.35}):Object.assign({},bp,{scale:(bp.scale||1)*.35}),bc,0,0,{x0:0,y0:0,x1:96,y1:64});x.fillRect(0,0,96,64);
  for(const l of r.layers||[]){x.globalAlpha=l.opacity??1;if(l.type==='shape'){x.fillStyle=paintStyle(x,Object.assign({},l.paint,{scale:(l.paint.scale||1)*.35}),l.color,0,0,{x0:0,y0:0,x1:96,y1:64});x.fillRect(0,0,96,64);}
    else{const e=l.edge&&l.edge.on&&l.edge.only;x.fillStyle=paintStyle(x,Object.assign({},l.paint,{scale:.35}),l.color,0,0,{x0:0,y0:0,x1:96,y1:64});x.strokeStyle=l.edge&&l.edge.on?l.edge.color:l.color;x.lineWidth=3;
      const blocks=cp.k==='two'||cp.k==='detcarbon'||cp.k==='chrome'?[[8,40,18,14],[70,8,18,12],[44,46,14,10]]:[[6,8,52,26],[62,8,28,48],[6,38,52,18]];
      for(const [a,b,w,h] of blocks){if(e)x.strokeRect(a+1.5,b+1.5,w-3,h-3);else x.fillRect(a,b,w,h);}}x.globalAlpha=1;}
  return c;
}

/* analisi del wireframe: pezzi (isole) e pannelli. Le etichette restano anche qui per calcolare i riempimenti */
let WL=null;   // {isl,pan,ver}
function labelTemplate(rgba,prog){
  const t0=performance.now();
  let sum=0;for(let i=0;i<NN*4;i+=4*97)sum+=(rgba[i]+rgba[i+1]+rgba[i+2]);
  const dark=sum/(NN/97*3)<110;
  const st=new Uint8Array(NN),grn=new Uint8Array(NN);
  for(let i=0,p=0;i<NN;i++,p+=4){
    const r=rgba[p],g=rgba[p+1],b=rgba[p+2];
    if(dark){const m=r>g?(r>b?r:b):(g>b?g:b);if(m>40)st[i]=1;}else{if(r+g+b<540)st[i]=1;}
    if(g>r+30&&g>b+30&&g>60)grn[i]=1;
  }
  // se quasi tutte le linee sono verdi (es. Ferrari 499P) il verde non segna i pannelli ma ogni triangolo: lo ignoro
  let nl=0,ng=0;for(let i=0;i<NN;i+=7){if(st[i]===1){nl++;if(grn[i])ng++;}}
  const greenSeams=!(nl&&ng/nl>0.5);if(!greenSeams)grn.fill(0);
  const Q=new Int32Array(NN);
  // 1) sfondo: componenti 4-connesse; quelle che toccano il bordo (o enormi) sono "fuori"
  for(let s=0;s<NN;s++){
    if(st[s]!==0)continue;
    let h=0,t=0,border=false;Q[t++]=s;st[s]=4;
    while(h<t){const i=Q[h++],x=i&4095,y=i>>12;
      if(x===0||y===0||x===N-1||y===N-1)border=true;
      if(x>0&&st[i-1]===0){st[i-1]=4;Q[t++]=i-1;}
      if(x<N-1&&st[i+1]===0){st[i+1]=4;Q[t++]=i+1;}
      if(y>0&&st[i-N]===0){st[i-N]=4;Q[t++]=i-N;}
      if(y<N-1&&st[i+N]===0){st[i+N]=4;Q[t++]=i+N;}}
    const v=(border||t>200000)?2:3;for(let k=0;k<t;k++)st[Q[k]]=v;
  }
  prog('Separo i pezzi…');
  // 2) pezzi (isole) 8-connessi
  const isl=new Uint16Array(NN),ib=[null];let ni=0;
  for(let s=0;s<NN;s++){
    if(isl[s]||!(st[s]===1||st[s]===3))continue;if(ni>=65534)break;ni++;
    let h=0,t=0,x0=N,y0=N,x1=0,y1=0;Q[t++]=s;isl[s]=ni;
    while(h<t){const i=Q[h++],x=i&4095,y=i>>12;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
      for(let dy=-1;dy<=1;dy++){const yy=y+dy;if(yy<0||yy>=N)continue;for(let dx=-1;dx<=1;dx++){const xx=x+dx;if(xx<0||xx>=N)continue;const j=(yy<<12)|xx;if(!isl[j]&&(st[j]===1||st[j]===3)){isl[j]=ni;Q[t++]=j;}}}}
    ib.push([x0,y0,x1,y1]);
  }
  prog('Trovo i pannelli…');
  // 3) pannelli: dentro i pezzi, separati dalle linee verdi
  const pan=new Uint16Array(NN),pb=[null];let np=0;
  for(let s=0;s<NN;s++){
    if(pan[s]||!isl[s]||grn[s])continue;if(np>=65534)break;np++;
    let h=0,t=0,x0=N,y0=N,x1=0,y1=0;Q[t++]=s;pan[s]=np;
    while(h<t){const i=Q[h++],x=i&4095,y=i>>12;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
      if(x>0&&!pan[i-1]&&isl[i-1]&&!grn[i-1]){pan[i-1]=np;Q[t++]=i-1;}
      if(x<N-1&&!pan[i+1]&&isl[i+1]&&!grn[i+1]){pan[i+1]=np;Q[t++]=i+1;}
      if(y>0&&!pan[i-N]&&isl[i-N]&&!grn[i-N]){pan[i-N]=np;Q[t++]=i-N;}
      if(y<N-1&&!pan[i+N]&&isl[i+N]&&!grn[i+N]){pan[i+N]=np;Q[t++]=i+N;}}
    pb.push([x0,y0,x1,y1]);
  }
  // pannelli minuscoli (frammenti tra le linee, es. Cadillac): li svuoto e li faccio assorbire dal pannello vicino
  // (solo se nello stesso pezzo c'è un pannello vero che li può assorbire)
  const MINP=300,area=new Uint32Array(np+1),pIsl=new Uint16Array(np+1);for(let i=0;i<NN;i++){const v=pan[i];if(v){area[v]++;pIsl[v]=isl[i];}}
  const iMax=new Uint32Array(ni+1);for(let k=1;k<=np;k++)if(area[k]>iMax[pIsl[k]])iMax[pIsl[k]]=area[k];
  const drop=new Uint8Array(np+1);let small=0;for(let k=1;k<=np;k++)if(area[k]<MINP&&iMax[pIsl[k]]>=MINP){drop[k]=1;small++;}
  if(small)for(let i=0;i<NN;i++){if(drop[pan[i]])pan[i]=0;}
  // le linee verdi (e i frammenti) vanno al pannello vicino dello stesso pezzo
  // (a onde: si parte dai pixel liberi che toccano un pannello e si avanza di un pixel per volta, al massimo 60)
  {const mark=new Uint8Array(NN);let cur=new Int32Array(1<<16),nc=0;
    const push=(i)=>{if(nc>=cur.length){const t=new Int32Array(cur.length*2);t.set(cur);cur=t;}cur[nc++]=i;};
    const nb=(i)=>{const x=i&4095,y=i>>12,s=isl[i];
      if(x>0&&pan[i-1]&&isl[i-1]===s)return pan[i-1];if(x<N-1&&pan[i+1]&&isl[i+1]===s)return pan[i+1];
      if(y>0&&pan[i-N]&&isl[i-N]===s)return pan[i-N];if(y<N-1&&pan[i+N]&&isl[i+N]===s)return pan[i+N];return 0;};
    for(let i=0;i<NN;i++)if(!pan[i]&&isl[i]&&nb(i)){mark[i]=1;push(i);}
    for(let pass=0;pass<60&&nc;pass++){
      const list=cur.slice(0,nc),val=new Uint16Array(nc);nc=0;
      for(let k=0;k<list.length;k++)val[k]=nb(list[k]);   // prima leggo tutti i vicini, poi assegno: avanzano tutti insieme
      for(let k=0;k<list.length;k++){const i=list[k],v=val[k];if(!v)continue;pan[i]=v;const x=i&4095,y=i>>12,b=pb[v];if(x<b[0])b[0]=x;if(x>b[2])b[2]=x;if(y<b[1])b[1]=y;if(y>b[3])b[3]=y;}
      for(let k=0;k<list.length;k++){const i=list[k],x=i&4095,y=i>>12,s=isl[i];
        if(x>0&&!pan[i-1]&&!mark[i-1]&&isl[i-1]===s){mark[i-1]=1;push(i-1);}if(x<N-1&&!pan[i+1]&&!mark[i+1]&&isl[i+1]===s){mark[i+1]=1;push(i+1);}
        if(y>0&&!pan[i-N]&&!mark[i-N]&&isl[i-N]===s){mark[i-N]=1;push(i-N);}if(y<N-1&&!pan[i+N]&&!mark[i+N]&&isl[i+N]===s){mark[i+N]=1;push(i+N);}}}}
  // area e un punto interno di ogni pezzo: servono ai concept pronti
  const iarea=new Uint32Array(ni+1),iseed=new Int32Array(ni+1).fill(-1);for(let i=0;i<NN;i++){const v=isl[i];if(v){iarea[v]++;if(iseed[v]<0)iseed[v]=i;}}
  np-=small;
  return{isl,pan,ib,pb,iarea,iseed,seams:greenSeams&&ng>0,ni,np,ms:performance.now()-t0};
}


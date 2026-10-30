/* ================= trame ================= */
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function mix(a,b,t){const A=parseInt(a.slice(1),16),B=parseInt(b.slice(1),16);const r=Math.round((A>>16&255)*(1-t)+(B>>16&255)*t),g=Math.round((A>>8&255)*(1-t)+(B>>8&255)*t),bl=Math.round((A&255)*(1-t)+(B&255)*t);return'#'+((1<<24)|(r<<16)|(g<<8)|bl).toString(16).slice(1);}
const tileCache={};
function patTile(type,fg,bg){
  const key=type+fg+bg;if(tileCache[key])return tileCache[key];
  let c,x;
  if(type==='carbon'){
    c=mk(32,32);x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,32,32);
    for(let i=0;i<4;i++)for(let j=0;j<4;j++){
      const hor=((i+j)%4)<2, px=i*8, py=j*8;
      const g=hor?x.createLinearGradient(px,py,px,py+8):x.createLinearGradient(px,py,px+8,py);
      g.addColorStop(0,mix(fg,bg,.55));g.addColorStop(.5,fg);g.addColorStop(1,mix(fg,bg,.55));
      x.fillStyle=g;x.fillRect(px+.5,py+.5,7,7);
    }
  }else if(type==='stripes'){c=mk(64,64);x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,64,64);x.fillStyle=fg;x.fillRect(0,0,32,64);}
  else if(type==='checker'){c=mk(64,64);x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,64,64);x.fillStyle=fg;x.fillRect(0,0,32,32);x.fillRect(32,32,32,32);}
  else if(type==='dots'){c=mk(48,48);x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,48,48);x.fillStyle=fg;for(const [a,b] of [[0,0],[48,0],[0,48],[48,48],[24,24]]){x.beginPath();x.arc(a,b,9,0,7);x.fill();}}
  else if(type==='chevron'){c=mk(64,32);x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,64,32);x.strokeStyle=fg;x.lineWidth=9;x.lineJoin='miter';for(const oy of [-32,0,32]){x.beginPath();x.moveTo(-8,20+oy);x.lineTo(0,16+oy);x.lineTo(32,0+oy);x.lineTo(64,16+oy);x.lineTo(72,20+oy);x.stroke();}}
  else if(type==='hex'){
    const r=16,w=3*r,h=Math.round(Math.sqrt(3)*r);c=mk(w,h);x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,w,h);x.strokeStyle=fg;x.lineWidth=3;
    const hx=(cx,cy)=>{x.beginPath();for(let k=0;k<6;k++){const a=Math.PI/3*k;x.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));}x.closePath();x.stroke();};
    for(const [a,b] of [[0,0],[w,0],[0,h],[w,h],[1.5*r,h/2],[1.5*r,-h/2],[1.5*r,1.5*h]])hx(a,b);
  }else if(type==='camo'){
    c=mk(256,256);x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,256,256);const R=rng(7),mid=mix(fg,bg,.5);
    for(const col of [mid,fg]){for(let k=0;k<14;k++){const cx=R()*256,cy=R()*256,rr=18+R()*34;x.fillStyle=col;
      for(const ox of [-256,0,256])for(const oy of [-256,0,256]){x.beginPath();for(let a=0;a<12;a++){const t=a/12*Math.PI*2,q=rr*(0.65+R()*0.6);x.lineTo(cx+ox+Math.cos(t)*q*1.4,cy+oy+Math.sin(t)*q);}x.closePath();x.fill();}}}
  }else if(type==='pin'){c=mk(48,48);x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,48,48);x.fillStyle=fg;x.fillRect(0,0,3,48);}
  else if(type==='grid'){c=mk(48,48);x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,48,48);x.fillStyle=fg;x.fillRect(0,0,48,3);x.fillRect(0,0,3,48);}
  else if(type==='zigzag'){c=mk(48,32);x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,48,32);x.strokeStyle=fg;x.lineWidth=6;x.lineJoin='miter';for(const oy of [-16,16,48]){x.beginPath();x.moveTo(-12,oy+8);x.lineTo(0,oy-4);x.lineTo(24,oy+20);x.lineTo(48,oy-4);x.lineTo(60,oy+8);x.stroke();}}
  else if(type==='waves'){c=mk(96,40);x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,96,40);x.strokeStyle=fg;x.lineWidth=7;for(const oy of [0,40]){x.beginPath();for(let i=0;i<=96;i+=2)x.lineTo(i,oy+Math.sin(i/96*Math.PI*2)*9);x.stroke();}x.beginPath();for(let i=0;i<=96;i+=2)x.lineTo(i,20+Math.sin(i/96*Math.PI*2)*9);x.stroke();}
  else if(type==='tri'){c=mk(64,56);x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,64,56);x.fillStyle=fg;const t=(a,b,d)=>{x.beginPath();x.moveTo(a,b);x.lineTo(a+32,b);x.lineTo(a+16,b+d);x.closePath();x.fill();};for(const ox of [-32,0,32,64]){t(ox,0,28);t(ox+16,28,28);}}
  else if(type==='splinter'){c=mk(256,256);x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,256,256);const R=rng(11),mid=mix(fg,bg,.45);
    for(const col of [mid,fg])for(let k=0;k<16;k++){const cx=R()*256,cy=R()*256,a=R()*Math.PI,l=40+R()*90,w=8+R()*22;x.fillStyle=col;
      for(const ox of [-256,0,256])for(const oy of [-256,0,256]){x.beginPath();x.moveTo(cx+ox+Math.cos(a)*l,cy+oy+Math.sin(a)*l);x.lineTo(cx+ox+Math.cos(a+1.7)*w,cy+oy+Math.sin(a+1.7)*w);x.lineTo(cx+ox-Math.cos(a)*l*.7,cy+oy-Math.sin(a)*l*.7);x.lineTo(cx+ox+Math.cos(a-1.4)*w*1.3,cy+oy+Math.sin(a-1.4)*w*1.3);x.closePath();x.fill();}}}
  else if(type==='pixel'){c=mk(128,128);x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,128,128);const R=rng(5),mid=mix(fg,bg,.5);for(let i=0;i<16;i++)for(let j=0;j<16;j++){const v=R();if(v<.32){x.fillStyle=v<.14?fg:mid;x.fillRect(i*8,j*8,8,8);}}
    for(let k=0;k<10;k++){const i=Math.floor(R()*14),j=Math.floor(R()*14);x.fillStyle=fg;x.fillRect(i*8,j*8,16+8*Math.floor(R()*2),8);}}
  else if(type==='tiger'){c=mk(192,192);x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,192,192);const R=rng(3);x.fillStyle=fg;
    for(let k=0;k<11;k++){const y=k*17.5+R()*6,len=60+R()*90,x0=R()*192,th=5+R()*7;for(const ox of [-192,0,192])for(const oy of [-192,0,192]){x.beginPath();x.moveTo(x0+ox,y+oy);x.quadraticCurveTo(x0+ox+len*.5,y+oy-th*2.2,x0+ox+len,y+oy+th*.4);x.quadraticCurveTo(x0+ox+len*.5,y+oy+th,x0+ox,y+oy);x.fill();}}}
  else if(type==='scales'){c=mk(48,48);x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,48,48);x.strokeStyle=fg;x.lineWidth=3;for(const [a,b] of [[0,0],[48,0],[24,24],[0,48],[48,48],[24,-24]]){x.beginPath();x.arc(a,b+24,24,Math.PI,2*Math.PI);x.stroke();}}
  else if(type==='diamond'){c=mk(48,48);x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,48,48);x.fillStyle=fg;x.beginPath();x.moveTo(24,2);x.lineTo(46,24);x.lineTo(24,46);x.lineTo(2,24);x.closePath();x.fill();}
  else if(type==='flake'){c=mk(128,128);x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,128,128);const R=rng(9);for(let k=0;k<900;k++){x.fillStyle=mix(fg,bg,R()*.8);x.globalAlpha=.5+R()*.5;x.fillRect(R()*128,R()*128,1+R()*2,1+R()*2);}x.globalAlpha=1;}
  else if(type==='brushed'){c=mk(256,64);x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,256,64);const R=rng(13);for(let k=0;k<160;k++){x.strokeStyle=mix(fg,bg,R());x.globalAlpha=.25+R()*.35;x.lineWidth=.6+R();const y=R()*64;x.beginPath();x.moveTo(0,y);x.lineTo(256,y+(R()-.5)*1.5);x.stroke();}x.globalAlpha=1;}
  else if(type==='speed'){c=mk(256,96);x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,256,96);const R=rng(17);x.fillStyle=fg;for(let k=0;k<9;k++){const y=k*10.7+R()*4,x0=R()*256,l=60+R()*150,th=2+R()*5;for(const ox of [-256,0,256]){x.beginPath();x.moveTo(x0+ox,y);x.lineTo(x0+ox+l,y+th/2);x.lineTo(x0+ox,y+th);x.closePath();x.fill();}}}
  else if(type==='veins'||type==='arteries'){
    // tessera grande e ripetibile: ogni tratto si disegna anche spostato di ±T, così ai bordi si richiude senza giunture
    const T=512;c=mk(T,T);x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,T,T);x.lineCap='round';x.lineJoin='round';
    const segs=[],R=rng(type==='veins'?21:33);
    const wrapStroke=(pts,w,col)=>{x.strokeStyle=col;x.lineWidth=w;for(const ox of [-T,0,T])for(const oy of [-T,0,T]){x.beginPath();x.moveTo(pts[0][0]+ox,pts[0][1]+oy);for(let i=1;i<pts.length;i++)x.lineTo(pts[i][0]+ox,pts[i][1]+oy);x.stroke();}};
    if(type==='veins'){
      // venature: linee che serpeggiano, più spesse all'inizio, con qualche ramo sottile
      const walk=(x0,y0,a,n,w0,depth)=>{let px=x0,py=y0,pts=[[px,py]];for(let i=0;i<n;i++){a+=(R()-.5)*.55;px+=Math.cos(a)*6;py+=Math.sin(a)*6;pts.push([px,py]);
        if(depth<2&&R()<.018)walk(px,py,a+(R()<.5?1:-1)*(.5+R()*.6),Math.floor(n*(.25+R()*.3)),w0*.55,depth+1);}
        for(let k=0;k<4;k++){const a0=Math.floor(k*pts.length/4),a1=Math.floor((k+1)*pts.length/4)+1;segs.push([pts.slice(a0,a1),Math.max(.6,w0*(1-k*.22))]);}};
      for(let k=0;k<6;k++)walk(R()*T,R()*T,R()*Math.PI*2,110+Math.floor(R()*120),2.6+R()*2.8,0);
      // alone morbido: disegnato a parte e sfocato una volta sola (sfocare ogni tratto era lentissimo)
      const g=mk(T,T),gx=g.getContext('2d'),main=x;x=gx;x.lineCap='round';x.lineJoin='round';for(const [pts,w] of segs)wrapStroke(pts,w*2.6,mix(fg,bg,.55));
      x=main;const g3=mk(3*T,3*T),g3x=g3.getContext('2d');for(let i=0;i<3;i++)for(let j=0;j<3;j++)g3x.drawImage(g,i*T,j*T);
      x.save();x.filter='blur(3px)';x.drawImage(g3,-T,-T);x.restore();
      for(const [pts,w] of segs)wrapStroke(pts,w,fg);
    }else{
      // arterie: vasi che si dividono in due e si assottigliano, con un bordo più scuro e un riflesso al centro
      const branch=(px,py,a,w,depth)=>{if(w<1.3||depth>7)return;const n=4+Math.floor(R()*5),pts=[[px,py]];
        for(let i=0;i<n;i++){a+=(R()-.5)*.35;px+=Math.cos(a)*(7+w*1.4);py+=Math.sin(a)*(7+w*1.4);pts.push([px,py]);}
        segs.push([pts,w]);const k=R()<.75?2:1;for(let j=0;j<k;j++)branch(px,py,a+(k===1?(R()-.5)*.4:(j?1:-1)*(.3+R()*.45)),w*(k===1?.85:.62+R()*.12),depth+1);};
      for(let k=0;k<3;k++)branch(R()*T,R()*T,R()*Math.PI*2,10+R()*6,0);
      for(const [pts,w] of segs)wrapStroke(pts,w*1.45,mix(fg,'#000000',.35));
      for(const [pts,w] of segs)wrapStroke(pts,w,fg);
      for(const [pts,w] of segs)if(w>2.5)wrapStroke(pts,w*.28,mix(fg,'#ffffff',.45));
    }
  }
  else if(type==='circuit'){
    // piste di circuito stampato: tratti dritti e a 45°, con le piazzole alla fine
    const T=512,G=16;c=mk(T,T);x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,T,T);x.lineCap='round';x.lineJoin='round';const R=rng(41),D=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
    const paths=[];for(let k=0;k<26;k++){let gx=Math.floor(R()*32),gy=Math.floor(R()*32),d=Math.floor(R()*4)*2;const pts=[[gx*G,gy*G]];const segs=2+Math.floor(R()*4);
      for(let i=0;i<segs;i++){const n=1+Math.floor(R()*5);gx+=D[d][0]*n;gy+=D[d][1]*n;pts.push([gx*G,gy*G]);d=(d+(R()<.5?1:7))%8;}paths.push([pts,R()<.3?5:3]);}
    const W=(f)=>{for(const ox of [-T,0,T])for(const oy of [-T,0,T])f(ox,oy);};
    for(const [pts,w] of paths){x.strokeStyle=fg;x.lineWidth=w;W((ox,oy)=>{x.beginPath();pts.forEach(([a,b],i)=>i?x.lineTo(a+ox,b+oy):x.moveTo(a+ox,b+oy));x.stroke();});
      for(const q of [pts[0],pts[pts.length-1]])W((ox,oy)=>{x.beginPath();x.arc(q[0]+ox,q[1]+oy,6,0,7);x.fillStyle=bg;x.fill();x.lineWidth=3;x.stroke();});}
    for(let k=0;k<10;k++){const a=Math.floor(R()*30)*G,b=Math.floor(R()*30)*G;x.fillStyle=fg;W((ox,oy)=>{x.fillRect(a+ox-5,b+oy-5,10,10);});}
  }
  else if(type==='topo'){
    // curve di livello: anelli concentrici deformati attorno ad alcuni centri, come una mappa topografica
    const T=512;c=mk(T,T);x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,T,T);x.strokeStyle=fg;x.lineWidth=2.2;const R=rng(57);
    for(let k=0;k<5;k++){const cx=R()*T,cy=R()*T,ph=R()*6,ph2=R()*6,a1=.1+R()*.12,a2=.05+R()*.08;
      for(let r=12;r<150+R()*80;r+=12){for(const ox of [-T,0,T])for(const oy of [-T,0,T]){x.beginPath();for(let i=0;i<=72;i++){const t=i/72*Math.PI*2,rr=r*(1+a1*Math.sin(3*t+ph+r*.02)+a2*Math.sin(5*t+ph2));x.lineTo(cx+ox+Math.cos(t)*rr,cy+oy+Math.sin(t)*rr*.8);}x.stroke();}}}
  }
  else{c=mk(8,8);x=c.getContext('2d');x.fillStyle=fg;x.fillRect(0,0,8,8);}
  tileCache[key]=c;return c;
}
function isGrad(p){return !!p&&(p.pat==='grad'||p.pat==='grad3');}
function paintStyle(ctx,p,color,dx=0,dy=0,bb=null){
  if(!p||p.pat==='none'||!p.pat)return color;
  if(isGrad(p)){
    if(!bb)return color;
    const cx=(bb.x0+bb.x1)/2+dx,cy=(bb.y0+bb.y1)/2+dy,a=(p.angle||0)*Math.PI/180,c=Math.cos(a),sn=Math.sin(a),half=Math.abs((bb.x1-bb.x0)/2*c)+Math.abs((bb.y1-bb.y0)/2*sn)||1;
    const g=ctx.createLinearGradient(cx-c*half,cy-sn*half,cx+c*half,cy+sn*half);
    g.addColorStop(0,color);if(p.pat==='grad3')g.addColorStop(.5,p.c3||'#C9A24B');g.addColorStop(1,p.c2||'#006B3C');return g;
  }
  if(p.pat==='image'&&!(p.img&&images[p.img]))return color;
  const pat=ctx.createPattern(p.pat==='image'?images[p.img].img:patTile(p.pat,color,p.bg||'#000000'),'repeat');
  pat.setTransform(new DOMMatrix().translateSelf(dx,dy).rotateSelf(p.angle||0).scaleSelf(p.scale||1));
  return pat;
}


/* ================= geometria ================= */
function shapePath(l){
  if(l.parts){const p=new Path2D();let o=0;for(const k of l.parts){addPoly(p,l.pts.slice(o,o+k),l);o+=k;}return p;}
  const p=new Path2D();addPoly(p,l.pts,l);return p;
}
function addPoly(p,pts,l){
  const n=pts.length;if(n<2)return p;
  if(!l.smooth){p.moveTo(pts[0].x,pts[0].y);for(let i=1;i<n;i++)p.lineTo(pts[i].x,pts[i].y);if(l.closed!==false)p.closePath();return p;}
  const closed=l.closed!==false,get=i=>pts[closed?((i%n)+n)%n:clamp(i,0,n-1)],t=l.tension??0.5;
  p.moveTo(pts[0].x,pts[0].y);
  for(let i=0;i<(closed?n:n-1);i++){
    const p0=get(i-1),p1=get(i),p2=get(i+1),p3=get(i+2);
    p.bezierCurveTo(p1.x+(p1.c?0:(p2.x-p0.x)*t/3),p1.y+(p1.c?0:(p2.y-p0.y)*t/3),p2.x-(p2.c?0:(p3.x-p1.x)*t/3),p2.y-(p2.c?0:(p3.y-p1.y)*t/3),p2.x,p2.y);
  }
  if(closed)p.closePath();return p;
}
function bbox(pts){let a=1e9,b=1e9,c=-1e9,d=-1e9;for(const p of pts){a=Math.min(a,p.x);b=Math.min(b,p.y);c=Math.max(c,p.x);d=Math.max(d,p.y);}return{x0:a,y0:b,x1:c,y1:d};}
const mirrorY=y=>2*S.axis-y;


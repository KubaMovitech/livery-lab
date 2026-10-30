/* ================= lettura dei file PSD e livelli in pixel ================= */
function readPSD(buf){
  const dv=new DataView(buf),u8=new Uint8Array(buf);let o=0;
  const U8=()=>u8[o++],U16=()=>{const v=dv.getUint16(o);o+=2;return v;},I16=()=>{const v=dv.getInt16(o);o+=2;return v;},U32=()=>{const v=dv.getUint32(o);o+=4;return v;},I32=()=>{const v=dv.getInt32(o);o+=4;return v;};
  const sig=String.fromCharCode(...u8.slice(0,4));if(sig!=='8BPS')throw new Error('non è un file PSD');
  o=4;const ver=U16();if(ver!==1)throw new Error('i file PSB (grandi) non sono supportati, salva come PSD');
  o=12;const ch=U16(),H=U32(),W=U32(),depth=U16(),mode=U16();
  if(depth!==8)throw new Error(`il PSD è a ${depth} bit: salvalo a 8 bit per canale`);
  if(mode!==3)throw new Error('il PSD deve essere in modalità RGB');
  {const cm=U32();o+=cm;}{const irl=U32();o+=irl;}
  const lmLen=U32(),lmEnd=o+lmLen;const liLen=U32();let cnt=Math.abs(I16());
  const L=[];
  for(let i=0;i<cnt;i++){
    const top=I32(),left=I32(),bottom=I32(),right=I32(),nch=U16(),chans=[];
    for(let k=0;k<nch;k++)chans.push({id:I16(),len:U32()});
    o+=4;const blend=String.fromCharCode(u8[o],u8[o+1],u8[o+2],u8[o+3]);o+=4;
    const opacity=U8(),clip=U8(),flags=U8();o+=1;
    const exLen=U32(),exEnd=o+exLen;
    const mLen=U32();let mask=null;if(mLen>=20){const mt=dv.getInt32(o),ml=dv.getInt32(o+4),mb=dv.getInt32(o+8),mr=dv.getInt32(o+12);mask={top:mt,left:ml,bottom:mb,right:mr,dc:u8[o+16],flags:u8[o+17]};}o+=mLen;
    {const brl=U32();o+=brl;}
    const nl=u8[o];let name=new TextDecoder('latin1').decode(u8.slice(o+1,o+1+nl));o+=Math.ceil((nl+1)/4)*4;
    let sect=null,soco=null,adjust=false;
    while(o+12<=exEnd){
      const key=String.fromCharCode(u8[o+4],u8[o+5],u8[o+6],u8[o+7]),len=dv.getUint32(o+8),d=o+12;
      if(key==='luni'){const n=dv.getUint32(d);let s='';for(let k=0;k<n;k++)s+=String.fromCharCode(dv.getUint16(d+4+2*k));name=s.replace(/\0+$/,'');}
      else if(key==='lsct'||key==='lsdk')sect=dv.getUint32(d);
      else if(key==='SoCo'){const blk=u8.subarray(d,d+len),find=t=>{const tt=[...t].map(c=>c.charCodeAt(0));outer:for(let j=0;j<blk.length-tt.length;j++){for(let q=0;q<tt.length;q++)if(blk[j+q]!==tt[q])continue outer;return j;}return -1;};
        const rd=k=>{const j=find(k);return j<0?0:Math.round(new DataView(buf,d+j+8,8).getFloat64(0));};soco=[rd('Rd  doub'),rd('Grn doub'),rd('Bl  doub')];}
      else if(['levl','curv','hue2','brit','blnc','vibA','selc','mixr','grdm','phfl','expA','post','thrs','nvrt','clrL'].includes(key))adjust=true;
      o=d+len;
    }
    o=exEnd;
    L.push({name,top,left,bottom,right,chans,blend,opacity,clip,hidden:!!(flags&2),mask,sect,soco,adjust,data:{}});
  }
  for(const l of L){
    for(const c of l.chans){
      const start=o,comp=dv.getUint16(o);
      let w,h;if(c.id===-2&&l.mask){w=l.mask.right-l.mask.left;h=l.mask.bottom-l.mask.top;}else{w=l.right-l.left;h=l.bottom-l.top;}
      if(w>0&&h>0&&c.id>=-2){
        if(comp===0)l.data[c.id]=u8.slice(o+2,o+2+w*h);
        else if(comp===1){const out=new Uint8Array(w*h);let p=o+2+2*h;
          for(let y=0;y<h;y++){const end=p+dv.getUint16(o+2+2*y);let q=y*w;const qe=q+w;
            while(p<end){const n=u8[p++];if(n<128){const m=n+1;out.set(u8.subarray(p,p+Math.min(m,qe-q)),q);q+=m;p+=m;}else if(n>128){const m=257-n,v=u8[p++];out.fill(v,q,Math.min(q+m,qe));q+=m;}}}
          l.data[c.id]=out;}
        else l.unsupported=true;
      }
      o=start+c.len;
    }
  }
  // gruppi: i record vanno dal basso verso l'alto; risalgo dall'alto per costruire i percorsi
  const stack=[],groups={};
  for(let i=L.length-1;i>=0;i--){const l=L[i];
    if(l.sect===1||l.sect===2){l.isGroup=true;l.path=stack.map(g=>g.name);l.groupHidden=stack.some(g=>g.hidden);
      const g={id:'g'+i,name:l.name,hidden:l.hidden,parent:stack.length?stack[stack.length-1].id:null};groups[g.id]=g;stack.push(g);continue;}
    if(l.sect===3){l.isDivider=true;stack.pop();continue;}
    l.path=stack.map(g=>g.name);l.gids=stack.map(g=>g.id);l.groupHidden=stack.some(g=>g.hidden);}
  return{W,H,layers:L,groups};
}
function layerRGBA(l){
  const w=l.right-l.left,h=l.bottom-l.top;if(w<=0||h<=0||!l.data[0])return null;
  const r=l.data[0],g=l.data[1]||r,b=l.data[2]||r,a=l.data[-1],m=l.data[-2],mk_=l.mask,out=new Uint8ClampedArray(w*h*4);
  const useMask=mk_&&!(mk_.flags&2),mw=mk_?mk_.right-mk_.left:0;
  if(!useMask){const n=w*h,o32=new Uint32Array(out.buffer);
    if(a){for(let i=0;i<n;i++)o32[i]=(a[i]<<24|b[i]<<16|g[i]<<8|r[i])>>>0;}else{for(let i=0;i<n;i++)o32[i]=(0xFF000000|b[i]<<16|g[i]<<8|r[i])>>>0;}
    return{w,h,rgba:out};}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x,q=i*4;out[q]=r[i];out[q+1]=g[i];out[q+2]=b[i];let al=a?a[i]:255;
    if(useMask){const ax=x+l.left,ay=y+l.top;let mv=mk_.dc;if(m&&ax>=mk_.left&&ax<mk_.right&&ay>=mk_.top&&ay<mk_.bottom)mv=m[(ay-mk_.top)*mw+(ax-mk_.left)];al=al*mv/255;}
    out[q+3]=al;}
  return{w,h,rgba:out};
}
function baseColorOf(l){
  const w=l.right-l.left,h=l.bottom-l.top;
  if(l.left>0||l.top>0||l.right<N*.99||l.bottom<N*.99)return null;
  if(l.soco)return l.soco;
  const r=l.data[0],g=l.data[1]||r,b=l.data[2]||r,a=l.data[-1];if(!r||w<=0||h<=0)return null;
  const n=w*h,c=[r[0],g[0],b[0]];
  for(let i=0;i<n;i+=1013){if(Math.abs(r[i]-c[0])>2||Math.abs(g[i]-c[1])>2||Math.abs(b[i]-c[2])>2||(a&&a[i]<250))return null;}
  return c;
}

/* ================= base: utilità comuni, misure dei tempi, client del Web Worker ================= */
const N=4096, NN=N*N;
const $=(s,r=document)=>r.querySelector(s);
const el=(t,a={},...c)=>{const e=document.createElement(t);for(const k in a){const v=a[k];if(k==='class')e.className=v;else if(k==='style')e.style.cssText=v;else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);else if(v!==false&&v!=null)e.setAttribute(k,v===true?'':v);}for(const x of c.flat()){if(x==null||x===false)continue;e.append(x.nodeType?x:document.createTextNode(x));}return e;};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const tick=()=>new Promise(r=>setTimeout(r,20));
/* misure dei tempi delle operazioni pesanti (Documento → Prestazioni) */
const PERF=[];
function perfLog(name,ms,extra){PERF.push({name,ms:Math.round(ms),extra:extra||'',t:Date.now()});if(PERF.length>300)PERF.shift();}
const pnow=()=>performance.now();
let WK=null,wkMode='',wkSeq=0;const WJ=new Map();
function wkHandle(e){const m=e.data,j=WJ.get(m.id);if(!j)return;if(m.prog){if(j.onProg)j.onProg(m.prog);return;}WJ.delete(m.id);if(m.err)j.rej(new Error(m.err));else j.res(m.res);}
function wkLocal(){
  const inner={postMessage:m=>setTimeout(()=>wkHandle({data:m}),0),onmessage:null};
  new Function('self',document.getElementById('wkSrc').textContent)(inner);wkMode='thread principale (worker non disponibile)';
  return{postMessage:m=>setTimeout(()=>inner.onmessage({data:m}),0)};
}
const wkReady=new Promise(res=>{
  const local=()=>{WK=wkLocal();res();};
  try{const w=new Worker(URL.createObjectURL(new Blob([document.getElementById('wkSrc').textContent],{type:'text/javascript'})));
    const to=setTimeout(()=>{w.terminate();local();},4000);
    w.onmessage=e=>{if(e.data&&e.data.id===0){clearTimeout(to);WK=w;wkMode='Web Worker';w.onmessage=wkHandle;res();}};
    w.onerror=e=>{e.preventDefault();clearTimeout(to);w.terminate();local();};
    w.postMessage({id:0,op:'ping'});
  }catch(e){local();}
});
async function wcall(op,a,transfer,onProg){await wkReady;const id=++wkSeq;return new Promise((res,rej)=>{WJ.set(id,{res,rej,onProg});WK.postMessage({id,op,a},transfer||[]);});}
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,w);c.height=Math.max(1,h);return c;};


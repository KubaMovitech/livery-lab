// Controlla che i moduli isolati (src/modules/*.js) usino solo quello che ricevono (use, live), i propri nomi
// e le API del browser. Un nome sconosciuto vuol dire una dipendenza nascosta da un altro modulo.
//   node tools/check-modules.js        (serve: npm i -D espree eslint-scope)
const fs=require('fs'),path=require('path');
let espree,escope;try{espree=require('espree');escope=require('eslint-scope');}
catch(e){console.error('Servono espree ed eslint-scope: npm i -D espree eslint-scope');process.exit(2);}
// API del browser e di JavaScript usate dai moduli: se ne serve un'altra, aggiungila qui
const BROWSER=new Set(`window document navigator performance localStorage console setTimeout clearTimeout setInterval clearInterval
requestAnimationFrame cancelAnimationFrame requestIdleCallback ResizeObserver URL Blob File FileReader Image ImageData Path2D DOMMatrix
OffscreenCanvas HTMLCanvasElement CompressionStream DecompressionStream Response TextEncoder TextDecoder DataView ArrayBuffer
Uint8Array Uint8ClampedArray Uint16Array Uint32Array Int32Array Float32Array Float64Array Map Set WeakMap Promise JSON Math Number
String Object Array Date Error RegExp Symbol Infinity NaN isNaN isFinite parseInt parseFloat confirm prompt alert getComputedStyle
structuredClone queueMicrotask indexedDB caches claude devicePixelRatio matchMedia LL_MODULES undefined globalThis`.split(/\s+/));
const dir=path.resolve(__dirname,'..','src','modules');let bad=0;
for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.js'))){
  const src=fs.readFileSync(path.join(dir,f),'utf8');
  const ast=espree.parse(src,{ecmaVersion:2022,range:true,loc:true});
  const sm=escope.analyze(ast,{ecmaVersion:2022});
  const unknown=new Map();
  for(const r of sm.globalScope.through){const n=r.identifier.name;if(!BROWSER.has(n))(unknown.get(n)||unknown.set(n,[]).get(n)).push(r.identifier.loc.start.line);}
  if(unknown.size){bad++;console.log(`${f}: nomi non ricevuti (aggiungili a use/live nel collegamento in src/app/):`);
    for(const [n,ls] of unknown)console.log(`  ${n}  (righe ${ls.slice(0,5).join(', ')}${ls.length>5?'…':''})`);}
  else console.log(`${f}: isolato`);
}
process.exit(bad?1:0);

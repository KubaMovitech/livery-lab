// Prova rapida dell'app ricostruita su un template vero (i template non sono nel repository: sono nella cartella di LMU).
//   node tools/smoke.js "<percorso>/Template_….psd"
// Apre index.html in Chromium (Playwright), apre il template, applica il concept “Nero e oro”, esporta i due TGA
// e stampa i tempi misurati dall'app. Esce con 1 se qualcosa non va.
const path=require('path');
let pw;try{pw=require('playwright');}catch(e){console.error('Serve Playwright: npm i -D playwright');process.exit(2);}
const psd=process.argv[2];if(!psd){console.error('uso: node tools/smoke.js <template.psd>');process.exit(2);}
(async()=>{
  const b=await pw.chromium.launch(),p=await b.newPage({viewport:{width:1500,height:900}}),errs=[];
  p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  await p.route(/raw\.githubusercontent\.com/,r=>r.abort());
  await p.goto('file://'+path.resolve(__dirname,'..','index.html'));await p.waitForTimeout(1000);
  if(await p.isVisible('#mNews'))await p.click('#newsClose');
  await p.setInputFiles('#fTpl',path.resolve(psd));
  await p.waitForFunction(()=>document.querySelector('#busy').hidden&&window.__LL.S.tplName&&window.__LL.LAB,null,{timeout:300000});
  await p.locator('#guide button',{hasText:'Nero e oro'}).click();
  const r=await p.evaluate(async()=>{const L=window.__LL,l=L.S.layers.find(l=>!l.fromTemplate);if(l){l.mat='chrome';L.commit();}
    const f=await L.buildLmuFiles(true);return{files:f.map(x=>[x.name,x.data.length]),perf:L.PERF.map(x=>`${x.name}: ${x.ms} ms ${x.extra}`)};});
  console.log(r.perf.join('\n'));console.log(r.files.map(f=>f.join(' ')).join('\n'));
  const okFiles=r.files.length===2&&r.files.every(f=>f[1]===18+4096*4096*4);
  if(errs.length)console.error('Errori nella pagina:\n'+errs.join('\n'));
  await b.close();
  if(errs.length||!okFiles){console.error('PROVA NON RIUSCITA');process.exit(1);}console.log('OK');
})().catch(e=>{console.error(e);process.exit(1);});

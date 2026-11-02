// Prova funzionale dello Studio senza template proprietari.
// CHROMIUM_PATH=/usr/bin/chromium node tools/studio-smoke.js
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');

(async()=>{
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'));
  const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});
  await new Promise((resolve,reject)=>{server.on('error',reject);server.listen(0,'127.0.0.1',resolve);});
  let browser;
  try{
    browser=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('dialog',d=>d.accept());
    await page.route(/fonts\.(googleapis|gstatic)\.com|raw\.githubusercontent\.com/,r=>r.abort());
    // Exercise project serialization through the normal Save action without an OS picker.
    await page.addInitScript(()=>{
      window.showSaveFilePicker=async()=>({name:'studio-test.json',createWritable:async()=>({write:async data=>{window.studioSavedProject=data;},close:async()=>{}})});
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(()=>window.__LL);
    await page.waitForTimeout(1000);
    if(await page.locator('#mNews').isVisible())await page.locator('#newsClose').click();
    await page.locator('#bStudio').click();
    await page.locator('.studio-search').fill('Apex');
    assert.equal(await page.locator('.concept-grid .cbtn2:visible').count(),1);
    await page.locator('.studio-search').fill('nessun-risultato-xyz');
    assert.equal(await page.locator('.studio-empty').isVisible(),true);
    await page.getByRole('button',{name:'Trame',exact:true}).click();
    assert.equal(await page.locator('.studio-search').inputValue(),'');
    await page.getByRole('button',{name:'Palette Ultraviolet',exact:true}).click();
    await page.getByLabel('Destinazione della trama').selectOption('base');
    await page.getByRole('button',{name:'Carbonio forgiato',exact:true}).click();
    assert.equal(await page.evaluate(()=>window.__LL.S.basePaint.pat),'forged');
    assert.equal(await page.evaluate(()=>window.__LL.S.base.toUpperCase()),'#9564FF');
    await page.keyboard.press('Control+z');
    assert.equal(await page.evaluate(()=>window.__LL.S.basePaint.pat),'none');
    await page.getByRole('button',{name:'Carbonio forgiato',exact:true}).click();
    await page.locator('#fileMenu summary').click();await page.locator('#bSave').click();
    await page.waitForFunction(()=>window.studioSavedProject);
    const saved=await page.evaluate(()=>window.studioSavedProject);
    assert.equal(JSON.parse(saved).state.basePaint.pat,'forged');
    await page.getByRole('button',{name:'Flusso aerodinamico',exact:true}).click();
    await page.setInputFiles('#fProj',{name:'studio-test.json',mimeType:'application/json',buffer:Buffer.from(saved)});
    await page.waitForFunction(()=>window.__LL.S.basePaint.pat==='forged'&&document.querySelector('#busy').hidden);
    await page.evaluate(()=>{window.__LL.S.baseMat='chrome';window.__LL.commit();});
    const files=await page.evaluate(async()=>{const fs=await window.__LL.buildLmuFiles(true);return fs.map(f=>({name:f.name,bytes:f.data.length,header:Array.from(f.data.slice(0,18)),sample:Array.from(f.data.slice(18,256))}));});
    assert.deepEqual(files.map(f=>f.name),['customskin.tga','customskin_region.tga']);
    assert.ok(files.every(f=>f.bytes===67108882&&f.header[2]===2&&f.header[13]===16&&f.header[15]===16&&f.header[16]===32));
    assert.ok(new Set(files[0].sample).size>4,'The exported texture must contain color variation');
    for(const width of [1024,800,390]){
      await page.setViewportSize({width,height:900});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
    }
    assert.deepEqual(errors,[]);
    console.log('OK: ricerca, palette, destinazione trama, annulla, salvataggio/riapertura, export TGA 4096×4096, layout e assenza di errori JavaScript.');
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(e=>{console.error(e);process.exitCode=1;});

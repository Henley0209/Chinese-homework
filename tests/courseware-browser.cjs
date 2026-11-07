// Integration harness uses the real modules with a test-only teacher callback.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/__courseware-test',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/courseware.css?v=courseware5"><select id="user-role"><option>teacher</option><option>student</option></select><button id="design-courseware">课件</button><section id="tools"></section><script type="module">import {loadCatalog} from "/exercise-store.mjs?v=hsk4-40";import {initCourseware} from "/courseware-designer.mjs?v=courseware5";await loadCatalog();initCourseware({getPassword:()=>"teacher-fixture",requireTeacher(){if(document.querySelector("#user-role").value!=="teacher")throw Error("请先完成教师验证。");}});</script>'}));
  await page.goto((process.env.COURSEWARE_BASE_URL||'http://127.0.0.1:8765')+'/__courseware-test');
  await page.locator('[data-cw-bank]').waitFor({state:'attached'});await page.click('#design-courseware');
  const {fixtureParts}=await import('./fixtures/courseware-ai.mjs');const fixtures=fixtureParts();let apiCalls=0,failGroup=false;
  await page.route('**/courseware',async route=>{const body=route.request().postDataJSON();assert.equal(body.password,'teacher-fixture');apiCalls++;if(failGroup&&body.phase==='group2')return route.fulfill({status:502,contentType:'application/json',body:JSON.stringify({error:'temporary error'})});return route.fulfill({contentType:'application/json',body:JSON.stringify({part:fixtures[body.phase]})});});
  await page.selectOption('[data-cw-bank]','hsk3');assert.ok(await page.locator('[data-cw-pptx]').isEnabled());assert.ok(await page.locator('[data-cw-download]').isEnabled());
  await page.selectOption('[data-cw-bank]','hsk1-2');
  for(const id of ['hsk1-2-topic-01','hsk1-2-topic-02','hsk1-2-topic-03']){
   await page.selectOption('[data-cw-exercise]',id);
   for(const [sel,ext]of [['[data-cw-pptx]','pptx'],['[data-cw-download]','docx']]){
    const [file]=await Promise.all([page.waitForEvent('download'),page.click(sel)]);assert.ok(file.suggestedFilename().endsWith('.'+ext));await file.saveAs('/tmp/courseware-check/browser-'+id+'.'+ext);
   }
   await page.click('[data-cw-preview]');await page.locator('#courseware-viewer').waitFor({state:'visible'});
   let count=0;
   do{
    count++;assert.equal(await page.locator('.cw-eyebrow').innerText().then(t=>t.includes('Tiếng Trung Cô Nga -Zalo:0966795638')),true);
    assert.ok((await page.locator('.cw-footer').innerText()).includes('0966795638'));
    const outside=await page.locator('[data-cw-stage]').evaluate(stage=>{
     const bounds=stage.getBoundingClientRect();return [...stage.querySelectorAll('.cw-hanzi,.cw-pinyin,.cw-vietnamese,.cw-section-heading')].filter(el=>{if(!el.textContent)return false;const r=document.createRange();r.selectNodeContents(el);return [...r.getClientRects()].some(b=>b.bottom>bounds.bottom-15||b.right>bounds.right+1||b.left<bounds.left-1);}).map(el=>el.textContent);
    });assert.deepEqual(outside,[],id+' page '+count+' text outside slide');
    if(id.endsWith('03')&&[1,4,10].includes(count))await page.locator('[data-cw-stage]').screenshot({path:'/tmp/courseware-check/web-slide-'+count+'.png'});
    if(await page.locator('[data-cw-next]').isDisabled())break;
    await page.click('[data-cw-next]');
   }while(count<100);
   assert.ok(count>13);console.log(id,count,'slides; Word/PPT downloads passed');
   if(id.endsWith('03')){
    const [download]=await Promise.all([page.waitForEvent('download'),page.click('[data-cw-view-pptx]')]);assert.ok(download.suggestedFilename().endsWith('.pptx'));
    await page.setViewportSize({width:390,height:844});await page.locator('[data-cw-stage]').screenshot({path:'/tmp/courseware-check/mobile-slide.png'});await page.setViewportSize({width:1440,height:1000});
   }
   await page.click('[data-cw-close]');
  }
  for(const [bank,id]of [['hsk1-2','hsk1-2-topic-04'],['hsk3','hsk3-topic-01'],['hsk4','hsk4-topic-01'],['hsk5','hsk5-topic-01'],['daily','daily-topic-01'],['factory','electronics-topic-01']]){
   await page.selectOption('[data-cw-bank]',bank);await page.selectOption('[data-cw-exercise]',id);const before=apiCalls;
   if(bank==='hsk3'){
    failGroup=true;await page.click('[data-cw-preview]');await page.waitForFunction(()=>document.querySelector('[data-cw-status]').textContent.includes('temporary error'));failGroup=false;
    assert.equal(apiCalls-before,4); // overview, group1, two failed group2 attempts
   }
   await page.click('[data-cw-preview]');await page.locator('#courseware-viewer').waitFor({state:'visible'});
   assert.ok((await page.locator('.cw-eyebrow').innerText()).includes(bank.startsWith('hsk')?bank.toUpperCase():(bank==='daily'?'日常交际':'汉语工厂')));
   const label=bank.startsWith('hsk')?bank.toUpperCase():(bank==='daily'?'日常交际':'汉语工厂');
   const [file]=await Promise.all([page.waitForEvent('download'),page.click('[data-cw-view-pptx]')]);assert.ok(file.suggestedFilename().startsWith(label));
   await page.click('[data-cw-close]');const cached=apiCalls;await page.click('[data-cw-download]');await page.waitForFunction(()=>document.querySelector('[data-cw-status]').textContent.includes('已下载'));assert.equal(apiCalls,cached);
   assert.equal(apiCalls-before,bank==='hsk3'?6:4);console.log('AI generation, cache and export:',bank);
  }
  await page.selectOption('[data-cw-bank]','hsk1-2');await page.selectOption('[data-cw-exercise]','hsk1-2-topic-03');await page.click('[data-cw-preview]');await page.selectOption('#user-role','student');assert.equal(await page.locator('#courseware-viewer').evaluate(el=>el.open),false);
  assert.deepEqual(errors,[]);console.log('Teacher lock, unsupported banks, all pages and browser errors checked.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

// Integration harness uses the real modules with a test-only teacher callback.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/__courseware-test',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/courseware.css?v=courseware4"><select id="user-role"><option>teacher</option><option>student</option></select><button id="design-courseware">课件</button><section id="tools"></section><script type="module">import {loadCatalog} from "/exercise-store.mjs?v=hsk4-40";import {initCourseware} from "/courseware-designer.mjs?v=courseware4";await loadCatalog();initCourseware({requireTeacher(){if(document.querySelector("#user-role").value!=="teacher")throw Error("请先完成教师验证。");}});</script>'}));
  await page.goto((process.env.COURSEWARE_BASE_URL||'http://127.0.0.1:8765')+'/__courseware-test');
  await page.locator('[data-cw-bank]').waitFor({state:'attached'});await page.click('#design-courseware');
  await page.selectOption('[data-cw-bank]','hsk3');assert.ok(await page.locator('[data-cw-pptx]').isDisabled());assert.ok(await page.locator('[data-cw-download]').isDisabled());
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
  await page.selectOption('[data-cw-exercise]','hsk1-2-topic-03');await page.click('[data-cw-preview]');await page.selectOption('#user-role','student');assert.equal(await page.locator('#courseware-viewer').evaluate(el=>el.open),false);
  assert.deepEqual(errors,[]);console.log('Teacher lock, unsupported banks, all pages and browser errors checked.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
(async()=>{
 fs.mkdirSync('work',{recursive:true});
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3}),page=await context.newPage();
 await page.addInitScript(()=>{const Native=window.Audio;window.__practiceAudio=[];window.Audio=function(...args){const audio=new Native(...args);window.__practiceAudio.push(audio);return audio;};window.Audio.prototype=Native.prototype;});
 const requests=[];page.on('request',r=>requests.push(r.url()));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());if(u.hostname!=='practice.test')return route.abort();
  const file=path.resolve('.',decodeURIComponent(u.pathname).replace(/^\//,'')||'index.html');
  if(!file.startsWith(process.cwd()+path.sep))return route.abort();
  if(!fs.existsSync(file))return route.fulfill({status:404,body:''});
  const ext=path.extname(file),mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.bin':'application/octet-stream','.png':'image/png','.jpg':'image/jpeg'}[ext]||'application/octet-stream';
  return route.fulfill({status:200,contentType:mime,body:fs.readFileSync(file)});
 });
 await page.goto('http://practice.test/index.html?appearance-preview=1');
 await page.waitForFunction(()=>document.querySelector('#practice-pronunciation').onclick!==null);
 await page.locator('#practice-pronunciation').click();
 assert.equal(await page.locator('#pronunciation-practice').isVisible(),false);
 assert.match(await page.locator('#bank-error').innerText(),/请输入/);
 await page.locator('#bank-password').fill('wrong');await page.locator('#practice-pronunciation').click();assert.match(await page.locator('#bank-error').innerText(),/不正确/);
 // Use the same configured course password as picture words without logging it.
 const banks=await import(path.resolve('bank-access.mjs'));await page.locator('#bank-password').fill(banks.banks[0].password);
 await page.locator('#practice-pronunciation').click();assert.equal(await page.locator('#welcome').isVisible(),false);
 const root=page.locator('#pronunciation-practice');assert.equal(await root.locator('.phonetics-categories button').count(),3);
 await root.getByRole('button',{name:'韵母 Vần'}).click();assert.equal(await root.locator('.phonetics-letters button').count(),6);
 assert.equal(await root.locator('select,input[type=range]').count(),0,'No playback speed or motion scrub controls');
 // The initial mouth image is visible before any letter, playback, or zoom tap.
 await page.waitForFunction(()=>document.querySelector('.phonetics-motion-canvas')?.dataset.motionProgress==='0.000');
 const initialBox=await root.locator('.phonetics-motion-canvas').boundingBox();
 assert.ok(initialBox&&initialBox.height>150&&Math.abs(initialBox.height-initialBox.width)<2,'Mouth appears automatically');
 assert.ok(await root.locator('.phonetics-motion-canvas').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0)),'Initial mouth image is painted');
 assert.equal(await root.locator('dialog').evaluate(d=>d.open),false,'No zoom tap required');
 const letterBox=await root.locator('.phonetics-letters button').first().boundingBox();
 assert.ok(letterBox.height<70,'Compact mobile letter buttons');
 await root.locator('.phonetics-letters button').first().click();
 await page.waitForFunction(()=>Number(document.querySelector('.phonetics-motion-canvas')?.dataset.motionProgress)>.1);
 // Older mobile engines can ignore aspect-ratio; the canvas must still occupy a square.
 const fallback=await page.addStyleTag({content:'.phonetics-photo,.phonetics-motion-canvas{aspect-ratio:auto!important}'});
 for(const width of [320,390,600,768,1440]){
  await page.setViewportSize({width,height:900});
  const box=await root.locator('.phonetics-motion-canvas').boundingBox();
  assert.ok(box&&box.width>150&&box.height>150,'Visible mouth canvas at '+width+'px');
  assert.ok(Math.abs(box.width-box.height)<2,'Square mouth canvas at '+width+'px');
  assert.ok(await root.locator('.phonetics-motion-canvas').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0)),'Mouth pixels rendered');
 }
 await fallback.evaluate(el=>el.remove());await page.setViewportSize({width:390,height:844});
 const early=await root.locator('.phonetics-motion-canvas').evaluate(c=>c.toDataURL());
 await page.waitForFunction(()=>Number(document.querySelector('.phonetics-motion-canvas')?.dataset.motionProgress)>.5);
 const later=await root.locator('.phonetics-motion-canvas').evaluate(c=>c.toDataURL());assert.notEqual(early,later,'AI mouth frames change while audio plays');
 assert.equal(await page.evaluate(()=>window.__practiceAudio.find(a=>a.src.includes('/isolated/finals-a.mp3')).playbackRate),.35);
 await page.waitForFunction(()=>document.querySelector('.phonetics-status').textContent.includes('播放完成'));
 assert.equal(await root.locator('.phonetics-selected').innerText(),'a');
 assert.equal(await root.locator('.phonetics-letters small').count(),0,'Do not display example syllables');
 await root.locator('.phonetics-photo-button').first().click();assert.equal(await root.locator('dialog').evaluate(d=>d.open),true);
 assert.equal(await root.locator('dialog').getByRole('button').count(),2,'Zoom keeps replay and close only');
 await root.locator('dialog').getByRole('button',{name:'▶ 重播 Nghe lại'}).click();
 await page.waitForFunction(()=>Number(document.querySelector('dialog canvas')?.dataset.motionProgress)>.15);
 const progress=await page.evaluate(()=>[...document.querySelectorAll('.phonetics-motion-canvas')].map(c=>c.dataset.motionProgress));assert.equal(progress[0],progress[1],'Zoom stays synchronized');
 assert.equal(await page.evaluate(()=>window.__practiceAudio.find(a=>a.src.includes('/isolated/finals-a.mp3')).playbackRate),.35,'Replay is also fixed at very slow speed');
 await page.keyboard.press('Escape');assert.equal(await root.locator('dialog').evaluate(d=>d.open),false);
 assert.ok(requests.some(u=>u.includes('/isolated/finals-a.mp3')));

 for(let i=0;i<5;i++)await root.getByRole('button',{name:'下一页 → Trang sau'}).click();
 assert.equal(await root.locator('.phonetics-letters button').count(),5);
 assert.equal(await root.getByRole('button',{name:'下一页 → Trang sau'}).isDisabled(),true);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile must not overflow');
 await page.screenshot({path:'work/phonetics-mobile.png',fullPage:true});
 await root.getByRole('button',{name:'返回分类 Về danh mục'}).click();await root.getByRole('button',{name:'声调 Thanh điệu'}).click();
 await root.locator('.phonetics-letters button').nth(2).click();assert.equal(await root.locator('.phonetics-tone').isVisible(),true);
 await root.getByRole('button',{name:'返回主页 Về trang chủ'}).click();assert.equal(await root.isVisible(),false);
 assert.equal(await page.evaluate(()=>window.__practiceAudio.filter(a=>!a.src.includes('/assets/music/')).every(a=>a.paused)),true,'Returning home stops pronunciation audio; existing homepage music may resume');
 await page.setViewportSize({width:1440,height:1000});await page.locator('#practice-pronunciation').click();await root.getByRole('button',{name:'声母 Phụ âm đầu'}).click();await root.locator('.phonetics-letters button').first().click();
 await root.getByRole('button',{name:'下一页 → Trang sau'}).click();
 const initial=root.locator('.phonetics-letters button').first();assert.equal(await initial.innerText(),'n');await initial.click();
 await page.waitForFunction(()=>Number(document.querySelector('.phonetics-motion-canvas')?.dataset.motionProgress)>.1);
 assert.equal(await page.evaluate(()=>window.__practiceAudio.find(a=>a.src.includes('/isolated/initials-n.mp3')).playbackRate),.35,'Initials autoplay at very slow speed');
 await page.waitForFunction(()=>document.querySelector('.phonetics-status').textContent.includes('播放完成'));
 assert.ok(requests.some(u=>u.includes('/isolated/initials-n.mp3')));
 assert.ok(!await root.innerText().then(t=>/ná|gē|kē|示范音节/.test(t)));
 assert.equal(await root.locator('select,input[type=range]').count(),0);
 await root.screenshot({path:'work/phonetics-ai-desktop.png'});
 await page.setViewportSize({width:390,height:844});await root.screenshot({path:'work/phonetics-ai-mobile.png'});

 assert.deepEqual(errors,[]);console.log('PASS mobile and desktop: auth, categories, recorded playback, AI moving frames, fixed very-slow autoplay, no speed or scrub controls, synchronized enlargement, standalone audio routing, pagination, tone chart, return home, no JS errors.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

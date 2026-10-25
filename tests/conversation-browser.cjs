const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 fs.mkdirSync('work',{recursive:true});
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await context.addInitScript(()=>{
  window.__spoken=[];window.__rates=[];window.__holdSpeech=false;
  Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{name:'Microsoft Xiaoxiao Online (Natural)',lang:'zh-CN'}],cancel(){},speak(u){window.__spoken.push(u.text);window.__rates.push(u.rate);if(!window.__holdSpeech)setTimeout(()=>u.onend?.(),30);}}});
  window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
  window.SpeechRecognition=class {constructor(){window.__recognition=this;}start(){}abort(){this.onend?.();}stop(){this.onend?.();}};
 });
 const page=await context.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));
 let enabled=false,fail=false,hold=false,releaseHeld;
 const opening={grammarCorrect:true,contentCorrect:true,feedback:'',correction:'',next:'你好！你叫什么名字？'};
 const corrected={grammarCorrect:false,contentCorrect:true,feedback:'“叫”后直接接名字，不需要“是”。',correction:'我叫小明。',next:'很高兴认识你！你是哪里人？'};
 const correct={grammarCorrect:true,contentCorrect:true,feedback:'回答正确，表达自然。',correction:'',next:'越南很美！你为什么学习中文？'};
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.hostname==='ai.test'&&u.pathname==='/speech')return route.fulfill({status:200,contentType:'audio/mpeg',body:Buffer.alloc(256,1)});
  if(u.hostname==='ai.test'){
   const body=route.request().postDataJSON();requests.push(body);
   if(hold)await new Promise(resolve=>{releaseHeld=resolve;});
   return route.fulfill({status:fail?502:200,contentType:'application/json',body:JSON.stringify(body.messages.length===0?opening:body.messages.length===2?corrected:correct)}).catch(()=>{});
  }
  if(u.hostname!=='practice.test')return route.abort();
  if(u.pathname==='/conversation-config.json')return route.fulfill({contentType:'application/json',body:JSON.stringify({endpoint:enabled?'https://ai.test/conversation':''})});
  let file=path.resolve('.',decodeURIComponent(u.pathname).replace(/^\//,'')||'index.html');if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!file.startsWith(process.cwd()+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:''});
  const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream';
  return route.fulfill({contentType:mime,body:fs.readFileSync(file)});
 });
 await page.goto('https://practice.test/index.html?appearance-preview=1');
 await page.waitForFunction(()=>document.querySelector('#practice-conversation').onclick!==null);
 const root=page.locator('#conversation-practice'),entry=page.locator('#practice-conversation');
 await entry.click();await root.getByRole('status').filter({hasText:'对话服务尚未开通'}).waitFor();assert.equal(requests.length,0,'No fake AI fallback');assert.match(await root.locator('.conversation-topic').innerText(),/入门|基础|中文/);
 await root.getByRole('button',{name:'返回主页'}).click();
 await page.locator('#question-bank').selectOption('daily');await page.locator('#bank-password').fill('wrong');await entry.click();await page.waitForFunction(()=>document.querySelector('#bank-error').textContent.includes('密码'));assert.equal(await root.isVisible(),false);
 const banks=await import(path.resolve('bank-access.mjs'));await page.locator('#bank-password').fill(banks.banks.find(b=>b.id==='daily').password);
 const selectedTitle=await page.locator('#exercise-select option:checked').innerText();enabled=true;await entry.click();
 await root.getByRole('button',{name:'开始对话'}).waitFor();await page.waitForFunction(()=>!document.querySelector('#conversation-practice .conversation-actions button').disabled);
 assert.equal(requests[0].lesson.title,selectedTitle);assert.equal(requests[0].lesson.bank,'日常交际');assert.deepEqual(requests[0].messages,[]);assert.ok(!JSON.stringify(requests[0]).includes(banks.banks[0].password));assert.equal((await page.evaluate(()=>window.__spoken))[0],opening.next);
 await root.getByRole('button',{name:'开始对话'}).click();assert.equal(await root.getByRole('button',{name:'说完了'}).isVisible(),true);assert.equal(await root.getByRole('button',{name:'发送回答'}).isDisabled(),true);
 await page.evaluate(()=>{window.__recognition.onresult({results:[[{transcript:'我叫是小明。'}]]});window.__recognition.onend();});
 await page.waitForFunction(()=>document.querySelectorAll('.conversation-message.ai').length===2);await page.waitForFunction(()=>!document.querySelector('#conversation-practice .conversation-actions button').disabled);
 assert.equal((await page.evaluate(()=>window.__spoken))[1],'这句话可以这样回答：我叫小明。\n'+corrected.next);assert.equal(requests[1].messages.at(-1).content,'我叫是小明。');
 await root.locator('textarea').fill('我是越南人。');await root.getByRole('button',{name:'发送回答'}).click();await page.waitForFunction(()=>document.querySelectorAll('.conversation-message.ai').length===3);await page.waitForFunction(()=>!document.querySelector('#conversation-practice .conversation-actions button').disabled);assert.equal((await page.evaluate(()=>window.__spoken))[2],correct.next);
 // Failed requests retain the student turn, and retry resends exactly the same history.
 fail=true;await root.locator('textarea').fill('我想在中国工作。');await root.getByRole('button',{name:'发送回答'}).click();await root.getByRole('button',{name:'重试'}).waitFor();assert.equal(await root.getByRole('button',{name:'开始对话'}).isDisabled(),true);assert.equal(await root.getByRole('button',{name:'发送回答'}).isDisabled(),true);
 const failedPayload=requests.at(-1);fail=false;await root.getByRole('button',{name:'重试'}).click();await page.waitForFunction(()=>document.querySelectorAll('.conversation-message.ai').length===4);assert.deepEqual(requests.at(-1),failedPayload);
 await page.waitForFunction(()=>!document.querySelector('#conversation-practice .conversation-actions button').disabled);
 // Permission errors restore controls without sending an empty response.
 const before=requests.length;await root.getByRole('button',{name:'开始对话'}).click();await page.evaluate(()=>{window.__recognition.onerror({error:'not-allowed'});window.__recognition.onend();});assert.match(await root.getByRole('status').innerText(),/麦克风权限/);assert.equal(requests.length,before);
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No overflow at '+width);}
 await page.setViewportSize({width:390,height:844});await root.screenshot({path:'work/conversation-mobile.png'});
 // Leaving while a request is pending must not append or speak its late result.
 hold=true;await root.locator('textarea').fill('我想继续学中文。');await root.getByRole('button',{name:'发送回答'}).click();await page.waitForFunction(()=>document.querySelector('.conversation-status').textContent.includes('评估'));
 await root.getByRole('button',{name:'返回主页'}).click();const speechCount=(await page.evaluate(()=>window.__spoken)).length;releaseHeld?.();await page.waitForTimeout(100);assert.equal((await page.evaluate(()=>window.__spoken)).length,speechCount);assert.equal(await root.isVisible(),false);assert.equal(await page.locator('#welcome').isVisible(),true);
 assert.deepEqual(errors,[]);
 // Without SpeechRecognition, text replies remain usable.
 hold=false;await page.addInitScript(()=>{window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined;});await page.reload();await page.waitForFunction(()=>document.querySelector('#practice-conversation').onclick!==null);await entry.click();await page.waitForFunction(()=>document.querySelectorAll('.conversation-message.ai').length===1);await page.waitForFunction(()=>!document.querySelector('.conversation-answer button').disabled);assert.equal(await root.getByRole('button',{name:'开始对话'}).isDisabled(),true);assert.equal(await root.locator('textarea').isEnabled(),true);
 await page.goto('https://practice.test/conversation/hsk-lesson-01/');await page.waitForFunction(()=>!document.querySelector('#practice-conversation').disabled);await entry.click();await page.waitForFunction(()=>document.querySelectorAll('.conversation-message.ai').length===1);await page.waitForFunction(()=>!document.querySelector('.conversation-answer button').disabled);assert.match(requests.at(-1).lesson.title,/HSK1-2 第01课/);assert.equal((await page.evaluate(()=>window.__rates))[0],.9);
 await page.addInitScript(()=>{speechSynthesis.getVoices=()=>[{name:'普通话女声',lang:'zh-CN'}];window.__cloudPlayed=[];window.Audio=function(){const a=document.createElement('audio');a.pause=()=>{};a.load=()=>{};a.play=function(){if(this.src?.startsWith('blob:')){__cloudPlayed.push({src:this.src,rate:this.playbackRate});setTimeout(()=>this.onended?.(),10);}return Promise.resolve();};return a;};});await page.reload();await page.waitForFunction(()=>!document.querySelector('#practice-conversation').disabled);await entry.click();await page.waitForFunction(()=>document.querySelector('.conversation-status').textContent.includes('朗读完成'));assert.equal((await page.evaluate(()=>window.__cloudPlayed))[0].rate,.9);assert.match(await root.innerText(),/云端中文音色/);
 console.log('PASS: selected topic, intro routing, course-password validation, no-service state, AI opening, mic response, correction then follow-up, correct-answer flow, retry without duplicates, permission denial, cancellation, text fallback and responsive widths.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

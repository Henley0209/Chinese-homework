const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await context.addInitScript(()=>{
  window.__level=0;window.__started=[];window.__stopped=0;window.__ended=[];window.__utterances=[];window.__deny=false;
  navigator.mediaDevices.getUserMedia=async()=>{if(window.__deny)throw new DOMException('denied','NotAllowedError');return {getTracks:()=>[{stop(){window.__stopped++;}}]};};
  window.AudioContext=class{resume(){return Promise.resolve();}createAnalyser(){return {fftSize:1024,getFloatTimeDomainData(a){a.fill(window.__level);}};}createMediaStreamSource(){return {connect(){},disconnect(){}};}};
  window.MediaRecorder=class{static isTypeSupported(){return true;}constructor(){this.state='inactive';this.mimeType='audio/webm';}start(){this.state='recording';window.__started.push(performance.now());}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob([new Uint8Array(300)],{type:'audio/webm'})});this.onstop?.();}};
  Object.defineProperty(window,'speechSynthesis',{value:{resume(){},getVoices:()=>[{name:'Microsoft Xiaoxiao Online (Natural)',lang:'zh-CN'}],cancel(){},speak(u){window.__utterances.push({text:u.text,rate:u.rate});u.onstart?.();setTimeout(()=>{window.__ended.push(performance.now());u.onend?.();},40);}}});
  window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
 });
 const page=await context.newPage(),errors=[],requests=[],transcriptions=[];page.on('pageerror',e=>errors.push(e.message));let fail=false,enabled=true;
 const opening={grammarCorrect:true,contentCorrect:true,feedback:'',correction:'',next:'你好！你今天好吗？'};
 const correction={grammarCorrect:false,contentCorrect:true,feedback:'不用加“是”。',correction:'我很好，谢谢。',next:'你今天忙吗？'};
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.hostname==='ai.test'&&u.pathname==='/speech'){const b=Buffer.alloc(1644);b.write('RIFF');b.writeUInt32LE(1636,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(1600,40);return route.fulfill({contentType:'audio/wav',body:b});}
  if(u.hostname==='ai.test'&&u.pathname==='/transcribe'){transcriptions.push(Date.now());return route.fulfill({contentType:'application/json',body:JSON.stringify({text:'我很好是，谢谢。'})});}
  if(u.hostname==='ai.test'){const body=route.request().postDataJSON();requests.push(body);return route.fulfill({status:fail?502:200,contentType:'application/json',body:JSON.stringify(body.messages.length?correction:opening)});}
  if(u.hostname!=='practice.test')return route.abort();
  if(u.pathname==='/conversation-config.json')return route.fulfill({contentType:'application/json',body:JSON.stringify({endpoint:enabled?'https://ai.test/conversation':''})});
  let file=path.resolve('.',decodeURIComponent(u.pathname).replace(/^\//,'')||'index.html');if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!file.startsWith(process.cwd()+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:''});
  const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json'}[path.extname(file)]||'application/octet-stream';return route.fulfill({contentType:mime,body:fs.readFileSync(file)});
 });
 await page.goto('https://practice.test/conversation/hsk-lesson-01/');await page.waitForFunction(()=>!document.querySelector('#practice-conversation').disabled);await page.locator('#practice-conversation').click();
 const root=page.locator('#conversation-practice');await page.waitForFunction(()=>window.__started.length===1);
 assert.equal(await root.locator('textarea,form,.conversation-answer').count(),0,'Requested text form is removed');
 const initial=await page.evaluate(()=>({start:__started[0],end:__ended[0],voice:__utterances[0]}));assert.ok(initial.start-initial.end>=950,'Wait at least one second after AI audio');assert.equal(initial.voice.rate,.75);assert.match(requests[0].lesson.title,/HSK1-2 第01课/);
 // Silence before speaking must not trigger a request.
 await page.waitForTimeout(500);assert.equal(transcriptions.length,0);
 await page.evaluate(()=>window.__level=.06);await page.waitForTimeout(300);await page.evaluate(()=>window.__level=0);await page.waitForTimeout(2000);assert.equal(transcriptions.length,0);
 // A student continuing within the pause resets the full three-second interval.
 await page.evaluate(()=>window.__level=.06);await page.waitForTimeout(300);await page.evaluate(()=>window.__level=0);const quietAt=Date.now();await page.waitForTimeout(2600);assert.equal(transcriptions.length,0);
 await page.waitForFunction(()=>document.querySelectorAll('.conversation-message.ai').length===2);assert.ok(transcriptions[0]-quietAt>=2900);assert.equal(requests[1].messages.at(-1).content,'我很好是，谢谢。');
 await root.getByRole('button',{name:'暂停自动收音'}).click();await page.waitForTimeout(1200);assert.equal(await page.evaluate(()=>__started.length),1,'Pause cancels next automatic capture');
 assert.match((await page.evaluate(()=>__utterances[1].text)),/^这句话可以这样回答：我很好，谢谢。\n/);assert.ok(await page.evaluate(()=>__stopped>=1));
 // Resume begins another capture; leaving immediately releases the microphone.
 await root.getByRole('button',{name:'恢复自动收音'}).click();await page.waitForFunction(()=>__started.length===2);await root.getByRole('button',{name:'返回主页'}).click();const before=transcriptions.length;await page.waitForTimeout(1100);assert.equal(transcriptions.length,before);assert.ok(await page.evaluate(()=>__stopped>=2));
 // Permission denial is actionable and never sends empty audio.
 await page.evaluate(()=>window.__deny=true);await page.locator('#practice-conversation').click();await page.waitForFunction(()=>document.querySelector('.conversation-status').textContent.includes('麦克风权限'));assert.equal(transcriptions.length,before);
 await root.getByRole('button',{name:'返回主页'}).click();await page.evaluate(()=>window.__deny=false);
 // Retry uses the same unsuccessful student turn, without adding another recording.
 await page.locator('#practice-conversation').click();await page.waitForFunction(()=>__started.length===3);fail=true;await root.getByRole('button',{name:'说完了'}).click();await root.getByRole('button',{name:'重试'}).waitFor();const previous=requests.at(-1);fail=false;await root.getByRole('button',{name:'重试'}).click();await page.waitForFunction(()=>document.querySelectorAll('.conversation-message.ai').length===2);assert.deepEqual(requests.at(-1),previous);await root.getByRole('button',{name:'暂停自动收音'}).click();
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
 await page.addInitScript(()=>{speechSynthesis.getVoices=()=>[{name:'设备普通话',lang:'zh-CN'}];window.__cloudRates=[];window.Audio=function(){const a=document.createElement('audio');a.pause=()=>{};a.load=()=>{};a.play=function(){if(this.src.startsWith('blob:')){__cloudRates.push(this.playbackRate);this.dispatchEvent(new Event('play'));setTimeout(()=>{window.__cloudEnd=performance.now();this.dispatchEvent(new Event('ended'));},40);}return Promise.resolve();};return a;};});await page.reload();await page.waitForFunction(()=>!document.querySelector('#practice-conversation').disabled);await page.locator('#practice-conversation').click();await page.waitForFunction(()=>__cloudRates.length===1);assert.equal(await root.locator('audio[controls]').count(),1);await page.waitForFunction(()=>__started.length===1);assert.equal((await page.evaluate(()=>__cloudRates))[0],.75);assert.ok(await page.evaluate(()=>__started[0]-__cloudEnd>=950));assert.equal(await root.locator('textarea,form').count(),0);await root.getByRole('button',{name:'返回主页'}).click();
 assert.deepEqual(errors,[]);console.log('PASS: removed text form, 0.75 speech, 1-second automatic microphone, 3-second silence after sustained speech, continuation resets pause, correction and next turn, pause/resume, permission errors, exit cleanup, retry, mobile layout.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

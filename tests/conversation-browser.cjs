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
  Object.defineProperty(window,'speechSynthesis',{value:{resume(){},getVoices:()=>[{name:'Microsoft Xiaoxiao Online (Natural)',lang:'zh-CN'}],cancel(){},speak(u){window.__utterances.push({text:u.text,rate:u.rate});u.onstart?.();setTimeout(()=>{window.__ended.push(performance.now());u.onend?.();},40);}}});window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
 });
 const page=await context.newPage(),errors=[],requests=[],transcriptions=[],speechCalls=[];page.on('pageerror',e=>errors.push(e.message));let fail=false,holdSpeech=false,releaseSpeech,holdAnswer=false,releaseAnswer,transcript='明天下雨。',serveBanks=false;
 const questions=['你好吗？','你叫什么名字？','你来自哪里？','认识朋友时你会怎么打招呼？','你会怎样说再见？'];
 const pinyin=['Nǐ hǎo ma?','Nǐ jiào shénme míngzi?','Nǐ láizì nǎlǐ?','Rènshi péngyou shí nǐ huì zěnme dǎ zhāohu?','Nǐ huì zěnyàng shuō zàijiàn?'];
 function response(body){const answer=body.action==='answer',i=body.action==='open'?0:Math.min(4,body.progress.questionNumber);const result={grammarCorrect:!answer,contentCorrect:true,feedback:answer?'不用加“是”。':'',feedbackPinyin:answer?'Bú yòng jiā shì.':'',correction:answer?'我很好，谢谢。':'',correctionPinyin:answer?'Wǒ hěn hǎo, xièxie.':'',answerPinyin:answer?'Míngtiān xià yǔ.':'',next:questions[i],nextPinyin:pinyin[i],nextKeywords:['好','忙','学习']};if(body.nextQuestion){result.next=body.nextQuestion.question;result.nextPinyin=body.nextQuestion.pinyin;result.nextKeywords=body.nextQuestion.keywords;}return result;}
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.hostname==='ai.test'&&u.pathname==='/speech'){
   const text=route.request().postDataJSON().text;speechCalls.push(text);if(holdSpeech&&text===questions[1])await new Promise(resolve=>{releaseSpeech=resolve;});
   const b=Buffer.alloc(1644);b.write('RIFF');b.writeUInt32LE(1636,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(1600,40);return route.fulfill({contentType:'audio/wav',body:b});
  }
  if(u.hostname==='ai.test'&&u.pathname==='/transcribe'){transcriptions.push(Date.now());return route.fulfill({contentType:'application/json',body:JSON.stringify({text:transcript})});}
  if(u.hostname==='ai.test'){const body=route.request().postDataJSON();requests.push(body);if(holdAnswer&&body.action==='answer')await new Promise(resolve=>{releaseAnswer=resolve;});return route.fulfill({status:fail?502:200,contentType:'application/json',body:JSON.stringify(response(body))}).catch(()=>{});}
  if(u.hostname!=='practice.test')return route.abort();
  if(u.pathname.startsWith('/conversation-banks/')&&!serveBanks)return route.fulfill({status:404,body:''});
  if(u.pathname==='/conversation-config.json')return route.fulfill({contentType:'application/json',body:JSON.stringify({endpoint:'https://ai.test/conversation'})});
  let file=path.resolve('.',decodeURIComponent(u.pathname).replace(/^\//,'')||'index.html');if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');if(!file.startsWith(process.cwd()+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:''});const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json'}[path.extname(file)]||'application/octet-stream';return route.fulfill({contentType:mime,body:fs.readFileSync(file)});
 });
 const root=page.locator('#conversation-practice');const enter=async()=>{await page.waitForFunction(()=>!document.querySelector('#practice-conversation').disabled);await page.locator('#practice-conversation').click();await page.locator('.conversation-position').waitFor();};
 await page.goto('https://practice.test/conversation/hsk-lesson-01/');await enter();await page.waitForFunction(()=>__started.length===1);
 assert.equal(await root.locator('textarea,form').count(),0);assert.equal(await root.getByRole('button',{name:/开始对话|暂停自动收音|恢复自动收音/}).count(),0);assert.equal(await root.getByRole('button',{name:'上一个问题'}).isDisabled(),true);
 const first=await page.evaluate(()=>({start:__started[0],end:__ended[0],rate:__utterances[0].rate}));assert.ok(first.start-first.end>=950);assert.equal(first.rate,.75);assert.match(await root.innerText(),/Nǐ hǎo ma/);
 await page.waitForTimeout(400);assert.equal(transcriptions.length,0);await page.evaluate(()=>__level=.06);await page.waitForTimeout(300);await page.evaluate(()=>__level=0);await page.waitForTimeout(1200);assert.equal(transcriptions.length,0);
 await page.evaluate(()=>__level=.06);await page.waitForTimeout(300);await page.evaluate(()=>__level=0);const quietAt=Date.now();await page.waitForTimeout(1650);assert.equal(transcriptions.length,0);
 await page.waitForFunction(()=>document.querySelector('.conversation-position')?.textContent.includes('第 2 题'));assert.ok(transcriptions[0]-quietAt>=1900);assert.equal(requests[1].messages.at(-1).content,'明天下雨。');assert.match(await root.innerText(),/Bú yòng jiā shì/);assert.match(await root.innerText(),/Wǒ hěn hǎo, xièxie/);
 await page.waitForFunction(()=>__started.length===2);const clips=await page.evaluate(()=>__utterances.map(u=>u.text));assert.equal(clips[1],'这句话可以这样回答：我很好，谢谢。');assert.equal(clips[2],questions[1]);assert.ok(await page.evaluate(()=>__started[1]-__ended[2]>=950));
 const beforeNav=requests.length;await root.getByRole('button',{name:'上一个问题'}).click();await page.waitForFunction(()=>document.querySelector('.conversation-position')?.textContent.includes('第 1 题'));await root.getByRole('button',{name:'下一个问题'}).click();await page.waitForFunction(()=>document.querySelector('.conversation-position')?.textContent.includes('第 2 题'));assert.equal(requests.length,beforeNav,'Cached navigation makes no model call');
 await root.getByRole('button',{name:'返回主页'}).click();await page.reload();await enter();await page.waitForFunction(()=>document.querySelector('.conversation-position')?.textContent.includes('第 2 题'));assert.equal(requests.length,beforeNav,'Reload resumes without restarting');assert.match(await root.innerText(),/Wǒ hěn hǎo, xièxie/);
 await root.getByRole('button',{name:'下一个问题'}).click();await page.waitForFunction(()=>document.querySelector('.conversation-position')?.textContent.includes('第 3 题'));assert.equal(requests.at(-1).action,'next');assert.equal(requests.at(-1).messages.at(-1).role,'assistant');assert.equal(requests.at(-1).progress.correctAnswers,0);
 await page.waitForFunction(()=>__started.length>=1);fail=true;await root.getByRole('button',{name:'说完了'}).click();await root.getByRole('button',{name:'重试'}).waitFor();const failedPayload=requests.at(-1);
 assert.equal(failedPayload.transcript.at(-1).answer,transcript);
 assert.equal(await root.getByRole('button',{name:'再听一次'}).isEnabled(),true);
 const failedCount=requests.length;
 await root.getByRole('button',{name:'上一个问题'}).click();
 await page.waitForFunction(()=>document.querySelector('.conversation-position')?.textContent.includes('第 2 题'));
 await root.getByRole('button',{name:'下一个问题'}).click();
 await page.waitForFunction(()=>document.querySelector('.conversation-position')?.textContent.includes('第 3 题'));
 assert.equal(requests.length,failedCount,'Error state cannot block switching cached questions');
 await root.getByRole('button',{name:'返回主页'}).click();await page.reload();fail=false;await enter();await page.waitForFunction(()=>document.querySelector('.conversation-position')?.textContent.includes('第 4 题'));assert.deepEqual(requests.at(-1),failedPayload,'Unfinished assessment resumes with the same answer');
 await page.waitForFunction(()=>__started.length===1);holdAnswer=true;await root.getByRole('button',{name:'说完了'}).click();for(let i=0;i<60&&!releaseAnswer;i++)await page.waitForTimeout(50);assert.ok(releaseAnswer);assert.equal(await root.getByRole('button',{name:'下一个问题'}).isEnabled(),true);holdAnswer=false;await root.getByRole('button',{name:'下一个问题'}).click();await page.waitForFunction(()=>document.querySelector('.conversation-position')?.textContent.includes('第 5 题'));assert.equal(requests.at(-1).action,'answer');assert.equal(requests.at(-1).messages.at(-1).content,transcript);releaseAnswer();await page.waitForTimeout(150);assert.match(await root.locator('.conversation-position').innerText(),/第 5 题/,'Late grading cannot replace the selected question');const navCount=requests.length;await root.getByRole('button',{name:'上一个问题'}).click();await root.getByRole('button',{name:'下一个问题'}).click();assert.equal(requests.length,navCount);assert.equal(await root.locator('.feedback').first().evaluate(n=>getComputedStyle(n).fontSize),'14px');
 await page.evaluate(()=>__deny=true);await root.getByRole('button',{name:'再听一次'}).click();await page.waitForFunction(()=>document.querySelector('.conversation-status')?.textContent.includes('麦克风权限'));await root.getByRole('button',{name:'返回主页'}).click();
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});}
 // Cloud speech: slow next-question generation must never start the mic after the correction alone.
 await page.addInitScript(()=>{if(!localStorage.getItem('preserve-test-session'))localStorage.clear();speechSynthesis.getVoices=()=>[{name:'设备普通话',lang:'zh-CN'}];window.__audioInstances=0;window.__cloudRates=[];window.__blockBlob=false;window.Audio=function(){__audioInstances++;const a=document.createElement('audio');a.pause=()=>{};a.load=()=>{};a.play=function(){if(this.src.startsWith('blob:')){if(window.__blockBlob){window.__blockBlob=false;return Promise.reject(new DOMException('gesture','NotAllowedError'));}__cloudRates.push(this.playbackRate);this.dispatchEvent(new Event('play'));setTimeout(()=>{window.__cloudEnd=performance.now();this.dispatchEvent(new Event('ended'));},40);}return Promise.resolve();};return a;};});
 await page.reload();await enter();await page.waitForFunction(()=>__started.length===1);holdSpeech=true;await root.getByRole('button',{name:'说完了'}).click();for(let i=0;i<100&&!releaseSpeech;i++)await page.waitForTimeout(50);assert.ok(releaseSpeech);await page.waitForTimeout(1200);assert.equal(await page.evaluate(()=>__started.length),1,'No mic while the next clip is still loading');releaseSpeech();holdSpeech=false;await page.waitForFunction(()=>__started.length===2);assert.ok(await page.evaluate(()=>__started[1]-__cloudEnd>=950));assert.equal((await page.evaluate(()=>__cloudRates)).every(r=>r===.75),true);assert.equal(await page.evaluate(()=>__audioInstances),1,'Reuse one unlocked audio element');
 // A blocked new question remains pending; pressing its audio play key resumes the automatic flow.
 await page.evaluate(()=>__blockBlob=true);await root.getByRole('button',{name:'下一个问题'}).click();await page.waitForFunction(()=>document.querySelector('.conversation-status')?.textContent.includes('自动播放'));const captures=await page.evaluate(()=>__started.length);await page.waitForTimeout(1200);assert.equal(await page.evaluate(()=>__started.length),captures);await root.locator('audio').evaluate(a=>a.play());await page.waitForFunction(n=>__started.length===n+1,captures);transcript='我在學習漢語。';await root.getByRole('button',{name:'说完了'}).click();await page.waitForFunction(()=>document.querySelector('.conversation-position')?.textContent.includes('第 4 题'));assert.equal(requests.at(-1).messages.at(-1).content,'我在学习汉语。');await root.getByRole('button',{name:'返回主页'}).click();
 // Existing fixed banks must no longer bypass live topic generation.
 serveBanks=true;await page.reload();const modelCalls=requests.length;await enter();await page.waitForFunction(()=>__started.length===1);
 assert.match(await root.locator('.conversation-position').innerText(),/第 1 题/);
 assert.equal(requests.length,modelCalls+1,'Opening calls AI even when a prepared bank exists');
 assert.equal(requests.at(-1).action,'open');assert.equal(requests.at(-1).nextQuestion,undefined);
 assert.equal(await root.locator('.conversation-reference').count(),0);
 await root.getByRole('button',{name:'下一个问题'}).click();await page.waitForFunction(()=>document.querySelector('.conversation-position')?.textContent.includes('第 2 题'));
 assert.equal(requests.length,modelCalls+2);assert.equal(requests.at(-1).action,'next');
 await page.waitForFunction(()=>__started.length===2);await root.getByRole('button',{name:'说完了'}).click();
 await page.waitForFunction(()=>document.querySelector('.conversation-position')?.textContent.includes('第 3 题'));
 assert.equal(requests.at(-1).nextQuestion,undefined);assert.equal(requests.at(-1).expectedAnswer,undefined);
 assert.equal(requests.at(-1).messages.at(-1).content,'我在学习汉语。');
 const beforeRestart=requests.length;await root.getByRole('button',{name:'从头练习'}).click();
 await page.waitForFunction(()=>document.querySelector('.conversation-position')?.textContent.includes('第 1 题'));
 assert.equal(requests.length,beforeRestart+1);assert.equal(requests.at(-1).action,'open');assert.deepEqual(requests.at(-1).messages,[]);
 await root.getByRole('button',{name:'返回主页'}).click();
 // A restored off-topic first-lesson question must not be replayed or sent to AI.
 await page.evaluate(()=>localStorage.setItem('preserve-test-session','1'));
 await page.addInitScript(()=>{const key=Object.keys(localStorage).find(k=>k.endsWith(':topic-v1'));const saved=JSON.parse(localStorage.getItem(key));saved.turns[0].question='你今天赚了多少钱？';saved.playlist=['你今天赚了多少钱？'];saved.playIndex=0;localStorage.setItem(key,JSON.stringify(saved));localStorage.setItem('preserve-test-session','1');});
 const beforeRecovery=requests.length;await page.reload();await enter();
 await page.waitForFunction(()=>document.querySelector('.conversation-position')?.textContent.includes('第 1 题'));
 assert.equal(requests.length,beforeRecovery+1);assert.equal(requests.at(-1).action,'open');assert.deepEqual(requests.at(-1).messages,[]);
 assert.doesNotMatch(await root.innerText(),/赚了多少钱/);await root.getByRole('button',{name:'返回主页'}).click();
 assert.deepEqual(errors,[]);console.log('PASS: pinyin, ordered correction speech, 2-second silence with continuation, 1-second capture after complete playback, cached previous/next, saved cursor/feedback and pending assessment across reloads, difficulty metadata, persistent audio element, delayed next audio, blocked-autoplay recovery, permission handling and microphone cleanup.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});


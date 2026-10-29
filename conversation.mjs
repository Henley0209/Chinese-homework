import {topicViolation} from './conversation-topic.mjs?v=dedup2';
import {toSimplified} from './vendor/chinese-simplified.mjs';
import {canRecord,createAnswerRecorder} from './conversation-recorder.mjs?v=loose1';
import {resolveBank} from './bank-access.mjs?v=banks-8';
import {loadCatalog,getExercise,introExercise} from './exercise-store.mjs?v=hsk4-40';
import {stopFeedback} from './result-feedback.mjs?v=writing21';
import {createDialogueVoice} from './conversation-voice.mjs?v=progress1';
import {lessonContext,validateReply} from './conversation-core.mjs?v=loose1';
import {topicSessionKey,lessonFingerprint,readSession,writeSession,questionHistory,learningProgress} from './conversation-session.mjs?v=greeting1';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
export function initConversation({onEnter=()=>{},onAuthenticatedEntry=()=>{},fixedLesson=null,configUrl='./conversation-config.json',isTeacher=()=>document.querySelector('#user-role')?.value==='teacher'}={}){
 const root=document.querySelector('#conversation-practice'),entry=document.querySelector('#practice-conversation');if(!root||!entry)return;
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition,recordSupported=canRecord();
 let generation=0,captureGeneration=0,playRun=0,controller,recognition,autoTimer,endTimer,phase='idle',context,model,key,endpoint='',entering=false;
 let log,status,previous,next,replay,retry,finish,voiceLabel,position,storageNotice,restart;
 const storage=()=>{try{return window.localStorage;}catch{return null;}};
 const current=()=>model?.turns[model.cursor];
 function save(){if(!model?.turns.length||!key)return;model.scroll=log?.scrollTop||0;const ok=writeSession(storage(),key,model,context);if(storageNotice)storageNotice.textContent=ok?'对话文字和进度保存在当前浏览器；重新进入将恢复。':'当前浏览器无法保存进度，退出后可能无法恢复。';}
 function state(value){phase=value;const pending=!!model?.pendingAction,loading=phase==='loading';previous.disabled=!model||model.cursor===0;next.disabled=!current()||(loading&&model.pendingAction==='next');replay.disabled=loading||pending||!current();finish.hidden=phase!=='listening';retry.hidden=phase!=='error';if(position&&current()){const level=Math.min(3,1+Math.floor(learningProgress(model.turns,model.cursor).correctAnswers/3));position.textContent='第 '+current().number+' 题 · '+['','基础口语','句子运用','情境表达'][level];}}
 function message(role,text,pinyin=''){text=toSimplified(text);const n=el('div',undefined,'conversation-message '+role);n.append(el('strong',role==='student'?'你 / Bạn':role==='feedback'?'回答评估 / Nhận xét':'AI'),el('span',text));if(pinyin){const py=el('small',pinyin,'conversation-pinyin');py.lang='zh-Latn';n.append(py);}log.append(n);return n;}
 function renderLog(scroll=null){log.replaceChildren();for(const t of model.turns.slice(0,model.cursor+1)){message('ai',t.question,t.pinyin);if(t.answer)message('student',t.answer,t.assessment?.answerPinyin||'');if(t.assessment){const a=t.assessment;const card=message('feedback',a.feedback||(a.needsCorrection?'请参考示范回答。':'回答正确！'),a.feedbackPinyin||(a.needsCorrection?'Qǐng cānkǎo shìfàn huídá.':'Huídá zhèngquè!'));if(a.needsCorrection){card.append(el('p','这句话可以这样回答：'+a.correction));const py=el('small',a.correctionPinyin,'conversation-pinyin');py.lang='zh-Latn';card.append(py);}}}if(current()?.referenceAnswer){const details=el('details',undefined,'conversation-reference');details.append(el('summary','参考回答 / Câu trả lời mẫu'),el('p',current().referenceAnswer),el('small',current().referencePinyin,'conversation-pinyin'));log.append(details);}log.scrollTop=scroll===null?log.scrollHeight:scroll;state(phase);}
 const answerRecorder=createAnswerRecorder({endpoint:()=>endpoint,onStatus:text=>{if(status)status.textContent=text;}});
 function stopListening(){captureGeneration++;clearTimeout(autoTimer);clearTimeout(endTimer);answerRecorder.cancel();if(recognition){recognition.onend=null;recognition.onerror=null;recognition.onresult=null;recognition.abort();recognition=null;}}
 function scheduleListening(){clearTimeout(autoTimer);if(root.hidden||document.hidden||phase!=='ready'||model?.pendingAction||!current())return;status.textContent='AI 已说完，1秒后自动收音…';const token=generation;autoTimer=setTimeout(()=>{if(token===generation&&!root.hidden&&!document.hidden)listen();},1000);}
 const voicePlayer=createDialogueVoice({endpoint:()=>endpoint,onStatus:text=>{if(status)status.textContent=text;},onVoice:text=>{if(voiceLabel)voiceLabel.textContent='当前朗读音色：'+text+' · 0.75 倍速';},onAudio:audio=>{voiceLabel?.after(audio);audio.onplay=()=>{if(root.hidden)return;stopListening();state('speaking');};audio.onpause=()=>{if(!root.hidden&&phase==='speaking'&&audio.paused)status.textContent='语音已暂停，请点击播放键或“再听一次”继续。';};},onManualEnd:text=>{if(root.hidden||model?.playlist[model.playIndex]!==text)return;model.playIndex++;save();void playQueue(generation);}});
 function cancel(){generation++;playRun++;stopListening();controller?.abort();controller=null;voicePlayer.stop();}
 function close(){save();cancel();root.hidden=true;}
 function home(){close();document.querySelector('#welcome').hidden=false;entry.focus();entry.scrollIntoView({behavior:'instant'});}
 async function playQueue(token){
  stopListening();const run=++playRun;state('speaking');save();
  while(model.playIndex<model.playlist.length){const text=model.playlist[model.playIndex],played=await voicePlayer.play(text);if(token!==generation||run!==playRun)return;if(!played){state('ready');save();return;}model.playIndex++;save();}
  if(token!==generation||run!==playRun)return;state('ready');save();scheduleListening();
 }
 function replayCurrent(){if(!current())return;cancel();answerRecorder.prepare();voicePlayer.unlock();if(model.playIndex>=model.playlist.length){model.playlist=[current().question];model.playIndex=0;}void playQueue(generation);}
 function appendQuestion(reply,number){model.turns.push({number,question:reply.next,pinyin:reply.nextPinyin,keywords:reply.nextKeywords,answer:'',assessment:null});if(model.turns.length>200)model.turns.shift();model.cursor=model.turns.length-1;}
 async function request(action){
  clearTimeout(autoTimer);const token=generation;model.pendingAction=action;state('loading');save();status.textContent=action==='answer'?'AI 正在回应你的回答并准备下一句…':'AI 正在围绕当前主题准备对话…';
  const messages=action==='open'?[]:questionHistory(model.turns,model.cursor,{answer:action==='answer'}),progress=action==='open'?{questionNumber:1,correctAnswers:0}:learningProgress(model.turns,model.cursor);
  controller=new AbortController();const requestController=controller,timeout=setTimeout(()=>requestController.abort(),45000);
  try{
   let result;
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lesson:context,messages,action,progress,keywords:action==='answer'?(current().keywords||[]):[]}),signal:requestController.signal,credentials:'omit'});
   if(!response.ok){const failure=await response.json().catch(()=>({}));const known={AI_TIMEOUT:'AI 响应超时，请重试。',AI_NO_NEW_QUESTION:'AI 暂未生成新的课程问题，请重试。',AI_GENERATION_FAILED:'AI 回答生成失败，请重试。'};throw Error(known[failure.code]||(response.status===429?'今天的对话次数已用完，请稍后再试。':response.status===503?'AI 服务尚未配置完成，请联系老师。':'AI 服务暂时连接失败，请重试。'));}
   result=validateReply(await response.json(),action!=='answer');if(token!==generation)return;clearTimeout(timeout);
   const number=current()?.number||0;if(action==='answer')current().assessment=result;
   if(action==='next')current().skipped=true;
   appendQuestion(result,action==='open'?1:number+1);model.pendingAction=null;model.playlist=[...(result.needsCorrection?['这句话可以这样回答：'+result.correction]:[]),result.next];model.playIndex=0;renderLog();save();await playQueue(token);
  }catch(error){if(token!==generation)return;state('error');status.textContent=error.name==='AbortError'?'AI 响应超时，请重试。':error.message;save();}finally{clearTimeout(timeout);}
 }
 function submit(text){
  if(['loading','speaking','listening'].includes(phase)||model.pendingAction||!current())return;text=toSimplified(String(text||'').trim());if(text&&!/[\p{Script=Han}]/u.test(text)){status.textContent='请用中文回答，点击“再听一次”重试。';return;}if(!text){status.textContent='没有听清，请点击“再听一次”重新回答。';return;}if(text.length>500){status.textContent='回答请控制在500字以内。';return;}
  current().answer=text;current().assessment=null;model.turns.splice(model.cursor+1);renderLog();void request('answer');
 }
 async function recordAnswer(){const token=generation,capture=++captureGeneration;state('listening');save();try{const text=await answerRecorder.start();if(token!==generation||capture!==captureGeneration)return;state('ready');if(text)submit(text);}catch(error){if(token!==generation||capture!==captureGeneration)return;state('ready');status.textContent=error.message;}}
 function listen(){
  if(phase!=='ready'||model.pendingAction||!current())return;clearTimeout(autoTimer);voicePlayer.stop();if(recordSupported){void recordAnswer();return;}if(!Recognition){status.textContent='此浏览器不支持语音录入，请使用 Chrome 或 Safari 并允许麦克风。';return;}
  const token=generation,capture=++captureGeneration;let text='',failed=false,lastResult=0;recognition=new Recognition();recognition.lang='zh-CN';recognition.continuous=true;recognition.interimResults=true;state('listening');status.textContent='正在聆听，说完停顿2秒会自动提交。';
  const arm=()=>{clearTimeout(endTimer);if(text.trim())endTimer=setTimeout(()=>recognition?.stop(),2000);};recognition.onresult=event=>{if(token!==generation||capture!==captureGeneration)return;text=Array.from(event.results).map(r=>r[0].transcript).join('').slice(0,500);lastResult=Date.now();arm();};recognition.onspeechstart=()=>clearTimeout(endTimer);recognition.onspeechend=arm;
  recognition.onerror=event=>{if(token!==generation)return;failed=true;status.textContent=event.error==='not-allowed'?'请在网站设置中允许麦克风后，点击“再听一次”。':'语音识别服务不可用，请使用支持录音的 Chrome 或 Safari。';};
  recognition.onend=()=>{if(token!==generation||capture!==captureGeneration)return;recognition=null;clearTimeout(endTimer);if(text.trim()&&!failed)endTimer=setTimeout(()=>{if(token===generation&&capture===captureGeneration){state('ready');submit(text);}},Math.max(0,2000-(Date.now()-lastResult)));else{state('ready');if(!failed)status.textContent='没有听清，请点击“再听一次”重新回答。';}};try{recognition.start();}catch{recognition=null;state('ready');status.textContent='无法启动麦克风，请检查权限后重试。';}
 }
 async function navigate(delta){if(!model||!current())return;const target=model.cursor+delta;if(target<0)return;save();cancel();model.pendingAction=null;answerRecorder.prepare();voicePlayer.unlock();if(target<model.turns.length){model.cursor=target;model.playlist=[current().question];model.playIndex=0;renderLog();save();await playQueue(generation);}else{state('ready');await request('next');}}
 function render(){
  root.replaceChildren();const header=el('div',undefined,'conversation-header'),back=el('button','返回主页 / Về trang chủ','quiet');back.type='button';back.onclick=home;header.append(el('h2','对话练习 / Luyện hội thoại'),back);position=el('p','','conversation-position');
  log=el('div',undefined,'conversation-log');log.setAttribute('role','log');log.setAttribute('aria-live','polite');log.setAttribute('aria-label','对话记录 / Hội thoại');log.addEventListener('scroll',save,{passive:true});voiceLabel=el('p','晓晓优先；设备无晓晓时使用云端中文朗读 · 0.75 倍速','note');status=el('p','','conversation-status');status.setAttribute('role','status');storageNotice=el('p','','note');
  const actions=el('div',undefined,'conversation-actions');function button(text,action){const b=el('button',text,'quiet');b.type='button';b.onclick=action;actions.append(b);return b;}
  previous=button('上一个问题 / Câu trước',()=>void navigate(-1));next=button('下一个问题 / Câu tiếp',()=>void navigate(1));next.className='primary';finish=button('说完了 / Nói xong',()=>{if(recordSupported)answerRecorder.finish();else recognition?.stop();});replay=button('再听一次 / Nghe lại',replayCurrent);restart=button('从头练习 / Luyện lại',()=>{cancel();answerRecorder.prepare();voicePlayer.unlock();model={version:1,lesson:lessonFingerprint(context),turns:[],cursor:0,pendingAction:null,playlist:[],playIndex:0,scroll:0};renderLog();void request('open');});retry=button('重试 / Thử lại',()=>{if(!endpoint)void open();else if(model.pendingAction)void request(model.pendingAction);else replayCurrent();});
  root.append(header,el('p','当前主题：'+context.title+' · 0.75 倍速','conversation-topic'),position,el('p','AI 根据当前主题主动开场，并结合你的回答继续追问。说完1秒后自动收音，开口后安静2秒自动提交。','note'),log,actions,voiceLabel,status,storageNotice,el('p','录音最多20秒，发送到 Cloudflare 识别，不在本系统保存。返回主页或退出页面立即停止收音。','note'));state('loading');
 }
 async function open(){
  if(entering||isTeacher())return;entering=true;entry.disabled=true;const entryToken=generation;let openToken;
  try{
   let selected;if(fixedLesson)selected=lessonContext(fixedLesson,'HSK1-2');else{const route=resolveBank(document.querySelector('#question-bank').value,document.querySelector('#bank-password').value);await loadCatalog();if(isTeacher()||entryToken!==generation)return;selected=lessonContext(route.id==='intro'?introExercise():getExercise(route.id,document.querySelector('#exercise-select').value),route.label);}
   cancel();openToken=generation;context=selected;key=topicSessionKey(context,document.querySelector('#identity [name="student"]')?.value||'');if(openToken!==generation)return;const candidate=readSession(storage(),key,context);const restored=candidate?.turns.some(t=>topicViolation(t.question,context))?null:candidate;model=restored||{version:1,lesson:lessonFingerprint(context),turns:[],cursor:0,pendingAction:null,playlist:[],playIndex:0,scroll:0};endpoint='';onEnter();stopFeedback();document.dispatchEvent(new CustomEvent('practice:enter',{detail:'conversation'}));for(const id of ['welcome','exercise','result','writing-practice','picture-practice','pronunciation-practice'])document.getElementById(id)?.setAttribute('hidden','');document.querySelector('#bank-error').textContent='';root.hidden=false;render();if(restored)renderLog(restored.scroll);root.focus({preventScroll:true});root.scrollIntoView({behavior:'instant'});onAuthenticatedEntry();
   controller=new AbortController();const token=generation,requestController=controller,timer=setTimeout(()=>requestController.abort(),10000);let config;try{const response=await fetch(configUrl,{cache:'no-store',signal:requestController.signal});if(!response.ok)throw Error('无法读取对话设置，请重试。');config=await response.json();}finally{clearTimeout(timer);}if(token!==generation)return;if(!config.endpoint)throw Error('对话服务尚未开通，请联系老师。');const url=new URL(config.endpoint,location.href);if(url.protocol!=='https:'||url.username||url.password)throw Error('对话服务地址无效，请联系老师。');endpoint=url.href;
   if(model.pendingAction)await request(model.pendingAction);else if(!current())await request('open');else{if(model.playIndex>=model.playlist.length){model.playlist=[current().question];model.playIndex=0;}await playQueue(token);}
  }catch(error){if(openToken!==undefined&&openToken!==generation)return;if(!root.hidden&&status){state('error');status.textContent=error.name==='AbortError'?'加载超时，请重试。':error.message;}else document.querySelector('#bank-error').textContent=error.message;}finally{entering=false;entry.disabled=false;}
 }
 entry.onclick=()=>{answerRecorder.prepare();voicePlayer.unlock();void open();};document.addEventListener('practice:enter',event=>{if(event.detail!=='conversation')close();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&!root.hidden){save();cancel();state(model?.pendingAction?'error':'ready');status.textContent='对话已暂停，请点击“再听一次”继续。';}});window.addEventListener('pagehide',()=>{save();cancel();});return {close};
}


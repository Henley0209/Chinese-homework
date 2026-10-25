import {canRecord,createAnswerRecorder} from './conversation-recorder.mjs?v=auto1';
import {resolveBank} from './bank-access.mjs?v=banks-8';
import {loadCatalog,getExercise,introExercise} from './exercise-store.mjs?v=hsk4-40';
import {stopFeedback} from './result-feedback.mjs?v=writing21';
import {createDialogueVoice} from './conversation-voice.mjs?v=auto1';
import {lessonContext,validateReply,spokenReply} from './conversation-core.mjs?v=conversation1';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
export function initConversation({onEnter=()=>{},onAuthenticatedEntry=()=>{},fixedLesson=null,configUrl='./conversation-config.json',isTeacher=()=>document.querySelector('#user-role')?.value==='teacher'}={}){
 const root=document.querySelector('#conversation-practice'),entry=document.querySelector('#practice-conversation');if(!root||!entry)return;
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition,recordSupported=canRecord();
 let generation=0,captureGeneration=0,controller,recognition,autoTimer,endTimer,phase='idle',context,history=[],reply,lastSpeech='',endpoint='',entering=false,autoEnabled=true;
 let log,status,start,finish,replay,retry,voiceLabel,pause;
 function state(value){phase=value;const busy=['loading','speaking','listening'].includes(phase),pending=history.at(-1)?.role==='user';start.disabled=busy||pending||(!Recognition&&!recordSupported)||!reply;finish.hidden=phase!=='listening';replay.disabled=busy||!lastSpeech;retry.hidden=busy||!(phase==='error'||pending);pause.textContent=autoEnabled?'暂停自动收音 / Tạm dừng':'恢复自动收音 / Tiếp tục';}
 function message(role,text){const n=el('div',undefined,'conversation-message '+role);n.append(el('strong',role==='student'?'你 / Bạn':role==='feedback'?'回答评估 / Nhận xét':'AI'),el('span',text));log.append(n);log.scrollTop=log.scrollHeight;}
 const answerRecorder=createAnswerRecorder({endpoint:()=>endpoint,onStatus:text=>{if(status)status.textContent=text;}});
 function stopListening(){captureGeneration++;clearTimeout(autoTimer);clearTimeout(endTimer);answerRecorder.cancel();if(recognition){recognition.onend=null;recognition.onerror=null;recognition.onresult=null;recognition.abort();recognition=null;}}
 function scheduleListening(){clearTimeout(autoTimer);if(!autoEnabled||root.hidden||document.hidden||phase!=='ready'||history.at(-1)?.role!=='assistant')return;status.textContent='AI 已说完，1秒后自动收音…';const token=generation;autoTimer=setTimeout(()=>{if(token===generation&&autoEnabled&&!root.hidden&&!document.hidden)listen();},1000);}
 const voicePlayer=createDialogueVoice({endpoint:()=>endpoint,onStatus:text=>{if(status)status.textContent=text;},onVoice:text=>{if(voiceLabel)voiceLabel.textContent='当前朗读音色：'+text+' · 0.75 倍速';},onAudio:audio=>{voiceLabel?.after(audio);audio.addEventListener('play',()=>{stopListening();state('speaking');});audio.addEventListener('ended',()=>{if(root.hidden)return;state('ready');scheduleListening();});audio.addEventListener('pause',()=>{if(phase==='speaking'&&audio.paused){state('ready');status.textContent='播放已暂停。可点击播放键继续，或点击“开始对话”回答。';}});}});
 function cancel(){generation++;stopListening();controller?.abort();controller=null;voicePlayer.stop();}
 function close(){cancel();root.hidden=true;}
 function home(){close();document.querySelector('#welcome').hidden=false;entry.focus();entry.scrollIntoView({behavior:'instant'});}
 async function speak(text,token){stopListening();lastSpeech=text;state('speaking');const played=await voicePlayer.play(text);if(token!==generation)return;state('ready');if(played){if(autoEnabled)scheduleListening();else status.textContent='自动收音已暂停。';}}
 async function request(){
  clearTimeout(autoTimer);const token=generation;state('loading');status.textContent=history.length?'AI 正在评估回答… / AI đang nhận xét…':'正在根据练习准备对话主题… / Đang chuẩn bị chủ đề…';
  controller=new AbortController();const requestController=controller,timeout=setTimeout(()=>requestController.abort(),45000);
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lesson:context,messages:history.slice(-20)}),signal:requestController.signal,credentials:'omit'});
   if(!response.ok)throw Error(response.status===429?'今天的对话次数已用完，请稍后再试。':response.status===503?'AI 服务尚未配置完成，请联系老师。':'AI 暂时无法回答，请重试。');
   const opening=history.length===0,result=validateReply(await response.json(),opening);if(token!==generation)return;reply=result;
   if(!opening)message('feedback',result.feedback+(result.needsCorrection?'\n这句话可以这样回答：'+result.correction:'\n回答正确！'));
   message('ai',result.next);history.push({role:'assistant',content:result.next});clearTimeout(timeout);await speak(spokenReply(result),token);
  }catch(error){if(token!==generation)return;state('error');status.textContent=error.name==='AbortError'?'AI 响应超时，请重试。':error.message;}
  finally{clearTimeout(timeout);}
 }
 function submit(text){
  if(['loading','speaking','listening'].includes(phase)||!reply||history.at(-1)?.role==='user')return;
  text=String(text||'').trim();if(!text){status.textContent='没有听清，请点击“开始对话”重新回答。';return;}
  if(text.length>500){status.textContent='回答请控制在500字以内。';return;}message('student',text);history.push({role:'user',content:text});void request();
 }
 async function recordAnswer(){
  const token=generation,capture=++captureGeneration;state('listening');
  try{const text=await answerRecorder.start();if(token!==generation||capture!==captureGeneration)return;state('ready');if(text)submit(text);}
  catch(error){if(token!==generation||capture!==captureGeneration)return;state('ready');status.textContent=error.message;}
 }
 function listen(){
  if(phase!=='ready'||history.at(-1)?.role==='user'||!reply)return;clearTimeout(autoTimer);voicePlayer.stop();
  if(recordSupported){void recordAnswer();return;}if(!Recognition)return;
  const token=generation,capture=++captureGeneration;let text='',failed=false,lastResult=0;recognition=new Recognition();recognition.lang='zh-CN';recognition.continuous=true;recognition.interimResults=true;state('listening');status.textContent='正在聆听，说完停顿3秒会自动提交。';
  const arm=()=>{clearTimeout(endTimer);if(text.trim())endTimer=setTimeout(()=>recognition?.stop(),3000);};
  recognition.onresult=event=>{if(token!==generation||capture!==captureGeneration)return;text=Array.from(event.results).map(r=>r[0].transcript).join('').slice(0,500);lastResult=Date.now();arm();};
  recognition.onspeechstart=()=>clearTimeout(endTimer);recognition.onspeechend=arm;
  recognition.onerror=event=>{if(token!==generation)return;failed=true;status.textContent=event.error==='not-allowed'?'请在网站设置中允许麦克风后重新开始。':'语音识别服务不可用，请使用支持录音的 Chrome 或 Safari。';};
  recognition.onend=()=>{if(token!==generation||capture!==captureGeneration)return;recognition=null;clearTimeout(endTimer);if(text.trim()&&!failed){endTimer=setTimeout(()=>{if(token===generation&&capture===captureGeneration){state('ready');submit(text);}},Math.max(0,3000-(Date.now()-lastResult)));}else{state('ready');if(!failed)status.textContent='没有听清，请点击“开始对话”重新回答。';}};
  try{recognition.start();}catch{recognition=null;state('ready');status.textContent='无法启动麦克风，请检查权限后重试。';}
 }
 function render(){
  root.replaceChildren();const header=el('div',undefined,'conversation-header'),back=el('button','返回主页 / Về trang chủ','quiet');back.type='button';back.onclick=home;header.append(el('h2','对话练习 / Luyện hội thoại'),back);
  log=el('div',undefined,'conversation-log');log.setAttribute('role','log');log.setAttribute('aria-live','polite');log.setAttribute('aria-label','对话记录 / Hội thoại');voiceLabel=el('p','晓晓优先；设备无晓晓时使用云端中文朗读 · 0.75 倍速','note');status=el('p','','conversation-status');status.setAttribute('role','status');
  const actions=el('div',undefined,'conversation-actions');function button(text,action){const b=el('button',text,'quiet');b.type='button';b.onclick=action;actions.append(b);return b;}
  start=button('开始对话 / Bắt đầu',()=>{answerRecorder.prepare();autoEnabled=true;state('ready');listen();});start.className='primary';
  finish=button('说完了 / Nói xong',()=>{if(recordSupported)answerRecorder.finish();else recognition?.stop();});
  replay=button('再听一次 / Nghe lại',()=>{voicePlayer.unlock();void speak(lastSpeech,generation);});
  pause=button('暂停自动收音 / Tạm dừng',()=>{autoEnabled=!autoEnabled;if(!autoEnabled){stopListening();if(phase==='listening')state('ready');else state(phase);status.textContent='自动收音已暂停。';}else{answerRecorder.prepare();state(phase);scheduleListening();}});
  retry=button('重试 / Thử lại',()=>{if(endpoint)void request();else void open();});
  root.append(header,el('p','当前主题：'+context.title+' · 中文朗读 · 0.75 倍速','conversation-topic'),el('p','AI 说完1秒后自动收音；说话后安静3秒，自动识别并评估。 / AI nói xong, micro tự bật sau 1 giây. Ngừng nói 3 giây để gửi câu trả lời.','note'),log,actions,voiceLabel,status,el('p','首次使用需允许麦克风。录音最多20秒，发送到 Cloudflare 识别，不在本系统保存。可随时暂停自动收音或返回主页。','note'));
  if(!recordSupported&&!Recognition)root.append(el('p','此浏览器不支持语音录入，请使用允许麦克风的 Chrome 或 Safari。','note'));state('loading');
 }
 async function open(){
  if(entering||isTeacher())return;entering=true;entry.disabled=true;let openToken;const entryToken=generation;
  try{
   let selected;if(fixedLesson)selected=lessonContext(fixedLesson,'HSK1-2');else{const route=resolveBank(document.querySelector('#question-bank').value,document.querySelector('#bank-password').value);await loadCatalog();if(isTeacher()||entryToken!==generation)return;selected=lessonContext(route.id==='intro'?introExercise():getExercise(route.id,document.querySelector('#exercise-select').value),route.label);}
   cancel();openToken=generation;context=selected;history=[];reply=null;lastSpeech='';endpoint='';autoEnabled=true;onEnter();stopFeedback();document.dispatchEvent(new CustomEvent('practice:enter',{detail:'conversation'}));for(const id of ['welcome','exercise','result','writing-practice','picture-practice','pronunciation-practice'])document.getElementById(id)?.setAttribute('hidden','');document.querySelector('#bank-error').textContent='';root.hidden=false;render();root.focus({preventScroll:true});root.scrollIntoView({behavior:'instant'});onAuthenticatedEntry();
   controller=new AbortController();const token=generation,requestController=controller,timer=setTimeout(()=>requestController.abort(),10000);let config;try{const response=await fetch(configUrl,{cache:'no-store',signal:requestController.signal});if(!response.ok)throw Error('无法读取对话设置，请重试。');config=await response.json();}finally{clearTimeout(timer);}
   if(token!==generation)return;if(!config.endpoint)throw Error('对话服务尚未开通，请联系老师。');const url=new URL(config.endpoint,location.href);if(url.protocol!=='https:'||url.username||url.password)throw Error('对话服务地址无效，请联系老师。');endpoint=url.href;await request();
  }catch(error){if(openToken!==undefined&&openToken!==generation)return;if(!root.hidden&&status){state('error');status.textContent=error.name==='AbortError'?'加载超时，请重试。':error.message;}else document.querySelector('#bank-error').textContent=error.message;}finally{entering=false;entry.disabled=false;}
 }
 entry.onclick=()=>{answerRecorder.prepare();voicePlayer.unlock();void open();};document.addEventListener('practice:enter',event=>{if(event.detail!=='conversation')close();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&!root.hidden){const pending=phase==='loading';cancel();state(pending?'error':'ready');status.textContent='对话已暂停，请点击“开始对话”继续。';}});window.addEventListener('pagehide',close);return {close};
}

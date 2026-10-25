import {resolveBank} from './bank-access.mjs?v=banks-8';
import {loadCatalog,getExercise,introExercise} from './exercise-store.mjs?v=hsk4-40';
import {teacherActive} from './teacher-tools.mjs?v=pageviews1';
import {stopFeedback} from './result-feedback.mjs?v=writing21';
import {isMandarin} from './listening/speech.mjs';
import {lessonContext,validateReply,spokenReply} from './conversation-core.mjs?v=conversation1';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
export function initConversation({onEnter=()=>{},onAuthenticatedEntry=()=>{}}={}){
 const root=document.querySelector('#conversation-practice'),entry=document.querySelector('#practice-conversation');if(!root||!entry)return;
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 let generation=0,controller,recognition,speechDone,speechTimer,phase='idle',context,history=[],reply,lastSpeech='',endpoint='',entering=false;
 let log,status,start,finish,replay,retry,answer,send;
 function state(value){phase=value;const busy=['loading','speaking','listening'].includes(phase),pending=history.at(-1)?.role==='user';start.disabled=busy||pending||!Recognition||!reply;finish.hidden=phase!=='listening';replay.disabled=busy||!lastSpeech;send.disabled=busy||pending||!reply;answer.disabled=busy||pending;retry.hidden=busy||!(phase==='error'||pending);}
 function message(role,text){const n=el('div',undefined,'conversation-message '+role);n.append(el('strong',role==='student'?'你 / Bạn':role==='feedback'?'回答评估 / Nhận xét':'AI'),el('span',text));log.append(n);log.scrollTop=log.scrollHeight;}
 function stopSpeech(){clearTimeout(speechTimer);const done=speechDone;speechDone=null;window.speechSynthesis?.cancel();done?.();}
 function cancel(){generation++;controller?.abort();controller=null;if(recognition){recognition.onend=null;recognition.onerror=null;recognition.onresult=null;recognition.abort();recognition=null;}stopSpeech();}
 function close(){cancel();root.hidden=true;}
 function home(){close();document.querySelector('#welcome').hidden=false;entry.focus();entry.scrollIntoView({behavior:'instant'});}
 async function speak(text,token){
  lastSpeech=text;state('speaking');
  if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){status.textContent='此浏览器不支持朗读，请阅读对话文字。 / Trình duyệt không hỗ trợ giọng đọc.';state('ready');return;}
  status.textContent='AI 正在说话… / AI đang nói…';
  if(!speechSynthesis.getVoices().length)await new Promise(resolve=>{let timer;const done=()=>{clearTimeout(timer);speechSynthesis.removeEventListener?.('voiceschanged',done);resolve();};timer=setTimeout(done,1500);speechSynthesis.addEventListener?.('voiceschanged',done,{once:true});});
  if(token!==generation)return;
  // A complete correction and follow-up are spoken in order, before enabling the mic.
  await new Promise(resolve=>{
   const done=()=>{clearTimeout(speechTimer);if(speechDone===done)speechDone=null;resolve();};speechDone=done;
   const utterance=new SpeechSynthesisUtterance(text);utterance.lang='zh-CN';utterance.rate=.85;
   const voice=speechSynthesis.getVoices().find(v=>isMandarin(v)&&/xiaoxiao|晓晓|曉曉/i.test(v.name));
   if(!voice){status.textContent='当前设备未提供晓晓女声，请使用支持 Microsoft Xiaoxiao 音色的设备或浏览器。';done();return;}utterance.voice=voice;
   utterance.onend=done;utterance.onerror=()=>{if(token===generation)status.textContent='朗读未完成，请点击“再听一次”。 / Chạm “Nghe lại” để nghe.';done();};
   speechTimer=setTimeout(()=>{if(token===generation)status.textContent='朗读超时，请点击“再听一次”。';speechSynthesis.cancel();done();},60000);
   try{speechSynthesis.speak(utterance);}catch{status.textContent='无法自动朗读，请点击“再听一次”。 / Chạm “Nghe lại”.';done();}
  });
  if(token!==generation)return;state('ready');if(status.textContent==='AI 正在说话… / AI đang nói…')status.textContent='点击“开始对话”用中文回答。 / Chạm “Bắt đầu” và trả lời bằng tiếng Trung.';
 }
 async function request(){
  const token=generation;state('loading');status.textContent=history.length?'AI 正在评估回答… / AI đang nhận xét…':'正在根据练习准备对话主题… / Đang chuẩn bị chủ đề…';
  controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),45000);
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lesson:context,messages:history.slice(-20)}),signal:controller.signal,credentials:'omit'});
   if(!response.ok)throw Error(response.status===429?'今天的对话次数已用完，请稍后再试。':response.status===503?'AI 服务尚未配置完成，请联系老师。':'AI 暂时无法回答，请重试。');
   const opening=history.length===0,result=validateReply(await response.json(),opening);if(token!==generation)return;
   reply=result;
   if(!opening)message('feedback',result.feedback+(result.needsCorrection?'\n这句话可以这样回答：'+result.correction:'\n回答正确！'));
   message('ai',result.next);history.push({role:'assistant',content:result.next});
   await speak(spokenReply(result),token);
  }catch(error){if(token!==generation)return;state('error');status.textContent=error.name==='AbortError'?'AI 响应超时，请重试。 / Hết thời gian chờ, hãy thử lại.':error.message;}
  finally{clearTimeout(timeout);}
 }
 function submit(){
  if(['loading','speaking','listening'].includes(phase)||!reply)return;
  const text=answer.value.trim();if(!text){status.textContent='请先说话或输入回答。 / Hãy nói hoặc nhập câu trả lời.';return;}
  if(text.length>500){status.textContent='回答请控制在500字以内。';return;}
  // An unsuccessful turn must be retried rather than adding another student turn.
  if(history.at(-1)?.role==='user')return;
  message('student',text);history.push({role:'user',content:text});answer.value='';void request();
 }
 function listen(){
  if(phase!=='ready'||history.at(-1)?.role==='user'||!Recognition||!reply)return;
  stopSpeech();const token=generation;let text='',failed=false;recognition=new Recognition();recognition.lang='zh-CN';recognition.continuous=false;recognition.interimResults=true;recognition.maxAlternatives=1;state('listening');status.textContent='正在听，请用中文回答；说完稍作停顿或点击“说完了”。 / Đang nghe…';
  recognition.onresult=event=>{if(token!==generation)return;text=Array.from(event.results).map(r=>r[0].transcript).join('').slice(0,500);answer.value=text;};
  recognition.onerror=event=>{if(token!==generation)return;failed=true;status.textContent=event.error==='not-allowed'?'麦克风权限未开启，请允许使用麦克风，或输入回答。 / Hãy cho phép micro hoặc nhập câu trả lời.':'未能识别语音，请重试或输入回答。 / Hãy thử lại hoặc nhập câu trả lời.';};
  recognition.onend=()=>{if(token!==generation)return;recognition=null;state('ready');if(text.trim()&&!failed)submit();else if(!failed)status.textContent='没有听清，请重新开始或输入回答。 / Chưa nghe rõ, hãy thử lại.';};
  try{recognition.start();}catch{recognition=null;state('ready');status.textContent='无法启动麦克风，请重试或输入回答。';}
 }
 function render(){
  root.replaceChildren();const header=el('div',undefined,'conversation-header'),back=el('button','返回主页 / Về trang chủ','quiet');back.type='button';back.onclick=home;header.append(el('h2','对话练习 / Luyện hội thoại'),back);
  log=el('div',undefined,'conversation-log');log.setAttribute('role','log');log.setAttribute('aria-live','polite');log.setAttribute('aria-label','对话记录 / Hội thoại');
  status=el('p','','conversation-status');status.setAttribute('role','status');
  const actions=el('div',undefined,'conversation-actions');
  function button(text,action){const b=el('button',text,'quiet');b.type='button';b.onclick=action;actions.append(b);return b;}
  start=button('开始对话 / Bắt đầu',listen);start.className='primary';finish=button('说完了 / Nói xong',()=>recognition?.stop());replay=button('再听一次 / Nghe lại',()=>void speak(lastSpeech,generation));retry=button('重试 / Thử lại',()=>{if(endpoint)void request();else void open();});
  const form=el('form',undefined,'conversation-answer'),label=el('label','也可以输入回答 / Hoặc nhập câu trả lời');answer=el('textarea');answer.id='conversation-answer';answer.maxLength=500;label.htmlFor=answer.id;send=el('button','发送回答 / Gửi câu trả lời','primary');send.type='submit';form.append(label,answer,send);form.onsubmit=e=>{e.preventDefault();submit();};
  root.append(header,el('p','当前主题：'+context.title,'conversation-topic'),el('p','AI 先说，你来回答；有误时会朗读示范，再继续对话。 / AI nói trước, bạn trả lời; AI sửa câu và tiếp tục hội thoại.','note'),log,actions,form,status,el('p','语音识别可能使用浏览器提供商的在线服务；识别文字和本课内容会发送给 AI。评估针对识别文字的语法与内容，不是发音评分。对话不在本系统持久保存。 / Văn bản nhận dạng và nội dung bài học được gửi đến AI để nhận xét.','note'));
  if(!Recognition)root.append(el('p','此浏览器不支持语音识别，可输入回答；建议使用支持语音识别的 Chrome。 / Có thể nhập câu trả lời.','note'));
  state('loading');
 }
 async function open(){
  if(entering||teacherActive())return;entering=true;entry.disabled=true;let openToken;const entryToken=generation;
  try{
   const route=resolveBank(document.querySelector('#question-bank').value,document.querySelector('#bank-password').value);await loadCatalog();if(teacherActive()||entryToken!==generation)return;
   const exercise=route.id==='intro'?introExercise():getExercise(route.id,document.querySelector('#exercise-select').value);
   cancel();openToken=generation;context=lessonContext(exercise,route.label);history=[];reply=null;lastSpeech='';endpoint='';
   onEnter();stopFeedback();document.dispatchEvent(new CustomEvent('practice:enter',{detail:'conversation'}));for(const id of ['welcome','exercise','result','writing-practice','picture-practice','pronunciation-practice'])document.getElementById(id)?.setAttribute('hidden','');
   document.querySelector('#bank-error').textContent='';root.hidden=false;render();root.focus({preventScroll:true});root.scrollIntoView({behavior:'instant'});onAuthenticatedEntry();
   const token=generation;controller=new AbortController();const timer=setTimeout(()=>controller?.abort(),10000);
   let config;try{const response=await fetch('./conversation-config.json?v=conversation1',{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error('无法读取对话设置，请重试。');config=await response.json();}finally{clearTimeout(timer);}
   if(token!==generation)return;
   if(!config.endpoint)throw Error('对话服务尚未开通，请联系老师。 / Chức năng hội thoại chưa được kích hoạt.');
   const url=new URL(config.endpoint,location.href);if(url.protocol!=='https:'||url.username||url.password)throw Error('对话服务地址无效，请联系老师。');endpoint=url.href;await request();
  }catch(error){if(openToken!==undefined&&openToken!==generation)return;if(!root.hidden&&status){state('error');status.textContent=error.name==='AbortError'?'加载超时，请重试。':error.message;}else document.querySelector('#bank-error').textContent=error.message;}
  finally{entering=false;entry.disabled=false;}
 }
 entry.onclick=()=>void open();
 document.addEventListener('practice:enter',event=>{if(event.detail!=='conversation')close();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&!root.hidden){const pending=phase==='loading';cancel();state(pending?'error':'ready');status.textContent=pending?'请求已暂停，请点击重试。':'对话已暂停，点击开始对话继续。';}});
 window.addEventListener('pagehide',close);return {close};
}

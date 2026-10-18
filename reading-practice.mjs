import {resolveReadingAccess,findReadingPassage} from './reading-access.mjs?v=reading1';
import {createReadingRecognition} from './reading-recognition.mjs?v=reading1';
import {scoreReading} from './reading-score.mjs?v=reading1';
import {loadCatalog,getExercise} from './exercise-store.mjs?v=hsk4-40';
import {stopFeedback} from './result-feedback.mjs?v=writing21';
import {recordLogin} from './visit-counter.mjs?v=visits15';
const $=s=>document.querySelector(s);
export function initReading({onEnter=()=>{},isTeacher=()=>false}={}){
 const root=$('#reading-practice'),entry=$('#practice-reading');if(!root||!entry)return;
 let loading=false,version=0,passage,session,nodes;
 const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 function button(id,zh,vi,action,cls='primary'){
  const b=make('button',undefined,cls+' bilingual');b.id=id;b.type='button';b.append(make('span',zh),make('small',vi));b.lastChild.lang='vi';b.onclick=action;return b;
 }
 function status(text){nodes.status.textContent=text;}
 function clearResult(){nodes.result.hidden=true;nodes.result.replaceChildren();}
 function changeView(value){
  nodes.passage.textContent=passage[value];nodes.passage.lang=value==='vietnamese'?'vi':value==='pinyin'?'zh-Latn':'zh-CN';
  nodes.passage.className='reading-passage reading-'+value;
  for(const [key,b]of Object.entries(nodes.views))b.setAttribute('aria-pressed',String(key===value));
 }
 function reset(){session.cancel();clearResult();nodes.transcript.textContent='';status('已清空上次识别，请点击“开始阅读”。 / Đã xóa lần trước. Nhấn “Bắt đầu đọc”.');}
 function start(){clearResult();session.start();}
 function showScore(transcript){
  let result;try{result=scoreReading(passage.chinese,transcript);}catch(error){status(error.message);return;}
  const score=make('div',result.score+' / 100','reading-score');score.setAttribute('aria-label',`朗读内容参考分 ${result.score} 分`);
  const detail=make('div',undefined,'reading-differences');
  for(const part of result.differences){const content=part.type==='extra'?'［＋'+part.heard+'］':part.expected;const n=make('span',content,'reading-diff-'+part.type);
   if(part.type!=='correct'){n.title=part.type==='missing'?'未识别到：'+part.expected:part.type==='extra'?'额外识别：'+part.heard:'课文字：'+part.expected+'；识别字：'+part.heard;n.setAttribute('aria-label',n.title);}detail.append(n);
  }
  nodes.result.replaceChildren(make('h3','朗读内容参考分 / Điểm tham khảo nội dung đọc'),score,
   make('p',`一致 ${result.counts.correct} 字 · 差异 ${result.counts.substitution} 字 · 未识别 ${result.counts.missing} 字 · 多识别 ${result.counts.extra} 字`),
   make('p','绿色：识别一致；红色：识别差异或未识别；橙色：额外识别。识别结果可能有误，请结合实际朗读查看。','note'),detail,
   make('p','本分数比较识别内容与中文原文，不评价声调、声母或韵母。 / Điểm này so sánh nội dung nhận dạng với bài gốc, không đánh giá thanh điệu hay âm vị.','reading-score-note'));
  nodes.result.hidden=false;status('评分完成。可点击“重新阅读”再试一次。 / Đã chấm điểm. Bạn có thể đọc lại.');
 }
 function render(){
  root.replaceChildren();nodes={};
  const header=make('div',undefined,'reading-header');header.append(make('div',undefined,'reading-heading'));
  header.firstChild.append(make('span','练习发音 · Luyện phát âm','eyebrow'),make('h2',passage.title),make('p',passage.vietnameseTitle));
  header.append(button('reading-back','返回题库','Về ngân hàng câu hỏi',()=>{version++;session?.cancel();root.hidden=true;$('#welcome').hidden=false;$('#welcome').scrollIntoView({behavior:'smooth'});},'quiet'));
  nodes.passage=make('div',undefined,'reading-passage');nodes.passage.id='reading-text';nodes.passage.tabIndex=0;
  const controls=make('div',undefined,'reading-controls');controls.setAttribute('aria-label','朗读练习操作 / Điều khiển luyện đọc');
  nodes.start=button('reading-start','开始阅读','Bắt đầu đọc',start);
  nodes.score=button('reading-score','打分','Cho điểm',()=>session.requestScore());
  const again=button('reading-again','重新阅读','Đọc lại',reset);
  nodes.views={pinyin:button('reading-pinyin','显示拼音','Hiển thị phiên âm',()=>changeView('pinyin'),'quiet'),vietnamese:button('reading-vietnamese','显示越南语','Hiển thị tiếng Việt',()=>changeView('vietnamese'),'quiet'),chinese:button('reading-chinese','显示中文','Hiển thị tiếng Trung',()=>changeView('chinese'),'quiet')};
  controls.append(nodes.start,nodes.score,again,nodes.views.pinyin,nodes.views.vietnamese,nodes.views.chinese);
  nodes.status=make('p','','reading-status');nodes.status.setAttribute('role','status');nodes.status.setAttribute('aria-live','polite');
  nodes.transcript=make('p','','reading-transcript');nodes.transcript.id='reading-transcript';nodes.transcript.setAttribute('aria-live','polite');
  nodes.result=make('section',undefined,'reading-result');nodes.result.hidden=true;nodes.result.setAttribute('aria-live','polite');
  root.append(header,make('p',`${passage.hanziCount}字（不含标点） · 试用课文 / Bài đọc dùng thử`,'note'),nodes.passage,controls,
   make('p','点击“开始阅读”后，允许使用麦克风并朗读整篇课文；读完点击“打分”。“重新阅读”会清空上次识别。 / Cho phép micrô, đọc hết bài rồi nhấn “Cho điểm”. “Đọc lại” sẽ xóa lần trước.','note'),
   make('p','本试用版仅提供朗读内容参考分，不评估声调或具体发音。语音识别可能由浏览器厂商在线处理，需要网络连接。 / Chỉ chấm nội dung đọc, không đánh giá phát âm. Dịch vụ của trình duyệt có thể xử lý giọng nói trực tuyến.','reading-score-note'),nodes.status,make('h3','识别内容 / Nội dung nhận dạng'),nodes.transcript,nodes.result);
  const Recognition=globalThis.SpeechRecognition||globalThis.webkitSpeechRecognition;
  session=createReadingRecognition({Recognition,onTranscript:text=>{nodes.transcript.textContent=text;nodes.score.disabled=session?.state==='stopping'||(!text.trim()&&session?.state!=='listening');},
   onState:state=>{
    nodes.start.disabled=!Recognition||state==='listening'||state==='stopping';nodes.score.disabled=!Recognition||state==='stopping'||(state!=='listening'&&!session?.transcript.trim());
    if(state==='listening')status('正在听你朗读，请读中文原文。 / Đang nghe, hãy đọc bài gốc tiếng Trung.');
    else if(state==='stopping')status('正在结束识别并计算参考分… / Đang hoàn tất nhận dạng và chấm điểm…');
    else if(state==='recorded')status('识别已结束，请点击“打分”。 / Nhận dạng đã kết thúc. Nhấn “Cho điểm”.');
   },onScore:showScore,onError:text=>{clearResult();status(text);}});
  nodes.start.disabled=!Recognition;nodes.score.disabled=true;again.disabled=!Recognition;changeView('chinese');
  status(Recognition?'准备好后点击“开始阅读”。 / Nhấn “Bắt đầu đọc” khi sẵn sàng.':'当前浏览器不支持中文语音识别。你仍可查看中文、拼音和越南语；请换用支持语音识别的Chrome或Edge试读。 / Trình duyệt chưa hỗ trợ nhận dạng giọng nói.');
 }
 async function enter(){
  if(loading)return;
  const token=++version;let access,name;
  const error=$('#bank-error');error.textContent='';
  try{
   if(isTeacher())throw Error('请切换为学生用户后练习朗读。');
   name=String(new FormData($('#identity')).get('student')||'').trim();if(!name)throw Error('请先填写学生姓名。 / Vui lòng nhập họ tên.');
   access=resolveReadingAccess($('#question-bank').value,$('#bank-password').value,$('#exercise-select').value);
   loading=true;entry.disabled=true;$('#bank-loading').textContent='正在加载朗读课文… / Đang tải bài đọc…';
   await loadCatalog();getExercise(access.id,access.exerciseId);
   const response=await fetch('./reading/passages.json?v=reading1',{cache:'no-store'});if(!response.ok)throw Error('课文加载失败，请重试。 / Không tải được bài đọc.');
   const selected=findReadingPassage(await response.json(),access.id,access.exerciseId);
   if(token!==version||isTeacher())return;
   onEnter();session?.cancel();stopFeedback();document.dispatchEvent(new CustomEvent('practice:enter',{detail:'reading'}));
   passage=selected;$('#welcome').hidden=true;$('#exercise').hidden=true;$('#result').hidden=true;const writing=$('#writing-practice');if(writing)writing.hidden=true;
   root.hidden=false;render();recordLogin('student');root.focus();root.scrollIntoView({behavior:'smooth'});
  }catch(err){if(token===version)error.textContent=err.message;}
  finally{loading=false;entry.disabled=false;$('#bank-loading').textContent='';}
 }
 entry.onclick=enter;
 document.addEventListener('practice:enter',event=>{if(event.detail!=='reading'){version++;session?.cancel();root.hidden=true;}});
 function interrupt(){if(!root.hidden&&session&&(session.state==='listening'||session.state==='stopping')){reset();status('页面离开后已停止录音，请重新开始阅读。 / Đã dừng micrô. Hãy bắt đầu lại.');}}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt();});
 window.addEventListener('pagehide',interrupt);
 return {close:()=>{version++;session?.cancel();root.hidden=true;}};
}

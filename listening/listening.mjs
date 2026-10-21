import {categories,generateQuestions} from './bank300.mjs?v=bank300v1';
import {questionSegments} from './speech.mjs?v=natural3';
import {createRecordedPlayer} from './recorded-player.mjs?v=autoplay6';
import {createListeningProgress} from './progress.mjs?v=bank300v1';
const root=document.querySelector('#listening-app'),back=document.querySelector('#listening-categories'),intro=document.querySelector('.listening-intro');
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const button=(text,fn,cls='quiet')=>{const b=el('button',text,cls);b.type='button';b.onclick=fn;return b;};
let category=null,questions=[],index=0,answers=[],rate=.8,status,saveStatus,finished=false;
let storage;try{storage=window.localStorage;}catch{}
const progressStore=createListeningProgress(storage);
const player=createRecordedPlayer({onStatus:text=>{if(status)status.textContent=text;}});
function stop(){player.stop();}
function answeredCount(){return answers.filter(Number.isInteger).length;}
function saveCurrent(){
 if(!category)return true;
 const saved=progressStore.save(category.id,{questions,index,answers,finished,rate});
 if(saveStatus)saveStatus.textContent=saved?'进度已保存 / Đã lưu tiến độ':'此浏览器无法保存进度，请允许本地存储。 / Hãy cho phép lưu trữ trên trình duyệt.';
 return saved;
}
function setView(practice){back.hidden=!practice;intro.hidden=practice;document.body.classList.toggle('is-listening-practice',practice);}
function setHash(value){const url=new URL(location.href);url.hash=value;history.replaceState(null,'',url);}
function focus(){root.focus({preventScroll:true});root.scrollIntoView({behavior:'instant',block:'start'});}
function toolbar(title){const h=el('div',undefined,'listening-toolbar');h.append(el('h2',title));root.append(h);}
function showCategories(){
 saveCurrent();stop();category=null;status=null;saveStatus=null;setView(false);setHash('categories');root.replaceChildren(el('h2','选择听力分类 / Chọn chủ đề'));
 const grid=el('div',undefined,'listening-categories');
 for(const c of categories){
  const b=button('',()=>enter(c,{autoplay:true}),'listening-category'),icon=el('span',c.icon,'icon');icon.setAttribute('aria-hidden','true');
  const vi=el('span',c.vi);vi.lang='vi';const saved=progressStore.load(c.id);b.append(icon,el('strong',c.zh),vi,el('small',`${c.questionCount} 题 / câu`));
  if(saved)b.append(el('small',saved.finished?'已完成 / Đã xong':`继续第 ${saved.index+1} 题 / Tiếp câu ${saved.index+1}`));grid.append(b);
 }
 root.append(grid,el('p','每类 300 题，单人朗读和双人对话依次交替；进度自动保存在当前浏览器。 / Mỗi chủ đề 300 câu, xen kẽ một người và hội thoại hai người; tự lưu tiến độ.','note'));focus();
}
function enter(c,{autoplay=true}={}){
 if(category)saveCurrent();stop();category=c;setView(true);setHash(c.id);
 const saved=progressStore.load(c.id);
 if(saved){({questions,index,answers,finished,rate}=saved);}
 else{questions=generateQuestions(c.id);index=0;answers=Array(questions.length).fill(null);finished=false;rate=.8;}
 if(finished){finish();return;}
 render();saveCurrent();if(autoplay)readQuestion();else status.textContent=saved?'已恢复上次练习，点击“再听一次”播放。 / Đã khôi phục bài trước, chạm “Nghe lại”.':'点击“再听一次”播放题目。 / Chạm “Nghe lại” để nghe câu hỏi.';
}
function restart(){stop();questions=generateQuestions(category.id,{randomize:true});answers=Array(questions.length).fill(null);index=0;finished=false;rate=.8;render();saveCurrent();readQuestion();}
function readQuestion(){const q=questions[index];void player.play(questionSegments(q.text,q.question),{rate});}
function move(delta){saveCurrent();index+=delta;render();saveCurrent();readQuestion();}
function render(){
 stop();finished=false;status=null;saveStatus=null;const q=questions[index],answered=Number.isInteger(answers[index]);root.replaceChildren();setView(true);toolbar(category.zh+' / '+category.vi);
 const meta=el('div',undefined,'listening-meta'),count=el('span'),saved=el('span',undefined,'listening-save');saveStatus=saved;saved.setAttribute('role','status');meta.append(count,saved);root.append(meta);
 function updateCount(){count.textContent=`第 ${index+1} / ${questions.length} 题 · ${q.format==='dialogue'?'双人对话':'单人朗读'} · 答对 ${answers.filter((a,i)=>a===questions[i].answer).length} 题 / Câu ${index+1}`;}
 updateCount();const progress=el('progress');progress.max=questions.length;progress.value=answeredCount();progress.setAttribute('aria-label','答题进度 / Tiến độ');root.append(progress);
 const controls=el('div',undefined,'listening-controls'),label=el('label','语速 / Tốc độ '),select=el('select');select.setAttribute('aria-label','语速 / Tốc độ');
 for(const value of [.65,.8,1]){const o=el('option',value+'×');o.value=value;select.append(o);}select.value=String(rate===.85?.8:rate);rate=Number(select.value);
 select.onchange=()=>{rate=Number(select.value);saveCurrent();readQuestion();};label.append(select);
 controls.append(button('▶ 再听一次 / Nghe lại',readQuestion,'primary'),button('■ 停止 / Dừng',()=>{stop();status.textContent='已停止 / Đã dừng';}),label);root.append(controls);
 status=el('p',undefined,'listening-audio-status');status.setAttribute('role','status');root.append(status,el('h3',q.question,'listening-question'));
 const options=el('div',undefined,'listening-options'),feedback=el('div',undefined,'listening-feedback');feedback.setAttribute('role','status');
 const nav=el('nav',undefined,'listening-navigation');nav.setAttribute('aria-label','题目导航 / Điều hướng câu hỏi');
 const previous=button('← 上一个 / Câu trước',()=>move(-1));previous.disabled=index===0;
 const next=button(index===questions.length-1?'查看成绩 → / Kết quả':'下一个 → / Câu tiếp',()=>{if(index===questions.length-1)finish();else move(1);},'primary');next.disabled=!answered;
 function showAnswer(){const a=answers[index];for(const [i,b] of [...options.children].entries()){b.setAttribute('aria-pressed',String(i===a));if(i===q.answer)b.classList.add('correct');if(i===a&&a!==q.answer)b.classList.add('wrong');}feedback.replaceChildren(el('span',a===q.answer?'👍':'😢','face'),el('span',a===q.answer?'答对了！ / Chính xác!':`正确答案：${'ABCD'[q.answer]} ${q.options[q.answer]} / Đáp án đúng.`));next.disabled=false;progress.value=answeredCount();updateCount();}
 q.options.forEach((text,i)=>{const b=button(`${'ABCD'[i]}  ${text}`,()=>{void player.play([{role:'narrator',text}],{rate});if(!Number.isInteger(answers[index])){answers[index]=i;showAnswer();saveCurrent();}},'listening-option');b.setAttribute('aria-pressed','false');options.append(b);});root.append(options,feedback);
 const transcript=el('details',undefined,'listening-transcript');transcript.append(el('summary','查看听力原文 / Xem nội dung'),el('p',q.text));nav.append(previous,next);root.append(transcript,nav);if(answered)showAnswer();focus();
}
function finish(){
 stop();finished=true;saveCurrent();status=null;saveStatus=null;setView(true);root.replaceChildren();toolbar('练习完成 / Hoàn thành');
 const score=answers.filter((a,i)=>a===questions[i].answer).length;root.append(el('div',`${score} / ${questions.length}`,'listening-score'),el('p',score===questions.length?'👍 全部答对！ / Đúng tất cả!':'下面是需要复习的题目。 / Hãy ôn lại các câu sau.'));
 questions.forEach((q,i)=>{if(answers[i]===q.answer)return;const card=el('div',undefined,'listening-review');card.append(el('strong',`第 ${i+1} 题：${q.question}`),el('p',q.text),el('p',`你的答案 / Đáp án của bạn：${'ABCD'[answers[i]]} ${q.options[answers[i]]}`),el('p',`正确答案 / Đáp án đúng：${'ABCD'[q.answer]} ${q.options[q.answer]}`));root.append(card);});
 const actions=el('div',undefined,'listening-actions');actions.append(button('重新组卷 / Tạo lại bài',restart,'primary'),button('返回分类 / Về danh mục',showCategories));root.append(actions);focus();
}
back.onclick=showCategories;
window.addEventListener('pagehide',()=>{saveCurrent();stop();});document.addEventListener('visibilitychange',()=>{if(document.hidden){saveCurrent();stop();}});
const hash=location.hash.slice(1),initial=categories.find(c=>c.id===hash),last=progressStore.last();
if(initial)enter(initial);else if(hash!=='categories'&&last)enter(categories.find(c=>c.id===last.category));else showCategories();

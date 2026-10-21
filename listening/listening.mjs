import {categories,generateQuestions} from './data.mjs?v=listening1';
const root=document.querySelector('#listening-app');
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const button=(text,fn,cls='quiet')=>{const b=el('button',text,cls);b.type='button';b.onclick=fn;return b;};
let category,questions=[],index=0,answers=[],rate=.85,status,generation=0,currentSpeech;
const speech=window.speechSynthesis;
function stop(){generation++;speech?.cancel();currentSpeech=null;}
function speak(text){
 stop();const token=generation;
 if(!speech||!window.SpeechSynthesisUtterance){status.textContent='此浏览器不支持朗读，请使用 Chrome、Edge 或 Safari。 / Trình duyệt không hỗ trợ giọng đọc.';return;}
 const utterance=new SpeechSynthesisUtterance(text);currentSpeech=utterance;utterance.lang='zh-CN';utterance.rate=rate;
 const voices=speech.getVoices();const voice=voices.find(v=>/^zh[-_]CN/i.test(v.lang))||voices.find(v=>/^zh/i.test(v.lang));if(voice)utterance.voice=voice;
 status.textContent='正在朗读… / Đang đọc…';
 utterance.onend=()=>{if(token===generation){status.textContent='朗读完成，可再听一次。 / Đã đọc xong, có thể nghe lại.';currentSpeech=null;}};
 utterance.onerror=e=>{if(token===generation&&!['canceled','interrupted'].includes(e.error))status.textContent='未能朗读，请安装或启用普通话语音后点击“再听一次”。 / Hãy bật giọng tiếng Trung rồi chạm “Nghe lại”.';};
 speech.speak(utterance);
}
function focus(){root.focus({preventScroll:true});root.scrollIntoView({behavior:'instant',block:'start'});}
function toolbar(title,back){const h=el('div',undefined,'listening-toolbar');h.append(el('h2',title),button('← 返回分类 / Về danh mục',back));root.append(h);}
function showCategories(){stop();category=null;location.hash='';root.replaceChildren(el('h2','选择听力分类 / Chọn chủ đề'));const grid=el('div',undefined,'listening-categories');for(const c of categories){const b=button('',()=>prepare(c));b.className='listening-category';const icon=el('span',c.icon,'icon');icon.setAttribute('role','img');icon.setAttribute('aria-label',c.zh);const vi=el('span',c.vi);vi.lang='vi';b.append(icon,el('strong',c.zh),vi,el('small',c.note));grid.append(b);}root.append(grid,el('p','每组 10 题。点击“开始练习”后自动朗读；点击选项即提交，答题后可反复听选项。 / Mỗi bài 10 câu. Chạm bắt đầu để nghe tự động; chọn đáp án để nộp.','note'));}
function prepare(c){stop();category=c;location.hash=c.id;root.replaceChildren();toolbar(c.zh+' / '+c.vi,showCategories);root.append(el('p',c.note),el('p','每题自动朗读，点击选项朗读并作答。答对 👍，答错 😢。 / Tự đọc từng câu. Chạm đáp án để nghe và trả lời.'));
 root.append(button('▶ 开始练习 / Bắt đầu',()=>start(false),'primary'));
 root.append(el('p',c.id==='hsk'?'首次按已确认的 10 道题练习；完成后可重新打乱题序和选项。 / 10 câu đã duyệt, có thể xáo trộn sau khi làm.':'按本分类情境模板自动组卷；部分题目会变换姓名、时间或数量。 / Tạo bài từ mẫu theo chủ đề, thay đổi một số tên, thời gian hoặc số lượng.','note'));focus();}
function start(randomize){stop();questions=generateQuestions(category.id,{randomize});answers=[];index=0;render();readQuestion();}
function readQuestion(){const q=questions[index];speak(q.text+'。问题：'+q.question);}
function render(){
 stop();const q=questions[index],answered=answers[index]!==undefined;root.replaceChildren();toolbar(category.zh+' / '+category.vi,showCategories);
 root.append(el('p',`第 ${index+1} / ${questions.length} 题 · 已答对 ${answers.filter((a,i)=>a===questions[i].answer).length} 题 / Câu ${index+1}`));const progress=el('progress');progress.max=questions.length;progress.value=answers.length;progress.setAttribute('aria-label','答题进度 / Tiến độ');root.append(progress);
 const controls=el('div',undefined,'listening-controls'),label=el('label','语速 / Tốc độ '),select=el('select');for(const value of [.65,.85,1]){const o=el('option',value+'×');o.value=value;select.append(o);}select.value=String(rate);select.onchange=()=>{rate=Number(select.value);readQuestion();};label.append(select);controls.append(button('▶ 再听一次 / Nghe lại',readQuestion,'primary'),button('■ 停止 / Dừng',()=>{stop();status.textContent='已停止 / Đã dừng';}),label);root.append(controls);
 status=el('p',undefined,'listening-audio-status');status.setAttribute('role','status');root.append(status,el('h3',q.question,'listening-question'));
 const options=el('div',undefined,'listening-options'),feedback=el('div',undefined,'listening-feedback');feedback.setAttribute('role','status');const next=button(index===questions.length-1?'查看成绩 / Xem kết quả':'下一题 → / Câu tiếp',()=>{if(index===questions.length-1)finish();else{index++;render();readQuestion();}},'primary');next.disabled=!answered;
 function showAnswer(){const a=answers[index];for(const [i,b] of [...options.children].entries()){b.setAttribute('aria-pressed',String(i===a));if(i===q.answer)b.classList.add('correct');if(i===a&&a!==q.answer)b.classList.add('wrong');}feedback.replaceChildren(el('span',a===q.answer?'👍':'😢','face'),el('span',a===q.answer?'答对了！ / Chính xác!':`答错了。正确答案：${'ABCD'[q.answer]} ${q.options[q.answer]} / Chưa đúng.`));next.disabled=false;progress.value=answers.length;}
 q.options.forEach((text,i)=>{const b=button(`${'ABCD'[i]}  ${text}`,()=>{speak(text);if(answers[index]===undefined){answers[index]=i;showAnswer();}},'listening-option');b.setAttribute('aria-pressed','false');options.append(b);});root.append(options,feedback);
 const transcript=el('details',undefined,'listening-transcript');transcript.append(el('summary','查看听力原文 / Xem nội dung'),el('p',q.text));root.append(transcript,next);if(answered)showAnswer();focus();
}
function finish(){stop();root.replaceChildren();toolbar('练习完成 / Hoàn thành',showCategories);const score=answers.filter((a,i)=>a===questions[i].answer).length;root.append(el('div',`${score} / ${questions.length}`,'listening-score'),el('p',score===questions.length?'👍 全部答对！ / Đúng tất cả!':'继续加油！下面是需要复习的题目。 / Cố lên! Hãy ôn lại các câu sau.'));
 questions.forEach((q,i)=>{if(answers[i]===q.answer)return;const card=el('div',undefined,'listening-review');card.append(el('strong',`第 ${i+1} 题：${q.question}`),el('p',q.text),el('p',`你的答案 / Đáp án của bạn：${'ABCD'[answers[i]]} ${q.options[answers[i]]}`),el('p',`正确答案 / Đáp án đúng：${'ABCD'[q.answer]} ${q.options[q.answer]}`));root.append(card);});const actions=el('div',undefined,'listening-actions');actions.append(button('重新组卷 / Tạo lại bài',()=>start(true),'primary'),button('选择其他分类 / Chọn chủ đề khác',showCategories));root.append(actions);focus();}
window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
const initial=categories.find(c=>c.id===location.hash.slice(1));if(initial)prepare(initial);else showCategories();

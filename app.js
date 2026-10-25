import {initConversation} from './conversation.mjs?v=conversation1';
import {initRememberedEntry} from './remembered-entry.mjs?v=remember11';
import {initPhonetics} from './phonetics.mjs?v=phonetics-mobile8';
import {initQuizMusic} from './quiz-music.mjs?v=music22';
import './password-visibility.mjs?v=password17';
import {initPictureWords} from './picture-words.mjs?v=mobile-tap1';
import {progressKey,saveProgress,loadProgress,clearProgress} from './exercise-progress.mjs?v=resume1';
import {studentExercises} from './exercise-options.mjs?v=writing33';
import {initWriting} from './writing-practice.mjs?v=remember11';
import {showFeedback,stopFeedback} from './result-feedback.mjs?v=writing21';
import {validate,grade,normalize} from './grading.mjs';
import {resolveBank} from './bank-access.mjs?v=banks-8';
import {loadCatalog,listExercises,getExercise,introExercise,subscribe} from './exercise-store.mjs?v=hsk4-40';
import {teacherActive} from './teacher-tools.mjs?v=pageviews1';
const quizMusic=initQuizMusic();
const $=s=>document.querySelector(s);let data,student,submitted=false,intro=null,starting=false,activeProgress=null,restoring=false;const notice=t=>$('#notice').textContent=t;
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function install(value){if(typeof window!=='undefined')document.dispatchEvent(new CustomEvent('practice:enter',{detail:'quiz'}));stopFeedback();data=validate(value);$('#start').disabled=false;$('#exercise').hidden=true;$('#result').hidden=true;$('#welcome').hidden=false;submitted=false;notice('');}
const rememberEntry=initRememberedEntry();
function syncExercises(){
 const select=$('#exercise-select'),previous=select.value,items=studentExercises(listExercises($('#question-bank').value));select.replaceChildren();
 for(const e of items){const option=el('option',e.exercise.title+(e.draft?'（本机草稿）':''));option.value=e.id;select.append(option);}
 select.value=items.some(e=>e.id===previous)?previous:(items[0]?.id||'');
}
$('#question-bank').addEventListener('change',()=>{syncExercises();$('#bank-error').textContent='';});
subscribe(()=>{intro=introExercise();syncExercises();});
function render(){$('#submit-hint').textContent='请检查答案后提交。未答题目将计为0分。';const root=$('#questions');root.replaceChildren();for(const [i,q] of data.questions.entries()){const f=el('fieldset',undefined,'panel');f.append(el('legend',`${String(i+1).padStart(2,'0')}  ${q.text}`));const body=el('div',undefined,'question-body');body.append(el('div',q.pinyin||'','pinyin'),el('div',q.vietnamese||'','vi'),el('small',`${q.type==='choice'?'单项选择 / Chọn một đáp án':'填空 / Điền vào chỗ trống'} · ${q.points}分`));if(q.type==='choice'){const opts=el('div',undefined,'options');for(const key of 'ABCD'){const label=el('label',undefined,'option'),input=el('input');input.type='radio';input.name='q'+q.id;input.value=key;const optionText=el('span',undefined,'option-text');optionText.append(el('span',key+'  '+q.options[key],'option-label'));if(q.optionPinyin?.[key])optionText.append(el('small',q.optionPinyin[key],'option-pinyin'));label.append(input,optionText);opts.append(label);}body.append(opts);}else{const input=el('input');input.name='q'+q.id;input.type='text';input.maxLength=200;input.autocomplete='off';input.placeholder='请输入答案 / Nhập đáp án';input.setAttribute('aria-label',`第${i+1}题答案`);body.append(input);}f.append(body);root.append(f);}$('#confirm').checked=false;$('#confirm-wrap').hidden=true;$('#quiz').querySelector('button[type=submit]').disabled=false;update();}
function answers(){const fd=new FormData($('#quiz'));return Object.fromEntries(data.questions.map(q=>[q.id,fd.get('q'+q.id)||'']));}
function update(){const a=answers(),n=data.questions.filter(q=>normalize(a[q.id])).length;$('#progress').max=data.questions.length;$('#progress').value=n;$('#progress-label').textContent=`已完成 ${n} / ${data.questions.length} 题 · Đã trả lời`;$('#confirm').checked=false;$('#confirm-wrap').hidden=true;}
function saveCurrentProgress(){
 if(!activeProgress||submitted||restoring||$('#exercise').hidden)return;
 const cards=Array.from($('#questions').children);
 let index=cards.findIndex(card=>card.getBoundingClientRect().bottom>0);
 if(index<0)index=cards.length-1;
 const offset=cards[index]?.getBoundingClientRect().top||0;
 if(!saveProgress(activeProgress,data,answers(),{index,offset}))notice('无法保存练习进度，请检查浏览器是否允许本地存储。');
}
function restoreCurrentProgress(saved){
 if(!saved)return;
 for(const input of $('#questions').querySelectorAll('input')){
  const answer=saved.answers[input.name.slice(1)]||'';
  if(input.type==='radio')input.checked=input.value===answer;else input.value=answer;
 }
 update();restoring=true;
 requestAnimationFrame(()=>{
  const card=$('#questions').children[saved.position.index];
  if(card)window.scrollBy({top:card.getBoundingClientRect().top-saved.position.offset,behavior:'instant'});
  restoring=false;saveCurrentProgress();
 });
}
if(typeof window!=='undefined'){
 window.addEventListener('scroll',saveCurrentProgress,{passive:true});
 window.addEventListener('pagehide',saveCurrentProgress);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveCurrentProgress();});
}
$('#identity').addEventListener('submit',async e=>{
 e.preventDefault();if(starting||teacherActive())return;
 const fd=new FormData(e.target),person={name:String(fd.get('student')||'').trim()};
 const error=$('#bank-error');error.textContent='';
 if(!person.name){error.textContent='请填写学生姓名，不能只输入空格。';return;}
 let route;try{route=resolveBank(fd.get('questionBank'),fd.get('bankPassword'));}catch(err){error.textContent=err.message;$('#bank-password').focus();return;}
 starting=true;$('#start').disabled=true;$('#bank-loading').textContent='正在加载题库… / Đang tải câu hỏi…';
 try{

 await loadCatalog();
 if(teacherActive())throw Error('请切换为学生用户后开始答题。');
 const selected=route.id==='intro'?introExercise():getExercise(route.id,String(fd.get('exerciseId')||''));

 saveCurrentProgress();install(selected,route.label);student=person;activeProgress=progressKey(person.name,route.id,route.id==='intro'?'intro':String(fd.get('exerciseId')||''));const saved=loadProgress(activeProgress,data);notice('');render();rememberEntry();
 $('#welcome').hidden=true;$('#exercise').hidden=false;$('#student-label').textContent=student.name+' · '+route.label;
 void quizMusic.start();
 if(saved)restoreCurrentProgress(saved);else{$('#exercise').scrollIntoView({behavior:'instant'});saveCurrentProgress();}
 }catch(err){error.textContent='无法开始答题：'+err.message;}finally{starting=false;$('#start').disabled=false;$('#bank-loading').textContent='';}
});
$('#quiz-home').addEventListener('click',()=>{
 saveCurrentProgress();
 $('#exercise').hidden=true;
 $('#welcome').hidden=false;
 $('#welcome').scrollIntoView({behavior:'smooth'});
 $('#start').focus({preventScroll:true});
});
$('#quiz').addEventListener('input',e=>{if(e.target.id!=='confirm'){update();saveCurrentProgress();}});
$('#quiz').addEventListener('submit',e=>{e.preventDefault();if(submitted)return;const a=answers(),missing=data.questions.filter(q=>!normalize(a[q.id])).length;if(missing&&!$('#confirm').checked){$('#confirm-wrap').hidden=false;$('#submit-hint').textContent=`还有${missing}题未作答，将计0分。补充答案，或勾选确认后再次提交。`;return;}quizMusic.stop();const r=grade(data,a);clearProgress(activeProgress);submitted=true;$('#exercise').hidden=true;const root=$('#result');root.replaceChildren(el('span','练习完成 · HOÀN THÀNH','eyebrow'),el('h2',student.name+'，你又进步了一点！'),el('p',data.title));const score=el('div',String(r.score),'score');score.append(el('small',' / '+r.total+' 分'));root.append(score,el('p',`答对 ${r.correct} / ${data.questions.length} 题 · 正确率 ${Math.round(r.correct/data.questions.length*100)}%`),el('p',r.correct===data.questions.length?'全部答对！没有需要复习的错题。':'下面只显示错误和未作答的题目。','note'));showFeedback(root,r.score,r.total);for(const [i,q] of data.questions.entries()){const d=r.details[i];if(d.correct)continue;const card=el('div',undefined,'review'+(d.correct?' correct':''));card.append(el('b',`${d.correct?'✓ 正确':'✗ 未答或错误'} · 第${i+1}题 · ${d.earned}/${q.points}分`),el('p',q.text),el('p','你的答案：'+(q.type==='choice'&&d.answer?d.answer+' · '+q.options[d.answer]:d.answer||'未作答')),el('p','参考答案：'+q.answers.map(a=>q.type==='choice'?a+' · '+q.options[a]:a).join(' / ')),el('small',q.explanation||''));root.append(card);}const retry=el('button',undefined,'primary bilingual');retry.append(el('span','返回题库选择新的题目'),el('small','Quay lại ngân hàng câu hỏi để chọn câu hỏi mới.'));const redo=el('button',undefined,'quiet bilingual');redo.append(el('span','重做一次'),el('small','Làm lại một lần.'));redo.onclick=()=>{stopFeedback();submitted=false;render();root.hidden=true;$('#exercise').hidden=false;saveCurrentProgress();$('#exercise').scrollIntoView({behavior:'smooth'});};const actions=el('div',undefined,'result-actions');actions.append(retry,redo);retry.onclick=()=>{install(introExercise());$('#bank-error').textContent='';$('#welcome').scrollIntoView({behavior:'smooth'});};root.append(actions,el('p','练习进度仅保存在当前浏览器，提交后清除；答案和成绩不上传，姓名用于公开访问次数统计。','note'));root.hidden=false;root.focus();});
try{await loadCatalog();intro=introExercise();syncExercises();install(intro);}catch(e){notice('练习题库加载失败：'+e.message);}


initWriting({onAuthenticatedEntry:()=>{rememberEntry();}});
initPictureWords({onEnter:saveCurrentProgress,onAuthenticatedEntry:()=>{rememberEntry();}});

initPhonetics({onEnter:saveCurrentProgress,onAuthenticatedEntry:()=>{rememberEntry();}});

initConversation({onEnter:saveCurrentProgress,onAuthenticatedEntry:()=>{rememberEntry();}});

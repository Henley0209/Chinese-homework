import {showFeedback,stopFeedback} from './result-feedback.mjs?v=voice18';
import {recordLogin} from './visit-counter.mjs?v=visits15';
import {validate,grade,normalize} from './grading.mjs';
import {resolveBank} from './bank-access.mjs?v=banks-8';
import {loadCatalog,listExercises,getExercise,introExercise,subscribe} from './exercise-store.mjs?v=guide17';
import {teacherActive} from './teacher-tools.mjs?v=guide17';
const $=s=>document.querySelector(s);let data,student,submitted=false,intro=null,starting=false;const notice=t=>$('#notice').textContent=t;
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function install(value){stopFeedback();data=validate(value);$('#start').disabled=false;$('#exercise').hidden=true;$('#result').hidden=true;$('#welcome').hidden=false;submitted=false;notice('');}
function syncExercises(){
 const select=$('#exercise-select'),previous=select.value,items=listExercises($('#question-bank').value);select.replaceChildren();
 for(const e of items){const option=el('option',e.exercise.title+(e.draft?'（本机草稿）':''));option.value=e.id;select.append(option);}
 select.value=items.some(e=>e.id===previous)?previous:(items[0]?.id||'');
}
$('#question-bank').addEventListener('change',()=>{syncExercises();$('#bank-error').textContent='';});
subscribe(()=>{intro=introExercise();syncExercises();});
function render(){$('#submit-hint').textContent='请检查答案后提交。未答题目将计为0分。';const root=$('#questions');root.replaceChildren();for(const [i,q] of data.questions.entries()){const f=el('fieldset',undefined,'panel');f.append(el('legend',`${String(i+1).padStart(2,'0')}  ${q.text}`));const body=el('div',undefined,'question-body');body.append(el('div',q.pinyin||'','pinyin'),el('div',q.vietnamese||'','vi'),el('small',`${q.type==='choice'?'单项选择 / Chọn một đáp án':'填空 / Điền vào chỗ trống'} · ${q.points}分`));if(q.type==='choice'){const opts=el('div',undefined,'options');for(const key of 'ABCD'){const label=el('label',undefined,'option'),input=el('input');input.type='radio';input.name='q'+q.id;input.value=key;const optionText=el('span',undefined,'option-text');optionText.append(el('span',key+'  '+q.options[key],'option-label'));if(q.optionPinyin?.[key])optionText.append(el('small',q.optionPinyin[key],'option-pinyin'));label.append(input,optionText);opts.append(label);}body.append(opts);}else{const input=el('input');input.name='q'+q.id;input.type='text';input.maxLength=200;input.autocomplete='off';input.placeholder='请输入答案 / Nhập đáp án';input.setAttribute('aria-label',`第${i+1}题答案`);body.append(input);}f.append(body);root.append(f);}$('#confirm').checked=false;$('#confirm-wrap').hidden=true;$('#quiz').querySelector('button[type=submit]').disabled=false;update();}
function answers(){const fd=new FormData($('#quiz'));return Object.fromEntries(data.questions.map(q=>[q.id,fd.get('q'+q.id)||'']));}
function update(){const a=answers(),n=data.questions.filter(q=>normalize(a[q.id])).length;$('#progress').max=data.questions.length;$('#progress').value=n;$('#progress-label').textContent=`已完成 ${n} / ${data.questions.length} 题 · Đã trả lời`;$('#confirm').checked=false;$('#confirm-wrap').hidden=true;}
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

 install(selected,route.label);student=person;notice('');render();$('#bank-password').value='';
 $('#welcome').hidden=true;$('#exercise').hidden=false;$('#student-label').textContent=student.name+' · '+route.label;
 recordLogin('student');
 $('#exercise').scrollIntoView({behavior:'smooth'});
 }catch(err){error.textContent='无法开始答题：'+err.message;}finally{starting=false;$('#start').disabled=false;$('#bank-loading').textContent='';}
});
$('#quiz').addEventListener('input',e=>{if(e.target.id!=='confirm')update();});
$('#quiz').addEventListener('submit',e=>{e.preventDefault();if(submitted)return;const a=answers(),missing=data.questions.filter(q=>!normalize(a[q.id])).length;if(missing&&!$('#confirm').checked){$('#confirm-wrap').hidden=false;$('#submit-hint').textContent=`还有${missing}题未作答，将计0分。补充答案，或勾选确认后再次提交。`;return;}const r=grade(data,a);submitted=true;$('#exercise').hidden=true;const root=$('#result');root.replaceChildren(el('span','练习完成 · HOÀN THÀNH','eyebrow'),el('h2',student.name+'，你又进步了一点！'),el('p',data.title));const score=el('div',String(r.score),'score');score.append(el('small',' / '+r.total+' 分'));root.append(score,el('p',`答对 ${r.correct} / ${data.questions.length} 题 · 正确率 ${Math.round(r.correct/data.questions.length*100)}%`),el('p','继续复习下面的题目，让知识更牢固。','note'));showFeedback(root,r.score,r.total);for(const [i,q] of data.questions.entries()){const d=r.details[i],card=el('div',undefined,'review'+(d.correct?' correct':''));card.append(el('b',`${d.correct?'✓ 正确':'✗ 未答或错误'} · 第${i+1}题 · ${d.earned}/${q.points}分`),el('p',q.text),el('p','你的答案：'+(q.type==='choice'&&d.answer?d.answer+' · '+q.options[d.answer]:d.answer||'未作答')),el('p','参考答案：'+q.answers.map(a=>q.type==='choice'?a+' · '+q.options[a]:a).join(' / ')),el('small',q.explanation||''));root.append(card);}const retry=el('button','返回题库选择 →','primary');retry.onclick=()=>{install(introExercise());$('#bank-error').textContent='';$('#welcome').scrollIntoView({behavior:'smooth'});};root.append(retry,el('p','本演示不向服务器保存姓名、班级或成绩，刷新后将清空。','note'));root.hidden=false;root.focus();});
try{await loadCatalog();intro=introExercise();syncExercises();install(intro);}catch(e){notice('练习题库加载失败：'+e.message);}


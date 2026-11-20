import {homeworkApi} from './homework-api.mjs';
import {kinds,homeworkPinyin} from './homework-core.mjs?v=classroom-homework5';

const $=id=>document.getElementById(id);
const id=new URLSearchParams(location.search).get('id');
const form=$('homework-form'),status=$('homework-status'),retry=$('homework-retry');
const submit=$('homework-submit'),confirmSubmit=$('homework-submit-incomplete');
const submitStatus=$('homework-submit-status'),jump=$('homework-jump');
const node=(tag,text)=>Object.assign(document.createElement(tag),{textContent:text});

function appendPinyin(parent,text,kind,enabled){
 const reading=enabled?homeworkPinyin(text,kind):'';
 if(reading){
  const line=node('small',reading);
  line.style.display='block';
  parent.append(line);
 }
}

function renderQuestion(q,index,showPinyin){
 const field=node('fieldset','');
 const group='answer-'+index;
 field.append(node('legend',`第 ${index+1} 题 · ${kinds[q.kind]}`));
 const stem=node('p',q.text);
 appendPinyin(stem,q.text,q.kind,showPinyin);field.append(stem);
 const options=q.kind==='judgment'?['正确','错误']:q.options;
 if(options){
  options.forEach((option,i)=>{
   const label=node('label','');
   const input=Object.assign(node('input',''),{
    type:'radio',name:group,value:q.kind==='judgment'?option:'ABCD'[i]
   });
   label.append(input,document.createTextNode(option));appendPinyin(label,option,q.kind,showPinyin);field.append(label);
  });
 }else{
  const label=node('label',q.kind==='order'?'按正确顺序写出完整句子':'你的答案');
  const input=Object.assign(node(q.kind==='translation'?'textarea':'input',''),{name:group,maxLength:600});
  label.append(input);field.append(label);
 }
 return field;
}

async function load(){
 retry.hidden=true;status.textContent='正在载入作业…';
 try{
  const paper=await homeworkApi('/homework-open',{body:{id},signal:AbortSignal.timeout(15000)});
  document.title=$('homework-title').textContent=paper.title;
  $('homework-questions').replaceChildren(...paper.questions.map((q,i)=>renderQuestion(q,i,paper.showPinyin)));
  status.textContent=`${paper.bank} · 共 ${paper.questions.length} 题`;
  form.hidden=false;
  const answerValues=()=>{
   const fields=new FormData(form);
   return paper.questions.map((_,i)=>(fields.get('answer-'+i)||'').trim());
  };
  function dismissConfirmation(){
   jump.hidden=true;
   confirmSubmit.hidden=true;
  }
  form.oninput=()=>{
   if(submit.disabled)return;
   dismissConfirmation();
   submitStatus.textContent='';
  };
  jump.onclick=()=>{
   const firstBlank=answerValues().indexOf('');
   if(firstBlank!==-1)form.querySelector('[name="answer-'+firstBlank+'"]')?.focus();
  };
  form.onsubmit=async event=>{
   event.preventDefault();
   if(submit.disabled)return;
   const answers=answerValues();
   const blankCount=answers.filter(answer=>!answer).length;
   if(blankCount&&(event.submitter!==confirmSubmit||confirmSubmit.hidden)){
    submitStatus.textContent=`还有 ${blankCount} 道题未作答。可以继续作答，也可以确认交卷，未作答题目不得分。`;
    jump.hidden=false;
    confirmSubmit.hidden=false;
    return;
   }
   dismissConfirmation();
   submit.disabled=true;
   submitStatus.textContent='正在提交作业…';
   try{
    const result=await homeworkApi('/homework-submit',{body:{id,answers},signal:AbortSignal.timeout(15000)});
    const feedback=result.details.map((detail,i)=>{
     const q=paper.questions[i];
     const answer=q.options?q.options['ABCD'.indexOf(detail.answer)]:detail.answer;
     const state=!answers[i]?'未作答':detail.correct===null?'参考译文':detail.correct?'回答正确':'回答有误';
     const item=node('li','');
     const reference=node('p',`参考答案：${answer}`);
     appendPinyin(reference,answer,q.kind,paper.showPinyin);
     item.append(node('strong',`第 ${i+1} 题 · ${state}`),reference,node('p',detail.explanation));
     return item;
    });
    $('homework-feedback').replaceChildren(...feedback);
    const score=$('homework-score');
    score.textContent=result.total?`得分 ${result.score} / ${result.total}`:'已提交 · 查看参考译文';
    if(result.total&&result.details.some(d=>d.correct===null))score.textContent+='（翻译题提供参考译文）';
    for(const field of form.querySelectorAll('fieldset'))field.disabled=true;
    submitStatus.textContent='作业已提交。';
    $('homework-results').hidden=false;
    score.focus();
   }catch(error){submitStatus.textContent='提交失败，请重试。'+(error.name==='TimeoutError'?'请求超时。':error.message);submit.disabled=false;}
  };
 }catch(error){status.textContent=error.message;retry.hidden=false;}
}
retry.onclick=load;
if(id)load();
else status.textContent='作业链接无效，请向老师索取完整链接。';

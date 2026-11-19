import {homeworkApi} from './homework-api.mjs';
import {kinds} from './homework-core.mjs';

const $=id=>document.getElementById(id);
const id=new URLSearchParams(location.search).get('id');
const form=$('homework-form'),status=$('homework-status'),retry=$('homework-retry');
const submit=form.querySelector('button[type="submit"]');
const node=(tag,text)=>Object.assign(document.createElement(tag),{textContent:text});

function renderQuestion(q,index){
 const field=node('fieldset','');
 const group='answer-'+index;
 field.append(node('legend',`第 ${index+1} 题 · ${kinds[q.kind]}`));
 field.append(node('p',q.text));
 const options=q.kind==='judgment'?['正确','错误']:q.options;
 if(options){
  options.forEach((option,i)=>{
   const label=node('label','');
   const input=Object.assign(node('input',''),{
    type:'radio',name:group,value:q.kind==='judgment'?option:'ABCD'[i]
   });
   label.append(input,document.createTextNode(option));field.append(label);
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
  $('homework-questions').replaceChildren(...paper.questions.map(renderQuestion));
  status.textContent=`${paper.bank} · 共 ${paper.questions.length} 题`;
  form.hidden=false;
  form.onsubmit=async event=>{
   event.preventDefault();
   if(submit.disabled)return;
   const fields=new FormData(form);
   const answers=paper.questions.map((_,i)=>fields.get('answer-'+i)||'');
   if(answers.some(answer=>!answer.trim())){
    status.textContent='请完成每一道题后再提交。';
    return;
   }
   submit.disabled=true;
   try{
    const result=await homeworkApi('/homework-submit',{body:{id,answers},signal:AbortSignal.timeout(15000)});
    const feedback=result.details.map((detail,i)=>{
     const q=paper.questions[i];
     const answer=q.options?q.options['ABCD'.indexOf(detail.answer)]:detail.answer;
     const state=detail.correct===null?'参考译文':detail.correct?'回答正确':'回答有误';
     const item=node('li','');
     item.append(node('strong',`第 ${i+1} 题 · ${state}`),node('p',`参考答案：${answer}`),node('p',detail.explanation));
     return item;
    });
    $('homework-feedback').replaceChildren(...feedback);
    const score=$('homework-score');
    score.textContent=result.total?`得分 ${result.score} / ${result.total}`:'已提交 · 查看参考译文';
    if(result.total&&result.details.some(d=>d.correct===null))score.textContent+='（翻译题提供参考译文）';
    for(const field of form.querySelectorAll('fieldset'))field.disabled=true;
    status.textContent='作业已提交。';
    $('homework-results').hidden=false;
    score.focus();
   }catch(error){status.textContent=error.message;submit.disabled=false;}
  };
 }catch(error){status.textContent=error.message;retry.hidden=false;}
}
retry.onclick=load;
if(id)load();
else status.textContent='作业链接无效，请向老师索取完整链接。';

import {courseTasks} from './homework-plan.mjs?v=homework4';
import {fillHomework,missingQuestions} from './homework-generation.mjs?v=homework4';
import {bankLabels,listExercises,subscribe} from './exercise-store.mjs?v=hsk4-40';
import {kinds,validateQuestions} from './homework-core.mjs?v=homework4';
import {makeDocx} from './homework-docx.mjs?v=homework4';
export function initHomework({requireTeacher,getPassword}){
 const tools=document.querySelector('#tools');
 const section=document.createElement('section');section.className='homework-generator';
 section.innerHTML=`<hr><h3>AI 生成作业 / Tạo bài tập AI</h3><p class="note">根据所选练习的主题、等级和已有题目生成新作业。翻译题为越南语译成中文；每题2分，总分自动计算。</p><label>所属题库<select data-hw-bank></select></label><label>练习题<select data-hw-exercise></select></label><div class="homework-counts">${Object.entries(kinds).map(([key,label])=>`<label>${label}<select data-hw-count="${key}" aria-label="${label}题数">${[0,5,10,15,20].map(n=>`<option value="${n}">${n} 题</option>`).join('')}</select></label>`).join('')}</div><p data-hw-total class="note"></p><div class="teacher-actions"><button type="button" class="primary" data-hw-generate>生成练习题</button><button type="button" class="quiet" data-hw-cancel hidden>取消生成</button></div><p data-hw-status role="status" aria-live="polite"></p><div data-hw-result hidden><p class="note">拼音按课程词表校验；其他题型由AI生成，参考题补齐会标明。请由教师核对后使用。下载前可在下方修改题干、选项、参考答案和解析。修改题库或题数后请重新生成。</p><div class="teacher-actions"><button type="button" class="primary" data-hw-download>下载学生试卷 .docx</button><button type="button" class="quiet" data-hw-answers>下载教师答案 .docx</button></div><div data-hw-preview></div></div>`;
 tools.append(section);
 const shortcut=document.querySelector('#open-homework');
 shortcut.onclick=()=>{section.scrollIntoView({block:'start',behavior:'smooth'});section.querySelector('[data-hw-bank]').focus({preventScroll:true});};
 const $=s=>section.querySelector(s),$$=s=>[...section.querySelectorAll(s)];
 const bank=$('[data-hw-bank]'),exercise=$('[data-hw-exercise]'),status=$('[data-hw-status]');
 let paper=null,controller=null,run=0;
 const setStatus=text=>status.textContent=text;
 function clear(){paper=null;$('[data-hw-generate]').textContent='生成练习题';$('[data-hw-result]').hidden=true;$('[data-hw-preview]').replaceChildren();}
 function total(){const n=$$('[data-hw-count]').reduce((n,s)=>n+Number(s.value),0);$('[data-hw-total]').textContent=`共 ${n} 题，满分 ${n*2} 分`;return n;}
 function targets(){const previous=exercise.value;exercise.replaceChildren();for(const e of listExercises(bank.value)){const o=document.createElement('option');o.value=e.id;o.textContent=e.exercise.title;exercise.append(o);}if([...exercise.options].some(o=>o.value===previous))exercise.value=previous;clear();}
 for(const [id,label]of Object.entries(bankLabels)){const o=document.createElement('option');o.value=id;o.textContent=label;bank.append(o);}bank.value='hsk1-2';
 bank.addEventListener('change',targets);exercise.addEventListener('change',clear);subscribe(targets);
 for(const select of $$('[data-hw-count]'))select.addEventListener('change',()=>{total();clear();});
 $('[data-hw-count="pinyin"]').value='15';$('[data-hw-count="choice"]').value='20';$('[data-hw-count="order"]').value='15';total();targets();
 function counts(){return Object.fromEntries($$('[data-hw-count]').map(s=>[s.dataset.hwCount,Number(s.value)]));}
 function busy(value){for(const el of $$('select,[data-hw-generate]'))el.disabled=value;$('[data-hw-cancel]').hidden=!value;$('[data-hw-generate]').textContent=value?'正在生成…':paper?.questions.length&&missingQuestions(paper,counts())?'继续生成剩余题目':'生成练习题';}
 function cancel(){run++;controller?.abort();controller=null;busy(false);if(paper?.questions.length)preview();else clear();}
 $('[data-hw-cancel]').onclick=()=>{cancel();setStatus(paper?.questions.length?`已暂停，保留 ${paper.questions.length} 题。可下载已有题目，或点击“继续生成剩余题目”。`:'已取消生成，可重新选择后生成。');};
 document.querySelector('#user-role').addEventListener('change',()=>{cancel();clear();setStatus('');});
 tools.addEventListener('close',()=>{if(controller){cancel();setStatus('已暂停生成，已生成题目保留在当前页面，可继续生成。');}});
 function preview(){
  const root=$('[data-hw-preview]');root.replaceChildren();
  let index=0;
  for(const q of paper.questions){
   const box=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=`第 ${++index} 题`;box.append(legend);
   if(q.source==='course-reference'){const note=document.createElement('small');note.textContent='本课参考题补齐';box.append(note);}
   const field=(label,value,set)=>{const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement('textarea');input.value=value;input.rows=2;input.maxLength=600;input.addEventListener('input',()=>set(input.value));wrap.append(input);box.append(wrap);};
   field('题干',q.text,v=>q.text=v);
   q.options?.forEach((o,i)=>field('选项 '+'ABCD'[i],o,v=>q.options[i]=v));
   field('参考答案'+(q.options?'（A / B / C）':''),q.answer,v=>q.answer=v);
   field('解析',q.explanation,v=>q.explanation=v);root.append(box);
  }
  $('[data-hw-result]').hidden=false;
 }
 $('[data-hw-generate]').onclick=async()=>{
  try{requireTeacher();}catch(e){setStatus(e.message);return;}
  const n=total(),entry=listExercises(bank.value).find(e=>e.id===exercise.value);
  if(!entry){setStatus('请选择练习题。');return;}if(!n){setStatus('请至少选择一种题型，题数不能全部为0。');return;}
  const selectedCounts=counts();
  const resuming=paper?.questions.length&&missingQuestions(paper,selectedCounts)>0;
  if(paper?.questions.length&&!resuming&&!confirm('重新生成会替换当前作业及修改，是否继续？'))return;
  if(!resuming){clear();paper={title:entry.exercise.title,bank:bankLabels[bank.value],questions:[]};}
  busy(true);$('[data-hw-result]').hidden=true;controller=new AbortController();const signal=controller.signal,token=++run;
  const next=paper;
  const taskPlan=courseTasks(entry.exercise,listExercises(bank.value).map(e=>e.exercise));
  const context=JSON.stringify({description:entry.exercise.description||'',vocabulary:taskPlan.pinyin.map(t=>t.word).slice(0,40)}).slice(0,8000);
  try{
   const configResponse=await fetch('./conversation-config.json',{signal,cache:'no-store'});if(!configResponse.ok)throw Error('AI配置读取失败。');
   const config=await configResponse.json(),url=new URL(config.endpoint);if(url.protocol!=='https:')throw Error('AI服务地址无效。');url.pathname='/homework';url.search='';url.hash='';
   await fillHomework(next,selectedCounts,async batch=>{
    requireTeacher();
    const timeout=new AbortController(),timer=setTimeout(()=>timeout.abort(),65000);
    const abort=()=>timeout.abort();signal.addEventListener('abort',abort,{once:true});
    try{
     const response=await fetch(url,{method:'POST',signal:timeout.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({password:getPassword(),bank:next.bank,title:next.title,context,...batch})});
     const data=await response.json();if(!response.ok){const error=Error(data.error||'AI服务暂不可用。');error.status=response.status;throw error;}return data;
    }finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
   },{signal,tasks:taskPlan,onProgress:({kind,done,stalls})=>{if(token===run)setStatus(`正在生成${kinds[kind]}，已完成 ${done}/${n} 题${stalls?'，正在更换内容补题…':'…'}`);}});
   requireTeacher();if(token!==run)return;preview();setStatus(`已生成 ${n} 题，满分 ${n*2} 分。请核对题目后下载。${sourceNote(next)}`);
  }catch(e){
   if(token===run){
    if(next.questions.length)preview();
    const reason=e.name==='AbortError'?'请求超时，请重试。':e.message;
    setStatus(`生成暂未完成：${reason}${next.questions.length?` 已保留 ${next.questions.length}/${n} 题，可下载已有题目，或点击“继续生成剩余题目”。`:' 请点击生成按钮重试。'}`);
   }
  }finally{if(token===run){controller=null;busy(false);}}
 };

 function sourceNote(value){const reference=value.questions.filter(q=>q.source==='course-reference').length;return reference?` 其中 ${reference} 题使用本课参考题补齐，已在预览中标明。`:'';}
 function download(answers){
  try{
   requireTeacher();if(!paper)throw Error('请先生成练习题。');
   for(const kind of Object.keys(kinds)){const qs=paper.questions.filter(q=>q.kind===kind);if(qs.length)validateQuestions(qs,kind,qs.length);}
   const blob=makeDocx(paper,answers),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${missingQuestions(paper,counts())?'未完成-':''}${paper.title.replace(/[\\/:*?"<>|]/g,'_')}-${answers?'教师答案':'学生试卷'}.docx`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);setStatus('已下载'+(answers?'教师答案':'学生试卷')+(missingQuestions(paper,counts())?'（仅含已生成题目，尚有题目待补充）。':'。'));
  }catch(e){setStatus('下载失败：'+e.message);}
 }
 $('[data-hw-download]').onclick=()=>download(false);$('[data-hw-answers]').onclick=()=>download(true);
}

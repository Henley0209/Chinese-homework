import {kinds,selectNewQuestions,validateQuestions,completedSentence,conflictsWithPaper} from './homework-core.mjs?v=homework-singleblank3';
export function missingQuestions(paper,counts){
 return Object.entries(counts).reduce((sum,[kind,count])=>sum+Math.max(0,count-(paper?.questions.filter(q=>q.kind===kind).length||0)),0);
}
// Mutate the draft only after validation, so cancellation and retries preserve progress.
export async function fillHomework(paper,counts,requestBatch,{signal,onProgress=()=>{},tasks={}}={}){
 const failures=[];
 const check=()=>{if(signal?.aborted)throw new DOMException('已取消生成','AbortError');};
 for(const kind of Object.keys(kinds)){
  const existing=paper.questions.filter(q=>q.kind===kind);if(existing.length)validateQuestions(existing,kind,existing.length);
  let stalls=0;const tried=new Map();
  while(paper.questions.filter(q=>q.kind===kind).length<counts[kind]){
   check();
   const remaining=counts[kind]-paper.questions.filter(q=>q.kind===kind).length;
   let count=Math.min(stalls?1:kind==='translation'?2:5,remaining);const avoid=paper.questions.map(q=>q.kind==='choice'||q.kind==='order'&&kind!=='order'?completedSentence(q):q.text);
   const used=new Set(paper.questions.filter(q=>q.kind===kind).map(q=>q.targetId));
   const available=(tasks[kind]||[]).filter(t=>!used.has(t.id)).sort((a,b)=>(tried.get(a.id)||0)-(tried.get(b.id)||0)).slice(0,count);
   if(available.length)count=Math.min(count,available.length);
   const targets=available.length?available.slice(0,count):undefined;
   onProgress({kind,done:paper.questions.length,stalls});
   try{
    for(const target of targets||[])tried.set(target.id,(tried.get(target.id)||0)+1);
    const attempt=paper.generationAttempt||0;paper.generationAttempt=attempt+1;
    const response=await requestBatch({kind,count,avoid,attempt,...(targets?{targets}:{})});check();
    const questions=selectNewQuestions(response.questions,kind,avoid,count);
    if(!questions.length)throw Error('AI暂未返回新的有效题目。');
    const accepted=[];
    for(const q of questions)if(!conflictsWithPaper(q,[...paper.questions,...accepted]))accepted.push(q);
    if(!accepted.length)throw Error('题目完整句子重复，请更换情境。');
    paper.questions.push(...accepted);stalls=0;
    onProgress({kind,done:paper.questions.length,stalls});
   }catch(e){
    check();if([400,401,403,429].includes(e.status))throw e;
    if(++stalls>=4){failures.push(`${kinds[kind]}：${e.name==='AbortError'?'请求超时。':e.message}`);break;}
   }
  }
 }
 if(failures.length)throw Error('本轮补题未完成：'+failures.join('；'));
 return paper;
}

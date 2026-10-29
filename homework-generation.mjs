import {kinds,selectNewQuestions,validateQuestions} from './homework-core.mjs?v=homework3';
export function missingQuestions(paper,counts){
 return Object.entries(counts).reduce((sum,[kind,count])=>sum+Math.max(0,count-(paper?.questions.filter(q=>q.kind===kind).length||0)),0);
}
// Mutate the draft only after validation, so cancellation and retries preserve progress.
export async function fillHomework(paper,counts,requestBatch,{signal,onProgress=()=>{}}={}){
 const check=()=>{if(signal?.aborted)throw new DOMException('已取消生成','AbortError');};
 for(const kind of Object.keys(kinds)){
  const existing=paper.questions.filter(q=>q.kind===kind);if(existing.length)validateQuestions(existing,kind,existing.length);
  let stalls=0;
  while(paper.questions.filter(q=>q.kind===kind).length<counts[kind]){
   check();
   const remaining=counts[kind]-paper.questions.filter(q=>q.kind===kind).length;
   const count=Math.min(5,remaining),avoid=paper.questions.map(q=>q.text);
   onProgress({kind,done:paper.questions.length,stalls});
   try{
    const attempt=paper.generationAttempt||0;paper.generationAttempt=attempt+1;
    const response=await requestBatch({kind,count,avoid,attempt});check();
    const questions=selectNewQuestions(response.questions,kind,avoid,count);
    if(!questions.length)throw Error('AI暂未返回新的有效题目。');
    paper.questions.push(...questions);stalls=0;
    onProgress({kind,done:paper.questions.length,stalls});
   }catch(e){
    check();if([400,401,403,429].includes(e.status))throw e;
    if(++stalls>=4)throw Error('本轮补题未完成：'+(e.name==='AbortError'?'请求超时。':e.message));
   }
  }
 }
 return paper;
}

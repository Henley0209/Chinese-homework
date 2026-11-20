import {readFileSync} from 'node:fs';
import {validateQuestions} from '../homework-core.mjs';

const credential=process.env.HOMEWORK_VERIFY_TOKEN;
if(!credential)throw Error('Missing temporary homework verification credential');
const {endpoint}=JSON.parse(readFileSync('conversation-config.json','utf8'));
const url=new URL('/homework',endpoint);
const context='行政部管理办公用品。财务部管理收入和支出。人事部负责招聘和培训。采购部负责采购原材料。仓库负责收货和库存管理。';
const han=/\p{Script=Han}/u;
for(let attempt=0;attempt<3;attempt++){
 const response=await fetch(url,{
  method:'POST',signal:AbortSignal.timeout(65000),
  headers:{Origin:'https://henley0209.github.io','Content-Type':'application/json',Authorization:'Bearer '+credential},
  body:JSON.stringify({bank:'汉语工厂',title:'公司部门',kind:'vocabulary',count:4,context,attempt})
 });
 const data=await response.json();
 if(response.ok){
  const questions=validateQuestions(data.questions,'vocabulary',data.questions.length);
  if(questions.some(q=>han.test(q.text))&&questions.some(q=>!han.test(q.text))){
   console.log('Verified Chinese-to-Vietnamese and Vietnamese-to-Chinese vocabulary questions from classroom text.');
   break;
  }
 }
 if(attempt===2)throw Error(data.error||'Live vocabulary generation did not return both translation directions.');
 await new Promise(resolve=>setTimeout(resolve,3000));
}

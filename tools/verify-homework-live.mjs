import fs from 'node:fs';
import {courseTasks} from '../homework-plan.mjs';
import {fillHomework,missingQuestions} from '../homework-generation.mjs';
import {validateQuestions} from '../homework-core.mjs';
const token=process.env.HOMEWORK_VERIFY_TOKEN;
if(!token)throw Error('Missing temporary homework verification token');
const config=JSON.parse(fs.readFileSync('conversation-config.json','utf8'));
const endpoint=new URL(config.endpoint);endpoint.pathname='/homework';endpoint.search='';
const counts={pinyin:15,choice:15,order:15,translation:5};
let ready=false;
for(let attempt=0;attempt<10&&!ready;attempt++){
 const exercise=JSON.parse(fs.readFileSync('hsk4-40/lesson-08.json','utf8'));
 const targets=courseTasks(exercise).pinyin.slice(0,1);
 const response=await fetch(endpoint,{method:'POST',signal:AbortSignal.timeout(20000),headers:{Origin:'https://henley0209.github.io',Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({bank:'HSK4',title:exercise.title,kind:'pinyin',count:1,context:'',targets})});
 ready=response.ok;if(!ready){if(![401,503].includes(response.status))throw Error('Homework verification readiness failed: '+response.status);await new Promise(resolve=>setTimeout(resolve,2000));}
}
if(!ready)throw Error('Temporary homework verification credential not ready');
for(const [bank,folder,file]of [['HSK4','hsk4-40','lesson-08.json'],['HSK5','hsk5-30','lesson-11.json']]){
 const exercise=JSON.parse(fs.readFileSync(folder+'/'+file,'utf8'));
 const related=fs.readdirSync(folder).filter(f=>/^lesson-\d+\.json$/.test(f)).map(f=>JSON.parse(fs.readFileSync(folder+'/'+f,'utf8')));
 const paper={bank,title:exercise.title,questions:[]};let requests=0;
 await fillHomework(paper,counts,async batch=>{
  const response=await fetch(endpoint,{method:'POST',signal:AbortSignal.timeout(70000),headers:{Origin:'https://henley0209.github.io',Authorization:'Bearer '+token,'Content-Type':'application/json','User-Agent':'Chinese-homework-verification/1.0'},body:JSON.stringify({bank,title:paper.title,context:'',...batch})});
  const data=await response.json();requests++;if(!response.ok){const error=Error(data.error||'Homework verification failed');error.status=response.status;throw error;}return data;
 },{tasks:courseTasks(exercise,related)});
 if(missingQuestions(paper,counts)!==0||paper.questions.length!==50)throw Error('Incomplete live homework');
 for(const [kind,count]of Object.entries(counts))validateQuestions(paper.questions.filter(q=>q.kind===kind),kind,count);
 const ai=paper.questions.filter(q=>q.source==='ai').length,reference=paper.questions.filter(q=>q.source==='course-reference').length;
 if(paper.questions.filter(q=>q.kind==='translation'&&q.source==='ai').length!==5)throw Error('Live translation generation did not complete');
 console.log(JSON.stringify({bank,title:paper.title,total:paper.questions.length,requests,ai,reference,vocabulary:paper.questions.filter(q=>q.source==='course-vocabulary').length}));
}

import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {generateQuestions,generationChoices} from '../listening/data.mjs';
import {categories as expandedCategories,generateQuestions as expandedQuestions} from '../listening/bank300.mjs';
import {questionSegments} from '../listening/speech.mjs';
export const voices={female:'zh-CN-XiaoxiaoNeural',male:'zh-CN-YunxiNeural',narrator:'zh-CN-XiaoxiaoNeural'};
export const previewText='你好，欢迎参加今天的听力练习。请仔细听题，然后选择正确答案。';
export function buildCorpus(){
 const clips=new Map();
 function add({role,text}){const voice=voices[role],key=JSON.stringify([voice,text]);clips.set(key,{key,voice,text,file:createHash('sha256').update(key).digest('hex').slice(0,32)+'.mp3'});}
 function addQuestion(q){questionSegments(q.text,q.question).forEach(add);q.options.forEach(text=>add({role:'narrator',text}));}
 generateQuestions('hsk').forEach(addQuestion);
 for(const category of expandedCategories)expandedQuestions(category.id).forEach(addQuestion);
 const c=generationChoices;
 for(const name of c.names)for(const hour of c.hours)for(const price of c.prices)for(const count of c.counts){for(const category of ['daily','factory'])generateQuestions(category,{values:{name,hour,price,count}}).forEach(addQuestion);}
 add({role:'female',text:previewText});add({role:'male',text:previewText});
 return [...clips.values()].sort((a,b)=>a.file.localeCompare(b.file));
}
if(process.argv[1]?.endsWith('listening-audio-corpus.mjs')){const path=process.argv[2]||'work/listening-audio/corpus.json';mkdirSync(path.slice(0,path.lastIndexOf('/')),{recursive:true});const clips=buildCorpus();writeFileSync(path,JSON.stringify({voices,clips},null,2)+'\n');console.log(`Prepared ${clips.length} fixed-voice clips covering all current question variants.`);}

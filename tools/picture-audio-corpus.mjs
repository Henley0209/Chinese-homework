import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
export const voice='zh-CN-XiaoxiaoNeural';
export function buildCorpus(){
 const catalog=JSON.parse(readFileSync(new URL('../picture-words/catalog.json',import.meta.url),'utf8'));
 const texts=[...new Set(catalog.categories.flatMap(c=>c.words.map(w=>w.chinese)))];
 return texts.map(text=>{const key=JSON.stringify([voice,text]);return {key,voice,text,file:createHash('sha256').update(key).digest('hex').slice(0,32)+'.mp3'};}).sort((a,b)=>a.file.localeCompare(b.file));
}
if(process.argv[1]?.endsWith('picture-audio-corpus.mjs')){
 mkdirSync('work/picture-audio',{recursive:true});const clips=buildCorpus();writeFileSync('work/picture-audio/corpus.json',JSON.stringify({voices:{female:voice},clips},null,2)+'\n');console.log(`Prepared ${clips.length} unique Xiaoxiao word recordings`);
}

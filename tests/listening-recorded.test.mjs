import assert from 'node:assert/strict';
import {buildCorpus,voices} from '../tools/listening-audio-corpus.mjs';
import {generateQuestions,generationChoices} from '../listening/data.mjs';
import {questionSegments} from '../listening/speech.mjs';
import {createRecordedPlayer,fixedVoices,recordingKey} from '../listening/recorded-player.mjs';
const corpus=buildCorpus(),clips=Object.fromEntries(corpus.map(c=>[c.key,{file:c.file,voice:c.voice,duration:1}]));
assert.equal(corpus.length,1830);assert.deepEqual(voices,fixedVoices);assert.deepEqual(buildCorpus(),corpus,'corpus enumeration is deterministic despite random question order');
const choices=generationChoices;
for(const name of choices.names)for(const hour of choices.hours)for(const price of choices.prices)for(const count of choices.counts)for(const id of ['hsk','daily','factory']){
 for(const q of generateQuestions(id,{randomize:true,values:{name,hour,price,count}})){
  const segments=[...questionSegments(q.text,q.question),...q.options.map(text=>({role:'narrator',text}))];
  for(const segment of segments)assert.ok(clips[recordingKey(segment)],'recording covers every variant');
 }
}
const elements=[],played=[],statuses=[];
class FakeAudio{
 constructor(){elements.push(this);}
 pause(){}
 removeAttribute(){this.src='';}
 load(){}
 play(){played.push(this.src);this.onplaying?.();return Promise.resolve();}
}
const manifest={voices:fixedVoices,clips};
const player=createRecordedPlayer({AudioClass:FakeAudio,fetchManifest:async()=>manifest,onStatus:text=>statuses.push(text)});
const dialogue=questionSegments('女：你怎么没吃午饭？男：上午一直开会，刚结束。我现在就去食堂。','男的为什么没吃午饭？');
await player.play(dialogue,{rate:.85});
const audio=elements[0];assert.equal(elements.length,1);assert.ok(audio.src.endsWith(clips[recordingKey(dialogue[0])].file));assert.equal(audio.playbackRate,.85);assert.equal(audio.preservesPitch,true);assert.match(statuses.at(-1),/晓晓/);
audio.onended();assert.ok(audio.src.endsWith(clips[recordingKey(dialogue[1])].file));assert.match(statuses.at(-1),/云希/);
audio.onended();assert.match(statuses.at(-1),/晓晓/);audio.onended();assert.match(statuses.at(-1),/完成/);
await player.play(dialogue);const oldEnd=audio.onended,n=played.length;player.stop();oldEnd();assert.equal(played.length,n,'stop cancels remaining dialogue');assert.equal(audio.onended,null);
await player.play([{role:'narrator',text:'not recorded'}]);assert.match(statuses.at(-1),/暂不可用/);
let resolveManifest;const delayed=new Promise(resolve=>{resolveManifest=resolve;});const slow=createRecordedPlayer({AudioClass:FakeAudio,fetchManifest:()=>delayed});const pending=slow.play(dialogue);slow.stop();const before=played.length;resolveManifest(manifest);await pending;assert.equal(played.length,before,'late manifest cannot restart stopped audio');
const deny=createRecordedPlayer({AudioClass:class extends FakeAudio{play(){return Promise.reject(Object.assign(Error(),{name:'NotAllowedError'}));}},fetchManifest:async()=>manifest,onStatus:text=>statuses.push(text)});await deny.play(dialogue);await new Promise(resolve=>setImmediate(resolve));assert.match(statuses.at(-1),/首次触屏/);
console.log('PASS: 1830-clip corpus covers all variants; fixed voices, sequencing, mobile element reuse, speed, cancellation and playback errors.');

await player.play(dialogue);assert.equal(audio.playbackRate,.8,'female defaults to 0.8');audio.onended();assert.equal(audio.playbackRate,.8,'male defaults to 0.8');player.stop();

const expanded=await import('../listening/bank300.mjs');
for(const category of expanded.categories)for(const q of expanded.generateQuestions(category.id)){
 for(const segment of [...questionSegments(q.text,q.question),...q.options.map(text=>({role:'narrator',text}))])assert.ok(clips[recordingKey(segment)],`${q.id} has a matching fixed-voice recording`);
}

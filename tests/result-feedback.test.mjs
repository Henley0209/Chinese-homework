import assert from 'node:assert/strict';
import {feedbackText,createFeedbackSpeech,showFeedback,stopFeedback} from '../result-feedback.mjs';
for(const n of [0,20,59,59.9])assert.equal(feedbackText(n),'不要灰心，继续加油');
for(const n of [60,61,99,99.9])assert.equal(feedbackText(n),'已经很不错了，离成功只差一步');
assert.equal(feedbackText(100),'100分，你太棒了');assert.equal(feedbackText(50,50),'100分，你太棒了');
const spoken=[],statuses=[];let cancelled=0;
const synth={getVoices:()=>[{lang:'en-US',name:'English'},{lang:'zh-CN',name:'Xiaoxiao'}],speak:u=>spoken.push(u),cancel:()=>cancelled++};
class Utterance{constructor(text){this.text=text;}}
const player=createFeedbackSpeech({synth,Utterance,onStatus:s=>statuses.push(s)});
player.play(feedbackText(59));assert.equal(spoken[0].text,'不要灰心，继续加油');assert.equal(spoken[0].lang,'zh-CN');assert.equal(spoken[0].voice.name,'Xiaoxiao');assert.ok(spoken[0].pitch>1);
player.play(feedbackText(60));assert.equal(cancelled,1);spoken[0].onerror();assert.equal(statuses.at(-1),'正在准备鼓励语音…');
spoken[1].onerror();assert.match(statuses.at(-1),/再听一次/);
assert.equal(createFeedbackSpeech({synth:null,Utterance:null,onStatus:s=>statuses.push(s)}).play('测试'),false);assert.match(statuses.at(-1),/不支持/);
globalThis.speechSynthesis=synth;globalThis.SpeechSynthesisUtterance=Utterance;
globalThis.document={createElement:()=>({children:[],setAttribute(){},append(...x){this.children.push(...x);}})};
const root=document.createElement('div');showFeedback(root,100,100);assert.equal(root.children[0].children[0].textContent,'100分，你太棒了');
const n=spoken.length;root.children[0].children[1].onclick();assert.equal(spoken.length,n+1);assert.equal(spoken.at(-1).text,'100分，你太棒了');stopFeedback();
console.log('通过：低于60、正好60、60至100、满分分档；中文高音调配置、取消重复播放、重播、错误与不支持降级。');

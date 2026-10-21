import assert from 'node:assert/strict';
import {isMandarin,voiceGender,chooseVoices,questionSegments,createMandarinPlayer} from '../listening/speech.mjs';
const female={lang:'zh-CN',name:'Microsoft Xiaoxiao Online (Natural)',voiceURI:'f'},male={lang:'zh-CN',name:'Microsoft Yunxi Online (Natural)',voiceURI:'m'},cantonese={lang:'zh-HK',name:'Sin-Ji'},taiwan={lang:'zh-TW',name:'Hanhan'};
assert.equal(isMandarin(cantonese),false);assert.equal(isMandarin(taiwan),false);assert.equal(isMandarin({lang:'zh-CN',name:'Cantonese'}),false);assert.equal(isMandarin({lang:'cmn-Hans-CN',name:'Mandarin'}),true);
assert.equal(voiceGender(female),'female');assert.equal(voiceGender(male),'male');assert.equal(voiceGender({name:'Mandarin'}),null);
assert.equal(chooseVoices([cantonese,taiwan,female,male]).male,male);
const segments=questionSegments('女：你怎么没吃午饭？男：上午一直开会，刚结束。我现在就去食堂。','男的为什么没吃午饭？');
assert.deepEqual(segments.map(s=>s.role),['female','male','narrator']);assert.equal(segments[0].text,'你怎么没吃午饭？');assert.equal(segments[1].text,'上午一直开会，刚结束。我现在就去食堂。');
assert.deepEqual(questionSegments('今天下雨。','带什么？').map(s=>s.role),['narrator','narrator']);
let voices=[female,male],spoken=[],messages=[],preferred={};
class Utterance{constructor(text){this.text=text;}}
const speech={cancel(){},getVoices:()=>voices,speak:u=>spoken.push(u)};
const player=createMandarinPlayer({speech,Utterance,onStatus:m=>messages.push(m),preferences:()=>preferred});
await player.play(segments);assert.equal(spoken.length,1);assert.equal(spoken[0].voice,female);assert.equal(spoken[0].pitch,1);
spoken[0].onend();assert.equal(spoken[1].voice,male);spoken[1].onend();assert.equal(spoken[2].voice,female);spoken[2].onend();assert.match(messages.at(-1),/完成/);
await player.play(segments);const interrupted=spoken.at(-1),count=spoken.length;player.stop();interrupted.onend();assert.equal(spoken.length,count,'stop cancels all remaining dialogue turns');
voices=[female];spoken=[];await player.play(segments);assert.equal(spoken.length,0);assert.match(messages.at(-1),/缺少普通话男声/);
voices=[cantonese,taiwan];await player.play([{role:'narrator',text:'你好'}]);assert.equal(spoken.length,0);assert.match(messages.at(-1),/没有中国大陆普通话/);
const unknown={lang:'zh-CN',name:'Mandarin 2',voiceURI:'u'};voices=[female,unknown];preferred={male:'u'};await player.play(segments);assert.equal(spoken[0].voice,female);spoken[0].onend();assert.equal(spoken[1].voice,unknown);
preferred={male:'f',female:'f'};spoken=[];await player.play(segments);assert.equal(spoken.length,0);assert.match(messages.at(-1),/两种不同音色/);
// Late browser voice discovery must be awaited, but must not restart canceled playback.
let voiceListener;voices=[];speech.addEventListener=(_,fn)=>{voiceListener=fn;};speech.removeEventListener=()=>{};
preferred={};const pending=player.play(segments);voices=[female,male];voiceListener();await pending;assert.equal(spoken.length,1);
voices=[];const canceled=player.play(segments);player.stop();voices=[female,male];voiceListener();await canceled;assert.equal(spoken.length,1);
console.log('PASS: Mandarin-only voices, male/female dialogue, narrator, manual assignment, missing voice messages, late voice discovery and interruption.');

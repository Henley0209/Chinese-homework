import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeReading,scoreReading} from '../reading-score.mjs';
import {resolveReadingAccess,findReadingPassage} from '../reading-access.mjs';
import {createReadingRecognition} from '../reading-recognition.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));
const catalog=read('reading/passages.json'),exercises=read('exercise-catalog.json');
assert.equal(catalog.passages.length,2);assert.deepEqual(catalog.lengths,{'hsk1-2':100,hsk3:300,hsk4:400});
for(const p of catalog.passages){
 assert.equal([...p.chinese].filter(c=>/\p{Script=Han}/u.test(c)).length,100);
 assert.ok(p.pinyin&&p.vietnamese);assert.ok(!/[\u4e00-\u9fff]/u.test(p.pinyin));
 assert.ok(exercises.exercises.some(e=>e.id===p.exerciseId&&e.bank===p.bank));
 assert.equal(findReadingPassage(catalog,p.bank,p.exerciseId),p);
 const score=scoreReading(p.chinese,p.chinese);assert.equal(score.score,100);assert.equal(score.counts.correct,100);assert.equal(score.distance,0);
 assert.equal(scoreReading(p.chinese,p.chinese.replace(/[，。！？：“”]/gu,' ')).score,100);
 assert.equal(scoreReading(p.chinese,normalizeReading(p.chinese).slice(0,20)).score,20);
 assert.equal(scoreReading(p.chinese,p.chinese+p.chinese).score,50);
 assert.throws(()=>scoreReading(p.chinese,'  。！ '),/没有识别到/);
}
assert.equal(scoreReading('我喜欢汉语','我喜欢汉字').score,80);
assert.deepEqual(scoreReading('我爱汉语','我爱汉字').counts,{correct:3,substitution:1,missing:0,extra:0});
assert.deepEqual(scoreReading('我爱汉语','我爱语').counts,{correct:3,substitution:0,missing:1,extra:0});
assert.deepEqual(scoreReading('我爱汉语','我很爱汉语').counts,{correct:4,substitution:0,missing:0,extra:1});
assert.equal(scoreReading('我爱汉语','完全不同').score,0);
assert.throws(()=>scoreReading('', '你好'),/不能为空/);
assert.throws(()=>scoreReading('你好','你'.repeat(4001)),/过长/);
assert.throws(()=>resolveReadingAccess('hsk1-2','','hsk1-2-topic-01'),/密码/);
assert.throws(()=>resolveReadingAccess('hsk1-2','NgaZhu1133','hsk1-2-topic-01'),/不匹配/);
assert.equal(resolveReadingAccess('hsk1-2','NgaZhu1122','hsk1-2-topic-02').id,'hsk1-2');
assert.throws(()=>findReadingPassage(catalog,'hsk3','hsk1-2-topic-01'),/试用版/);
assert.throws(()=>findReadingPassage(catalog,'hsk1-2','hsk1-2-topic-03'),/试用版/);
assert.throws(()=>findReadingPassage({...catalog,passages:[{...catalog.passages[0],chinese:'太短'}]},'hsk1-2','hsk1-2-topic-01'),/不完整/);
class Recognition{
 static all=[];
 constructor(){Recognition.all.push(this);}
 start(){this.started=true;}
 stop(){this.stopped=true;}
 abort(){this.aborted=true;this.onend?.();}
 emit(text){this.onresult({resultIndex:0,results:[Object.assign([{transcript:text}],{isFinal:true})]});}
}
const states=[],transcripts=[],scores=[],errors=[];let timeout;
const session=createReadingRecognition({Recognition,onState:s=>states.push(s),onTranscript:s=>transcripts.push(s),onScore:t=>scores.push(t),onError:e=>errors.push(e),schedule:fn=>(timeout=fn,1),unschedule:()=>{timeout=null;}});
session.start();let rec=Recognition.all.at(-1);assert.equal(rec.lang,'zh-CN');assert.equal(session.state,'listening');
rec.emit('我爱');session.requestScore();assert.equal(session.state,'stopping');assert.equal(scores.length,0);assert.equal(rec.stopped,true);
rec.emit('我爱汉语');rec.onend();assert.deepEqual(scores,['我爱汉语']);assert.equal(session.state,'recorded');assert.equal(timeout,null);
session.cancel();assert.equal(session.transcript,'');rec.emit('过期结果');rec.onend();assert.deepEqual(scores,['我爱汉语']);assert.equal(session.transcript,'');
session.start();rec=Recognition.all.at(-1);rec.emit('新的朗读');session.requestScore();const fallback=timeout;fallback();assert.equal(scores.at(-1),'新的朗读');assert.equal(rec.aborted,true);rec.onend();assert.equal(scores.length,2);
session.start();rec=Recognition.all.at(-1);rec.onerror({error:'not-allowed'});assert.match(errors.at(-1),/权限|未获允许/);assert.equal(session.state,'idle');rec.emit('过期识别');assert.equal(session.transcript,'');
session.start();rec=Recognition.all.at(-1);session.requestScore();rec.onend();assert.match(errors.at(-1),/没有识别/);assert.equal(scores.length,2);
session.start();rec=Recognition.all.at(-1);rec.emit('退出前');session.requestScore();const staleTimeout=timeout;session.cancel();staleTimeout();assert.equal(scores.length,2);
const absent=[];const unsupported=createReadingRecognition({onError:e=>absent.push(e)});unsupported.start();assert.match(absent[0],/不支持/);
const thrown=createReadingRecognition({Recognition:class{start(){throw Error();}abort(){}},onError:e=>errors.push(e)});thrown.start();assert.match(errors.at(-1),/无法启动/);
for(const page of ['index.html','homepage-v4.html']){const source=fs.readFileSync(new URL('../'+page,import.meta.url),'utf8');assert.equal((source.match(/id="practice-reading"/g)||[]).length,1);assert.equal((source.match(/id="reading-practice"/g)||[]).length,1);}
console.log('通过：两篇100字、题库密码匹配、三级长度配置、内容评分、空白拦截、最终结果等待、超时和退出竞态、麦克风错误与浏览器兼容。');

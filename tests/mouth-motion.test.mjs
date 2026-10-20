import assert from 'node:assert/strict';
import {phoneticCategories} from '../phonetics-data.mjs';
import {mouthSequence,sampleSequence,motionAtlases,motionLayout,createMouthMotion} from '../mouth-motion.mjs';
for(const group of phoneticCategories)for(const item of group.items){
 const sequence=mouthSequence(item,group.id);assert.ok(sequence.length>=6);
 for(const frame of sequence){assert.ok(motionAtlases[frame.atlas]);assert.ok(frame.row>=0&&frame.row<4);assert.ok(frame.column>=0&&frame.column<6);}
 assert.equal(sequence[0].column,0);assert.ok([0,5].includes(sequence.at(-1).column));
 assert.deepEqual(sampleSequence(sequence,-1).from,sequence[0]);assert.equal(sampleSequence(sequence,1).blend,1);
}
const finals=phoneticCategories.find(c=>c.id==='finals');
const ai=mouthSequence(finals.items.find(x=>x.symbol==='ai'),'finals');assert.ok(new Set(ai.map(f=>f.row)).size>1,'Diphthong moves between its vowel poses');
const m=mouthSequence({symbol:'m'},'initials');assert.ok(m.some(f=>f.atlas==='consonants')&&m.some(f=>f.atlas==='vowels-a'),'m teaching reading moves from closed lips into its rounded vowel');
assert.equal(motionLayout['vowels-b'].columns,5,'Use the inspected AI atlas grid, without cropping across tile boundaries');
// Exercise animation lifecycle with controlled image loading and a media clock.
const saved={Image:globalThis.Image,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame};
const pending=[];let callback,cleared=0,draws=0,time=0;
globalThis.Image=class{constructor(){this.naturalWidth=1536;this.naturalHeight=1024;pending.push(this);}set src(value){this.source=value;}};
globalThis.requestAnimationFrame=fn=>{callback=fn;return 1;};globalThis.cancelAnimationFrame=()=>cleared++;
function canvas(){return {width:640,height:640,dataset:{},getContext:()=>({clearRect(){},drawImage(){draws++;}})};}
try{
 const main=canvas(),zoom=canvas(),motion=createMouthMotion(main),item=finals.items.find(x=>x.symbol==='a');
 const preparing=motion.prepare(item,'finals');pending[0].onload();assert.equal(await preparing,true);assert.ok(draws>0);
 motion.play({duration:1,currentTime:()=>time});time=.5;callback();assert.equal(main.dataset.motionProgress,'0.500');
 motion.attach(zoom);assert.equal(zoom.dataset.motionProgress,'0.500');
 const staleFrame=callback;motion.stop();staleFrame();assert.equal(main.dataset.motionProgress,'0.000');assert.ok(cleared>0);
 motion.seek(.7);assert.equal(main.dataset.motionProgress,'0.700');motion.detach(zoom);motion.dispose();
 // A late image completion must never resume a disposed/changed view.
 const canceled=createMouthMotion(canvas()),preparingLate=canceled.prepare(finals.items.find(x=>x.symbol==='u'),'finals');canceled.dispose();pending[1].onload();assert.equal(await preparingLate,false);
 const failed=createMouthMotion(canvas()),loadingFailed=failed.prepare({symbol:'b'},'initials');pending[2].onerror();await assert.rejects(loadingFailed);
 const retry=failed.prepare({symbol:'b'},'initials');pending[3].onload();assert.equal(await retry,true);failed.dispose();
 console.log('通过：63 项动作路径、复韵母过渡、声母教学读音过渡、素材网格、媒体时钟同步、放大同步、停止复位与过期加载取消。');
}finally{Object.assign(globalThis,saved);}

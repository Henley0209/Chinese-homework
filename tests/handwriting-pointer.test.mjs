import assert from 'node:assert/strict';
import {mock} from 'node:test';
import {createHandwriting,FINISH_DELAY} from '../handwriting.mjs';
const previousWindow=globalThis.window,previousObserver=globalThis.ResizeObserver;
mock.timers.enable({apis:['setTimeout']});
try{
 for(const ending of ['pointercancel','lostpointercapture','outside-pointerup']){
  const canvasEvents={},windowEvents={};let wrong=0;
  globalThis.window={addEventListener:(name,fn)=>windowEvents[name]=fn,removeEventListener:name=>delete windowEvents[name]};
  globalThis.ResizeObserver=class{observe(){}disconnect(){}};
  const ctx={scale(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}};
  const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:280,height:280}),setPointerCapture(){throw Error('capture unavailable');},addEventListener:(name,fn)=>canvasEvents[name]=fn,removeEventListener:name=>delete canvasEvents[name]};
  const ink=createHandwriting(canvas,{medians:[[[0,0],[100,0]]],onComplete:()=>assert.fail('vertical stroke is not 一'),onIncomplete:()=>wrong++,onWriting:()=>{}});
  const event=(type,y)=>({type,pointerId:1,button:0,clientX:140,clientY:y,preventDefault(){},getCoalescedEvents:()=>[]});
  canvasEvents.pointerdown(event('pointerdown',20));canvasEvents.pointermove(event('pointermove',240));
  if(ending==='outside-pointerup')windowEvents.pointerup(event('pointerup',260));else canvasEvents[ending](event(ending,240));
  mock.timers.tick(FINISH_DELAY-1);assert.equal(wrong,0,ending+' waits');mock.timers.tick(1);assert.equal(wrong,1,ending+' submits retained ink');
  ink.destroy();mock.timers.tick(FINISH_DELAY);assert.equal(wrong,1,ending+' does not repeat');assert.deepEqual(windowEvents,{});
 }
}finally{mock.timers.reset();if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;if(previousObserver===undefined)delete globalThis.ResizeObserver;else globalThis.ResizeObserver=previousObserver;}
console.log('通过：指针取消、捕获丢失及画布外抬笔均保留笔迹并在2秒后检查一次。');

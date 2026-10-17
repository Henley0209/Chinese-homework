// Compare the whole handwritten structure. Pen-up is never treated as submission.
export const INK_WIDTH=18;
function normalize(strokes){
 const points=strokes.flat();if(!points.length)return [];
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);const minX=Math.min(...xs),minY=Math.min(...ys),width=Math.max(...xs)-minX,height=Math.max(...ys)-minY,scale=Math.max(width,height);
 if(scale<1)return [];
 return strokes.map(s=>s.map(([x,y])=>[(x-minX+(scale-width)/2)/scale,(y-minY+(scale-height)/2)/scale]));
}
function sample(stroke){
 if(!stroke.length)return [];const out=[stroke[0]];
 for(let i=1;i<stroke.length;i++){const a=stroke[i-1],b=stroke[i],steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.02));for(let n=1;n<=steps;n++)out.push([a[0]+(b[0]-a[0])*n/steps,a[1]+(b[1]-a[1])*n/steps]);}
 return out;
}
function coverage(source,target,tolerance){return source.filter(p=>target.some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<=tolerance)).length/source.length;}
export function assessHandwriting(ink,medians){
 const drawn=normalize(ink).map(sample).flat(),target=normalize(medians.map(s=>s.map(([x,y])=>[x,-y]))).map(sample);
 if(drawn.length<6||!target.length)return {correct:false,coverage:0,precision:0};
 const reference=target.flat(),covered=coverage(reference,drawn,.085),precision=coverage(drawn,reference,.095),weakest=Math.min(...target.map(s=>coverage(s,drawn,.085)));
 return {correct:covered>=.86&&precision>=.83&&weakest>=.68,coverage:covered,precision};
}
export function createHandwriting(canvas,{medians,onComplete,onIncomplete,onWriting}){
 const ctx=canvas.getContext('2d'),strokes=[];let active=null,pointer=null,timer,finished=false,enabled=true;
 function draw(){const rect=canvas.getBoundingClientRect(),ratio=globalThis.devicePixelRatio||1;canvas.width=Math.round(rect.width*ratio);canvas.height=Math.round(rect.height*ratio);ctx.scale(ratio,ratio);ctx.lineWidth=INK_WIDTH;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#174c75';
  for(const stroke of strokes){if(!stroke.length)continue;ctx.beginPath();ctx.moveTo(...stroke[0]);if(stroke.length===1)ctx.lineTo(stroke[0][0]+.1,stroke[0][1]);else for(const point of stroke.slice(1))ctx.lineTo(...point);ctx.stroke();}
 }
 function check(explicit=false){clearTimeout(timer);if(finished||!enabled||active)return false;if(!explicit&&strokes.length<medians.length)return false;const result=assessHandwriting(strokes,medians);if(result.correct){finished=true;onComplete();}else if(explicit)onIncomplete();return result.correct;}
 function point(e){const r=canvas.getBoundingClientRect();return [Math.max(0,Math.min(r.width,e.clientX-r.left)),Math.max(0,Math.min(r.height,e.clientY-r.top))];}
 function down(e){if(!enabled||finished||pointer!==null||e.button>0)return;e.preventDefault();clearTimeout(timer);pointer=e.pointerId;canvas.setPointerCapture(pointer);active=[point(e)];strokes.push(active);onWriting();draw();}
 function move(e){if(e.pointerId!==pointer||!active)return;e.preventDefault();for(const event of e.getCoalescedEvents?.()||[e])active.push(point(event));draw();}
 function up(e){if(e.pointerId!==pointer)return;e.preventDefault();if(e.type==='pointercancel'){strokes.pop();}else if(active)active.push(point(e));active=null;pointer=null;draw();timer=setTimeout(()=>check(false),2200);}
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
 const observer=new ResizeObserver(()=>draw());observer.observe(canvas);draw();
 return {check:()=>check(true),pause(){enabled=false;clearTimeout(timer);active=null;pointer=null;},reset(){clearTimeout(timer);strokes.length=0;active=null;pointer=null;finished=false;enabled=true;draw();},destroy(){clearTimeout(timer);observer.disconnect();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);}};
}

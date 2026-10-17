// Tolerant whole-character matching; submit after three seconds without another stroke.
export const INK_WIDTH=18;
export const FINISH_DELAY=3000;
const SIDE=56;
function normalize(strokes){
 const points=strokes.flat();if(!points.length)return [];
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),minX=Math.min(...xs),minY=Math.min(...ys),width=Math.max(...xs)-minX,height=Math.max(...ys)-minY,size=Math.max(width,height);
 if(size<1)return [];
 // Normalize location and allow wide/narrow handwriting without enlarging tiny wobbles.
 const sx=Math.max(width,size*.3),sy=Math.max(height,size*.3);
 return strokes.map(s=>s.map(([x,y])=>[(x-minX-width/2)/sx+.5,(y-minY-height/2)/sy+.5]));
}
function raster(strokes,angle=0,shear=0){
 const pixels=new Uint8Array(SIDE*SIDE),cos=Math.cos(angle),sin=Math.sin(angle);
 function transform([x,y]){x-=.5;y-=.5;return [((x*cos-y*sin)+shear*(x*sin+y*cos)+.5)*(SIDE-9)+4,((x*sin+y*cos)+.5)*(SIDE-9)+4];}
 function mark(x,y){x=Math.round(x);y=Math.round(y);if(x>=0&&x<SIDE&&y>=0&&y<SIDE)pixels[y*SIDE+x]=1;}
 for(const stroke of strokes){const pts=stroke.map(transform);for(let i=0;i<pts.length;i++){const a=pts[Math.max(0,i-1)],b=pts[i],steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*1.5));for(let n=0;n<=steps;n++)mark(a[0]+(b[0]-a[0])*n/steps,a[1]+(b[1]-a[1])*n/steps);}}
 return pixels;
}
function distance(mask){
 const d=Float32Array.from(mask,v=>v?0:1000),w=SIDE;
 for(let y=0;y<w;y++)for(let x=0;x<w;x++){const i=y*w+x;if(x)d[i]=Math.min(d[i],d[i-1]+1);if(y){d[i]=Math.min(d[i],d[i-w]+1);if(x)d[i]=Math.min(d[i],d[i-w-1]+1.414);if(x<w-1)d[i]=Math.min(d[i],d[i-w+1]+1.414);}}
 for(let y=w-1;y>=0;y--)for(let x=w-1;x>=0;x--){const i=y*w+x;if(x<w-1)d[i]=Math.min(d[i],d[i+1]+1);if(y<w-1){d[i]=Math.min(d[i],d[i+w]+1);if(x)d[i]=Math.min(d[i],d[i+w-1]+1.414);if(x<w-1)d[i]=Math.min(d[i],d[i+w+1]+1.414);}}
 return d;
}
function covered(mask,dist,tolerance){let total=0,hit=0;for(let i=0;i<mask.length;i++)if(mask[i]){total++;if(dist[i]<=tolerance)hit++;}return total?hit/total:0;}
export function assessHandwriting(ink,medians){
 const drawn=normalize(ink),reference=normalize(medians.map(s=>s.map(([x,y])=>[x,-y])));
 if(!drawn.length||!reference.length)return {correct:false,coverage:0,precision:0};
 const target=raster(reference),targetDistance=distance(target);let best={correct:false,coverage:0,precision:0},score=0;
 // Compare the whole silhouette, ignoring pen order, split strokes and connections.
 // Search modest rotations and slants to accept natural, imprecise handwriting.
 for(const degrees of [-12,0,12])for(const shear of [-.16,0,.16]){
  const mask=raster(drawn,degrees*Math.PI/180,shear),coverage=covered(target,distance(mask),5.5),precision=covered(mask,targetDistance,6),value=Math.min(coverage,precision);
  const result={correct:coverage>=.79&&precision>=.8,coverage,precision};
  if(result.correct)return result;
  if(value>score){score=value;best=result;}
 }
 return best;
}
export function createHandwriting(canvas,{medians,onComplete,onIncomplete,onWriting}){
 const ctx=canvas.getContext('2d'),strokes=[];let active=null,pointer=null,timer,finished=false,enabled=true;
 function draw(){const rect=canvas.getBoundingClientRect(),ratio=globalThis.devicePixelRatio||1;canvas.width=Math.round(rect.width*ratio);canvas.height=Math.round(rect.height*ratio);ctx.scale(ratio,ratio);ctx.lineWidth=INK_WIDTH;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#174c75';
  for(const stroke of strokes){if(!stroke.length)continue;ctx.beginPath();ctx.moveTo(...stroke[0]);if(stroke.length===1)ctx.lineTo(stroke[0][0]+.1,stroke[0][1]);else for(const point of stroke.slice(1))ctx.lineTo(...point);ctx.stroke();}
 }
 function check(explicit=false){clearTimeout(timer);if(finished||!enabled||active||!strokes.length)return false;const result=assessHandwriting(strokes,medians);if(result.correct){finished=true;onComplete();}else onIncomplete();return result.correct;}
 function point(e){const r=canvas.getBoundingClientRect();return [Math.max(0,Math.min(r.width,e.clientX-r.left)),Math.max(0,Math.min(r.height,e.clientY-r.top))];}
 function down(e){if(!enabled||finished||pointer!==null||e.button>0)return;e.preventDefault();clearTimeout(timer);pointer=e.pointerId;canvas.setPointerCapture(pointer);active=[point(e)];strokes.push(active);onWriting();draw();}
 function move(e){if(e.pointerId!==pointer||!active)return;e.preventDefault();for(const event of e.getCoalescedEvents?.()||[e])active.push(point(event));draw();}
 function up(e){if(e.pointerId!==pointer)return;e.preventDefault();if(e.type==='pointercancel'){strokes.pop();}else if(active)active.push(point(e));active=null;pointer=null;draw();timer=setTimeout(()=>check(false),FINISH_DELAY);}
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
 const observer=new ResizeObserver(()=>draw());observer.observe(canvas);draw();
 return {check:()=>check(true),pause(){enabled=false;clearTimeout(timer);active=null;pointer=null;},reset(){clearTimeout(timer);strokes.length=0;active=null;pointer=null;finished=false;enabled=true;draw();},destroy(){clearTimeout(timer);observer.disconnect();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);}};
}

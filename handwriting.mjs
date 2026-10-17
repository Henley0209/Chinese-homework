// Tolerant whole-character matching; submit after two seconds without another stroke.
export const INK_WIDTH=18;
export const FINISH_DELAY=2000;
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
// A second pass checks that the strokes exist in their approximate regions.
// It requires a one-to-one match so a missing or extra stroke cannot disappear.
function matchesFlexibleStrokes(drawn,reference){
 if(drawn.length!==reference.length||reference.length<2||reference.length>24)return false;
 function describe(stroke){
  const xs=stroke.map(p=>p[0]),ys=stroke.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
  const size=Math.max(w,h,1e-6),sx=Math.max(w,size*.3),sy=Math.max(h,size*.3);
  const points=stroke.map(([a,b])=>[(a-x-w/2)/size+.5,(b-y-h/2)/size+.5]);
  const flexible=stroke.map(([a,b])=>[(a-x-w/2)/sx+.5,(b-y-h/2)/sy+.5]);
  const shape=raster([points]),flexShape=raster([flexible]);
  return {x:x+w/2,y:y+h/2,size:Math.hypot(w,h),shape,dist:distance(shape),points,flexible,flexShape,flexDist:distance(flexShape)};
 }
 const input=drawn.map(describe),target=reference.map(describe);
 const candidates=target.map(t=>input.flatMap((s,i)=>{
  // Length and proportions are practice goals, not reasons to reject a stroke.
  // Keep only a tiny-mark guard and an approximate region/shape requirement.
  if(Math.hypot(s.x-t.x,s.y-t.y)>.34||s.size<.015)return [];
  for(const degrees of [-25,-12,0,12,25]){
   const mask=raster([s.points],degrees*Math.PI/180);
   if(covered(t.shape,distance(mask),7)>=.82&&covered(mask,t.dist,7)>=.82)return [i];
   const flexibleMask=raster([s.flexible],degrees*Math.PI/180);
   if(covered(t.flexShape,distance(flexibleMask),7)>=.8&&covered(flexibleMask,t.flexDist,7)>=.8)return [i];
  }
  return [];
 }));
 if(candidates.some(c=>!c.length))return false;
 // Bipartite matching ignores stroke order without reusing one stroke twice.
 const owners=new Array(input.length).fill(-1);
 function assign(t,seen){for(const i of candidates[t]){if(seen.has(i))continue;seen.add(i);if(owners[i]===-1||assign(owners[i],seen)){owners[i]=t;return true;}}return false;}
 return candidates.every((_,t)=>assign(t,new Set()));
}
// Join pen-lift fragments before checking for extra strokes. A single stroke
// drawn in pieces must not be confused with a genuinely additional stroke.
function joinFragments(strokes){
 const parts=strokes.filter(s=>s.length).map(s=>s.slice());
 let changed=true;
 while(changed){changed=false;let pair;
  for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++)for(const ra of [false,true])for(const rb of [false,true]){
   const a=ra?parts[i].slice().reverse():parts[i],b=rb?parts[j].slice().reverse():parts[j];
   const end=a.at(-1),start=b[0],gap=Math.hypot(end[0]-start[0],end[1]-start[1]);if(gap>.035)continue;
   const u=a[Math.max(0,a.length-3)],v=b[Math.min(2,b.length-1)];
   const ax=end[0]-u[0],ay=end[1]-u[1],bx=v[0]-start[0],by=v[1]-start[1],length=Math.hypot(ax,ay)*Math.hypot(bx,by);
   if(gap>1e-6&&(!length||(ax*bx+ay*by)/length<.8))continue;
   if(!pair||gap<pair.gap)pair={i,j,a,b,gap};
  }
  if(pair){parts[pair.i]=pair.a.concat(pair.b);parts.splice(pair.j,1);changed=true;}
 }
 return parts;
}
// Distinguish extra horizontal bars even when several strokes were connected
// into one pen gesture. Check only simple characters to avoid dense radicals.
function horizontalBands(strokes){
 const bands=[];
 for(const stroke of strokes){let run=[];
  function finish(){if(run.length){const xs=run.map(p=>p[0]),ys=run.map(p=>p[1]);if(Math.max(...xs)-Math.min(...xs)>=.16)bands.push((Math.max(...ys)+Math.min(...ys))/2);}run=[];}
  for(let i=1;i<stroke.length;i++){const a=stroke[i-1],b=stroke[i],dx=Math.abs(b[0]-a[0]),dy=Math.abs(b[1]-a[1]);if(dx>0&&dy<=dx*.4){if(!run.length)run.push(a);run.push(b);}else finish();}finish();
 }
 bands.sort((a,b)=>a-b);const groups=[];for(const y of bands)if(!groups.length||y-groups.at(-1)>.09)groups.push(y);
 return groups.length;
}
export function assessHandwriting(ink,medians){
 const drawn=normalize(ink),reference=normalize(medians.map(s=>s.map(([x,y])=>[x,-y])));
 if(!drawn.length||!reference.length)return {correct:false,coverage:0,precision:0};
 if(joinFragments(drawn).length>reference.length)return {correct:false,coverage:0,precision:0,reason:'extra-strokes'};
 if(reference.length<=4&&horizontalBands(reference)>=2&&reference.some(s=>{const xs=s.map(p=>p[0]),ys=s.map(p=>p[1]);return Math.max(...ys)-Math.min(...ys)>=.6&&Math.max(...xs)-Math.min(...xs)<=.12;})&&horizontalBands(drawn)>horizontalBands(reference))return {correct:false,coverage:0,precision:0,reason:'extra-horizontal'};
 const target=raster(reference),targetDistance=distance(target);let best={correct:false,coverage:0,precision:0},score=0;
 // Compare the whole silhouette, ignoring pen order, split strokes and connections.
 // Search modest rotations and slants to accept natural, imprecise handwriting.
 for(const degrees of [-12,0,12])for(const shear of [-.16,0,.16]){
  const mask=raster(drawn,degrees*Math.PI/180,shear),coverage=covered(target,distance(mask),5.5),precision=covered(mask,targetDistance,6),value=Math.min(coverage,precision);
  const result={correct:coverage>=.79&&precision>=.8,coverage,precision};
  if(result.correct)return result;
  if(value>score){score=value;best=result;}
 }
 if(matchesFlexibleStrokes(drawn,reference))return {...best,correct:true,match:"structure"};
 return best;
}
export function createHandwriting(canvas,{medians,onComplete,onIncomplete,onWriting}){
 const ctx=canvas.getContext('2d'),strokes=[];let active=null,pointer=null,timer,finished=false,enabled=true;
 function draw(){const rect=canvas.getBoundingClientRect(),ratio=globalThis.devicePixelRatio||1;canvas.width=Math.round(rect.width*ratio);canvas.height=Math.round(rect.height*ratio);ctx.scale(ratio,ratio);ctx.lineWidth=INK_WIDTH;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#174c75';
  for(const stroke of strokes){if(!stroke.length)continue;ctx.beginPath();ctx.moveTo(...stroke[0]);if(stroke.length===1)ctx.lineTo(stroke[0][0]+.1,stroke[0][1]);else for(const point of stroke.slice(1))ctx.lineTo(...point);ctx.stroke();}
 }
 function check(explicit=false){clearTimeout(timer);if(finished||!enabled||active||!strokes.length)return false;const result=assessHandwriting(strokes,medians);if(result.correct){finished=true;onComplete();}else onIncomplete();return result.correct;}
 function point(e){const r=canvas.getBoundingClientRect();return [Math.max(0,Math.min(r.width,e.clientX-r.left)),Math.max(0,Math.min(r.height,e.clientY-r.top))];}
 function down(e){if(!enabled||finished||pointer!==null||e.button>0)return;e.preventDefault();clearTimeout(timer);pointer=e.pointerId;try{canvas.setPointerCapture(pointer);}catch{}active=[point(e)];strokes.push(active);onWriting();draw();}
 function move(e){if(e.pointerId!==pointer||!active)return;e.preventDefault();const events=e.getCoalescedEvents?.();for(const event of events?.length?events:[e])active.push(point(event));draw();}
 function up(e){if(e.pointerId!==pointer)return;e.preventDefault();if(e.type==='pointerup'&&active)active.push(point(e));active=null;pointer=null;draw();timer=setTimeout(()=>check(false),FINISH_DELAY);}
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('lostpointercapture',up);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);
 const observer=new ResizeObserver(()=>draw());observer.observe(canvas);draw();
 return {check:()=>check(true),pause(){enabled=false;clearTimeout(timer);active=null;pointer=null;},reset(){clearTimeout(timer);strokes.length=0;active=null;pointer=null;finished=false;enabled=true;draw();},destroy(){clearTimeout(timer);observer.disconnect();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('lostpointercapture',up);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);}};
}

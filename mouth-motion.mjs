// AI-generated photographic motion frames, composited as an illustrative sequence.
export const motionAtlases={
 'vowels-a':'assets/phonetics/motion-vowels-a.png',
 'vowels-b':'assets/phonetics/motion-vowels-b.png',
 consonants:'assets/phonetics/motion-consonants.png'
};
// AI grids are not mathematically even: measured tile boundaries avoid neighboring faces.
export const motionLayout={
 'vowels-a':{columns:6,rows:4,y:[0,256,512,768,1024],x:[0,283,558,812,1053,1285,1536],frames:[0,1,2,3,4,5]},
 'vowels-b':{columns:5,rows:4,y:[0,263,523,761,1024],x:[0,306,610,922,1229,1536],frames:[0,1,2,2,3,4]},
 consonants:{columns:6,rows:4,y:[0,256,512,768,1024],x:[0,286,570,847,1117,1403,1536],frames:[0,1,2,3,4,0]}
};
const poses={open:['vowels-a',0],round:['vowels-a',1],back:['vowels-a',2],flat:['vowels-a',3],u:['vowels-b',0],pinch:['vowels-b',0],lipteeth:['vowels-b',2],nasal:['vowels-b',3],closed:['consonants',0],curled:['consonants',1],teeth:['consonants',2],high:['consonants',3],narrow:['consonants',3]};
const initialPoses={b:'closed',p:'closed',m:'closed',f:'lipteeth',d:'nasal',t:'nasal',n:'nasal',l:'nasal',g:'back',k:'back',h:'back',j:'high',q:'high',x:'high',zh:'curled',ch:'curled',sh:'curled',r:'curled',z:'teeth',c:'teeth',s:'teeth',y:'flat',w:'u'};
const compoundPoses={ui:['u','back','flat'],iu:['flat','round','u'],uai:['u','open','flat'],iao:['flat','open','round'],un:['u','back','nasal'],ian:['flat','open','nasal'],'üan':['pinch','open','nasal'],iang:['flat','open','back'],uang:['u','open','back'],iong:['pinch','back']};
const frame=(pose,column)=>({atlas:poses[pose][0],row:poses[pose][1],column});
export function mouthSequence(item,category){
 if(category==='initials'){
  const pose=initialPoses[item.symbol];if(!pose)throw Error('Unknown initial');
  return (item.symbol==='m'?[0,1,1,1,1,0]:[0,1,2,3,4,5]).map(column=>frame(pose,column));
 }
 const path=category==='finals'?(compoundPoses[item.symbol]||[...new Set(item.shapes)]):['flat'];
 if(!path.length||path.some(p=>!poses[p]))throw Error('Unknown mouth pose');
 if(path.length===1)return [0,1,2,3,4,5].map(column=>frame(path[0],column));
 return [frame(path[0],0),frame(path[0],1),...path.flatMap(p=>[frame(p,2),frame(p,3)]),frame(path.at(-1),4),frame(path.at(-1),5)];
}
export function sampleSequence(sequence,progress){
 const position=Math.max(0,Math.min(1,Number(progress)||0))*(sequence.length-1),index=Math.min(sequence.length-2,Math.floor(position));
 return {from:sequence[index],to:sequence[index+1],blend:position-index};
}
const images=new Map();
function loadImage(key){
 if(!images.has(key))images.set(key,new Promise((resolve,reject)=>{const image=new Image();image.decoding='async';image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Mouth frames unavailable'));image.src=motionAtlases[key];}).catch(error=>{images.delete(key);throw error;}));
 return images.get(key);
}
export function createMouthMotion(canvas,{onProgress=()=>{}}={}){
 const targets=new Set([canvas]),loaded=new Map();let sequence,raf=0,version=0,progress=0;
 function paint(target,frame,alpha){
  const image=loaded.get(frame.atlas);if(!image)return;
  const ctx=target.getContext('2d'),layout=motionLayout[frame.atlas],column=layout.frames[frame.column],scale=image.naturalWidth/1536,left=layout.x[column]*scale,w=(layout.x[column+1]-layout.x[column])*scale,yscale=image.naturalHeight/1024,top=layout.y[frame.row]*yscale,h=(layout.y[frame.row+1]-layout.y[frame.row])*yscale,side=Math.min(w,h);
  ctx.globalAlpha=alpha;ctx.drawImage(image,left+(w-side)/2,top+(h-side)/2,side,side,0,0,target.width,target.height);ctx.globalAlpha=1;
 }
 function draw(value){
  progress=Math.max(0,Math.min(1,value));if(!sequence||!loaded.size)return;
  const sample=sampleSequence(sequence,progress);
  for(const target of targets){const context=target.getContext('2d');context.clearRect(0,0,target.width,target.height);paint(target,sample.from,1);if(sample.blend>0)paint(target,sample.to,sample.blend);target.dataset.motionProgress=progress.toFixed(3);}
  onProgress(progress);
 }
 function cancel(){version++;cancelAnimationFrame(raf);raf=0;}
 async function prepare(item,category){
  cancel();const token=version;sequence=mouthSequence(item,category);const keys=[...new Set(sequence.map(f=>f.atlas))];
  await Promise.all(keys.map(async key=>loaded.set(key,await loadImage(key))));if(token!==version)return false;draw(0);return true;
 }
 function stop(){cancel();draw(0);}
 function play({duration=.8,currentTime,rate=1}={}){
  cancel();const token=version,start=performance.now(),length=Number.isFinite(duration)&&duration>0?duration:.8;
  function tick(){
   if(token!==version)return;
   const time=currentTime?currentTime():((performance.now()-start)/1000)*rate;
   draw(Math.max(0,Math.min(1,time/length)));if(time<length)raf=requestAnimationFrame(tick);
  }
  tick();
 }
 return {prepare,play,stop,seek:value=>{cancel();draw(value);},attach:target=>{targets.add(target);draw(progress);},detach:target=>targets.delete(target),dispose:()=>{cancel();targets.clear();}};
}

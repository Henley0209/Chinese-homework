export function pinyinKey(text){let tone=5;const marks={'\u0304':1,'\u0301':2,'\u030c':3,'\u0300':4};let normalized=text.toLowerCase().normalize('NFD');for(const [mark,n] of Object.entries(marks))if(normalized.includes(mark))tone=n;normalized=normalized.replace(/u\u0308/g,'v').replace(/[\u0300-\u036f]/g,'');return normalized+tone;}
export function createPronunciationPlayer({onUnavailable=()=>{}}={}){
 let manifestPromise,audio,url,generation=0,loading=false,speech,unlocked=false,priming=false;const packs=new Map();
 function stop(){generation++;loading=false;priming=false;if(speech){globalThis.speechSynthesis?.cancel();speech=null;}if(audio){audio.pause();audio.removeAttribute('src');audio.load();}if(url){URL.revokeObjectURL(url);url=null;}}
 // Reuse the element unlocked by the entry tap: mobile browsers may reject
 // a new Audio element created after asynchronous dictionary/pack downloads.
 function unlock(){
  if(unlocked||loading||(audio&&!audio.paused&&!audio.ended))return;
  audio??=new Audio();audio.volume=1;priming=true;
  // A silent PCM frame, played synchronously within a real user gesture.
  audio.src='data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQIAAAAAAA==';
  try{const pending=audio.play();Promise.resolve(pending).then(()=>{unlocked=true;},()=>{});}catch{}
 }
 async function play(entry,index=0){if(loading||(audio&&!priming&&!audio.paused&&!audio.ended)||speech)return false;stop();const token=generation;loading=true;
  try{manifestPromise??=fetch('pronunciation/index.json?v=writing26').then(r=>{if(!r.ok)throw Error('audio index');return r.json();});const manifest=await manifestPromise,key=pinyinKey(entry.pinyin[index%entry.pinyin.length]),clip=manifest[key];if(!clip)throw Error('missing recording');if(clip.speech){if(token!==generation)return false;if(!globalThis.speechSynthesis||!globalThis.SpeechSynthesisUtterance)throw Error('speech unavailable');speech=new SpeechSynthesisUtterance(clip.speech);speech.lang='zh-CN';speech.rate=.75;speech.volume=1;speech.onend=()=>{if(token===generation){speech=null;loading=false;}};speech.onerror=()=>{if(token===generation){speech=null;loading=false;onUnavailable();}};speechSynthesis.speak(speech);return true;}
   if(!packs.has(clip.file))packs.set(clip.file,fetch('pronunciation/'+clip.file+'?v=writing26').then(r=>{if(!r.ok)throw Error('audio pack');return r.arrayBuffer();}).catch(err=>{packs.delete(clip.file);throw err;}));const pack=await packs.get(clip.file);if(token!==generation)return;url=URL.createObjectURL(new Blob([pack.slice(clip.offset,clip.offset+clip.length)],{type:'audio/mpeg'}));audio??=new Audio();audio.src=url;audio.volume=1;audio.onended=()=>{if(token===generation)loading=false;};audio.onerror=()=>{if(token===generation){loading=false;onUnavailable();}};await audio.play();if(token!==generation)return false;loading=false;return true;
  }catch(error){if(token===generation){loading=false;if(error?.name==='NotAllowedError')unlocked=false;manifestPromise=null;onUnavailable();}return false;}
 }
 return {play,stop,unlock};
}

import {isMandarin} from './listening/speech.mjs';
export function chooseDialogueVoice(voices){return voices.find(v=>isMandarin(v)&&/xiaoxiao|晓晓|曉曉/i.test(v.name))||voices.find(isMandarin)||voices.find(v=>/^zh|^cmn/i.test(v.lang));}
export function createDialogueVoice({endpoint,onStatus=()=>{},onVoice=()=>{},onAudio=()=>{},onManualEnd=()=>{}}){
 let generation=0,controller,current,element,finish,timer,objectUrl,gestureBlocked=false;const cache=new Map();
 const audio=()=>element||(element=new Audio());
 function stop(){generation++;controller?.abort();controller=null;clearTimeout(timer);if(current){current.onended=null;current.onerror=null;current.onplay=null;current.onpause=null;current.pause();current.remove?.();current.removeAttribute('src');current.load();current.volume=1;current=null;}if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null;}window.speechSynthesis?.cancel();const done=finish;finish=null;done?.(false);}
 function unlock(){
  window.speechSynthesis?.resume?.();
  // Reuse the element unlocked by a user gesture for all subsequent cloud questions.
  try{if(current)return;const a=audio(),token=generation;const bytes=new Uint8Array(204),view=new DataView(bytes.buffer);const label=(offset,text)=>{for(let i=0;i<text.length;i++)bytes[offset+i]=text.charCodeAt(i);};label(0,'RIFF');view.setUint32(4,196,true);label(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,8000,true);view.setUint32(28,16000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);label(36,'data');view.setUint32(40,160,true);a.src='data:audio/wav;base64,'+btoa(String.fromCharCode(...bytes));a.volume=0;Promise.resolve(a.play()).then(()=>{if(token===generation&&!current){a.pause();a.volume=1;}},()=>{if(!current)a.volume=1;});}catch{}
 }
 async function native(text,voice,token){
  if(!window.speechSynthesis||!window.SpeechSynthesisUtterance)return false;onVoice(voice?.name||'设备中文语音');onStatus('正在朗读 · '+(voice?.name||'设备中文语音'));
  return new Promise(resolve=>{let settled=false;const done=ok=>{if(settled)return;settled=true;clearTimeout(timer);if(finish===done)finish=null;resolve(ok);};finish=done;const u=new SpeechSynthesisUtterance(text);u.lang='zh-CN';u.rate=.75;if(voice)u.voice=voice;u.onend=()=>done(true);u.onerror=()=>done(false);u.onstart=()=>{clearTimeout(timer);timer=setTimeout(()=>{window.speechSynthesis.cancel();done(false);},Math.max(60000,Math.min(180000,text.length*700)));};timer=setTimeout(()=>{window.speechSynthesis.cancel();done(false);},5000);try{window.speechSynthesis.resume?.();window.speechSynthesis.speak(u);}catch{done(false);}if(token!==generation)done(false);});
 }
 async function cloud(text,token){
  onVoice('云端中文音色（非晓晓）');onStatus('正在生成中文语音…');let blob=cache.get(text);
  if(!blob){const url=new URL(endpoint());url.pathname='/speech';url.search='';const requestController=new AbortController();controller=requestController;const timeout=setTimeout(()=>requestController.abort(),35000);try{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text}),signal:requestController.signal,credentials:'omit'});if(!r.ok)throw Error(r.status===429?'今日语音额度已用完':'云端语音暂不可用');if(!r.headers.get('Content-Type')?.startsWith('audio/'))throw Error('语音格式无效');blob=await r.blob();if(blob.size<100)throw Error('语音内容为空');if(token!==generation)return false;if(cache.size>=8)cache.delete(cache.keys().next().value);cache.set(text,blob);}finally{clearTimeout(timeout);}}
  if(token!==generation)return false;
  return new Promise(resolve=>{let settled=false;const done=ok=>{if(settled)return;settled=true;clearTimeout(timer);if(finish===done)finish=null;resolve(ok);};finish=done;current=audio();current.volume=1;objectUrl=URL.createObjectURL(blob);current.src=objectUrl;current.playbackRate=.75;current.controls=true;current.style.width='100%';current.setAttribute('aria-label','播放 AI 中文语音');onAudio(current);current.onended=()=>{if(token!==generation)return;if(settled)onManualEnd(text);else done(true);};current.onerror=()=>done(false);onStatus('正在朗读 · 云端中文音色 · 0.75 倍速');timer=setTimeout(()=>{current?.pause();done(false);},Math.max(60000,Math.min(180000,text.length*700)));Promise.resolve(current.play()).catch(()=>{if(token!==generation)return;gestureBlocked=true;onStatus('浏览器暂停了自动播放，请点击音频播放键或“再听一次”继续。');done(false);});});
 }
 async function play(text){
  stop();gestureBlocked=false;const token=generation,synth=window.speechSynthesis;
  if(synth&&!synth.getVoices().length)await new Promise(resolve=>{let t;const done=()=>{clearTimeout(t);synth.removeEventListener?.('voiceschanged',done);resolve();};t=setTimeout(done,1000);synth.addEventListener?.('voiceschanged',done,{once:true});});
  if(token!==generation)return false;const voice=chooseDialogueVoice(synth?.getVoices()||[]),xiaoxiao=voice&&/xiaoxiao|晓晓|曉曉/i.test(voice.name);
  if(xiaoxiao&&await native(text,voice,token))return true;if(token!==generation)return false;
  try{if(await cloud(text,token))return true;}catch(error){if(token!==generation)return false;onStatus(error.name==='AbortError'?'语音加载超时，请点击“再听一次”重试。':error.message);}
  if(token!==generation||gestureBlocked)return false;if(voice&&await native(text,voice,token))return true;
  if(token===generation)onStatus('声音未能播放，请点击“再听一次”，并检查设备媒体音量。');return false;
 }
 return {play,stop,unlock};
}

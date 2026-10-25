import {isMandarin} from './listening/speech.mjs';
export function chooseDialogueVoice(voices){return voices.find(v=>isMandarin(v)&&/xiaoxiao|晓晓|曉曉/i.test(v.name))||voices.find(isMandarin)||voices.find(v=>/^zh|^cmn/i.test(v.lang));}
export function createDialogueVoice({endpoint,onStatus=()=>{},onVoice=()=>{}}){
 let generation=0,controller,current,finish,timer,objectUrl;const cache=new Map();
 function stop(){generation++;controller?.abort();controller=null;clearTimeout(timer);if(current){current.pause();current.removeAttribute('src');current.load();current=null;}if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null;}window.speechSynthesis?.cancel();const done=finish;finish=null;done?.(false);}
 function unlock(){window.speechSynthesis?.resume?.();}
 async function native(text,voice,token){
  if(!window.speechSynthesis||!window.SpeechSynthesisUtterance)return false;
  onVoice(voice?.name||'设备中文语音');onStatus('正在朗读 · '+(voice?.name||'设备中文语音'));
  return new Promise(resolve=>{const done=ok=>{clearTimeout(timer);if(finish===done)finish=null;resolve(ok);};finish=done;const u=new SpeechSynthesisUtterance(text);u.lang='zh-CN';u.rate=.9;if(voice)u.voice=voice;u.onend=()=>done(true);u.onerror=()=>done(false);u.onstart=()=>{clearTimeout(timer);timer=setTimeout(()=>{window.speechSynthesis.cancel();done(false);},60000);};timer=setTimeout(()=>{window.speechSynthesis.cancel();done(false);},5000);try{window.speechSynthesis.resume?.();window.speechSynthesis.speak(u);}catch{done(false);}if(token!==generation)done(false);});
 }
 async function cloud(text,token){
  onVoice('云端中文音色（非晓晓）');onStatus('正在生成中文语音…');
  let blob=cache.get(text);
  if(!blob){const url=new URL(endpoint());url.pathname='/speech';url.search='';controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),35000);try{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text}),signal:controller.signal,credentials:'omit'});if(!r.ok)throw Error(r.status===429?'今日语音额度已用完':'云端语音暂不可用');if(!r.headers.get('Content-Type')?.startsWith('audio/'))throw Error('语音格式无效');blob=await r.blob();if(blob.size<100)throw Error('语音内容为空');if(cache.size>=3)cache.delete(cache.keys().next().value);cache.set(text,blob);}finally{clearTimeout(timeout);}}
  if(token!==generation)return false;
  return new Promise((resolve,reject)=>{let settled=false;const done=ok=>{if(settled)return;settled=true;clearTimeout(timer);if(finish===done)finish=null;resolve(ok);};finish=done;current=new Audio();objectUrl=URL.createObjectURL(blob);current.src=objectUrl;current.playbackRate=.9;current.onended=()=>done(true);current.onerror=()=>{done(false);};onStatus('正在朗读 · 云端中文音色 · 0.9 倍速');timer=setTimeout(()=>{current?.pause();done(false);},60000);current.play().catch(()=>{onStatus('浏览器阻止了自动播放，请点击“再听一次”。');done(false);});});
 }
 async function play(text){
  stop();const token=generation;
  const synth=window.speechSynthesis;
  if(synth&&!synth.getVoices().length)await new Promise(resolve=>{let t;const done=()=>{clearTimeout(t);synth.removeEventListener?.('voiceschanged',done);resolve();};t=setTimeout(done,1000);synth.addEventListener?.('voiceschanged',done,{once:true});});
  if(token!==generation)return false;
  const voice=chooseDialogueVoice(synth?.getVoices()||[]),xiaoxiao=voice&&/xiaoxiao|晓晓|曉曉/i.test(voice.name);
  if(xiaoxiao&&await native(text,voice,token))return true;
  if(token!==generation)return false;
  try{if(await cloud(text,token))return true;}catch(error){if(token!==generation)return false;onStatus(error.name==='AbortError'?'语音加载超时，请重试。':error.message);}
  if(token!==generation)return false;
  if(voice&&await native(text,voice,token))return true;
  if(token===generation)onStatus('声音未能播放，请点击“再听一次”，并检查设备媒体音量。');return false;
 }
 return {play,stop,unlock};
}

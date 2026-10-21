export const wordVoice='zh-CN-XiaoxiaoNeural';
// Use verified recordings so every device hears Xiaoxiao, independent of installed TTS.
export function createWordAudio({AudioClass=globalThis.Audio,fetchManifest=()=>fetch(new URL('./picture-words/audio/manifest.json?v=xiaoxiao1',import.meta.url),{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Audio manifest unavailable');return r.json();}),onUnavailable=()=>{},onReady=()=>{}}={}){
 let audio,generation=0,manifestPromise,unlocked=false;
 const base=new URL('./picture-words/audio/',import.meta.url);
 function load(){
  manifestPromise??=Promise.resolve().then(fetchManifest).then(m=>{if(m.voices?.female!==wordVoice||!m.clips)throw Error('Unexpected voice');return m;}).catch(e=>{manifestPromise=null;throw e;});return manifestPromise;
 }
 function getAudio(){audio??=new AudioClass();audio.preload='auto';audio.volume=1;return audio;}
 function stop(){generation++;if(audio){audio.onplaying=null;audio.onended=null;audio.onerror=null;try{audio.pause();audio.removeAttribute('src');audio.load();}catch{}}}
 function speak(text){
  stop();const token=generation;
  if(!AudioClass){onUnavailable();return false;}
  let priming;
  try{
   const a=getAudio();
   // Prime the same media element synchronously inside the user's real tap on mobile.
   if(!unlocked){a.src='data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQIAAAAAAA==';a.playbackRate=1;priming=Promise.resolve(a.play()).catch(()=>{});}
   void (async()=>{
    try{
     const manifest=await load();await priming;if(token!==generation)return;
     const clip=manifest.clips[JSON.stringify([wordVoice,text])];
     if(!clip||clip.voice!==wordVoice||!clip.duration||!/^[a-f0-9]{32}\.mp3$/.test(clip.file))throw Error('Missing Xiaoxiao recording');
     a.src=new URL(clip.file,base).href;a.playbackRate=.8;a.preservesPitch=true;a.webkitPreservesPitch=true;
     a.onplaying=()=>{if(token===generation){unlocked=true;onReady();}};
     a.onerror=()=>{if(token===generation)onUnavailable();};
     await a.play();
    }catch{if(token===generation)onUnavailable();}
   })();return true;
  }catch{onUnavailable();return false;}
 }
 void load().catch(()=>{});
 return {speak,stop};
}

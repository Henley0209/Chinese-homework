// Dedicated standalone recordings. Never fall back to a full example syllable.
export function createIsolatedAudio({AudioClass=globalThis.Audio,onStart=()=>{},onEnd=()=>{},onUnavailable=()=>{}}={}){
 let audio,generation=0;
 function stop(){generation++;if(audio){audio.onplaying=null;audio.onended=null;audio.onerror=null;audio.pause();audio.removeAttribute('src');audio.load();}}
 function unlock(){
  try{audio??=new AudioClass();audio.src='data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQIAAAAAAA==';Promise.resolve(audio.play()).catch(()=>{});}catch{}
 }
 function play(source,{rate=1}={}){
  stop();const token=generation;
  try{
   if(!AudioClass||!/^pronunciation\/isolated\/(initials|finals)-[a-z]+\.mp3$/.test(source))throw Error('invalid standalone recording');
   audio??=new AudioClass();audio.src=source+'?v=phonetics3';audio.volume=1;audio.playbackRate=[.5,.75,1].includes(rate)?rate:1;audio.preservesPitch=true;
   audio.onplaying=()=>{if(token===generation)onStart({duration:audio.duration,currentTime:()=>audio.currentTime,rate:audio.playbackRate});};audio.onended=()=>{if(token===generation)onEnd();};audio.onerror=()=>{if(token===generation)onUnavailable();};
   // Direct call inside the letter click preserves mobile browser audio permission.
   const pending=audio.play();Promise.resolve(pending).catch(()=>{if(token===generation)onUnavailable();});return true;
  }catch{if(token===generation)onUnavailable();return false;}
 }
 return {play,stop,unlock};
}

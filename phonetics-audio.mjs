// Dedicated standalone recordings. Never fall back to a full example syllable.
export function createIsolatedAudio({AudioClass=globalThis.Audio,onStart=()=>{},onEnd=()=>{},onUnavailable=()=>{}}={}){
 let audio,generation=0;
 function stop(){generation++;if(audio){audio.onplaying=null;audio.onended=null;audio.onerror=null;audio.pause();audio.removeAttribute('src');audio.load();}}
 function play(source){
  stop();const token=generation;
  try{
   if(!AudioClass||!/^pronunciation\/isolated\/(initials|finals)-[a-z]+\.mp3$/.test(source))throw Error('invalid standalone recording');
   audio??=new AudioClass();audio.src=source+'?v=phonetics2';audio.volume=1;
   audio.onplaying=()=>{if(token===generation)onStart();};audio.onended=()=>{if(token===generation)onEnd();};audio.onerror=()=>{if(token===generation)onUnavailable();};
   // Direct call inside the letter click preserves mobile browser audio permission.
   const pending=audio.play();Promise.resolve(pending).catch(()=>{if(token===generation)onUnavailable();});return true;
  }catch{if(token===generation)onUnavailable();return false;}
 }
 return {play,stop};
}

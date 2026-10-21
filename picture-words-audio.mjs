import {wordRecordings} from './picture-words/audio-index.mjs?v=mobile-tap1';
export const wordVoice='zh-CN-XiaoxiaoNeural';
// The recording index is imported before options become interactive. Never await
// a fetch, silent clip or promise before playing the actual word in a user's tap.
export function createWordAudio({AudioClass=globalThis.Audio,recordings=wordRecordings,onUnavailable=()=>{},onReady=()=>{}}={}){
 let audio,generation=0,preloads=[];
 const base=new URL('./picture-words/audio/',import.meta.url);
 function configure(a){a.preload='auto';a.volume=1;a.playsInline=true;a.setAttribute?.('playsinline','');return a;}
 function stop(){generation++;if(audio){audio.onplaying=null;audio.onended=null;audio.onerror=null;try{audio.pause();}catch{}}}
 function prepare(texts){
  for(const a of preloads){try{a.removeAttribute?.('src');a.load?.();}catch{}}
  preloads=[];
  if(!AudioClass)return;
  for(const text of new Set(texts)){
   const file=recordings[text];if(!/^[a-f0-9]{32}\.mp3$/.test(file||''))continue;
   try{const a=configure(new AudioClass());a.src=new URL(file,base).href;a.load?.();preloads.push(a);}catch{}
  }
 }
 function speak(text){
  stop();const token=generation,file=recordings[text];
  if(!AudioClass||!/^[a-f0-9]{32}\.mp3$/.test(file||'')){onUnavailable();return false;}
  try{
   const a=audio??=configure(new AudioClass());
   a.src=new URL(file,base).href;a.playbackRate=.8;a.preservesPitch=true;a.webkitPreservesPitch=true;
   a.onplaying=()=>{if(token===generation)onReady();};
   a.onerror=()=>{if(token===generation)onUnavailable();};
   // This real MP3 play() must run synchronously within the option's click.
   const playing=a.play();
   if(playing?.catch)playing.catch(()=>{if(token===generation)onUnavailable();});
   return true;
  }catch{if(token===generation)onUnavailable();return false;}
 }
 return {speak,stop,prepare};
}

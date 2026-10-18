// Keep speech inside the option's real click so mobile browsers can play it.
export function createWordAudio({synthesis=globalThis.speechSynthesis,Utterance=globalThis.SpeechSynthesisUtterance,onUnavailable=()=>{},onReady=()=>{}}={}){
 let current=null,generation=0;
 function stop(){generation++;current=null;try{synthesis?.cancel();}catch{}}
 function speak(text){
  stop();const token=generation;
  if(!synthesis||!Utterance){onUnavailable();return false;}
  try{
   const utterance=new Utterance(text);current=utterance;utterance.lang='zh-CN';utterance.rate=.8;utterance.volume=1;
   const voices=synthesis.getVoices?.()||[];
   const voice=voices.find(v=>/^zh[-_]CN$/i.test(v.lang))||voices.find(v=>/^cmn/i.test(v.lang))||voices.find(v=>/^zh[-_]SG$/i.test(v.lang))||voices.find(v=>/^zh[-_]TW$/i.test(v.lang));
   if(voices.length&&!voice){current=null;onUnavailable();return false;}
   if(voice)utterance.voice=voice;
   utterance.onstart=()=>{if(token===generation)onReady();};
   utterance.onend=()=>{if(token===generation)current=null;};
   utterance.onerror=()=>{if(token===generation){current=null;onUnavailable();}};
   synthesis.speak(utterance);return true;
  }catch{current=null;onUnavailable();return false;}
 }
 try{synthesis?.getVoices?.();}catch{}
 return {speak,stop};
}

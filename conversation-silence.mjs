// Require sustained speech before counting a three-second pause.
export function createSilenceGate({silenceMs=3000,minSpeechMs=150,threshold=.012}={}){
 let candidate=null,heard=false,lastVoice=null,noise=.002,finished=false;
 return {push(rms,now){
  if(finished)return {heard,finished:true};
  if(rms<threshold)noise=noise*.95+rms*.05;
  if(rms>Math.max(threshold,noise*3)){
   if(candidate===null)candidate=now;
   if(now-candidate>=minSpeechMs)heard=true;
   if(heard)lastVoice=now;
  }else candidate=null;
  if(heard&&lastVoice!==null&&now-lastVoice>=silenceMs)finished=true;
  return {heard,finished};
 }};
}

export function feedbackText(score,total=100){
 const percent=total>0?score/total*100:0;
 return percent>=100?'100分，你太棒了':percent<60?'不要灰心，继续加油':'已经很不错了，离成功只差一步';
}
export function createFeedbackSpeech({synth=globalThis.speechSynthesis,Utterance=globalThis.SpeechSynthesisUtterance,onStatus=()=>{}}={}){
 let current=null;
 function stop(){const previous=current;current=null;if(previous&&synth)synth.cancel();}
 function play(text){
  stop();
  if(!synth||!Utterance){onStatus('当前浏览器不支持语音播放，请阅读鼓励文字。');return false;}
  try{
   const utterance=new Utterance(text);current=utterance;
   utterance.lang='zh-CN';utterance.pitch=1.55;utterance.rate=1.08;utterance.volume=1;
   const voices=synth.getVoices(),mandarin=voices.filter(v=>/^zh(?:[-_]?(?:CN|TW|SG|Hans|Hant))?$/i.test(v.lang));
   utterance.voice=mandarin.find(v=>/xiaoxiao|xiaoyi|tingting|lili|huihui|female|女/i.test(v.name))||mandarin.find(v=>/^zh[-_]CN$/i.test(v.lang))||mandarin[0]||null;
   utterance.onstart=()=>{if(current===utterance)onStatus('正在播放鼓励语音…');};
   utterance.onend=()=>{if(current===utterance){current=null;onStatus('');}};
   utterance.onerror=()=>{if(current===utterance){current=null;onStatus('语音未能播放，请点击“再听一次”，并确认设备音量已打开。');}};
   onStatus('正在准备鼓励语音…');synth.speak(utterance);return true;
  }catch{current=null;onStatus('语音未能播放，请点击“再听一次”。');return false;}
 }
 return {play,stop};
}
let active;
export function stopFeedback(){active?.stop();active=null;}
export function showFeedback(root,score,total){
 stopFeedback();
 const text=feedbackText(score,total),box=document.createElement('div'),message=document.createElement('p'),button=document.createElement('button'),status=document.createElement('p');
 box.className='result-feedback';message.className='feedback-message';message.textContent=text;
 button.type='button';button.className='quiet feedback-replay';button.textContent='🔊 再听一次 / Nghe lại';
 status.className='note feedback-status';status.setAttribute('role','status');
 active=createFeedbackSpeech({onStatus:value=>{status.textContent=value;}});
 const player=active;button.onclick=()=>player.play(text);box.append(message,button,status);root.append(box);
 player.play(text);
}
if(typeof window!=='undefined')window.addEventListener('pagehide',stopFeedback);

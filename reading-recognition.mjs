export const recognitionErrors={
 'not-allowed':'麦克风或语音服务未获允许，请检查浏览器权限后重试。 / Hãy cho phép micrô và dịch vụ nhận dạng giọng nói.',
 'service-not-allowed':'浏览器不允许使用语音识别服务，请尝试其他受支持的浏览器。 / Dịch vụ nhận dạng không được phép.',
 'audio-capture':'找不到可用麦克风，请检查设备。 / Không tìm thấy micrô.',
 'network':'语音识别连接失败，请检查网络后重新阅读。 / Kiểm tra mạng rồi đọc lại.',
 'no-speech':'没有识别到语音，请靠近麦克风重新阅读。 / Không nhận được giọng nói. Hãy đọc lại.',
 'language-not-supported':'当前浏览器不支持中文语音识别。 / Trình duyệt chưa hỗ trợ nhận dạng tiếng Trung.'
};
export function createReadingRecognition({Recognition,onState=()=>{},onTranscript=()=>{},onScore=()=>{},onError=()=>{},schedule=setTimeout,unschedule=clearTimeout}){
 let generation=0,recognition=null,state='idle',parts=new Map(),transcript='',wantsScore=false,timer=null;
 const setState=value=>{state=value;onState(value);};
 function clearTimer(){if(timer!==null)unschedule(timer);timer=null;}
 function cancel(){generation++;clearTimer();const old=recognition;recognition=null;wantsScore=false;try{old?.abort();}catch{}parts.clear();transcript='';onTranscript('');setState('idle');}
 function score(){if(!transcript.trim()){onError(recognitionErrors['no-speech']);return;}onScore(transcript);}
 function finish(token){
  if(token!==generation)return;
  generation++;clearTimer();recognition=null;setState(transcript.trim()?'recorded':'idle');
  if(wantsScore){wantsScore=false;score();}
 }
 function start(){
  cancel();if(!Recognition){onError('当前浏览器不支持语音识别，请使用支持此功能的Chrome或Edge。 / Hãy thử Chrome hoặc Edge có hỗ trợ nhận dạng giọng nói.');return;}
  const token=generation;
  try{
   recognition=new Recognition();recognition.lang='zh-CN';recognition.continuous=true;recognition.interimResults=true;recognition.maxAlternatives=1;
   recognition.onresult=event=>{
    if(token!==generation)return;
    for(let i=event.resultIndex??0;i<event.results.length;i++)parts.set(i,event.results[i][0]?.transcript||'');
    transcript=[...parts.entries()].sort(([a],[b])=>a-b).map(([,text])=>text).join('');onTranscript(transcript);
   };
   recognition.onerror=event=>{
    if(token!==generation)return;
    const message=recognitionErrors[event.error]||'语音识别中断，请重新阅读。 / Nhận dạng bị gián đoạn. Hãy đọc lại.';
    cancel();onError(message);
   };
   recognition.onend=()=>finish(token);
   setState('listening');recognition.start();
  }catch{
   cancel();onError('无法启动语音识别，请检查麦克风权限并重试。 / Không thể bắt đầu nhận dạng. Hãy kiểm tra quyền micrô.');
  }
 }
 function requestScore(){
  if(state==='stopping')return;
  if(recognition){
   wantsScore=true;setState('stopping');const token=generation,old=recognition;
   timer=schedule(()=>{if(token!==generation)return;finish(token);try{old.abort();}catch{}},4000);
   try{old.stop();}catch{finish(token);try{old.abort();}catch{}}
  }else score();
 }
 return {start,cancel,requestScore,get state(){return state;},get transcript(){return transcript;}};
}

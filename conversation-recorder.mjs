import {createSilenceGate} from './conversation-silence.mjs?v=auto1';
export function canRecord(){return !!(window.MediaRecorder&&navigator.mediaDevices?.getUserMedia);}
export function createAnswerRecorder({endpoint,onStatus=()=>{}}){
 let generation=0,stream,recorder,controller,timer,settle,audioContext,source,monitor,noSpeechTimer;
 function clearMonitor(){clearInterval(monitor);clearTimeout(noSpeechTimer);source?.disconnect();source=null;}
 function prepare(){const Context=window.AudioContext||window.webkitAudioContext;if(Context&&!audioContext)audioContext=new Context();return audioContext?.resume().catch(()=>{});}
 function stopTracks(){clearMonitor();stream?.getTracks().forEach(track=>track.stop());stream=null;}
 function cancel(){generation++;clearTimeout(timer);controller?.abort();if(recorder){recorder.ondataavailable=null;recorder.onstop=null;recorder.onerror=null;if(recorder.state!=='inactive')recorder.stop();recorder=null;}stopTracks();settle?.('');settle=null;}
 function finish(){if(recorder?.state==='recording')recorder.stop();}
 async function start(){
  cancel();const token=generation;onStatus('正在请求麦克风权限…');
  try{
   const acquired=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
   if(token!==generation){acquired.getTracks().forEach(t=>t.stop());return '';}
   stream=acquired;
   const mime=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(type=>MediaRecorder.isTypeSupported(type));
   recorder=new MediaRecorder(stream,mime?{mimeType:mime,audioBitsPerSecond:64000}:{audioBitsPerSecond:64000});
   const blob=await new Promise((resolve,reject)=>{
    const parts=[];let size=0;settle=()=>resolve(null);
    recorder.ondataavailable=event=>{if(event.data.size){size+=event.data.size;parts.push(event.data);}if(size>1048576){reject(Error('录音过大，请缩短回答后重试。'));finish();}};
    recorder.onerror=()=>reject(Error('录音失败，请检查麦克风后重试。'));
    recorder.onstop=()=>{clearMonitor();clearTimeout(timer);const type=recorder?.mimeType||mime||'audio/webm';stopTracks();settle=null;if(size>1048576)return;resolve(new Blob(parts,{type}));};
    recorder.start(1000);onStatus('正在聆听，请用中文回答；说完安静3秒会自动提交。');timer=setTimeout(finish,20000);
    if(!audioContext)prepare();
    if(audioContext){
     const analyser=audioContext.createAnalyser();analyser.fftSize=1024;source=audioContext.createMediaStreamSource(stream);source.connect(analyser);
     const samples=new Float32Array(analyser.fftSize),gate=createSilenceGate();
     monitor=setInterval(()=>{if(token!==generation)return;analyser.getFloatTimeDomainData(samples);let sum=0;for(const value of samples)sum+=value*value;const result=gate.push(Math.sqrt(sum/samples.length),performance.now());if(result.heard)clearTimeout(noSpeechTimer);if(result.finished){onStatus('已检测到3秒停顿，正在提交录音…');finish();}},50);
     noSpeechTimer=setTimeout(()=>{reject(Error('暂时没有听到说话，请点击“开始对话”重新回答。'));finish();},10000);
    }else onStatus('当前设备无法自动检测停顿，请说完后点击“说完了”。');
   });
   if(token!==generation||!blob)return '';
   if(blob.size<200)throw Error('没有录到声音，请确认麦克风权限并重新录音。');
   onStatus('正在识别录音中的中文…');
   const url=new URL(endpoint());url.pathname='/transcribe';url.search='';controller=new AbortController();timer=setTimeout(()=>controller?.abort(),45000);
   const response=await fetch(url,{method:'POST',headers:{'Content-Type':blob.type},body:blob,signal:controller.signal,credentials:'omit'});
   if(!response.ok)throw Error(response.status===429?'今天的录音识别额度已用完，请稍后再试。':'录音识别服务暂不可用，请重试。');
   const result=await response.json();if(typeof result.text!=='string'||result.text.length>500)throw Error('识别结果无效，请缩短回答后重试。');
   if(!result.text.trim())throw Error('录音中没有听清中文，请靠近麦克风并重新回答。');
   return token===generation?result.text.trim():'';
  }catch(error){if(token!==generation)return '';if(['NotAllowedError','PermissionDeniedError'].includes(error.name))throw Error('麦克风权限未开启，请在浏览器网站设置中允许麦克风后重试。');if(error.name==='NotFoundError')throw Error('没有检测到麦克风，请检查设备输入。');if(error.name==='AbortError')throw Error('录音识别超时，请重试。');throw error;}
  finally{if(token===generation){clearTimeout(timer);stopTracks();if(recorder){recorder.onstop=null;recorder.ondataavailable=null;if(recorder.state!=='inactive')recorder.stop();recorder=null;}}}
 }
 return {start,finish,cancel,prepare};
}

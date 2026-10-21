export const fixedVoices={female:'zh-CN-XiaoxiaoNeural',male:'zh-CN-YunxiNeural',narrator:'zh-CN-XiaoxiaoNeural'};
export const previewText='你好，欢迎参加今天的听力练习。请仔细听题，然后选择正确答案。';
export const recordingKey=({role,text})=>JSON.stringify([fixedVoices[role],text]);
// One media element retains the user's playback permission on mobile devices.
// Every audible clip comes from the site's verified recordings; no device TTS.
export function createRecordedPlayer({AudioClass=globalThis.Audio,fetchManifest=()=>fetch(new URL('./audio/manifest.json?v=bank300v1',import.meta.url)).then(r=>{if(!r.ok)throw Error('Audio manifest unavailable');return r.json();}),onStatus=()=>{},gestureTarget=globalThis.document}={}){
 let audio,generation=0,manifestPromise,unlocked=false,unlockPromise,retryGesture;
 const baseURL=new URL('./audio/',import.meta.url);
 function loadManifest(){
  manifestPromise??=Promise.resolve().then(fetchManifest).then(manifest=>{
   if(manifest.voices?.male!==fixedVoices.male||manifest.voices?.female!==fixedVoices.female||manifest.voices?.narrator!==fixedVoices.narrator||!manifest.clips)throw Error('Unexpected recording voices');
   return manifest;
  }).catch(error=>{manifestPromise=null;throw error;});
  return manifestPromise;
 }
 function getAudio(){audio??=new AudioClass();audio.preload='auto';audio.volume=1;return audio;}
 function clearRetry(){if(retryGesture){gestureTarget?.removeEventListener('pointerup',retryGesture);gestureTarget?.removeEventListener('keydown',retryGesture);retryGesture=null;}}
 function stop(){clearRetry();generation++;if(audio){audio.onplaying=null;audio.onended=null;audio.onerror=null;audio.pause();audio.removeAttribute('src');audio.load();}}
 function unlock(){
  if(unlocked||!AudioClass)return Promise.resolve();
  if(unlockPromise)return unlockPromise;
  try{const a=getAudio();a.src='data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQIAAAAAAA==';unlockPromise=Promise.resolve(a.play()).then(()=>{unlocked=true;},()=>{}).finally(()=>{unlockPromise=null;});return unlockPromise;}catch{return Promise.resolve();}
 }
 function retryOnGesture(segments,rate,token){
  if(!gestureTarget||token!==generation)return;clearRetry();
  retryGesture=event=>{if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;clearRetry();if(token===generation)void play(segments,{rate});};
  gestureTarget.addEventListener('pointerup',retryGesture);gestureTarget.addEventListener('keydown',retryGesture);
 }
 async function play(segments,{rate=.8}={}){
  stop();const token=generation;const priming=unlock();
  if(!AudioClass){onStatus('此浏览器不支持音频播放。 / Trình duyệt không hỗ trợ âm thanh.');return;}
  onStatus('正在加载固定普通话录音… / Đang tải bản thu phổ thông…');
  try{
   const manifest=await loadManifest();await priming;if(token!==generation)return;
   const queue=segments.map(segment=>{const clip=manifest.clips[recordingKey(segment)];if(!clip||clip.voice!==fixedVoices[segment.role]||!/^[a-f0-9]{32}\.mp3$/.test(clip.file))throw Error('Missing verified recording');return {...segment,clip};});
   let index=0;
   function next(){
    if(token!==generation)return;
    if(index>=queue.length){onStatus('朗读完成，可再听一次。 / Đã đọc xong, có thể nghe lại.');return;}
    const item=queue[index++],a=getAudio();a.src=new URL(item.clip.file,baseURL).href;a.playbackRate=[.65,.8,.85,1].includes(rate)?rate:.8;a.preservesPitch=true;a.webkitPreservesPitch=true;
    a.onplaying=()=>{if(token===generation){unlocked=true;onStatus(`正在播放 · ${item.role==='male'?'云希男声':'晓晓女声'} / Đang phát · ${item.role==='male'?'Yunxi':'Xiaoxiao'}`);}};
    a.onended=next;a.onerror=()=>{if(token===generation)onStatus('录音加载失败，请检查网络后点击“再听一次”。 / Không tải được bản thu, kiểm tra mạng rồi nghe lại.');};
    try{Promise.resolve(a.play()).catch(error=>{if(token!==generation)return;if(error?.name==='NotAllowedError'){unlocked=false;retryOnGesture(segments,rate,token);onStatus('浏览器等待首次触屏后自动播放。 / Âm thanh sẽ tự phát sau lần chạm đầu tiên.');}else onStatus('录音播放失败，请点击“再听一次”。 / Không phát được bản thu, hãy nghe lại.');});}catch{if(token===generation)onStatus('录音播放失败，请点击“再听一次”。 / Không phát được bản thu, hãy nghe lại.');}
   }
   next();
  }catch{if(token===generation)onStatus('固定录音暂不可用，请检查网络后重试。 / Bản thu chưa tải được, kiểm tra mạng rồi thử lại.');}
 }
 // Warm the index before the first start tap. Failed requests can be retried.
 void loadManifest().catch(()=>{});
 return {play,stop,unlock};
}

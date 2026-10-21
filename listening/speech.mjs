// Web Speech has no standard gender field. Recognize known voices and allow
// explicit assignment for voices whose platform does not report a gender.
export function isMandarin(voice){
 const lang=String(voice.lang||'').replaceAll('_','-').toLowerCase();
 return /^(?:zh-(?:hans-)?cn|cmn-(?:hans-)?cn)$/.test(lang)&&!/(cantonese|粤语|廣東話|广东话|yue[-_])/i.test(voice.name||'');
}
export function voiceGender(voice){
 const name=String(voice.name||'');
 if(/^(?:female|woman)$/i.test(voice.gender||'')||/女声|女聲|female|xiaoxiao|xiaoyi|xiaohan|xiaomeng|xiaomo|xiaoqiu|xiaorui|xiaoshuang|xiaoxuan|xiaoyan|xiaoyou|xiaozhen|huihui|yaoyao|ting[- ]?ting|tingting|lili|sin[- ]?ji/i.test(name))return 'female';
 if(/^(?:male|man)$/i.test(voice.gender||'')||/男声|男聲|\bmale\b|yunxi|yunjian|yunyang|yunfeng|yunhao|yunxia|yunye|yunyi|kangkang|kang[- ]?kang|li[- ]?mu/i.test(name))return 'male';
 return null;
}
const key=v=>v.voiceURI||v.name;
export function chooseVoices(voices,preferred={}){
 const pool=voices.filter(isMandarin);
 const resolve=gender=>pool.find(v=>key(v)===preferred[gender])||pool.find(v=>voiceGender(v)===gender);
 const female=resolve('female'),male=resolve('male');
 return {pool,female,male,narrator:female||male||pool[0]};
}
export function questionSegments(text,question){
 const marks=[...text.matchAll(/(男|女)(?:生|声)?\s*[:：]/g)],segments=[];
 if(!marks.length)segments.push({role:'narrator',text});
 else {
  const prefix=text.slice(0,marks[0].index).trim();if(prefix)segments.push({role:'narrator',text:prefix});
  marks.forEach((m,i)=>{const content=text.slice(m.index+m[0].length,marks[i+1]?.index??text.length).trim();if(content)segments.push({role:m[1]==='男'?'male':'female',text:content});});
 }
 if(question)segments.push({role:'narrator',text:'问题：'+question});
 return segments;
}
export function createMandarinPlayer({speech,Utterance,onStatus=()=>{},preferences=()=>({})}){
 let generation=0,currentSpeech;
 function stop(){generation++;speech?.cancel();currentSpeech=null;}
 async function voicesReady(token){
  if(speech.getVoices().length)return;
  await new Promise(resolve=>{let timer;const done=()=>{clearTimeout(timer);speech.removeEventListener?.('voiceschanged',done);resolve();};timer=setTimeout(done,1500);speech.addEventListener?.('voiceschanged',done,{once:true});if(speech.getVoices().length||token!==generation)done();});
 }
 async function play(segments,{rate=.85}={}){
  stop();const token=generation;
  if(!speech||!Utterance){onStatus('此浏览器不支持朗读。 / Trình duyệt không hỗ trợ giọng đọc.');return;}
  onStatus('正在准备普通话语音… / Đang chuẩn bị giọng phổ thông…');await voicesReady(token);if(token!==generation)return;
  const selected=chooseVoices(speech.getVoices(),preferences());
  if(!selected.pool.length){onStatus('当前设备没有中国大陆普通话音色，请在系统语音设置中添加“中文（中国大陆）”后重试。 / Hãy thêm giọng tiếng Trung (Trung Quốc đại lục) trong cài đặt thiết bị.');return;}
  const roles=[...new Set(segments.map(s=>s.role))];
  const missing=roles.filter(role=>!selected[role]);
  if(missing.length){const label=missing.map(r=>r==='male'?'男声':'女声').join('、');onStatus(`缺少普通话${label}，请在“对话音色”中指定对应音色；若列表中没有，请先在系统中添加。 / Thiếu giọng nam hoặc nữ; hãy chọn giọng trong “Giọng hội thoại” hoặc thêm trong cài đặt thiết bị.`);return;}
  if(roles.includes('male')&&roles.includes('female')&&key(selected.male)===key(selected.female)){onStatus('男女对话需要两种不同音色，请重新选择。 / Hãy chọn hai giọng khác nhau cho nam và nữ.');return;}
  let index=0;
  function next(){
   if(token!==generation)return;
   if(index>=segments.length){currentSpeech=null;onStatus('朗读完成，可再听一次。 / Đã đọc xong, có thể nghe lại.');return;}
   const segment=segments[index++],utterance=new Utterance(segment.text);currentSpeech=utterance;utterance.lang='zh-CN';utterance.voice=selected[segment.role];utterance.rate=rate;utterance.pitch=1;
   const label={male:'男声',female:'女声',narrator:'旁白'}[segment.role];onStatus(`正在朗读 · 普通话${label} / Đang đọc · ${segment.role==='male'?'Giọng nam':segment.role==='female'?'Giọng nữ':'Dẫn chuyện'}`);
   utterance.onend=next;utterance.onerror=e=>{if(token===generation&&!['canceled','interrupted'].includes(e.error)){currentSpeech=null;onStatus('普通话语音播放失败，请检查系统语音是否可用后重试。 / Không phát được giọng phổ thông, hãy kiểm tra cài đặt giọng đọc.');}};
   try{speech.speak(utterance);}catch{if(token===generation)onStatus('语音播放失败，请点击“再听一次”。 / Không phát được, hãy chạm “Nghe lại”.');}
  }
  next();
 }
 return {stop,play};
}

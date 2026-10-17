import {createHandwriting} from './handwriting.mjs?v=writing22';
import {createPronunciationPlayer} from './pronunciation.mjs?v=writing22';
import {stopFeedback} from './result-feedback.mjs?v=writing21';
const $=s=>document.querySelector(s);
export function progressIndex(value,length){const n=Number(value);return Number.isInteger(n)&&n>=0&&n<length?n:0;}
export function pronunciationText(entry,index){return entry.pinyin[index%entry.pinyin.length];}
export function initWriting(){
 const root=$('#writing-practice'),entryButton=$('#practice-writing');if(!root||!entryButton)return;
 const strokeCache=new Map();
 let ink;
 const pronunciation=createPronunciationPlayer({onUnavailable:()=>{const status=root.querySelector('.writing-audio-status');if(status)status.textContent='请点击喇叭重试播放 / Chạm loa để thử lại';}});
 let catalog,legacy,entries=[],bank,index=0,writer,version=0,advance,repeat,emojiTimeout,voiceIndex=0,complete=false;
 const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 const button=(zh,vi,fn,cls='primary')=>{const b=make('button',undefined,cls+' bilingual');b.type='button';b.append(make('span',zh),make('small',vi));b.onclick=fn;return b;};
 function cancel(){version++;clearTimeout(advance);clearInterval(repeat);clearTimeout(emojiTimeout);pronunciation.stop();ink?.destroy();ink=null;writer?.cancelQuiz();writer?.pauseAnimation();writer=null;}
 function save(){try{localStorage.setItem('writing-progress:'+bank,String(index));localStorage.setItem('writing-character:'+bank,entries[index].character);}catch{}}
 async function speak(){
  if(document.hidden||root.hidden)return;
  const e=entries[index],token=version;const played=await pronunciation.play(e,voiceIndex);if(played&&token===version){voiceIndex=(voiceIndex+1)%e.pinyin.length;const status=root.querySelector('.writing-audio-status');if(status)status.textContent='';}
 }
 function reaction(ok){const n=root.querySelector('.writing-emoji');clearTimeout(emojiTimeout);n.textContent=ok?'👍':'😢';n.hidden=false;emojiTimeout=setTimeout(()=>{n.hidden=true;},2000);}
 function success(token){if(token!==version||complete)return;complete=true;reaction(true);root.querySelector('.writing-status').textContent=index<entries.length-1?'写对了！5秒后练习下一个字 / Đúng rồi! Chữ tiếp theo sau 5 giây':'本组练习完成！/ Đã hoàn thành nhóm này!';if(index<entries.length-1)advance=setTimeout(()=>show(index+1),5000);}
 async function show(next){
  cancel();index=progressIndex(next,entries.length);save();complete=false;voiceIndex=0;const token=version,e=entries[index],practiceBank=bank;root.replaceChildren();
  const nav=make('div',undefined,'writing-nav');const prev=button('← 上一个','Chữ trước',()=>show(index-1));prev.disabled=index===0;const following=button('下一个 →','Chữ tiếp theo',()=>show(index+1));following.disabled=index===entries.length-1;nav.append(prev,make('span',`${bank.toUpperCase()} · ${index+1} / ${entries.length}`),following);
  const card=make('div',undefined,'writing-word'),description=make('div');description.append(make('div',`${e.character}  ${e.pinyin.join(' / ')}`,'writing-reading'),make('div',e.vietnamese));const sound=button('🔊','Nghe',speak);sound.setAttribute('aria-label','朗读当前汉字 / Đọc chữ hiện tại');card.append(description,sound);const audioStatus=make('p','','writing-audio-status note');audioStatus.setAttribute('role','status');
  const grid=make('div',undefined,'writing-grid');grid.id='hanzi-grid';grid.setAttribute('aria-label','米字格手写区 / Ô luyện viết');
  const guides=document.createElementNS('http://www.w3.org/2000/svg','svg');guides.setAttribute('viewBox','0 0 100 100');guides.setAttribute('aria-hidden','true');guides.innerHTML='<path d="M0 0L100 100M100 0L0 100M50 0V100M0 50H100" fill="none" stroke="#e9aaa5" stroke-width=".45" stroke-dasharray="2 2"/>';guides.classList.add('writing-guides');grid.append(guides);
  const emoji=make('div',undefined,'writing-emoji');emoji.hidden=true;emoji.setAttribute('aria-hidden','true');grid.append(emoji);const canvas=make('canvas');canvas.className='writing-canvas';canvas.setAttribute('aria-label','手写汉字 / Viết chữ bằng tay');grid.append(canvas);
  const status=make('p','正在加载笔顺… / Đang tải nét chữ…','writing-status');status.setAttribute('role','status');
  const controls=make('div',undefined,'writing-controls');const demo=button('演示书写','Trình diễn viết chữ',async()=>{if(!writer)return;clearTimeout(advance);complete=false;ink?.pause();canvas.hidden=true;demo.disabled=true;check.disabled=true;status.textContent='请看慢速笔顺演示 / Hãy xem thứ tự nét viết chậm';try{await writer.animateCharacter();if(token===version){await writer.hideCharacter();ink?.reset();canvas.hidden=false;check.disabled=false;status.textContent='请慢慢写，写完后点“写好了，检查” / Viết xong rồi nhấn kiểm tra';}}finally{if(token===version)demo.disabled=false;}});demo.disabled=true;
  const check=button('写好了，检查','Kiểm tra chữ',()=>ink?.check());check.disabled=true;
  const restart=button('从第一个字开始练习','Luyện tập từ chữ đầu tiên',()=>show(0));controls.append(demo,restart);
  const clear=button('清空重写','Viết lại',()=>show(index));
  const back=button('返回题库选择新的题目','Quay lại ngân hàng câu hỏi để chọn câu hỏi mới.',()=>{cancel();root.hidden=true;$('#welcome').hidden=false;$('#welcome').scrollIntoView({behavior:'smooth'});});
  root.append(nav,card,audioStatus,make('p',`${e.strokes} 笔 · 可分多笔慢慢写 / Có thể viết chậm từng nét`,'note'),grid,status,check,controls,clear,back);
  try{
   if(!strokeCache.has(practiceBank)){const res=await fetch('writing-strokes-'+practiceBank+'.json');if(!res.ok)throw Error('笔顺加载失败');strokeCache.set(practiceBank,await res.json());}const data=strokeCache.get(practiceBank)[e.character];if(token!==version)return;if(!data)throw Error('找不到当前汉字笔顺');
   if(!globalThis.HanziWriter)throw Error('笔顺组件未加载，请刷新');
   const size=grid.clientWidth;writer=HanziWriter.create(grid,e.character,{width:size,height:size,padding:20,showCharacter:false,showOutline:false,strokeColor:'#153e57',drawingColor:'#2175b7',drawingWidth:18,strokeAnimationSpeed:.35,delayBetweenStrokes:850,highlightOnComplete:false,charDataLoader:()=>Promise.resolve(data)});
   ink=createHandwriting(canvas,{medians:data.medians,onComplete:()=>success(token),onIncomplete:()=>{if(token!==version)return;reaction(false);status.textContent='请检查整字结构，可继续补写或清空重写 / Hãy kiểm tra cả chữ, viết thêm hoặc viết lại';},onWriting:()=>{if(token===version)status.textContent='正在书写，写完后点“写好了，检查” / Đang viết…';}});demo.disabled=false;check.disabled=false;status.textContent='请慢慢写，写完后点“写好了，检查” / Viết xong rồi nhấn kiểm tra';speak();repeat=setInterval(speak,3000);
  }catch(err){if(token===version){status.textContent='加载失败，请点击清空重写重试。 / Không tải được. Hãy thử lại. '+err.message;}}
 }
 entryButton.onclick=async()=>{
  if(!['hsk1-2','hsk3','hsk4'].includes($('#question-bank').value)){$('#bank-error').textContent='写字练习目前支持 HSK1-2、HSK3、HSK4，请先选择其中一个题库。';return;}
  entryButton.disabled=true;
  try{if(!catalog){const response=await fetch('writing-catalog.json');if(!response.ok)throw Error('字库加载失败');catalog=await response.json();try{const migration=await fetch('writing-legacy-progress.json');if(migration.ok)legacy=await migration.json();}catch{}}bank=$('#question-bank').value;entries=catalog[bank];let saved=0;try{saved=localStorage.getItem('writing-progress:'+bank);const character=localStorage.getItem('writing-character:'+bank)||legacy?.[bank]?.[progressIndex(saved,legacy?.[bank]?.length||0)];const found=entries.findIndex(e=>e.character===character);if(found>=0)saved=found;}catch{}stopFeedback();$('#welcome').hidden=true;$('#exercise').hidden=true;$('#result').hidden=true;root.hidden=false;await show(progressIndex(saved,entries.length));root.focus();root.scrollIntoView({behavior:'smooth'});}catch(err){$('#bank-error').textContent=err.message;}finally{entryButton.disabled=false;}
 };
 window.addEventListener('pagehide',cancel);document.addEventListener('visibilitychange',()=>{if(document.hidden)pronunciation.stop();});
}

import {resolveWritingLevel,writingLevels} from './writing-access.mjs?v=writing33';
import {createHandwriting} from './handwriting.mjs?v=writing37';
import {createPronunciationPlayer} from './pronunciation.mjs?v=writing33';
import {stopFeedback} from './result-feedback.mjs?v=writing21';
const $=s=>document.querySelector(s);
export function progressIndex(value,length){const n=Number(value);return Number.isInteger(n)&&n>=0&&n<length?n:0;}
export function pronunciationText(entry,index){return entry.pinyin[index%entry.pinyin.length];}
export function initWriting(){
 const root=$('#writing-practice'),entryButton=$('#practice-writing'),shortcut=$('#writing-shortcut');if(!root||!entryButton)return;
 const strokeCache=new Map();
 let ink,needsAudioGesture=false;
 const pronunciation=createPronunciationPlayer({onUnavailable:()=>{needsAudioGesture=true;const status=root.querySelector('.writing-audio-status');if(status)status.textContent='请点击喇叭重试播放 / Chạm loa để thử lại';}});
 let catalog,legacy,entries=[],bank,index=0,writer,version=0,advance,repeat,emojiTimeout,voiceIndex=0,complete=false;
 const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 const button=(zh,vi,fn,cls='primary')=>{const b=make('button',undefined,cls+' bilingual');b.type='button';b.append(make('span',zh),make('small',vi));b.onclick=fn;return b;};
 function cancel(){version++;clearTimeout(advance);clearInterval(repeat);clearTimeout(emojiTimeout);pronunciation.stop();ink?.destroy();ink=null;writer?.cancelQuiz();writer?.pauseAnimation();writer=null;}
 function save(){try{localStorage.setItem('writing-progress:'+bank,String(index));localStorage.setItem('writing-character:'+bank,entries[index].character);}catch{}}
 async function speak(){
  if(document.hidden||root.hidden)return;
  const e=entries[index],token=version;const played=await pronunciation.play(e,voiceIndex);if(played&&token===version){needsAudioGesture=false;voiceIndex=(voiceIndex+1)%e.pinyin.length;const status=root.querySelector('.writing-audio-status');if(status)status.textContent='';}
 }
 function reaction(ok,afterDisappear=()=>{}){const n=root.querySelector('.writing-emoji');clearTimeout(emojiTimeout);n.textContent=ok?'👍':'😢';n.hidden=false;emojiTimeout=setTimeout(()=>{n.hidden=true;afterDisappear();},2000);}
 function success(token){if(token!==version||complete)return;complete=true;reaction(true);root.querySelector('.writing-status').textContent=index<entries.length-1?'写对了！5秒后练习下一个字 / Đúng rồi! Chữ tiếp theo sau 5 giây':'本组练习完成！/ Đã hoàn thành nhóm này!';if(index<entries.length-1)advance=setTimeout(()=>show(index+1),5000);}
 async function show(next){
  cancel();index=progressIndex(next,entries.length);save();complete=false;voiceIndex=0;const token=version,e=entries[index],practiceBank=bank;root.replaceChildren();
  const nav=make('div',undefined,'writing-nav');const prev=button('← 上字','Trước',()=>show(index-1));prev.disabled=index===0;const following=button('下字 →','Sau',()=>show(index+1));following.disabled=index===entries.length-1;const progress=make('div',`${bank.toUpperCase()} · ${index+1} / ${entries.length}`,'writing-level-progress');const levels=make('div',undefined,'writing-levels');levels.setAttribute('aria-label','选择汉字级别 / Chọn cấp độ');for(const level of writingLevels){const tab=make('button',level.toUpperCase(),'writing-level level-'+level);tab.type='button';tab.setAttribute('aria-pressed',String(level===bank));tab.onclick=()=>{if(level!==bank)void switchLevel(level);};levels.append(tab);}nav.append(prev,levels,following);
  const card=make('div',undefined,'writing-word'),description=make('div');description.append(make('div',`${e.character}  ${e.pinyin.join(' / ')}`,'writing-reading'),make('div',e.vietnamese));const sound=button('🔊','Nghe',speak);sound.setAttribute('aria-label','朗读当前汉字 / Đọc chữ hiện tại');card.append(description,sound);const audioStatus=make('p','','writing-audio-status note');audioStatus.setAttribute('role','status');
  const grid=make('div',undefined,'writing-grid');grid.id='hanzi-grid';grid.setAttribute('aria-label','米字格手写区 / Ô luyện viết');
  const guides=document.createElementNS('http://www.w3.org/2000/svg','svg');guides.setAttribute('viewBox','0 0 100 100');guides.setAttribute('aria-hidden','true');guides.innerHTML='<path d="M0 0L100 100M100 0L0 100M50 0V100M0 50H100" fill="none" stroke="#e9aaa5" stroke-width=".45" stroke-dasharray="2 2"/>';guides.classList.add('writing-guides');grid.append(guides);
  const emoji=make('div',undefined,'writing-emoji');emoji.hidden=true;emoji.setAttribute('aria-hidden','true');grid.append(emoji);const canvas=make('canvas');canvas.className='writing-canvas';canvas.setAttribute('aria-label','手写汉字 / Viết chữ bằng tay');grid.append(canvas);
  const status=make('p','正在加载笔顺… / Đang tải nét chữ…','writing-status');status.setAttribute('role','status');
  let demonstrating=false;
  async function demonstrate(){
   if(token!==version||!writer||demonstrating)return;
   demonstrating=true;const currentWriter=writer;clearTimeout(advance);clearTimeout(emojiTimeout);emoji.hidden=true;complete=false;ink?.pause();canvas.hidden=true;demo.disabled=true;check.disabled=true;status.textContent='请看慢速笔顺演示 / Hãy xem thứ tự nét viết chậm';
   let failed=false;
   try{await currentWriter.setCharacter(e.character);if(token!==version)return;await currentWriter.hideCharacter({duration:0});await currentWriter.animateCharacter();if(token!==version)return;await currentWriter.hideCharacter();}
   catch{failed=true;}
   finally{demonstrating=false;if(token===version){ink?.reset();canvas.hidden=false;check.disabled=false;demo.disabled=false;status.textContent=failed?'演示未完成，请点击演示重试 / Nhấn xem mẫu để thử lại':'自由书写，停笔2秒自动检查 / Dừng 2 giây để kiểm tra';}}
  }
  const controls=make('div',undefined,'writing-controls');const demo=button('演示','Xem mẫu',()=>demonstrate());demo.disabled=true;
  const check=button('检查','Kiểm tra',()=>ink?.check());check.disabled=true;
  const restart=button('从头练习','Từ đầu',()=>show(0));controls.append(check,demo);
  const clear=button('重写','Viết lại',()=>show(index));
  const back=button('返回题库','Về ngân hàng câu hỏi',()=>{cancel();root.hidden=true;$('#welcome').hidden=false;$('#welcome').scrollIntoView({behavior:'smooth'});});
  const secondary=make('div',undefined,'writing-secondary');secondary.append(clear,restart,back);
  root.append(progress,nav,card,audioStatus,make('p',`自由手写 · ${e.strokes} 笔 / Viết tự do · ${e.strokes} nét`,'note'),grid,controls,status,secondary);
  void speak();repeat=setInterval(speak,3000);
  try{
   if(!strokeCache.has(practiceBank)){const res=await fetch('writing-strokes-'+practiceBank+'.json');if(!res.ok)throw Error('笔顺加载失败');strokeCache.set(practiceBank,await res.json());}const data=strokeCache.get(practiceBank)[e.character];if(token!==version)return;if(!data)throw Error('找不到当前汉字笔顺');
   if(!globalThis.HanziWriter)throw Error('笔顺组件未加载，请刷新');
   const size=grid.clientWidth;writer=HanziWriter.create(grid,e.character,{width:size,height:size,padding:20,showCharacter:false,showOutline:false,strokeColor:'#153e57',drawingColor:'#2175b7',drawingWidth:18,strokeAnimationSpeed:.35,delayBetweenStrokes:850,highlightOnComplete:false,charDataLoader:()=>Promise.resolve(data)});
   ink=createHandwriting(canvas,{medians:data.medians,onComplete:()=>success(token),onIncomplete:()=>{if(token!==version)return;ink?.pause();check.disabled=true;demo.disabled=true;status.textContent='2秒后清空并演示一次 / Xóa và xem mẫu sau 2 giây';reaction(false,()=>{if(token!==version)return;ink?.reset();void demonstrate();});},onWriting:()=>{if(token===version)status.textContent='正在书写… / Đang viết…';}});demo.disabled=false;check.disabled=false;status.textContent='自由书写，停笔2秒自动检查 / Dừng 2 giây để kiểm tra';
  }catch(err){if(token===version){status.textContent='加载失败，请点击“重写”重试。 / Không tải được. Hãy thử lại. '+err.message;}}
 }
 async function switchLevel(level){
  bank=level;entries=catalog[bank];let saved=0;try{saved=localStorage.getItem('writing-progress:'+bank);const character=localStorage.getItem('writing-character:'+bank)||legacy?.[bank]?.[progressIndex(saved,legacy?.[bank]?.length||0)];const found=entries.findIndex(e=>e.character===character);if(found>=0)saved=found;}catch{}
  await show(progressIndex(saved,entries.length));
 }
 async function enter(password){
  const level=resolveWritingLevel(password,$('#question-bank').value);pronunciation.unlock();entryButton.disabled=true;if(shortcut)shortcut.disabled=true;
  try{if(!catalog){const response=await fetch('writing-catalog.json');if(!response.ok)throw Error('字库加载失败');catalog=await response.json();try{const migration=await fetch('writing-legacy-progress.json');if(migration.ok)legacy=await migration.json();}catch{}}
   stopFeedback();$('#bank-error').textContent='';$('#welcome').hidden=true;$('#exercise').hidden=true;$('#result').hidden=true;root.hidden=false;await switchLevel(level);root.focus();root.scrollIntoView({behavior:'smooth'});
  }finally{entryButton.disabled=false;if(shortcut)shortcut.disabled=false;}
 }
 let accessDialog;
 function askPassword(message='请输入题库密码 / Vui lòng nhập mật khẩu ngân hàng câu hỏi'){
  if(!accessDialog){accessDialog=make('dialog',undefined,'writing-access-dialog');accessDialog.innerHTML='<form><h2>练习写字 / Luyện viết chữ</h2><label>题库密码 / Mật khẩu<input name="writingPassword" type="password" autocomplete="off" required></label><p role="alert"></p><div class="writing-access-actions"><button type="submit" class="primary">进入 / Vào</button><button type="button" class="quiet">取消 / Hủy</button></div></form>';document.body.append(accessDialog);accessDialog.querySelector('button[type=button]').onclick=()=>accessDialog.close();accessDialog.querySelector('form').onsubmit=async event=>{event.preventDefault();const input=accessDialog.querySelector('input'),submit=accessDialog.querySelector('button[type=submit]');submit.disabled=true;try{await enter(input.value);$('#bank-password').value=input.value;accessDialog.close();}catch(error){accessDialog.querySelector('[role=alert]').textContent=error.message;}finally{submit.disabled=false;}};}
  accessDialog.querySelector('[role=alert]').textContent=message;accessDialog.querySelector('input').value='';if(!accessDialog.open)accessDialog.showModal();accessDialog.querySelector('input').focus();
 }
 async function open(){
  pronunciation.unlock();const password=$('#bank-password').value;
  try{resolveWritingLevel(password,$('#question-bank').value);await enter(password);}catch(error){if($('#welcome').hidden)askPassword(error.message);else{$('#bank-error').textContent=error.message;$('#bank-password').focus();}}
 }
 entryButton.onclick=open;if(shortcut)shortcut.onclick=open;
 // Retry on a real tap when the browser blocked autoplay; keep the practice
 // state intact across back/forward cache and resume immediately on return.
 document.addEventListener('pointerdown',()=>{if(!root.hidden&&needsAudioGesture){pronunciation.unlock();void speak();}},{passive:true});
 document.addEventListener('keydown',()=>{if(!root.hidden&&needsAudioGesture){pronunciation.unlock();void speak();}});
 window.addEventListener('pagehide',()=>pronunciation.stop());
 window.addEventListener('pageshow',()=>{if(!root.hidden)void speak();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pronunciation.stop();else if(!root.hidden)void speak();});
}

import {stopFeedback} from './result-feedback.mjs?v=writing21';
const $=s=>document.querySelector(s);
export function progressIndex(value,length){const n=Number(value);return Number.isInteger(n)&&n>=0&&n<length?n:0;}
export function pronunciationText(entry,index){return pronunciationContexts[entry.character]?.[index]||entry.speech?.[index]||entry.character;}
// Context disambiguates Mandarin polyphones on browsers without phoneme support.
const pronunciationContexts={大:['大小','大夫'],上:['上面','上声'],中:['中国','中奖'],王:['国王','称王'],子:['子女','孩子'],了:['好了','了解'],个:['一个','自个儿'],少:['多少','少年'],好:['你好','爱好'],有:['拥有','又'],会:['开会','会计'],说:['说话','游说','不亦说乎'],读:['读书','句读'],语:['语言','不以语人'],看:['看见','看守'],喝:['喝水','喝彩'],同:['同学','胡同'],校:['学校','校对'],间:['时间','间隔'],分:['分钟','部分'],长:['长短','长大'],乐:['快乐','音乐'],行:['行走','银行'],得:['得到','我得走了','跑得快'],着:['看着','着火','着装','高着'],发:['出发','头发'],地:['土地','慢慢地'],过:['经过','走过了','姓过'],更:['更加','更改'],应:['应该','回应'],角:['角度','角色'],跑:['跑步','牛跑地'],结:['结果','结实'],重:['重要','重新'],种:['种类','种树'],相:['相信','相片'],便:['方便','便宜'],调:['调整','声调'],教:['教书','教育'],觉:['觉得','睡觉'],假:['真假','放假'],解:['解释','押解','姓解'],南:['南方','南无'],且:['而且','且居'],并:['并且','并州'],共:['共同','共工'],各:['各位','自各儿'],合:['合作','公合'],任:['任务','姓任'],论:['讨论','论语'],压:['压力','压根儿'],约:['约会','约一约'],排:['排队','排子车'],择:['选择','择菜'],率:['效率','率领'],量:['数量','量长度'],熟:['熟悉','饭熟了'],藏:['收藏','西藏'],薄:['薄纸','薄弱','薄荷'],差:['差别','差不多','出差','参差'],乘:['乘车','千乘之国'],数:['数字','数数','数见不鲜'],转:['转弯','转圈']};
export function initWriting(){
 const root=$('#writing-practice'),entryButton=$('#practice-writing');if(!root||!entryButton)return;
 const strokeCache=new Map();
 let catalog,legacy,entries=[],bank,index=0,writer,version=0,advance,repeat,emojiTimeout,voiceIndex=0,complete=false;
 const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 const button=(zh,vi,fn,cls='quiet')=>{const b=make('button',undefined,cls+' bilingual');b.type='button';b.append(make('span',zh),make('small',vi));b.onclick=fn;return b;};
 function cancel(){version++;clearTimeout(advance);clearInterval(repeat);clearTimeout(emojiTimeout);globalThis.speechSynthesis?.cancel();writer?.cancelQuiz();writer?.pauseAnimation();writer=null;}
 function save(){try{localStorage.setItem('writing-progress:'+bank,String(index));localStorage.setItem('writing-character:'+bank,entries[index].character);}catch{}}
 function speak(){
  if(document.hidden||root.hidden||!globalThis.speechSynthesis||!globalThis.SpeechSynthesisUtterance)return;
  if(speechSynthesis.speaking||speechSynthesis.pending)return;
  const e=entries[index],u=new SpeechSynthesisUtterance(pronunciationText(e,voiceIndex));voiceIndex=(voiceIndex+1)%e.pinyin.length;u.lang='zh-CN';u.rate=.7;
  u.voice=speechSynthesis.getVoices().find(v=>/^zh[-_]CN$/i.test(v.lang))||null;speechSynthesis.speak(u);
 }
 function reaction(ok){const n=root.querySelector('.writing-emoji');clearTimeout(emojiTimeout);n.textContent=ok?'👍':'😢';n.hidden=false;emojiTimeout=setTimeout(()=>{n.hidden=true;},2000);}
 function quiz(token){if(token!==version||!writer)return;writer.quiz({showHintAfterMisses:false,onMistake:()=>{if(token!==version||complete)return;reaction(false);root.querySelector('.writing-status').textContent='这一笔再试一次 / Hãy thử lại nét này';},onComplete:()=>{if(token!==version)return;complete=true;reaction(true);root.querySelector('.writing-status').textContent=index<entries.length-1?'写对了！5秒后练习下一个字 / Đúng rồi! Chữ tiếp theo sau 5 giây':'本组练习完成！/ Đã hoàn thành nhóm này!';if(index<entries.length-1)advance=setTimeout(()=>show(index+1),5000);}});}
 async function show(next){
  cancel();index=progressIndex(next,entries.length);save();complete=false;voiceIndex=0;const token=version,e=entries[index],practiceBank=bank;root.replaceChildren();
  const nav=make('div',undefined,'writing-nav');const prev=button('← 上一个','Chữ trước',()=>show(index-1));prev.disabled=index===0;const following=button('下一个 →','Chữ tiếp theo',()=>show(index+1));following.disabled=index===entries.length-1;nav.append(prev,make('span',`${bank.toUpperCase()} · ${index+1} / ${entries.length}`),following);
  const card=make('div',undefined,'writing-word'),description=make('div');description.append(make('div',`${e.character}  ${e.pinyin.join(' / ')}`,'writing-reading'),make('div',e.vietnamese));const sound=button('🔊','Nghe',speak);sound.setAttribute('aria-label','朗读当前汉字 / Đọc chữ hiện tại');card.append(description,sound);
  const grid=make('div',undefined,'writing-grid');grid.id='hanzi-grid';grid.setAttribute('aria-label','米字格手写区 / Ô luyện viết');
  const guides=document.createElementNS('http://www.w3.org/2000/svg','svg');guides.setAttribute('viewBox','0 0 100 100');guides.setAttribute('aria-hidden','true');guides.innerHTML='<path d="M0 0L100 100M100 0L0 100M50 0V100M0 50H100" fill="none" stroke="#e9aaa5" stroke-width=".45" stroke-dasharray="2 2"/>';guides.classList.add('writing-guides');grid.append(guides);
  const emoji=make('div',undefined,'writing-emoji');emoji.hidden=true;emoji.setAttribute('aria-hidden','true');grid.append(emoji);
  const status=make('p','正在加载笔顺… / Đang tải nét chữ…','writing-status');status.setAttribute('role','status');
  const controls=make('div',undefined,'writing-controls');const demo=button('演示书写','Trình diễn viết chữ',async()=>{if(!writer)return;clearTimeout(advance);complete=false;writer.cancelQuiz();demo.disabled=true;status.textContent='请看慢速笔顺演示 / Hãy xem thứ tự nét viết chậm';try{await writer.animateCharacter();if(token===version){await writer.hideCharacter();quiz(token);status.textContent='请按笔顺书写 / Viết theo thứ tự nét';}}finally{if(token===version)demo.disabled=false;}});demo.disabled=true;
  const restart=button('从第一个字开始练习','Luyện tập từ chữ đầu tiên',()=>show(0));controls.append(demo,restart);
  const clear=button('清空重写','Viết lại',()=>show(index));
  const back=button('返回题库选择新的题目','Quay lại ngân hàng câu hỏi để chọn câu hỏi mới.',()=>{cancel();root.hidden=true;$('#welcome').hidden=false;$('#welcome').scrollIntoView({behavior:'smooth'});});
  root.append(nav,card,make('p',`${e.strokes} 笔 · 请按笔顺书写 / Viết theo thứ tự ${e.strokes} nét`,'note'),grid,status,controls,clear,back);
  try{
   if(!strokeCache.has(practiceBank)){const res=await fetch('writing-strokes-'+practiceBank+'.json');if(!res.ok)throw Error('笔顺加载失败');strokeCache.set(practiceBank,await res.json());}const data=strokeCache.get(practiceBank)[e.character];if(token!==version)return;if(!data)throw Error('找不到当前汉字笔顺');
   if(!globalThis.HanziWriter)throw Error('笔顺组件未加载，请刷新');
   const size=grid.clientWidth;writer=HanziWriter.create(grid,e.character,{width:size,height:size,padding:20,showCharacter:false,showOutline:false,strokeColor:'#153e57',drawingColor:'#2175b7',drawingWidth:9,strokeAnimationSpeed:.35,delayBetweenStrokes:850,highlightOnComplete:false,charDataLoader:()=>Promise.resolve(data)});
   demo.disabled=false;quiz(token);status.textContent='请按笔顺书写 / Viết theo thứ tự nét';speak();repeat=setInterval(speak,3000);
  }catch(err){if(token===version){status.textContent='加载失败，请点击清空重写重试。 / Không tải được. Hãy thử lại. '+err.message;}}
 }
 entryButton.onclick=async()=>{
  if(!['hsk1-2','hsk3','hsk4'].includes($('#question-bank').value)){$('#bank-error').textContent='写字练习目前支持 HSK1-2、HSK3、HSK4，请先选择其中一个题库。';return;}
  entryButton.disabled=true;
  try{if(!catalog){const response=await fetch('writing-catalog.json');if(!response.ok)throw Error('字库加载失败');catalog=await response.json();try{const migration=await fetch('writing-legacy-progress.json');if(migration.ok)legacy=await migration.json();}catch{}}bank=$('#question-bank').value;entries=catalog[bank];let saved=0;try{saved=localStorage.getItem('writing-progress:'+bank);const character=localStorage.getItem('writing-character:'+bank)||legacy?.[bank]?.[progressIndex(saved,legacy?.[bank]?.length||0)];const found=entries.findIndex(e=>e.character===character);if(found>=0)saved=found;}catch{}stopFeedback();$('#welcome').hidden=true;$('#exercise').hidden=true;$('#result').hidden=true;root.hidden=false;await show(progressIndex(saved,entries.length));root.focus();root.scrollIntoView({behavior:'smooth'});}catch(err){$('#bank-error').textContent=err.message;}finally{entryButton.disabled=false;}
 };
 window.addEventListener('pagehide',cancel);document.addEventListener('visibilitychange',()=>{if(document.hidden)globalThis.speechSynthesis?.cancel();});
}

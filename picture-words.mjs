import {loadPictureState,savePictureState} from './picture-words-state.mjs?v=objects2';
import {resolveWritingLevel} from './writing-access.mjs?v=writing33';
import {validatePictureCatalog,pictureOptions,pictureProgress,createPictureFeedback} from './picture-words-core.mjs?v=vocab1322';
import {createWordAudio} from './picture-words-audio.mjs?v=objects2';
import {stopFeedback} from './result-feedback.mjs?v=writing21';
const $=selector=>document.querySelector(selector);
export function initPictureWords({onEnter=()=>{},onAuthenticatedEntry=()=>{}}={}){
 const root=$('#picture-practice'),entry=$('#practice-pictures');if(!root||!entry)return;
 let catalog,category,index=0,version=0,loading=false,feedback,nodes,currentState={view:'categories'},scrollTimer=null;
 const make=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
 const button=(id,zh,vi,action,cls='primary')=>{const b=make('button',undefined,cls+' bilingual');b.id=id;b.type='button';b.append(make('span',zh),make('small',vi));b.lastChild.lang='vi';b.onclick=action;return b;};
 const audio=createWordAudio({onUnavailable:()=>{if(nodes?.audio)nodes.audio.textContent='未能播放中文读音，请在设备中启用普通话语音后重试。 / Hãy bật giọng đọc tiếng Trung trên thiết bị rồi chạm lại.';},onReady:()=>{if(nodes?.audio)nodes.audio.textContent='';}});
 function capturePosition(){if(!root.hidden){const offset=Math.max(0,-root.getBoundingClientRect().top);if(currentState.offset!==offset){currentState.offset=offset;remember();}}}
 function cancel(){clearTimeout(scrollTimer);version++;feedback?.cancel();audio.stop();}
 function back(){capturePosition();cancel();root.hidden=true;$('#welcome').hidden=false;$('#welcome').scrollIntoView({behavior:'smooth'});}
 function saved(){try{return pictureProgress(localStorage.getItem('picture-progress:'+category.id),category.words.length);}catch{return 0;}}
 function save(){try{localStorage.setItem('picture-progress:'+category.id,String(index));}catch{}}
 function remember(){savePictureState(currentState);}
 function categories(){
  cancel();nodes=null;currentState={view:'categories'};remember();root.replaceChildren();const header=make('div',undefined,'picture-header');header.append(make('h2','看图识词 / Nhìn hình đoán từ'),button('picture-home','返回主页','Về trang chủ',back,'quiet'));
  const choices=make('div',undefined,'picture-categories');
  for(const c of catalog.categories){const b=button('picture-category-'+c.id,c.name,c.vietnamese,()=>{category=c;show(saved());root.focus({preventScroll:true});root.scrollIntoView({behavior:'instant'});});b.append(make('small',c.words.length+' 词 / từ'));choices.append(b);}
  root.append(header,make('p','选择一个分类开始练习。 / Chọn một nhóm để bắt đầu.'),choices);
 }
 function show(next,resume){
  cancel();index=pictureProgress(next,category.words.length);save();const token=version,word=category.words[index];root.replaceChildren();
  const header=make('div',undefined,'picture-header');header.append(make('h2',category.name+' / '+category.vietnamese),button('picture-categories','返回分类','Về danh mục',categories,'quiet'),button('picture-home','返回主页','Về trang chủ',back,'quiet'));
  const nav=make('div',undefined,'picture-navigation');const previous=button('picture-prev','← 上一个','Trước',()=>show(index-1),'quiet'),following=button('picture-next','下一个 →','Sau',()=>show(index+1),'quiet');previous.disabled=index===0;following.disabled=index===category.words.length-1;
  const counter=make('strong',`${index+1} / ${category.words.length}`,'picture-counter');counter.id='picture-counter';nav.append(previous,counter,following);
  const frame=make('div',undefined,'picture-frame'),image=make('img');image.id='picture-image';image.alt=`第${index+1}张${category.name}图片，请从下面四个选项选择。`;image.width=1254;image.height=1254;image.decoding='async';image.fetchPriority='high';
  const emoji=make('div','','picture-emoji');emoji.hidden=true;emoji.setAttribute('aria-hidden','true');frame.append(image,emoji);
  const choices=resume?.optionIds?resume.optionIds.map(id=>category.words.find(w=>w.id===id)):pictureOptions(category,index);
  currentState={view:'question',categoryId:category.id,wordId:word.id,index,optionIds:choices.map(w=>w.id),outcome:resume?.outcome||'ready',selectedId:resume?.selectedId||null};remember();
  const options=make('div',undefined,'picture-options');options.setAttribute('aria-label','选择图片中的物品 / Chọn từ đúng với hình');
  const status=make('p','正在加载图片… / Đang tải hình…','picture-status');status.setAttribute('role','status');
  const audioStatus=make('p','','picture-audio-status note');audioStatus.setAttribute('role','status');const retry=button('picture-image-retry','重新加载图片','Tải lại hình',()=>{retry.hidden=true;status.textContent='正在加载图片… / Đang tải hình…';image.src=word.image+'?retry='+Date.now();},'quiet');retry.hidden=true;
  nodes={emoji,options,status,audio:audioStatus};let ready=false,selected=null;
  const buttons=[];
  feedback=createPictureFeedback({onChange:({phase,emoji:face})=>{
   if(token!==version)return;
   emoji.textContent=face;emoji.hidden=!face;
   currentState.outcome=phase;currentState.selectedId=selected?.dataset.word||null;remember();
   for(const b of buttons){b.classList.toggle('is-correct',['right','waiting','complete'].includes(phase)&&b===selected);b.classList.toggle('is-wrong',phase==='wrong'&&b===selected);b.setAttribute('aria-pressed',String(b===selected&&phase!=='ready'));}
   if(phase==='right'){status.textContent='选对了！ / Đúng rồi!';if(index<category.words.length-1){const upcoming=new Image();upcoming.decoding='async';upcoming.fetchPriority='low';upcoming.src=category.words[index+1].image;}}
   else if(phase==='wrong')status.textContent='再试一次。 / Hãy thử lại.';
   else if(phase==='waiting')status.textContent=index<category.words.length-1?'2秒后进入下一页。 / Chuyển sang trang tiếp theo sau 2 giây.':'选对了！即将完成本组。 / Đúng rồi! Sắp hoàn thành nhóm này.';
   else if(phase==='complete'){status.textContent='上次已答对，可继续下一题或重新练习。 / Lần trước đã chọn đúng. Bạn có thể tiếp tục hoặc luyện lại.';restart.hidden=index!==category.words.length-1;}
   else if(phase==='ready'){selected=null;status.textContent='请选择图片中的物品。 / Chọn từ đúng với hình.';}
  },onAdvance:()=>{
   if(token!==version||root.hidden||document.hidden)return;
   if(index<category.words.length-1)show(index+1);
   else{currentState.outcome='complete';remember();status.textContent='已到最后一页！可以返回分类或从头再练。 / Đã đến trang cuối! Bạn có thể chọn nhóm hoặc luyện lại.';restart.hidden=false;}
  }});
  for(const option of choices){
   const b=make('button',undefined,'picture-option');b.append(make('small',option.pinyin,'picture-option-pinyin'),make('span',option.chinese,'picture-option-hanzi'));b.setAttribute('aria-label',option.chinese+' '+option.pinyin);b.type='button';b.dataset.word=option.id;b.disabled=true;b.setAttribute('aria-pressed','false');
   b.onclick=()=>{audio.speak(option.chinese);if(!ready||feedback.phase!=='ready')return;selected=b;feedback.choose(option.id===word.id);};
   buttons.push(b);options.append(b);
  }
  const restart=button('picture-restart','从头练习','Luyện lại từ đầu',()=>show(0),'quiet');restart.hidden=true;
  image.onload=()=>{if(token!==version)return;ready=true;for(const b of buttons)b.disabled=false;retry.hidden=true;status.textContent=feedback.phase==='complete'?'上次已答对，可继续下一题或重新练习。 / Lần trước đã chọn đúng. Bạn có thể tiếp tục hoặc luyện lại.':'请选择图片中的物品。 / Chọn từ đúng với hình.';};
  image.onerror=()=>{if(token!==version)return;ready=false;for(const b of buttons)b.disabled=true;status.textContent='图片加载失败，请重试。 / Không tải được hình. Hãy thử lại.';retry.hidden=false;};
  root.append(header,nav,frame,options,status,audioStatus,retry,restart,make('p','点击汉字可听普通话读音。答对后自动翻页，答错后重新选择。 / Chạm vào chữ để nghe tiếng Trung. Đúng thì tự chuyển trang, sai thì chọn lại.','note'));
  if(word.sprite){const {columns,rows,index:tile}=word.sprite;Object.assign(image.style,{position:'absolute',width:columns*100+'%',height:rows*100+'%',left:-(tile%columns)*100+'%',top:-Math.floor(tile/columns)*100+'%',objectFit:'fill'});}
  image.src=word.image;
  if(resume?.outcome==='complete'){selected=buttons.find(b=>b.dataset.word===word.id);feedback.settle();}
 }
 async function enter(){
  if(loading||!root.hidden)return;loading=true;entry.disabled=true;const token=version;
  try{
   // Reuse writing practice's exact password policy: any existing course password.
   resolveWritingLevel($('#bank-password').value,$('#question-bank').value);
   if(!catalog){const response=await fetch('./picture-words/catalog.json?v=vocab1322');if(!response.ok)throw Error('图片词库加载失败，请重试。 / Không tải được từ vựng.');catalog=validatePictureCatalog(await response.json());}
   if(token!==version)return;
   onEnter();stopFeedback();document.dispatchEvent(new CustomEvent('practice:enter',{detail:'pictures'}));
   $('#bank-error').textContent='';$('#welcome').hidden=true;$('#exercise').hidden=true;$('#result').hidden=true;const writing=$('#writing-practice');if(writing)writing.hidden=true;
   root.hidden=false;const previous=loadPictureState(catalog);if(previous.view==='question'){category=catalog.categories.find(c=>c.id===previous.categoryId);show(previous.index,previous);}else categories();root.focus({preventScroll:true});root.scrollIntoView({behavior:'instant'});const shown=version;if(Number.isFinite(previous.offset))requestAnimationFrame(()=>{if(shown===version&&!root.hidden)window.scrollBy({top:root.getBoundingClientRect().top+previous.offset,behavior:'instant'});});onAuthenticatedEntry();
  }catch(error){if(token===version){$('#bank-error').textContent=error.message;$('#bank-password').focus();}}
  finally{loading=false;entry.disabled=false;}
 }
 entry.onclick=enter;
 document.addEventListener('practice:enter',event=>{if(event.detail!=='pictures'){capturePosition();cancel();root.hidden=true;}});
 function pause(){capturePosition();audio.stop();if(!root.hidden&&nodes){if(['right','waiting','complete'].includes(feedback?.phase))feedback.settle();else feedback?.reset();remember();}}
 window.addEventListener('scroll',()=>{clearTimeout(scrollTimer);if(!root.hidden)scrollTimer=setTimeout(capturePosition,100);},{passive:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('pagehide',pause);
 return {close:()=>{cancel();root.hidden=true;}};
}

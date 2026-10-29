import {listExercises,subscribe} from './exercise-store.mjs?v=hsk4-40';
import {coursewareBanks,coursewareLevels,pilotIds,validateCourseware,coursewareSlides} from './courseware-core.mjs?v=courseware2';
import {makeCoursewarePptx} from './courseware-pptx.mjs?v=courseware2';
const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
function triple(t){const root=node('div');for(const [key,cls,lang]of [['pinyin','cw-pinyin','zh-Latn'],['zh','cw-hanzi','zh-Hans'],['vi','cw-vietnamese','vi']]){const line=node('div',t[key],cls);line.lang=lang;root.append(line);}return root;}
function art(scene,cls){const image=node('div',undefined,'cw-scene '+cls);image.style.backgroundPosition=`${(scene%3)*50}% ${Math.floor(scene/3)*100}%`;image.setAttribute('role','img');image.setAttribute('aria-label',['师生在教室门口问候','同学在书桌前介绍姓名','中越同学看地球仪介绍国籍','同学在校园挥手告别','老师向同学介绍新朋友','师生看家庭照片交流生活'][scene]);return image;}
export function initCourseware({requireTeacher}){
 const tools=document.querySelector('#tools'),button=document.querySelector('#design-courseware');if(!tools||!button)return;
 const section=node('section',undefined,'courseware-designer');section.id='courseware-designer';section.hidden=true;
 section.innerHTML='<h3>AI 设计课件</h3><p class="courseware-pilot-note">试用版：先提供 HSK1-2 前三个主题，验证内容、图片与排版后再扩展。每课包含两组“300字对话 → 10个生词 → 5道填空”，文字依次显示拼音、汉字、越南语。</p><label>题库<select data-cw-bank></select></label><p data-cw-level class="note"></p><label>练习题 / 课件主题<select data-cw-exercise></select></label><div class="courseware-actions"><button type="button" class="primary" data-cw-preview>预览试用课件</button><button type="button" class="quiet" data-cw-download>下载 PPTX 课件</button></div><p data-cw-status class="courseware-status" role="status" aria-live="polite"></p>';
 tools.append(section);const $=s=>section.querySelector(s),bank=$('[data-cw-bank]'),exercise=$('[data-cw-exercise]'),status=$('[data-cw-status]');
 const cache=new Map();let busy=false;
 for(const [id,label]of Object.entries(coursewareBanks)){const option=node('option',label);option.value=id;bank.append(option);}
 bank.value='hsk1-2';
 function selection(){bank.disabled=busy;exercise.disabled=busy;const ready=bank.value==='hsk1-2'&&pilotIds.includes(exercise.value);$('[data-cw-preview]').disabled=!ready||busy;$('[data-cw-download]').disabled=!ready||busy;$('[data-cw-level]').textContent='难度安排：'+coursewareLevels[bank.value]+'，随主题逐步递进。';status.textContent=ready?'已设计：2组300字对话、20个生词、10道填空，可预览或下载。':'当前主题暂未开放；本次先验证 HSK1-2 前三个主题。';}
 function targets(){const previous=exercise.value;exercise.replaceChildren();for(const e of listExercises(bank.value)){const option=node('option',e.exercise.title+(pilotIds.includes(e.id)?' · 试用课件已就绪':''));option.value=e.id;exercise.append(option);}if([...exercise.options].some(o=>o.value===previous))exercise.value=previous;else if(bank.value==='hsk1-2'&&[...exercise.options].some(o=>o.value===pilotIds[0]))exercise.value=pilotIds[0];selection();}
 bank.addEventListener('change',targets);exercise.addEventListener('change',selection);subscribe(targets);targets();
 button.onclick=()=>{try{requireTeacher();section.hidden=!section.hidden;button.setAttribute('aria-expanded',String(!section.hidden));if(!section.hidden)section.scrollIntoView({block:'start',behavior:'smooth'});}catch(e){status.textContent=e.message;}};
 async function load(){requireTeacher();const id=exercise.value;if(!pilotIds.includes(id))throw Error('请先选择前三个试用主题。');if(!cache.has(id)){const response=await fetch(`courseware/data/${id}.json?v=courseware2`);if(!response.ok)throw Error('课件加载失败，请稍后重试。');cache.set(id,validateCourseware(await response.json()));}requireTeacher();return cache.get(id);}
 const viewer=node('dialog',undefined,'courseware-viewer');viewer.id='courseware-viewer';viewer.setAttribute('aria-label','三语教学课件预览');
 viewer.innerHTML='<div class="courseware-toolbar"><strong data-cw-view-title></strong><div><button type="button" data-cw-fullscreen>全屏展示</button> <button type="button" data-cw-close>返回教师工具 ×</button></div></div><div class="courseware-stage-wrap"><div class="courseware-slide" data-cw-stage></div></div><div class="courseware-controls"><button type="button" data-cw-prev>← 上一页</button><span class="courseware-progress" data-cw-progress role="status" aria-live="polite"></span><button type="button" data-cw-next>下一页 →</button><button type="button" data-cw-answers>显示答案</button><button type="button" data-cw-view-download>下载 PPTX</button></div>';
 document.body.append(viewer);const v=s=>viewer.querySelector(s);let deck=null,slides=[],page=0,answers=false;
 function render(){
  const slide=slides[page],stage=v('[data-cw-stage]');stage.replaceChildren();stage.setAttribute('aria-label',`${deck.title.zh}，第${page+1}页`);
  const header=node('div',undefined,'cw-eyebrow');header.append(node('span',`HSK1–2 / 主题 ${String(deck.number).padStart(2,'0')}`),node('span','Tiếng Trung Cô Nga'));stage.append(header);
  const footer=node('div',undefined,'cw-footer');footer.append(node('span','拼音 → 汉字 → Tiếng Việt'),node('span',`${page+1} / ${slides.length}`));stage.append(footer);
  if(slide.type==='cover'){
   const title=triple(deck.title);title.className='cw-cover';const meta=node('div',undefined,'cw-cover-meta');meta.append(node('div','2组对话 × 300字 · 20个生词 · 10道填空'),node('div',deck.difficulty));title.append(meta);stage.append(title,art(slide.scene,'cw-cover-art'));
  }else if(slide.type==='dialogue'){
   stage.append(art(slide.scene,'cw-dialogue-art'));const caption=triple(slide.title);caption.className='cw-dialogue-caption';caption.append(node('div',Object.entries(slide.roles).map(([id,name])=>`${id} · ${name}`).join('  /  '),'cw-role-legend'));stage.append(caption);
   const heading=node('div',`对话 ${slide.groupIndex+1} · 300字 · ${slide.page}/${slide.pages}`,'cw-section-heading');heading.style.fontSize='1.2cqw';heading.style.top='10%';stage.append(heading);
   const turns=node('div',undefined,'cw-dialogue-turns');for(const turn of slide.turns){const item=triple(turn);item.className='cw-turn';item.prepend(node('span',turn.speaker,'cw-speaker'));turns.append(item);}stage.append(turns);
  }else if(slide.type==='vocabulary'){
   stage.append(node('div',`生词 · 10个 / 对话 ${slide.groupIndex+1}`,'cw-section-heading'));const grid=node('div',undefined,'cw-vocabulary-grid');for(const word of slide.words){const item=triple(word);item.className='cw-word';grid.append(item);}stage.append(grid);
  }else{
   stage.append(node('div',`填空练习 · 5题 / 对话 ${slide.groupIndex+1}`,'cw-section-heading'));const wordBank=node('div',undefined,'cw-word-bank');for(const e of [...slide.exercises].reverse())wordBank.append(triple(e.answer));stage.append(wordBank);
   const exercises=node('div',undefined,'cw-exercises');slide.exercises.forEach((e,i)=>{const item=triple(e);item.className='cw-exercise';item.prepend(node('span',String(i+1).padStart(2,'0'),'cw-exercise-number'));if(answers)item.append(node('div',`参考答案：${e.answer.zh}`,'cw-answer'));exercises.append(item);});stage.append(exercises);
  }
  v('[data-cw-prev]').disabled=page===0;v('[data-cw-next]').disabled=page===slides.length-1;v('[data-cw-answers]').disabled=slide.type!=='exercise';v('[data-cw-answers]').textContent=answers?'隐藏答案':'显示答案';v('[data-cw-progress]').textContent=`${page+1} / ${slides.length}`;
 }
 function move(amount){page=Math.max(0,Math.min(slides.length-1,page+amount));render();}
 v('[data-cw-prev]').onclick=()=>move(-1);v('[data-cw-next]').onclick=()=>move(1);v('[data-cw-answers]').onclick=()=>{answers=!answers;render();};v('[data-cw-close]').onclick=()=>viewer.close();
 v('[data-cw-fullscreen]').onclick=async()=>{try{if(document.fullscreenElement===viewer)await document.exitFullscreen();else await viewer.requestFullscreen();}catch{v('[data-cw-view-title]').textContent=deck.title.zh+' · 当前浏览器不支持全屏，可直接预览。';}};
 viewer.addEventListener('keydown',event=>{if(event.key==='ArrowRight'){event.preventDefault();move(1);}if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}});
 viewer.addEventListener('close',()=>{if(document.fullscreenElement===viewer)void document.exitFullscreen();});
 async function download(value){requireTeacher();const blob=await makeCoursewarePptx(value),url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download=`HSK1-2-第${String(value.number).padStart(2,'0')}课-${value.title.zh.replace(/[\\/:*?"<>|]/g,'')}.pptx`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 $('[data-cw-preview]').onclick=async()=>{if(busy)return;busy=true;selection();status.textContent='正在读取三语课件…';try{deck=await load();slides=coursewareSlides(deck);page=0;answers=false;v('[data-cw-view-title]').textContent=`HSK1-2 第${deck.number}课 · ${deck.title.zh}`;render();viewer.showModal();status.textContent='课件已就绪，可使用左右方向键翻页。手机建议横屏查看。';}catch(e){status.textContent=e.message;}finally{busy=false;bank.disabled=false;exercise.disabled=false;$('[data-cw-preview]').disabled=false;$('[data-cw-download]').disabled=false;}};
 $('[data-cw-download]').onclick=async()=>{if(busy)return;busy=true;selection();status.textContent='正在打包 PPTX…';try{await download(await load());status.textContent='PPTX已下载，可直接用 PowerPoint 或 WPS 打开。';}catch(e){status.textContent=e.message;}finally{busy=false;bank.disabled=false;exercise.disabled=false;$('[data-cw-preview]').disabled=false;$('[data-cw-download]').disabled=false;}};
 v('[data-cw-view-download]').onclick=async()=>{const control=v('[data-cw-view-download]');control.disabled=true;try{await download(deck);}catch(e){v('[data-cw-view-title]').textContent=e.message;}finally{control.disabled=false;}};
 document.querySelector('#user-role').addEventListener('change',()=>{section.hidden=true;button.setAttribute('aria-expanded','false');if(viewer.open)viewer.close();});
}

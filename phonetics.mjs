import {resolveWritingLevel} from './writing-access.mjs?v=writing33';
import {createPronunciationPlayer} from './pronunciation.mjs?v=phonetics5';
import {createMouthMotion} from './mouth-motion.mjs?v=phonetics5';
import {createIsolatedAudio} from './phonetics-audio.mjs?v=phonetics5';
import {phoneticCategories,mouthPhotos} from './phonetics-data.mjs?v=phonetics2';
import {stopFeedback} from './result-feedback.mjs?v=writing21';
const pageSize=6,playbackRate=.35;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const button=(zh,vi,action,cls='quiet')=>{const n=el('button',undefined,cls+' bilingual');n.type='button';n.append(el('span',zh),el('small',vi));n.lastChild.lang='vi';n.onclick=action;return n;};
export function initPhonetics({onEnter=()=>{},onAuthenticatedEntry=()=>{}}={}){
 const root=document.querySelector('#pronunciation-practice'),entry=document.querySelector('#practice-pronunciation');if(!root||!entry)return;
 let category,page=0,selected=0,active=false,status,letter,playButton,tiles=[],photos,motion,playGeneration=0;
 function onStart(timing){active=true;status.textContent='正在播放读音和 AI 口型动作 / Đang phát âm và khẩu hình AI';playButton.textContent='■ 停止 / Dừng';motion?.play(timing);}
 function onEnd(){stop();status.textContent='播放完成，点击字母可再次聆听。 / Đã phát xong. Chạm chữ để nghe lại.';}
 function onUnavailable(){stop();status.textContent='读音加载或播放失败，请检查网络后点击重试。 / Không phát được âm. Kiểm tra mạng rồi chạm để thử lại.';}
 const isolated=createIsolatedAudio({onStart,onEnd,onUnavailable});
 const tonePlayer=createPronunciationPlayer({onStart,onEnd,onUnavailable});
 function stop(){playGeneration++;active=false;motion?.stop();isolated.stop();tonePlayer.stop();if(playButton)playButton.textContent='▶ 再听一次 / Nghe lại';}
 function focusRoot(){root.focus({preventScroll:true});root.scrollIntoView({behavior:'instant'});}
 function header(title){const h=el('div',undefined,'phonetics-header');h.append(el('h2',title),button('返回主页','Về trang chủ',home));return h;}
 function home(){stop();root.hidden=true;document.querySelector('#welcome').hidden=false;entry.focus();entry.scrollIntoView({behavior:'instant'});}
 function categories(){stop();motion?.dispose();motion=null;category=null;root.replaceChildren(header('发音练习 / Luyện phát âm'),el('p','选择一组，点击字母听独立读音，观看 AI 人嘴发音动作。 / Chọn nhóm, chạm chữ để nghe âm riêng và xem khẩu hình AI chuyển động.'));const grid=el('div',undefined,'phonetics-categories');for(const c of phoneticCategories){const b=button(c.zh,c.vi,()=>{category=c;page=0;selected=0;render();focusRoot();},'primary');b.append(el('small',`${c.items.length} 项 / mục`));grid.append(b);}root.append(grid,el('p','声母含 21 个声母及拼写字母 y、w；韵母含基本韵母与常用组合；声调含四声与轻声。 / Gồm phụ âm đầu, vần và thanh điệu.','note'));focusRoot();}
 function photo(shape,label){
  const tile=mouthPhotos[shape],n=el('div',undefined,'phonetics-photo');
  n.style.backgroundPosition=(tile%4)*100/3+'% '+Math.floor(tile/4)*50+'%';n.dataset.pose=shape;n.setAttribute('role','img');n.setAttribute('aria-label',label);return n;
 }
 function showMotion(item){
  motion?.dispose();photos.replaceChildren();
  const canvas=el('canvas');canvas.width=640;canvas.height=640;canvas.className='phonetics-motion-canvas';canvas.setAttribute('role','img');canvas.setAttribute('aria-label',item.symbol+' · AI 人嘴发音动作 / Khẩu hình AI chuyển động');
  const poster=photo(item.shapes[0],item.symbol+' · AI 口型');poster.removeAttribute('role');poster.removeAttribute('aria-label');poster.append(canvas);
  photos.append(poster);
  motion=createMouthMotion(canvas);
  const owner=motion;
  void owner.prepare(item,category.id).catch(()=>{if(owner===motion)status.textContent='AI 口型素材暂未加载，可点击播放重试。 / Chưa tải được khẩu hình AI, chạm phát để thử lại.';});
 }
 function select(index,play=false){
  stop();selected=index;const item=category.items[index];letter.textContent=item.symbol;
  root.querySelector('[data-guide-zh]').textContent=item.zh;root.querySelector('[data-guide-vi]').textContent=item.vi;
  for(const b of tiles)b.setAttribute('aria-pressed',String(Number(b.dataset.index)===index));
  const chart=root.querySelector('.phonetics-tone');chart.hidden=!item.contour;if(item.contour)chart.querySelector('polyline').setAttribute('points',item.contour);
  status.textContent='点击字母，自动以 0.35 倍速朗读并播放对应口型。 / Chạm chữ để tự phát âm và khẩu hình ở tốc độ 0.35×.';showMotion(item);if(play)playCurrent();
 }
 async function playCurrent(){
  stop();const token=playGeneration,item=category.items[selected],owner=motion,group=category.id;
  if(group==='tones')tonePlayer.unlock();else isolated.unlock();
  status.textContent='正在加载口型和读音… / Đang tải khẩu hình và âm…';
  try{await owner.prepare(item,group);}catch{if(token!==playGeneration)return;status.textContent='口型素材加载失败，请检查网络后重试。 / Không tải được khẩu hình, kiểm tra mạng rồi thử lại.';return;}
  if(token!==playGeneration||root.hidden||document.hidden)return;
  if(group==='tones')void tonePlayer.play({pinyin:[item.pinyin],rate:playbackRate});else isolated.play(item.audio,{rate:playbackRate});
 }
 function render(){
  stop();root.replaceChildren();const h=header(category.zh+' / '+category.vi);h.append(button('返回分类','Về danh mục',categories));root.append(h);
  const nav=el('div',undefined,'phonetics-nav'),prev=button('← 上一页','Trang trước',()=>changePage(-1)),next=button('下一页 →','Trang sau',()=>changePage(1));prev.disabled=page===0;next.disabled=(page+1)*pageSize>=category.items.length;nav.append(prev,el('strong',`${page+1} / ${Math.ceil(category.items.length/pageSize)}`),next);root.append(nav);
  const grid=el('div',undefined,'phonetics-letters');tiles=[];for(let i=page*pageSize;i<Math.min((page+1)*pageSize,category.items.length);i++){const item=category.items[i],b=el('button',item.symbol);b.type='button';b.onclick=()=>select(i,true);b.dataset.index=i;b.setAttribute('aria-label',item.symbol+' · 点击听读音 / Nghe phát âm');tiles.push(b);grid.append(b);}root.append(grid);
  const demo=el('div',undefined,'phonetics-demo');letter=el('button',undefined,'phonetics-selected');letter.type='button';letter.setAttribute('aria-label','播放当前读音 / Phát âm');letter.onclick=playCurrent;
  photos=el('div',undefined,'phonetics-photos');
  const zh=el('p');zh.dataset.guideZh='';const vi=el('p',undefined,'phonetics-vi');vi.lang='vi';vi.dataset.guideVi='';
  const chart=el('div',undefined,'phonetics-tone');chart.innerHTML='<svg viewBox="0 0 220 185" role="img" aria-label="五度声调示意：纵向越高音越高，横向为时间 / Đường cao độ theo thời gian"><path d="M20 20 V160 H195 M20 25 H190 M20 60 H190 M20 95 H190 M20 130 H190" fill="none" stroke="#d9dfe8"/><text x="1" y="28" font-size="12">5</text><text x="1" y="165" font-size="12">1</text><polyline fill="none" stroke="#375dce" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><text x="80" y="181" font-size="11">时间 / Thời gian →</text></svg>';
  playButton=button('▶ 播放','Phát âm',()=>{if(active){stop();status.textContent='已停止 / Đã dừng';}else playCurrent();},'primary');status=el('p',undefined,'phonetics-status');status.setAttribute('role','status');
  demo.append(letter,photos,chart,zh,vi,playButton,status,el('p','AI 生成动作帧合成的写实口型模拟，仅作辅助参考。舌根等内部位置请结合文字说明。 / Khẩu hình mô phỏng từ các khung hình AI, dùng để tham khảo; xem hướng dẫn về vị trí bên trong miệng.','note'));
  if(category.id==='initials')demo.append(el('p','声母按普通话拼音教学读法完整示范，慢速跟读。 / Phụ âm được đọc đầy đủ theo cách dạy pinyin tiếng Phổ thông, hãy luyện đọc chậm.','note'));
  root.append(demo);select(selected);
 }
 function changePage(delta){page+=delta;selected=page*pageSize;render();focusRoot();}
 entry.onclick=()=>{
  try{resolveWritingLevel(document.querySelector('#bank-password').value,document.querySelector('#question-bank').value);}catch(error){document.querySelector('#bank-error').textContent=error.message;document.querySelector('#bank-password').focus();return;}
  onEnter();stopFeedback();document.dispatchEvent(new CustomEvent('practice:enter',{detail:'pronunciation'}));for(const id of ['welcome','exercise','result','writing-practice','picture-practice']){const node=document.getElementById(id);if(node)node.hidden=true;}document.querySelector('#bank-error').textContent='';root.hidden=false;categories();onAuthenticatedEntry();
 };
 document.addEventListener('practice:enter',event=>{if(event.detail!=='pronunciation'){stop();root.hidden=true;}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',stop);
 return {close:()=>{stop();root.hidden=true;}};
}

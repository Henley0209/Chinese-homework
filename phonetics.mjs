import {resolveWritingLevel} from './writing-access.mjs?v=writing33';
import {createPronunciationPlayer} from './pronunciation.mjs?v=phonetics1';
import {phoneticCategories,mouthShapes} from './phonetics-data.mjs?v=phonetics1';
import {stopFeedback} from './result-feedback.mjs?v=writing21';
const pageSize=6;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const button=(zh,vi,action,cls='quiet')=>{const n=el('button',undefined,cls+' bilingual');n.type='button';n.append(el('span',zh),el('small',vi));n.lastChild.lang='vi';n.onclick=action;return n;};
export function initPhonetics({onEnter=()=>{},onAuthenticatedEntry=()=>{}}={}){
 const root=document.querySelector('#pronunciation-practice'),entry=document.querySelector('#practice-pronunciation');if(!root||!entry)return;
 let category,page=0,selected=0,frame=0,active=false,started=0,duration=700,status,mouth,letter,phase,playButton,tiles=[],outline,stepButtons=[];
 const player=createPronunciationPlayer({onStart:(timing={})=>{active=true;duration=Number.isFinite(timing.duration)?Math.max(150,timing.duration*1000):700;started=performance.now();status.textContent='正在播放示范音节，口型为分步教学示意。 / Đang phát âm mẫu; khẩu hình minh họa theo bước.';playButton.textContent='■ 停止 / Dừng';animate();},onEnd:()=>{stop();status.textContent='播放完成，点击字母可再次聆听。 / Đã phát xong. Chạm chữ để nghe lại.';},onUnavailable:()=>{stop();status.textContent='读音加载或播放失败，请检查网络后点击重试。 / Không phát được âm. Kiểm tra mạng rồi chạm để thử lại.';}});
 function stop(){cancelAnimationFrame(frame);frame=0;active=false;player.stop();if(playButton)playButton.textContent='▶ 再听一次 / Nghe lại';if(mouth&&category)draw(category.items[selected].shapes[0],0);}
 function animate(){
  if(!active||root.hidden)return;
  const progress=Math.min(1,(performance.now()-started)/duration),item=category.items[selected];
  const poses=[mouthShapes.closed,...item.shapes.map(s=>mouthShapes[s]),mouthShapes.closed];
  const position=progress*(poses.length-1),segment=Math.min(poses.length-2,Math.floor(position)),t=position-segment;
  const blend=poses[segment].map((value,i)=>value+(poses[segment+1][i]-value)*t);
  draw(blend,progress<.45?0:1);frame=requestAnimationFrame(animate);
 }
 function draw(shape,step){
  if(!mouth)return;const [opening,width,tongue]=Array.isArray(shape)?shape:mouthShapes[shape],cx=210,cy=130,rx=140*width,ry=6+opening*66;
  const cavity=mouth.querySelector('[data-cavity]');cavity.setAttribute('rx',rx);cavity.setAttribute('ry',ry);
  mouth.querySelector('[data-clip]').setAttribute('rx',rx-3);mouth.querySelector('[data-clip]').setAttribute('ry',Math.max(2,ry-2));
  mouth.querySelector('[data-teeth]').setAttribute('y',cy-ry-2);
  mouth.querySelector('[data-tongue]').setAttribute('d',`M ${cx-rx*.7} ${cy+ry} Q ${cx-rx*.4} ${cy+ry-45*tongue} ${cx} ${cy+ry-60*tongue} Q ${cx+rx*.4} ${cy+ry-45*tongue} ${cx+rx*.7} ${cy+ry} Z`);
  const lips=`M ${cx-rx} ${cy} C ${cx-rx*.55} ${cy-ry-26}, ${cx-30} ${cy-ry-16}, ${cx} ${cy-ry-9} C ${cx+30} ${cy-ry-16}, ${cx+rx*.55} ${cy-ry-26}, ${cx+rx} ${cy} C ${cx+rx*.7} ${cy+ry+32}, ${cx-rx*.7} ${cy+ry+32}, ${cx-rx} ${cy} Z M ${cx-rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx+rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx-rx} ${cy}`;
  mouth.querySelector('[data-lips]').setAttribute('d',lips);
  phase.textContent=step===0?'① 起始口型 / Bắt đầu':'② 发音口型 / Phát âm';
  for(const [i,b] of stepButtons.entries())b.setAttribute('aria-pressed',String(i===step));
 }
 function focusRoot(){root.focus({preventScroll:true});root.scrollIntoView({behavior:'instant'});}
 function header(title){const h=el('div',undefined,'phonetics-header');h.append(el('h2',title),button('返回主页','Về trang chủ',home));return h;}
 function home(){stop();root.hidden=true;document.querySelector('#welcome').hidden=false;entry.focus();entry.scrollIntoView({behavior:'instant'});}
 function categories(){stop();category=null;mouth=null;root.replaceChildren(header('发音练习 / Luyện phát âm'),el('p','选择一组，点击字母听示范音，观察放大的口型。 / Chọn một nhóm, chạm chữ để nghe và quan sát khẩu hình.'));const grid=el('div',undefined,'phonetics-categories');for(const c of phoneticCategories){const b=button(c.zh,c.vi,()=>{category=c;page=0;selected=0;render();focusRoot();},'primary');b.append(el('small',`${c.items.length} 项 / mục`));grid.append(b);}root.append(grid,el('p','声母含 21 个声母及拼写字母 y、w；韵母含基本韵母与常用组合；声调含四声与轻声。 / Gồm phụ âm đầu, vần và thanh điệu.','note'));focusRoot();}
 function select(index,play=false){stop();selected=index;const item=category.items[index];letter.textContent=item.symbol;outline.textContent='示范音节 / Âm tiết mẫu: '+item.pinyin;root.querySelector('[data-guide-zh]').textContent=item.zh;root.querySelector('[data-guide-vi]').textContent=item.vi;for(const b of tiles)b.setAttribute('aria-pressed',String(Number(b.dataset.index)===index));
  const chart=root.querySelector('.phonetics-tone');chart.hidden=!item.contour;if(item.contour)chart.querySelector('polyline').setAttribute('points',item.contour);
  status.textContent='点击字母或播放按钮听示范音。 / Chạm chữ hoặc nút phát để nghe âm mẫu.';draw(item.shapes[0],0);if(play)playCurrent();
 }
 function playCurrent(){stop();player.unlock();status.textContent='正在加载读音… / Đang tải âm…';void player.play({pinyin:[category.items[selected].pinyin]});}
 function render(){
  stop();root.replaceChildren();const h=header(category.zh+' / '+category.vi);h.append(button('返回分类','Về danh mục',categories));root.append(h);
  const nav=el('div',undefined,'phonetics-nav'),prev=button('← 上一页','Trang trước',()=>changePage(-1)),next=button('下一页 →','Trang sau',()=>changePage(1));prev.disabled=page===0;next.disabled=(page+1)*pageSize>=category.items.length;nav.append(prev,el('strong',`${page+1} / ${Math.ceil(category.items.length/pageSize)}`),next);root.append(nav);
  const grid=el('div',undefined,'phonetics-letters');tiles=[];for(let i=page*pageSize;i<Math.min((page+1)*pageSize,category.items.length);i++){const item=category.items[i],b=button(item.symbol,item.pinyin,()=>select(i,true));b.dataset.index=i;b.setAttribute('aria-label',item.symbol+'，示范音节 '+item.pinyin);tiles.push(b);grid.append(b);}root.append(grid);
  const demo=el('div',undefined,'phonetics-demo');letter=button('','',playCurrent);letter.className='phonetics-selected';letter.setAttribute('aria-label','播放当前示范音节 / Phát âm mẫu');letter.onclick=playCurrent;outline=el('p',undefined,'phonetics-example');phase=el('p',undefined,'phonetics-phase');
  mouth=el('div',undefined,'phonetics-mouth');
  // Static, locally authored SVG: enlarged frontal view of lips, teeth and tongue.
  mouth.innerHTML='<svg viewBox="0 0 420 290" role="img" aria-label="唇、牙齿和舌尖的放大教学示意 / Minh họa môi, răng và đầu lưỡi"><defs><radialGradient id="mouth-skin"><stop stop-color="#fff1e5"/><stop offset="1" stop-color="#f0cbb4"/></radialGradient><linearGradient id="mouth-lip" x2="0" y2="1"><stop stop-color="#bd405b"/><stop offset=".5" stop-color="#ef8b99"/><stop offset="1" stop-color="#bf4560"/></linearGradient><clipPath id="mouth-clip"><ellipse data-clip cx="210" cy="130" rx="100" ry="40"/></clipPath></defs><rect width="420" height="290" rx="28" fill="url(#mouth-skin)"/><path d="M180 25 Q210 40 240 25 M198 47 Q210 53 222 47" fill="none" stroke="#d3a28c" stroke-width="3"/><ellipse data-cavity cx="210" cy="130" rx="100" ry="40" fill="#411d2c"/><g clip-path="url(#mouth-clip)"><rect data-teeth x="50" y="90" width="320" height="27" rx="9" fill="#fffcf1" stroke="#d5c6b9"/><path data-tongue fill="#e8788d" stroke="#bd4c6b" stroke-width="2"/></g><path data-lips fill="url(#mouth-lip)" fill-rule="evenodd"/><path d="M185 218 Q210 225 235 218" fill="none" stroke="#d3a28c" stroke-width="3"/><text x="210" y="268" text-anchor="middle" fill="#5c3941" font-size="14">唇 · 牙齿 · 舌尖 / Môi · Răng · Đầu lưỡi</text></svg>';
  stepButtons=[0,1].map(i=>button(i?'② 查看发音口型':'① 查看起始口型',i?'Khẩu hình phát âm':'Khẩu hình bắt đầu',()=>{stop();draw(category.items[selected].shapes[i],i);status.textContent='分步观察 / Xem từng bước';}));const steps=el('div',undefined,'phonetics-steps');steps.append(...stepButtons);
  const zh=el('p');zh.dataset.guideZh='';const vi=el('p',undefined,'phonetics-vi');vi.lang='vi';vi.dataset.guideVi='';
  const chart=el('div',undefined,'phonetics-tone');chart.innerHTML='<svg viewBox="0 0 220 185" role="img" aria-label="五度声调示意：纵向越高音越高，横向为时间 / Đường cao độ theo thời gian"><path d="M20 20 V160 H195 M20 25 H190 M20 60 H190 M20 95 H190 M20 130 H190" fill="none" stroke="#d9dfe8"/><text x="1" y="28" font-size="12">5</text><text x="1" y="165" font-size="12">1</text><polyline fill="none" stroke="#375dce" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><text x="80" y="181" font-size="11">时间 / Thời gian →</text></svg>';
  playButton=button('▶ 播放','Phát âm',()=>{if(active){stop();status.textContent='已停止 / Đã dừng';}else playCurrent();},'primary');status=el('p',undefined,'phonetics-status');status.setAttribute('role','status');
  demo.append(letter,outline,mouth,phase,steps,chart,zh,vi,playButton,status,el('p','口型为教学动画示意，非真人实拍或逐帧音画同步；舌根等内部位置请结合文字观察。声母使用完整音节示范，请重点听开头；部分韵母使用带声母的示范音节。 / Khẩu hình là hoạt hình minh họa, không phải video người thật hay đồng bộ từng khung hình. Chú ý âm đầu hoặc phần vần trong âm tiết mẫu.','note'));root.append(demo);select(selected);
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

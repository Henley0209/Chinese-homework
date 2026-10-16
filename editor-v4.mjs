import {defaults,validateAppearance,applyAppearance} from './appearance-v4.mjs?v=opacity-5';
const form=document.querySelector('#settings'),frame=document.querySelector('#preview'),status=document.querySelector('#status'),key='qinglan-appearance-draft-v1';let config={...defaults};
function show(t){status.textContent=t;}
function send(){
 // Apply directly to the same-origin preview, independent of ready-message timing.
 try{const doc=frame.contentDocument;if(doc?.querySelector('.hero'))applyAppearance(config,doc);}catch{}
 frame.contentWindow?.postMessage({type:'appearance-preview',config},location.origin);
}
frame.addEventListener('load',send);
function populate(c){config=validateAppearance(c);for(const [k,v]of Object.entries(config)){const input=form.elements.namedItem(k);if(!input)continue;if(input.type==='checkbox')input.checked=v;else input.value=v;}labels();send();}
function labels(){document.querySelector('#photo-opacity-value').textContent=config.backgroundOpacity+'%';document.querySelector('#overlay-opacity-value').textContent=config.overlayOpacity+'%';document.querySelector('#font-value').textContent=config.fontSize+'px';document.querySelector('#title-value').textContent=config.titleSize+'px';}
function read(){const c={};for(const [k,v]of Object.entries(defaults)){const input=form.elements.namedItem(k);if(!input){c[k]=config[k];continue;}c[k]=typeof v==='boolean'?input.checked:typeof v==='number'?Number(input.value):input.value;}return validateAppearance(c);}
window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===frame.contentWindow&&e.data?.type==='appearance-ready'){send();}});
form.addEventListener('submit',e=>e.preventDefault());form.addEventListener('input',()=>{try{config=read();labels();send();show('正在预览修改，尚未保存或发布。');}catch(e){show(e.message);}});
async function published(){const r=await fetch('./site-config.json',{cache:'no-store'});if(!r.ok)throw Error('暂时无法读取网站配置，请稍后重试。');return validateAppearance(await r.json());}
document.querySelector('#save').onclick=()=>{try{config=read();localStorage.setItem(key,JSON.stringify(config));show('本机草稿已保存。学生页面尚未改变。');}catch(e){show('保存失败：'+e.message);}};
document.querySelector('#export').onclick=()=>{try{config=read();const url=URL.createObjectURL(new Blob([JSON.stringify(config,null,2)+'\n'],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='site-config.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);show('配置已下载。请上传到GitHub替换 site-config.json，才会对所有学生生效。');}catch(e){show(e.message);}};
document.querySelector('#import-config').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>4200000)throw Error('配置文件过大');populate(JSON.parse(await f.text()));show('已导入预览，尚未保存或发布。');}catch(e){show('导入失败：'+e.message);}finally{e.target.value='';}};
document.querySelector('#published').onclick=async()=>{if(!confirm('载入网站配置将替换当前预览，是否继续？'))return;try{populate(await published());show('已载入网站配置，本机草稿未改动。');}catch(e){show(e.message);}};
document.querySelector('#reset').onclick=()=>{if(confirm('恢复默认外观？这只影响当前预览。')){populate(defaults);show('已恢复默认预览，可保存草稿或下载配置。');}};
for(const mode of ['desktop','mobile'])document.querySelector('#'+mode).onclick=()=>{frame.classList.toggle('mobile',mode==='mobile');for(const id of ['desktop','mobile'])document.querySelector('#'+id).setAttribute('aria-pressed',String(id===mode));};
populate(defaults);
try{let draft;try{draft=localStorage.getItem(key);}catch{}if(draft){try{populate(JSON.parse(draft));show('已载入本机草稿。学生页面使用网站已发布的配置。');}catch{populate(await published());show('本机草稿无效，已载入网站配置。');}}else{populate(await published());show('已载入网站当前外观，可开始编辑。');}}catch(e){show('使用默认外观。'+e.message);}

document.querySelector('#background-file').onchange=async e=>{
 const f=e.target.files[0];if(!f)return;
 try{
 if(!['image/jpeg','image/png','image/webp'].includes(f.type))throw Error('请选择JPG、PNG或WebP图片');
 if(f.size>20000000)throw Error('请选择小于20MB的图片');
 const bitmap=await createImageBitmap(f),scale=Math.min(1,1800/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
 const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 config=validateAppearance({...read(),backgroundImage:canvas.toDataURL('image/jpeg',.85)});send();show('背景照片已更新预览，图片保持原比例。请保存草稿或下载配置后发布。');
 }catch(err){show('图片读取失败：'+err.message);}finally{e.target.value='';}
};
document.querySelector('#remove-background').onclick=()=>{config={...config,backgroundImage:''};send();show('已移除预览背景照片，尚未发布。');};

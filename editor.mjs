import {defaults,validateAppearance} from './appearance.mjs';
const form=document.querySelector('#settings'),frame=document.querySelector('#preview'),status=document.querySelector('#status'),key='qinglan-appearance-draft-v1';let config={...defaults},ready=false;
function show(t){status.textContent=t;}
function send(){if(ready)frame.contentWindow.postMessage({type:'appearance-preview',config},location.origin);}
function populate(c){config=validateAppearance(c);for(const [k,v]of Object.entries(config)){const input=form.elements.namedItem(k);if(input.type==='checkbox')input.checked=v;else input.value=v;}labels();send();}
function labels(){document.querySelector('#font-value').textContent=config.fontSize+'px';document.querySelector('#title-value').textContent=config.titleSize+'px';}
function read(){const c={};for(const [k,v]of Object.entries(defaults)){const input=form.elements.namedItem(k);c[k]=typeof v==='boolean'?input.checked:typeof v==='number'?Number(input.value):input.value;}return validateAppearance(c);}
window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===frame.contentWindow&&e.data?.type==='appearance-ready'){ready=true;send();}});
form.addEventListener('submit',e=>e.preventDefault());form.addEventListener('input',()=>{try{config=read();labels();send();show('正在预览修改，尚未保存或发布。');}catch(e){show(e.message);}});
async function published(){const r=await fetch('./site-config.json',{cache:'no-store'});if(!r.ok)throw Error('暂时无法读取网站配置，请稍后重试。');return validateAppearance(await r.json());}
document.querySelector('#save').onclick=()=>{try{config=read();localStorage.setItem(key,JSON.stringify(config));show('本机草稿已保存。学生页面尚未改变。');}catch(e){show('保存失败：'+e.message);}};
document.querySelector('#export').onclick=()=>{try{config=read();const url=URL.createObjectURL(new Blob([JSON.stringify(config,null,2)+'\n'],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='site-config.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);show('配置已下载。请上传到GitHub替换 site-config.json，才会对所有学生生效。');}catch(e){show(e.message);}};
document.querySelector('#import-config').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>20000)throw Error('配置文件过大');populate(JSON.parse(await f.text()));show('已导入预览，尚未保存或发布。');}catch(e){show('导入失败：'+e.message);}finally{e.target.value='';}};
document.querySelector('#published').onclick=async()=>{if(!confirm('载入网站配置将替换当前预览，是否继续？'))return;try{populate(await published());show('已载入网站配置，本机草稿未改动。');}catch(e){show(e.message);}};
document.querySelector('#reset').onclick=()=>{if(confirm('恢复默认外观？这只影响当前预览。')){populate(defaults);show('已恢复默认预览，可保存草稿或下载配置。');}};
for(const mode of ['desktop','mobile'])document.querySelector('#'+mode).onclick=()=>{frame.classList.toggle('mobile',mode==='mobile');for(const id of ['desktop','mobile'])document.querySelector('#'+id).setAttribute('aria-pressed',String(id===mode));};
populate(defaults);
try{let draft;try{draft=localStorage.getItem(key);}catch{}if(draft){try{populate(JSON.parse(draft));show('已载入本机草稿。学生页面使用网站已发布的配置。');}catch{populate(await published());show('本机草稿无效，已载入网站配置。');}}else{populate(await published());show('已载入网站当前外观，可开始编辑。');}}catch(e){show('使用默认外观。'+e.message);}

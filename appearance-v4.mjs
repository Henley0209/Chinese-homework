import {startHeroSlideshow,stopHeroSlideshow} from './hero-slideshow.mjs?v=slides21';
export const defaults=Object.freeze({brand:'Tiếng Trung Cô Nga',subtitle:'',websiteLabel:'',websiteUrl:'',backgroundImage:'',backgroundOpacity:100,overlayOpacity:55,heading:'让中文，\n成为你的新朋友。',welcome:'从一句“你好”开始，认真练习，自信表达。',vietnamese:'Luyện tập từng chút, tự tin mỗi ngày.',button:'练习习题',footer:'青蓝中文 · 每一次练习，都是进步。',primary:'#2476b5',background:'#f3f8fc',fontSize:16,titleSize:46,layout:'two',illustration:true,compact:false});
export function validateAppearance(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('配置必须是JSON对象');
 const out={...defaults};
 for(const k of ['websiteLabel','websiteUrl'])if(k in value){
 if(typeof value[k]!=='string'||value[k].length>(k==='websiteUrl'?2000:300))throw Error('链接文字或网址格式无效');
 out[k]=value[k].trim();
 }
 if(out.websiteUrl){
 const raw=/^https?:\/\//i.test(out.websiteUrl)?out.websiteUrl:'https://'+out.websiteUrl;
 let url;try{url=new URL(raw);}catch{throw Error('请输入有效的网站地址');}
 if(!['https:','http:'].includes(url.protocol)||!url.hostname||url.username||url.password||/[\s]/.test(out.websiteUrl)||/^[a-z][a-z0-9+.-]*:/i.test(out.websiteUrl)&&!/^https?:\/\//i.test(out.websiteUrl))throw Error('网站链接仅支持http或https地址');
 out.websiteUrl=url.href;
 }

 for(const k of ['backgroundOpacity','overlayOpacity'])if(k in value){if(!Number.isInteger(value[k])||value[k]<0||value[k]>100)throw Error('透明度必须为0—100之间的整数');out[k]=value[k];}

 for(const k of ['subtitle','backgroundImage'])if(k in value){
 if(typeof value[k]!=='string')throw Error('配置格式无效');
 if(k==='subtitle'&&value[k].length>300)throw Error('副标题超过300字');
 if(k==='backgroundImage'&&value[k]!==''&&(!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value[k])||value[k].length>4000000))throw Error('背景图格式无效或过大');
 out[k]=value[k];
 }
 for(const k of ['brand','heading','welcome','vietnamese','button','footer'])if(k in value){if(typeof value[k]!=='string'||value[k].length>300||(['brand','button'].includes(k)&&!value[k].trim()))throw Error('文字格式无效，网站名称和按钮文字不能为空：'+k);out[k]=value[k];}
 for(const k of ['primary','background'])if(k in value){if(typeof value[k]!=='string'||!/^#[0-9a-f]{6}$/i.test(value[k]))throw Error('颜色格式无效');out[k]=value[k];}
 for(const [k,min,max] of [['fontSize',16,22],['titleSize',28,60]])if(k in value){if(!Number.isInteger(value[k])||value[k]<min||value[k]>max)throw Error('字号超出范围');out[k]=value[k];}
 if('layout'in value){if(!['one','two'].includes(value.layout))throw Error('布局无效');out.layout=value.layout;}
 for(const k of ['illustration','compact'])if(k in value){if(typeof value[k]!=='boolean')throw Error('开关格式无效');out[k]=value[k];}
 return out;
}
export function applyAppearance(value,target=document){const c=validateAppearance(value),s=target.documentElement.style;
 for(const [k,v] of Object.entries({'--photo-opacity':String(c.backgroundOpacity/100),'--overlay-opacity':String(c.overlayOpacity/100),'--blue':c.primary,'--page-background':c.background,'--body-size':c.fontSize+'px','--title-size':c.titleSize+'px'}))s.setProperty(k,v);
 for(const [selector,key] of [['#brand-name','brand'],['.hero h1','heading'],['#welcome-zh','welcome'],['#welcome-vi','vietnamese'],['#start>span','button'],['#footer-text','footer']]){const n=target.querySelector(selector);if(n){n.textContent=key==='button'?c[key].replace(/\s*→\s*$/,''):c[key];if(['heading','welcome','vietnamese','footer'].includes(key))n.hidden=!c[key].trim();}}
 const welcome=target.querySelector('#welcome-zh'),vi=target.querySelector('#welcome-vi');
 if(welcome?.parentElement&&vi?.parentElement===welcome.parentElement){
 welcome.parentElement.hidden=!c.welcome.trim()&&!c.vietnamese.trim();
 const br=welcome.parentElement.querySelector('br');if(br)br.hidden=!c.welcome.trim()||!c.vietnamese.trim();
 }
 const subtitle=target.querySelector('#brand-subtitle');if(subtitle){subtitle.textContent=c.subtitle;subtitle.hidden=!c.subtitle.trim();}
 const website=target.querySelector('#brand-website');if(website){
 website.textContent=c.websiteLabel||c.websiteUrl;website.hidden=!c.websiteUrl;
 if(c.websiteUrl)website.href=c.websiteUrl;else website.removeAttribute('href');
 }
 const hero=target.querySelector('.hero');if(hero){stopHeroSlideshow(hero);let image=hero.querySelector('.hero-background');
 if(c.backgroundImage){if(!image){image=target.createElement('img');image.className='hero-background';image.alt='';hero.prepend(image);}if(image.getAttribute('src')!==c.backgroundImage)image.src=c.backgroundImage;}
 else if(image)image.remove();
  if(c.backgroundImage&&typeof window!=='undefined'&&target===document&&window.parent===window)startHeroSlideshow(hero,image);
 }target.body.classList.toggle('has-hero-image',!!c.backgroundImage);
 target.documentElement.classList.remove('appearance-loading');
 target.getElementById?.('site-loading')?.remove();
 if(typeof window!=='undefined'&&target===document)clearTimeout(window.__appearanceBootTimer);
 target.title=c.brand+' · 汉语中心';target.body.classList.toggle('single-fields',c.layout==='one');target.body.classList.toggle('compact-hero',c.compact);target.body.classList.toggle('no-illustration',!c.illustration);return c;
}
if(typeof document!=='undefined'&&document.body.dataset.page!=='editor'){
 // Only the editor's same-origin parent may send temporary preview changes.
 const preview=new URLSearchParams(location.search).has('appearance-preview')&&window.parent!==window;
 if(preview)window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==window.parent||e.data?.type!=='appearance-preview')return;try{applyAppearance(e.data.config);}catch{}});
 try{
 const r=await fetch('./site-config.json',{cache:'no-store'});if(!r.ok)throw Error();const c=validateAppearance(await r.json());
 if(!preview){
 if(c.backgroundImage){const image=new Image();image.src=c.backgroundImage;try{await Promise.race([image.decode(),new Promise(resolve=>setTimeout(resolve,2000))]);}catch{}}
 applyAppearance(c);
 }
 }catch{if(!preview)applyAppearance(defaults);}
 if(preview)window.parent.postMessage({type:'appearance-ready'},location.origin);
}

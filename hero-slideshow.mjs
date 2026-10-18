const instances=new WeakMap();
let configPromise;
export function validateSlideshow(value){
 if(!value||!Array.isArray(value.slides)||value.slides.length>50)throw Error('轮播配置无效');
 for(const src of value.slides)if(typeof src!=='string'||!/^assets\/classroom\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/i.test(src))throw Error('轮播图片路径无效');
 return {slides:[...new Set(value.slides)],initialDelay:3000,interval:2000,fade:700};
}
export function stopHeroSlideshow(hero){instances.get(hero)?.destroy();}
export function startHeroSlideshow(hero,base,{config,doc=hero?.ownerDocument}={}){
 stopHeroSlideshow(hero);if(!hero||!base)return;
 let destroyed=false,timer,cleanup,index=0,front=-1,stage,images=[],running=false,generation=0;
 const welcome=doc.querySelector('#welcome'),win=doc.defaultView;
 const visible=()=>!doc.hidden&&(!welcome||!welcome.hidden);
 function clear(){win.clearTimeout(timer);win.clearTimeout(cleanup);}
 function destroy(){destroyed=true;clear();observer?.disconnect();doc.removeEventListener('visibilitychange',changed);win.removeEventListener('pagehide',suspend);win.removeEventListener('pageshow',changed);if(stage?.parentNode){stage.before(base);stage.remove();}delete hero.dataset.slide;if(instances.get(hero)?.destroy===destroy)instances.delete(hero);}
 function suspend(){clear();running=false;generation++;}
 function changed(){if(!visible()){suspend();return;}if(!running&&!destroyed){running=true;timer=win.setTimeout(next,front<0?3000:2000);}}
 let settings;
 async function next(){
  if(destroyed||!visible()){suspend();return;}
  const token=generation;const src=settings.slides[index];const nextImage=images[front===0?1:0];
  try{nextImage.src=src;await nextImage.decode();}catch{if(token!==generation)return;index=(index+1)%settings.slides.length;if(!destroyed&&visible())timer=win.setTimeout(next,settings.interval);return;}
  if(token!==generation)return;if(destroyed||!visible()){suspend();return;}
  const nextLayer=nextImage.parentElement,portrait=nextImage.naturalWidth<nextImage.naturalHeight;nextLayer.classList.toggle('is-portrait',portrait);nextLayer.style.backgroundImage=portrait?'url("'+src+'")':'none';
  const old=front<0?null:images[front].parentElement;nextLayer.style.zIndex='2';nextLayer.classList.remove('is-current');nextLayer.getBoundingClientRect();nextLayer.classList.add('is-current');if(old)old.style.zIndex='1';
  front=images.indexOf(nextImage);index=(index+1)%settings.slides.length;hero.dataset.slide=src;
  cleanup=win.setTimeout(()=>{if(old)old.classList.remove('is-current');},settings.fade);
  timer=win.setTimeout(next,settings.interval);
 }
 const observer=welcome?new MutationObserver(changed):null;
 instances.set(hero,{destroy});
 const ready=config?Promise.resolve(config):(configPromise??=fetch('./hero-slideshow.json?v=slides21',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}));
 void ready.then(value=>{
  settings=validateSlideshow(value);if(destroyed||!settings.slides.length)return;
  stage=doc.createElement('span');stage.className='hero-slideshow-stage';base.before(stage);stage.append(base);
  for(let i=0;i<2;i++){const layer=doc.createElement('span'),image=doc.createElement('img');layer.className='hero-slide-layer';image.className='hero-slide-photo';image.alt='';image.decoding='async';layer.append(image);stage.append(layer);images.push(image);}
  // Decode ahead of the first switch; preserve the original photo while loading.
  for(const src of settings.slides){const preload=new win.Image();preload.src=src;}
  observer?.observe(welcome,{attributes:true,attributeFilter:['hidden']});doc.addEventListener('visibilitychange',changed);win.addEventListener('pagehide',suspend);win.addEventListener('pageshow',changed);changed();
 }).catch(()=>{});
 return {destroy};
}

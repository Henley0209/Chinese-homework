export function parseLrc(text){
 const lines=[];let offset=0;
 for(const line of String(text).split(/\r?\n/)){const match=line.match(/^\[offset:([+-]?\d+)\]/i);if(match)offset=Number(match[1])/1000;}
 for(const line of String(text).split(/\r?\n/)){
  const stamps=[...line.matchAll(/\[(\d+):([0-5]?\d(?:\.\d+)?)\]/g)];if(!stamps.length)continue;
  const lyric=line.replace(/\[[^\]]*\]/g,'').trim();
  for(const stamp of stamps)lines.push({time:Math.max(0,Number(stamp[1])*60+Number(stamp[2])+offset),text:lyric});
 }
 return lines.sort((a,b)=>a.time-b.time);
}
export function lyricAt(lines,time){let text='';for(const line of lines){if(line.time>time)break;text=line.text;}return text;}
export function youtubeEmbedUrl(id){
 if(!/^[a-zA-Z0-9_-]{11}$/.test(id))throw Error('无效的视频编号');
 const url=new URL('https://www.youtube-nocookie.com/embed/'+id);
 url.search=new URLSearchParams({autoplay:'1',playsinline:'1',controls:'1',cc_load_policy:'1',cc_lang_pref:'zh',rel:'0'}).toString();return url.href;
}
export function initQuizMusic({doc=document,AudioClass=Audio,fetchFn=fetch}={}){
 const exercise=doc.querySelector('#exercise'),sticky=exercise?.querySelector('.sticky');if(!sticky)return {start(){},stop(){}};
 const panel=doc.createElement('div');panel.id='quiz-music';panel.className='quiz-music';panel.hidden=true;
 const text=doc.createElement('div'),title=doc.createElement('strong'),lyric=doc.createElement('p'),button=doc.createElement('button');lyric.className='quiz-music-lyric';button.type='button';button.className='quiet';text.append(title,lyric);panel.append(text,button);sticky.append(panel);
 let audio,lines=[],generation=0,active=false,videoId='',videoFrame;
 const video=doc.createElement('div');video.className='quiz-music-video';video.hidden=true;panel.append(video);
 const videoLink=doc.createElement('a');videoLink.textContent='在 YouTube 中打开 / Mở trên YouTube';videoLink.target='_blank';videoLink.rel='noopener noreferrer';videoLink.hidden=true;videoLink.className='quiz-music-link';panel.append(videoLink);
 function stopped(){button.textContent='播放音乐 / Phát nhạc';button.setAttribute('aria-label',button.textContent);}
 function stop(){generation++;active=false;videoFrame?.remove();videoFrame=null;video.hidden=true;audio?.pause();if(audio)audio.currentTime=0;stopped();if(panel.hidden)return;lyric.textContent='音乐已停止 / Đã dừng nhạc';}
 const ready=(async()=>{
  try{const response=await fetchFn('./quiz-music.json?v=music18');if(!response.ok)return false;const config=await response.json();if(config.provider==='youtube'){youtubeEmbedUrl(config.videoId);videoId=config.videoId;title.textContent=config.title||'一路生花';videoLink.href='https://www.youtube.com/watch?v='+videoId;return true;}if(!config.audioSrc)return false;
   audio=new AudioClass(config.audioSrc);audio.preload='auto';audio.volume=.35;title.textContent=config.title||'一路生花';
   audio.addEventListener('timeupdate',()=>{if(active)lyric.textContent=lyricAt(lines,audio.currentTime)||'♪ '+title.textContent;});
   audio.addEventListener('ended',()=>{active=false;stopped();lyric.textContent='播放结束 / Đã phát xong';});
   audio.addEventListener('error',()=>{active=false;stopped();if(!panel.hidden)lyric.textContent='音乐暂时无法播放 / Tạm thời không phát được nhạc';});
   if(config.lyricsSrc){try{const lrc=await fetchFn(config.lyricsSrc);if(lrc.ok)lines=parseLrc(await lrc.text());}catch{}}
   return true;
  }catch{return false;}
 })();
 async function start(){const token=++generation;if(!await ready||token!==generation||exercise.hidden)return;panel.hidden=false;active=true;lyric.textContent=lyricAt(lines,0)||'♪ '+title.textContent;button.textContent='停止播放 / Dừng nhạc';button.setAttribute('aria-label',button.textContent);
  if(videoId){
   videoFrame?.remove();videoFrame=doc.createElement('iframe');videoFrame.title=title.textContent+' · 音乐视频';videoFrame.allow='autoplay; encrypted-media; fullscreen; picture-in-picture';videoFrame.allowFullscreen=true;videoFrame.referrerPolicy='strict-origin-when-cross-origin';videoFrame.src=youtubeEmbedUrl(videoId);video.append(videoFrame);video.hidden=false;videoLink.hidden=false;
   lyric.textContent='若未自动播放，请点击视频播放键 / Nếu chưa phát, hãy chạm nút phát trong video';return;
  }
  try{await audio.play();if(token!==generation)return;}catch{if(token!==generation)return;active=false;stopped();lyric.textContent=audio.error?'音乐暂时无法播放 / Tạm thời không phát được nhạc':'点击右侧按钮播放音乐 / Chạm nút bên phải để phát nhạc';}
 }
 button.addEventListener('click',()=>{if(active)stop();else void start();});
 doc.addEventListener('practice:enter',()=>{stop();panel.hidden=true;});doc.defaultView?.addEventListener('pagehide',stop);
 return {start,stop};
}

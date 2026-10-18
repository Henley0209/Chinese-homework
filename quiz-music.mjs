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
export function initQuizMusic({doc=document,AudioClass=Audio,fetchFn=fetch}={}){
 const exercise=doc.querySelector('#exercise'),sticky=exercise?.querySelector('.sticky');if(!sticky)return {start(){},pause(){},stop(){}};
 const panel=doc.createElement('div');panel.id='quiz-music';panel.className='quiz-music';panel.hidden=true;
 const text=doc.createElement('div'),title=doc.createElement('strong'),lyric=doc.createElement('p'),controls=doc.createElement('div');text.className='quiz-music-text';lyric.className='quiz-music-lyric';controls.className='quiz-music-controls';
 const play=doc.createElement('button'),pauseButton=doc.createElement('button');for(const b of [play,pauseButton]){b.type='button';b.className='quiet';}
 play.id='quiz-music-play';play.textContent='▶ 播放 / Phát';pauseButton.id='quiz-music-pause';pauseButton.textContent='Ⅱ 暂停 / Tạm dừng';play.setAttribute('aria-label','播放音乐 / Phát nhạc');pauseButton.setAttribute('aria-label','暂停音乐 / Tạm dừng nhạc');text.append(title,lyric);controls.append(play,pauseButton);panel.append(text,controls);sticky.append(panel);
 let audio,lines=[],generation=0,active=false,pending=false;
 function buttons(){play.disabled=active||pending;pauseButton.disabled=!active&&!pending;}
 function pause(){generation++;pending=false;active=false;audio?.pause();buttons();if(!panel.hidden)lyric.textContent='已暂停 · 循环播放 / Đã tạm dừng · Phát lặp';}
 function stop(){pause();if(audio)audio.currentTime=0;}
 const ready=(async()=>{
  try{const response=await fetchFn('./quiz-music.json?v=music19');if(!response.ok)return false;const config=await response.json();if(!config.audioSrc)return false;
   audio=new AudioClass(config.audioSrc);audio.preload='metadata';audio.loop=true;audio.volume=.35;title.textContent=config.title||'一路生花';
   audio.addEventListener('timeupdate',()=>{if(active)lyric.textContent=lyricAt(lines,audio.currentTime)||'循环播放 / Phát lặp';});
   audio.addEventListener('playing',()=>{if(exercise.hidden){audio.pause();return;}active=true;pending=false;buttons();lyric.textContent=lyricAt(lines,audio.currentTime)||'循环播放 / Phát lặp';});
   audio.addEventListener('pause',()=>{active=false;pending=false;buttons();});
   audio.addEventListener('error',()=>{active=false;pending=false;buttons();if(!panel.hidden)lyric.textContent='音乐暂时无法播放 / Tạm thời không phát được nhạc';});
   if(config.lyricsSrc){try{const lrc=await fetchFn(config.lyricsSrc);if(lrc.ok)lines=parseLrc(await lrc.text());}catch{}}
   return true;
  }catch{return false;}
 })();
 async function start(){const token=++generation;if(!await ready||token!==generation||exercise.hidden)return;panel.hidden=false;pending=true;buttons();
  try{await audio.play();if(token!==generation)return;active=true;pending=false;buttons();lyric.textContent=lyricAt(lines,audio.currentTime)||'循环播放 / Phát lặp';}
  catch{if(token!==generation)return;active=false;pending=false;buttons();lyric.textContent=audio.error?'音乐暂时无法播放 / Tạm thời không phát được nhạc':'请点击播放 / Chạm Phát để nghe nhạc';}
 }
 play.addEventListener('click',()=>{void start();});pauseButton.addEventListener('click',pause);buttons();
 doc.addEventListener('practice:enter',()=>{stop();panel.hidden=true;});doc.defaultView?.addEventListener('pagehide',stop);
 return {start,pause,stop};
}

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
 const exercise=doc.querySelector('#exercise'),welcome=doc.querySelector('#welcome'),sticky=exercise?.querySelector('.sticky');if(!sticky)return {start(){},pause(){},stop(){}};
 const panel=doc.createElement('div');panel.id='quiz-music';panel.className='quiz-music';panel.hidden=true;
 const text=doc.createElement('div'),title=doc.createElement('strong'),lyric=doc.createElement('p'),controls=doc.createElement('div');text.className='quiz-music-text';lyric.className='quiz-music-lyric';controls.className='quiz-music-controls';
 const play=doc.createElement('button'),pauseButton=doc.createElement('button');for(const b of [play,pauseButton]){b.type='button';b.className='quiet';}
 play.id='quiz-music-play';play.textContent='▶ 播放 / Phát';pauseButton.id='quiz-music-pause';pauseButton.textContent='Ⅱ 暂停 / Tạm dừng';play.setAttribute('aria-label','播放音乐 / Phát nhạc');pauseButton.setAttribute('aria-label','暂停音乐 / Tạm dừng nhạc');text.append(title,lyric);controls.append(play,pauseButton);panel.append(text,controls);sticky.append(panel);
 const home=doc.createElement('div');home.id='home-music';home.className='home-music';home.hidden=true;welcome?.before(home);
 let playlist=[],trackIndex=0,lyricsGeneration=0;
 let audio,lines=[],generation=0,active=false,pending=false,manualPaused=false,needsGesture=false,view='';
 function mount(){const next=!exercise.hidden?'quiz':welcome&&!welcome.hidden?'home':'';home.hidden=next!=='home';if(next){const target=next==='quiz'?sticky:home;if(panel.parentNode!==target)target.append(panel);if(panel.hidden)panel.hidden=false;}else if(!panel.hidden)panel.hidden=true;return next;}
 function syncView(){const previous=view;view=mount();if(!view){pauseInternal();return;}if(view!==previous&&!manualPaused)void start();}
 function buttons(){play.disabled=active||pending;pauseButton.disabled=!active&&!pending;}
 function pauseInternal(){generation++;pending=false;active=false;audio?.pause();buttons();if(!panel.hidden)lyric.textContent='已暂停 · 循环播放 / Đã tạm dừng · Phát lặp';}
 function pause(){manualPaused=true;needsGesture=false;pauseInternal();}
 function stop(){needsGesture=false;pauseInternal();if(audio){selectTrack(0);audio.currentTime=0;}}
 function selectTrack(index){
  trackIndex=index;const track=playlist[index],token=++lyricsGeneration;lines=[];title.textContent=track.title||'背景音乐';audio.src=track.audioSrc;
  if(track.lyricsSrc)void (async()=>{try{const response=await fetchFn(track.lyricsSrc);if(response.ok){const parsed=parseLrc(await response.text());if(token===lyricsGeneration)lines=parsed;}}catch{}})();
 }
 const ready=(async()=>{
  try{const response=await fetchFn('./quiz-music.json?v=music21');if(!response.ok)return false;const config=await response.json();playlist=(Array.isArray(config.tracks)&&config.tracks.length?config.tracks:[config]).filter(track=>track&&typeof track.audioSrc==='string'&&track.audioSrc);if(!playlist.length)return false;
   audio=new AudioClass();audio.preload='metadata';audio.loop=false;audio.volume=.35;selectTrack(0);
   audio.addEventListener('ended',()=>{active=false;pending=false;buttons();const next=trackIndex+1;if(next<playlist.length){selectTrack(next);if(!manualPaused)void start();}else if(config.loop!==false){selectTrack(0);if(!manualPaused)void start();}});
   audio.addEventListener('timeupdate',()=>{if(active)lyric.textContent=lyricAt(lines,audio.currentTime)||'循环播放 / Phát lặp';});
   audio.addEventListener('playing',()=>{if(!mount()){audio.pause();return;}active=true;pending=false;buttons();lyric.textContent=lyricAt(lines,audio.currentTime)||'循环播放 / Phát lặp';});
   audio.addEventListener('pause',()=>{active=false;pending=false;buttons();});
   audio.addEventListener('error',()=>{active=false;pending=false;buttons();if(!panel.hidden)lyric.textContent='音乐暂时无法播放 / Tạm thời không phát được nhạc';});
   return true;
  }catch{return false;}
 })();
 async function start(force=false){if(force)manualPaused=false;if(manualPaused||pending)return;const token=++generation;if(!await ready||token!==generation||!mount())return;if(active&&!audio.paused)return;pending=true;needsGesture=false;buttons();
  try{await audio.play();if(token!==generation)return;active=true;pending=false;buttons();lyric.textContent=lyricAt(lines,audio.currentTime)||'循环播放 / Phát lặp';}
  catch{if(token!==generation)return;active=false;pending=false;needsGesture=!audio.error;buttons();lyric.textContent=audio.error?'音乐暂时无法播放 / Tạm thời không phát được nhạc':'请点击播放 / Chạm Phát để nghe nhạc';}
 }
 play.addEventListener('click',()=>{void start(true);});pauseButton.addEventListener('click',pause);buttons();
 const observer=new MutationObserver(syncView);for(const section of [welcome,exercise])if(section)observer.observe(section,{attributes:true,attributeFilter:['hidden']});
 doc.addEventListener('pointerdown',event=>{if(needsGesture&&!manualPaused&&mount()==='home'&&!event.target.closest('.quiz-music-controls'))void start();},{passive:true});
 doc.defaultView?.addEventListener('pagehide',stop);void ready.then(ok=>{if(ok)syncView();});
 return {start,pause,stop};
}

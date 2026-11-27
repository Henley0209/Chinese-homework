const prefix='telegram-attendance:';
const retryLimit=5;

function telegramConfig(env){
 const token=env?.TELEGRAM_BOT_TOKEN?.trim();
 const chat=env?.TELEGRAM_CHAT_ID?.trim();
 return /^\d+:[a-zA-Z0-9_-]+$/.test(token??'')&&/^-?\d+$/.test(chat??'')?{token,chat}:null;
}

const notificationKey=(when,id)=>prefix+String(when).padStart(13,'0')+':'+id;

async function nextNotification(storage){
 return (await storage.list({prefix,limit:1})).entries().next().value;
}

export async function queueAttendanceNotice(storage,env,id,{teacher,course,date,minutes,count,topic,content}){
 if(!telegramConfig(env))return;
 const when=Date.now()+1000;
 const message=[
  '点名已提交｜'+course,
  '教师：'+teacher,
  '日期：'+date.replaceAll('-','/'),
  '时长：'+(minutes/60)+' 小时｜出勤：'+count+' 人',
  '上课主题: '+topic,
  '本节课学习内容: '+content
 ].join('\n');
 await storage.put(notificationKey(when,id),{id,when,message,attempts:0});
 const alarm=await storage.getAlarm();
 if(alarm===null||alarm>when)await storage.setAlarm(when);
}

async function deliver(config,message){
 try{
  const response=await fetch('https://api.telegram.org/bot'+config.token+'/sendMessage',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({chat_id:config.chat,text:message,link_preview_options:{is_disabled:true}}),
   signal:AbortSignal.timeout(10000)
  });
  const body=await response.json().catch(()=>null);
  if(response.ok&&body?.ok===true)return null;
  const code=body?.error_code??response.status;
  if(code===429)return Math.max(1000,Math.min(86400,Number(body?.parameters?.retry_after)||30)*1000);
  return code>=500?0:-1;
 }catch{return 0;}
}

export async function processAttendanceNotice(storage,env){
 const [key,notice]=await nextNotification(storage)??[];
 if(!notice)return;
 const now=Date.now();
 if(notice.when>now){
  await storage.setAlarm(notice.when);
  return;
 }
 const config=telegramConfig(env);
 const retryAfter=config?await deliver(config,notice.message):-1;
 await storage.transaction(async transaction=>{
  const attempts=notice.attempts+1;
  if(retryAfter!==null&&retryAfter>=0&&attempts<retryLimit){
   const when=Date.now()+Math.max(retryAfter,15000*2**(attempts-1));
   await transaction.put(notificationKey(when,notice.id),{...notice,when,attempts});
  }else if(retryAfter!==null){
   // Never log the bot credential, chat ID, or message contents.
   console.warn('Attendance Telegram notification failed after '+attempts+' attempt(s).');
  }
  await transaction.delete(key);
  const next=await nextNotification(transaction);
  if(next)await transaction.setAlarm(Math.max(Date.now()+1000,next[1].when));
 });
}

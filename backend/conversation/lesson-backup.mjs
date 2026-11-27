// This object is reachable only through the Worker and its internal bindings.
const chunkLength=256*1024;
const key=index=>'chunk:'+index;

export function latestLessonBackup(env){
 return env.LESSON_BACKUP.get(env.LESSON_BACKUP.idFromName('training-center-latest'));
}

export async function backupLessons(env,scheduledTime){
 const source=env.LESSON_REGISTER.get(env.LESSON_REGISTER.idFromName('training-center'));
 const response=await source.fetch('https://lesson-register/internal/backup',{method:'POST',body:String(scheduledTime)});
 if(!response.ok)throw Error('The lesson data backup did not complete.');
}

export class LessonBackup {
 constructor(state){this.storage=state.storage;}

 async fetch(request){
  if(request.method==='PUT'){
   const json=await request.text();
   const {scheduledTime}=JSON.parse(json);
   if(!Number.isFinite(scheduledTime))return new Response(null,{status:400});
   await this.storage.transaction(async storage=>{
    const previous=await storage.get('latest');
    if(previous&&previous.scheduledTime>=scheduledTime)return;
    const count=Math.ceil(json.length/chunkLength);
    for(let i=0;i<count;i++)await storage.put(key(i),json.slice(i*chunkLength,(i+1)*chunkLength));
    for(let i=count;i<(previous?.count??0);i++)await storage.delete(key(i));
    await storage.put('latest',{count,scheduledTime});
   });
   return new Response(null,{status:204});
  }
  if(request.method==='GET'){
   const backup=await this.storage.transaction(async storage=>{
    const latest=await storage.get('latest');
    if(!latest)return null;
    const chunks=[];
    for(let i=0;i<latest.count;i++)chunks.push(await storage.get(key(i)));
    return JSON.parse(chunks.join(''));
   });
   if(!backup)return Response.json({error:'尚无已完成的业务备份。'},{status:404});
   const {accounts,...data}=backup;
   return Response.json({...data,accounts:accounts.map(({username,name,classIds,disabled,rate60,rate90})=>
    ({username,name,classIds,disabled,rate60,rate90}))});
  }
  return new Response(null,{status:405});
 }
}

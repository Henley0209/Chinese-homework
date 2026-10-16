import assert from 'node:assert/strict';
const base='https://countapi.mileshilliard.com/api/v1';
const key='henley0209_chinese_homework_verify_'+(process.env.GITHUB_RUN_ID||Date.now());
async function call(action){
 const r=await fetch(base+'/'+action+'/'+key+'?t='+Date.now(),{method:action==='hit'?'POST':'GET',headers:{Origin:'https://henley0209.github.io'},signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error('Live counter HTTP '+r.status);
 const cors=r.headers.get('access-control-allow-origin');assert.ok(cors==='*'||cors==='https://henley0209.github.io','Counter must allow browser CORS');
 const data=await r.json();assert.ok(Number.isSafeInteger(Number(data.value)));return Number(data.value);
}
const first=await call('hit');assert.equal(await call('get'),first);assert.equal(await call('hit'),first+1);
console.log('Live counter verified: shared server increments and browser CORS passed. Test counter only; production login count unchanged.');

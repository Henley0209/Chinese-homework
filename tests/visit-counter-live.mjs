import assert from 'node:assert/strict';
const base='https://countapi.mileshilliard.com/api/v1';
const key='henley0209_chinese_homework_verify_'+(process.env.GITHUB_RUN_ID||Date.now());
async function call(action,suffix='',value){
 const url=new URL(base+'/'+action+'/'+key+suffix);url.searchParams.set('t',Date.now());if(value!==undefined)url.searchParams.set('value',value);
 const r=await fetch(url,{method:action==='hit'?'POST':'GET',headers:{Origin:'https://henley0209.github.io'},signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error('Live counter HTTP '+r.status);
 const cors=r.headers.get('access-control-allow-origin');assert.ok(cors==='*'||cors==='https://henley0209.github.io','Counter must allow browser CORS');
 const raw=await r.text(),match=raw.match(/"value"\s*:\s*(?:"(\d+)"|(\d+))/);assert.ok(match);return match[1]||match[2];
}
const first=BigInt(await call('hit'));assert.equal(BigInt(await call('get')),first);assert.equal(BigInt(await call('hit')),first+1n);
// Public display-name index uses decimal integers; verify Unicode data survives
// the service's numeric JSON format without rounding or touching production keys.
const name='访问统计测试 Nguyễn',hex=[...new TextEncoder().encode(name)].map(b=>b.toString(16).padStart(2,'0')).join('');
const packed=BigInt('0x01'+hex).toString();assert.equal(await call('set','_name',packed),packed);assert.equal(await call('get','_name'),packed);
console.log('Live counter verified: shared increments, exact Unicode index, set/get and browser CORS. Independent test keys only.');

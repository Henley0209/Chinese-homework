import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const published=JSON.parse(readFileSync(new URL('../release.json',import.meta.url))).release;
for(const file of ['index.html','homepage-v4.html']){
 const html=readFileSync(new URL('../'+file,import.meta.url),'utf8');
 const script=html.match(/\(\(\)=>\{const release=[\s\S]*?\}\)\(\);/)[0];
 const embedded=script.match(/const release="([^"]+)"/)[1];
 assert.equal(embedded,published,`${file}: release manifest must match page`);
 const storage=new Map();let redirects=[];
 async function load(remote,query=embedded){
  const location={href:'https://example.test/?release='+query,search:'?release='+query,replace:url=>redirects.push(url)};
  runInNewContext(script,{URL,URLSearchParams,location,history:{replaceState:(_,__,url)=>location.href=url},document:{addEventListener(){}},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},fetch:async()=>({ok:true,json:async()=>({release:remote})})});
  await new Promise(r=>setImmediate(r));
 }
 await load(published);assert.equal(redirects.length,0);
 await load('stale-release');assert.equal(redirects.length,1);
 await load('stale-release','stale-release');assert.equal(redirects.length,1,'stale manifest must not cause a reload loop');
 await load('future-release');assert.equal(redirects.length,2,'a new release may refresh once');
 console.log(file+': matching releases and reload-loop protection passed');
}

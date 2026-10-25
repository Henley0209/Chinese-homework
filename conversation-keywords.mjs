import {toSimplified} from './vendor/chinese-simplified.mjs';
const generic=new Set(['我','你','他','她','它','是','的','了','吗','呢','在','有','不','很','也','都','和']);
const normalize=text=>toSimplified(text).normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
export function cleanKeywords(values){if(!Array.isArray(values)||values.length>12)throw Error('关键词格式无效');return [...new Set(values.map(value=>{if(typeof value!=='string'||!value.trim()||value.length>20)throw Error('关键词格式无效');return toSimplified(value.trim());}).filter(value=>!generic.has(normalize(value))))];}
export function inferredKeywords(question){
 const text=toSimplified(question);
 if(/忙不忙|忙吗/.test(text))return ['忙','不忙','有空','没空'];
 if(/好吗|还好|怎么样/.test(text))return ['好','不错','一般','累','不舒服','开心'];
 if(/叫什么|名字/.test(text))return ['叫','名字'];
 if(/哪里人|哪国人|哪个国家/.test(text))return ['中国','越南','泰国','日本','韩国','美国','人'];
 if(/几岁|多大/.test(text))return ['岁','今年'];
 return [];
}
export function matchedKeyword(answer,keywords){const text=normalize(answer);return cleanKeywords(keywords).find(value=>text.includes(normalize(value)))||'';}

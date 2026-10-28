import json,re,random,unicodedata,collections
from pathlib import Path
from pypinyin import lazy_pinyin,Style,load_phrases_dict
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'hsk4-40'; OUT.mkdir(exist_ok=True)
# Explicit contextual readings for common polyphones and light tones.
load_phrases_dict({'了解':[['liǎo'],['jiě']], '了解了':[['liǎo'],['jiě'],['le']], '得好':[['de'],['hǎo']], '觉得':[['jué'],['de']], '相处':[['xiāng'],['chǔ']], '处理':[['chǔ'],['lǐ']], '尽管':[['jǐn'],['guǎn']], '便宜':[['pián'],['yi']], '熟悉':[['shú'],['xī']], '结实':[['jiē'],['shi']], '关系':[['guān'],['xi']], '消息':[['xiāo'],['xi']], '时候':[['shí'],['hou']], '事情':[['shì'],['qing']], '地方':[['dì'],['fang']], '主意':[['zhǔ'],['yi']], '衣服':[['yī'],['fu']], '朋友':[['péng'],['you']], '什么':[['shén'],['me']], '东西':[['dōng'],['xi']], '一会儿':[['yí'],['huì'],['r']], '一样':[['yí'],['yàng']], '一份':[['yí'],['fèn']], '一定':[['yí'],['dìng']], '不要':[['bú'],['yào']], '不会':[['bú'],['huì']], '不是':[['bú'],['shì']], '不但':[['bú'],['dàn']], '不再':[['bú'],['zài']]})
def py(s):
 return ' '.join(lazy_pinyin(s,style=Style.TONE,errors=lambda x:[x],neutral_tone_with_five=False)).replace('v','ü')
def han(s):return len(re.findall('[\u4e00-\u9fff]',s))
lessons=[]
for block in (ROOT/'hsk4-40/source.txt').read_text().split('@')[1:]:
 lines=block.strip().splitlines();d={'title':lines[0],'p':lines[1][2:].split(),'f':[],'s':[]};mode=''
 for l in lines[2:]:
  if l in ['F','S']:mode=l;continue
  if l.startswith('T '):d['t']=l[2:].split(';');continue
  if mode=='F':d['f'].append(l.split('|'))
  if mode=='S':d['s'].append(l.split('/'))
 lessons.append(d)
assert len(lessons)==40
issues=[]
for i,d in enumerate(lessons,1):
 assert len(d['p'])==15,(i,'P',len(d['p']))
 assert len(d['f'])==15,(i,'F',len(d['f']))
 assert len(d['s'])+len(d['t'])==20,(i,'S',len(d['s']),len(d['t']))
 assert not set(d['p'])&set(w for w,v,s in d['f']),(i,'overlap',set(d['p'])&set(w for w,v,s in d['f']))
 for n,chunks in enumerate(d['s']):
  if not 15<=han(''.join(chunks))<=20:issues.append((i,n+1,han(''.join(chunks)), '/'.join(chunks)))


# HSK4 uses longer clauses than the HSK3 set; all ordering answers are 15–28 characters.
assert all(15<=han(''.join(s))<=28 for d in lessons for s in d['s'])
from pypinyin.constants import PINYIN_DICT
syllables=sorted({v for raw in PINYIN_DICT.values() for v in raw.split(',') if re.fullmatch('[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńňǹḿê]+',v)})
def bare(s):return ''.join(c for c in unicodedata.normalize('NFD',s) if not unicodedata.combining(c))
def tone(s):
 marks={'\u0304':1,'\u0301':2,'\u030c':3,'\u0300':4}
 return next((marks[c] for c in unicodedata.normalize('NFD',s) if c in marks),5)
def distance(a,b):
 prev=list(range(len(b)+1))
 for i,x in enumerate(a,1):
  curr=[i]
  for j,y in enumerate(b,1):curr.append(min(curr[-1]+1,prev[j]+1,prev[j-1]+(x!=y)))
  prev=curr
 return prev[-1]
confusions=[('zh','z'),('ch','c'),('sh','s'),('l','n'),('f','h'),('j','q'),('q','x'),('ang','an'),('eng','en'),('ing','in'),('iu','ui'),('ao','ou'),('ai','ei')]
valid_by_base=collections.defaultdict(list)
for s in syllables:valid_by_base[bare(s)].append(s)
def wrong_pinyin(correct):
 pieces=correct.split();out=[]
 for a,b in confusions:
  for x,y in [(a,b),(b,a)]:
   for i,s in enumerate(pieces):
    raw=bare(s)
    if x not in raw:continue
    new=raw.replace(x,y,1)
    choices=[v for v in valid_by_base.get(new,[]) if tone(v)==tone(s)]
    if choices:
     alt=' '.join(pieces[:i]+[choices[0]]+pieces[i+1:])
     if alt!=correct and alt not in out:out.append(alt)
 for i,s in enumerate(pieces):
  candidates=sorted((v for v in syllables if bare(v)!=bare(s) and tone(v)==tone(s)),key=lambda v:(distance(bare(s),bare(v)),v))
  for v in candidates[:8]:
   alt=' '.join(pieces[:i]+[v]+pieces[i+1:])
   if alt!=correct and alt not in out:out.append(alt)
 assert len(out)>=3,(correct,out)
 return out[:3]
# Distinct templates rotate object, subject and adverb positions while keeping lexical chunks intact.
templates=[
 ['老师请我们','认真','讨论','{}'],
 ['我们','应该','提前了解','{}'],
 ['大家','可以','一起','讨论','{}'],
 ['我','已经','认真','考虑过','{}'],
 ['这篇文章','主要','介绍了','{}'],
 ['请','结合例子','具体','说明','{}'],
 ['我们','还没有','讨论清楚','{}'],
 ['大家','都','需要','认真了解','{}'],
 ['这次活动','让我们','重新','思考','{}'],
 ['老师','希望大家','认真','分析','{}'],
 ['我们','有必要','深入','了解','{}'],
 ['他','在报告中','详细','介绍了','{}'],
 ['请大家','先','讨论一下','{}'],
 ['我','想请老师','进一步','解释','{}'],
 ['同学们','正在','一起','讨论','{}']]
all_sentences=set();manifest=[];entries=[]
for lesson,d in enumerate(lessons,1):
 questions=[];rnd=random.Random(4000+lesson)
 for i,word in enumerate(d['p']):
  pronunciation=py(word);opts=[pronunciation]+wrong_pinyin(pronunciation);rnd.shuffle(opts)
  questions.append({'id':i+1,'type':'choice','section':'拼音选择','text':f'【拼音选择】请选择“{word}”的正确读音。','pinyin':'Qǐng xuǎn zé “____” de zhèng què dú yīn.','vietnamese':'Chọn phiên âm đúng; chú ý âm đầu, vần và thanh điệu.','options':dict(zip('ABCD',opts)),'answers':['ABCD'[opts.index(pronunciation)]],'points':2,'explanation':f'“{word}”的正确读音是 {pronunciation}。'})
 fill_words=[r[0] for r in d['f']]
 for i,(word,meaning,sentence) in enumerate(d['f']):
  assert sentence.count('____')==1,(lesson,sentence)
  assert len(set(fill_words))==15,(lesson,'duplicate words')
  others=[x for x in fill_words if x!=word];rnd.shuffle(others);opts=[word]+others[:3];rnd.shuffle(opts)
  questions.append({'id':16+i,'type':'choice','section':'四选一词语填空','text':'【选词填空】根据越南语词义提示选择最合适的词语：'+sentence,'pinyin':py(sentence),'vietnamese':'Gợi ý nghĩa của từ cần điền: '+meaning+'.','options':dict(zip('ABCD',opts)),'optionPinyin':{k:py(v) for k,v in zip('ABCD',opts)},'answers':['ABCD'[opts.index(word)]],'points':2,'explanation':f'应填“{word}”（{meaning}）。完整句子：'+sentence.replace('____',word)})
 sorting=list(d['s'])
 for i,topic in enumerate(d['t']):
  starts=('认真听取','通过','尊重','保持','帮助','向','回答','组织','参加','保护','了解','判断','合理利用','合理使用','安排','减少','节约','重复使用','给','选择','设计','介绍','避免','培养','确认','寻找','解释','准备','听懂','感谢','总结')
  if topic.startswith(starts) and '的' not in topic and not topic.startswith('如何'):
   topic='如何'+topic
  chosen=templates[(i+lesson)%len(templates)]
  chunks=[x.replace('{}',topic) for x in chosen]
  # Prefer 15–20 characters for the new contextual clauses, retaining longer authored HSK4 examples.
  if not 15<=han(''.join(chunks))<=22:
   chosen=['请大家','认真','讨论','{}'];chunks=[x.replace('{}',topic) for x in chosen]
  assert 15<=han(''.join(chunks))<=28,(lesson,topic,chunks)
  sorting.append(chunks)
 for i,chunks in enumerate(sorting):
  sentence=''.join(chunks);count=han(sentence)
  if sentence in all_sentences:
   for template in templates:
    candidate=[x.replace('{}',d['t'][i-len(d['s'])]) for x in template]
    if ''.join(candidate) not in all_sentences and 15<=han(''.join(candidate))<=28:
     chunks=candidate;sentence=''.join(chunks);count=han(sentence);break
  assert sentence not in all_sentences,(lesson,sentence)
  all_sentences.add(sentence)
  shuffled=list(chunks)
  while ''.join(shuffled)==sentence:rnd.shuffle(shuffled)
  # Some natural time/subject permutations are accepted explicitly, without changing words.
  variants=[sentence+'。',sentence,sentence+'.']
  time_words=['每天晚上','运动以后','结婚以后','周末','工作结束以后','面试结束以前','离开的时候','今天下课以后','付款以前']
  for idx in [0,1]:
   if len(chunks)>2 and chunks[idx] in time_words:
    swapped=list(chunks);swapped[0],swapped[1]=swapped[1],swapped[0];alt=''.join(swapped)
    variants.extend([alt+'。',alt,alt+'.'])
  questions.append({'id':31+i,'type':'fill','section':'句子排序','text':f'【句子排序】请将词语排列为完整句子（{count}个汉字，不含标点；不用斜线，不在汉字间加空格）：\n'+' / '.join(shuffled),'pinyin':' / '.join(py(x) for x in shuffled),'vietnamese':'Sắp xếp thành câu hoàn chỉnh. Không thêm hoặc bớt từ; không nhập dấu gạch chéo và không chèn khoảng trắng giữa các chữ Hán.','answers':list(dict.fromkeys(variants)),'points':2,'explanation':'参考句子：'+sentence+'。\n'+py(sentence+'。'),'hanziCount':count})
 assert len(questions)==50
 exercise={'title':f'HSK4 第{lesson:02d}课 {d["title"]}','description':('《HSK标准教程4》'+('上册' if lesson<=10 else '下册')+'同主题原创练习' if lesson<=20 else '中越生活与工作情境原创拓展练习')+' · 15道拼音选择 + 15道四选一词语填空 + 20道句子排序 · 每题2分，满分100分 · 非教材原题或官方试卷','annotationVersion':1,'questions':questions}
 filename=f'lesson-{lesson:02d}.json'
 (OUT/filename).write_text(json.dumps(exercise,ensure_ascii=False,indent=2)+'\n')
 entries.append({'id':f'hsk4-topic-{lesson:02d}','bank':'hsk4','exercise':exercise})
 manifest.append({'lesson':lesson,'title':d['title'],'file':filename,'source':'教材同主题原创' if lesson<=20 else '自主设计拓展','questionCount':50,'totalPoints':100,'pinyinTargetWords':d['p'],'fillTargetWords':fill_words,'sortingSentences':[''.join(c) for c in sorting]})
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
catalog=json.loads((ROOT/'exercise-catalog.json').read_text());before=[e for e in catalog['exercises'] if not re.fullmatch(r'hsk4-topic-\d{2}',e['id'])]
insert=next(i for i,e in enumerate(before) if e['bank']=='hsk4')+1
catalog['exercises']=before[:insert]+entries+before[insert:]
(ROOT/'exercise-catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
print(f'Generated {len(entries)} lessons, {sum(len(e["exercise"]["questions"]) for e in entries)} questions; {len(catalog["exercises"])} total entries')

# Reapply authored section separation and refresh every downloadable copy.
import subprocess,sys
subprocess.run([sys.executable,str(ROOT/"tools/optimize-exercises.py")],check=True)

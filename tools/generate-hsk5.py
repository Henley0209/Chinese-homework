import json,re,random,unicodedata,collections
from pathlib import Path
from pypinyin import lazy_pinyin,Style,load_phrases_dict
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'hsk5-30'; OUT.mkdir(exist_ok=True)
# Explicit contextual readings for common polyphones and light tones.
load_phrases_dict({'了解':[['liǎo'],['jiě']], '了解了':[['liǎo'],['jiě'],['le']], '得好':[['de'],['hǎo']], '觉得':[['jué'],['de']], '相处':[['xiāng'],['chǔ']], '处理':[['chǔ'],['lǐ']], '尽管':[['jǐn'],['guǎn']], '便宜':[['pián'],['yi']], '熟悉':[['shú'],['xī']], '结实':[['jiē'],['shi']], '关系':[['guān'],['xi']], '消息':[['xiāo'],['xi']], '时候':[['shí'],['hou']], '事情':[['shì'],['qing']], '地方':[['dì'],['fang']], '主意':[['zhǔ'],['yi']], '衣服':[['yī'],['fu']], '朋友':[['péng'],['you']], '什么':[['shén'],['me']], '东西':[['dōng'],['xi']], '一会儿':[['yí'],['huì'],['r']], '一样':[['yí'],['yàng']], '一份':[['yí'],['fèn']], '一定':[['yí'],['dìng']], '不要':[['bú'],['yào']], '不会':[['bú'],['huì']], '不是':[['bú'],['shì']], '不但':[['bú'],['dàn']], '不再':[['bú'],['zài']]})
def py(s):
 return ' '.join(lazy_pinyin(s,style=Style.TONE,errors=lambda x:[x],neutral_tone_with_five=False)).replace('v','ü')
def han(s):return len(re.findall('[\u4e00-\u9fff]',s))
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
import zipfile,html
blocks=(OUT/'source.txt').read_text().split('@')[1:]
assert len(blocks)==30
entries=[];manifest=[];seen=set()
patterns=[
 (['我们','不仅要了解','{}','还要','思考其实际意义'],'不仅……还……：递进关系。Không những… mà còn…'),
 (['无论','社会如何变化','{}','都','值得我们认真关注'],'无论……都……：条件变化，结论不变。Dù… thì vẫn…'),
 (['只有','深入理解','{}','才能','作出更合理的判断'],'只有……才……：必要条件。Chỉ khi… mới…'),
 (['与其','急于得出结论','不如','先','认真分析','{}'],'与其……不如……：比较两种做法并提出建议。Thà… còn hơn…'),
 (['老师','要求我们','结合实际经历','具体说明','{}'],'要求＋人＋动词短语；结合……说明……。Yêu cầu ai làm gì; kết hợp trải nghiệm để giải thích。')]
for lesson,block in enumerate(blocks,1):
 lines=block.strip().splitlines();title=lines[0];rows=[l.split('|') for l in lines[1:6]];topics=lines[6][2:].split(';')
 assert len(rows)==len(topics)==5
 rnd=random.Random(5000+lesson);questions=[];words=[r[0] for r in rows];sorts=[]
 for word,meaning,chunked in rows:
  pron=py(word);options=[pron]+wrong_pinyin(pron);rnd.shuffle(options)
  questions.append(dict(id=len(questions)+1,type='choice',section='拼音选择',text=f'【拼音选择】请选择“{word}”的正确读音。',pinyin='Qǐng xuǎn zé “____” de zhèng què dú yīn.',vietnamese='Chọn phiên âm đúng; chú ý âm đầu, vần và thanh điệu.',options=dict(zip('ABCD',options)),answers=['ABCD'[options.index(pron)]],points=5,explanation=f'“{word}”读作 {pron}，意思是 {meaning}。'))
 for word,meaning,chunked in rows:
  sentence=chunked.replace('/','');assert sentence.count(word)==1,(lesson,word,sentence)
  blank=sentence.replace(word,'____');others=[w for w in words if w!=word];rnd.shuffle(others);options=[word]+others[:3];rnd.shuffle(options)
  questions.append(dict(id=len(questions)+1,type='choice',section='四选一词语填空',text='【选词填空】根据句意和越南语提示选择最合适的词语：'+blank+'。',pinyin=py(blank),vietnamese='Gợi ý nghĩa của từ cần điền: '+meaning+'.',options=dict(zip('ABCD',options)),optionPinyin={k:py(v) for k,v in zip('ABCD',options)},answers=['ABCD'[options.index(word)]],points=5,explanation=f'应填“{word}”（{meaning}）。完整句子：{sentence}。'))
  sorts.append((chunked.split('/'),'注意主语、状语、谓语和关联词的位置。Chú ý vị trí chủ ngữ, trạng ngữ, vị ngữ và liên từ.'))
 sorts += [([s.replace('{}',topic) for s in pattern],note) for topic,(pattern,note) in zip(topics,patterns)]
 for chunks,note in sorts:
  sentence=''.join(chunks);assert sentence not in seen,sentence;seen.add(sentence)
  shuffled=chunks[:]
  while ''.join(shuffled)==sentence:rnd.shuffle(shuffled)
  answers=[sentence+'。',sentence,sentence+'.']
  # Accept common subject/time and subject/condition permutations without changing words.
  if len(chunks)>2 and (chunks[0].endswith(('时','以前','以后','期间')) or chunks[0] in ['周末','参观展览时','刚到国外时']):
   if chunks[1] in ['他','她','我们','他们','老师','租客','消费者','患者']:
    alt=''.join([chunks[1],chunks[0]]+chunks[2:]);answers += [alt,alt+'。',alt+'.']
  count=han(sentence)
  questions.append(dict(id=len(questions)+1,type='fill',section='句子排序',text=f'【句子排序】排列为完整句子（{count}个汉字，不增减词语，不用斜线，不在汉字间加空格）：\n'+' / '.join(shuffled),pinyin=' / '.join(py(c) for c in shuffled),vietnamese='Sắp xếp thành câu hoàn chỉnh; không thêm bớt từ, không nhập dấu gạch chéo hoặc khoảng trắng giữa các chữ Hán.',answers=answers,points=5,hanziCount=count,explanation='参考句子：'+sentence+'。\n'+py(sentence)+'。\n'+note))
 exercise=dict(title=f'HSK5 第{lesson:02d}课 {title}',description='面向越南学习者的HSK5主题原创课堂练习 · 5道拼音选择＋5道词语填空＋10道句子排序 · 每题5分，满分100分 · 沿用现有HSK作业格式，非官方模拟卷',annotationVersion=1,questions=questions)
 assert len(questions)==20
 filename=f'lesson-{lesson:02d}.json';(OUT/filename).write_text(json.dumps(exercise,ensure_ascii=False,indent=2)+'\n')
 entries.append(dict(id=f'hsk5-topic-{lesson:02d}',bank='hsk5',exercise=exercise))
 manifest.append(dict(lesson=lesson,title=title,file=filename,source='自主设计原创',questionCount=20,totalPoints=100,pinyinTargetWords=words,fillTargetWords=words,sortingSentences=[''.join(c) for c,n in sorts]))
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
catalog=json.loads((ROOT/'exercise-catalog.json').read_text());before=[e for e in catalog['exercises'] if not re.fullmatch(r'hsk5-topic-\d{2}',e['id'])]
insert=next(i for i,e in enumerate(before) if e['bank']=='hsk5')+1
catalog['exercises']=before[:insert]+entries+before[insert:]
(ROOT/'exercise-catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
items=''.join(f'<li><a href="{m["file"]}" download>第{m["lesson"]:02d}课　{html.escape(m["title"])}</a><small>20题 · 100分 · 中越提示与答案解析</small></li>' for m in manifest)
(OUT/'index.html').write_text('''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HSK5 · 30个主题课堂练习</title><style>body{margin:0;background:#f3f8fc;color:#173b53;font:17px/1.8 system-ui,sans-serif}main{max-width:1000px;margin:auto;padding:32px 20px}h1{font-size:32px}a{color:#176cad}.actions{display:flex;gap:12px;flex-wrap:wrap}.actions a,li{padding:16px;background:white;border:1px solid #dceaf3;border-radius:12px}.actions a{text-decoration:none}ol{padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}li{list-style:none}small{display:block;color:#617c90;font-size:14px}@media print{.actions{display:none}li{break-inside:avoid}}</style></head><body><main><p>TIẾNG TRUNG CÔ NGA · HSK5</p><h1>30个主题，让汉语走进真实生活</h1><p>为越南学习者设计的600道原创课堂练习。每课5道拼音选择、5道词语填空、10道句子排序，每题5分，满分100分；沿用现有HSK作业格式，非官方HSK模拟试卷。</p><p lang="vi">30 chủ đề · 600 câu hỏi · Có gợi ý tiếng Việt, phiên âm và giải thích đáp án.</p><div class="actions"><a href="../?release=2026-10-21-hsk5-30">进入系统答题</a><a href="HSK5-30-topics.zip" download>下载30课题库</a><a href="使用说明.md">教师使用说明</a></div><p>进入主站后选择 HSK5，再选择对应课程，使用现有HSK5课程密码。下列链接可下载单课JSON，供教师导入、审核和修改。</p><ol>'''+items+'</ol></main></body></html>')
# Human-readable handout includes questions and a separate answer key.
handout=['# HSK5：30个主题课堂练习','600题；每课20题，每题5分，满分100分。非官方模拟试卷。']
for e in entries:
 d=e['exercise'];handout += ['\n## '+d['title']]
 for q in d['questions']:
  handout += ['\n'+str(q['id'])+'. '+q['text'],q['vietnamese']]
  if q['type']=='choice':handout += ['　'.join(k+'. '+v for k,v in q['options'].items())]
 handout += ['\n### 教师答案与解析']+[str(q['id'])+'. '+q['answers'][0]+'　'+q['explanation'] for q in d['questions']]
(OUT/'课堂练习与答案.md').write_text('\n\n'.join(handout)+'\n')
with zipfile.ZipFile(OUT/'HSK5-30-topics.zip','w',zipfile.ZIP_DEFLATED) as z:
 for path in sorted(OUT.iterdir()):
  if path.suffix in ['.json','.md','.txt','.html']:z.write(path,'hsk5-30/'+path.name)
 z.write(Path(__file__),'tools/generate-hsk5.py')
print(f'Generated {len(entries)} lessons / 600 questions / {len(seen)} unique sorting answers; catalog: {len(catalog["exercises"])} entries')

# Reapply authored section separation and refresh every downloadable copy.
import subprocess,sys
subprocess.run([sys.executable,str(ROOT/"tools/optimize-exercises.py")],check=True)

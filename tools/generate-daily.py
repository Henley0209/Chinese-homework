import json,re,random,unicodedata,collections
from pathlib import Path
from pypinyin import lazy_pinyin,Style,load_phrases_dict
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'daily-35'; OUT.mkdir(exist_ok=True)
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
import html,zipfile
load_phrases_dict({'哪位':[['nǎ'],['wèi']], '便宜一点':[['pián'],['yi'],['yì'],['diǎn']], '一遍':[['yí'],['biàn']], '一切':[['yí'],['qiè']], '一张':[['yì'],['zhāng']], '一件':[['yí'],['jiàn']], '一间':[['yì'],['jiān']], '一份菜单':[['yí'],['fèn'],['cài'],['dān']], '一点':[['yì'],['diǎn']], '一排':[['yì'],['pái']], '一条':[['yì'],['tiáo']], '得':[['de']], '只':[['zhǐ']], '长短':[['cháng'],['duǎn']], '长':[['cháng']], '相似':[['xiāng'],['sì']], '还':[['hái']], '这条':[['zhè'],['tiáo']]})
# Avoid a global polyphone override: phrase contexts determine their reading.
load_phrases_dict({'值得':[['zhí'],['de']], '还需要':[['hái'],['xū'],['yào']], '归还':[['guī'],['huán']], '还给':[['huán'],['gěi']], '长一点':[['cháng'],['yì'],['diǎn']]})
blocks=(OUT/'source.txt').read_text().split('@')[1:];assert len(blocks)==35
entries=[];manifest=[];all_sentences=set()
for lesson,block in enumerate(blocks,1):
 lines=block.strip().splitlines();title=lines[0];rows=[line.split('|') for line in lines[1:]];assert len(rows)==5
 rnd=random.Random(3500+lesson);questions=[];words=[r[0] for r in rows]
 full=[''.join(r[2].split('/')) for r in rows]
 assert len(set(words))==5
 for word,meaning,chunked,prompt in rows:
  pron=py(word);options=[pron]+wrong_pinyin(pron);rnd.shuffle(options)
  questions.append(dict(id=len(questions)+1,type='choice',section='拼音选择',text=f'【拼音选择】请选择“{word}”的正确读音。',pinyin='Qǐng xuǎn zé “____” de zhèng què dú yīn.',vietnamese='Chọn phiên âm đúng; chú ý âm đầu, vần và thanh điệu.',options=dict(zip('ABCD',options)),answers=['ABCD'[options.index(pron)]],points=5,explanation=f'“{word}”读作 {pron}，本课词义：{meaning}。'))
 for word,meaning,chunked,prompt in rows:
  sentence=chunked.replace('/','');assert sentence.count(word)==1,(lesson,word,sentence)
  blank=sentence.replace(word,'____');others=[w for w in words if w!=word];rnd.shuffle(others);options=[word]+others[:3];rnd.shuffle(options)
  questions.append(dict(id=len(questions)+1,type='choice',section='四选一词语填空',text='【选词填空】根据句意和越南语词义提示选择最合适的词语：'+blank+'。',pinyin=py(blank),vietnamese='Gợi ý nghĩa của từ cần điền: '+meaning+'.',options=dict(zip('ABCD',options)),optionPinyin={k:py(v) for k,v in zip('ABCD',options)},answers=['ABCD'[options.index(word)]],points=5,explanation=f'应填“{word}”（{meaning}）。完整表达：{sentence}。'))
 for word,meaning,chunked,prompt in rows:
  sentence=chunked.replace('/','');others=[s for s in full if s!=sentence];rnd.shuffle(others);options=[sentence]+others[:3];rnd.shuffle(options)
  questions.append(dict(id=len(questions)+1,type='choice',section='情境应答',text='【情境应答】'+prompt,pinyin=py(prompt),vietnamese='Chọn cách nói phù hợp nhất với tình huống và mục đích giao tiếp được nêu.',options=dict(zip('ABCD',options)),optionPinyin={k:py(v) for k,v in zip('ABCD',options)},answers=['ABCD'[options.index(sentence)]],points=5,explanation=f'此处的交际任务是：{prompt} 合适的表达：{sentence}。其他选项不符合题目指定的交际目的。'))
 for word,meaning,chunked,prompt in rows:
  chunks=chunked.split('/');sentence=''.join(chunks);assert len(chunks)>=4
  assert sentence not in all_sentences,(lesson,sentence);all_sentences.add(sentence)
  shuffled=chunks[:]
  while ''.join(shuffled)==sentence:rnd.shuffle(shuffled)
  variants=[sentence+'。',sentence,sentence+'.',sentence+'？',sentence+'?']
  # Time expressions may precede a subject or follow it; accept both when authored that way.
  subjects=['我','你','他','她','我们','你们','大家','我的手机']
  times=['每天早上','每天','通常','最近','现在','一般','今天早上','今天','昨天晚上','明天下午三点','周六早上八点','从昨天开始','晚饭以后','周末','吃完以后','退房以后','出门在外']
  if chunks[0] in times and chunks[1] in subjects or chunks[0] in subjects and chunks[1] in times:
   alt=''.join([chunks[1],chunks[0]]+chunks[2:]);variants += [alt,alt+'。',alt+'.',alt+'？',alt+'?']
  questions.append(dict(id=len(questions)+1,type='fill',section='句子排序',text='【句子排序】将词块排列为自然完整的表达（不增减词语，不用斜线，不在汉字间加空格）：\n'+' / '.join(shuffled),pinyin=' / '.join(py(c) for c in shuffled),vietnamese='Sắp xếp các cụm từ thành câu hoàn chỉnh. Không thêm bớt từ, không nhập dấu gạch chéo hoặc khoảng trắng giữa các chữ Hán.',answers=list(dict.fromkeys(variants)),points=5,hanziCount=han(sentence),explanation='参考表达：'+sentence+'。\n'+py(sentence)+'。\n先确定交际目的，再检查称呼、主语、时间、地点和谓语的位置。Xác định mục đích giao tiếp rồi kiểm tra trật tự từ.'))
 assert len(questions)==20
 exercise=dict(title=f'日常交际 第{lesson:02d}课 {title}',description='面向越南学习者的原创日常口语交际练习 · 5道拼音选择＋5道词语填空＋5道情境应答＋5道句子排序 · 每题5分，满分100分 · 沿用HSK作业格式，非官方考试试卷',annotationVersion=1,questions=questions)
 filename=f'lesson-{lesson:02d}.json';(OUT/filename).write_text(json.dumps(exercise,ensure_ascii=False,indent=2)+'\n')
 entries.append(dict(id=f'daily-topic-{lesson:02d}',bank='daily',exercise=exercise))
 manifest.append(dict(lesson=lesson,title=title,file=filename,questionCount=20,totalPoints=100,targetWords=words,communicationGoals=[r[3] for r in rows],sortingSentences=full))
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
catalog=json.loads((ROOT/'exercise-catalog.json').read_text());before=[e for e in catalog['exercises'] if not re.fullmatch(r'daily-topic-\d{2}',e['id'])]
insert=next(i for i,e in enumerate(before) if e['bank']=='daily')+1
catalog['exercises']=before[:insert]+entries+before[insert:]
(ROOT/'exercise-catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
handout=['# 日常中文口语交际：35个主题练习','共700题。每课20题，每题5分，满分100分。原创课堂巩固练习，非官方HSK试卷。']
for e,m in zip(entries,manifest):
 d=e['exercise'];handout += ['\n## '+d['title'],'核心词：'+'、'.join(m['targetWords'])]
 for q in d['questions']:
  handout += ['\n'+str(q['id'])+'. '+q['text'],q['vietnamese']]
  if q['type']=='choice':handout += ['　'.join(k+'. '+v for k,v in q['options'].items())]
 handout += ['\n### 教师答案与解析']+[str(q['id'])+'. '+q['answers'][0]+'　'+q['explanation'] for q in d['questions']]
 handout += ['\n### 口语拓展（教师人工反馈，不计系统分数）','两人轮流选择本课的一个交际任务，扮演对话双方，完成至少4轮对话。每人至少使用2个核心词；第二轮替换时间、地点、人物或需求再练。','本课交际任务：'+'；'.join(m['communicationGoals'])]
(OUT/'课堂练习与答案.md').write_text('\n\n'.join(handout)+'\n')
items=''.join(f'<li><a href="{m["file"]}" download>第{m["lesson"]:02d}课　{html.escape(m["title"])}</a><small>20题 · 100分 · 中越提示与答案解析</small></li>' for m in manifest)
(OUT/'index.html').write_text('''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>日常交际 · 35个主题口语练习</title><style>body{margin:0;background:#f3f8fc;color:#173b53;font:17px/1.8 system-ui,sans-serif}main{max-width:1000px;margin:auto;padding:32px 20px}h1{font-size:32px}a{color:#176cad}.actions{display:flex;gap:12px;flex-wrap:wrap}.actions a,li{padding:16px;background:white;border:1px solid #dceaf3;border-radius:12px}.actions a{text-decoration:none}ol{padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}li{list-style:none}small{display:block;color:#617c90;font-size:14px}@media print{.actions{display:none}li{break-inside:avoid}}</style></head><body><main><p>TIẾNG TRUNG CÔ NGA · GIAO TIẾP HẰNG NGÀY</p><h1>35个日常主题，开口就能用</h1><p>适合越南学习者的700道原创课堂练习。每课5道拼音选择、5道词语填空、5道情境应答、5道句子排序，每题5分，满分100分。沿用HSK作业格式，非官方考试试卷。</p><p lang="vi">35 chủ đề · 700 câu hỏi · Có gợi ý tiếng Việt, phiên âm và giải thích đáp án.</p><div class="actions"><a href="../?release=2026-10-21-daily-35">进入系统答题</a><a href="daily-35-topics.zip" download>下载35课题库与代码</a><a href="课堂练习与答案.md">课堂练习与教师答案</a><a href="使用说明.md">使用说明</a></div><p>进入主站，选择“日常交际”→“日常交际 第01课”至“第35课”，使用原有日常交际题库密码。原有“我每天的工作”课程保留。以下链接可下载单课JSON，供教师审核与导入。</p><ol>'''+items+'</ol></main></body></html>')
with zipfile.ZipFile(OUT/'daily-35-topics.zip','w',zipfile.ZIP_DEFLATED) as z:
 for path in sorted(OUT.iterdir()):
  if path.suffix in ['.json','.md','.txt','.html']:z.write(path,'daily-35/'+path.name)
 z.write(Path(__file__),'tools/generate-daily.py')
print(f'Generated {len(entries)} daily lessons / 700 questions / {len(all_sentences)} distinct expressions; {len(catalog["exercises"])} catalog entries')

import json,re,random,unicodedata,collections
from pathlib import Path
from pypinyin import lazy_pinyin,Style,load_phrases_dict
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'electronics-35'; OUT.mkdir(exist_ok=True)
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
load_phrases_dict({
 '首件':[['shǒu'],['jiàn']], '锁付':[['suǒ'],['fù']], '扭矩':[['niǔ'],['jǔ']], '滑牙':[['huá'],['yá']], '连锡':[['lián'],['xī']], '锡膏':[['xī'],['gāo']], '烙铁':[['lào'],['tie']], '卡料':[['kǎ'],['liào']], '校准':[['jiào'],['zhǔn']], '核销':[['hé'],['xiāo']], '色差':[['sè'],['chā']], '差异':[['chā'],['yì']], '长':[['cháng']], '工号':[['gōng'],['hào']], '班次':[['bān'],['cì']], '处置':[['chǔ'],['zhì']], '哪一位':[['nǎ'],['yí'],['wèi']], '哪一份':[['nǎ'],['yí'],['fèn']], '哪一张':[['nǎ'],['yì'],['zhāng']], '哪一条':[['nǎ'],['yì'],['tiáo']], '一遍':[['yí'],['biàn']], '一下':[['yí'],['xià']], '一项':[['yí'],['xiàng']], '一款':[['yì'],['kuǎn']], '一张':[['yì'],['zhāng']], '一条':[['yì'],['tiáo']], '一栋':[['yí'],['dòng']], '一份':[['yí'],['fèn']], '一致':[['yí'],['zhì']], '不一致':[['bù'],['yí'],['zhì']], '这件':[['zhè'],['jiàn']], '还没有':[['hái'],['méi'],['yǒu']], '长短':[['cháng'],['duǎn']]})
blocks=(OUT/'source.txt').read_text().split('@')[1:];assert len(blocks)==35
entries=[];manifest=[];seen=set()
# Additional communication drills vary the domain subject while practising confirmation,
# reporting uncertainty, notification, responsibility and discussion sequence.
patterns=[
 (['请','帮我确认一下','{}','的具体要求'],'你想请同事核实“{}”的具体要求，应该怎么说？'),
 (['关于','{}','我','还需要','再核实一下'],'你尚未核实“{}”，需要明确表示仍待核查，应该怎么说？'),
 (['如果','{}','有变化','请','及时通知我'],'你希望“{}”变化时及时获知，应该怎么说？'),
 (['请','告诉我','谁','负责','{}'],'你想询问由谁负责“{}”，应该怎么说？'),
 (['我们','先','确认','{}','再','继续沟通'],'你希望先确认“{}”再继续讨论，应该怎么说？')]
for lesson,block in enumerate(blocks,1):
 lines=block.strip().splitlines();title=lines[0];rows=[l.split('|') for l in lines[1:11]];topics=lines[11][2:].split(';')
 assert len(rows)==10 and len(topics)==5
 rnd=random.Random(35000+lesson);questions=[];words=[r[0] for r in rows];assert len(set(words))==10
 full=[r[2].replace('/','') for r in rows]
 drills=[(r[2].split('/'),r[3]) for r in rows]
 drills += [([s.replace('{}',topic) for s in chunks],prompt.replace('{}',topic)) for topic,(chunks,prompt) in zip(topics,patterns)]
 expressions=[''.join(chunks) for chunks,prompt in drills]
 assert len(set(expressions))==15,(lesson,'duplicate expression')
 for word,meaning,chunked,prompt in rows:
  pron=py(word);options=[pron]+wrong_pinyin(pron);rnd.shuffle(options)
  questions.append(dict(id=len(questions)+1,type='choice',section='拼音选择',text=f'【拼音选择】请选择“{word}”的正确读音。',pinyin='Qǐng xuǎn zé “____” de zhèng què dú yīn.',vietnamese='Chọn phiên âm đúng; chú ý âm đầu, vần và thanh điệu.',options=dict(zip('ABCD',options)),answers=['ABCD'[options.index(pron)]],points=2,explanation=f'“{word}”读作 {pron}，本课词义：{meaning}。'))
 for word,meaning,chunked,prompt in rows:
  sentence=chunked.replace('/','');assert sentence.count(word)==1,(lesson,word,sentence)
  blank=sentence.replace(word,'____');others=[w for w in words if w!=word];rnd.shuffle(others);options=[word]+others[:3];rnd.shuffle(options)
  questions.append(dict(id=len(questions)+1,type='choice',section='四选一词语填空',text='【选词填空】根据句意和越南语词义提示选择最合适的词语：'+blank+'。',pinyin=py(blank),vietnamese='Gợi ý nghĩa của từ cần điền: '+meaning+'.',options=dict(zip('ABCD',options)),optionPinyin={k:py(v) for k,v in zip('ABCD',options)},answers=['ABCD'[options.index(word)]],points=2,explanation=f'应填“{word}”（{meaning}）。完整表达：{sentence}。'))
 for chunks,prompt in drills:
  sentence=''.join(chunks);others=[s for s in expressions if s!=sentence];rnd.shuffle(others);options=[sentence]+others[:3];rnd.shuffle(options)
  questions.append(dict(id=len(questions)+1,type='choice',section='情境应答',text='【情境应答】'+prompt,pinyin=py(prompt),vietnamese='Chọn cách nói đúng nhất với mục đích giao tiếp đã nêu trong tình huống tại nhà máy điện tử.',options=dict(zip('ABCD',options)),optionPinyin={k:py(v) for k,v in zip('ABCD',options)},answers=['ABCD'[options.index(sentence)]],points=2,explanation='交际任务：'+prompt+'\n符合此任务的表达：'+sentence+'。其他选项未直接完成题目指定的交际目的。'))
 for chunks,prompt in drills:
  sentence=''.join(chunks);assert sentence not in seen,(lesson,sentence);seen.add(sentence)
  shuffled=chunks[:]
  while ''.join(shuffled)==sentence:rnd.shuffle(shuffled)
  variants=[sentence,sentence+'。',sentence+'.',sentence+'？',sentence+'?']
  times=['今天','今天早上','昨天','现在','这周','下周','正式上岗以前','领取物料时','生产结束以后','进入生产区以前','进入指定区域前','开工以前','换型以前','封箱以前','撤离以后']
  subjects=['我','你','他','她','我们','大家']
  if (chunks[0] in times and chunks[1] in subjects) or (chunks[0] in subjects and chunks[1] in times):
   alt=''.join([chunks[1],chunks[0]]+chunks[2:]);variants += [alt,alt+'。',alt+'.',alt+'？',alt+'?']
  questions.append(dict(id=len(questions)+1,type='fill',section='句子排序',text='【句子排序】将词块排列为完整表达（不增减词语，不用斜线，不在汉字间加空格）：\n'+' / '.join(shuffled),pinyin=' / '.join(py(c) for c in shuffled),vietnamese='Sắp xếp các cụm từ thành câu hoàn chỉnh; không thêm bớt từ, không nhập dấu gạch chéo hoặc khoảng trắng giữa các chữ Hán.',answers=list(dict.fromkeys(variants)),points=2,hanziCount=han(sentence),explanation='参考表达：'+sentence+'。\n'+py(sentence)+'。\n根据交际目的确定语序，注意主语、时间、条件和谓语的位置。Xác định trật tự câu theo mục đích giao tiếp.'))
 assert len(questions)==50
 exercise=dict(title=f'汉语工厂 第{lesson:02d}课 {title}',description='面向越南学习者的汉语工厂原创课堂练习 · 10道拼音选择＋10道词语填空＋15道情境应答＋15道句子排序 · 每题2分，满分100分 · 沿用HSK作业格式，非官方试卷；现场操作以有效文件和授权要求为准',annotationVersion=1,questions=questions)
 filename=f'lesson-{lesson:02d}.json';(OUT/filename).write_text(json.dumps(exercise,ensure_ascii=False,indent=2)+'\n')
 entries.append(dict(id=f'electronics-topic-{lesson:02d}',bank='factory',exercise=exercise))
 manifest.append(dict(lesson=lesson,title=title,file=filename,bank='factory',questionCount=50,totalPoints=100,targetWords=words,communicationGoals=[p for c,p in drills],sortingSentences=expressions))
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
catalog=json.loads((ROOT/'exercise-catalog.json').read_text());before=[e for e in catalog['exercises'] if not re.fullmatch(r'electronics-topic-\d{2}',e['id'])]
# Append after existing factory lessons; retain all stable IDs and questions.
insert=max(i for i,e in enumerate(before) if e['bank']=='factory')+1
catalog['exercises']=before[:insert]+entries+before[insert:]
(ROOT/'exercise-catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
handout=['# 汉语工厂：35个主题练习','共1750题。每课50题，每题2分，满分100分。所属题库：汉语工厂。原创课堂语言练习，非官方HSK试卷。']
for e,m in zip(entries,manifest):
 d=e['exercise'];handout += ['\n## '+d['title'],'核心词：'+'、'.join(m['targetWords'])]
 for q in d['questions']:
  handout += ['\n'+str(q['id'])+'. '+q['text'],q['vietnamese']]
  if q['type']=='choice':handout += ['　'.join(k+'. '+v for k,v in q['options'].items())]
 handout += ['\n### 教师答案与解析']+[str(q['id'])+'. '+q['answers'][0]+'　'+q['explanation'] for q in d['questions']]
 handout += ['\n### 角色扮演（人工反馈，不计系统分数）','两人轮流扮演本课情境中的员工与沟通对象，选取2个交际任务完成至少4轮对话。每人至少使用3个核心词，第二轮更换岗位、物料、时间或异常现象。','基础任务：'+'；'.join(m['communicationGoals'][:10])]
(OUT/'课堂练习与答案.md').write_text('\n\n'.join(handout)+'\n')
items=''.join(f'<li><a href="{m["file"]}" download>第{m["lesson"]:02d}课　{html.escape(m["title"])}</a><small>50题 · 100分 · 汉语工厂题库</small></li>' for m in manifest)
(OUT/'index.html').write_text('''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>汉语工厂 · 35课1750题</title><style>body{margin:0;background:#f3f8fc;color:#173b53;font:17px/1.8 system-ui,sans-serif}main{max-width:1050px;margin:auto;padding:32px 20px}h1{font-size:32px}a{color:#176cad}.actions{display:flex;gap:12px;flex-wrap:wrap}.actions a,li{padding:16px;background:white;border:1px solid #dceaf3;border-radius:12px}.actions a{text-decoration:none}ol{padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}li{list-style:none}small{display:block;color:#617c90;font-size:14px}@media print{.actions{display:none}li{break-inside:avoid}}</style></head><body><main><p>TIẾNG TRUNG CÔ NGA · TIẾNG TRUNG TRONG NHÀ MÁY</p><h1>汉语工厂：35个工作主题</h1><p>从入职报到到生产协作，为越南学习者设计1750道原创课堂语言练习。每课50题：10道拼音选择、10道词语填空、15道情境应答、15道句子排序。每题2分，满分100分。</p><p lang="vi">35 chủ đề · 1750 câu hỏi · 50 câu mỗi bài · Có gợi ý tiếng Việt, phiên âm và giải thích đáp án.</p><div class="actions"><a href="../?release=2026-10-22-factory-bank">进入汉语工厂题库</a><a href="electronics-35-topics.zip" download>下载35课题库与生成代码</a><a href="课堂练习与答案.md">课堂练习与教师答案</a><a href="使用说明.md">使用说明</a></div><p>进入主站，选择“汉语工厂”，再选择“汉语工厂 第01课”至“第35课”，使用原有汉语工厂题库密码。原有日常交际课程和汉语工厂题库保留。</p><p>本套沿用HSK作业格式，非官方考试试卷。技术主题用于语言沟通训练，具体操作依据所在工厂的有效文件与授权要求。</p><ol>'''+items+'</ol></main></body></html>')
with zipfile.ZipFile(OUT/'electronics-35-topics.zip','w',zipfile.ZIP_DEFLATED) as z:
 for path in sorted(OUT.iterdir()):
  if path.suffix in ['.json','.md','.txt','.html']:z.write(path,'electronics-35/'+path.name)
 z.write(Path(__file__),'tools/generate-electronics.py')
print(f'Generated {len(entries)} lessons / 1750 questions / {len(seen)} distinct sorting expressions; catalog {len(catalog["exercises"])} entries; bank=factory')

# Reapply authored section separation and refresh every downloadable copy.
import subprocess,sys
subprocess.run([sys.executable,str(ROOT/"tools/optimize-exercises.py")],check=True)

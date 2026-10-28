"""Build independent section content, then synchronize every published copy.

Run after any legacy course generator. Requires pypinyin (same as those generators).
Authored inputs live beside this script; rebuilding never calls an AI service.
"""
import json
import random
import re
import zipfile
from pathlib import Path
from exercise_content import ROOT, GRAMMAR, choice, fill, pronunciation, sorting, py

GROUPS={'hsk1-2':'hsk1-2-30','hsk3':'hsk3-40','hsk4':'hsk4-40',
        'hsk5':'hsk5-30','daily':'daily-35','electronics':'electronics-35'}
VERSION=1

def read(path):return json.loads(path.read_text())
def write_text(path,text):
    if not path.exists() or path.read_text()!=text:path.write_text(text)
def write(path,data):write_text(path,json.dumps(data,ensure_ascii=False,indent=2)+'\n')
def key(text):return re.sub(r'[^\u3400-\u9fffA-Za-z0-9]','',text)
def answer(q):return q.get('options',{}).get(q['answers'][0],q['answers'][0])
def blocks(filename):
    result={};current=None
    for line in (ROOT/'tools'/filename).read_text().splitlines():
        if not line or line.startswith('#'):continue
        if line.startswith('@'):
            header=line[1:].split();current=int(header[0]);result[current]={'words':header[1:],'lines':[]}
        else:result[current]['lines'].append(line)
    return result

def grammar_for(text):
    pairs=[('虽然','但是','虽然……但是……：转折关系'),('不但','而且','不但……而且……：递进关系'),
      ('不仅','还','不仅……还……：递进关系'),('只有','才','只有……才……：必要条件'),
      ('只要','就','只要……就……：充分条件'),('如果','就','如果……就……：假设条件'),
      ('无论','都','无论……都……：无条件关系'),('不管','都','不管……都……：无条件关系'),
      ('与其','不如','与其……不如……：比较并提出选择'),('一边','一边','一边……一边……：同时进行'),
      ('先','再','先……再……：动作先后顺序'),('除了','还','除了……还……：补充'),
      ('因为','所以','因为……所以……：因果关系')]
    for a,b,hint in pairs:
        if a in text and b in text and (a!=b or text.count(a)>1):return hint
    for token,hint in [('把','把＋宾语＋动词＋结果/处所：说明处置'),('被','被＋施事＋动词：被动表达'),
      ('比','甲＋比＋乙＋形容词：比较'),('为了','为了＋目的＋行动'),('正在','正在＋动词：正在进行'),
      ('以后','动作＋以后：说明时间顺序'),('以前','动作＋以前：说明时间顺序'),
      ('已经','已经……了：已完成或已达到的状态'),('越来越','越来越＋形容词：程度变化'),
      ('得','动词＋得＋程度/状态补语'),('过','动词＋过：经历表达'),('给','给＋人＋物/动作'),
      ('在','在＋地点＋动词；检查地点与谓语位置')]:
        if token in text:return hint
    return '先确定主语与谓语，再安排时间、地点和修饰语；保持词块完整。'

def beginner(exercise,content,rnd):
    qs=exercise['questions'];rows=content['lines'];assert len(rows)==15
    for i,row in enumerate(rows):
        target=re.search(r'\[([^]]+)\]',row)[1]
        meaning,focus,wrong=GRAMMAR[target]
        qs[15+i]=fill(qs[15+i],target,row.replace('['+target+']','____'),meaning,rnd,wrong,focus)

def daily(exercise,content,rnd):
    qs=exercise['questions'];rows=content['lines'];assert len(rows)==10
    words=[r.split('|')[0] for r in rows[:5]]
    for i,row in enumerate(rows[:5]):
        word,meaning,sentence,focus=row.split('|')
        qs[5+i]=fill(qs[5+i],word,sentence,meaning,rnd,[w for w in words if w!=word],focus)
    for i,row in enumerate(rows[5:]):
        chunked,focus=row.split('|')
        qs[15+i]=sorting(qs[15+i],chunked.split('/'),focus,rnd)
    # Repair neutral-tone readings in the retained pronunciation section as well.
    replacements={
      4:'游泳:书法',5:'睡觉:通勤',6:'提前:行程 准时:赴约',8:'集合:户外',9:'对面:拐弯',
      10:'换乘:高峰',11:'后备箱:计价器 发票:起步价',13:'打折:单价',14:'试衣间:面料 尺码:款式',
      15:'货架:生鲜 保质期:冷藏',16:'收据:瑕疵 退款:凭据',17:'菜单:餐具',18:'打包:杯盖',
      19:'蘸料:香草 春卷:鱼露',20:'洗碗:翻炒 食材:炖汤',21:'早餐:房型 退房:房卡',
      22:'租金:中介 家具:卧室',23:'漏水:制冷 保修:零件',24:'签收:包裹',
      25:'充值:话费 信号:网络 套餐:运营商',27:'挂号:咽喉',29:'洗头:发尾',30:'回电:占线',
      32:'举手之劳:费心 帮忙:劳烦',33:'迟到:歉意 原谅:失约',34:'建议:协商',35:'位置:服务台'}
    replacement=dict(pair.split(':') for pair in replacements.get(content['lesson'],'').split())
    for i in range(5):
        word=re.search('“(.*?)”',qs[i]['text'])[1]
        word=replacement.get(word,word)
        qs[i]=pronunciation(qs[i],word,rnd)

def advanced(exercise,content,rnd):
    qs=exercise['questions'];assert len(content['lines'])==5 and len(content['words'])==5
    words=[line.split('|')[0] for line in content['lines']]
    for i,word in enumerate(content['words']):qs[i]=pronunciation(qs[i],word,rnd)
    for i,row in enumerate(content['lines']):
        word,meaning,sentence=row.split('|')
        qs[5+i]=fill(qs[5+i],word,sentence,meaning,rnd,[w for w in words if w!=word],grammar_for(sentence))

# Each noun phrase is authored for one factory lesson in electronics-35/source.txt.
# Situation answers and sorting sentences use separate intents and syntax; neither
# section prints the other section's correct sentences, including distractors.
SCENES=[
 ('你尚未拿到“{}”的资料，怎样说明情况？','我还没有收到关于{}的资料','还没有＋动词'),
 ('你只想核实“{}”，怎样礼貌地限定本次沟通范围？','我这次只想核实{}','只＋动词：限定范围'),
 ('对方问你是否还关心“{}”，你想表示还需要继续了解，怎样回答？','我还需要进一步了解{}','还需要＋动词')]
SORTS=[
 (['请','把','关于{}的说明','发给我'],'把＋宾语＋动作＋接收对象'),
 (['我们','已经','核对过','{}'],'已经＋动词＋过：已完成的核对'),
 (['只有','先了解{}','我们','才能解释清楚'],'只有……才……：必要条件'),
 (['我','不仅想了解{}','还想知道','具体由谁负责'],'不仅……还……：递进'),
 (['讨论{}','之前','请','先准备好相关记录'],'……之前；先；结果补语'),
 (['关于{}','我','有一个问题','想请教您'],'关于＋话题；想＋动词'),
 (['如果','你还不清楚{}','就','先向负责人询问'],'如果……就……：假设'),
 (['虽然','我们已经讨论过{}','但是','还需要核实细节'],'虽然……但是……：转折'),
 (['与其','反复猜测{}','不如','查阅相关文件'],'与其……不如……：建议'),
 (['为了','准确说明{}','我','重新整理了资料'],'为了＋目的＋行动'),
 (['大家','对{}','有疑问的话','可以提出来'],'对＋话题；……的话；趋向补语'),
 (['请','先说明{}','再','回答大家的问题'],'先……再……：顺序'),
 (['无论','谁来说明{}','都','应该以有效文件为依据'],'无论……都……：无条件'),
 (['{}','涉及的问题','需要','逐项记录清楚'],'的字短语；需要；结果补语'),
 (['等','{}确认以后','我们','再补充相关记录'],'等……以后再……：先后')]

def factory(exercise,words,topics,rnd):
    qs=exercise['questions'];assert len(words)==10 and len(topics)==5
    for i,word in enumerate(words):qs[i]=pronunciation(qs[i],word,rnd)
    expressions=[];prompts=[];focus=[]
    for mode,(prompt,expression,grammar) in enumerate(SCENES):
        for topic in topics:
            expressions.append(expression.format(topic));prompts.append(prompt.format(topic));focus.append(grammar)
    for i,(correct,prompt,grammar) in enumerate(zip(expressions,prompts,focus)):
        # Alternatives include the same noun phrase with two different intents,
        # and a different topic with the same intent. Learners must read both.
        topic_idx=i%5;mode=i//5
        wrong=[expressions[m*5+topic_idx] for m in range(3) if m!=mode]
        wrong.append(expressions[mode*5+(topic_idx+1)%5])
        q=choice(qs[20+i],'【情境应答】'+prompt,correct,wrong,rnd,
          '本题要求：'+prompt+'\n合适的表达：'+correct+'。\n语法：'+grammar,
          vietnamese='Chọn câu đáp ứng đúng tình huống và đúng chủ đề được nêu.')
        q.update(completeSentence=correct,grammarFocus=grammar);qs[20+i]=q
    for i,(chunks,focus) in enumerate(SORTS):
        topic=topics[i%5]
        qs[35+i]=sorting(qs[35+i],[c.format(topic) for c in chunks],focus,rnd)

def summarize(exercise):
    p=[];f=[];s=[];r=[];grammar=[]
    for q in exercise['questions']:
        section=q.get('section','')
        if not section:
            for name in ['拼音选择','选词填空','句子排序']:
                if '【'+name+'】' in q['text']:
                    section='四选一词语填空' if name=='选词填空' else name
                    q['section']=section
                    break
        if '拼音选择' in section:
            word=re.search('“(.*?)”',q['text'])
            if word:q['targetWord']=word[1];p.append(word[1])
        if q['type']=='choice' and ('填空' in section or '选词填空' in q['text']):
            target=answer(q);q['targetWord']=target;f.append(target)
            if not q.get('completeSentence'):
                q['completeSentence']=re.split(r'[：】]',q['text'])[-1].replace('____',target).replace('___',target)
        if q['type']=='fill' and ('排序' in section or '句子排序' in q['text']):
            s.append(answer(q))
            if not q.get('grammarFocus'):
                q['grammarFocus']=grammar_for(answer(q))
                q['explanation']+='\n语法与搭配：'+q['grammarFocus']
        if section=='情境应答':r.append(answer(q))
        if q.get('grammarFocus') and q['grammarFocus'] not in grammar:grammar.append(q['grammarFocus'])
    return dict(pinyinTargetWords=p,fillTargetWords=f,sortingSentences=s,responseSentences=r,grammarFocus=grammar)

def audit(exercise):
    info=summarize(exercise)
    assert not set(info['pinyinTargetWords'])&set(info['fillTargetWords']),(exercise['title'],'pinyin/fill overlap',set(info['pinyinTargetWords'])&set(info['fillTargetWords']))
    owner={}
    sorting_keys={key(s) for s in info['sortingSentences']}
    for q in exercise['questions']:
        section=q.get('section','')
        if q.get('completeSentence'):full=q['completeSentence']
        elif q['type']=='fill' and '句子排序' in q['text']:full=answer(q)
        else:continue
        normalized=key(full)
        assert normalized not in owner,(exercise['title'],'repeated sentence',q['id'],owner.get(normalized),full)
        owner[normalized]=q['id']
        if section=='情境应答':
            assert not any(key(v) in sorting_keys for v in q['options'].values()),(exercise['title'],'answer leak',q['id'])
    return info

def artifacts(folder,entries):
    """Write the same final questions to lesson files, local catalogs and downloads."""
    manifest=read(folder/'manifest.json')
    for m,entry in zip(manifest,entries):
        exercise=entry['exercise'];write(folder/m['file'],exercise)
        m.update(audit(exercise));m['contentDiversityVersion']=VERSION
        if 'targetWords' in m:m['targetWords']=m['pinyinTargetWords']
        if 'communicationGoals' in m:
            m['communicationGoals']=[q['text'].split('】')[-1] for q in exercise['questions'] if q.get('section')=='情境应答']
    write(folder/'manifest.json',manifest)
    if (folder/'exercise-catalog.json').exists():
        old=read(folder/'exercise-catalog.json');old['exercises']=entries;write(folder/'exercise-catalog.json',old)
    handout=['# '+folder.name+' · 分题型练习与教师答案',
      '拼音与填空目标词分开；填空、情境应答和排序使用独立完整句。允许相关词语在新语境中复现。',
      '每课题量和总分沿用原课程；更新题目后，旧的未完成答题进度会按系统原有规则重置。']
    for entry,m in zip(entries,manifest):
        d=entry['exercise'];handout += ['\n## '+d['title'],'拼音目标词：'+'、'.join(m['pinyinTargetWords']),
          '填空目标词：'+'、'.join(dict.fromkeys(m['fillTargetWords'])),'语法与搭配：'+'；'.join(m['grammarFocus'])]
        for q in d['questions']:
            handout += ['\n'+str(q['id'])+'. '+q['text'],q.get('vietnamese','')]
            if q['type']=='choice':handout += ['　'.join(k+'. '+v for k,v in q['options'].items())]
        handout += ['\n### 教师答案与解析']+[str(q['id'])+'. '+q['answers'][0]+'　'+q.get('explanation','') for q in d['questions']]
        if m.get('communicationGoals'):
            handout += ['\n### 口语拓展（教师人工反馈，不计系统分数）',
              '两人轮流选择本课一个交际任务，扮演对话双方，完成至少4轮对话。每人至少使用2个主题词，并用不同的时间、人物或需求再练一轮。',
              '交际任务：'+'；'.join(m['communicationGoals'])]
    write_text(folder/'课堂练习与答案.md','\n\n'.join(handout)+'\n')
    for path in folder.glob('*.zip'):
        with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED) as z:
            for asset in sorted(folder.iterdir()):
                if asset.suffix in {'.json','.md','.txt','.html'}:z.write(asset,folder.name+'/'+asset.name)
            for source in sorted((ROOT/'tools').glob('exercise*')):z.write(source,'tools/'+source.name)
            for source in sorted((ROOT/'tools').glob('generate-*.py')):
                if source.name!='generate-conversation-banks.py':z.write(source,'tools/'+source.name)
            z.write(Path(__file__),'tools/'+Path(__file__).name)

def main():
    catalog=read(ROOT/'exercise-catalog.json');daily_data=blocks('exercise-daily-content.txt')
    for number,content in daily_data.items():content['lesson']=number
    beginner_data=blocks('exercise-beginner-content.txt');advanced_data=blocks('exercise-hsk5-content.txt')
    factory_words=[line.split() for line in (ROOT/'tools/exercise-factory-words.txt').read_text().splitlines() if line and not line.startswith('#')]
    factory_topics=[block.strip().splitlines()[11][2:].split(';') for block in (ROOT/'electronics-35/source.txt').read_text().split('@')[1:]]
    grouped={g:[] for g in GROUPS};report=[]
    for entry in catalog['exercises']:
        d=entry['exercise'];match=re.fullmatch(r'(hsk1-2|hsk3|hsk4|hsk5|daily|electronics)-topic-(\d+)',entry['id'])
        if match:
            group,number=match.groups();lesson=int(number);rnd=random.Random(f'diverse-v{VERSION}:{entry["id"]}')
            if group=='hsk1-2':beginner(d,beginner_data[lesson],rnd)
            elif group=='daily':daily(d,daily_data[lesson],rnd)
            elif group=='hsk5':advanced(d,advanced_data[lesson],rnd)
            elif group=='electronics':factory(d,factory_words[lesson-1],factory_topics[lesson-1],rnd)
            grouped[group].append(entry)
        elif entry['id']=='factory-3d7a8ec0-f828-4e4c-b02c-d547448a50f8':
            words='油墨 饱和度 纸板 对照 稳定性 偏浅 偏深 光源 留样 追溯 混色 测量 记录 返工 预防'.split()
            rnd=random.Random('legacy-factory-v1')
            for i,word in enumerate(words):d['questions'][i]=pronunciation(d['questions'][i],word,rnd)
        elif entry['id']=='daily-lesson12-workday':
            words='会议 资料 合作 负责人 车间 订单 交货 整理 安排 通知 报告 运输 反馈 统计 跟踪'.split()
            rnd=random.Random('legacy-daily-v1')
            for i,word in enumerate(words):d['questions'][i]=pronunciation(d['questions'][i],word,rnd)
        # Hidden demo exercises are preserved, but do not need section allocations.
        if '演示练习' not in d['title']:
            pron_rnd=random.Random('pronunciation-v1:'+entry['id'])
            for i,q in enumerate(d['questions']):
                if '拼音选择' in q.get('section','') or '【拼音选择】' in q['text']:
                    word=re.search('“(.*?)”',q['text'])[1]
                    d['questions'][i]=pronunciation(q,word,pron_rnd)
            note='同主题题型分工：拼音辨音、填空词义与语法、排序语序；完整句不跨题型重复。'
            if note not in d.get('description',''):d['description']=d.get('description','')+' '+note
            info=audit(d);d['contentDiversityVersion']=VERSION
            report.append(dict(id=entry['id'],title=d['title'],questionCount=len(d['questions']),**info))
    # Validate everything before writing any published data.
    for group,entries in grouped.items():
        assert len(entries)==len(read(ROOT/GROUPS[group]/'manifest.json'))
    write(ROOT/'exercise-catalog.json',catalog)
    for group,entries in grouped.items():artifacts(ROOT/GROUPS[group],entries)
    # Standalone legacy course copies are also used for imports and download links.
    legacy={'factory-3d7a8ec0-f828-4e4c-b02c-d547448a50f8':'exercises/lesson11-work-abnormalities.json',
            'daily-lesson12-workday':'banks/lesson12-workday.json'}
    for entry in catalog['exercises']:
        if entry['id'] in legacy:write(ROOT/legacy[entry['id']],entry['exercise'])
    write(ROOT/'exercise-content-audit.json',dict(version=VERSION,courseCount=len(report),courses=report))
    print(f'Checked {len(report)} visible courses / {sum(r["questionCount"] for r in report)} questions; no repeated section targets or complete sentences.')

if __name__=='__main__':main()

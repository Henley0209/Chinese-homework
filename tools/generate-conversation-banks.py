"""Compile 200 curriculum-derived oral question/answer pairs per visible exercise.
These are structured course drills, not claims of individually AI-authored dialogue.
"""
import collections
import hashlib
import json
import re
from pathlib import Path
from pypinyin import lazy_pinyin, Style, load_phrases_dict

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'conversation-banks'
LABELS = {'intro':'入门练习','hsk1-2':'HSK1-2','hsk3':'HSK3','hsk4':'HSK4','hsk5':'HSK5','daily':'日常交际','factory':'汉语工厂'}
STOP = set('我 你 他 她 它 是 的 了 吗 呢 在 有 不 很 也 都 和 什么 怎么 哪里 这个 那个 请 一个 今天 明天 昨天'.split())
load_phrases_dict({'你好':[['nǐ'],['hǎo']], '您好':[['nín'],['hǎo']], '什么':[['shén'],['me']], '名字':[['míng'],['zi']], '朋友':[['péng'],['you']], '谢谢':[['xiè'],['xie']], '不客气':[['bú'],['kè'],['qi']], '对不起':[['duì'],['bu'],['qǐ']], '认识':[['rèn'],['shi']], '时候':[['shí'],['hou']], '觉得':[['jué'],['de']], '了解':[['liǎo'],['jiě']], '处理':[['chǔ'],['lǐ']], '长大':[['zhǎng'],['dà']], '长短':[['cháng'],['duǎn']], '归还':[['guī'],['huán']], '还需要':[['hái'],['xū'],['yào']], '便宜':[['pián'],['yi']], '地方':[['dì'],['fang']], '事情':[['shì'],['qing']], '关系':[['guān'],['xi']], '衣服':[['yī'],['fu']], '东西':[['dōng'],['xi']], '一下':[['yí'],['xià']], '一遍':[['yí'],['biàn']], '一句':[['yí'],['jù']], '一会儿':[['yí'],['huì'],['r']]})

def py(text):
    return ' '.join(lazy_pinyin(text, style=Style.TONE, errors=lambda value:[value])).replace('v','ü')

def han(text):
    return bool(re.search(r'[\u3400-\u9fff]', text))

def text_key(text):
    return re.sub(r'[\W_]+','',text, flags=re.UNICODE)

def first_answer(question):
    answers = question.get('answers',[])
    if not answers:
        return ''
    return str(question.get('options',{}).get(answers[0],answers[0])).strip()

def seeds_for(exercise):
    words = []
    sentences = {}
    def word(value):
        value = value.strip('。？！!?,，：:；;“”" ')
        if han(value) and re.fullmatch(r'[\u3400-\u9fffA-Za-z0-9]+',value) and 1 <= len(value) <= 10 and value not in STOP and value not in words:
            words.append(value)
    def sentence(value, source, scene=''):
        value = value.strip()
        if not han(value) or '____' in value or len(value)>120:
            return
        if len(text_key(value)) < 4:
            word(value)
            return
        if not value.endswith(('。','！','？','.','!','?')):
            value += '。'
        k = text_key(value)
        if k not in sentences:
            sentences[k] = {'text':value,'source':[str(source)],'scene':scene}
        else:
            if str(source) not in sentences[k]['source']:
                sentences[k]['source'].append(str(source))
            if scene:
                sentences[k]['scene'] = scene
    for q in exercise['questions']:
        answer = first_answer(q)
        source = q['id']
        raw = q.get('text','')
        for match in re.findall('[“「『]([^”」』]+)[”」』]',raw):
            word(match)
        if len(text_key(answer)) <= 6:
            word(answer)
        explanation = q.get('explanation','')
        for label in ['完整句子','完整表达','参考句子','参考表达']:
            match = re.search(label+r'[：:]([^\n]+)', explanation)
            if match:
                sentence(match.group(1),source)
        if re.search(r'_{1,}',raw) and han(answer) and len(answer)<=10:
            base = re.sub(r'^【[^】]+】','',raw).split('：')[-1]
            sentence(re.sub(r'_{1,}',answer,base).strip(),source)
        if q.get('section') in ['情境应答','情景应答'] or re.match(r'【情[境景]应答】',raw):
            scene = re.sub(r'^【[^】]+】','',raw).strip()
            sentence(answer,source,scene)
        elif q.get('type') == 'fill':
            sentence(answer,source)
        elif len(text_key(answer)) >= 7:
            sentence(answer,source)
    # Exact beginner sentences are part of the greeting curriculum, not off-topic padding.
    if '你好' in exercise['title'] or exercise['title'].startswith('第一课'):
        for s in ['你好！','老师您好！','早上好！','下午好！','晚上好！','我很好，谢谢。','不客气。','对不起。','没关系。','老师再见！','我们明天见。','很高兴认识你。','谢谢你的帮助。']:
            sentence(s,'greeting-extension')
    return words,list(sentences.values())

def keywords_for(answer,words):
    values = [w for w in words if w in answer and w not in STOP]
    if not values:
        pieces = re.findall(r'[\u3400-\u9fff]{2,}', answer)
        for piece in pieces:
            clean = re.sub(r'^(?:请问|请|我们|我|你|他|她|今天|明天|昨天|已经|正在|可以|需要|应该|很|也|是)+','',piece)
            if len(clean)>=2:
                values.append(clean[:min(6,len(clean))])
    if values:
        return list(dict.fromkeys(values))[:6]
    # Keep the fallback contiguous in the actual reference. Joining clauses across
    # punctuation can invent a keyword that cannot be blanked out or found there.
    pieces = re.findall(r'[\u3400-\u9fff]+',answer)
    return [max(pieces,key=len)[:6]] if pieces else []

def natural_question(sentence):
    rules = [(r'^我的名字是.{1,5}[。！]$', '你叫什么名字？'),(r'^我叫[^来去帮进出过]{1,4}[。！]$', '你叫什么名字？'),(r'^我是(?:中国|越南|泰国|日本|韩国|美国|英国|法国|德国|新加坡|马来西亚|缅甸|柬埔寨|老挝|加拿大|澳大利亚)人[。！]$', '你是哪里人？'),(r'^我今年.+岁', '你今年多大？'),(r'^我(?:很|也|最|特别|非常)?喜欢', '你喜欢什么？'),(r'^我每天', '你每天通常做什么？'),(r'^我(?:已经|现在已经)', '现在的情况怎么样？'),(r'^我(?:正|正在|已经|也|还)?准备', '你准备做什么？'),(r'^我(?:也|一直|还是)?觉得', '你有什么看法？'),(r'^我们.*先.*再', '你们准备按什么顺序做？'),(r'^虽然.*但是', '你能说说这件事的两个方面吗？'),(r'^因为.*所以', '你能说明原因和结果吗？')]
    if sentence.endswith(('？','?')):
        return None
    for pattern,question in rules:
        if re.search(pattern,sentence):
            return question
    return None

def candidates(exercise):
    words,seeds = seeds_for(exercise)
    topic = re.sub(r'^(?:HSK[\d-]+|日常交际|汉语工厂)?\s*第\d+课\s*','',exercise['title']).strip()[:35]
    pool = []
    seen = set()
    def add(question,answer,level,skill,source,keys=None):
        question=question.strip();answer=answer.strip()
        k=text_key(question)
        if not question or not han(answer) or len(question)>220 or not k or k in seen:
            return
        keys=keys or keywords_for(answer,words)
        if not keys or any(key not in answer for key in keys):
            raise ValueError(('keyword not in reference',question,answer,keys))
        seen.add(k)
        pool.append({'question':question,'referenceAnswer':answer,'keywords':keys,'level':level,'skill':skill,'sourceQuestionIds':source})
    for w in words:
        examples = [s for s in seeds if w in s['text']]
        add(f'请说一遍“{w}”。',w,1,'词语跟读',['vocabulary'],[w])
        add(f'我们练习“{w}”，你能清楚地读出来吗？',w,1,'词语发音',['vocabulary'],[w])
        add(f'这个词是“{w}”，请你再说一次。',w,1,'词语复述',['vocabulary'],[w])
        if examples:
            s=examples[0]
            for question in [f'请用“{w}”说一句与本课有关的话。',f'你能用“{w}”表达一个完整的意思吗？',f'我想听你怎样使用“{w}”，请说一句话。']:
                add(question,s['text'],2,'词语运用',s['source'],[w])
    for s in seeds:
        answer=s['text'];keys=keywords_for(answer,words);w=keys[0];source=s['source'];blank=answer.replace(w,'（空白）',1)
        if s['scene']:
            add(s['scene'],answer,2,'情境应答',source)
        nq=natural_question(answer)
        if nq:
            add(nq,answer,2,'主题问答',source)
        add(f'请把这句话补充完整：“{blank}”',answer,1,'句子补全',source)
        add(f'“{blank}”里面缺少哪个词？请说出关键词。',w,1,'关键词应答',source,[w])
        add(f'你能读出这句话吗：“{answer}”',answer,1,'完整句跟读',source)
        add(f'我说“{answer}”，请你重复一遍。',answer,1,'完整句复述',source)
        add(f'请用“{w}”说明一个与“{topic}”有关的情况。',answer,2,'主题表达',source)
        add(f'在“{topic}”这个话题里，怎样用到“{w}”？',answer,2,'主题词运用',source)
        add(f'如果需要向我说明“{w}”的情况，你会怎么说？',answer,2,'完整句应答',source)
        add(f'请把“{w}”用在回答里，并把意思说完整。',answer,2,'完整句表达',source)
        greeting=answer if answer.startswith(('你好','您好','老师您好','早上好','下午好','晚上好')) else '你好！'+answer
        thanks=answer if answer.endswith(('谢谢。','谢谢！')) else answer+'谢谢。'
        add(f'请先打招呼，再用“{w}”表达本课的意思。',greeting,3,'问候与表达',source)
        add(f'请用“{w}”说明情况，最后礼貌地表示感谢。',thanks,3,'表达与致谢',source)
        add(f'请先表达“{answer}”的意思，再加一句礼貌的结束语。',thanks,3,'两句表达',source)
        add(f'我希望听到礼貌的回答，请先问候，再说“{answer}”。',greeting,3,'礼貌表达',source)
        add(f'请用平时聊天的方式表达：“{answer}”',answer,2,'口语表达',source)
        add(f'我没有听清，请完整地再说一次：“{answer}”',answer,1,'沟通复述',source)
        add(f'请把这句话里的“{w}”读清楚，并说出整句：“{answer}”',answer,1,'重点词与句子',source)
        add(f'把“{w}”补回这句话，再完整说一遍：“{blank}”',answer,2,'完整句修复',source)
        add(f'我们练习“{topic}”。请清楚地表达：“{answer}”',answer,2,'主题口语',source)
        add(f'请向我表达“{answer}”的意思，然后说“谢谢”。',thanks,3,'礼貌收尾',source)
        if '你' in answer and '你们' not in answer:
            polite=answer.replace('你','您')
            add(f'把“你”改为“您”，这句话怎么说：“{answer}”',polite,3,'礼貌称呼转换',source,keywords_for(polite,words))
        if answer.endswith(('？','?')):
            polite=answer if answer.startswith('请问') else '请问，'+answer
            add(f'请礼貌地问我这个问题：“{answer}”',polite,3,'礼貌提问',source)
    # Explicitly separate situations, so contrasting statements are not presented as one factual story.
    for i,first in enumerate(words):
        for j,second in enumerate(words):
            if i==j:
                continue
            add(f'请依次说出这两个词：“{first}”“{second}”。',first+'，'+second+'。',1,'词组串读',['vocabulary'],[first,second])
            add(f'先读“{first}”，再读“{second}”，你会怎么说？',first+'，'+second+'。',1,'词语顺序练习',['vocabulary'],[first,second])
            add(f'我们轮流说词语，请你把“{first}”和“{second}”连着说一遍。',first+'，'+second+'。',1,'词组接续',['vocabulary'],[first,second])
    for i,first in enumerate(seeds):
        for j,second in enumerate(seeds):
            if i==j:
                continue
            a,b=first['text'],second['text']
            if len(a+b)>180:
                continue
            sources=list(dict.fromkeys(first['source']+second['source']))
            keys=list(dict.fromkeys(keywords_for(a,words)+keywords_for(b,words)))[:6]
            ref=a+b
            add(f'请分别练习两种情况。第一种：“{a}”第二种：“{b}”',ref,3,'两情境表达',sources,keys)
            add(f'我先说“{a}”，再说“{b}”。你能按这个顺序说一遍吗？',ref,2,'两句顺序复述',sources,keys)
            add(f'请分两次表达这两个意思：“{a}”“{b}”，最后向我表示感谢。',ref+'谢谢。',3,'两情境与致谢',sources,keys)
            if first['scene'] and second['scene']:
                add(f'第一种情境：{first["scene"]}第二种情境：{second["scene"]}请分别回答。',ref,3,'两情境应答',sources,keys)
            add(f'我们分两轮练习。先表达“{a}”的意思，再表达“{b}”的意思。',ref,2,'双轮口语练习',sources,keys)
    return pool

def fingerprint(lesson):
    packed=json.dumps(lesson,ensure_ascii=False,separators=(',',':'))
    h=2166136261
    for c in packed:
        h=((h^ord(c))*16777619)&0xffffffff
    return format(h,'x')

def build(entry):
    exercise=entry['exercise'];pool=candidates(exercise)
    if len(pool)<200:
        raise ValueError(f"{entry['id']}: only {len(pool)} distinct curriculum questions")
    levels={level:[q for q in pool if q['level']==level] for level in [1,2,3]}
    selected=[]
    # Round robin across source references instead of exhausting one word's variants first.
    for level,target in [(1,60),(2,80),(3,60)]:
        groups=collections.defaultdict(list)
        for q in levels[level]:groups[tuple(q['sourceQuestionIds'])].append(q)
        chosen=[]
        while groups and len(chosen)<target:
            for key in list(groups):
                chosen.append(groups[key].pop(0))
                if not groups[key]:del groups[key]
                if len(chosen)==target:break
        selected.extend(chosen)
    selected_keys={text_key(q['question']) for q in selected}
    if len(selected)<200:
        for q in pool:
            if text_key(q['question']) not in selected_keys:
                selected.append(q);selected_keys.add(text_key(q['question']))
                if len(selected)==200:break
    selected.sort(key=lambda q:q['level'])
    assert len(selected)==200
    for i,q in enumerate(selected,1):
        q['id']=f"{entry['id']}-dialogue-{i:03d}"
        q['number']=i
        q['pinyin']=py(q['question'])
        q['referencePinyin']=py(q['referenceAnswer'])
    context={'bank':LABELS[entry['bank']],'title':exercise['title'][:200],'description':exercise.get('description','')[:500],'questions':[{'text':str(q.get('text',''))[:300],'explanation':str(q.get('explanation',''))[:200]} for q in exercise['questions'][:30]]}
    return {'version':1,'exerciseId':entry['id'],'title':exercise['title'],'bank':entry['bank'],'sourceHash':fingerprint(context),'origin':'curriculum-derived','count':200,'items':selected}

def main():
    catalog=json.loads((ROOT/'exercise-catalog.json').read_text())['exercises']
    entries=[e for e in catalog if '演示练习' not in e['exercise']['title']]
    OUT.mkdir(exist_ok=True)
    manifest={'version':1,'perExercise':200,'totalExercises':len(entries),'totalDialogues':len(entries)*200,'exercises':[]}
    for entry in entries:
        bank=build(entry);filename=entry['id']+'.json'
        (OUT/filename).write_text(json.dumps(bank,ensure_ascii=False,separators=(',',':'))+'\n')
        manifest['exercises'].append({'id':entry['id'],'bank':LABELS[entry['bank']],'title':entry['exercise']['title'],'sourceHash':bank['sourceHash'],'file':filename,'count':200})
    (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(f"Generated {manifest['totalExercises']} exercise banks, {manifest['totalDialogues']} question-answer pairs")

if __name__=='__main__':main()

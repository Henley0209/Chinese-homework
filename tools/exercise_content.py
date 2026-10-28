"""Shared deterministic pinyin and independent exercise-content builders."""
import json,re,random,unicodedata,collections
from functools import lru_cache
from pathlib import Path
from pypinyin import lazy_pinyin,Style,load_phrases_dict
ROOT=Path(__file__).resolve().parents[1]
# Explicit contextual readings for common polyphones and light tones.
load_phrases_dict({'了解':[['liǎo'],['jiě']], '了解了':[['liǎo'],['jiě'],['le']], '得好':[['de'],['hǎo']], '觉得':[['jué'],['de']], '相处':[['xiāng'],['chǔ']], '处理':[['chǔ'],['lǐ']], '尽管':[['jǐn'],['guǎn']], '便宜':[['pián'],['yi']], '熟悉':[['shú'],['xī']], '结实':[['jiē'],['shi']], '关系':[['guān'],['xi']], '消息':[['xiāo'],['xi']], '时候':[['shí'],['hou']], '事情':[['shì'],['qing']], '地方':[['dì'],['fang']], '主意':[['zhǔ'],['yi']], '衣服':[['yī'],['fu']], '朋友':[['péng'],['you']], '什么':[['shén'],['me']], '东西':[['dōng'],['xi']], '一会儿':[['yí'],['huì'],['r']], '一样':[['yí'],['yàng']], '一份':[['yí'],['fèn']], '一定':[['yí'],['dìng']], '不要':[['bú'],['yào']], '不会':[['bú'],['huì']], '不是':[['bú'],['shì']], '不但':[['bú'],['dàn']], '不再':[['bú'],['zài']]})
@lru_cache(maxsize=50000)
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
@lru_cache(maxsize=10000)
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

# Prefer dictionary-standard neutral syllables; phrase contexts resolve polyphones.
load_phrases_dict({
 '名字':[['míng'],['zi']], '认识':[['rèn'],['shi']],
 '事情':[['shì'],['qing']], '商量':[['shāng'],['liang']],
 '打扰':[['dǎ'],['rǎo']], '扭矩':[['niǔ'],['jǔ']],
 '烙铁':[['lào'],['tie']], '校准':[['jiào'],['zhǔn']],
 '处理':[['chǔ'],['lǐ']], '处置':[['chǔ'],['zhì']],
 '待机':[['dài'],['jī']], '夹具':[['jiā'],['jù']],
 '角色':[['jué'],['sè']], '复盘':[['fù'],['pán']],
 '量具':[['liáng'],['jù']], '抽检':[['chōu'],['jiǎn']],
 '夹伤':[['jiā'],['shāng']], '卡扣':[['kǎ'],['kòu']],
 '一张':[['yì'],['zhāng']], '一份':[['yí'],['fèn']],
 '一遍':[['yí'],['biàn']], '一下':[['yí'],['xià']],
 '一点':[['yì'],['diǎn']], '一会儿':[['yí'],['huì'],['r']],
 '量体温':[['liáng'],['tǐ'],['wēn']], '长得':[['zhǎng'],['de']],
 '看起来':[['kàn'],['qi'],['lai']], '来得':[['lái'],['de']],
 '觉得':[['jué'],['de']], '得出':[['dé'],['chū']],
 '相处':[['xiāng'],['chǔ']], '重复':[['chóng'],['fù']],
})

def choice(base, text, correct, distractors, rnd, explanation, pinyin=None, vietnamese=None):
    opts=list(dict.fromkeys([correct]+list(distractors)))
    assert len(opts)>=4,(text,opts)
    opts=opts[:4];rnd.shuffle(opts)
    q={**base,'text':text,'options':dict(zip('ABCD',opts)),
       'answers':['ABCD'[opts.index(correct)]],'explanation':explanation}
    q['pinyin']=pinyin if pinyin is not None else py(text.split('】')[-1])
    if vietnamese is not None:q['vietnamese']=vietnamese
    q['optionPinyin']={k:py(v) for k,v in q['options'].items()}
    return q

def pronunciation(base, word, rnd):
    pron=py(word)
    q=choice(base,f'【拼音选择】请选择“{word}”的正确读音。',pron,wrong_pinyin(pron),rnd,
        f'“{word}”读作 {pron}。注意声母、韵母、声调及轻声。',
        'Qǐng xuǎn zé “____” de zhèng què dú yīn.',
        'Chọn phiên âm đúng; chú ý âm đầu, vần, thanh điệu và thanh nhẹ.')
    q.pop('optionPinyin',None)
    q['targetWord']=word
    return q

def fill(base, word, sentence, meaning, rnd, others, grammar=''):
    assert sentence.count('____')==1,(word,sentence)
    full=sentence.replace('____',word)
    q=choice(base,'【选词填空】根据句意和提示选择最合适的词语：'+sentence,word,
        others,rnd,f'应填“{word}”。完整句子：{full}'+ ('\n语法与搭配：'+grammar if grammar else ''),
        py(sentence),'Gợi ý: '+meaning+'.')
    q.update(targetWord=word,completeSentence=full,grammarFocus=grammar)
    return q

def sorting(base, chunks, grammar, rnd):
    full=''.join(chunks);shuffled=list(chunks)
    while ''.join(shuffled)==full:rnd.shuffle(shuffled)
    terminal='？' if full.endswith(('吗','呢')) else '。'
    variants=[full+terminal,full,full+('?' if terminal=='？' else '.')]
    # Only commute an explicitly authored subject/time pair, never arbitrary chunks.
    subjects={'我','你','他','她','我们','你们','大家'}
    times={'今天','明天','昨天','周末','周日下午','每天','下次','以后','下午两点','周五晚上'}
    if len(chunks)>2 and ((chunks[0] in subjects and chunks[1] in times) or
                         (chunks[1] in subjects and chunks[0] in times)):
        alt=''.join([chunks[1],chunks[0]]+chunks[2:])
        variants += [alt+terminal,alt,alt+('?' if terminal=='？' else '.')]
    return {**base,'text':'【句子排序】将词块排成完整句子（不增减词语，不用斜线，不在汉字间加空格）：\n'+' / '.join(shuffled),
        'pinyin':' / '.join(py(c) for c in shuffled),'answers':variants,'hanziCount':han(full),
        'vietnamese':'Sắp xếp các cụm từ thành câu hoàn chỉnh. Không thêm bớt từ.',
        'grammarFocus':grammar,'explanation':f'参考句子：{full}{terminal}\n{py(full)}\n语法与搭配：{grammar}'}

GRAMMAR={
 '是':('là; xác định thân phận hoặc sự vật','是＋名词：判断或说明身份',['在','有','去']),
 '在':('ở; chỉ vị trí hoặc nơi diễn ra hành động','在＋地点＋动词/名词',['比','给','从']),
 '有':('có; chỉ sở hữu hoặc tồn tại','有＋名词：拥有或存在',['是','去','比']),
 '没有':('không có hoặc chưa thực hiện','没有＋名词/动词',['很','把','比']),
 '的':('trợ từ chỉ sở hữu hoặc bổ nghĩa cho danh từ','修饰语＋的＋名词',['得','地','吗']),
 '也':('cũng; bổ sung điểm giống nhau','也＋谓语：也有相同情况',['把','的','从']),
 '都':('đều; bao quát toàn bộ chủ thể','复数主语＋都＋谓语',['把','的','从']),
 '吗':('trợ từ đặt câu hỏi có/không','陈述内容＋吗：是非疑问',['的','得','地']),
 '呢':('còn… thì sao; hỏi tiếp chủ đề','名词/代词＋呢：追问相同话题',['的','得','地']),
 '不':('không; phủ định trạng thái hoặc ý muốn','不＋动词/形容词',['把','的','比']),
 '很':('rất; trạng từ mức độ','很＋形容词',['把','的','从']),
 '和':('và; nối hai người hoặc sự vật','名词/代词＋和＋名词/代词',['很','把','吗']),
 '比':('hơn; chỉ đối tượng so sánh','甲＋比＋乙＋形容词',['把','给','从']),
 '给':('cho; chỉ người nhận','给＋人＋物/动词',['比','的','吗']),
 '把':('đưa tân ngữ lên trước động từ để nói cách xử lý','把＋宾语＋动作及结果/位置',['比','从','的']),
 '从':('từ; chỉ điểm xuất phát','从＋起点',['比','的','给']),
 '到':('đến; chỉ mốc kết thúc','到＋终点/时间',['把','的','比']),
 '离':('cách; chỉ khoảng cách','甲＋离＋乙＋远/近/距离',['把','的','给']),
 '用':('dùng; chỉ công cụ hoặc ngôn ngữ','用＋工具/语言＋动词',['比','的','吗']),
 '想':('muốn; chỉ mong muốn','想＋动词',['把','的','比']),
 '会':('biết; có kỹ năng hoặc dự đoán','会＋动词',['把','的','比']),
 '能':('có thể; chỉ năng lực hoặc điều kiện','能＋动词',['把','的','比']),
 '可以':('có thể; xin phép hoặc cho phép','可以＋动词',['把','的','比']),
 '要':('cần/sẽ; chỉ yêu cầu hoặc dự định','要＋动词',['把','的','比']),
 '需要':('cần','需要＋名词/动词短语',['比','的','吗']),
 '正在':('đang; hành động đang diễn ra','正在＋动词',['把','的','比']),
 '已经':('đã; sự việc hoàn tất hoặc đạt trạng thái','已经……了',['把','的','从']),
 '还':('vẫn/còn; chỉ sự tiếp tục hoặc bổ sung','还＋谓语',['把','的','从']),
 '又':('lại; sự việc lặp lại đã xảy ra','又＋动词',['把','的','从']),
 '再':('lại; hành động lặp lại sau đó','再＋动词',['把','的','从']),
 '先':('trước; hành động đầu tiên','先……再……',['把','的','从']),
 '然后':('sau đó','先……然后……',['把','的','比']),
 '就':('thì/liền; kết quả hoặc hành động tiếp theo','条件/时间＋就＋结果',['把','的','从']),
 '就要':('sắp; hành động sắp diễn ra','就要……了',['把','的','从']),
 '只':('chỉ; giới hạn phạm vi hoặc số lượng','只＋谓语',['把','的','从']),
 '以前':('trước khi','动作/时间＋以前',['之间','以内','以外']),
 '以后':('sau khi','动作/时间＋以后',['之间','以内','以外']),
 '一下':('một chút; hành động ngắn','动词＋一下',['一本','一件','一张']),
 '一边':('vừa; hai hành động đồng thời','一边……一边……',['一本','一件','一张']),
 '但是':('nhưng; quan hệ chuyển ý','前一分句＋但是＋转折内容',['把','的','从']),
 '了':('trợ từ chỉ hoàn thành hoặc thay đổi','动词＋了＋数量/宾语',['的','得','地']),
 '您':('ngài/ông/bà; cách xưng hô kính trọng','您：敬称',['它','这','那']),
 '一起':('cùng nhau','一起＋动词',['一本','一件','一张']),
 '怎么':('như thế nào; hỏi cách thức','怎么＋动词',['谁的','多少','几点']),
 '三':('ba; số lượng','数词＋量词＋名词',['他','她','它']),
 '三天':('ba ngày; khoảng thời gian','数量＋时间单位',['三本','三件','三张']),
 '第一次':('lần đầu tiên','第一次＋动词',['第一本','第一件','第一张']),
 '种':('loại; lượng từ chỉ chủng loại','数词/疑问词＋种＋名词',['岁','点','遍']),
 '支':('cây/chiếc; lượng từ cho bút','数词＋支＋笔',['岁','点','遍']),
 '一张':('một; lượng từ cho vật có bề mặt như ghế sô pha','数词＋张＋家具',['一支','一条','一只']),
 '住':('sống, cư trú','住在＋地点',['喝','吃','读']),
 '旅游':('du lịch','来/去＋地点＋旅游',['刷牙','睡觉','下雨']),
 '问':('hỏi','问＋人/问题',['喝','吃','洗']),
 '长':('dài; hỏi thời lượng','多长时间',['高','重','大']),
 '一直':('cứ, liên tục','一直＋动词',['一本','一件','一张']),
 '坐':('đi bằng phương tiện','坐＋交通工具',['吃','喝','写']),
 '往':('về phía','往＋方向/目的地＋动词',['比','的','给']),
 '去':('đi','去＋地点',['吃','喝','写']),
}

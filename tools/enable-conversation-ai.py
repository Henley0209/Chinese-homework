"""Enable the public endpoint only after a real model round trip succeeds."""
import json
import re
import time
from urllib.error import URLError, HTTPError
from pathlib import Path
from urllib.request import Request, urlopen

log = Path('work/conversation-deploy.log').read_text()
urls = re.findall(r'https://[a-zA-Z0-9.-]+\.workers\.dev', log)
if not urls:
    raise RuntimeError('Deployment did not return a workers.dev URL; endpoint was not changed.')
endpoint = urls[-1] + '/conversation'
lesson = json.loads(Path('hsk1-2-30/lesson-01.json').read_text())
context = {'title': lesson['title'], 'bank': 'HSK1-2', 'description': lesson['description'][:500], 'questions': [{'text': q.get('text', '')[:300], 'explanation': q.get('explanation', '')[:200]} for q in lesson['questions'][:30]]}
payload = json.dumps({'lesson': context, 'messages': []}).encode()
request = Request(endpoint, data=payload, headers={'Content-Type': 'application/json', 'Origin': 'https://henley0209.github.io', 'User-Agent': 'ChineseHomework-DeploymentCheck/1.0 (+https://github.com/Henley0209/Chinese-homework)', 'Accept': 'application/json'})
# A newly registered workers.dev hostname can take time to obtain its TLS certificate.
# Retry transport/readiness failures, while keeping normal TLS verification enabled.
for attempt in range(8):
    try:
        with urlopen(request, timeout=45) as response:
            result = json.load(response)
        break
    except HTTPError as error:
        if error.code not in (404, 503) or attempt == 7:
            detail = error.read(2000).decode('utf-8', errors='replace')
            raise RuntimeError(f'AI verification returned HTTP {error.code}: {detail}. Endpoint was not changed.') from error
        print(f'Worker not ready (HTTP {error.code}); waiting before retry {attempt + 2}/8.', flush=True)
    except (URLError, TimeoutError, ConnectionError) as error:
        if attempt == 7:
            raise RuntimeError('Worker HTTPS is still unavailable after retries. Endpoint was not changed.') from error
        print(f'Worker HTTPS not ready; waiting before retry {attempt + 2}/8.', flush=True)
    time.sleep(min(5 * (attempt + 1), 30))
if not isinstance(result.get('next'), str) or not result['next'].strip():
    raise RuntimeError('AI did not provide an opening. Endpoint was not changed.')
if not isinstance(result.get('nextPinyin'), str) or not result['nextPinyin'].strip():
    raise RuntimeError('AI did not provide question pinyin. Endpoint was not changed.')
assessment_payload = {'lesson': context, 'action': 'answer', 'progress': {'questionNumber': 1, 'correctAnswers': 0}, 'keywords': ['好', '不错'], 'expectedAnswer': '我很好，谢谢。', 'nextQuestion': {'question': '你今天忙吗？', 'pinyin': 'Nǐ jīntiān máng ma?', 'keywords': ['忙', '不忙']}, 'messages': [{'role': 'assistant', 'content': '你好！你好吗？'}, {'role': 'user', 'content': '我很好是，谢谢。'}]}
assessment_request = Request(endpoint, data=json.dumps(assessment_payload).encode(), headers={'Content-Type': 'application/json', 'Origin': 'https://henley0209.github.io', 'User-Agent': 'ChineseHomework-DeploymentCheck/1.0'})
with urlopen(assessment_request, timeout=60) as response:
    assessment = json.load(response)
if assessment.get('grammarCorrect') is not True or assessment.get('contentCorrect') is not True or not all(isinstance(assessment.get(key), str) and assessment[key].strip() for key in ('feedbackPinyin', 'answerPinyin', 'nextPinyin')) or assessment.get('correction'):
    raise RuntimeError('Real keyword acceptance and pinyin verification failed for synthetic test sentence: ' + json.dumps(assessment, ensure_ascii=False))
if assessment.get('next') != '你今天忙吗？':
    raise RuntimeError('Fixed next-question verification failed.')
if not isinstance(result.get('nextKeywords'), list):
    raise RuntimeError('AI did not provide the next-question keywords.')
print('Verified real keyword acceptance and pinyin.', flush=True)
# Exercise live follow-ups instead of only supplying a fixed next question.
def verify_topic(value, asked):
    question = value.get('next', '')
    clause = [part for part in re.split(r'[。！？!?；;]', question) if part.strip()]
    normalized = re.sub(r'[^\w]', '', clause[-1] if clause else question)
    normalized = re.sub(r'^(?:你好|您好|谢谢|好的|早上好|下午好|晚上好)+', '', normalized)
    if not normalized or re.search(r'钱|赚|收入|工资|薪水|薪资|价格|消费|多少[元块]', question):
        raise RuntimeError('HSK greeting lesson generated an off-topic question.')
    if normalized in asked or not value.get('nextPinyin'):
        raise RuntimeError('HSK greeting lesson repeated a question or omitted pinyin.')
    asked.add(normalized)
    print('Verified HSK lesson 1 topic question: ' + question, flush=True)
asked = set()
verify_topic(result, asked)
history = []
previous = result
for number in range(1, 3):
    question = previous['next']
    if re.search(r'名字|叫什么|怎么称呼|贵姓', question):
        answer = '我叫小兰，很高兴认识你。'
    elif re.search(r'哪里|哪国|来自', question):
        answer = '我来自越南。'
    elif re.search(r'道歉|对不起|来晚|迟到', question):
        answer = '对不起，我来晚了。'
    elif re.search(r'感谢|谢谢|帮', question):
        answer = '谢谢你的帮助。'
    elif re.search(r'告别|再见|明天见', question):
        answer = '再见，明天见。'
    else:
        answer = '我很好，谢谢。'
    history.extend([{'role': 'assistant', 'content': previous['next']}, {'role': 'user', 'content': answer}])
    live_request = Request(endpoint, data=json.dumps({'lesson': context, 'action': 'answer', 'messages': history, 'keywords': previous.get('nextKeywords', []), 'progress': {'questionNumber': number, 'correctAnswers': 0}}).encode(), headers={'Content-Type': 'application/json', 'Origin': 'https://henley0209.github.io', 'User-Agent': 'ChineseHomework-DeploymentCheck/1.0'})
    with urlopen(live_request, timeout=45) as response:
        previous = json.load(response)
    verify_topic(previous, asked)
print('Verified three real, distinct HSK greeting questions.', flush=True)

# Verify actual cloud audio, so missing device voices will not make the site silent.
speech_request = Request(endpoint.rsplit('/', 1)[0] + '/speech', data=json.dumps({'text': '你好！我们开始中文对话练习。'}).encode(), headers={'Content-Type': 'application/json', 'Origin': 'https://henley0209.github.io', 'User-Agent': 'ChineseHomework-DeploymentCheck/1.0', 'Accept': 'audio/mpeg'})
with urlopen(speech_request, timeout=60) as response:
    sample_audio = response.read()
    if not response.headers.get('Content-Type', '').startswith('audio/') or len(sample_audio) < 100:
        raise RuntimeError('Cloud speech verification failed. Endpoint was not changed.')
print('Verified playable cloud Chinese audio.', flush=True)
transcription_request = Request(endpoint.rsplit('/', 1)[0] + '/transcribe', data=sample_audio, headers={'Content-Type': 'audio/mpeg', 'Origin': 'https://henley0209.github.io', 'User-Agent': 'ChineseHomework-DeploymentCheck/1.0'})
with urlopen(transcription_request, timeout=60) as response:
    transcription = json.load(response)
if not isinstance(transcription.get('text'), str) or not re.search(r'[\u4e00-\u9fff]{2}', transcription['text']):
    raise RuntimeError('Real Chinese audio transcription verification failed. Endpoint was not changed.')
if any(char in transcription['text'] for char in '們開練習漢語師學聲'):
    raise RuntimeError('Transcription was not normalized to simplified Chinese.')
print('Verified real simplified Chinese audio transcription.', flush=True)
Path('conversation-config.json').write_text(json.dumps({'endpoint': endpoint}, indent=2) + '\n')
print('Verified real AI opening; website endpoint is ready for publication.')


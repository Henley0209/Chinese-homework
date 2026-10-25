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
assessment_payload = {'lesson': context, 'action': 'answer', 'progress': {'questionNumber': 1, 'correctAnswers': 0}, 'messages': [{'role': 'assistant', 'content': '你好！你好吗？'}, {'role': 'user', 'content': '我很好是，谢谢。'}]}
assessment_request = Request(endpoint, data=json.dumps(assessment_payload).encode(), headers={'Content-Type': 'application/json', 'Origin': 'https://henley0209.github.io', 'User-Agent': 'ChineseHomework-DeploymentCheck/1.0'})
with urlopen(assessment_request, timeout=60) as response:
    assessment = json.load(response)
if assessment.get('grammarCorrect') is not False or not all(isinstance(assessment.get(key), str) and assessment[key].strip() for key in ('feedbackPinyin', 'correction', 'correctionPinyin', 'answerPinyin', 'nextPinyin')):
    raise RuntimeError('Real correction and pinyin verification failed. Endpoint was not changed.')
print('Verified real grammar correction and pinyin.', flush=True)
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
print('Verified real Chinese audio transcription.', flush=True)
Path('conversation-config.json').write_text(json.dumps({'endpoint': endpoint}, indent=2) + '\n')
print('Verified real AI opening; website endpoint is ready for publication.')

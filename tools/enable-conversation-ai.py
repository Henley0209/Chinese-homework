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
Path('conversation-config.json').write_text(json.dumps({'endpoint': endpoint}, indent=2) + '\n')
print('Verified real AI opening; website endpoint is ready for publication.')

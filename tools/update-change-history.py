"""Append real source commits to the teacher history without recording its own bot commits."""
import json
import subprocess
from pathlib import Path
path = Path('change-history.json')
data = json.loads(path.read_text())
known = {e.get('commit') for e in data['entries'] if e.get('commit')}
lines = subprocess.check_output(['git', 'log', '--reverse', '--format=%H%x00%cI%x00%s', 'HEAD'], text=True).splitlines()
for line in lines:
    sha, timestamp, message = line.split('\0', 2)
    if sha in known or message == 'Update teacher change history':
        continue
    pending = next((e for e in data['entries'] if not e.get('commit') and e.get('commitMessage') == message), None)
    if pending:
        pending['commit'] = sha
        pending['updatedAt'] = timestamp
    else:
        data['entries'].append({'version': f"V{len(data['entries'])+1:04d}", 'updatedAt': timestamp, 'commit': sha, 'changes': [message]})
    known.add(sha)
path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

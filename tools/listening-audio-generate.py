"""Generate fixed Xiaoxiao/Yunxi MP3s. All generated output is verified before publishing."""
import asyncio
import json
import os
from pathlib import Path
import subprocess
import sys
import edge_tts

source = json.loads(Path(sys.argv[1]).read_text())
out = Path('listening/audio')
out.mkdir(parents=True, exist_ok=True)
semaphore = asyncio.Semaphore(3)
completed = 0

def inspect(path):
    if not path.exists() or path.stat().st_size < 1000:
        return None
    result = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', str(path)], capture_output=True, text=True)
    try:
        duration = float(result.stdout.strip())
        return round(duration, 3) if result.returncode == 0 and duration > 0 else None
    except ValueError:
        return None

async def generate(clip):
    global completed
    async with semaphore:
        target = out / clip['file']
        duration = inspect(target)
        if duration is None:
            for attempt in range(4):
                temp = target.with_suffix('.tmp.mp3')
                try:
                    await asyncio.wait_for(edge_tts.Communicate(clip['text'], clip['voice'], rate='+0%', pitch='+0Hz').save(str(temp)), timeout=60)
                    duration = inspect(temp)
                    if duration is None:
                        raise RuntimeError('Generated MP3 failed audio validation')
                    os.replace(temp, target)
                    break
                except Exception:
                    temp.unlink(missing_ok=True)
                    if attempt == 3:
                        raise
                    await asyncio.sleep(2 ** (attempt + 1))
        completed += 1
        if completed % 10 == 0 or completed == len(source['clips']):
            print(f"Verified audio {completed}/{len(source['clips'])}", flush=True)
        return clip['key'], {'file': clip['file'], 'duration': duration, 'voice': clip['voice']}

async def main():
    # Fail early if either named voice is unavailable.
    probes = [next(c for c in source['clips'] if c['voice'] == v) for v in (source['voices']['female'], source['voices']['male'])]
    for clip in probes:
        await generate(clip)
    remaining = [c for c in source['clips'] if c not in probes]
    results = await asyncio.gather(*(generate(c) for c in remaining))
    results += [(c['key'], {'file': c['file'], 'duration': inspect(out / c['file']), 'voice': c['voice']}) for c in probes]
    manifest = {'version': 1, 'voices': source['voices'], 'clips': dict(results)}
    assert len(manifest['clips']) == len(source['clips'])
    assert all(c['duration'] for c in manifest['clips'].values())
    (out / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(f"Ready: {len(results)} validated fixed-voice MP3s", flush=True)

asyncio.run(main())

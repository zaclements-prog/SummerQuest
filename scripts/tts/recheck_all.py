#!/usr/bin/env python3
"""Re-measure shipped clips with canonical numeric normalization (textnorm):
separates genuine truncations from number-words vs digits measurement artifacts.
Run with a python that has openai-whisper, e.g.
  ~/Projects/contentgen/qwen3-tts/.venv/bin/python3 scripts/tts/recheck_all.py
(plain `npm run tts:audit` needs whisper on the default python3)."""
import json, sys
from pathlib import Path
import whisper
sys.path.insert(0, str(Path(__file__).resolve().parent))
from textnorm import recovery

ROOT = Path('/Users/clembot/Projects/sq-narration')
narr = json.loads((ROOT / 'src/tutoring/narration.json').read_text())
texts = {f"{lid}/{s['stepId']}": s['text'] for lid, steps in narr.items() for s in steps}
man = json.loads((ROOT / 'public/tts/manifest.json').read_text())

keys = sys.argv[1:] if len(sys.argv) > 1 else sorted(man.keys())
model = whisper.load_model('small.en')
bad = []
print(f"{'clip':28s} {'dur':>6s} {'wpm':>5s} {'recov':>6s}")
for key in keys:
    mp3 = ROOT / 'public/tts' / f"{key}.mp3"
    if not mp3.exists():
        print(f"{key:28s} MISSING")
        bad.append(key)
        continue
    info = model.transcribe(str(mp3), word_timestamps=True)
    words = [w for seg in info['segments'] for w in seg['words']]
    heard = " ".join(w['word'].strip() for w in words)
    rec = recovery(texts[key], heard)
    span = (words[-1]['end'] - words[0]['start']) if words else 0
    wpm = len(heard.split()) / (span / 60.0) if span >= 3.0 else 120
    flag = '' if (rec >= 0.94 and wpm <= 210) else '  <== BAD'
    print(f"{key:28s} {man.get(key,{}).get('duration',0):6.1f} {wpm:5.0f} {rec:6.2f}{flag}")
    if flag:
        bad.append(key)
print(f"\nchecked {len(keys)}, genuinely bad: {len(bad)}")
if bad:
    print(",".join(bad))

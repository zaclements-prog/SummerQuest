#!/bin/bash
# Fresh draws for clips still missing after campaign.sh (each run re-rolls every take).
cd ~/Projects/sq-narration2
PY=~/Projects/contentgen/higgs-mlx/.venv/bin/python3
REF=~/Projects/contentgen/qwen3-tts/refs/sq_teacher_v2.wav
missing() { python3 -c "
import json
c=json.load(open('src/voice/voiceLines.json'))['clips']; m=json.load(open('public/voice/manifest.json'))
print(','.join(k for k,v in c.items() if m.get(k,{}).get('hash')!=v['hash']))"; }
for round in 1 2 3 4; do
  keys=$(missing); [ -z "$keys" ] && break
  echo "=== round $round: $(echo $keys | tr , '\n' | wc -l) missing ===" >> retry.log
  $PY scripts/tts/render_local.py --set voice --engine higgs --ref-audio $REF --only "$keys" >> retry.log 2>&1
done
echo "=== left: $(missing) ===" >> retry.log

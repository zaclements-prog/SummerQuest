#!/bin/bash
# SummerQuest narration campaign — sequential, resumable (hash-skip).
# Voice: approved teacher clone sq_teacher_v2 on Higgs v2 ONLY.
# One renderer process at a time: each run rewrites the whole voice manifest
# from its own in-memory copy, so two at once would drop each other's entries.
cd ~/Projects/sq-narration2
PY=~/Projects/contentgen/higgs-mlx/.venv/bin/python3
REF=~/Projects/contentgen/qwen3-tts/refs/sq_teacher_v2.wav
LOG=campaign.log

if pgrep -f "scripts/tts/render_local.py" >/dev/null; then
  echo "another render_local.py is running; refusing to start" >&2
  exit 1
fi

run() {  # run <label> <render_local args...>; logs the renderer's real exit code
  local label=$1; shift
  echo "=== $(date) $label ===" >> $LOG
  $PY scripts/tts/render_local.py --engine higgs --ref-audio $REF "$@" >> $LOG 2>&1
  local rc=$?
  echo "=== $(date) $label exit=$rc ===" >> $LOG
}

# Lessons first (198 steps; all fresh as of 2026-10-22, so this is a no-op check)
run lessons

# Pilot packs so the app is walkable early, then every pack in the catalog,
# smallest first (the pack ids come from voiceLines.json, never a hand list)
PILOT="ui listen slots k-nav"
for pack in $PILOT; do run "pack $pack" --set voice --only $pack; done
for pack in $($PY -c "
import json, collections
c = collections.Counter(k.split('/')[0] for k in json.load(open('src/voice/voiceLines.json'))['clips'])
print(' '.join(p for p, _ in sorted(c.items(), key=lambda kv: kv[1])))"); do
  case " $PILOT " in *" $pack "*) continue;; esac
  run "pack $pack" --set voice --only $pack
done

# Sweep: every clip still missing or stale (gate rejects get fresh draws)
run "sweep voice" --set voice
echo "=== $(date) CAMPAIGN DONE ===" >> $LOG
grep -c '^FAILED' $LOG
tail -2 $LOG

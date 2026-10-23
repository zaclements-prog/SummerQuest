#!/bin/bash
# Clips the 2026-10-22 independent audit (audit_audio.py, Whisper large-v3-turbo)
# flagged as likely real defects. Run AFTER campaign.sh finishes (one renderer at
# a time), then re-audit them: python3 scripts/tts/audit_audio.py --only <same list>
cd ~/Projects/sq-narration2
PY=~/Projects/contentgen/higgs-mlx/.venv/bin/python3
REF=~/Projects/contentgen/qwen3-tts/refs/sq_teacher_v2.wav
$PY scripts/tts/render_local.py --engine higgs --ref-audio $REF --force --only g1Science/families
$PY scripts/tts/render_local.py --set voice --engine higgs --ref-audio $REF --force --only \
k-sounds/parts-frog,k-rhymes/word/word=key,k-letters/starts_house,k-nav/name-reading-reef,k-compare/ask-more-bees,k-lessons/kStoryMath-away

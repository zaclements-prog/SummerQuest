#!/bin/bash
# SummerQuest narration campaign — sequential, resumable (hash-skip).
# Voice: approved teacher clone sq_teacher_v2 on Higgs v2 ONLY.
cd ~/Projects/sq-narration2
PY=~/Projects/contentgen/higgs-mlx/.venv/bin/python3
REF=~/Projects/contentgen/qwen3-tts/refs/sq_teacher_v2.wav
LOG=campaign.log

# Pilot packs first so the app is walkable early (ui,listen,k-nav,slots = 320)
echo "=== $(date) packs: pilot ui listen k-nav slots ===" >> $LOG
$PY scripts/tts/render_local.py --set voice --engine higgs --ref-audio $REF --only ui,listen,k-nav,slots >> $LOG 2>&1
echo "=== $(date) pilot packs exit=$? ===" >> $LOG

# All remaining lesson steps (K 52, G1 45, g5 remainder 11)
echo "=== $(date) lessons ===" >> $LOG
$PY scripts/tts/render_local.py --engine higgs --ref-audio $REF --only \
kCounting,kAddTake,kCompare,kShapes,kSorting,kMeasure,kTracing,kTowers,kScience,kStoryMath,kLetters,kRhymes,kTeens,\
g1Adding,g1Subtract,g1Tens,g1Shapes,g1Graphs,g1Reading,g1Writing,g1Science,g1Shares,g1StoryMath,g1Measure,\
g5Decimals,g5Volume,g5Coordinates,g5LinePlots,g5Multiplication,g5Division,g5Expressions >> $LOG 2>&1
echo "=== $(date) lessons exit=$? ===" >> $LOG

# Remaining voice packs, biggest-first
for pack in k-compare k-woods k-math g1-phonics parade g1-parade k-sounds k-letters g1-graphs k-nav-again k-addtake g1-measure g1-science k-science k-rhymes k-trace k-teens k-towers g1-shapes g1-shares k-stories k-lessons k-measure k-shapes g1-story-math g1-words k-words; do
  case $pack in k-nav-again) continue;; esac
  echo "=== $(date) pack $pack ===" >> $LOG
  $PY scripts/tts/render_local.py --set voice --engine higgs --ref-audio $REF --only $pack >> $LOG 2>&1
  echo "=== $(date) pack $pack exit=$? ===" >> $LOG
done

# g1-facts / g1-tens / g1-woods / g1-towers last (largest templates)
for pack in g1-facts g1-tens g1-woods g1-towers; do
  echo "=== $(date) pack $pack ===" >> $LOG
  $PY scripts/tts/render_local.py --set voice --engine higgs --ref-audio $REF --only $pack >> $LOG 2>&1
  echo "=== $(date) pack $pack exit=$? ===" >> $LOG
done
echo "=== $(date) CAMPAIGN DONE ===" >> $LOG
tail -2 $LOG

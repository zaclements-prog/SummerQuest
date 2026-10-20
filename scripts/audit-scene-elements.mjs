#!/usr/bin/env node
/**
 * SVG element census for lesson motion scenes (B2.4 budget check).
 *
 *   node --import tsx scripts/audit-scene-elements.mjs wordProblem/plan [lesson/step ...] [--budget 150]
 *
 * Renders each scene with its REAL narration timings (public/tts/<lesson>/<step>.words.json,
 * falling back to proportional cues) at a dense range of t, counts the SVG paint
 * elements actually in the DOM per frame (rect/circle/ellipse/line/path/polygon/
 * polyline/text; tspans are children of their text and repaint with it, not counted),
 * and reports the peak. Budget: ~150 steady-state (warn), 250 transition peak (fail).
 * Exit 1 if any scene exceeds its budget.
 */
import { readFileSync, existsSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { allLessons } from '../src/tutoring/lessons/index.ts'
import { sceneFor } from '../src/tutoring/motion/scenes/index.ts'
import { phraseIndex, alignWords, timeAtChar } from '../src/tutoring/motion/cues.ts'

const args = process.argv.slice(2)
const budgetIdx = args.indexOf('--budget')
const STEADY = budgetIdx >= 0 ? Number(args[budgetIdx + 1]) : 150
const PEAK = STEADY + 100
const targets = args.filter((a, i) => a.includes('/') && !(budgetIdx >= 0 && i === budgetIdx + 1))
if (targets.length === 0) {
  console.error('usage: audit-scene-elements.mjs <lesson/step> [...] [--budget 150]')
  process.exit(2)
}

const SHAPE_RE = /<(rect|circle|ellipse|line|path|polygon|polyline|text)\b/g
const countShapes = (markup) => (markup.match(SHAPE_RE) || []).length

let fail = false
for (const target of targets) {
  const [lessonId, stepId] = target.split('/')
  const lesson = allLessons.find((l) => l.id === lessonId)
  const step = lesson?.steps.find((s) => s.id === stepId)
  const Scene = sceneFor(lessonId, stepId)
  if (!step || !Scene) {
    console.error(`${target}: no such lesson step or scene`)
    process.exit(2)
  }
  const wordsPath = `public/tts/${lessonId}/${stepId}.words.json`
  let aligned = null
  let dur = 12
  if (existsSync(wordsPath)) {
    const { words } = JSON.parse(readFileSync(wordsPath, 'utf8'))
    aligned = alignWords(step.narration, words)
    dur = words[words.length - 1]?.e ?? dur
  }
  const cue = (phrase, nth = 0) => timeAtChar(phraseIndex(step.narration, phrase, nth), step.narration.length, dur, aligned)
  let peak = 0
  let peakAt = 0
  let filters = 0
  for (let t = 0; t <= dur + 3; t += 0.05) {
    const markup = renderToStaticMarkup(createElement('svg', null, createElement(Scene, { t, dur, reduced: false, cue })))
    const n = countShapes(markup)
    if (n > peak) {
      peak = n
      peakAt = +t.toFixed(2)
    }
    if (markup.includes('filter="url(#sq-')) filters++
  }
  const status = peak > PEAK ? 'FAIL' : peak > STEADY ? 'OVER-BUDGET' : 'ok'
  if (peak > STEADY) fail = true
  console.log(`${target}: peak ${peak} @ t=${peakAt}s (budget ${STEADY}, transition max ${PEAK}) [${status}]${filters ? ` — ${filters} sampled frames contain filter refs` : ''}`)
}
process.exit(fail ? 1 : 0)

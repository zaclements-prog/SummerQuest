#!/usr/bin/env node
// A28: audit for the geometry bank at level 4, as served. The L4 pool spans
// two sources: the level-4 section of src/lib/providers/geometry.ts QUESTIONS
// plus L4_ENRICH_GEOMETRY in src/lib/providers/content/l4Enrich.ts (spread at
// the head of QUESTIONS). Checks: answer is an exact member of options, unique
// options, text cleanliness, answer-length bias on the WHOLE served L4 bank
// (answerBias.test.ts semantics), variety windows (any window of 10 items: no
// name/setting word >2x).

import { readFileSync } from 'node:fs'

const geoSrc = readFileSync(new URL('../src/lib/providers/geometry.ts', import.meta.url), 'utf8')
const enrSrc = readFileSync(new URL('../src/lib/providers/content/l4Enrich.ts', import.meta.url), 'utf8')

const start = geoSrc.indexOf('// ---- Level 4: lines and angles')
const end = geoSrc.indexOf('export function makeGeometryProvider')
if (start < 0 || end < 0) { console.log('FAIL: level 4 section not found'); process.exit(1) }
const enrStart = enrSrc.indexOf('export const L4_ENRICH_GEOMETRY')
const enrEnd = enrSrc.indexOf('export const L4_ENRICH_DATAGRAPH')
if (enrStart < 0 || enrEnd < 0) { console.log('FAIL: L4_ENRICH_GEOMETRY not found'); process.exit(1) }

// Serve order per QUESTIONS: L4_ENRICH items first, then the provider section.
const sources = [
  enrSrc.slice(enrStart, enrEnd),
  geoSrc.slice(start, end),
]

const ITEM_RE = /\{\s*level: 4,\s*question: (['"])((?:\\.|(?!\1).)*)\1,\s*answer: (['"])((?:\\.|(?!\3).)*)\3,\s*options: \[([^\]]*)\]/gs
const errors = []
const items = []
for (const section of sources) {
  for (const m of section.matchAll(ITEM_RE)) {
    const question = m[2]
    const answer = m[4]
    const options = [...m[5].matchAll(/'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"|(.\u00B0)|(\d+)/g)]
      .map((o) => o[1] ?? o[2] ?? o[3] ?? o[4])
    items.push({ question, answer, options })
  }
}

const len = (s) => s.trim().length
for (const it of items) {
  if (!it.options.includes(it.answer)) errors.push(`answer not member: ${it.question} => ${it.answer}`)
  const norm = it.options.map((o) => o.trim().toLowerCase())
  if (new Set(norm).size !== it.options.length) errors.push(`dup options: ${it.question}`)
  if (it.options.length < 2) errors.push(`<2 options: ${it.question}`)
  if (/ {2,}| \.| \?|undefined/.test(`${it.question} ${it.answer}`)) errors.push(`dirty: ${it.question}`)
}

// duplicate questions across the L4 bank
const qNorm = items.map((i) => i.question.trim().toLowerCase())
if (new Set(qNorm).size !== qNorm.length) errors.push('duplicate question text in L4 bank')

const longest = items.filter((i) => i.options.filter((o) => len(o) >= len(i.answer)).length === 1)
const shortest = items.filter((i) => i.options.filter((o) => len(o) <= len(i.answer)).length === 1)
if (longest.length / items.length > 0.3) errors.push(`longest bias: ${longest.length}/${items.length}`)
if (shortest.length / items.length > 0.35) errors.push(`shortest bias: ${shortest.length}/${items.length}`)

// variety: names + settings watch-list over question text, window of 10
const WATCH = new Set(['maya', 'sam', 'ana', 'diego', 'aisha', 'kenji', 'priya', 'owen', 'lily',
  'theo', 'ellie', 'omar', 'ito', 'rosa', 'jack', 'zoe', 'nadia', 'ben', 'pip', 'elena', 'marco',
  'ravi', 'june', 'cole', 'ivy', 'amir', 'nina', 'wren', 'felix', 'hana', 'jude', 'lucy', 'bo',
  'kai', 'mia', 'noah', 'ava', 'abe', 'kim', 'leo', 'mo', 'ada', 'liam', 'zara', 'gus', 'tess',
  'ocean', 'beach', 'park', 'farm', 'garden', 'city', 'forest', 'school', 'classroom', 'home',
  'kitchen', 'pantry', 'playground', 'meadow', 'pond', 'trail', 'field', 'town', 'yard', 'porch',
  'apple', 'sand', 'sidewalk', 'pool', 'pot', 'soup', 'lid', 'window', 'mirror', 'bottle',
  'table', 'die', 'dice', 'honeycomb', 'stop', 'sign', 'sail', 'boat', 'tent', 'quilt',
  'baseball', 'basketball', 'pizza', 'pancake', 'pie', 'orange', 'watermelon',
  'road', 'book', 'clock', 'wall', 'floor', 'desk', 'door', 'sun', 'star', 'moon'])
for (let i = 0; i + 10 <= items.length; i++) {
  const bag = {}
  for (const it of items.slice(i, i + 10)) {
    const seen = new Set((it.question.toLowerCase().match(/[a-z']+/g) ?? []))
    for (const w of seen) if (WATCH.has(w)) bag[w] = (bag[w] ?? 0) + 1
  }
  for (const [w, n] of Object.entries(bag)) if (n > 2) errors.push(`variety @${i}: "${w}" x${n}`)
}

console.log(`geometry L4 items: ${items.length}`)
console.log(`bias: longest ${longest.length} (${(100 * longest.length / items.length).toFixed(1)}%), shortest ${shortest.length} (${(100 * shortest.length / items.length).toFixed(1)}%)`)
if (errors.length) { console.log('FAIL:'); for (const e of errors) console.log('  - ' + e); process.exit(1) }
console.log('OK: answer-membership, cleanliness, bias limits, variety windows clean')

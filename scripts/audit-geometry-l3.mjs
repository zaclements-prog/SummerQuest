#!/usr/bin/env node
// A26: audit for the geometry bank at level 3 (src/lib/providers/geometry.ts
// QUESTIONS, level 3 items authored in the provider file itself).
// Checks: answer is an exact member of options, unique options, text cleanliness,
// answer-length bias on the WHOLE L3 bank as served (matches answerBias.test.ts
// semantics against geometry.ts QUESTIONS level 3), variety windows (any window
// of 10 items: no name/setting word >2x).

import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../src/lib/providers/geometry.ts', import.meta.url), 'utf8')
const start = src.indexOf('// ---- Level 3: 2D shapes')
const end = src.indexOf('// ---- Level 4: lines and angles')
if (start < 0 || end < 0) { console.log('FAIL: level sections not found'); process.exit(1) }
const section = src.slice(start, end)

// Multi-line object items: level: 3, question: '…', answer: '…', options: […]
const ITEM_RE = /\{\s*level: 3,\s*question: (['"])((?:\\.|(?!\1).)*)\1,\s*answer: (['"])((?:\\.|(?!\3).)*)\3,\s*options: \[([^\]]*)\]/gs
const errors = []
const items = []
for (const m of section.matchAll(ITEM_RE)) {
  const question = m[2]
  const answer = m[4]
  const options = [...m[5].matchAll(/'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"|(\d+)/g)]
    .map((o) => o[1] ?? o[2] ?? o[3])
  items.push({ question, answer, options })
}

const len = (s) => s.trim().length
for (const it of items) {
  if (!it.options.includes(it.answer)) errors.push(`answer not member: ${it.question} => ${it.answer}`)
  const norm = it.options.map((o) => o.trim().toLowerCase())
  if (new Set(norm).size !== it.options.length) errors.push(`dup options: ${it.question}`)
  if (it.options.length < 2) errors.push(`<2 options: ${it.question}`)
  if (/ {2,}| \.| \?|undefined/.test(`${it.question} ${it.answer}`)) errors.push(`dirty: ${it.question}`)
}

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
  'baseball', 'basketball', 'pizza', 'pancake', 'pie', 'orange', 'watermelon'])
for (let i = 0; i + 10 <= items.length; i++) {
  const bag = {}
  for (const it of items.slice(i, i + 10)) {
    const seen = new Set((it.question.toLowerCase().match(/[a-z']+/g) ?? []))
    for (const w of seen) if (WATCH.has(w)) bag[w] = (bag[w] ?? 0) + 1
  }
  for (const [w, n] of Object.entries(bag)) if (n > 2) errors.push(`variety @${i}: "${w}" x${n}`)
}

console.log(`geometry L3 items: ${items.length}`)
console.log(`bias: longest ${longest.length} (${(100 * longest.length / items.length).toFixed(1)}%), shortest ${shortest.length} (${(100 * shortest.length / items.length).toFixed(1)}%)`)
if (errors.length) { console.log('FAIL:'); for (const e of errors) console.log('  - ' + e); process.exit(1) }
console.log('OK: answer-membership, cleanliness, bias limits, variety windows clean')

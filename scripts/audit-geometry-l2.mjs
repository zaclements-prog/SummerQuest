#!/usr/bin/env node
// A24: audit for the geometry bank at level 2 (content/grade2.ts G2_GEOMETRY).
// Checks: answer is an exact member of options, unique options, text cleanliness,
// answer-length bias on the WHOLE L2 bank as served (matches answerBias.test.ts
// semantics against geometry.ts QUESTIONS level 2), variety windows (any window
// of 10 items: no name/setting word >2x).

import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../src/lib/providers/content/grade2.ts', import.meta.url), 'utf8')
const section = src.slice(src.indexOf('G2_GEOMETRY: GeoItem[]'), src.indexOf('// ---- Data & graphs'))

const ITEM_RE = /\{ level: 2, question: '(.*?)'(?:, answer: '(.*?)'|, answer: "(.*?)")?,?/g
// simpler: capture per-line items with quoted strings, allow escaped or double-quoted answers
const lines = section.split('\n').filter((l) => l.trim().startsWith("{ level: 2, question:"))
const errors = []
const items = []
for (const line of lines) {
  const q = line.match(/question: '(.*?)',|question: "(.*?)",/)
  const a = line.match(/answer: '(.*?)',|answer: "(.*?)",/)
  const optMatch = line.match(/options: \[(.*?)\]/)
  if (!q || !a || !optMatch) { errors.push(`unparsed line: ${line.slice(0, 80)}`); continue }
  const question = q[1] ?? q[2]
  const answer = a[1] ?? a[2]
  const options = [...optMatch[1].matchAll(/'(.*?)'|"(.*?)"|(\d+)/g)].map((m) => m[1] ?? m[2] ?? m[3])
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
  'apple', 'sand', 'sidewalk', 'pool', 'pot', 'soup', 'lid', 'window', 'mirror', 'bottle', 'pizza',
  'table', 'die', 'dice', 'pancake', 'pie', 'orange', 'watermelon', 'sandwich', 'storybook',
  'clock', 'box', 'story', 'pizza', 'honeycomb', 'stop', 'sign', 'sail', 'boat', 'tent', 'quilt'])
for (let i = 0; i + 10 <= items.length; i++) {
  const bag = {}
  for (const it of items.slice(i, i + 10)) {
    const seen = new Set((it.question.toLowerCase().match(/[a-z']+/g) ?? []))
    for (const w of seen) if (WATCH.has(w)) bag[w] = (bag[w] ?? 0) + 1
  }
  for (const [w, n] of Object.entries(bag)) if (n > 2) errors.push(`variety @${i}: "${w}" x${n}`)
}

console.log(`geometry L2 items: ${items.length}`)
console.log(`bias: longest ${longest.length} (${(100 * longest.length / items.length).toFixed(1)}%), shortest ${shortest.length} (${(100 * shortest.length / items.length).toFixed(1)}%)`)
if (errors.length) { console.log('FAIL:'); for (const e of errors) console.log('  - ' + e); process.exit(1) }
console.log('OK: answer-membership, cleanliness, bias limits, variety windows clean')

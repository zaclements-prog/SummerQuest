#!/usr/bin/env node
// A22: audit for the Cloud Keeper situation bank (scienceCycle.ts CYCLE_SITUATIONS).
// Checks: unique prompts, no answer-word leaks, caption bounds + leak-free,
// asks-something shape, balance, text cleanliness, variety windows (any window
// of 10 situations: no name/setting word >2x).

import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../src/lib/providers/scienceCycle.ts', import.meta.url), 'utf8')
const PROCESSES = ['evaporation', 'condensation', 'precipitation']

const rows = [...src.matchAll(/\{ prompt: '(.*?)', answer: '(.*?)', short: '(.*?)' \}/g)]
  .map((m) => ({ prompt: m[1], answer: m[2], short: m[3] }))

const errors = []
const prompts = new Set()
for (const r of rows) {
  if (prompts.has(r.prompt)) errors.push(`duplicate prompt: ${r.prompt}`)
  prompts.add(r.prompt)
  const low = r.prompt.toLowerCase()
  if (!PROCESSES.includes(r.answer)) errors.push(`bad answer: ${r.answer}`)
  if (low.includes(r.answer)) errors.push(`answer leak in prompt: ${r.prompt}`)
  if (!/\?$|___\.$/.test(r.prompt)) errors.push(`doesn't ask: ${r.prompt}`)
  if (r.prompt.length <= 40) errors.push(`too short: ${r.prompt}`)
  if (/ {2,}| \.| \?|undefined/.test(r.prompt)) errors.push(`dirty text: ${r.prompt}`)
  if (r.short.length <= 5 || r.short.length > 28) errors.push(`caption bounds: ${r.short}`)
  for (const p of PROCESSES) if (r.short.toLowerCase().includes(p)) errors.push(`caption leak: ${r.short}`)
}

const counts = {}
for (const r of rows) counts[r.answer] = (counts[r.answer] ?? 0) + 1
for (const p of PROCESSES) if ((counts[p] ?? 0) < 5) errors.push(`unbalanced: ${p} = ${counts[p] ?? 0}`)

// variety: names + settings across prompts (deduped within a situation, since
// the bank's process nouns — vapor, droplets, cloud — recur by design), window of 10
const NAMES = ['ana', 'pablo', 'grandpa', 'maya', 'sam', 'diego', 'aisha', 'kenji', 'priya', 'owen',
  'lily', 'theo', 'ellie', 'omar', 'ito', 'rosa', 'jack', 'zoe', 'nadia', 'ben', 'pip', 'elena',
  'marco', 'ravi', 'june', 'cole', 'ivy', 'amir', 'nina', 'wren', 'felix', 'hana', 'jude', 'lucy',
  'mira', 'gabe', 'kai', 'mia', 'noah', 'ava']
const SETTINGS = ['ocean', 'beach', 'sand', 'sidewalk', 'puddle', 'pool', 'laundry', 'shirts',
  'bathroom', 'mirror', 'shower', 'window', 'pot', 'soup', 'lid', 'meadow', 'tent', 'barrel',
  'porch', 'yard', 'mountain', 'mountaintops', 'pond', 'grass', 'glass', 'river', 'lake', 'clothes',
  'park', 'farm', 'garden', 'city', 'forest', 'field', 'playground', 'classroom', 'school', 'home',
  'stream', 'creek', 'fog', 'dew', 'breath', 'morning', 'afternoon', 'camping', 'town', 'trail']
const WATCH = new Set([...NAMES, ...SETTINGS])
function words(s) {
  const set = new Set((s.toLowerCase().match(/[a-z']+/g) ?? []))
  return [...set].filter((w) => WATCH.has(w))
}
for (let i = 0; i + 10 <= rows.length; i++) {
  const bag = {}
  for (const r of rows.slice(i, i + 10)) for (const w of words(`${r.prompt} ${r.short}`)) bag[w] = (bag[w] ?? 0) + 1
  for (const [w, n] of Object.entries(bag)) if (n > 2) errors.push(`variety @${i}: "${w}" x${n}`)
}

console.log(`situations: ${rows.length}, per-process: ${JSON.stringify(counts)}`)
if (errors.length) { console.log('FAIL:'); for (const e of errors) console.log('  - ' + e); process.exit(1) }
console.log('OK: leak-free, balanced, asks-something, variety windows clean')

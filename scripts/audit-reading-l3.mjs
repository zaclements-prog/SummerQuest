// Bias + variety audit for the readingComprehension L3/L4 shelf (handoff A3):
// - answerBias: correct answer strictly longest <=30%, strictly shortest <=35% per level
// - variety: no common name/setting word more than twice in any window of 10 passages
// Run: node scripts/audit-reading-l3.mjs [level]   (default 3)
import { readFileSync } from 'node:fs'

const level = Number(process.argv[2] ?? 3)
const src = readFileSync('src/lib/providers/readingComprehension.ts', 'utf8')

const SETTINGS = ['beach', 'park', 'school', 'home', 'farm', 'city', 'ocean', 'space', 'garden', 'backyard',
  'pond', 'lake', 'mountain', 'forest', 'snow', 'rain', 'library', 'museum', 'camping', 'town',
  'playground', 'classroom', 'attic', 'stream', 'yard', 'hill', 'porch', 'desert', 'sky', 'winter',
  'summer', 'spring', 'night', 'sun', 'wind', 'flowers', 'garden', 'window box', 'seeds']
const NAMES = ['Mia', 'Sam', 'Maya', 'Leo', 'Priya', 'Ben', 'Theo', 'Ellie', 'Nadia', 'Ana', 'Pip',
  'Diego', 'Aisha', 'Kenji', 'Owen', 'Lily', 'Zach', 'Ito', 'Delgado', 'Rosa', 'Ellis', 'Omar', 'Jack']

// split into passage blocks at top-level "title:" entries
const blocks = []
const starts = [...src.matchAll(/^ {2}\{$/gm)].map((m) => m.index)
for (let i = 0; i < starts.length; i++) {
  const end = i + 1 < starts.length ? starts[i + 1] : src.indexOf('\n]\nexport function', starts[i])
  blocks.push(src.slice(starts[i], end))
}
const pick = (block, name) => {
  const m = block.match(new RegExp(`${name}: (?:'((?:[^'\\\\]|\\\\.)*)'|"((?:[^"\\\\]|\\\\.)*)"|\`([\\\\s\\\\S]*?)\`|([0-9]+))`))
  return m ? (m[1] ?? m[2] ?? m[3] ?? m[4]) : undefined
}

const passages = []
for (const b of blocks) {
  const lvl = Number(pick(b, 'level'))
  if (lvl !== level) continue
  const title = pick(b, 'title')
  const text = pick(b, 'text') ?? ''
  const S = `'(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*"`
  const unq = (s) => s.replace(/^["']|["']$/g, '')
  const qs = [...b.matchAll(new RegExp(`question: (${S}),[\\s\\S]*?answer: (${S}),[\\s\\S]*?options: \\[([\\s\\S]*?)\\],\\s*\\n\\s*type: '([a-z-]+)'`, 'g'))]
  passages.push({
    title,
    text,
    qs: qs.map((m) => ({
      q: unq(m[1]),
      a: unq(m[2]),
      o: [...m[3].matchAll(new RegExp(S, 'g'))].map((x) => unq(x[0])),
      type: m[4],
    })),
  })
}

const items = passages.flatMap((p) => p.qs.map((q) => ({ label: `${p.title} :: ${q.q}`, a: q.a, o: q.o, type: q.type })))
const len = (s) => s.trim().length
let longest = 0
let shortest = 0
const flags = []
for (const it of items) {
  const a = len(it.a)
  const isL = it.o.filter((o) => len(o) >= a).length === 1
  const isS = it.o.filter((o) => len(o) <= a).length === 1
  if (isL) longest++
  if (isS) shortest++
  flags.push(`${isL ? 'L' : '-'}${isS ? 'S' : '-'} ${it.type.padEnd(10)} ${String(a).padStart(3)}  ${it.label.slice(0, 40)} -> ${it.a}`)
}

let fail = false
console.log(`L${level}: ${passages.length} passages, ${items.length} q-items | longest ${longest} (${(longest / items.length * 100).toFixed(1)}% <=30%) | shortest ${shortest} (${(shortest / items.length * 100).toFixed(1)}% <=35%)`)
for (const f of flags) console.log(' ', f)
if (longest / items.length > 0.3) { console.error('FAIL: longest share >30%'); fail = true }
if (shortest / items.length > 0.35) { console.error('FAIL: shortest share >35%'); fail = true }

// word-bag variety windows over passage text (word-boundary matches).
// A passage "uses" a word if it contains it; no word may be used by more than
// two passages inside any window of 10 (handoff A3 variety rule).
const texts = passages.map((p) => `${p.title} ${p.text}`.toLowerCase())
const words = [...SETTINGS.map((s) => s.toLowerCase()), ...NAMES.map((n) => n.toLowerCase())]
const violations = []
for (let i = 0; i + 10 <= texts.length; i++) {
  const win = texts.slice(i, i + 10)
  for (const w of words) {
    const count = win.filter((t) => new RegExp(`\\b${w}\\b`).test(t)).length
    if (count > 2) violations.push({ window: i, word: w, count })
  }
}
if (violations.length) {
  console.error(`FAIL: ${violations.length} window-of-10 variety violations`)
  for (const v of violations.slice(0, 25)) console.error(' ', v)
  fail = true
} else {
  console.log(`variety windows (L${level}): clean (no setting/name word more than twice in any window of 10)`)
}
process.exit(fail ? 1 : 0)

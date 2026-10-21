// Bias + variety audit for the G2_SCIENCE shelf in content/grade2.ts (A11/A12).
// - answerBias: correct answer strictly longest <=30%, strictly shortest <=35%
// - variety: no common name/setting word more than twice in any window of 10 passages
// Run: node scripts/audit-g2-science.mjs
import { readFileSync } from 'node:fs'

const src = readFileSync('src/lib/providers/content/grade2.ts', 'utf8')
const start = src.indexOf('export const G2_SCIENCE')
const end = src.indexOf('\n]', start)
const body = src.slice(start, end)

const NAMES = ['Maya', 'Sam', 'Ana', 'Leo', 'Kim', 'Mo', 'Diego', 'Aisha', 'Kenji', 'Owen', 'Lily',
  'Priya', 'Theo', 'Ellie', 'Omar', 'Ito', 'Rosa', 'Jack', 'Zoe', 'Nadia', 'Ben', 'Pip', 'Elena',
  'Marco', 'Ravi', 'June', 'Cole', 'Ivy', 'Amir', 'Nina', 'Wren', 'Felix', 'Hana', 'Jude', 'Lucy']
const SETTINGS = ['beach', 'park', 'school', 'home', 'farm', 'city', 'ocean', 'space', 'garden',
  'backyard', 'pond', 'lake', 'mountain', 'forest', 'snow', 'rain', 'library', 'camping', 'town',
  'playground', 'classroom', 'stream', 'yard', 'hill', 'porch', 'desert', 'sky', 'winter', 'summer',
  'spring', 'night', 'window', 'seeds', 'cups', 'windowsill', 'closet', 'field', 'creek', 'mud',
  'sidewalk', 'rocks', 'log', 'nest', 'cave', 'puddle', 'shell', 'sunny', 'shadow', 'meadow',
  'jars', 'pots', 'soil', 'paper', 'ice', 'tree', 'moss', 'sprouts', 'sunshine', 'flower']

const S = `'(?:[^'\\\\]|\\\\.)*'|\`[^\`]*\``
const unq = (s) => s.replace(/^[`'"]|[`'"]$/g, '')

const blocks = body.split(/\n  \{\n/).slice(1)
const passages = blocks.map((b) => {
  const title = unq((b.match(new RegExp(`title: (${S})`)) ?? [])[1] ?? '')
  const text = unq((b.match(new RegExp(`text: (${S})`)) ?? [])[1] ?? '')
  const qs = [...b.matchAll(new RegExp(`question: (${S}),\\s*answer: (${S}),\\s*options: \\[([^\\]]*)\\],\\s*type: '([a-z-]+)'`, 'g'))]
  return { title, text, qs: qs.map((m) => ({
    q: unq(m[1]), a: unq(m[2]),
    o: [...m[3].matchAll(new RegExp(`'(?:[^'\\\\]|\\\\.)*'|\`[^\`]*\``, 'g'))].map((x) => unq(x[0])),
    type: m[4],
  })) }
})

const items = passages.flatMap((p) => p.qs.map((q) => ({ label: `${p.title} :: ${q.q}`, a: q.a, o: q.o, type: q.type })))
const len = (s) => s.trim().length
let longest = 0, shortest = 0
const rows = []
for (const it of items) {
  const a = len(it.a)
  const isL = it.o.filter((o) => len(o) >= a).length === 1
  const isS = it.o.filter((o) => len(o) <= a).length === 1
  if (isL) longest++
  if (isS) shortest++
  rows.push(`${isL ? 'L' : '-'}${isS ? 'S' : '-'} ${it.type.padEnd(10)} ${String(a).padStart(3)}  ${it.label.slice(0, 45)} -> ${it.a}`)
}

let fail = false
console.log(`G2_SCIENCE: ${passages.length} passages, ${items.length} q-items | longest ${longest} (${(longest / items.length * 100).toFixed(1)}% <=30%) | shortest ${shortest} (${(shortest / items.length * 100).toFixed(1)}% <=35%)`)
for (const r of rows) console.log(' ', r)
if (longest / items.length > 0.3) { console.error('FAIL: longest share >30%'); fail = true }
if (shortest / items.length > 0.35) { console.error('FAIL: shortest share >35%'); fail = true }

const texts = passages.map((p) => `${p.title} ${p.text}`.toLowerCase())
const words = [...SETTINGS.map((w) => w.toLowerCase()), ...NAMES.map((w) => w.toLowerCase())]
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
  console.log('variety windows: clean (no setting/name word more than twice in any window of 10)')
}

// word counts per passage (L2 spec: 60-110 words)
const wc = passages.map((p) => p.text.trim().split(/\s+/).length)
console.log('passage word counts:', wc.join(', '), wc.every((n) => n >= 60 && n <= 110) ? '(all 60-110)' : '(OUT OF 60-110 RANGE!)')
if (!wc.every((n) => n >= 60 && n <= 110)) fail = true
process.exit(fail ? 1 : 0)

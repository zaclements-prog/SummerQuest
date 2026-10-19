// Bias + variety audit for the science.ts shelf (handoff A3), modeled on
// audit-reading-l3.mjs but pointed at src/lib/providers/science.ts.
// - answerBias: correct answer strictly longest <=30%, strictly shortest <=35% per level
// - variety: no common name/setting word more than twice in any window of 10 passages
// Run: node scripts/audit-science-l3.mjs [level]   (default 3)
import { readFileSync } from 'node:fs'

const level = Number(process.argv[2] ?? 3)
const src = readFileSync('src/lib/providers/science.ts', 'utf8')

const SETTINGS = ['beach', 'park', 'school', 'home', 'farm', 'city', 'ocean', 'space', 'garden', 'backyard',
  'pond', 'lake', 'mountain', 'forest', 'snow', 'rain', 'library', 'museum', 'camping', 'town',
  'playground', 'classroom', 'attic', 'stream', 'yard', 'hill', 'porch', 'desert', 'sky', 'winter',
  'summer', 'spring', 'night', 'sun', 'wind', 'flowers', 'window box', 'seeds', 'cloud', 'river',
  'autumn', 'moon', 'cave', 'jungle', 'swamp', 'meadow', 'field', 'street', 'kitchen',
  'bedroom', 'trail', 'island', 'valley', 'waterfall', 'puddle', 'storm', 'day', 'morning']
const NAMES = ['Mia', 'Sam', 'Maya', 'Leo', 'Priya', 'Ben', 'Theo', 'Ellie', 'Nadia', 'Ana', 'Pip',
  'Diego', 'Aisha', 'Kenji', 'Owen', 'Lily', 'Zach', 'Ito', 'Delgado', 'Rosa', 'Ellis', 'Omar', 'Jack']

// split into passage blocks at top-level "  {" entries
const blocks = []
const starts = [...src.matchAll(/^ {2}\{$/gm)].map((m) => m.index)
for (let i = 0; i < starts.length; i++) {
  const end = i + 1 < starts.length ? starts[i + 1] : -1
  blocks.push(end < 0 ? src.slice(starts[i]) : src.slice(starts[i], end))
}

const unq = (s) => s.replace(/^["']|["']$/g, '').replace(/\\(["'])/g, '$1')
const Q = `(?:'[^']*'|"[^"]*")`
const textRe = /text: `([\s\S]*?)`,/
const qRe = new RegExp(
  `question: (${Q}),\\s*\\n\\s*answer: (${Q}),\\s*\\n\\s*options: \\[([\\s\\S]*?)\\],\\s*\\n\\s*type: '([a-z-]+)'`,
  'g',
)
const optRe = /'[^']*'|"[^"]*"/g

const passages = []
for (const b of blocks) {
  const lvlM = b.match(/level: ([0-9]+)/)
  if (!lvlM || Number(lvlM[1]) !== level) continue
  const titleM = b.match(/title: ('[^']*'|"[^"]*")/)
  const textM = b.match(textRe)
  passages.push({
    title: titleM ? unq(titleM[1]) : '?',
    text: textM ? textM[1] : '',
    qs: [...b.matchAll(qRe)].map((m) => ({
      q: unq(m[1]),
      a: unq(m[2]),
      o: [...m[3].matchAll(optRe)].map((x) => unq(x[0])),
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

// passage word counts (L3 spec 70-90, L4 spec 85-110). The shelf's oldest
// passages predate the count rule, so pass a `from` index to check only new ones.
const from = Number(process.argv[3] ?? 0)
const spec = level === 3 ? [70, 90] : [85, 110]
const wc = passages.map((p) => p.text.trim().split(/\s+/).length)
console.log(`word counts: ${wc.join(', ')} (L${level} spec ${spec[0]}-${spec[1]}, checking from index ${from})`)
for (const [i, n] of wc.entries()) {
  if (i < from) continue
  if (n < spec[0] || n > spec[1]) { console.error(`FAIL: passage ${passages[i].title} has ${n} words`); fail = true }
}
for (const p of passages) if (!p.text) { console.error(`FAIL: text extraction failed for ${p.title}`); fail = true }

// word-bag variety windows over passage text (word-boundary matches).
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

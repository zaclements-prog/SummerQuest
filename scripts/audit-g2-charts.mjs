// Bias + variety audit for the G2_CHARTS shelf in content/grade2.ts (A18/A19).
// - solver: replays contentFuzz's solveGraph logic over every (chart, question) pair
// - answerBias: key strictly longest <=30%, strictly shortest <=35%
// - variety: no name/setting word more than twice in any window of 10 charts
// Run: node scripts/audit-g2-charts.mjs [fromIndex]
import { readFileSync } from 'node:fs'

const from = Number(process.argv[2] ?? 0)
const src = readFileSync('src/lib/providers/content/grade2.ts', 'utf8')
const start = src.indexOf('export const G2_CHARTS')
const end = src.indexOf('\n]', start)
const body = src.slice(start, end)

const S = `'(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*"|\`[^\`]*\``
const unq = (s) => s.replace(/^['"`]|['"`]$/g, '').replace(/\\'/g, "'")

const lines = body.split('\n').filter((l) => /^\s*\{ level: 2,/.test(l))
const charts = lines.map((l) => {
  const title = unq((l.match(new RegExp(`title: (${S})`)) ?? [])[1] ?? '')
  const bars = [...l.matchAll(/\{\s*label: ([^,]+), value: (\d+)(?:, emoji: [^}]+)?\s*\}/g)]
    .map((m) => ({ label: unq(m[1]), value: Number(m[2]) }))
  const qs = [...l.matchAll(new RegExp(`question: (${S}), answer: (${S}), options: \\[([^\\]]*)\\](?:, hint: (${S}))?`, 'g'))]
    .map((m) => ({
      question: unq(m[1]), answer: unq(m[2]),
      options: [...m[3].matchAll(new RegExp(S, 'g'))].map((x) => unq(x[0])),
    }))
  return { title, bars, qs }
})

// ---- solver (mirrors contentFuzz.test.ts solveGraph) ----
const ALIAS = {
  mon: 'monday', tue: 'tuesday', wed: 'wednesday', thu: 'thursday', fri: 'friday', sat: 'saturday', sun: 'sunday',
  jan: 'january', feb: 'february', mar: 'march', apr: 'april', jun: 'june', jul: 'july', dec: 'december',
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
function namesFor(label) {
  const l = label.toLowerCase()
  const names = [l, l.endsWith('s') ? l.slice(0, -1) : `${l}s`]
  if (ALIAS[l]) names.push(ALIAS[l])
  const wk = /^wk (\d+)$/.exec(l)
  if (wk) names.push(`week ${wk[1]}`)
  return names
}
function solveGraph(question, bars) {
  const q = question.toLowerCase()
  const named = bars
    .map((b) => {
      const at = namesFor(b.label).map((n) => q.search(new RegExp(`\\b${esc(n)}\\b`))).filter((i) => i >= 0)
      return { b, at: at.length ? Math.min(...at) : -1 }
    })
    .filter((x) => x.at >= 0)
    .sort((x, y) => x.at - y.at)
    .map((x) => x.b)
  const sum = (bs) => bs.reduce((s, b) => s + b.value, 0)
  const extreme = (pick) => {
    const best = bars.reduce((m, b) => pick(m, b.value), bars[0].value)
    const hits = bars.filter((b) => b.value === best)
    return hits.length === 1 ? { answer: hits[0].label } : { error: 'tie for the extreme bar' }
  }
  if (/\baverage\b/.test(q)) {
    const avg = sum(bars) / bars.length
    return Number.isInteger(avg) ? { answer: String(avg) } : { error: 'average is not whole' }
  }
  const unit = /each bar unit is (\d+)/.exec(q)
  if (unit) return named.length === 1 ? { answer: String(named[0].value * Number(unit[1])) } : { error: 'scaled read needs one bar' }
  if (/how (many|much) (more|fewer|farther)\b/.test(q)) {
    if (named.length !== 2) return { error: `difference names ${named.length} bars` }
    const [x, y] = named
    const diff = /\bfewer\b/.test(q) ? y.value - x.value : x.value - y.value
    return diff > 0 ? { answer: String(diff) } : { error: 'difference is not positive' }
  }
  if (/\btogether\b/.test(q)) return named.length >= 2 ? { answer: String(sum(named)) } : { error: 'together names <2 bars' }
  if (/\b(in total|in all|all three|across all)\b/.test(q)) return { answer: String(sum(bars)) }
  if (!/^how many/.test(q)) {
    const who = /\b(\d+)\b/.exec(q)
    if (who) {
      const hits = bars.filter((b) => b.value === Number(who[1]))
      return hits.length === 1 ? { answer: hits[0].label } : { error: `no single bar reaches ${who[1]}` }
    }
    if (/\b(most|tallest|biggest)\b/.test(q)) return extreme(Math.max)
    if (/\b(fewest|shortest|least)\b/.test(q)) return extreme(Math.min)
  }
  if (/^how many/.test(q) && named.length === 1) return { answer: String(named[0].value) }
  return { error: 'solver cannot read this question' }
}

let fail = false
const items = []
charts.forEach((c, ci) => {
  if (c.bars.length > 4) { console.error(`FAIL: ${c.title} has >4 bars`); fail = true }
  const labs = c.bars.map((b) => b.label.toLowerCase())
  if (new Set(labs).size !== labs.length) { console.error(`FAIL: ${c.title} duplicate labels`); fail = true }
  for (const q of c.qs) {
    if (!q.options.includes(q.answer)) { console.error(`FAIL: ${c.title}: answer not in options: "${q.question}"`); fail = true }
    if (new Set(q.options).size !== q.options.length) { console.error(`FAIL: ${c.title}: duplicate options: "${q.question}"`); fail = true }
    if (q.options.length < 3 || q.options.length > 4) { console.error(`FAIL: ${c.title}: options count ${q.options.length}`); fail = true }
    const solved = solveGraph(q.question, c.bars)
    if (solved.error) { console.error(`FAIL solver: ${c.title}: "${q.question}" — ${solved.error}`); fail = true }
    else if (solved.answer !== q.answer) { console.error(`FAIL mismatch: ${c.title}: "${q.question}" solver=${solved.answer} key=${q.answer}`); fail = true }
    items.push({ label: `${c.title} :: ${q.question}`, a: q.answer, o: q.options, ci })
  }
})
console.log(`G2_CHARTS: ${charts.length} charts, ${items.length} q-items`)

// ---- answer bias across the whole L2 bank ----
const len = (s) => s.trim().length
let longest = 0, shortest = 0
for (const it of items) {
  const a = len(it.a)
  const isL = it.o.filter((o) => len(o) >= a).length === 1
  const isS = it.o.filter((o) => len(o) <= a).length === 1
  if (isL) longest++
  if (isS) shortest++
}
console.log(`bias (all ${items.length}): longest ${longest} (${(longest / items.length * 100).toFixed(1)}% <=30%) | shortest ${shortest} (${(shortest / items.length * 100).toFixed(1)}% <=35%)`)
if (longest / items.length > 0.3) { console.error('FAIL: longest share >30%'); fail = true }
if (shortest / items.length > 0.35) { console.error('FAIL: shortest share >35%'); fail = true }

// bias for the NEW charts only (from index)
const newItems = items.filter((it) => it.ci >= from)
let nL = 0, nS = 0
newItems.forEach((it) => {
  const a = len(it.a)
  if (it.o.filter((o) => len(o) >= a).length === 1) nL++
  if (it.o.filter((o) => len(o) <= a).length === 1) nS++
})
console.log(`new batch (${newItems.length}): longest ${nL} (${(nL / newItems.length * 100).toFixed(1)}%) | shortest ${nS} (${(nS / newItems.length * 100).toFixed(1)}%)`)

// ---- variety: title+question word windows over charts ----
const NAMES = ['Maya', 'Sam', 'Ana', 'Leo', 'Kim', 'Mo', 'Diego', 'Aisha', 'Kenji', 'Owen', 'Lily',
  'Priya', 'Theo', 'Ellie', 'Omar', 'Ito', 'Rosa', 'Jack', 'Zoe', 'Nadia', 'Ben', 'Pip', 'Elena',
  'Marco', 'Ravi', 'June', 'Cole', 'Ivy', 'Amir', 'Nina', 'Wren', 'Felix', 'Hana', 'Jude', 'Lucy']
const SETTINGS = ['beach', 'park', 'school', 'home', 'farm', 'city', 'ocean', 'space', 'garden',
  'backyard', 'pond', 'lake', 'mountain', 'forest', 'snow', 'rain', 'library', 'camping', 'town',
  'playground', 'classroom', 'stream', 'yard', 'hill', 'porch', 'desert', 'sky', 'winter', 'summer',
  'spring', 'night', 'trail', 'hike', 'feeder', 'birds', 'vases', 'necklaces', 'beads', 'tickets',
  'carnival', 'aquarium', 'game', 'night', 'snowy', 'sunny', 'cloudy', 'rainy', 'bugs', 'shells',
  'books', 'blocks', 'cones', 'ice cream', 'flower', 'flowers', 'trees', 'vegetables', 'month', 'months']
const texts = charts.map((c) => `${c.title} ${c.qs.map((q) => q.question).join(' ')}`.toLowerCase())
const words = [...new Set([...SETTINGS.map((w) => w.toLowerCase().split(' ')[0]), ...NAMES.map((w) => w.toLowerCase())])]
let violations = 0
for (let i = 0; i + 10 <= texts.length; i++) {
  const win = texts.slice(i, i + 10)
  for (const w of words) {
    const count = win.filter((t) => new RegExp(`\\b${w}\\b`).test(t)).length
    if (count > 2) { console.error(`VARIETY: window ${i} word "${w}" x${count}`); violations++; fail = true }
  }
}
if (!violations) console.log('variety windows: clean')
process.exit(fail ? 1 : 0)

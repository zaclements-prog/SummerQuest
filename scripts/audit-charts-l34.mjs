// Bias + variety audit for the level 3/4 chart shelf in src/lib/providers/dataGraph.ts (A20/A21).
// - solver: replays contentFuzz's solveGraph logic over every (chart, question) pair per level
// - answerBias: key strictly longest <=30%, strictly shortest <=35% (per level, as answerBias.test.ts does)
// - variety: no name/setting word more than twice in any window of 10 charts (per level)
// Run: node scripts/audit-charts-l34.mjs [level]   (default: both levels)
import { readFileSync } from 'node:fs'

const only = process.argv[2] ? Number(process.argv[2]) : null
const src = readFileSync('src/lib/providers/dataGraph.ts', 'utf8') + '\n' + readFileSync('src/lib/providers/content/l4Enrich.ts', 'utf8')

const S = `'(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*"|\`[^\`]*\``
const unq = (s) => s.replace(/^['"`]|['"`]$/g, '').replace(/\\'/g, "'")

// brace-match every `{ level: N, title: ... }` chart object in the file
function extractCharts() {
  const charts = []
  const re = /\{\s*level:\s*(\d),\s*title:/g
  let m
  while ((m = re.exec(src))) {
    let i = m.index + 1
    let depth = 1
    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth++
      else if (src[i] === '}') depth--
      i++
    }
    const body = src.slice(m.index, i)
    const level = Number(m[1])
    const title = unq((body.match(new RegExp(`title: (${S})`)) ?? [])[1] ?? '')
    const bars = [...body.matchAll(new RegExp(`\\{\\s*label: (${S}),\\s*value: (\\d+)(?:,\\s*emoji: ${S})?\\s*\\}`, 'g'))]
      .map((b) => ({ label: unq(b[1]), value: Number(b[2]) }))
    const qs = [...body.matchAll(new RegExp(`question: (${S}),\\s*answer: (${S}),\\s*options: \\[([^\\]]*)\\](?:,\\s*hint: ${S})?`, 'g'))]
      .map((q) => ({
        question: unq(q[1]), answer: unq(q[2]),
        options: [...q[3].matchAll(new RegExp(S, 'g'))].map((x) => unq(x[0])),
      }))
    charts.push({ level, title, bars, qs })
    re.lastIndex = i
  }
  return charts
}

const all = extractCharts()

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
for (const level of [3, 4]) {
  if (only && only !== level) continue
  const charts = all.filter((c) => c.level === level)
  const items = []
  charts.forEach((c, ci) => {
    const labs = c.bars.map((b) => b.label.toLowerCase())
    if (new Set(labs).size !== labs.length) { console.error(`FAIL: ${c.title} duplicate labels`); fail = true }
    if (!c.bars.every((b) => b.value > 0)) { console.error(`FAIL: ${c.title} non-positive value`); fail = true }
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
  const len = (s) => String(s).trim().length
  let longest = 0, shortest = 0
  for (const it of items) {
    const a = len(it.a)
    if (it.o.filter((o) => len(o) >= a).length === 1) longest++
    if (it.o.filter((o) => len(o) <= a).length === 1) shortest++
  }
  console.log(`L${level}: ${charts.length} charts, ${items.length} q-items | longest ${longest} (${(longest / items.length * 100).toFixed(1)}% <=30%) | shortest ${shortest} (${(shortest / items.length * 100).toFixed(1)}% <=35%)`)
  if (longest / items.length > 0.3) { console.error(`FAIL: L${level} longest share >30%`); fail = true }
  if (shortest / items.length > 0.35) { console.error(`FAIL: L${level} shortest share >35%`); fail = true }

  // ---- variety: name/setting words over title+question text, windows of 10 charts ----
  const NAMES = ['Maya', 'Sam', 'Ana', 'Leo', 'Kim', 'Mo', 'Diego', 'Aisha', 'Kenji', 'Owen', 'Lily',
    'Priya', 'Theo', 'Ellie', 'Omar', 'Ito', 'Rosa', 'Jack', 'Zoe', 'Nadia', 'Ben', 'Pip', 'Elena',
    'Marco', 'Ravi', 'June', 'Cole', 'Ivy', 'Amir', 'Nina', 'Wren', 'Felix', 'Hana', 'Jude', 'Lucy',
    'Ava', 'Cody', 'Mia', 'Kai', 'Tom', 'Nora', 'Eli', 'Pia', 'Ray', 'Liam',
    'Nina', 'Cleo', 'Hugo', 'Tara', 'Wes', 'Noor', 'Mina', 'Luna', 'Nico', 'Ruby', 'Finn', 'Zane', 'Iris', 'Bea',
    'Ada', 'Cal', 'Dee', 'Hazel', 'Clover', 'Briar', 'Poppy', 'Ivo', 'Otto', 'Uma', 'Sol', 'Beatrix',
    'Robins', 'Wrens', 'Hawks', 'Eagles']
  const SETTINGS = ['beach', 'park', 'school', 'home', 'farm', 'city', 'ocean', 'space', 'garden',
    'backyard', 'pond', 'lake', 'mountain', 'forest', 'snow', 'rain', 'library', 'camping', 'town',
    'playground', 'classroom', 'stream', 'yard', 'hill', 'porch', 'desert', 'sky', 'winter', 'summer',
    'spring', 'night', 'trail', 'hike', 'feeder', 'birds', 'vases', 'necklaces', 'beads', 'tickets',
    'carnival', 'aquarium', 'game', 'snowy', 'sunny', 'cloudy', 'rainy', 'bugs', 'shells', 'books',
    'blocks', 'cones', 'flower', 'flowers', 'trees', 'vegetables', 'month', 'months',
    'jump', 'rope', 'hats', 'acorns', 'squirrel', 'jay', 'mouse', 'pencils', 'marbles', 'riddles',
    'chores', 'dishes', 'toys', 'plants', 'reading', 'compost', 'buckets', 'sports', 'points',
    'trails', 'bracelets', 'story', 'pages', 'cabin', 'towels', 'pine', 'oak', 'maple', 'patch',
    'pumpkins', 'crayons', 'cupcakes', 'stamps', 'apples', 'bottles', 'cans', 'laps', 'pizza',
    'goals', 'seeds', 'snacks', 'stickers', 'pets', 'fruit', 'ice cream', 'sport', 'class', 'jar',
    'fireflies', 'meadow', 'bookmarks', 'muffins', 'firewood', 'logs', 'postcards', 'quiz',
    'huts', 'teams', 'week', 'weeks', 'trash', 'laundry', 'walks', 'flavors']
  const texts = charts.map((c) => `${c.title} ${c.qs.map((q) => q.question).join(' ')}`.toLowerCase())
  const words = [...new Set([...SETTINGS.map((w) => w.toLowerCase().split(' ')[0]), ...NAMES.map((w) => w.toLowerCase())])]
  let violations = 0
  for (let i = 0; i + 10 <= texts.length; i++) {
    const win = texts.slice(i, i + 10)
    for (const w of words) {
      const count = win.filter((t) => new RegExp(`\\b${w}\\b`).test(t)).length
      if (count > 2) { console.error(`VARIETY L${level}: window ${i} word "${w}" x${count}`); violations++; fail = true }
    }
  }
  if (!violations) console.log(`L${level} variety windows: clean`)
}
process.exit(fail ? 1 : 0)

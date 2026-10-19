// Variety window audit for grade writing shelves (handoff A3 variety rule):
// across a grade's sentence+paragraph+story lists in order, no common setting
// word may appear more than twice inside any contiguous window of 10 prompts.
// Run: node scripts/audit-writing-variety.mjs [grade]   (default 3)
import { readFileSync } from 'node:fs'

const grade = Number(process.argv[2] ?? 3)
const src = readFileSync('src/lib/providers/writingPrompt.ts', 'utf8')

const SETTINGS = ['beach', 'park', 'school', 'home', 'farm', 'city', 'ocean', 'space', 'garden', 'backyard',
  'pond', 'lake', 'mountain', 'forest', 'snow', 'rain', 'library', 'museum', 'camping', 'town',
  'playground', 'classroom', 'airport', 'lighthouse', 'sidewalk', 'stream', 'neighborhood', 'sunset',
  'night', 'evening', 'bedtime', 'kitchen', 'lunch']

const shelf = {}
for (const kind of ['sentence', 'paragraph', 'story']) {
  const m = src.match(new RegExp(`  ${grade}: \\{[\\s\\S]*?${kind}: \\[([\\s\\S]*?)\\n    \\],`))
  if (!m) { console.error(`no G${grade} ${kind} shelf found`); process.exit(1) }
  shelf[kind] = [...m[1].matchAll(/^ {6}'(.*)',$/gm)].map((x) => x[1])
}

const ordered = [...shelf.sentence, ...shelf.paragraph, ...shelf.story]
const violations = []
for (let i = 0; i + 10 <= ordered.length; i++) {
  const win = ordered.slice(i, i + 10).join(' ').toLowerCase()
  for (const s of SETTINGS) {
    const count = win.split(s).length - 1
    if (count > 2) violations.push({ window: i, setting: s, count })
  }
}

console.log(`G${grade} shelf:`, Object.fromEntries(Object.entries(shelf).map(([k, v]) => [k, v.length])))
if (violations.length) {
  console.error(`FAIL: ${violations.length} window-of-10 setting violations`)
  for (const v of violations.slice(0, 20)) console.error(' ', v)
  process.exit(1)
}
console.log(`variety audit G${grade}: clean (no setting more than twice in any window of 10)`)

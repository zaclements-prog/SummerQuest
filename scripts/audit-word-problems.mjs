// A32 audit: word-problem skeletons — mul/div shelves doubled to 24 each.
// Checks: every skeleton states exactly two numbers in the order the fuzz
// solver extracts them (nums[0]=a/dividend, nums[1]=b/divisor), prompt
// format is clean, prompts unique per shelf, and the variety rule (no
// name/setting word more than twice in any window of 10, per shelf).
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../src/lib/providers/wordProblem.ts', import.meta.url), 'utf8')

function shelf(name) {
  const m = src.match(new RegExp(`const ${name}:[\\s\\S]*?= \\[([\\s\\S]*?)\\n\\]`))
  if (!m) throw new Error(`shelf ${name} not found`)
  const prompts = [...m[1].matchAll(/prompt: `([^`]+)`/g)].map((g) => g[1])
  if (prompts.length === 0) throw new Error(`${name}: no prompts`)
  return prompts
}

const shelves = {
  add: shelf('TEMPLATES_ADD'),
  sub: shelf('TEMPLATES_SUB'),
  mult: shelf('TEMPLATES_MULT'),
  div: shelf('TEMPLATES_DIV'),
}

let fails = 0
const fail = (msg) => { console.log('FAIL:', msg); fails++ }

// 1) counts: add/sub doubled at A31 (16), mul/div doubled this step (24)
const targets = { add: 16, sub: 16, mult: 24, div: 24 }
for (const [name, prompts] of Object.entries(shelves)) {
  if (prompts.length !== targets[name]) fail(`${name} shelf has ${prompts.length}, expected ${targets[name]}`)
}

// 2) filled shape: exactly two numbers, in order (a before b, dividend before
//    divisor — the fuzz solver reads nums[0], nums[1]); clean format; unique
const FILL = { '${a}': '42', '${b}': '7', '${dividend}': '48', '${divisor}': '6' }
const fill = (t) => t.replace(/\$\{(?:a|b|dividend|divisor)\}/g, (m) => FILL[m])
for (const [name, prompts] of Object.entries(shelves)) {
  const seen = new Set()
  for (const raw of prompts) {
    const p = fill(raw)
    const nums = p.match(/\d+/g) ?? []
    if (nums.length !== 2) fail(`${name}: "${p}" states ${nums.length} numbers, expected 2 in order`)
    if (seen.has(p)) fail(`${name}: duplicate prompt "${p}"`)
    seen.add(p)
    if (/\$\{|\}/.test(p)) fail(`${name}: leftover brace: "${p}"`)
    if (/ {2}/.test(p)) fail(`${name}: doubled space: "${p}"`)
    if (!p.trim().endsWith('?')) fail(`${name}: must end in '?': "${p}"`)
    if (/\b(undefined|NaN|null|Infinity)\b/.test(p)) fail(`${name}: bad token: "${p}"`)
    if (/\b(\w+) \1\b/i.test(p)) fail(`${name}: repeated word: "${p}"`)
    if (/\s[,.!?;:]/.test(p)) fail(`${name}: space before punctuation: "${p}"`)
  }
}

// 3) variety per shelf: word-bag windows of 10 (names + setting words),
//    placeholders and generic function words stripped
const STOP = new Set([
  'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'and', 'or', 'is', 'are', 'was', 'were',
  'how', 'many', 'much', 'does', 'do', 'did', 'can', 'she', 'he', 'they', 'it', 'her',
  'his', 'their', 'each', 'every', 'with', 'then', 'there', 'had', 'have', 'has', 'more',
  'than', 'into', 'for', 'that', 'this', 'who', 'get', 'gets', 'all', 'altogether',
  'total', 'now', 'left', 'still', 'same', 'number', 'what', 'which', 'when',
  'put', 'puts', 'made', 'make', 'makes', 'be', 'been', 'not', 'yet', 'off',
  'them', 'its', 'own', 'over', 'after', 'before', 'by', 'from', 'up', 'down', 'out',
  'about', 'so', 'if', 'will', 'would', 'one', 'two', 'other',
  // equal-groups/share math vocabulary and common story verbs — function
  // words, not names/settings (the variety rule targets names and settings)
  'equal', 'equally', 'evenly', 'among', 'share', 'shares', 'shared', 'split', 'splits',
  'groups', 'group', 'fill', 'fills', 'go', 'goes', 'hold', 'holds', 'held', 'fits',
  'set', 'sets', 'sat', 'came', 'walked', 'found', 'picked', 'made', 'built',
])
for (const [name, prompts] of Object.entries(shelves)) {
  const words = prompts.map((raw) =>
    [...new Set(fill(raw).toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w)))],
  )
  for (let i = 0; i + 10 <= words.length; i++) {
    const counts = new Map()
    for (const w of words.slice(i, i + 10)) for (const x of w) counts.set(x, (counts.get(x) ?? 0) + 1)
    for (const [w, n] of counts) if (n > 2) fail(`${name} window ${i}: "${w}" x${n}`)
  }
}

console.log(`word-problems: add ${shelves.add.length}, sub ${shelves.sub.length}, mult ${shelves.mult.length}, div ${shelves.div.length}`)
console.log(fails ? `AUDIT FAILED (${fails})` : 'AUDIT CLEAN')
process.exit(fails ? 1 : 0)

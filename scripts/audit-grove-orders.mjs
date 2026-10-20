// A30 audit: grove orders — leak-free prompts, G2 pool ≥30, pair-unique
// canonical bank, every G2 pair double-phrased, and the variety rule (no
// name/setting word more than twice in any window of 10 across the pool).
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../src/lib/providers/multiplicationGrove.ts', import.meta.url), 'utf8')
function shelf(name) {
  const m = src.match(new RegExp(`export const ${name}: PlantingOrder\\[\\] = \\[([\\s\\S]*?)\\n\\]`))
  if (!m) throw new Error(`shelf ${name} not found`)
  return [...m[1].matchAll(/\{ rows: (\d+), cols: (\d+), prompt: '([^']+)' \}/g)].map((g) => ({
    rows: +g[1], cols: +g[2], prompt: g[3],
  }))
}
const orders = shelf('GROVE_ORDERS')
const alts = shelf('GROVE_ORDER_ALTS')
const pool = [...orders, ...alts]

const cands = (r, c) => [r * c, r * (c + 1), (r + (r === c ? 2 : 1)) * c]
const STOP = new Set(['the', 'a', 'an', 'of', 'with', 'in', 'each', 'row', 'rows', 'by', 'to', 'wants', 'calls', 'for', 'says', 'trees', 'tree', 'plant', 'put', 'this', 'that', 'is', 'needs', 'keeper', 'order', 'big', 'giant', 'square', 'patch', 'on', 'at', 'along', 'near', 'below', 'beside', 'down', 'and', 'asks'])

let fails = 0
const fail = (msg) => { console.log('FAIL:', msg); fails++ }

// 1) leak-free + format on every pool item
for (const o of pool) {
  const nums = (o.prompt.match(/\d+/g) ?? []).map(Number)
  if (nums[0] !== o.rows || nums[1] !== o.cols) fail(`${o.prompt}: digits != ${o.rows}x${o.cols}`)
  for (const t of cands(o.rows, o.cols)) if (nums.includes(t)) fail(`${o.prompt}: leaks total ${t}`)
  if (o.prompt.length <= 30) fail(`${o.prompt}: too short`)
  if (/which/i.test(o.prompt)) fail(`${o.prompt}: quiz wording`)
  if (Math.max(o.rows, o.cols) > 7 || Math.min(o.rows, o.cols) < 2) fail(`${o.prompt}: off-field`)
}
// 2) canonical bank stays pair-unique; prompts unique across the whole pool
const pairs = new Set(orders.map((o) => `${o.rows}x${o.cols}`))
if (pairs.size !== orders.length) fail('canonical pairs not unique')
const prompts = new Set(pool.map((o) => o.prompt))
if (prompts.size !== pool.length) fail('pool prompts not unique')
// 3) G2 served pool >= 30 and every G2 pair double-phrased
const g2pool = pool.filter((o) => Math.max(o.rows, o.cols) <= 5)
if (g2pool.length < 30) fail(`G2 pool only ${g2pool.length}`)
const g2pairs = new Set(g2pool.map((o) => `${o.rows}x${o.cols}`))
for (const p of g2pairs) if (g2pool.filter((o) => `${o.rows}x${o.cols}` === p).length < 2) fail(`G2 pair ${p} has one phrasing`)
// 4) variety: word-bag windows over pool order (tree names + settings)
for (const [tag, list] of [['G2 pool', g2pool], ['full pool', pool]]) {
  const words = list.map((o) =>
    [...new Set(o.prompt.toLowerCase().replace(/[^\w ]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w) && !/^\d+$/.test(w)))],
  )
  for (let i = 0; i + 10 <= words.length; i++) {
    const counts = new Map()
    for (const w of words.slice(i, i + 10)) for (const x of w) counts.set(x, (counts.get(x) ?? 0) + 1)
    for (const [w, n] of counts) if (n > 2) fail(`${tag} window ${i}: "${w}" x${n}`)
  }
}
console.log(`grove: ${orders.length} canonical (pairs ${pairs.size}) + ${alts.length} alts; G2 pool ${g2pool.length}, pairs ${g2pairs.size}`)
console.log(fails ? `AUDIT FAILED (${fails})` : 'AUDIT CLEAN')
process.exit(fails ? 1 : 0)

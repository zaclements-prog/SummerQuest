import { describe, it, expect, vi, afterEach } from 'vitest'
import type { Problem } from '../../problem'
import { seededRng } from '../../random'
import { makeG5MultProvider, placeParts, areaModel, type G5MultMode } from '../g5Mult'
import { makeG5DivProvider, lostZero, firstChunk, type G5DivMode } from '../g5Div'
import { makeG5ExprProvider, type G5ExprMode } from '../g5Expr'
import { evalExpr, exactValue, mistakenValues, firstStep } from '../g5ExprMath'
import { WOODS_STORIES, EXPR_PHRASES } from '../content/g5Woods'
import { SKILLS, skillOf } from '../../../tutoring/skills'

/*
 * 5th-grade Multiplication Mesa, Division Dunes and Word Problem Woods: every
 * mode drawn many times under seeded randomness, each answer worked out again
 * here from the question's own words (not by the provider's code), one right
 * choice, clean text that fits its buttons, and numbers in the contract's ranges.
 */

const DRAWS = 600
const num = (s: string) => Number(s.replace(/,/g, ''))
const nums = (s: string) => (s.match(/\d[\d,]*/g) ?? []).map(num)
const BAD = /undefined|NaN|\bnull\b|\[object|Infinity/

afterEach(() => vi.restoreAllMocks())

function draw(make: () => { next: () => Problem | Promise<Problem> }, seed: string, n = DRAWS): Problem[] {
  const rng = seededRng(seed)
  vi.spyOn(Math, 'random').mockImplementation(rng)
  const p = make()
  const out: Problem[] = []
  for (let i = 0; i < n; i++) out.push(p.next() as Problem)
  vi.restoreAllMocks()
  return out
}

/** An independent reading of an expression: JavaScript's own arithmetic. */
function jsValue(expr: string): number {
  const js = expr.replace(/,/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\[/g, '(').replace(/\]/g, ')')
  if (!/^[\d\s+\-*/()]+$/.test(js)) throw new Error(`not an expression: ${expr}`)
  return Function(`return (${js})`)() as number
}

/** Shape checks every grade-5 question meets. */
function wellFormed(p: Problem): string[] {
  const errs: string[] = []
  const texts = [p.prompt, p.hint ?? '', ...p.options.map(String)]
  for (const t of texts) {
    if (BAD.test(t)) errs.push(`bad token in "${t}"`)
    if (/ {2}/.test(t) || t !== t.trim()) errs.push(`spacing in "${t}"`)
    if (/\s[,.!;:]|[a-z] \?/i.test(t)) errs.push(`space before punctuation in "${t}"`)
    if (/\b(\w+) \1\b/i.test(t)) errs.push(`repeated word in "${t}"`)
  }
  if (p.options.length !== 4) errs.push(`${p.options.length} options`)
  if (new Set(p.options.map(String)).size !== p.options.length) errs.push(`duplicate options ${p.options.join('|')}`)
  if (p.options.filter((o) => o === p.answer).length !== 1) errs.push(`answer ${p.answer} not once in ${p.options.join('|')}`)
  for (const o of p.options) if (typeof o === 'string' && /^[\d,]+$/.test(o) && num(o) <= 0) errs.push(`option ${o} not positive`)
  // fits: the quiz prompt card and a two-column (or one-column) button
  if (p.prompt.length > 230) errs.push(`prompt too long (${p.prompt.length})`)
  for (const o of p.options) if (String(o).length > 28) errs.push(`option too long: ${o}`)
  if (p.prompt.includes('\n')) errs.push('newline in prompt')
  if (!p.skill || !SKILLS[skillOf(p).id]) errs.push(`unregistered skill ${p.skill?.id}`)
  return errs
}

function expectAll(problems: Problem[], solve: (p: Problem) => string | number | null) {
  const errs: string[] = []
  for (const p of problems) {
    for (const e of wellFormed(p)) errs.push(`${p.prompt} → ${e}`)
    const want = solve(p)
    if (want === null) errs.push(`could not re-solve: ${p.prompt}`)
    else if (String(p.answer) !== (typeof want === 'number' ? want.toLocaleString('en-US') : want)) errs.push(`${p.prompt}: answer ${p.answer}, worked out ${want}`)
    if (errs.length > 10) break
  }
  expect(errs).toEqual([])
}

// ── Multiplication Mesa ─────────────────────────────────────────────────────

const round = (n: number, p: number) => Math.round(n / p) * p

function solveMult(p: Problem): number | string | null {
  const q = p.prompt
  let m: RegExpMatchArray | null
  if ((m = q.match(/area model for ([\d,]+) × (\d+), what is ([\d,]+) × ([\d,]+)\?$/))) {
    const [a, b, r, c] = m.slice(1).map(num)
    const v = p.visual
    if (v?.kind !== 'areaModel') return null
    if (v.rows.reduce((x, y) => x + y, 0) !== a || v.cols.reduce((x, y) => x + y, 0) !== b) return null
    const asked = v.rows.flatMap((rr, i) => v.cols.map((cc, j) => ({ rr, cc, cell: v.cells[i][j] }))).filter((x) => x.cell === null)
    if (asked.length !== 1 || asked[0].rr !== r || asked[0].cc !== c) return null
    // the boxes shown are their own partial products
    for (let i = 0; i < v.rows.length; i++) for (let j = 0; j < v.cols.length; j++) if (v.cells[i][j] !== null && v.cells[i][j] !== v.rows[i] * v.cols[j]) return null
    return r * c
  }
  if ((m = q.match(/What is ([\d,]+) × (\d+)\?$/))) {
    const [a, b] = m.slice(1).map(num)
    if (p.visual?.kind === 'areaModel' && p.visual.cells.flat().reduce<number>((s, x) => s + (x ?? NaN), 0) !== a * b) return null
    return a * b
  }
  if ((m = q.match(/^([\d,]+) × (\d+) = \?$/))) return num(m[1]) * num(m[2])
  if ((m = q.match(/the second row is ([\d,]+) × (\d+)\. What is it\?$/))) return num(m[1]) * num(m[2])
  if ((m = q.match(/About how much is (\d+) × (\d+)\?$/))) return round(num(m[1]), 100) * round(num(m[2]), 10)
  if ((m = q.match(/^What is 10([⁰¹²³⁴⁵⁶⁷⁸⁹]+)\?$/))) return 10 ** supNum(m[1])
  if ((m = q.match(/^(\d) × 10([⁰¹²³⁴⁵⁶⁷⁸⁹]+) = \?$/))) return Number(m[1]) * 10 ** supNum(m[2])
  if ((m = q.match(/^(\d+) × ([\d,]+) = \?$/))) return num(m[1]) * num(m[2])
  if ((m = q.match(/^([\d,]+) ÷ ([\d,]+) = \?$/))) return num(m[1]) / num(m[2])
  if ((m = q.match(/^How many zeros does 10([⁰¹²³⁴⁵⁶⁷⁸⁹]+) have/))) return supNum(m[1])
  if ((m = q.match(/^Which power of 10 is ([\d,]+)\?$/))) return `10${toSup(String(num(m[1])).length - 1)}`
  if ((m = q.match(/^Which is the same as ((?:10 × )+10)\?$/))) return `10${toSup(m[1].split('×').length)}`
  // a story: the two numbers it gives, multiplied
  const ns = nums(q)
  return ns.length === 2 ? ns[0] * ns[1] : null
}
const SUPS = '⁰¹²³⁴⁵⁶⁷⁸⁹'
const supNum = (s: string) => Number([...s].map((c) => SUPS.indexOf(c)).join(''))
const toSup = (n: number) => [...String(n)].map((d) => SUPS[Number(d)]).join('')

describe('Multiplication Mesa, 5th grade (g5Mult)', () => {
  for (const mode of ['area', 'algorithm', 'powers', 'practice', 'mastery'] as G5MultMode[]) {
    it(`${mode}: answers re-solved, one right choice, clean text`, () => {
      expectAll(draw(() => makeG5MultProvider({ mode }), `mult-${mode}`), solveMult)
    })
  }

  it('stays within the contract: up to 4-digit by 2-digit, area models of 2 or 3 rows by 2 columns', () => {
    for (const p of draw(() => makeG5MultProvider({ mode: 'mastery' }), 'mult-range')) {
      const m = p.prompt.match(/^([\d,]+) × (\d+) = \?$/)
      if (m && !/^10+$/.test(m[2])) {
        expect(num(m[1])).toBeLessThanOrEqual(9999)
        expect(m[2].length).toBe(2)
      }
    }
    for (const p of draw(() => makeG5MultProvider({ mode: 'area' }), 'area-range')) {
      const v = p.visual
      expect(v?.kind).toBe('areaModel')
      if (v?.kind === 'areaModel') {
        expect([2, 3]).toContain(v.rows.length)
        expect(v.cols.length).toBe(2)
      }
    }
  })

  it('wrong choices are the real mistakes: the matching-boxes total, zeros dropped', () => {
    const m = areaModel(23, 14)
    expect(m.cells).toEqual([[200, 80], [30, 12]])
    expect(placeParts(305)).toEqual([300, 5])
    // 23 × 14 offers 212 (20 × 10 + 3 × 4) somewhere in a large sample
    const totals = draw(() => makeG5MultProvider({ mode: 'area' }), 'area-diag').filter((p) => p.subtopic === 'area-total')
    let diagonal = 0
    for (const p of totals) {
      const v = p.visual
      if (v?.kind !== 'areaModel') continue
      const d = (v.cells[0][0] ?? 0) + (v.cells[1][1] ?? 0)
      if (p.options.includes(d.toLocaleString('en-US'))) diagonal++
    }
    expect(diagonal / totals.length).toBeGreaterThan(0.8)
  })
})

// ── Division Dunes ──────────────────────────────────────────────────────────

function solveDiv(p: Problem): number | string | null {
  const q = p.prompt
  let m: RegExpMatchArray | null
  if ((m = q.match(/^([\d,]+) ÷ (\d+) = \?$/))) {
    const [a, d] = [num(m[1]), num(m[2])]
    if (a % d !== 0) return null
    if (p.visual && (p.visual.kind !== 'longDivision' || p.visual.dividend !== a || p.visual.divisor !== d)) return null
    return a / d
  }
  if ((m = q.match(/^([\d,]+) ÷ \? = (\d+)$/))) return num(m[1]) / num(m[2])
  if ((m = q.match(/^The first step of ([\d,]+) ÷ (\d+): how many (\d+)s fit in (\d+)\?$/))) {
    const [a, d, d2, chunk] = m.slice(1).map(num)
    const s = String(a)
    let k = 1
    while (Number(s.slice(0, k)) < d) k++
    if (d2 !== d || Number(s.slice(0, k)) !== chunk) return null
    if (p.visual?.kind === 'longDivision' && p.visual.highlight !== k) return null
    return Math.floor(chunk / d)
  }
  if ((m = q.match(/best estimate for ([\d,]+) ÷ (\d+)\?$/))) return Math.round(num(m[1]) / round(num(m[2]), 10))
  // a remainder story: the bigger number is shared into groups of the smaller
  const ns = nums(q)
  if (ns.length !== 2) return null
  const [total, per] = ns[0] > ns[1] ? ns : [ns[1], ns[0]]
  const qq = Math.floor(total / per)
  const r = total % per
  if (r === 0) return null
  if (/left over|are left|is left|not full|left after/.test(q)) return r
  if (/needed|need to|must it buy/.test(q)) return qq + 1
  return qq
}

describe('Division Dunes, 5th grade (g5Div)', () => {
  for (const mode of ['long', 'arena', 'remainders', 'mastery'] as G5DivMode[]) {
    it(`${mode}: answers re-solved, one right choice, clean text`, () => {
      expectAll(draw(() => makeG5DivProvider({ mode }), `div-${mode}`), solveDiv)
    })
  }

  it('long division goes up to 4-digit by 2-digit, and the arena keeps to its pen', () => {
    for (const p of draw(() => makeG5DivProvider({ mode: 'mastery' }), 'div-range')) {
      const m = p.prompt.match(/^([\d,]+) ÷ (\d+) = \?$/)
      if (m) {
        expect(num(m[1])).toBeLessThanOrEqual(9999)
        expect(m[2].length).toBe(2)
      }
    }
    for (const p of draw(() => makeG5DivProvider({ mode: 'arena' }), 'arena-range')) {
      const [a, b] = nums(p.prompt)
      const [d, q] = p.prompt.includes('?') && p.prompt.indexOf('?') < p.prompt.indexOf('=') ? [a / b, b] : [b, a / b]
      expect(d).toBeGreaterThanOrEqual(11)
      expect(d).toBeLessThanOrEqual(25)
      expect(q).toBeLessThanOrEqual(9)
    }
  })

  it('every remainder story offers the raw "q R r" and the round-up/drop slips', () => {
    const ps = draw(() => makeG5DivProvider({ mode: 'remainders' }), 'rem-kinds', 300)
    const uses = new Set(ps.map((p) => p.subtopic))
    expect([...uses].sort()).toEqual(['remainder-drop', 'remainder-left', 'remainder-up'])
    for (const p of ps) expect(p.options.some((o) => / R /.test(String(o))), p.prompt).toBe(true)
    expect(lostZero(104)).toBe(14)
    expect(lostZero(123)).toBeNull()
    expect(firstChunk(672, 28)).toEqual({ chunk: 67, digits: 2 })
  })
})

// ── Word Problem Woods ──────────────────────────────────────────────────────

/** Each story's answer from the numbers in its words (in order), worked out here. */
const STORY_SOLVE: Record<string, (n: number[]) => number> = {
  markers: ([p, m, g]) => p * m - g,
  tickets: ([x, y, k, a]) => k * x + a * y,
  share: ([t, k, f]) => (t - k) / f,
  savings: ([s, w, c]) => s * w - c,
  garden: ([r, p, e]) => r * p - e,
  crayons: ([b, c, n]) => (b * c) / n,
  laps: ([w, l, m]) => w + l * m,
  bakery: ([t, c, s, b]) => (t * c - s) / b,
  teams: ([n, k]) => n + k * n,
  pool: ([T, h, r]) => (T - h) / r,
  trip: ([m, d, w]) => m * d + w,
  store: ([q, p, P]) => P - q * p,
}
/** Each phrase's value from its numbers (in order). */
const PHRASE_SOLVE: Record<string, (n: number[]) => number> = {
  addThenTimes: ([a, b, c]) => (a + b) * c,
  timesThenAdd: ([a, b, c]) => a * b + c,
  subtractThenDivide: ([a, b, c]) => (b - a) / c,
  addToProduct: ([c, a, b]) => c + a * b,
  tripleSum: ([a, b]) => 3 * (a + b),
  doubleDifference: ([a, b]) => 2 * (a - b),
  halfSum: ([a, b]) => (a + b) / 2,
  divideThenSubtract: ([a, b, c]) => a / b - c,
  sumTimesDifference: ([a, b, c, d]) => (a + b) * (c - d),
  bracketed: ([b, c, a, d]) => d * (a + b * c),
}

function solveExpr(p: Problem): number | string | null {
  const q = p.prompt
  let m: RegExpMatchArray | null
  if ((m = q.match(/^(.+) = \?$/))) return jsValue(m[1])
  if (p.subtopic?.startsWith('write-')) {
    const want = PHRASE_SOLVE[p.subtopic.slice(6)](nums(q))
    const hits = p.options.filter((o) => Math.abs(jsValue(String(o)) - want) < 1e-9)
    return hits.length === 1 ? String(hits[0]) : null
  }
  if (p.subtopic?.startsWith('story-')) {
    const id = p.subtopic.slice(6)
    const words = q.replace(/ Which expression solves it\?$/, '')
    const want = STORY_SOLVE[id](nums(words))
    if (!Number.isInteger(want) || want <= 0) return null
    if (q.endsWith('Which expression solves it?')) {
      const hits = p.options.filter((o) => Math.abs(jsValue(String(o)) - want) < 1e-9)
      return hits.length === 1 ? String(hits[0]) : null
    }
    return want
  }
  if ((m = q.match(/how does (\d) × \(([\d,]+) \+ ([\d,]+)\) compare/))) return `It is ${m[1]} times as large`
  if (/\) ÷ 2 compare/.test(q)) return 'It is half as large'
  if ((m = q.match(/adds (\d+)\. Pattern B starts at 0 and adds (\d+)\. Each term/))) return num(m[2]) / num(m[1])
  if ((m = q.match(/adds (\d+)\. Pattern B starts at 0 and adds (\d+)\. When A is (\d+), what is B\?$/))) return (num(m[3]) / num(m[1])) * num(m[2])
  if ((m = q.match(/^Pattern A: ([\d, ]+)\. Pattern B: ([\d, ]+)\. Which/))) {
    const A = nums(m[1])
    const B = nums(m[2])
    return `(${A[A.length - 1] + A[1]}, ${B[B.length - 1] + B[1]})`
  }
  return null
}

describe('Word Problem Woods, 5th grade (g5Expr)', () => {
  for (const mode of ['expressions', 'evaluate', 'mastery'] as G5ExprMode[]) {
    it(`${mode}: answers re-solved, one right choice, clean text`, () => {
      expectAll(draw(() => makeG5ExprProvider({ mode }), `expr-${mode}`), solveExpr)
    })
  }

  it('the expression reader agrees with JavaScript, and knows the usual mistakes', () => {
    for (const s of ['3 + 4 × 5', '(6 + 4) × 5', '[2 × (9 − 4)] + 7', '48 ÷ (6 + 2)', '20 − 6 − 4', '24 ÷ 4 ÷ 2', '1,250 + 3 × 10']) expect(evalExpr(s)).toBe(jsValue(s))
    expect(mistakenValues('3 + 4 × 5')).toEqual({ leftToRight: 35, noGrouping: 23, groupsLeftToRight: 35 })
    expect(mistakenValues('2 × (8 + 7)').noGrouping).toBe(23)
    expect(firstStep('[2 × (9 − 4)] + 7')).toEqual({ l: 9, op: '−', r: 4, v: 5 })
    expect(exactValue('7 ÷ 2')).toBeNaN()
    expect(exactValue('3 − 5 + 4')).toBeNaN()
  })

  it('2 × (8 + 7) is the expression for "add 8 and 7, then multiply by 2" (5.OA.2)', () => {
    const ph = EXPR_PHRASES.find((x) => x.id === 'addThenTimes')!
    const n = { a: 8, b: 7, c: 2 }
    expect(ph.words(n)).toBe('Add 8 and 7, then multiply by 2.')
    expect(ph.right(n)).toBe('2 × (8 + 7)')
  })

  it('every story and phrase template is used, and every story template solves to a whole answer', () => {
    const ps = draw(() => makeG5ExprProvider({ mode: 'mastery' }), 'woods-cover', 2000)
    const stories = new Set(ps.map((p) => p.subtopic).filter((s) => s?.startsWith('story-')))
    expect(stories.size).toBe(WOODS_STORIES.length)
    for (const s of WOODS_STORIES) {
      for (let i = 0; i < 50; i++) {
        const n = s.make()
        const v = exactValue(s.expr(n))
        expect(Number.isInteger(v) && v > 0, `${s.id}: ${s.expr(n)}`).toBe(true)
      }
    }
  })

  it('no answer-length cue: the key is the longest choice in at most 35% of written choices', () => {
    const ps = draw(() => makeG5ExprProvider({ mode: 'expressions' }), 'woods-bias', 800).filter((p) => p.options.some((o) => typeof o === 'string' && /[a-z(]/i.test(o)))
    const longest = ps.filter((p) => p.options.filter((o) => String(o).length >= String(p.answer).length).length === 1)
    expect(longest.length / ps.length).toBeLessThanOrEqual(0.35)
  })
})

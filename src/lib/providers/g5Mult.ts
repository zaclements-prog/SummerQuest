import type { Problem, ProblemProvider } from '../problem'
import { randInt } from '../random'
import { fmt, numberOptions, pick, pow10Text, textOptions, weighted } from './g5Shared'

/**
 * 5th-grade Multiplication Mesa (K–5 plan, grade-5 contract): multi-digit
 * multiplication up to 4-digit by 2-digit with area models, partial products
 * and the standard algorithm (5.NBT.5); powers of 10 and exponents (5.NBT.2).
 * Procedural: every answer is computed, and every wrong choice is a mistake
 * 5th graders really make (zeros dropped or doubled, the second row not
 * shifted, only "tens × tens + ones × ones" added, a carry slip).
 *
 * Modes:
 * - `area`: area models (Times Grove's grade-5 mode and its stage): a missing
 *   partial product, or the total of the partial products (a visual shows the model);
 * - `algorithm`: the standard algorithm (products, the shifted second row, estimates);
 * - `powers`: powers of 10 and exponents;
 * - `practice`: algorithm and powers mixed;
 * - `mastery`: everything, said in words (the boss shows no pictures), story problems too.
 */

export type G5MultMode = 'area' | 'algorithm' | 'powers' | 'practice' | 'mastery'
export interface G5MultConfig {
  mode: G5MultMode
}

export const G5_MULT_SKILLS = {
  area: { id: 'g5-mult-area', label: 'area models and partial products' },
  algorithm: { id: 'g5-mult-algorithm', label: 'multi-digit multiplication' },
  powers: { id: 'g5-mult-powers', label: 'powers of 10 and exponents' },
} as const

const TOPIC = 'g5-multiplication'

// ── area models ─────────────────────────────────────────────────────────────

/** A number split by place value, biggest place first, zero places left out: 23 → [20, 3], 305 → [300, 5]. */
export function placeParts(n: number): number[] {
  const out: number[] = []
  let p = 1
  while (p * 10 <= n) p *= 10
  for (; p >= 1; p /= 10) {
    const d = Math.floor(n / p) % 10
    if (d) out.push(d * p)
  }
  return out
}

export interface AreaModel {
  a: number
  b: number
  /** `a` split by place value (the model's rows). */
  rows: number[]
  /** `b` split by place value (its columns). */
  cols: number[]
  /** rows × cols partial products, row-major. */
  cells: number[][]
  total: number
}

export function areaModel(a: number, b: number): AreaModel {
  const rows = placeParts(a)
  const cols = placeParts(b)
  return { a, b, rows, cols, cells: rows.map((r) => cols.map((c) => r * c)), total: a * b }
}

/** A factor with no zero digit (so its area model has a part for every place): 2 digits → 11–99. */
export function fullFactor(digits: number): number {
  let n = 0
  for (let i = 0; i < digits; i++) n = n * 10 + randInt(1, 9)
  return n
}

const lead = (n: number) => Number(String(n)[0])

/**
 * Wrong partial products for one cell r × c: one zero short (or every zero
 * dropped), one zero too many, added instead of multiplied, one group too
 * many (a skip-count slip).
 */
export function cellDistractors(r: number, c: number): number[] {
  const v = r * c
  return [v % 10 === 0 ? v / 10 : NaN, lead(r) * lead(c), v * 10, r + c, r * (lead(c) + 1) * (c / lead(c)), (lead(r) + 1) * (r / lead(r)) * c]
}

/**
 * Wrong totals for an area model: only the "matching" cells added (tens ×
 * tens + ones × ones, the classic 23 × 14 = 212), one partial product left
 * out, and an addition slip in the tens or hundreds.
 */
export function totalDistractors(m: AreaModel): number[] {
  let diag = 0
  for (let i = 0; i < Math.min(m.rows.length, m.cols.length); i++) diag += m.cells[i][i]
  const flat = m.cells.flat()
  const sorted = [...flat].sort((x, y) => y - x)
  return [diag, m.total - sorted[1], m.total - sorted[sorted.length - 1], m.total + 100, m.total - 10]
}

/** The factors for an area-model question: 2-digit × 2-digit, or (later) 3-digit × 2-digit. */
export function areaFactors(threeDigit: boolean): [number, number] {
  return [fullFactor(threeDigit ? 3 : 2), fullFactor(2)]
}

function areaCellProblem(id: string, a: number, b: number): Problem {
  const m = areaModel(a, b)
  const i = randInt(0, m.rows.length - 1)
  const j = randInt(0, m.cols.length - 1)
  const r = m.rows[i]
  const c = m.cols[j]
  const { options, answer } = numberOptions(r * c, cellDistractors(r, c))
  return {
    id,
    prompt: `In the area model for ${fmt(a)} × ${b}, what is ${fmt(r)} × ${c}?`,
    options,
    answer,
    visual: { kind: 'areaModel', rows: m.rows, cols: m.cols, cells: m.cells.map((row, x) => row.map((v, y) => (x === i && y === j ? null : v))) },
    topic: TOPIC,
    subtopic: 'area-cell',
    difficulty: m.rows.length,
    skill: { ...G5_MULT_SKILLS.area },
    hint: cellHint(r, c),
  }
}

/** "2 × 4 = 8, then one zero for the zero in 20." */
export function cellHint(r: number, c: number): string {
  const z = String(r).length - 1 + String(c).length - 1
  if (z === 0) return `${r} × ${c} is a times-table fact.`
  return `${lead(r)} × ${lead(c)} = ${lead(r) * lead(c)}, then add ${z} ${z === 1 ? 'zero' : 'zeros'}, one for each zero in ${fmt(r)} and ${fmt(c)}.`
}

function areaTotalProblem(id: string, a: number, b: number, words: boolean): Problem {
  const m = areaModel(a, b)
  const { options, answer } = numberOptions(m.total, totalDistractors(m), () => m.total + pick([-1, 1]) * 10 ** randInt(1, 2))
  const parts = m.cells.flat().map(fmt)
  const list = `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
  return {
    id,
    prompt: words ? `The partial products of ${fmt(a)} × ${b} are ${list}. What is ${fmt(a)} × ${b}?` : `Add the partial products. What is ${fmt(a)} × ${b}?`,
    options,
    answer,
    visual: words ? undefined : { kind: 'areaModel', rows: m.rows, cols: m.cols, cells: m.cells, total: null },
    topic: TOPIC,
    subtopic: 'area-total',
    difficulty: m.rows.length + 1,
    skill: { ...G5_MULT_SKILLS.area },
    hint: `Add every box: ${list}.`,
  }
}

// ── the standard algorithm ──────────────────────────────────────────────────

/** A 2-digit factor with a non-zero ones digit (so the two rows really differ). */
function twoDigit(): number {
  return randInt(1, 9) * 10 + randInt(1, 9)
}

/** Wrong products a child gets with the standard algorithm: the second row not shifted, a carry slip, only the tens row. */
export function productDistractors(a: number, b: number): number[] {
  const ones = b % 10
  const tens = Math.floor(b / 10) % 10
  const v = a * b
  const digits = String(v).length
  const k = randInt(1, Math.max(1, digits - 2))
  return [a * ones + a * tens, v + 10 ** k, v - 10 ** k, a * tens * 10, a * ones * 10]
}

function productProblem(id: string, a: number, b: number): Problem {
  const v = a * b
  const ones = b % 10
  const tens = Math.floor(b / 10)
  const { options, answer } = numberOptions(v, productDistractors(a, b), () => v + pick([-1, 1]) * 10 ** randInt(1, 3))
  return {
    id,
    prompt: `${fmt(a)} × ${b} = ?`,
    options,
    answer,
    topic: TOPIC,
    subtopic: 'product',
    difficulty: String(a).length + 1,
    skill: { ...G5_MULT_SKILLS.algorithm },
    hint: `Multiply ${fmt(a)} by ${ones}, then by ${tens * 10}, and add the two rows.`,
  }
}

function partialRowProblem(id: string): Problem {
  const a = randInt(0, 1) ? randInt(112, 989) : randInt(1012, 4989)
  const b = twoDigit()
  const tens = Math.floor(b / 10)
  const v = a * tens * 10
  const { options, answer } = numberOptions(v, [a * tens, v * 10, a * b, a * (tens + 1) * 10])
  return {
    id,
    prompt: `In the standard algorithm for ${fmt(a)} × ${b}, the second row is ${fmt(a)} × ${tens * 10}. What is it?`,
    options,
    answer,
    topic: TOPIC,
    subtopic: 'second-row',
    difficulty: 3,
    skill: { ...G5_MULT_SKILLS.algorithm },
    hint: `${fmt(a)} × ${tens} = ${fmt(a * tens)}. The ${tens * 10} has a zero, so the row ends in a zero.`,
  }
}

/** Round to the greatest place (a 3-digit number to hundreds, a 2-digit one to tens). */
export function roundGreatest(n: number): number {
  const p = 10 ** (String(n).length - 1)
  return Math.round(n / p) * p
}

function estimateProblem(id: string): Problem {
  // never exactly halfway, so there is one fair rounding
  let a = randInt(151, 949)
  while (a % 100 === 50) a = randInt(151, 949)
  let b = twoDigit()
  while (b % 10 === 5) b = twoDigit()
  const est = roundGreatest(a) * roundGreatest(b)
  const trunc = Math.floor(a / 100) * 100 * Math.floor(b / 10) * 10
  const { options, answer } = numberOptions(est, [est * 10, est / 10, trunc, roundGreatest(a) * (roundGreatest(b) + 10)])
  return {
    id,
    prompt: `Round each number, then estimate. About how much is ${a} × ${b}?`,
    options,
    answer,
    topic: TOPIC,
    subtopic: 'estimate',
    difficulty: 2,
    skill: { ...G5_MULT_SKILLS.algorithm },
    hint: `${a} rounds to ${roundGreatest(a)} and ${b} rounds to ${roundGreatest(b)}. Multiply those.`,
  }
}

// ── powers of 10 ────────────────────────────────────────────────────────────

type PowerKind = 'value' | 'digitTimes' | 'numberTimes' | 'divide' | 'zeros' | 'name' | 'repeated'

function powersProblem(id: string, kind: PowerKind = pick(['value', 'digitTimes', 'numberTimes', 'divide', 'zeros', 'name', 'repeated'] as const)): Problem {
  const base = { id, topic: TOPIC, subtopic: `powers-${kind}`, difficulty: 2, skill: { ...G5_MULT_SKILLS.powers } }
  switch (kind) {
    case 'value': {
      const n = randInt(2, 6)
      return {
        ...base,
        prompt: `What is ${pow10Text(n)}?`,
        ...numberOptions(10 ** n, [10 * n, 10 ** (n - 1), 10 ** (n + 1)]),
        hint: `${pow10Text(n)} means ${n} tens multiplied together: a 1 with ${n} zeros.`,
      }
    }
    case 'digitTimes': {
      const d = randInt(2, 9)
      const n = randInt(2, 5)
      return {
        ...base,
        prompt: `${d} × ${pow10Text(n)} = ?`,
        ...numberOptions(d * 10 ** n, [d * 10 ** (n - 1), d * 10 ** (n + 1), d * n, d * n * 10]),
        hint: `${pow10Text(n)} is ${fmt(10 ** n)}, so write ${d} and then ${n} zeros.`,
      }
    }
    case 'numberTimes': {
      const m = twoDigit()
      const n = randInt(1, 3)
      return {
        ...base,
        prompt: `${m} × ${fmt(10 ** n)} = ?`,
        ...numberOptions(m * 10 ** n, [m * 10 ** (n - 1), m * 10 ** (n + 1), m + 10 ** n]),
        hint: `Each × 10 moves every digit one place to the left. ${fmt(10 ** n)} has ${n} ${n === 1 ? 'zero' : 'zeros'}.`,
      }
    }
    case 'divide': {
      const m = twoDigit()
      const n = randInt(1, 3)
      return {
        ...base,
        prompt: `${fmt(m * 10 ** n)} ÷ ${fmt(10 ** n)} = ?`,
        ...numberOptions(m, [m * 10, m * 10 ** n - 10 ** n, m + 10]),
        hint: `Dividing by ${fmt(10 ** n)} moves every digit ${n} ${n === 1 ? 'place' : 'places'} to the right.`,
      }
    }
    case 'zeros': {
      const n = randInt(2, 7)
      return {
        ...base,
        prompt: `How many zeros does ${pow10Text(n)} have when you write it as a number?`,
        ...numberOptions(n, [n + 1, n - 1, 10 * n]),
        hint: `The exponent ${n} tells how many tens are multiplied, and each one adds a zero.`,
      }
    }
    case 'name': {
      const n = randInt(2, 5)
      return {
        ...base,
        prompt: `Which power of 10 is ${fmt(10 ** n)}?`,
        ...textOptions(pow10Text(n), [pow10Text(n + 1), pow10Text(n - 1), pow10Text(n + 2)]),
        hint: `Count the zeros in ${fmt(10 ** n)}.`,
      }
    }
    case 'repeated': {
      const n = randInt(3, 5)
      return {
        ...base,
        prompt: `Which is the same as ${Array.from({ length: n }, () => '10').join(' × ')}?`,
        ...textOptions(pow10Text(n), [String(10 * n), pow10Text(n - 1), pow10Text(n + 1)]),
        hint: `Count the tens being multiplied: that is the exponent.`,
      }
    }
  }
}

// ── story problems (the boss) ───────────────────────────────────────────────

interface MultStory {
  a: [number, number]
  b: [number, number]
  text: (a: string, b: string) => string
}

/** Multiplication stories (5.NBT.5 in context): `a` and `b` ranges, the story asks for a × b. */
export const MULT_STORIES: MultStory[] = [
  { a: [12, 48], b: [16, 38], text: (a, b) => `A theater has ${a} rows with ${b} seats in each row. How many seats are there in all?` },
  { a: [124, 486], b: [12, 48], text: (a, b) => `An orchard ships ${a} boxes of apples with ${b} apples in each box. How many apples does it ship?` },
  { a: [24, 96], b: [365, 365], text: (a, b) => `A bakery bakes ${a} loaves of bread every day. How many loaves does it bake in ${b} days?` },
  { a: [1125, 2475], b: [24, 68], text: (a, b) => `A stadium has ${b} sections, and each section has ${a} seats. How many seats does the stadium have?` },
  { a: [125, 475], b: [24, 72], text: (a, b) => `A school orders ${b} packs of pencils with ${a} pencils in each pack. How many pencils does it order?` },
  { a: [1150, 3850], b: [12, 28], text: (a, b) => `A ferry carries ${a} people on each trip. It makes ${b} trips in a week. How many people does it carry that week?` },
  { a: [2150, 4850], b: [14, 31], text: (a, b) => `A runner trains ${a} meters a day for ${b} days. How many meters is that in all?` },
  { a: [215, 865], b: [15, 45], text: (a, b) => `A beekeeper has ${b} hives. Each hive makes ${a} grams of honey. How many grams of honey is that?` },
  { a: [36, 88], b: [125, 375], text: (a, b) => `A library puts ${b} books on each of its ${a} shelves. How many books fit on the shelves?` },
  { a: [1012, 1985], b: [21, 52], text: (a, b) => `A factory makes ${a} toy cars every hour. How many does it make in ${b} hours?` },
]

function storyProblem(id: string): Problem {
  const s = pick(MULT_STORIES)
  let a = randInt(s.a[0], s.a[1])
  let b = randInt(s.b[0], s.b[1])
  // the multiplier (2-digit side) keeps a non-zero ones digit, so the shifted row matters
  if (b < 100 && b % 10 === 0) b += 1
  if (a < 100 && a % 10 === 0) a += 1
  const [big, small] = a >= b ? [a, b] : [b, a]
  const v = a * b
  const { options, answer } = numberOptions(v, small < 100 ? productDistractors(big, small) : [v + 1000, v - 100, v * 10], () => v + pick([-1, 1]) * 10 ** randInt(1, 3))
  return {
    id,
    prompt: s.text(fmt(a), fmt(b)),
    options,
    answer,
    topic: TOPIC,
    subtopic: 'story',
    difficulty: 4,
    skill: { ...G5_MULT_SKILLS.algorithm },
    hint: `Equal groups: multiply ${fmt(big)} × ${fmt(small)}.`,
  }
}

// ── the provider ────────────────────────────────────────────────────────────

export function makeG5MultProvider(cfg: G5MultConfig): ProblemProvider {
  let serial = 0
  const nextId = () => `g5mult-${cfg.mode}-${serial++}`
  const area = (id: string) => (Math.random() < 0.6 ? areaCellProblem(id, ...areaFactors(Math.random() < 0.3)) : areaTotalProblem(id, ...areaFactors(Math.random() < 0.3), false))
  const algorithm = (id: string) => {
    const k = weighted([
      ['product', 0.55],
      ['row', 0.2],
      ['estimate', 0.25],
    ] as const)
    if (k === 'row') return partialRowProblem(id)
    if (k === 'estimate') return estimateProblem(id)
    return productProblem(id, Math.random() < 0.55 ? randInt(112, 989) : randInt(1012, 4989), twoDigit())
  }
  return {
    topic: TOPIC,
    next(): Problem {
      const id = nextId()
      switch (cfg.mode) {
        case 'area':
          return area(id)
        case 'algorithm':
          return algorithm(id)
        case 'powers':
          return powersProblem(id)
        case 'practice':
          return Math.random() < 0.6 ? algorithm(id) : powersProblem(id)
        case 'mastery': {
          const k = weighted([
            ['product', 0.3],
            ['story', 0.3],
            ['powers', 0.2],
            ['area', 0.1],
            ['estimate', 0.1],
          ] as const)
          if (k === 'story') return storyProblem(id)
          if (k === 'powers') return powersProblem(id)
          if (k === 'area') return areaTotalProblem(id, ...areaFactors(true), true)
          if (k === 'estimate') return estimateProblem(id)
          return productProblem(id, Math.random() < 0.5 ? randInt(112, 989) : randInt(1012, 9989), twoDigit())
        }
      }
    },
  }
}

/** For tests and the lesson: one problem of a given shape. */
export const g5MultMakers = { areaCellProblem, areaTotalProblem, productProblem, partialRowProblem, estimateProblem, powersProblem, storyProblem }

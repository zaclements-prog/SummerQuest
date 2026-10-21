import { compare, decimalText, fromDecimal, isInteger, mul, rat, int, ONE, type Rational } from '../numbers'
import { contentBand, isListenBand } from '../gradeBand'
import type { GateOp } from './ops'
import { applyOp } from './ops'
import type { OpSetId, TrapKind } from './types'

/**
 * The pair templates ("makers") and tuning of every operation set. A maker
 * builds two operations for the current count in one of three modes:
 *
 * - `normal`: an honest comparison; which kind wins is a coin flip that the
 *   count may refuse (a + can only beat ×3 while the crowd is small), so the
 *   best gate depends on the state and no operation always wins;
 * - `tie`: both gates give the same count ("both work!");
 * - `trap`: built from a misconception (see `TrapKind`).
 *
 * Makers only propose; `generate.ts` checks every guarantee.
 */

export type Mode = 'normal' | 'tie' | 'trap'

export interface MakerCtx {
  n: number
  /** Largest allowed result for this attempt (soft ceiling or hard cap). */
  cap: number
  floor: number
  maxFactor: number
  addMax: number
  subMax: number
  /** Rough minimum separation to aim for (the generator checks the exact rule). */
  gap: number
  mode: Mode
  rng: () => number
}

export interface Maker {
  id: string
  weight: number
  modes: readonly Mode[]
  make: (c: MakerCtx) => [GateOp, GateOp] | null
}

export interface OpSetConfig {
  id: OpSetId
  /** Hard count cap for the band. */
  cap: number
  maxFactor: number
  addMax: number
  subMax: number
  /** Share of pairs that are deliberate ties. */
  tieRate: number
  /** Share of pairs built from a misconception. */
  trapRate: number
  /** Minimum gap by difficulty: max(abs, ⌈rel × larger result⌉). */
  gapAbs: readonly [number, number, number]
  gapRel: readonly [number, number, number]
  /** Maximum gap by difficulty, as a share of the larger result (keeps later pairs close). */
  maxRel: readonly [number, number, number]
  makers: readonly Maker[]
}

// ── tiny helpers ────────────────────────────────────────────────────────────

/** A uniform integer in [lo, hi], or null when the range is empty. */
function ri(c: MakerCtx, lo: number, hi: number): number | null {
  lo = Math.ceil(lo)
  hi = Math.floor(hi)
  return lo > hi ? null : lo + Math.floor(c.rng() * (hi - lo + 1))
}
function pick<T>(c: MakerCtx, xs: readonly T[]): T | null {
  return xs.length ? xs[Math.floor(c.rng() * xs.length)] : null
}
function range(lo: number, hi: number): number[] {
  const out: number[] = []
  for (let k = lo; k <= hi; k++) out.push(k)
  return out
}
const coin = (c: MakerCtx) => c.rng() < 0.5

const A = (k: number): GateOp => ({ kind: 'add', k })
const S = (k: number): GateOp => ({ kind: 'sub', k })
const M = (k: number): GateOp => ({ kind: 'mul', k })
const D = (k: number): GateOp => ({ kind: 'div', k })
const scale = (r: Rational, form: 'fraction' | 'decimal'): GateOp => ({ kind: 'scale', r, form })
const join = (r: Rational, form: 'fraction' | 'decimal'): GateOp => ({ kind: 'join', r, form })

/** n × r as a whole number, or null. */
function wholeTimes(n: number, r: Rational): number | null {
  const v = mul(int(n), r)
  return isInteger(v) ? v.n : null
}

// ── makers ──────────────────────────────────────────────────────────────────

const addAdd: Maker = {
  id: 'addAdd',
  weight: 1,
  modes: ['normal'],
  make(c) {
    const hi = Math.min(c.addMax, c.cap - c.n)
    const a = ri(c, 1, hi)
    const b = ri(c, 1, hi)
    return a === null || b === null || a === b ? null : [A(a), A(b)]
  },
}

/** K–1: one gate makes exactly 10 ("+4 at 6"). */
const makeTen: Maker = {
  id: 'makeTen',
  weight: 3,
  modes: ['normal'],
  make(c) {
    if (c.n >= 10) return null
    const a = 10 - c.n
    const b = ri(c, 1, Math.min(c.addMax, c.cap - c.n))
    return b === null || b === a || 10 > c.cap ? null : [A(a), A(b)]
  },
}

/** K–1 trap: "+2" vs "−5" (the bigger digit takes friends away). */
const addVsSub: Maker = {
  id: 'addVsSub',
  weight: 2,
  modes: ['trap'],
  make(c) {
    const a = ri(c, 1, Math.min(4, c.cap - c.n))
    if (a === null) return null
    const b = ri(c, a + 1, Math.min(c.subMax, c.n - c.floor))
    return b === null ? null : [A(a), S(b)]
  },
}

/** "×k" vs "+m": the state-dependent heart of grades 2–4. */
const mulAdd: Maker = {
  id: 'mulAdd',
  weight: 8,
  modes: ['normal', 'tie', 'trap'],
  make(c) {
    // times-table facts on a small crowd; doubling and tripling on a bigger one
    const kTop = c.n <= 12 ? c.maxFactor : c.n <= 25 ? Math.min(3, c.maxFactor) : 2
    const ks = range(2, kTop).filter((k) => c.n * k <= c.cap)
    const addHi = Math.min(c.addMax, c.cap - c.n)
    if (c.mode === 'tie') {
      const k = pick(c, ks)
      if (k === null) return null
      const m = c.n * (k - 1)
      return m >= 1 && m <= addHi ? [M(k), A(m)] : null
    }
    if (c.mode === 'trap') {
      // a big × on a small crowd loses to a +
      const k = pick(c, ks.filter((x) => x >= 3))
      if (k === null) return null
      const m = ri(c, c.n * (k - 1) + c.gap, addHi)
      return m === null ? null : [M(k), A(m)]
    }
    if (coin(c)) {
      const k = pick(c, ks)
      if (k === null) return null
      const m = ri(c, 1, Math.min(addHi, c.n * (k - 1) - c.gap))
      return m === null ? null : [M(k), A(m)]
    }
    const k = pick(c, ks.filter((x) => x === 2))
    if (k === null) return null
    const m = ri(c, c.n * (k - 1) + c.gap, addHi)
    return m === null ? null : [M(k), A(m)]
  },
}

/** "+m" vs "+k" once the crowd is too big to double under the cap (and only then). */
const addAddBig: Maker = {
  id: 'addAddBig',
  weight: 1,
  modes: ['normal'],
  make(c) {
    return c.n * 2 <= c.cap ? null : addAdd.make(c)
  },
}

const mulMul: Maker = {
  id: 'mulMul',
  weight: 1,
  modes: ['normal'],
  make(c) {
    const ks = range(2, c.n <= 12 ? c.maxFactor : 3).filter((k) => c.n * k <= c.cap)
    const a = pick(c, ks)
    const b = pick(c, ks)
    return a === null || b === null || a === b ? null : [M(a), M(b)]
  },
}

function divisors(c: MakerCtx): number[] {
  return range(2, c.maxFactor).filter((k) => c.n % k === 0 && c.n / k >= c.floor)
}

/** "÷k" vs "−m": which keeps more friends? */
const divSub: Maker = {
  id: 'divSub',
  weight: 7,
  modes: ['normal', 'tie'],
  make(c) {
    const subHi = Math.min(c.subMax, c.n - c.floor)
    const ks = divisors(c)
    if (c.mode === 'tie') {
      const k = pick(c, ks)
      if (k === null) return null
      const loss = c.n - c.n / k
      return loss >= 1 && loss <= subHi ? [D(k), S(loss)] : null
    }
    if (coin(c)) {
      // ÷ keeps more: only a big take-away loses to a split
      const k = pick(c, ks.filter((x) => c.n - c.n / x + c.gap <= subHi))
      if (k === null) return null
      const m = ri(c, c.n - c.n / k + c.gap, subHi)
      return m === null ? null : [D(k), S(m)]
    }
    // − keeps more (a take-away never swallows most of the parade here)
    const k = pick(c, ks)
    if (k === null) return null
    const m = ri(c, 1, Math.min(subHi, Math.round(c.n * 0.8), c.n - c.n / k - c.gap))
    return m === null ? null : [D(k), S(m)]
  },
}

/** Trap: "÷2" vs "÷4" (the bigger divisor keeps fewer). */
const divDiv: Maker = {
  id: 'divDiv',
  weight: 1,
  modes: ['trap'],
  make(c) {
    const ks = divisors(c)
    const a = pick(c, ks)
    const b = pick(c, ks)
    return a === null || b === null || a === b ? null : [D(a), D(b)]
  },
}

const subSub: Maker = {
  id: 'subSub',
  weight: 1,
  modes: ['normal'],
  make(c) {
    const hi = Math.min(c.subMax, c.n - c.floor, Math.round(c.n * 0.6))
    const a = ri(c, 1, hi)
    const b = ri(c, 1, hi)
    return a === null || b === null || a === b ? null : [S(a), S(b)]
  },
}

const HALF = rat(1, 2)

/** "×½" (or ×0.5) vs "−m": halving is a shrink, not a growth. */
function halfSub(form: 'fraction' | 'decimal'): Maker {
  return {
    id: form === 'decimal' ? 'pointFiveSub' : 'halfSub',
    weight: 1,
    modes: ['normal', 'tie', 'trap'],
    make(c) {
      if (c.n % 2 !== 0 || c.n / 2 < c.floor) return null
      const loss = c.n / 2
      const subHi = Math.min(c.subMax, c.n - c.floor)
      if (c.mode === 'tie') return loss <= subHi ? [scale(HALF, form), S(loss)] : null
      // trap: ×½ loses to a small take-away; normal: ×½ beats a big one
      const m = c.mode === 'trap' ? ri(c, 1, Math.min(subHi, loss - c.gap)) : ri(c, loss + c.gap, subHi)
      return m === null ? null : [scale(HALF, form), S(m)]
    },
  }
}

/** "+¾ of us" vs "+m". */
function joinAdd(rs: readonly [Rational, 'fraction' | 'decimal'][]): Maker {
  return {
    id: 'joinAdd',
    weight: 3,
    modes: ['normal', 'tie'],
    make(c) {
      const opts = rs.filter(([r]) => {
        const g = wholeTimes(c.n, r)
        return g !== null && g >= 1 && c.n + g <= c.cap
      })
      const choice = pick(c, opts)
      if (!choice) return null
      const [r, form] = choice
      const gain = wholeTimes(c.n, r)!
      const addHi = Math.min(c.addMax, c.cap - c.n)
      if (c.mode === 'tie') return gain <= addHi ? [join(r, form), A(gain)] : null
      const m = coin(c) ? ri(c, 1, Math.min(addHi, gain - c.gap)) : ri(c, gain + c.gap, addHi)
      return m === null ? null : [join(r, form), A(m)]
    },
  }
}

const UNIT = [2, 3, 4, 5, 6]

/** Trap: "+⅓ of us" vs "+½ of us" (a bigger denominator is a smaller piece). */
const joinJoinUnit: Maker = {
  id: 'joinJoinUnit',
  weight: 2,
  modes: ['trap'],
  make(c) {
    const ds = UNIT.filter((d) => c.n % d === 0 && c.n + c.n / d <= c.cap)
    const a = pick(c, ds)
    const b = pick(c, ds)
    return a === null || b === null || a === b ? null : [join(rat(1, a), 'fraction'), join(rat(1, b), 'fraction')]
  },
}

/** Trap (keep): "×⅓" vs "×¼". */
const scaleScaleUnit: Maker = {
  id: 'scaleScaleUnit',
  weight: 1,
  modes: ['trap'],
  make(c) {
    const ds = UNIT.filter((d) => c.n % d === 0 && c.n / d >= c.floor)
    const a = pick(c, ds)
    const b = pick(c, ds)
    return a === null || b === null || a === b ? null : [scale(rat(1, a), 'fraction'), scale(rat(1, b), 'fraction')]
  },
}

const DEC = (s: string) => fromDecimal(s)

/** "×1.5" vs "+m". */
const decAdd: Maker = {
  id: 'decAdd',
  weight: 3,
  modes: ['normal', 'tie'],
  make(c) {
    const ds = ['1.5', '2.5', '1.25', '1.75'].map(DEC).filter((d) => {
      const v = wholeTimes(c.n, d)
      return v !== null && v <= c.cap
    })
    const d = pick(c, ds)
    if (!d) return null
    const gain = wholeTimes(c.n, d)! - c.n
    const addHi = Math.min(c.addMax, c.cap - c.n)
    if (c.mode === 'tie') return gain >= 1 && gain <= addHi ? [scale(d, 'decimal'), A(gain)] : null
    const m = coin(c) ? ri(c, 1, Math.min(addHi, gain - c.gap)) : ri(c, gain + c.gap, addHi)
    return m === null ? null : [scale(d, 'decimal'), A(m)]
  },
}

/** Trap: decimals where the longer one is smaller ("×0.25" vs "×0.5", "×1.25" vs "×1.5"). */
const LONG_SHORT: [string, string][] = [
  ['0.25', '0.5'],
  ['1.25', '1.5'],
  ['2.25', '2.5'],
  ['1.75', '2.5'],
  ['0.75', '1.5'],
]
const decDecLong: Maker = {
  id: 'decDecLong',
  weight: 2,
  modes: ['trap'],
  make(c) {
    const ok = LONG_SHORT.map(([a, b]) => [DEC(a), DEC(b)] as const).filter(([a, b]) => {
      const va = wholeTimes(c.n, a)
      const vb = wholeTimes(c.n, b)
      return va !== null && vb !== null && va >= c.floor && vb >= c.floor && va <= c.cap && vb <= c.cap
    })
    const p = pick(c, ok)
    return p ? [scale(p[0], 'decimal'), scale(p[1], 'decimal')] : null
  },
}

/** Trap: "+0.25 of us" vs "+0.5 of us". */
const joinDecLong: Maker = {
  id: 'joinDecLong',
  weight: 1,
  modes: ['trap'],
  make(c) {
    if (c.n % 4 !== 0 || c.n + c.n / 2 > c.cap) return null
    return [join(DEC('0.25'), 'decimal'), join(DEC('0.5'), 'decimal')]
  },
}

// ── trap detection (the generator's source of truth) ──────────────────────────

const isUnitFraction = (op: GateOp) => (op.kind === 'scale' || op.kind === 'join') && op.form === 'fraction' && op.r.n === 1

/** The misconception a decided pair tests, if any. */
export function detectTrap(winner: GateOp, loser: GateOp): TrapKind | null {
  if (winner.kind === 'add' && loser.kind === 'sub' && loser.k > winner.k) return 'bigDigit'
  if (loser.kind === 'mul' && winner.kind === 'add' && loser.k >= 3) return 'timesAlwaysWins'
  if (winner.kind === 'div' && loser.kind === 'div') return 'bigDivisor'
  if (loser.kind === 'scale' && compare(loser.r, ONE) < 0 && (winner.kind === 'sub' || winner.kind === 'add')) return 'timesFractionShrinks'
  if (winner.kind === loser.kind && isUnitFraction(winner) && isUnitFraction(loser)) return 'bigDenominator'
  if ((winner.kind === 'scale' || winner.kind === 'join') && winner.kind === loser.kind && winner.form === 'decimal' && loser.form === 'decimal') {
    const w = decimalText(winner.r) ?? ''
    const l = decimalText(loser.r) ?? ''
    if (l.length > w.length) return 'longDecimal'
  }
  return null
}

/** The exact result, when it is a whole number (else null). */
export function wholeResult(op: GateOp, n: number): number | null {
  const v = applyOp(op, n)
  return isInteger(v) ? v.n : null
}

// ── the sets ────────────────────────────────────────────────────────────────

const FRACTIONS: [Rational, 'fraction'][] = [rat(1, 2), rat(1, 3), rat(1, 4), rat(3, 4), rat(2, 3)].map((r) => [r, 'fraction'])
const MIXED_FORMS: [Rational, 'fraction' | 'decimal'][] = [
  [rat(1, 2), 'fraction'],
  [rat(1, 4), 'fraction'],
  [rat(3, 4), 'fraction'],
  [rat(1, 3), 'fraction'],
  [DEC('0.5'), 'decimal'],
  [DEC('0.25'), 'decimal'],
  [DEC('0.75'), 'decimal'],
]

export const OP_SETS: Record<OpSetId, OpSetConfig> = {
  addSub: {
    id: 'addSub',
    cap: 20,
    maxFactor: 2,
    addMax: 4,
    subMax: 6,
    tieRate: 0,
    trapRate: 0.15,
    gapAbs: [2, 1, 1],
    gapRel: [0, 0, 0],
    maxRel: [1, 1, 1],
    makers: [{ ...addAdd, weight: 6 }, makeTen, addVsSub],
  },
  mulAdd: {
    id: 'mulAdd',
    // within 100 for 2nd grade (the plan passes the lower cap); 3rd graders double past it
    cap: 200,
    maxFactor: 9,
    addMax: 40,
    subMax: 20,
    tieRate: 0.08,
    trapRate: 0.25,
    gapAbs: [4, 3, 2],
    gapRel: [0.15, 0.1, 0.05],
    maxRel: [1, 0.75, 0.6],
    makers: [mulAdd, mulMul, addAddBig],
  },
  divSub: {
    id: 'divSub',
    cap: 100,
    maxFactor: 9,
    addMax: 20,
    subMax: 40,
    tieRate: 0.06,
    trapRate: 0.2,
    gapAbs: [3, 2, 1],
    gapRel: [0.15, 0.1, 0.05],
    maxRel: [1, 0.8, 0.65],
    makers: [divSub, divDiv, subSub],
  },
  mulFrac: {
    id: 'mulFrac',
    cap: 300,
    maxFactor: 9,
    addMax: 60,
    subMax: 40,
    tieRate: 0.06,
    trapRate: 0.25,
    gapAbs: [4, 3, 2],
    gapRel: [0.12, 0.08, 0.04],
    maxRel: [1, 0.75, 0.6],
    makers: [{ ...mulAdd, weight: 3 }, joinAdd(FRACTIONS), joinJoinUnit, scaleScaleUnit, halfSub('fraction')],
  },
  fracDec: {
    id: 'fracDec',
    cap: 999,
    maxFactor: 9,
    addMax: 100,
    subMax: 60,
    tieRate: 0.06,
    trapRate: 0.25,
    gapAbs: [4, 3, 2],
    gapRel: [0.12, 0.08, 0.04],
    maxRel: [1, 0.75, 0.6],
    makers: [decAdd, { ...joinAdd(MIXED_FORMS), weight: 2 }, { ...mulAdd, weight: 1 }, decDecLong, joinDecLong, joinJoinUnit, halfSub('decimal')],
  },
}

/** Which zone a parade stage belongs to: Multiplication Mesa (×) or Division Dunes (÷ and −). */
export type OpFamily = 'mul' | 'div'

/**
 * The operation set for a zone family and a grade (0 = K … 5):
 * K–1 → dots add/sub; 2–3 → × and + (or ÷ and −); 4 → harder × plus fraction
 * operators (or harder ÷); 5 → fraction and decimal operators.
 */
export function opSetFor(family: OpFamily, grade: number): OpSetId {
  const band = contentBand(grade)
  if (isListenBand(band)) return 'addSub'
  if (band === 'g5') return 'fracDec'
  if (family === 'div') return 'divSub'
  return grade >= 4 ? 'mulFrac' : 'mulAdd'
}

/** Largest × / ÷ factor by grade (2nd graders stay with 2–5). */
export function maxFactorFor(opSet: OpSetId, grade: number): number {
  if (opSet === 'addSub') return OP_SETS.addSub.maxFactor
  if (grade <= 2) return 5
  if (opSet === 'divSub' && grade >= 4) return 12
  return OP_SETS[opSet].maxFactor
}

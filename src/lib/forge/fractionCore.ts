import type { Problem } from '../problem'

/**
 * Pure logic for the Fraction Forge (docs/superpowers/specs/
 * 2026-10-16-fraction-forge-design.md). No three.js, no DOM: the mechanics are
 * unit-tested here before anything renders.
 *
 * A recipe strip shows `a/b`; the gauge is a same-length bar cut into `d`
 * empty cells; trays hold `n` slabs of `1/d`. The tray whose count fills the
 * gauge EXACTLY to the recipe's shade is the answer (`a·(d/b)` slabs).
 */

export interface FracRound {
  baseNum: number
  baseDenom: number
  targetDenom: number
  /** How many `1/targetDenom` slabs equal `baseNum/baseDenom` — the answer. */
  targetNum: number
  factId?: string
  /**
   * Grade 5's unlike-denominators mode only: the recipe's two parts (`a/b + c/d`,
   * drawn end to end) and the slab sizes the gauge offers. The classic mode never sets them.
   */
  parts?: readonly [FracPart, FracPart]
  gauges?: readonly number[]
}

export interface FracPart {
  num: number
  denom: number
}

/** A provider Problem (prompt `${a}/${b} = ?/${d}`) → forge round numbers. */
export function parseFracEqRound(p: Pick<Problem, 'prompt' | 'answer' | 'factId'>): FracRound {
  const m = /^(\d+)\s*\/\s*(\d+)\s*=\s*\?\s*\/\s*(\d+)$/.exec(p.prompt)
  if (!m) throw new Error(`not a fraction-equivalence problem: ${p.prompt}`)
  const baseNum = Number(m[1])
  const baseDenom = Number(m[2])
  const targetDenom = Number(m[3])
  const targetNum = Number(p.answer)
  if (!Number.isInteger(targetNum) || targetDenom % baseDenom !== 0 || targetNum !== baseNum * (targetDenom / baseDenom)) {
    throw new Error(`not a whole equivalence: ${p.prompt} → ${p.answer}`)
  }
  return { baseNum, baseDenom, targetDenom, targetNum, factId: p.factId }
}

export type FillState = 'short' | 'exact' | 'over'

/** Where a tray's count lands against the recipe: the visual + the copy. */
export function fillState(chosen: number, target: number): FillState {
  return chosen < target ? 'short' : chosen > target ? 'over' : 'exact'
}

/**
 * The forge is a *model* of equivalence, so its facts are bounded for
 * legibility regardless of how wide the grade tier makes fractions: the gauge
 * must show `d` cells that a child can still count at play distance (G4 widens
 * equivalence to /16).
 */
export const FORGE_LIMITS = { denomMax: 12 } as const

/**
 * The denominators a grade's forge orders may use: the standards' own lists.
 * Up to 3rd grade 2, 3, 4, 6 and 8 (3.NF; 2nd grade's /8 ceiling only reaches
 * halves, thirds and fourths doubled); 4th grade adds fifths, tenths and
 * twelfths (4.NF.1; never ninths). 5th grade plays the unlike-denominator forge.
 */
export function forgeDenominators(grade: number): readonly number[] {
  return grade <= 3 ? [2, 3, 4, 6, 8] : [2, 3, 4, 5, 6, 8, 10, 12]
}

/** Grade's equivalence denominator ceiling → forge-bounded provider config (never harder than the grade). */
export function forgeFactConfig(tierDenomMax: number, denominators?: readonly number[]) {
  // The gauge prints the target denominator on the order, so the forge only asks
  // the blank-the-top scale-up shape (the provider's wider shapes are for quizzes).
  return { maxDenominator: Math.min(FORGE_LIMITS.denomMax, Math.max(2, tierDenomMax)), shapes: ['numUp'] as const, ...(denominators ? { denominators } : {}) }
}

/** A grade's classic forge facts: the tier's ceiling, bounded by the gauge, on the grade's denominator list. */
export function forgeFactConfigForGrade(grade: number, tierDenomMax: number) {
  return forgeFactConfig(tierDenomMax, forgeDenominators(grade))
}

/** Slab centers for an `n`-slab row of total length `span`, centered on 0. */
export function slabOffsets(n: number, span: number): number[] {
  if (n <= 0) return []
  if (n === 1) return [0]
  const step = span / n
  return Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * step)
}

export const ROUNDS = 5

/** Stars from clean first-try clears: the arena's 20 / 60 / 100 % shape, any round count. */
export function forgeStarThresholds(total: number): [number, number, number] {
  return [Math.max(1, Math.ceil(total * 0.2)), Math.ceil(total * 0.6), total]
}

export function forgeStars(correctFirstTry: number, total: number): number {
  const [t1, t2, t3] = forgeStarThresholds(total)
  return correctFirstTry >= t3 ? 3 : correctFirstTry >= t2 ? 2 : correctFirstTry >= t1 ? 1 : 0
}

// ── Fun pass: the kid BUILDS the answer (docs/superpowers/specs/2026-10-17-mini-games-fun-pass.md)
//
// The press stamps one `1/d` slab at a time onto the kid's stack; the Beaver
// eats the top one if they stamped too many; walking onto the mold table pours
// the whole stack into the candy mold. The mold is exactly the recipe's length
// (`a/b` of the bar), so the pour fills it EXACTLY, stops SHORT (the slabs stay
// and the gap shows: stamp the rest), or goes OVER (the extras spill off the
// gate and the mold tips out: stamp again). Every pour is one recorded answer.

/** The tallest stack the press will build (a pile the creature can still carry). */
export const MAX_STACK = 16

/** Stamp (+1) or nibble (−1) a stack, clamped to 0..MAX_STACK. */
export function stampStack(stack: number, delta: number): number {
  return Math.min(MAX_STACK, Math.max(0, stack + delta))
}

export interface PourOutcome {
  state: FillState
  /** Slabs in the mold once the pour lands (before any tip-out). */
  total: number
  /** Slabs that sit inside the mold (≤ target). */
  fitted: number
  /** Slabs past the gate that tumble off (over only). */
  spill: number
  /** Empty cells left before the gate (short only). */
  gap: number
  /** What stays in the mold for the next pour: all of it (short), the full
   *  candy (exact), nothing (over: the mold tips out and the kid restamps). */
  moldAfter: number
}

/** Pour `poured` slabs onto a mold already holding `mold`, for a recipe needing `target`. */
export function pourOutcome(mold: number, poured: number, target: number): PourOutcome {
  const total = Math.max(0, mold) + Math.max(0, poured)
  const state = fillState(total, target)
  return {
    state,
    total,
    fitted: Math.min(total, target),
    spill: Math.max(0, total - target),
    gap: Math.max(0, target - total),
    moldAfter: state === 'over' ? 0 : total,
  }
}

export type ForgeRoundKind = 'warmup' | 'rush' | 'finale'

export interface ForgeRoundSpec {
  kind: ForgeRoundKind
  /** Candies in this round (the finale's big customer orders two, back to back). */
  orders: number
  /** Ruler ticks under the recipe: shown in warm-ups, faded later (concreteness
   *  fading). They come back as a hint after a miss. */
  grid: boolean
  /** The customer's patience in seconds. Bonus only: running out never fails. */
  patienceSec: number
}

/**
 * The run arc: 2 warm-ups (ruler shown, patient customers) → rush orders (no
 * ruler, quicker customers) → a finale (the Big Bear's two-candy order, one
 * shared patience meter). `rounds` is the stage's `params.rounds`.
 */
export function forgeRunPlan(rounds: number): ForgeRoundSpec[] {
  const n = Math.max(1, Math.floor(rounds))
  const warm: ForgeRoundSpec = { kind: 'warmup', orders: 1, grid: true, patienceSec: 45 }
  const rush: ForgeRoundSpec = { kind: 'rush', orders: 1, grid: false, patienceSec: 30 }
  const finale: ForgeRoundSpec = { kind: 'finale', orders: 2, grid: false, patienceSec: 60 }
  if (n === 1) return [warm]
  if (n === 2) return [warm, finale]
  return [warm, warm, ...Array.from({ length: n - 3 }, () => rush), finale]
}

/** Answers a run asks for (= the stars denominator). */
export function forgeProblemCount(plan: ForgeRoundSpec[]): number {
  return plan.reduce((s, r) => s + r.orders, 0)
}

export interface RunScore {
  base: number
  streak: number
  speed: number
  total: number
}

export const SCORE = { first: 100, retry: 50, streakStep: 20, streakCap: 100, speedMax: 50 } as const

/**
 * Points for one served candy: base (first pour / a later pour) + streak bonus
 * (`streak` = clean serves in a row INCLUDING this one) + speed bonus from the
 * patience left (0..1).
 */
export function forgeScore({ firstTry, streak, patienceLeft }: { firstTry: boolean; streak: number; patienceLeft: number }): RunScore {
  const base = firstTry ? SCORE.first : SCORE.retry
  const s = firstTry ? Math.min(SCORE.streakCap, SCORE.streakStep * Math.max(0, streak - 1)) : 0
  const speed = Math.round(SCORE.speedMax * Math.min(1, Math.max(0, patienceLeft)))
  return { base, streak: s, speed, total: base + s + speed }
}

// ── Grade 5: unlike denominators on the gauge (5.NF.1) ───────────────────────
//
// A grade-5 stage (`params.mode: 'unlike'`) orders `a/b + c/d`: two flavours of
// candy laid end to end on the recipe bar, the mold exactly as long as both.
// Before stamping, the kid sets the press's GAUGE to a slab size `1/D`: only a
// common denominator cuts both parts into whole slabs. The least one is the one
// right chip; the others are the classic slips (adding the denominators, or
// keeping one of them). Then the round plays as the classic one in `D`ths:
// `a/b + c/d = (aD/b + cD/d)/D`.

export type ForgeMode = 'equiv' | 'unlike'

/** Which forge a stage plays: grade 5's `params.mode: 'unlike'`, else the classic equivalence forge (grades 2–4). */
export function forgeModeOf(params: Record<string, unknown> | undefined): ForgeMode {
  return params?.mode === 'unlike' ? 'unlike' : 'equiv'
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)
export const lcmOf = (a: number, b: number) => (a / gcd(a, b)) * b

/** Does `1/D` cut both `1/b` and `1/d` into whole slabs? */
export const isCommonDenominator = (D: number, b: number, d: number) => D % b === 0 && D % d === 0

/**
 * The gauge's three chips for `b` and `d` (unlike), sorted: the least common
 * denominator (the one right chip), `b + d` (adding the bottoms: never a common
 * multiple), and whichever of `b`, `d` is NOT a multiple of the other.
 */
export function gaugeChoices(b: number, d: number): number[] {
  const L = lcmOf(b, d)
  const hi = Math.max(b, d)
  const lo = Math.min(b, d)
  const third = hi === L ? lo : hi
  return [L, b + d, third].sort((x, y) => x - y)
}

/** A grade-5 forge order (prompt `a/b + c/d = ?`) → forge round numbers, in least-common-denominator slabs. */
export function parseUnlikeRound(p: Pick<Problem, 'prompt' | 'answer' | 'factId'>): FracRound {
  const m = /^(\d+)\/(\d+) \+ (\d+)\/(\d+) = \?$/.exec(p.prompt)
  if (!m) throw new Error(`not a forge sum: ${p.prompt}`)
  const [a, b, c, d] = m.slice(1).map(Number)
  if (b === d) throw new Error(`like denominators: ${p.prompt}`)
  const L = lcmOf(b, d)
  const S = (a * L) / b + (c * L) / d
  if (S >= L) throw new Error(`sum is not under one bar: ${p.prompt}`)
  // the answer the provider printed (simplest form) must be the same amount
  const ans = /^(\d+)\/(\d+)$/.exec(String(p.answer))
  if (!ans || Number(ans[1]) * L !== S * Number(ans[2])) throw new Error(`answer ${p.answer} is not ${S}/${L}`)
  return {
    baseNum: S,
    baseDenom: L,
    targetDenom: L,
    targetNum: S,
    factId: p.factId,
    parts: [
      { num: a, denom: b },
      { num: c, denom: d },
    ],
    gauges: gaugeChoices(b, d),
  }
}

/** The renamed sum on the board once the gauge is set: "3/6 + 2/6". */
export function renamedParts(r: FracRound): string {
  if (!r.parts) return `${r.baseNum}/${r.baseDenom}`
  const D = r.targetDenom
  return r.parts.map((q) => `${(q.num * D) / q.denom}/${D}`).join(' + ')
}

/** The order as written: "1/2 + 1/3" (the classic order: "2/3"). */
export function recipeText(r: FracRound): string {
  return r.parts ? r.parts.map((q) => `${q.num}/${q.denom}`).join(' + ') : `${r.baseNum}/${r.baseDenom}`
}

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

/** Grade's equivalence denominator ceiling → forge-bounded provider config (never harder than the grade). */
export function forgeFactConfig(tierDenomMax: number) {
  // The gauge prints the target denominator on the order, so the forge only asks
  // the blank-the-top scale-up shape (the provider's wider shapes are for quizzes).
  return { maxDenominator: Math.min(FORGE_LIMITS.denomMax, Math.max(2, tierDenomMax)), shapes: ['numUp'] as const }
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

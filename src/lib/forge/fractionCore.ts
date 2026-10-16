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
  return { maxDenominator: Math.min(FORGE_LIMITS.denomMax, Math.max(2, tierDenomMax)) }
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

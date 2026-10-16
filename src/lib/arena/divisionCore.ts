import type { Problem } from '../problem'
import { shuffle } from '../random'

/**
 * Pure logic for the Division Arena (docs/superpowers/specs/
 * 2026-10-12-division-arena-design.md). No three.js, no DOM: the mechanics are
 * unit-tested here before anything renders.
 *
 * A golem carries `dividend`; pedestals hold divisor crystals; a crystal whose
 * divisor divides the dividend shatters the golem into `quotient` mini-camels.
 */

export interface DivRound {
  dividend: number
  divisor: number
  quotient: number
  factId?: string
}

/** A provider Problem (prompt `${dividend} ÷ ${divisor} = ?`) → round numbers. */
export function parseDivRound(p: Pick<Problem, 'prompt' | 'answer' | 'factId'>): DivRound {
  const m = /^(\d+)\s*÷\s*(\d+)\s*=\s*\?$/.exec(p.prompt)
  if (!m) throw new Error(`not a division problem: ${p.prompt}`)
  const dividend = Number(m[1])
  const divisor = Number(m[2])
  const quotient = Number(p.answer)
  if (!Number.isInteger(quotient) || divisor * quotient !== dividend) {
    throw new Error(`not a whole division fact: ${p.prompt} → ${p.answer}`)
  }
  return { dividend, divisor, quotient, factId: p.factId }
}

/** All whole-number divisors of n within [2, max]. */
export function trueFactors(n: number, max = 10): number[] {
  const out: number[] = []
  for (let d = 2; d <= Math.min(max, n); d++) if (n % d === 0) out.push(d)
  return out
}

/**
 * The three pedestal crystals for a round: always includes the round's correct
 * divisor. The win condition is *exact* (see `isRightCrystal`), so any other
 * crystal is a wrong answer — and that's pedagogically rich either way:
 * a true factor shatters the golem into the WRONG number of camels (the pen
 * shows room for `quotient`, so a 24÷4 pick spits out 6 camels and the pen
 * visibly doesn't fill), while a non-divisor just bounces off. Both are
 * informative, unrewarded feedback. Distractors prefer numbers near the
 * divisor (the classic ±1 confusions), then true factors, then anything ≤12.
 * Order is shuffled: the answer never sits at a fixed pedestal.
 */
export function makePedestalOptions(dividend: number, divisor: number): number[] {
  const used = new Set<number>([divisor])
  const want: number[] = [divisor]
  const push = (d: number) => {
    used.add(d)
    want.push(d)
  }
  for (const d of [divisor - 1, divisor + 1, divisor - 2, divisor + 2]) {
    if (want.length === 3) break
    if (d >= 2 && d <= 12 && !used.has(d)) push(d)
  }
  for (const d of trueFactors(dividend)) {
    if (want.length === 3) break
    if (!used.has(d)) push(d)
  }
  for (let d = 2; want.length < 3 && d <= 12; d++) if (!used.has(d)) push(d)
  return shuffle(want)
}

/** The exact right crystal for this round's fact (drives credit + pen fill). */
export function isRightCrystal(divisor: number, picked: number): boolean {
  return picked === divisor
}

/** Does the picked crystal shatter the golem at all? (divides → yes, splits) */
export function shatters(dividend: number, picked: number): boolean {
  return dividend % picked === 0
}

/** Ground scatter points for `count` minis around the pen mouth (pure math). */
export function splitPositions(count: number, cx: number, cz: number, r = 1.2): [number, number][] {
  const n = Math.min(count, 12)
  const out: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (i % 2) * 0.4
    const rr = r * (0.55 + (i % 3) * 0.22)
    out.push([cx + Math.cos(a) * rr, cz + Math.sin(a) * rr])
  }
  return out
}

export const ROUNDS = 5
/** Stars from clean first-try clears out of 5 rounds (wrong throws still let you retry the golem). */
export const STAR_THRESHOLDS: [number, number, number] = [1, 3, 5]
export function arenaStars(correctFirstTry: number): number {
  return correctFirstTry >= STAR_THRESHOLDS[2] ? 3 : correctFirstTry >= STAR_THRESHOLDS[1] ? 2 : correctFirstTry >= STAR_THRESHOLDS[0] ? 1 : 0
}

/**
 * The arena is a *model* of grouping, so its facts are bounded for legibility
 * regardless of how wide the grade tier makes division: the chalk board must
 * fit its panel and the pen must show exactly `quotient` camels without
 * crowding (the pen caps at `PEN_MARKS`). Grade tiers widen division to ÷12
 * (dividends to 144), which would break both.
 */
export const ARENA_LIMITS = { divisorMax: 9, quotientMax: 10 } as const
/** Camels the pen can show; a quotient above this can't be modelled truthfully. */
export const PEN_MARKS = 12

/** Grade's division ceiling → arena-bounded provider config (never harder than the grade). */
export function arenaFactConfig(tierDivMax: number) {
  const cap = (arenaMax: number, floor: number) => Math.min(arenaMax, Math.max(floor, tierDivMax))
  return {
    divisorMin: 2,
    divisorMax: cap(ARENA_LIMITS.divisorMax, 2),
    quotientMin: 2,
    quotientMax: cap(ARENA_LIMITS.quotientMax, 2),
  }
}

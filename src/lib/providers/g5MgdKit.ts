/**
 * Small helpers shared by 5th grade's Measurement Marsh, Geometry Grove and
 * Data Delta providers (g5Measure, g5Geometry, g5Data): picking distractors,
 * writing numbers the US way, and fractions of a unit as mixed numbers.
 */

import type { ProblemAnswer } from '../problem'
import { randInt, shuffle } from '../random'

export const pick = <T>(xs: readonly T[]): T => xs[randInt(0, xs.length - 1)]

/** Numbers the US way: 1,750 and 2.5 (no float noise; up to 3 decimals). */
export function fmt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 3 })
}

/**
 * The answer plus up to `n` wrong options, taken in order from `candidates`:
 * each kept only if it's allowed (positive and finite numbers, or any
 * non-empty string), differs from the answer and from the others as text.
 * Shuffled. Falls back to `fill` (called with 1, 2, …) to top up.
 */
export function withDistractors<T extends ProblemAnswer>(answer: T, candidates: readonly T[], fill: (i: number) => T, n = 3): T[] {
  const ok = (c: T) => (typeof c === 'number' ? Number.isFinite(c) && c > 0 : String(c).trim().length > 0)
  const out: T[] = []
  const seen = new Set<string>([String(answer)])
  const take = (c: T) => {
    if (out.length < n && ok(c) && !seen.has(String(c))) {
      seen.add(String(c))
      out.push(c)
    }
  }
  for (const c of candidates) take(c)
  for (let i = 1; out.length < n && i < 200; i++) take(fill(i))
  return shuffle([answer, ...out])
}

/** At most 3 decimal places (so `fmt` writes it exactly). */
const tidy = (n: number) => Number.isFinite(n) && Math.abs(n * 1000 - Math.round(n * 1000)) < 1e-6

/**
 * Number answers written as text (`fmt`): the answer plus 3 wrong amounts from
 * `candidates` (positive, at most 3 decimals, none written like another), then
 * from `fill`. Returns [answerText, shuffled options].
 */
export function amountChoices(answer: number, candidates: readonly number[], fill: (i: number) => number): [string, string[]] {
  const ok = (c: number) => c > 0 && tidy(c)
  const text = fmt(answer)
  const opts = withDistractors(
    text,
    candidates.filter(ok).map(fmt),
    (i) => {
      const c = fill(i)
      return ok(c) ? fmt(c) : ''
    },
  )
  return [text, opts]
}

export const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))

/**
 * `num`/`den` in simplest form as a mixed number: "3/8", "1 1/4", "2". The
 * whole number and the fraction are joined by a no-break space, so they never
 * wrap apart (and "1 1/4" never reads as a repeated word).
 */
export function mixedText(num: number, den: number): string {
  const g = gcd(num, den) || 1
  const n = num / g
  const d = den / g
  const whole = Math.floor(n / d)
  const r = n - whole * d
  if (r === 0) return String(whole)
  return whole > 0 ? `${whole} ${r}/${d}` : `${r}/${d}`
}

/** "(3, 5)": an ordered pair, as the coordinate plane writes it. */
export const pair = (x: number, y: number) => `(${x}, ${y})`

/** Kids in the story problems. */
export const NAMES = ['Maya', 'Leo', 'Ava', 'Kai', 'Zoe', 'Omar', 'Lily', 'Jonah', 'Priya', 'Sam', 'Rosa', 'Theo'] as const

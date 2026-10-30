import type { ContentBand } from '../gradeBand'
import type { RuleId } from './rules'
import { dec, dots, frac, minus, plus, whole, type PuddleValue } from './values'

/**
 * Puddle Patrol's stage sets: which sprinkler rules each stage teaches, in
 * what order they arrive (one new rule per wave set), how many Puddings a
 * wave brings and which values they can carry. The waves themselves are
 * planned from these by `planPatrol` (./plan.ts).
 *
 * | Band | Sets |
 * |---|---|
 * | k1  | `k-count` groups of 2 / 3 / 4 · `k-compare` 5, more than 5, fewer than 5 · `k-mixed` |
 * | g1  | `g1-add` makes 5 / 10 / 7 · `g1-sub` makes 5 / 3 / 4 · `g1-mix` makes 10 / 5 / 15 (to 20) |
 * | g24 | `g24-evenOdd` · `g24-skip` multiples of 2, 5, 10 · `g24-mixed` (Tower Battlefront's 10-wave mastery) |
 * | g5  | `g5-factors` factors and multiples · `g5-primes` primes and multiples · `g5-fracDec` = ½, ¼, ¾, ⅕ |
 */
export type PatrolSetId =
  | 'k-count'
  | 'k-compare'
  | 'k-mixed'
  | 'g1-add'
  | 'g1-sub'
  | 'g1-mix'
  | 'g24-evenOdd'
  | 'g24-skip'
  | 'g24-mixed'
  | 'g5-factors'
  | 'g5-primes'
  | 'g5-fracDec'

export const PATROL_SETS: readonly PatrolSetId[] = [
  'k-count',
  'k-compare',
  'k-mixed',
  'g1-add',
  'g1-sub',
  'g1-mix',
  'g24-evenOdd',
  'g24-skip',
  'g24-mixed',
  'g5-factors',
  'g5-primes',
  'g5-fracDec',
]

export const isPatrolSet = (s: unknown): s is PatrolSetId => typeof s === 'string' && (PATROL_SETS as readonly string[]).includes(s)

/** The tune-able shape of a stage. */
export interface PatrolSetSpec {
  band: ContentBand
  /** Waves in the stage. */
  waves: number
  /** New rules and the wave (0-based) they arrive at; the first entry is wave 0. */
  ladder: { wave: number; rules: RuleId[] }[]
  /** Puddings in wave w. */
  size(w: number): number
  /** Seconds between two Puddings leaving the mud pit in wave w. */
  gap(w: number): number
  /** Share of a wave that fits its featured ("dominant") rule. */
  lean: number
  /** Most sprinklers on the field at once: a wave never needs more rules than this (config.ts TUNING agrees). */
  towers: number
  /** Every value a Pudding of this stage could carry (the planner keeps the ones the wave's rules fit). */
  universe: readonly PuddleValue[]
}

const range = (lo: number, hi: number) => Array.from({ length: Math.max(0, hi - lo + 1) }, (_, i) => lo + i)
const ramp = (from: number, to: number, waves: number) => (w: number) => Math.round(from + ((to - from) * Math.min(w, waves - 1)) / Math.max(1, waves - 1))
const glide = (from: number, to: number, waves: number) => (w: number) => from + ((to - from) * Math.min(w, waves - 1)) / Math.max(1, waves - 1)

/** 1st grade's number sentences: a + b (both 1 or more) and a − b (never all of it), within `max`. */
function sums(max: number, ops: 'add' | 'sub' | 'both'): PuddleValue[] {
  const out: PuddleValue[] = []
  if (ops !== 'sub') for (const a of range(1, max - 1)) for (const b of range(1, Math.min(10, max - a))) if (a <= 10) out.push(plus(a, b))
  if (ops !== 'add') for (const a of range(2, max)) for (const b of range(1, Math.min(10, a - 1))) out.push(minus(a, b))
  return out
}

/** Grade 5's fractions (as written) and decimals (tenths and twentieths, with or without the trailing zero). */
function fracDecs(): PuddleValue[] {
  const out: PuddleValue[] = []
  for (const d of [2, 3, 4, 5, 6, 8, 10, 12]) for (const n of range(1, d - 1)) out.push(frac(n, d))
  for (const n of [20, 25, 50, 75]) out.push(frac(n, 100))
  for (const t of range(1, 9)) {
    out.push(dec(`0.${t}`))
    out.push(dec(`0.${t}0`))
  }
  for (const h of [5, 15, 25, 35, 45, 55, 65, 75, 85, 95]) out.push(dec(`0.${String(h).padStart(2, '0')}`))
  return out
}

/** The biggest whole number a 2nd, 3rd or 4th grader's Puddings carry in each grades 2–4 set. */
export function g24Max(set: 'g24-evenOdd' | 'g24-skip' | 'g24-mixed', grade: number): number {
  if (set === 'g24-evenOdd') return grade <= 2 ? 30 : grade === 3 ? 60 : 99
  return grade <= 2 ? 60 : 100
}

/** A stage's spec. `grade` widens the grades 2–4 numbers (and picks the mixed stage's last rule). */
export function patrolSpec(set: PatrolSetId, grade = 4): PatrolSetSpec {
  switch (set) {
    // ── kindergarten: dot groups; slow, few, gentle ──
    case 'k-count':
      return { band: 'k1', towers: 4, waves: 4, ladder: [{ wave: 0, rules: ['dots-2', 'dots-3'] }, { wave: 2, rules: ['dots-4'] }], size: ramp(4, 5, 4), gap: () => 2.6, lean: 0.5, universe: range(1, 6).map(dots) }
    case 'k-compare':
      return { band: 'k1', towers: 4, waves: 4, ladder: [{ wave: 0, rules: ['dots-5', 'more-5'] }, { wave: 2, rules: ['fewer-5'] }], size: ramp(4, 5, 4), gap: () => 2.6, lean: 0.5, universe: range(1, 9).map(dots) }
    case 'k-mixed':
      return {
        band: 'k1',
        towers: 4,
        waves: 4,
        ladder: [{ wave: 0, rules: ['dots-3', 'more-5'] }, { wave: 2, rules: ['fewer-5'] }, { wave: 3, rules: ['dots-5'] }],
        size: ramp(4, 6, 4),
        gap: () => 2.5,
        lean: 0.5,
        universe: range(1, 10).map(dots),
      }
    // ── 1st grade: number sentences that make a number ──
    case 'g1-add':
      return { band: 'g1', towers: 3, waves: 5, ladder: [{ wave: 0, rules: ['make-5', 'make-10'] }, { wave: 3, rules: ['make-7'] }], size: ramp(4, 6, 5), gap: () => 2.4, lean: 0.55, universe: sums(10, 'add') }
    case 'g1-sub':
      return { band: 'g1', towers: 3, waves: 5, ladder: [{ wave: 0, rules: ['make-5', 'make-3'] }, { wave: 3, rules: ['make-4'] }], size: ramp(4, 6, 5), gap: () => 2.4, lean: 0.55, universe: sums(10, 'sub') }
    case 'g1-mix':
      return { band: 'g1', towers: 3, waves: 5, ladder: [{ wave: 0, rules: ['make-10', 'make-5'] }, { wave: 3, rules: ['make-15'] }], size: ramp(5, 6, 5), gap: () => 2.3, lean: 0.55, universe: sums(20, 'both') }
    // ── grades 2–4: even and odd, skip-counting, then the mixed defense ──
    case 'g24-evenOdd':
      return { band: 'g24', towers: 3, waves: 7, ladder: [{ wave: 0, rules: ['even', 'odd'] }], size: ramp(7, 10, 7), gap: glide(1.35, 1.0, 7), lean: 0.8, universe: range(2, g24Max(set, grade)).map(whole) }
    case 'g24-skip':
      return { band: 'g24', towers: 3, waves: 8, ladder: [{ wave: 0, rules: ['mult-2', 'mult-5'] }, { wave: 3, rules: ['mult-10'] }], size: ramp(7, 11, 8), gap: glide(1.25, 0.9, 8), lean: 0.9, universe: range(2, g24Max(set, grade)).map(whole) }
    case 'g24-mixed':
      return {
        band: 'g24',
        towers: 3,
        waves: 10,
        ladder: [{ wave: 0, rules: ['even', 'mult-5'] }, { wave: 3, rules: ['mult-10'] }, { wave: 6, rules: [grade <= 2 ? 'odd' : 'mult-3'] }],
        size: ramp(5, 8, 10),
        gap: glide(1.35, 1.0, 10),
        lean: 0.75,
        universe: range(2, g24Max(set, grade)).map(whole),
      }
    // ── grade 5: factors, multiples, primes; fractions and decimals equal to a target ──
    case 'g5-factors':
      return {
        band: 'g5',
        towers: 3,
        waves: 8,
        ladder: [{ wave: 0, rules: ['factor-24', 'mult-5'] }, { wave: 3, rules: ['mult-7'] }, { wave: 5, rules: ['factor-36'] }],
        size: ramp(6, 9, 8),
        gap: glide(1.4, 1.05, 8),
        lean: 0.7,
        universe: range(1, 60).map(whole),
      }
    case 'g5-primes':
      return {
        band: 'g5',
        towers: 3,
        waves: 8,
        ladder: [{ wave: 0, rules: ['prime', 'mult-4'] }, { wave: 3, rules: ['mult-6'] }, { wave: 5, rules: ['mult-5'] }],
        size: ramp(6, 9, 8),
        gap: glide(1.4, 1.05, 8),
        lean: 0.7,
        universe: range(2, 60).map(whole),
      }
    case 'g5-fracDec':
      return {
        band: 'g5',
        towers: 3,
        waves: 8,
        ladder: [{ wave: 0, rules: ['eq-1/2', 'eq-1/4'] }, { wave: 3, rules: ['eq-3/4'] }, { wave: 5, rules: ['eq-1/5'] }],
        size: ramp(6, 10, 8),
        gap: glide(1.4, 1.0, 8),
        lean: 0.7,
        universe: fracDecs(),
      }
  }
}

/** The rules on offer at wave w (every rule the ladder has brought so far). */
export function rulesAt(spec: PatrolSetSpec, w: number): RuleId[] {
  return spec.ladder.filter((s) => s.wave <= w).flatMap((s) => s.rules)
}

/** The rule that arrives at wave w, if one does. */
export function newRulesAt(spec: PatrolSetSpec, w: number): RuleId[] {
  return w === 0 ? [] : spec.ladder.filter((s) => s.wave === w).flatMap((s) => s.rules)
}

import { seededRng } from '../random'
import { fitting, rule, type RuleId } from './rules'
import { newRulesAt, patrolSpec, rulesAt, type PatrolSetId, type PatrolSetSpec } from './stages'
import { valueKey, type PuddleValue } from './values'

/**
 * Plans a Puddle Patrol stage: every wave's Puddings and when they leave the
 * mud pit, from a seed (same seed, same stage). The guarantees, checked over
 * hundreds of seeds in the tests:
 *
 * - **Winnable:** every Pudding fits at least one rule on offer that wave, and
 *   two towers are enough to cover the first wave (`minCover`).
 * - **A fair mix:** each rule on offer fits at least one Pudding of the wave
 *   and misses at least one, so where each tower goes always matters.
 * - **A plan to read:** each wave leans on one rule (the new rule, the wave it
 *   arrives), so the "incoming" lineup says which towers it wants, and the
 *   lean moves between waves.
 */

export interface PlannedPudding {
  value: PuddleValue
  /** Seconds after the wave starts that it leaves the mud pit. */
  at: number
}

export interface WavePlan {
  index: number
  /** The rules on offer this wave (cards in the tray). */
  rules: RuleId[]
  /** The rule(s) new this wave (introduced before it starts). */
  fresh: RuleId[]
  /** The rule this wave leans on. */
  lean: RuleId
  puddings: PlannedPudding[]
}

export interface PatrolPlan {
  set: PatrolSetId
  seed: string
  spec: PatrolSetSpec
  waves: WavePlan[]
}

/** The fewest rules (of `rules`) that between them fit every value (∞ when one fits none). */
export function minCover(values: readonly PuddleValue[], rules: readonly RuleId[]): number {
  const n = rules.length
  let best = Infinity
  for (let mask = 1; mask < 1 << n; mask++) {
    const chosen = rules.filter((_, i) => mask & (1 << i))
    if (chosen.length >= best) continue
    if (values.every((v) => chosen.some((r) => rule(r).fits(v)))) best = chosen.length
  }
  return best
}

/**
 * Does this wave keep the promises above? Every Pudding fits a rule on offer;
 * at least two rules have work (one, when only one is on offer); and each
 * rule with work also has Puddings it must leave alone. (A rule on offer
 * with nothing to wash this wave is fine: its card is a choice not to make.)
 */
export function waveIsFair(values: readonly PuddleValue[], rules: readonly RuleId[]): boolean {
  if (values.some((v) => fitting(v, rules).length === 0)) return false
  const busy = rules.filter((r) => values.some((v) => rule(r).fits(v)))
  if (busy.length < Math.min(2, rules.length)) return false
  return rules.length < 2 || busy.every((r) => values.some((v) => !rule(r).fits(v)))
}

function pick<T>(xs: readonly T[], rnd: () => number): T {
  return xs[Math.floor(rnd() * xs.length)]
}

/** The value pools of a wave: per rule, the values it fits, and those only it fits. */
function pools(universe: readonly PuddleValue[], rules: readonly RuleId[]) {
  const fits = new Map<RuleId, PuddleValue[]>()
  const only = new Map<RuleId, PuddleValue[]>()
  for (const r of rules) {
    fits.set(r, [])
    only.set(r, [])
  }
  for (const v of universe) {
    const f = fitting(v, rules)
    for (const r of f) fits.get(r)!.push(v)
    if (f.length === 1) only.get(f[0])!.push(v)
  }
  return { fits, only }
}

function shuffle<T>(xs: T[], rnd: () => number): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[xs[i], xs[j]] = [xs[j], xs[i]]
  }
  return xs
}

function planWave(spec: PatrolSetSpec, w: number, rnd: () => number, prevLean: RuleId | null): WavePlan {
  const rules = rulesAt(spec, w)
  const fresh = newRulesAt(spec, w)
  const { fits, only } = pools(spec.universe, rules)
  const leanable = rules.filter((r) => fits.get(r)!.length > 0)
  // a rule with nothing of its own to wash (×10 beside ×2 and ×5) leans only the wave it arrives:
  // after that the lean goes to rules whose Puddings need THEM (the lineup has to be read)
  const own = leanable.filter((r) => only.get(r)!.length > 0 && r !== prevLean)
  const lean = fresh[0] ?? (own.length ? pick(own, rnd) : leanable.length > 1 ? pick(leanable.filter((r) => r !== prevLean), rnd) : leanable[0])
  const size = spec.size(w)
  // the lean's share, then the supporting rules (no more than the towers a child can have: always winnable)
  const support = shuffle(
    leanable.filter((r) => r !== lean),
    rnd,
  ).slice(0, Math.max(1, spec.towers - 1))
  // (every supporting rule gets a Pudding or more: a lean with nothing of its own, like ×10, needs them to tell it apart)
  const nLean = Math.min(size - support.length, Math.max(Math.ceil(size / 3), Math.round(size * spec.lean)))
  const draw = (r: RuleId): PuddleValue => {
    const own = only.get(r)!
    return own.length && rnd() < 0.8 ? pick(own, rnd) : pick(fits.get(r)!, rnd)
  }
  let values: PuddleValue[] = []
  for (let attempt = 0; attempt < 60; attempt++) {
    const plan: RuleId[] = [...Array<RuleId>(nLean).fill(lean)]
    const start = Math.floor(rnd() * support.length)
    for (let i = 0; plan.length < size; i++) plan.push(support[(start + i) % support.length] ?? lean)
    values = []
    for (const r of plan) {
      let v = draw(r)
      // no twins in a row
      for (let k = 0; k < 4 && values.length && valueKey(values[values.length - 1]) === valueKey(v); k++) v = draw(r)
      values.push(v)
    }
    if (waveIsFair(values, rules) && minCover(values, rules) <= (w === 0 ? 2 : spec.towers)) break
  }
  // (the first Pudding leans; the rest come in a shuffled order)
  const [first, ...rest] = values
  shuffle(rest, rnd)
  const gap = spec.gap(w)
  const puddings = [first, ...rest].map((value, i) => ({ value, at: +(i * gap).toFixed(3) }))
  return { index: w, rules, fresh, lean, puddings }
}

/** The whole stage, from a seed. */
export function planPatrol(set: PatrolSetId, seed: string, grade = 4): PatrolPlan {
  const spec = patrolSpec(set, grade)
  const rnd = seededRng(`puddle|${set}|${grade}|${seed}`)
  const waves: WavePlan[] = []
  let prev: RuleId | null = null
  for (let w = 0; w < spec.waves; w++) {
    const wave = planWave(spec, w, rnd, prev)
    prev = wave.lean
    waves.push(wave)
  }
  return { set, seed, spec, waves }
}

/** Every rule the stage ever offers, in the order they arrive. */
export const stageRules = (spec: PatrolSetSpec): RuleId[] => spec.ladder.flatMap((s) => s.rules)

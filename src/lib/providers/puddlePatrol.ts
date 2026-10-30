import type { Problem, ProblemProvider } from '../problem'
import { seededRng } from '../random'
import {
  fitting,
  patrolSpec,
  planPatrol,
  rule,
  stageRules,
  valueKey,
  valueText,
  type PatrolPlan,
  type PatrolSetId,
  type PuddleValue,
  type RuleId,
} from '../puddle'

/**
 * Puddle Patrol (Tower Battlefront, grades 2–5): the seeded waves a stage
 * plays (`plan`, from src/lib/puddle), and, for hosts that ask one question
 * at a time (the Daily Challenge, the coach's practice check), the game's
 * own question: "Which Pudding does the multiples-of-5 sprinkler wash?" with
 * one value that fits and two or three that don't, each with its reason.
 *
 * Kindergarten and 1st grade keep their tower stages on the K–1 providers
 * (kTowers, g1Towers: spoken picture questions for the Daily), and play the
 * same planned waves (`params.patrol` names the set).
 */

export interface PuddlePatrolConfig {
  set: PatrolSetId
  /** The child's grade (widens grades 2–4's numbers; filled in by gradeTiers). */
  grade?: number
}

/** The coach's skill bucket for a sprinkler rule (and, for a value, the rule that washes it). */
export function patrolSkill(r: RuleId, set: PatrolSetId, value?: PuddleValue): { id: string; label: string } {
  if (r.startsWith('dots-')) return { id: 'k-towers-count', label: 'counting to 20' }
  if (r === 'more-5' || r === 'fewer-5') return { id: 'k-towers-compare', label: 'more and fewer' }
  if (r.startsWith('make-')) {
    const sub = value ? value.kind === 'sum' && value.op === '-' : set === 'g1-sub'
    return sub ? { id: 'g1-towers-sub', label: 'taking away within 20' } : { id: 'g1-towers-add', label: 'adding within 20' }
  }
  if (r === 'even' || r === 'odd') return { id: 'mult-even-odd', label: 'even and odd numbers' }
  if (r === 'prime') return { id: 'g5-primes', label: 'prime numbers' }
  if (r.startsWith('factor-') || (set.startsWith('g5') && r.startsWith('mult-'))) return { id: 'g5-factors', label: 'factors and multiples' }
  if (r === 'mult-3') return { id: 'mult-f2_5', label: '2–5× facts' }
  if (r.startsWith('mult-')) return { id: 'mult-skip', label: 'multiples of 2, 5 and 10' }
  // = ½, ¼ …: a decimal Pudding is reading decimals; a fraction one, equivalent fractions
  if (value?.kind === 'dec') return { id: 'g5-dec-compare', label: 'comparing decimals' }
  return { id: 'frac-equiv', label: 'equivalent fractions' }
}

export type PuddlePatrolProvider = Omit<ProblemProvider, 'next'> & {
  next(): Problem
  readonly config: PuddlePatrolConfig
  /** The stage's waves for a run (same seed, same stage). */
  plan(seed: string): PatrolPlan
}

export function makePuddlePatrolProvider(cfg: PuddlePatrolConfig): PuddlePatrolProvider {
  const grade = cfg.grade ?? 4
  const spec = patrolSpec(cfg.set, grade)
  const rules = stageRules(spec)
  let serial = 0
  let rnd = seededRng(`pp-quiz|${cfg.set}|${grade}`)
  let lastRule: RuleId | null = null

  function next(): Problem {
    // the rule asked about: the stage's rules in turn (each one is drilled)
    const r = rules.filter((x) => x !== lastRule)[Math.floor(rnd() * Math.max(1, rules.length - 1))] ?? rules[0]
    lastRule = r
    const fits = spec.universe.filter((v) => rule(r).fits(v))
    // the wrong ones: values another of the stage's rules washes, but not this one
    const misses = spec.universe.filter((v) => !rule(r).fits(v) && fitting(v, rules).length > 0)
    const answer = fits[Math.floor(rnd() * fits.length)]
    const wrong: PuddleValue[] = []
    const seen = new Set([valueKey(answer)])
    for (let k = 0; wrong.length < 3 && k < 40; k++) {
      const v = misses[Math.floor(rnd() * misses.length)]
      if (!v || seen.has(valueKey(v)) || valueText(v) === valueText(answer)) continue
      seen.add(valueKey(v))
      wrong.push(v)
    }
    const options = [answer, ...wrong]
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1))
      ;[options[i], options[j]] = [options[j], options[i]]
    }
    const name = rule(r).name
    return {
      id: `pp-${cfg.set}-${serial++}`,
      topic: 'puddlePatrol',
      subtopic: r,
      prompt: `Which Pudding does the "${name}" sprinkler wash?`,
      options: options.map(valueText),
      answer: valueText(answer),
      skill: patrolSkill(r, cfg.set, answer),
      explanation: [rule(r).yes(answer), ...wrong.map((v) => rule(r).why(v))].map((t) => t.replace(/[.!]$/, '')).join('. ') + '.',
      hint: name,
    }
  }

  return {
    topic: 'puddlePatrol',
    config: cfg,
    next,
    reset() {
      serial = 0
      lastRule = null
      rnd = seededRng(`pp-quiz|${cfg.set}|${grade}`)
    },
    plan: (seed) => planPatrol(cfg.set, seed, grade),
  }
}

/** Is this provider Puddle Patrol's (the game reads its set from it)? */
export function isPuddlePatrolProvider(p: ProblemProvider): p is PuddlePatrolProvider {
  return (p as Partial<PuddlePatrolProvider>).topic === 'puddlePatrol' && typeof (p as Partial<PuddlePatrolProvider>).plan === 'function'
}

import { describe, expect, it } from 'vitest'
import {
  PATROL_SETS,
  dec,
  dots,
  frac,
  isPrime,
  minCover,
  minus,
  newRulesAt,
  patrolSpec,
  planPatrol,
  plus,
  rule,
  rulesAt,
  stageRules,
  valueKey,
  valueOf,
  valueText,
  waveIsFair,
  whole,
  type PatrolSetId,
  type RuleId,
} from '..'
import { TUNING } from '../../../games/tower-defense/config'

/** The grades that play each set (grades 2–4 differ in their numbers). */
const GRADES: Record<string, number[]> = { k1: [0], g1: [1], g24: [2, 3, 4], g5: [5] }
const SEEDS = 300

describe('Puddle Patrol values', () => {
  it('keep the form they are written in, with an exact value', () => {
    expect(valueText(plus(3, 2))).toBe('3 + 2')
    expect(valueText(minus(7, 2))).toBe('7 − 2')
    expect(valueText(frac(3, 6))).toBe('3/6')
    expect(valueText(dec('0.50'))).toBe('0.50')
    expect(valueOf(frac(3, 6))).toEqual(valueOf(dec('0.5')))
    expect(valueOf(minus(7, 2))).toEqual(valueOf(whole(5)))
    expect(valueKey(dots(3))).not.toBe(valueKey(whole(3)))
  })
})

describe('sprinkler rules', () => {
  it('wash exactly what fits, and say why the rest bounce off', () => {
    expect(rule('even').fits(whole(12))).toBe(true)
    expect(rule('even').why(whole(21))).toBe('21 is odd: 20 + 1 = 21')
    expect(rule('mult-5').why(whole(21))).toBe('21 is not a multiple of 5: 5 × 4 = 20, 5 × 5 = 25')
    expect(rule('mult-5').yes(whole(25))).toBe('5 × 5 = 25')
    expect(rule('factor-24').fits(whole(8))).toBe(true)
    expect(rule('factor-24').why(whole(5))).toBe('5 is not a factor of 24: 24 ÷ 5 = 4 R 4')
    expect(rule('prime').why(whole(21))).toBe('21 is not prime: 21 = 3 × 7')
    expect(rule('eq-1/2').fits(frac(3, 6))).toBe(true)
    expect(rule('eq-1/2').fits(dec('0.50'))).toBe(true)
    expect(rule('eq-1/2').why(frac(3, 8))).toBe('3/8 is not ½: ½ = 4/8')
    expect(rule('eq-1/2').why(dec('0.25'))).toBe('0.25 is not ½: ½ = 0.5')
    expect(rule('dots-3').fits(dots(3))).toBe(true)
    expect(rule('dots-3').why(dots(4))).toBe("That's 4, not three.")
    expect(rule('make-10').fits(plus(4, 6))).toBe(true)
    expect(rule('make-10').why(minus(9, 4))).toBe('9 − 4 makes 5, not 10.')
    expect(rule('more-5').fits(dots(5))).toBe(false)
    expect(rule('fewer-5').fits(dots(4))).toBe(true)
  })

  it('every rule of every stage: a name, a badge, and a reason for every value of its stage it misses', () => {
    for (const set of PATROL_SETS) {
      for (const grade of GRADES[patrolSpec(set).band]) {
        const spec = patrolSpec(set, grade)
        for (const id of stageRules(spec)) {
          const r = rule(id)
          expect(r.name.length, id).toBeGreaterThan(0)
          expect(r.badge.big.length, id).toBeGreaterThan(0)
          for (const v of spec.universe) {
            const text = r.fits(v) ? r.yes(v) : r.why(v)
            expect(text.length, `${id} ${valueText(v)}`).toBeGreaterThan(0)
            expect(text, `${id} ${valueText(v)}`).not.toMatch(/NaN|undefined|Infinity/)
          }
        }
      }
    }
  })

  it('primes are primes', () => {
    expect([2, 3, 5, 7, 11, 13, 17, 19, 23, 29].every(isPrime)).toBe(true)
    expect([1, 4, 9, 15, 21, 49, 51].some(isPrime)).toBe(false)
  })
})

describe('the wave planner (property tests over hundreds of seeds)', () => {
  const sets = PATROL_SETS.flatMap((set) => GRADES[patrolSpec(set).band].map((grade) => [set, grade] as [PatrolSetId, number]))

  it.each(sets)('%s (grade %i): every wave winnable with its rules, a fair mix, the lean readable', (set, grade) => {
    const spec = patrolSpec(set, grade)
    const towers = spec.towers
    expect(TUNING[spec.band].maxTowers).toBe(towers)
    const leans = new Map<RuleId, number>()
    for (let i = 0; i < SEEDS; i++) {
      const plan = planPatrol(set, `seed-${i}`, grade)
      expect(plan.waves).toHaveLength(spec.waves)
      let prevLean: RuleId | null = null
      for (const w of plan.waves) {
        const values = w.puddings.map((p) => p.value)
        expect(values).toHaveLength(spec.size(w.index))
        expect(w.rules).toEqual(rulesAt(spec, w.index))
        // winnable: each Pudding fits a rule on offer, and the towers you can have are enough to cover the wave
        expect(waveIsFair(values, w.rules), `${set} seed ${i} wave ${w.index}: ${values.map(valueText).join(' ')}`).toBe(true)
        expect(minCover(values, w.rules)).toBeLessThanOrEqual(w.index === 0 ? 2 : towers)
        // every value is the stage's own (the right form, the right range)
        for (const v of values) expect(spec.universe.some((u) => valueKey(u) === valueKey(v))).toBe(true)
        // spawn times climb steadily
        for (let k = 1; k < w.puddings.length; k++) expect(w.puddings[k].at).toBeGreaterThan(w.puddings[k - 1].at)
        // a new rule leans its own wave, and the lean moves on between waves
        if (w.fresh.length) expect(w.lean).toBe(w.fresh[0])
        else if (prevLean && w.rules.length > 1) expect(w.lean).not.toBe(prevLean)
        expect(values.filter((v) => rule(w.lean).fits(v)).length).toBeGreaterThanOrEqual(Math.ceil(values.length / 3))
        prevLean = w.lean
        leans.set(w.lean, (leans.get(w.lean) ?? 0) + 1)
      }
    }
    // over many runs every rule gets its waves
    for (const r of stageRules(spec)) expect(leans.get(r) ?? 0, r).toBeGreaterThan(0)
  })

  it('one new rule set per step of the ladder, never two at once', () => {
    for (const set of PATROL_SETS) {
      const spec = patrolSpec(set)
      expect(spec.ladder[0].wave).toBe(0)
      expect(spec.ladder[0].rules.length).toBe(2)
      for (const step of spec.ladder.slice(1)) {
        expect(step.rules).toHaveLength(1)
        expect(newRulesAt(spec, step.wave)).toEqual(step.rules)
      }
    }
  })

  it('is deterministic per seed, and different across seeds', () => {
    const a = planPatrol('g24-mixed', 'same', 3)
    expect(planPatrol('g24-mixed', 'same', 3).waves).toEqual(a.waves)
    expect(planPatrol('g24-mixed', 'other', 3).waves.map((w) => w.puddings.map((p) => valueText(p.value)))).not.toEqual(a.waves.map((w) => w.puddings.map((p) => valueText(p.value))))
  })

  it('grades 2–4: 2nd grade numbers stay small; the mixed stage’s last rule suits the grade', () => {
    const max = (set: PatrolSetId, g: number) => Math.max(...planPatrol(set, 'x', g).waves.flatMap((w) => w.puddings.map((p) => valueOf(p.value).n)))
    expect(max('g24-evenOdd', 2)).toBeLessThanOrEqual(30)
    expect(max('g24-skip', 2)).toBeLessThanOrEqual(60)
    expect(max('g24-skip', 4)).toBeLessThanOrEqual(100)
    expect(stageRules(patrolSpec('g24-mixed', 2))).toContain('odd')
    expect(stageRules(patrolSpec('g24-mixed', 3))).toContain('mult-3')
    // the mastery stage is a 10-wave defense
    expect(patrolSpec('g24-mixed').waves).toBe(10)
  })

  it('kindergarten: dot groups only, at most ten; 1st grade: number sentences within 20', () => {
    for (const set of ['k-count', 'k-compare', 'k-mixed'] as const)
      for (const w of planPatrol(set, 's', 0).waves) for (const p of w.puddings) expect(p.value.kind === 'dots' && p.value.n >= 1 && p.value.n <= 10).toBe(true)
    for (const set of ['g1-add', 'g1-sub', 'g1-mix'] as const)
      for (const w of planPatrol(set, 's', 1).waves)
        for (const p of w.puddings) {
          expect(p.value.kind).toBe('sum')
          const n = valueOf(p.value).n
          expect(n).toBeGreaterThanOrEqual(1)
          expect(n).toBeLessThanOrEqual(20)
          if (p.value.kind === 'sum') expect(set === 'g1-add' ? p.value.op : set === 'g1-sub' ? p.value.op === '-' : true).toBeTruthy()
        }
  })
})

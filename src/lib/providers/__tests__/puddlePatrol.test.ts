import { describe, expect, it } from 'vitest'
import { createProvider } from '..'
import { effectiveConfigForStage } from '../../gradeTiers'
import { getZone, zoneStages } from '../../../curriculum'
import { SKILLS } from '../../../tutoring/skills'
import { isPatrolSet, rule, valueText, type RuleId } from '../../puddle'
import { isPuddlePatrolProvider, makePuddlePatrolProvider, patrolSkill } from '../puddlePatrol'

describe('puddlePatrol provider', () => {
  const sets = ['g24-evenOdd', 'g24-skip', 'g24-mixed', 'g5-factors', 'g5-primes', 'g5-fracDec'] as const

  it.each(sets)('%s: "which Pudding does this sprinkler wash?", one right answer, every distractor explained', (set) => {
    const p = makePuddlePatrolProvider({ set, grade: set.startsWith('g5') ? 5 : 3 })
    const asked = new Set<string>()
    for (let i = 0; i < 300; i++) {
      const q = p.next()
      const r = q.subtopic as RuleId
      asked.add(r)
      expect(q.options.length, q.prompt).toBeGreaterThanOrEqual(3)
      expect(new Set(q.options).size).toBe(q.options.length)
      expect(q.options).toContain(q.answer)
      // exactly one option fits the rule asked about
      const spec = p.plan('x').spec
      const fit = q.options.filter((o) => spec.universe.some((v) => valueText(v) === o && rule(r).fits(v)))
      expect(fit, q.prompt).toEqual([q.answer])
      expect(q.prompt).toContain(rule(r).name)
      expect(q.explanation).toBeTruthy()
      expect(SKILLS[q.skill!.id], q.skill!.id).toBeDefined()
    }
    // each rule of the stage gets asked
    expect(asked.size).toBe(new Set(p.plan('x').spec.ladder.flatMap((s) => s.rules)).size)
  })

  it('plans the same waves for the same seed (and the game finds it through the provider)', () => {
    const p = createProvider({ kind: 'puddlePatrol', set: 'g24-mixed', grade: 2 })
    expect(isPuddlePatrolProvider(p)).toBe(true)
    if (!isPuddlePatrolProvider(p)) return
    expect(p.plan('a').waves).toEqual(p.plan('a').waves)
    // 2nd grade's mixed stage ends on odd numbers; 3rd on multiples of 3
    expect(p.plan('a').waves.at(-1)!.rules).toContain('odd')
    expect(isPuddlePatrolProvider(createProvider({ kind: 'multiplication', factorMin: 2, factorMax: 9 }))).toBe(false)
  })

  it('every Tower Battlefront stage names a set; grades 2–5 draw from this provider, scaled to the grade', () => {
    const zone = getZone('tower-battlefront')!
    for (const g of [0, 1, 2, 3, 4, 5] as const) {
      for (const [i, st] of zoneStages(zone, g).entries()) {
        expect(st.gameId).toBe('towerDefense')
        expect(isPatrolSet(st.params?.patrol), st.id).toBe(true)
        if (g >= 2) {
          const cfg = effectiveConfigForStage(st, i, g)
          expect(cfg).toEqual({ kind: 'puddlePatrol', set: st.params!.patrol, grade: g })
        }
      }
    }
  })

  it('skills: each rule reports to the coach under the zone’s own skill ids', () => {
    expect(patrolSkill('dots-3', 'k-count').id).toBe('k-towers-count')
    expect(patrolSkill('more-5', 'k-compare').id).toBe('k-towers-compare')
    expect(patrolSkill('make-5', 'g1-sub').id).toBe('g1-towers-sub')
    expect(patrolSkill('make-10', 'g1-add').id).toBe('g1-towers-add')
    expect(patrolSkill('even', 'g24-evenOdd').id).toBe('mult-even-odd')
    expect(patrolSkill('mult-5', 'g24-skip').id).toBe('mult-skip')
    expect(patrolSkill('mult-3', 'g24-mixed').id).toBe('mult-f2_5')
    expect(patrolSkill('mult-7', 'g5-factors').id).toBe('g5-factors')
    expect(patrolSkill('prime', 'g5-primes').id).toBe('g5-primes')
    expect(patrolSkill('eq-1/2', 'g5-fracDec', { kind: 'dec', text: '0.5' }).id).toBe('g5-dec-compare')
    expect(patrolSkill('eq-1/2', 'g5-fracDec', { kind: 'frac', n: 2, d: 4 }).id).toBe('frac-equiv')
    for (const id of ['k-towers-count', 'k-towers-compare', 'g1-towers-add', 'g1-towers-sub', 'mult-even-odd', 'mult-skip', 'mult-f2_5', 'g5-factors', 'g5-primes', 'g5-dec-compare', 'frac-equiv'])
      expect(SKILLS[id], id).toBeDefined()
  })
})

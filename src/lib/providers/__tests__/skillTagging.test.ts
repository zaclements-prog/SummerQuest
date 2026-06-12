import { describe, it, expect } from 'vitest'
import { createProvider } from '../index'
import { nextProblem } from '../../problem'
import { SKILLS } from '../../../tutoring/skills'

const configs = [
  { kind: 'multiplication', factorMin: 2, factorMax: 10 },
  { kind: 'division', divisorMin: 2, divisorMax: 9, quotientMin: 2, quotientMax: 9 },
  { kind: 'fractionCompare', maxDenominator: 8 },
  { kind: 'fractionEquivalence', maxDenominator: 8 },
  { kind: 'placeValueIdentify', maxPlace: 10000 },
  { kind: 'placeValueRounding', maxPlace: 1000, roundTo: 100 },
  { kind: 'measurement', type: 'area' },
  { kind: 'geometry', level: 3 },
  { kind: 'dataGraph', level: 3 },
  { kind: 'wordProblem', topic: 'multiplication' },
  { kind: 'readingComprehension', level: 3 },
  { kind: 'writingPrompt', writingKind: 'sentence' },
  { kind: 'science', level: 3 },
] as const

describe('every provider tags problems with a known skill', () => {
  for (const cfg of configs) {
    it(`${cfg.kind} sets a registered skill id`, async () => {
      const prov = createProvider(cfg as never)
      const prob = await nextProblem(prov)
      expect(prob.skill?.id, `${cfg.kind} must set problem.skill`).toBeTruthy()
      expect(SKILLS[prob.skill!.id], `${prob.skill!.id} must be in SKILLS`).toBeTruthy()
    })
  }
})

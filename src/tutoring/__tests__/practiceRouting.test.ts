import { describe, it, expect } from 'vitest'
import { SKILLS, skillOf } from '../skills'
import { getStage } from '../../curriculum'
import { createProvider } from '../../lib/providers'

describe('coach practice routing', () => {
  // A weak skill's "Practice" button must open a stage that actually drills it.
  for (const [skillId, meta] of Object.entries(SKILLS)) {
    it(`${skillId} → ${meta.zoneId}/${meta.practiceStageId} drills ${skillId}`, async () => {
      // (a skill's practice stage is in its own band's set: 2nd–4th grade, or K–1 for the k-* skills)
      const stage = getStage(meta.zoneId, meta.practiceStageId, 3) ?? getStage(meta.zoneId, meta.practiceStageId, 0) ?? getStage(meta.zoneId, meta.practiceStageId, 1)
      expect(stage).toBeDefined()
      const provider = createProvider(stage!.providerConfig)
      const seen = new Set<string>()
      for (let i = 0; i < 400 && !seen.has(skillId); i++) seen.add(skillOf(await provider.next()).id)
      expect([...seen]).toContain(skillId)
    })
  }
})

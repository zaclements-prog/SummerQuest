import { describe, it, expect } from 'vitest'
import { skillOf, SKILLS, skillMeta } from '../skills'
import type { Problem } from '../../lib/problem'

const p = (over: Partial<Problem>): Problem => ({
  id: 'x', prompt: '', options: [], answer: 0, topic: 'multiplication', ...over,
})

describe('skillOf', () => {
  it('buckets multiplication by larger factor family', () => {
    expect(skillOf(p({ topic: 'multiplication', subtopic: '3×4' })).id).toBe('mult-f2_5')
    expect(skillOf(p({ topic: 'multiplication', subtopic: '7×8' })).id).toBe('mult-f6_9')
    expect(skillOf(p({ topic: 'multiplication', subtopic: '11×2' })).id).toBe('mult-f10_12')
  })
  it('prefers an explicit problem.skill when present', () => {
    expect(skillOf(p({ skill: { id: 'frac-cmp-unlikeden', label: 'X' } })).id)
      .toBe('frac-cmp-unlikeden')
  })
  it('falls back to a topic-level skill for unknown topics', () => {
    expect(skillOf(p({ topic: 'mystery', subtopic: undefined })).id).toBe('topic-mystery')
  })
  it('every registered skill has a label, zone, lesson and practice stage', () => {
    for (const id of Object.keys(SKILLS)) {
      const m = skillMeta(id)
      expect(m.label.length).toBeGreaterThan(0)
      expect(m.zoneId.length).toBeGreaterThan(0)
      expect(m.lessonId.length).toBeGreaterThan(0)
      expect(m.practiceStageId.length).toBeGreaterThan(0)
    }
  })
})

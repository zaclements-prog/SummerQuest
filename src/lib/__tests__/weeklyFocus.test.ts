import { describe, it, expect } from 'vitest'
import { weakSkills, weeklyFocus } from '../analytics'
import type { SkillAttempt } from '../../store/progress'

const NOW = 1_700_000_000_000
const day = 86_400_000
function attempt(skillId: string, correct: boolean, ageDays = 1): SkillAttempt {
  return { id: Math.random().toString(36), at: NOW - ageDays * day, zoneId: 'multiplication-mesa',
    topic: 'multiplication', skillId, skillLabel: skillId, correct }
}

describe('weakSkills', () => {
  it('ranks low-accuracy skills first and respects minAttempts', () => {
    const at: SkillAttempt[] = [
      ...Array(6).fill(0).map(() => attempt('mult-f6_9', false)),
      ...Array(6).fill(0).map((_, i) => attempt('mult-f2_5', i < 5)), // 5/6 good
      ...Array(2).fill(0).map(() => attempt('div-basic', false)),     // too few
    ]
    const weak = weakSkills(at, { days: 7, minAttempts: 4, max: 5, now: NOW })
    expect(weak[0].skillId).toBe('mult-f6_9')
    expect(weak.find((w) => w.skillId === 'div-basic')).toBeUndefined()
  })
  it('ignores attempts older than the window', () => {
    const at = Array(6).fill(0).map(() => attempt('mult-f6_9', false, 30))
    expect(weakSkills(at, { days: 7, minAttempts: 4, now: NOW })).toHaveLength(0)
  })
})

describe('weeklyFocus', () => {
  it('maps each weak skill to its lesson + practice stage', () => {
    const at = Array(6).fill(0).map(() => attempt('mult-f6_9', false))
    const focus = weeklyFocus(at, [], NOW)
    expect(focus[0]).toMatchObject({
      skillId: 'mult-f6_9', lessonId: 'multiplication',
      zoneId: 'multiplication-mesa', practiceStageId: 'mult-practice',
    })
    expect(focus[0].accuracy).toBe(0)
  })
})

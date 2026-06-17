import { describe, it, expect } from 'vitest'
import { isLearningPath } from '../usePlayClock'

describe('isLearningPath (which screens count toward the daily learning goal)', () => {
  it('counts active learning screens', () => {
    expect(isLearningPath('/play/numbers/stage-1')).toBe(true) // a quiz/game stage
    expect(isLearningPath('/daily')).toBe(true) // the daily challenge
    expect(isLearningPath('/tutor/adding-fractions')).toBe(true) // a tutor lesson
  })

  it('does NOT count the Home area', () => {
    expect(isLearningPath('/home')).toBe(false)
  })

  it('does NOT count browsing, menus, or review screens', () => {
    expect(isLearningPath('/')).toBe(false)
    expect(isLearningPath('/map')).toBe(false)
    expect(isLearningPath('/zone/numbers')).toBe(false)
    expect(isLearningPath('/badges')).toBe(false)
    expect(isLearningPath('/progress')).toBe(false)
    expect(isLearningPath('/focus')).toBe(false)
    expect(isLearningPath('/parent')).toBe(false)
    expect(isLearningPath('/avatar')).toBe(false)
  })

  it('counts a tutor lesson but not the tutor index menu', () => {
    expect(isLearningPath('/tutor')).toBe(false)
    expect(isLearningPath('/tutor/')).toBe(false)
    expect(isLearningPath('/tutor/long-division')).toBe(true)
  })
})

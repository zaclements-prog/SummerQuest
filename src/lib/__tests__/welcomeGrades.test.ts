import { describe, it, expect } from 'vitest'
import { nextGradeShortLabel, welcomeGradeText } from '../gradeTiers'
import { offeredGrades } from '../features'

describe('Welcome tagline grades', () => {
  it('the store build (2–4) reads as before', () => {
    expect(welcomeGradeText(offeredGrades({ k1: false, g5: false }))).toBe('2nd, 3rd, or 4th grade')
    expect(welcomeGradeText(offeredGrades({ k1: false, g5: true }))).toBe('2nd through 5th grade')
  })

  it('never leads with kindergarten (a 10-year-old reads the first grade first)', () => {
    const all = welcomeGradeText(offeredGrades({ k1: true, g5: true }))
    expect(all).toBe('1st through 5th grade, and kindergarten too')
    expect(welcomeGradeText(offeredGrades({ k1: true, g5: false }))).toBe('1st through 4th grade, and kindergarten too')
    for (const f of [{ k1: true, g5: true }, { k1: true, g5: false }]) {
      expect(welcomeGradeText(offeredGrades(f)).toLowerCase().startsWith('kindergarten')).toBe(false)
    }
  })

  it('the grade a child goes into', () => {
    expect([0, 1, 2, 3, 4, 5].map((g) => nextGradeShortLabel(g as 0))).toEqual(['1st', '2nd', '3rd', '4th', '5th', '6th'])
  })
})

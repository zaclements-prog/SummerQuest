import { describe, it, expect, afterEach, vi } from 'vitest'
import { offeredGrades, readFeatures } from '../features'
import { gradeListText, gradeSpanText } from '../gradeTiers'

describe('feature flags (K–1 and grade 5)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('are on in the dev server, and off in a production build unless the build asks', () => {
    expect(readFeatures({ DEV: true })).toEqual({ k1: true, g5: true })
    expect(readFeatures({ DEV: false })).toEqual({ k1: false, g5: false })
    expect(readFeatures({ DEV: false, VITE_K1: 'true' })).toEqual({ k1: true, g5: false })
    expect(readFeatures({ DEV: false, VITE_G5: 'true' })).toEqual({ k1: false, g5: true })
    // only the exact string turns one on (the store build defines 'false')
    expect(readFeatures({ DEV: false, VITE_K1: 'false', VITE_G5: '1' })).toEqual({ k1: false, g5: false })
  })

  it('offer only the grades whose band is on', () => {
    expect(offeredGrades({ k1: false, g5: false })).toEqual([2, 3, 4])
    expect(offeredGrades({ k1: true, g5: false })).toEqual([0, 1, 2, 3, 4])
    expect(offeredGrades({ k1: false, g5: true })).toEqual([2, 3, 4, 5])
    expect(offeredGrades({ k1: true, g5: true })).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('a production build (no DEV, no flags) offers 2nd–4th grade, worded exactly as before', async () => {
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_K1', '')
    vi.stubEnv('VITE_G5', '')
    vi.resetModules()
    const f = await import('../features')
    expect(f.FEATURES).toEqual({ k1: false, g5: false })
    expect(f.OFFERED_GRADES).toEqual([2, 3, 4])
    const { curriculum } = await import('../../curriculum')
    expect(curriculum.gradeRange).toBe('2nd-to-4th grade')
  })

  it('a build with VITE_K1 / VITE_G5 offers those grades', async () => {
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_K1', 'true')
    vi.stubEnv('VITE_G5', 'true')
    vi.resetModules()
    const f = await import('../features')
    expect(f.OFFERED_GRADES).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('the dev server offers every grade', async () => {
    vi.stubEnv('DEV', true)
    vi.resetModules()
    const f = await import('../features')
    expect(f.OFFERED_GRADES).toEqual([0, 1, 2, 3, 4, 5])
  })
})

describe('grade range copy', () => {
  it('reads exactly as before for 2nd–4th grade', () => {
    // Welcome: "For kids finishing 2nd, 3rd, or 4th grade"; curriculum.gradeRange
    expect(gradeListText([2, 3, 4])).toBe('2nd, 3rd, or 4th grade')
    expect(gradeSpanText([2, 3, 4])).toBe('2nd-to-4th grade')
  })

  it('names kindergarten and spans longer runs', () => {
    expect(gradeListText([0, 1, 2, 3, 4, 5])).toBe('kindergarten through 5th grade')
    expect(gradeListText([2, 3, 4, 5])).toBe('2nd through 5th grade')
    expect(gradeListText([0, 1])).toBe('kindergarten or 1st grade')
    expect(gradeListText([0])).toBe('kindergarten')
    expect(gradeListText([4])).toBe('4th grade')
    expect(gradeSpanText([0, 1, 2, 3, 4, 5])).toBe('K-to-5th grade')
    expect(gradeSpanText([3])).toBe('3rd grade')
  })
})

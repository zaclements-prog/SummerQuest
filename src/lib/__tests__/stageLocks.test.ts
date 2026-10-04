import { describe, it, expect } from 'vitest'
import { getZone } from '../../curriculum'
import { isStageUnlocked, playableStageId } from '../stageLocks'

const zone = getZone('multiplication-mesa')!
const [s1, s2, s3] = zone.stages.map((s) => s.id)
const progress = (stars: Record<string, number>) => ({
  stages: Object.fromEntries(Object.entries(stars).map(([k, v]) => [k, { stars: v }])),
})

describe('stage locks', () => {
  it('opens a stage once the one before it has a star', () => {
    expect(isStageUnlocked(zone, s1, undefined)).toBe(true)
    expect(isStageUnlocked(zone, s2, undefined)).toBe(false)
    expect(isStageUnlocked(zone, s2, progress({ [s1]: 1 }))).toBe(true)
    expect(isStageUnlocked(zone, s3, progress({ [s1]: 3 }))).toBe(false)
  })

  it('keeps a stage that already has stars playable', () => {
    expect(isStageUnlocked(zone, s2, progress({ [s2]: 2 }))).toBe(true)
  })

  it('sends practice links to the first open step when the target is locked', () => {
    expect(playableStageId(zone, s2, undefined)).toBe(s1)
    expect(playableStageId(zone, s3, progress({ [s1]: 1 }))).toBe(s2)
    expect(playableStageId(zone, s2, progress({ [s1]: 1 }))).toBe(s2)
  })

  it('rejects unknown stage ids', () => {
    expect(isStageUnlocked(zone, 'nope', undefined)).toBe(false)
  })
})

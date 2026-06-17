import { describe, it, expect } from 'vitest'
import { WORLD_AREAS, areaById, worldColliders } from '../worldLayout'
import { getZone } from '../../curriculum'

describe('world layout', () => {
  it('has unique area ids', () => {
    const ids = WORLD_AREAS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('maps every area to a real curriculum zone', () => {
    for (const a of WORLD_AREAS) expect(getZone(a.zoneId), a.id).toBeTruthy()
  })

  it('gives every building a door and at least one collider', () => {
    for (const a of WORLD_AREAS.filter((a) => a.kind === 'building')) {
      expect(a.door, a.id).toBeTruthy()
      expect(a.colliders.length, a.id).toBeGreaterThan(0)
    }
  })

  it('areaById finds areas and returns undefined otherwise', () => {
    expect(areaById('fraction-falls')?.label).toBe('Fraction Falls')
    expect(areaById('nope')).toBeUndefined()
  })

  it('worldColliders() flattens every area collider plus the world bounds', () => {
    const total = WORLD_AREAS.reduce((n, a) => n + a.colliders.length, 0)
    expect(worldColliders().length).toBeGreaterThanOrEqual(total)
  })
})

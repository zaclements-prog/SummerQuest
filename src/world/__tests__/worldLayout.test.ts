import { describe, it, expect } from 'vitest'
import { WORLD_AREAS, areaById, worldColliders } from '../worldLayout'
import { WOODS_TREES } from '../areas/woodsTrees'
import { collidesAt } from '../collision'
import { getZone } from '../../curriculum'

describe('world layout', () => {
  it('has unique area ids', () => {
    const ids = WORLD_AREAS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('maps every gateway to a real curriculum zone (or a hub)', () => {
    for (const a of WORLD_AREAS) {
      if (a.zoneId) expect(getZone(a.zoneId), a.id).toBeTruthy()
      else expect(a.hub, `${a.id} needs a zoneId or a hub`).toBeTruthy()
    }
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

  it('gives every tree drawn in Word Problem Woods a collider', () => {
    const colliders = worldColliders()
    expect(WOODS_TREES.length).toBeGreaterThan(4)
    for (const { pos: [x, z] } of WOODS_TREES) expect(collidesAt(colliders, x, z, 0), `tree at ${x},${z}`).toBe(true)
  })

  it('leaves the path into the woods clearing open up to the NPC', () => {
    const colliders = worldColliders()
    const woods = areaById('word-problem-woods')!
    const [nx, nz] = [woods.worldPos[0] + woods.npc!.offset[0], woods.worldPos[1] + woods.npc!.offset[1]]
    // approaching from the house side (south, +z), the avatar (r 0.3) must reach the NPC
    for (let z = 0; z >= nz + 0.8; z -= 0.25) expect(collidesAt(colliders, nx, z, 0.3), `path at z=${z}`).toBe(false)
  })

  it('worldColliders() flattens every area collider plus the world bounds', () => {
    const total = WORLD_AREAS.reduce((n, a) => n + a.colliders.length, 0)
    expect(worldColliders().length).toBeGreaterThanOrEqual(total)
  })
})

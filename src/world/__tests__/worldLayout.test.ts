import { describe, it, expect } from 'vitest'
import {
  BRIDGES, PLAZA, RIVER, SPAWN, WALK_RADIUS, WORLD_AREAS, WORLD_PATHS,
  areaById, coastRadius, distToPolyline, npcPosition, scatterClear, worldColliders,
} from '../worldLayout'
import { collidesAt } from '../collision'
import { buildScatter } from '../terrain/scatterLayout'
import { getZone } from '../../curriculum'

describe('world layout', () => {
  it('has unique area ids', () => {
    const ids = WORLD_AREAS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('maps every gateway NPC to a real curriculum zone (or a hub)', () => {
    for (const a of WORLD_AREAS) {
      if (a.zoneId) expect(getZone(a.zoneId), a.id).toBeTruthy()
      if (a.npc) expect(a.zoneId || a.hub, `${a.id} needs a zoneId or a hub`).toBeTruthy()
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

  it('worldColliders() flattens every area collider plus the world bounds', () => {
    const total = WORLD_AREAS.reduce((n, a) => n + a.colliders.length, 0)
    expect(worldColliders().length).toBeGreaterThan(total)
  })

  it('keeps the walkable disc inside the coastline', () => {
    for (let i = 0; i < 360; i++) expect(coastRadius((i / 360) * Math.PI * 2)).toBeGreaterThan(WALK_RADIUS + 1)
  })

  it('stops the avatar at the island edge', () => {
    const c = worldColliders()
    expect(collidesAt(c, 0, WALK_RADIUS - 0.1, 0.3)).toBe(true)
    expect(collidesAt(c, 0, WALK_RADIUS - 0.5, 0.3)).toBe(false)
    expect(collidesAt(c, -(WALK_RADIUS + 2), 0, 0)).toBe(true)
  })

  it('puts every NPC on dry, open land inside the walkable disc', () => {
    const c = worldColliders()
    for (const a of WORLD_AREAS.filter((a) => a.npc)) {
      const [x, z] = npcPosition(a)!
      expect(Math.hypot(x, z), a.id).toBeLessThan(WALK_RADIUS - 1)
      expect(distToPolyline(x, z, RIVER.points), a.id).toBeGreaterThan(RIVER.width / 2 + 1)
      expect(collidesAt(c, x, z + 1, 0.3), `${a.id} approach`).toBe(false)
    }
  })

  it('blocks the river except on the bridges', () => {
    const c = worldColliders()
    // wading straight across the middle of the river is blocked…
    expect(collidesAt(c, 0, -19, 0.3)).toBe(true)
    expect(collidesAt(c, -16, -17, 0.3)).toBe(true)
    // …but each bridge deck is open end to end
    for (const b of BRIDGES) {
      for (let z = b.cz - b.length / 2; z <= b.cz + b.length / 2; z += 0.25) {
        expect(collidesAt(c, b.cx, z, 0.3), `bridge ${b.cx} at z=${z}`).toBe(false)
      }
    }
  })

  it('starts the player on the open plaza side of the House', () => {
    expect(collidesAt(worldColliders(), SPAWN[0], SPAWN[1], 0.3)).toBe(false)
    expect(Math.hypot(SPAWN[0] - PLAZA.cx, SPAWN[1] - PLAZA.cz)).toBeLessThan(PLAZA.r)
  })

  it('ends a footpath at (or right by) every NPC', () => {
    const ends = WORLD_PATHS.flatMap((p) => p.points)
    for (const a of WORLD_AREAS.filter((a) => a.npc)) {
      const [x, z] = npcPosition(a)!
      const nearest = Math.min(...ends.map(([px, pz]) => Math.hypot(px - x, pz - z)))
      expect(nearest, a.id).toBeLessThan(2.5)
    }
  })

  it('scatters decor deterministically and never on paths, river or areas', () => {
    const a = buildScatter('test-seed')
    const b = buildScatter('test-seed')
    expect(a.trees.length).toBeGreaterThan(40)
    expect(a.trees).toEqual(b.trees)
    for (const t of a.trees) expect(scatterClear(t.x, t.z), `tree at ${t.x},${t.z}`).toBe(true)
  })
})

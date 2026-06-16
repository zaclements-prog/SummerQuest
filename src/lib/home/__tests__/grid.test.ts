import { describe, it, expect } from 'vitest'
import { GRID_SIZE, tileToWorld, worldToTile, footprintTiles, canPlace } from '../grid'

describe('grid', () => {
  it('is a 20×20 floor', () => expect(GRID_SIZE).toBe(20))

  it('tile↔world round-trips at tile centers', () => {
    const w = tileToWorld(0, 0)
    expect(worldToTile(w.x, w.z)).toEqual({ gx: 0, gz: 0 })
    const w2 = tileToWorld(19, 19)
    expect(worldToTile(w2.x, w2.z)).toEqual({ gx: 19, gz: 19 })
  })

  it('footprintTiles swaps w/d for 90°/270° rotations', () => {
    expect(footprintTiles({ w: 2, d: 1 }, 1, 1, 0)).toEqual([
      { gx: 1, gz: 1 }, { gx: 2, gz: 1 },
    ])
    expect(footprintTiles({ w: 2, d: 1 }, 1, 1, 90)).toEqual([
      { gx: 1, gz: 1 }, { gx: 1, gz: 2 },
    ])
  })

  it('canPlace rejects out-of-bounds and overlaps, accepts free tiles', () => {
    const occupied = new Set(['5,5'])
    expect(canPlace(occupied, { w: 1, d: 1 }, 0, 0, 0)).toBe(true)
    expect(canPlace(occupied, { w: 1, d: 1 }, 5, 5, 0)).toBe(false) // overlap
    expect(canPlace(occupied, { w: 1, d: 1 }, 19, 19, 0)).toBe(true)
    expect(canPlace(occupied, { w: 2, d: 1 }, 19, 0, 0)).toBe(false) // off the right edge
    expect(canPlace(occupied, { w: 1, d: 1 }, -1, 0, 0)).toBe(false)
  })
})

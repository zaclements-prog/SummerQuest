import { describe, it, expect } from 'vitest'
import { buildScatter, byTile, SCATTER_TILE } from '../scatterLayout'

describe('island scatter tiles', () => {
  it('puts every item in exactly one tile, near its own position', () => {
    const s = buildScatter()
    for (const items of [s.trees, s.bushes, s.rocks, s.flowers, s.tufts]) {
      const tiles = byTile(items, SCATTER_TILE)
      const total = [...tiles.values()].reduce((n, list) => n + list.length, 0)
      expect(total).toBe(items.length)
      for (const [key, list] of tiles) {
        const [tx, tz] = key.split(',').map(Number)
        for (const it of list) {
          expect(it.x).toBeGreaterThanOrEqual(tx * SCATTER_TILE)
          expect(it.x).toBeLessThan((tx + 1) * SCATTER_TILE)
          expect(it.z).toBeGreaterThanOrEqual(tz * SCATTER_TILE)
          expect(it.z).toBeLessThan((tz + 1) * SCATTER_TILE)
        }
      }
    }
  })
  it('splits the island into a handful of tiles (each can be culled)', () => {
    const tiles = byTile(buildScatter().trees, SCATTER_TILE)
    expect(tiles.size).toBeGreaterThan(4)
    expect(tiles.size).toBeLessThanOrEqual(16)
  })
})

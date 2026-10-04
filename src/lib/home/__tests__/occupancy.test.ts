import { describe, it, expect } from 'vitest'
import { HOME_ITEMS } from '../catalog'
import { canPlace, tileKey, tileToWorld, worldToTile, GRID_SIZE } from '../grid'
import {
  occupiedTiles, avatarBlockers, avatarBlockedAt, nearestFreeTile, avatarSpawnPoint,
} from '../occupancy'
import type { PlacedLike } from '../occupancy'
import { walkStep } from '../../../world/collision'

const R = 0.3 // the avatar's body radius in useWanderWalk
const BOUND = (GRID_SIZE * 1) / 2 - 0.6

// A 2×2 table over the room centre (tiles 4..5 × 4..5, i.e. world x,z in [-1, 1]),
// which covers the avatar's (0,0) spawn point.
const table: PlacedLike = { uid: 't1', itemId: 'table', gx: 4, gz: 4, rot: 0 }
// A 2×3 rug at tiles 0..1 × 0..2.
const rug: PlacedLike = { uid: 'r1', itemId: 'rug', gx: 0, gz: 0, rot: 0 }
// A chair right next to the table, east side (tile 6,4).
const chair: PlacedLike = { uid: 'c1', itemId: 'chair', gx: 6, gz: 4, rot: 0 }

/** Walk the avatar for `frames` frames of `dt` in direction (ux,uz) at 3 u/s. */
function walk(blockers: Map<string, string>, x: number, z: number, ux: number, uz: number, frames = 60, dt = 1 / 60) {
  const blocked = (px: number, pz: number, fx: number, fz: number) => avatarBlockedAt(blockers, px, pz, fx, fz)
  let p = { x, z }
  for (let i = 0; i < frames; i++) p = walkStep(p.x, p.z, ux * 3 * dt, uz * 3 * dt, blocked, R, BOUND)
  return p
}

describe('walkable items', () => {
  it('only the rug is flagged walkable', () => {
    expect(HOME_ITEMS.filter((i) => i.walkable).map((i) => i.id)).toEqual(['rug'])
  })

  it('a rug still blocks placing furniture on it', () => {
    const occ = occupiedTiles([rug])
    expect(occ.has('0,0')).toBe(true)
    expect(canPlace(occ, { w: 1, d: 1 }, 1, 2, 0)).toBe(false)
    expect(canPlace(occ, { w: 1, d: 1 }, 2, 0, 0)).toBe(true)
  })

  it('a rug never blocks the avatar', () => {
    const blockers = avatarBlockers([rug])
    expect(blockers.size).toBe(0)
    const c = tileToWorld(1, 1)
    expect(avatarBlockedAt(blockers, c.x, c.z, c.x + 2, c.z)).toBe(false)
    // walking right across the rug
    const start = tileToWorld(0, 4)
    const end = walk(blockers, start.x, start.z, 0, -1, 80)
    expect(end.z).toBeLessThan(tileToWorld(0, 1).z)
  })
})

describe('occupiedTiles', () => {
  it('covers every placed footprint and can ignore the item being moved', () => {
    const occ = occupiedTiles([table, chair])
    expect([...occ].sort()).toEqual(['4,4', '4,5', '5,4', '5,5', '6,4'])
    expect(occupiedTiles([table, chair], 't1').has('4,4')).toBe(false)
  })
})

describe('avatar vs furniture', () => {
  const blockers = avatarBlockers([table, chair])

  it('maps furniture tiles to the item covering them', () => {
    expect(blockers.get('5,5')).toBe('t1')
    expect(blockers.get('6,4')).toBe('c1')
    expect(blockers.has('3,3')).toBe(false)
  })

  it('blocks walking into furniture from outside', () => {
    expect(avatarBlockedAt(blockers, 0.5, 0.5, 0.5, 2.5)).toBe(true) // probe on the table, body south of it
    const p = walk(blockers, -2.5, -0.5, 1, 0) // west of the table, heading east
    expect(p.x).toBeLessThanOrEqual(-1 - R + 1e-9) // stopped flush against it
    expect(worldToTile(p.x, p.z)).toEqual({ gx: 3, gz: 4 })
  })

  it('lets an avatar standing inside furniture walk out (e.g. spawned at 0,0 under a table)', () => {
    expect(avatarBlockedAt(blockers, 0.3, 0, 0, 0)).toBe(false)
    const p = walk(blockers, 0, 0, 0, 1) // walk south out of the table
    expect(p.z).toBeGreaterThan(1)
    expect(blockers.has(tileKey(worldToTile(p.x, p.z)))).toBe(false)
  })

  it('cannot walk back into that furniture once out', () => {
    const out = walk(blockers, 0, 0, 0, 1)
    const back = walk(blockers, out.x, out.z, 0, -1)
    expect(back.z).toBeGreaterThanOrEqual(1 + R - 1e-9)
  })

  it('still cannot walk from inside one item into another', () => {
    const inside = tileToWorld(5, 4) // east half of the table; the chair is next door at 6,4
    const p = walk(blockers, inside.x, inside.z, 1, 0)
    expect(p.x).toBeLessThanOrEqual(1 - R + 1e-9)
    expect(blockers.get(tileKey(worldToTile(p.x, p.z)))).not.toBe('c1')
  })
})

describe('spawn', () => {
  it('keeps the room centre when it is free', () => {
    expect(avatarSpawnPoint(avatarBlockers([rug, chair]))).toEqual({ x: 0, z: 0 })
  })

  it('moves the spawn to the nearest free tile when furniture covers the centre', () => {
    const blockers = avatarBlockers([table])
    const p = avatarSpawnPoint(blockers)
    const t = worldToTile(p.x, p.z)
    expect(blockers.has(tileKey(t))).toBe(false)
    expect(Math.hypot(t.gx - 5, t.gz - 5)).toBeLessThanOrEqual(2)
  })

  it('nearestFreeTile returns null when the whole floor is covered', () => {
    const all = new Map<string, string>()
    for (let gx = 0; gx < GRID_SIZE; gx++) for (let gz = 0; gz < GRID_SIZE; gz++) all.set(tileKey({ gx, gz }), 'x')
    expect(nearestFreeTile(all, { gx: 5, gz: 5 })).toBeNull()
    expect(avatarSpawnPoint(all)).toEqual({ x: 0, z: 0 })
  })
})

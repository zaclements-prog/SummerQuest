import { describe, it, expect } from 'vitest'
import { collidesAt, insideFootprint, slideMove, frontFacingWalls, walkStep, MAX_WALK_DT } from '../collision'
import type { Collider } from '../worldLayout'

const wall: Collider[] = [{ kind: 'box', cx: 0, cz: 0, w: 2, d: 0.4 }] // a thin wall on x-axis
const tree: Collider[] = [{ kind: 'circle', cx: 5, cz: 0, r: 0.5 }]

describe('collidesAt', () => {
  it('blocks inside a box (with radius)', () => {
    expect(collidesAt(wall, 0, 0, 0.3)).toBe(true)
    expect(collidesAt(wall, 0, 0.19, 0.05)).toBe(true) // edge of the wall
  })
  it('passes clearly outside a box', () => {
    expect(collidesAt(wall, 0, 1.5, 0.3)).toBe(false)
  })
  it('blocks inside a circle (with radius) and passes outside', () => {
    expect(collidesAt(tree, 5, 0, 0.3)).toBe(true)
    expect(collidesAt(tree, 5, 1.2, 0.3)).toBe(false)
  })
})

describe('insideFootprint', () => {
  const fp = { cx: 0, cz: 0, w: 5, d: 5 }
  it('is true within the footprint + margin and false outside', () => {
    expect(insideFootprint(fp, 1, 1, 0.2)).toBe(true)
    expect(insideFootprint(fp, 3, 0, 0.2)).toBe(false) // x 3 > half 2.5 + margin
  })
})

describe('slideMove', () => {
  // collide blocks any z >= 1 (a wall to the "north")
  const collide = (_x: number, z: number) => z >= 1
  it('moves freely when unobstructed', () => {
    expect(slideMove(0, 0, 0.5, 0.0, collide)).toEqual({ x: 0.5, z: 0 })
  })
  it('slides along a wall: blocked axis is dropped, free axis keeps moving', () => {
    // trying to move +x and +z into the wall: x advances, z is blocked
    expect(slideMove(0, 0.9, 0.5, 0.5, collide)).toEqual({ x: 0.5, z: 0.9 })
  })
})

describe('walkStep', () => {
  const R = 0.3
  const thinWall: Collider[] = [{ kind: 'box', cx: 1, cz: 0, w: 0.3, d: 4 }] // x in [0.85, 1.15]
  const blocked = (x: number, z: number) => collidesAt(thinWall, x, z, 0)

  it('moves freely when unobstructed', () => {
    expect(walkStep(0, 0, 0.1, -0.05, blocked, R, 20)).toEqual({ x: 0.1, z: -0.05 })
  })

  it('a huge step (slow frame / tab back from hidden) cannot tunnel through a thin wall', () => {
    // one 1-second frame at walk speed 3: probing only the end point would see open ground
    expect(blocked(3 + R, 0)).toBe(false)
    const p = walkStep(0, 0, 3, 0, blocked, R, 20)
    expect(p.x).toBeLessThan(0.85 - R + 1e-9) // stopped flush on the near side
    expect(p.x).toBeGreaterThan(0.85 - R - 0.16) // ...after actually walking up to it
  })

  it('slides along the wall on the free axis', () => {
    const p = walkStep(0.5, 0, 1, 1, blocked, R, 20)
    expect(p.x).toBeLessThan(0.85 - R + 1e-9)
    expect(p.z).toBeCloseTo(1)
  })

  it('stays within the bound, and terminates with a zero radius', () => {
    expect(walkStep(0, 0, 50, -50, () => false, R, 4)).toEqual({ x: 4, z: -4 })
    expect(walkStep(0, 0, 1, 0, () => false, 0, 20).x).toBeCloseTo(1)
  })

  it('passes the body centre to the blocked test', () => {
    const seen: [number, number][] = []
    walkStep(2, 3, 0.1, 0, (_x, _z, fx, fz) => { seen.push([fx, fz]); return false }, R, 20)
    expect(seen[0]).toEqual([2, 3])
  })

  it('caps the integrated frame time so one frame of walking stays under the body radius', () => {
    expect(MAX_WALK_DT).toBeLessThanOrEqual(0.05)
    expect(3 * MAX_WALK_DT).toBeLessThan(R) // 3 = WALK_SPEED
  })
})

describe('frontFacingWalls', () => {
  it('returns the +x and +z walls for the default iso camera (looking toward -x,-z)', () => {
    expect(frontFacingWalls()).toEqual(['px', 'pz'])
  })
})

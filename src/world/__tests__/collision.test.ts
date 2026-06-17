import { describe, it, expect } from 'vitest'
import { collidesAt, insideFootprint, slideMove, frontFacingWalls } from '../collision'
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

describe('frontFacingWalls', () => {
  it('returns the +x and +z walls for the default iso camera (looking toward -x,-z)', () => {
    expect(frontFacingWalls()).toEqual(['px', 'pz'])
  })
})

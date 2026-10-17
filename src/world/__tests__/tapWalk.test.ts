import { describe, it, expect } from 'vitest'
import { groundHit, tapWalkFrame, walkKey, TAP_ARRIVE, TAP_STUCK_SECONDS } from '../tapWalk'
import { collidesAt, insideFootprint } from '../collision'
import type { Collider } from '../worldLayout'
import { areaById, insideDoorSpot, worldColliders } from '../worldLayout'

const R = 0.3 // the avatar's body radius in useWanderWalk
const SPEED = 3
const DT = 1 / 60
const free = () => false

/** Run frames until the walk reports done (or a frame budget runs out). */
function walk(
  from: [number, number], to: [number, number],
  blocked: (x: number, z: number, fx: number, fz: number) => boolean = free,
  maxFrames = 2000,
) {
  let x = from[0]
  let z = from[1]
  let stuck = 0
  for (let i = 0; i < maxFrames; i++) {
    const f = tapWalkFrame(x, z, to[0], to[1], stuck, SPEED, DT, blocked, R, 40)
    x = f.x
    z = f.z
    stuck = f.stuck
    if (f.done) return { x, z, done: f.done, frames: i + 1 }
  }
  return { x, z, done: null, frames: maxFrames }
}

describe('groundHit (camera ray → ground plane y = 0)', () => {
  it('hits the ground where a downward ray crosses y = 0', () => {
    expect(groundHit(0, 10, 0, 0, -1, 0)).toEqual([0, 0])
    const [x, z] = groundHit(10.5, 12.5, 11, -1, -1, -1)!
    expect(x).toBeCloseTo(-2)
    expect(z).toBeCloseTo(-1.5)
  })

  it('misses for rays pointing up, level, or absurdly far', () => {
    expect(groundHit(0, 10, 0, 0, 1, 0)).toBeNull()
    expect(groundHit(0, 10, 0, 1, 0, 0)).toBeNull()
    expect(groundHit(0, 10, 0, 1, -0.001, 0)).toBeNull() // ~10 000 units away
  })
})

describe('tapWalkFrame', () => {
  it('walks straight to an open target and stops there without overshooting', () => {
    const r = walk([0, 0], [3, 4])
    expect(r.done).toBe('arrived')
    expect(Math.hypot(r.x - 3, r.z - 4)).toBeLessThanOrEqual(TAP_ARRIVE)
    // 5 units at 3 u/s ≈ 100 frames at 60 fps
    expect(r.frames).toBeGreaterThan(90)
    expect(r.frames).toBeLessThan(110)
  })

  it('moves at walking speed and faces the target', () => {
    const f = tapWalkFrame(0, 0, 10, 0, 0, SPEED, 0.05, free, R, 40)
    expect(f.x).toBeCloseTo(0.15)
    expect(f.z).toBeCloseTo(0)
    expect(f.moving).toBe(true)
    expect(f.facing).toBeCloseTo(Math.PI / 2)
    expect(f.done).toBeNull()
  })

  it('a target already underfoot counts as arrived', () => {
    const f = tapWalkFrame(1, 1, 1.05, 1, 0, SPEED, DT, free, R, 40)
    expect(f.done).toBe('arrived')
    expect(f.moving).toBe(false)
  })

  it('stops (blocked) at a wall straight across the way, flush and after a moment', () => {
    const wall: Collider[] = [{ kind: 'box', cx: 2, cz: 0, w: 0.3, d: 10 }]
    const blocked = (x: number, z: number) => collidesAt(wall, x, z, 0)
    const r = walk([0, 0], [5, 0], blocked)
    expect(r.done).toBe('blocked')
    expect(r.x).toBeLessThan(2 - 0.15) // never inside the wall
    expect(r.x).toBeGreaterThan(2 - 0.15 - R - 0.1) // stopped flush against it
    // walked ~1.5 units (≈30 frames), then waited TAP_STUCK_SECONDS before giving up
    expect(r.frames * DT).toBeGreaterThan(TAP_STUCK_SECONDS)
    expect(r.frames * DT).toBeLessThan(1.5 / SPEED + TAP_STUCK_SECONDS + 0.2)
  })

  it('slides along a wall at an angle, like keyboard walking', () => {
    const wall: Collider[] = [{ kind: 'box', cx: 0, cz: 2, w: 20, d: 0.3 }]
    const blocked = (x: number, z: number) => collidesAt(wall, x, z, 0)
    const r = walk([0, 0], [6, 3], blocked)
    // it can't get to z = 3, but it keeps sliding along +x while that still gets it closer
    expect(r.done).toBe('blocked')
    expect(r.z).toBeLessThan(2)
    expect(r.x).toBeGreaterThan(3)
  })

  it('stays within the walk bound', () => {
    const r = walk([0, 0], [10, 0], free)
    expect(r.done).toBe('arrived')
    let x = 0
    let stuck = 0
    for (let i = 0; i < 400; i++) {
      const f = tapWalkFrame(x, 0, 10, 0, stuck, SPEED, DT, free, R, 2)
      x = f.x
      stuck = f.stuck
      if (f.done) {
        expect(f.done).toBe('blocked')
        break
      }
    }
    expect(x).toBeLessThanOrEqual(2)
  })

  it('in the World: from the spawn, a tap on the plaza walks there through the real colliders', () => {
    const colliders = worldColliders()
    const blocked = (x: number, z: number) => collidesAt(colliders, x, z, 0)
    const r = walk([0, -3.5], [3, 0], blocked)
    expect(r.done).toBe('arrived')
  })
})

describe('walkKey', () => {
  it('maps WASD and the arrow keys; ignores the rest', () => {
    expect(['w', 'A', 's', 'D'].map(walkKey)).toEqual(['w', 'a', 's', 'd'])
    expect(['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].map(walkKey)).toEqual(['w', 'a', 's', 'd'])
    expect(walkKey('e')).toBeNull()
    expect(walkKey('Escape')).toBeNull()
  })
})

describe('House return spot', () => {
  it('is just inside the House door, on open floor', () => {
    const house = areaById('house')!
    const [x, z] = insideDoorSpot('house')
    expect(insideFootprint({ cx: house.worldPos[0], cz: house.worldPos[1], w: house.size!, d: house.size! }, x, z, 0.1)).toBe(true)
    expect(Math.abs(z - house.door!.pos[1])).toBeLessThanOrEqual(1.2)
    expect(collidesAt(worldColliders(), x, z, R)).toBe(false)
  })
})

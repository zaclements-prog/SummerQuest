import { describe, it, expect } from 'vitest'
import { BUDDY, followStep, placeBuddy } from '../buddyFollow'
import type { Blocked, BuddyBody } from '../buddyFollow'
import { collidesAt } from '../collision'
import type { Collider } from '../worldLayout'

const open: Blocked = () => false
const body = (x: number, z: number): BuddyBody => ({ x, z, yaw: 0, moving: false, stuck: 0 })
const dist = (b: BuddyBody, px: number, pz: number) => Math.hypot(px - b.x, pz - b.z)

/** Run `seconds` of 60 fps frames with the player standing at (px, pz). */
function run(b: BuddyBody, px: number, pz: number, seconds: number, blocked: Blocked = open) {
  let pops = 0
  for (let i = 0; i < seconds * 60; i++) if (followStep(b, px, pz, 1 / 60, blocked)) pops++
  return pops
}

describe('the World buddy following you', () => {
  it('trots up and stops about 1.2 behind you', () => {
    const b = body(0, 4)
    followStep(b, 0, 0, 1 / 60, open)
    expect(b.moving).toBe(true)
    run(b, 0, 0, 2)
    expect(dist(b, 0, 0)).toBeGreaterThanOrEqual(BUDDY.follow - 1e-9)
    expect(dist(b, 0, 0)).toBeLessThan(BUDDY.follow + 0.1)
    expect(b.moving).toBe(false)
    // and faces you
    expect(Math.abs(b.yaw - Math.PI) % (2 * Math.PI)).toBeLessThan(0.05)
  })

  it('keeps up with you walking (3 per second)', () => {
    const b = body(0, 1.2)
    let pz = 0
    for (let i = 0; i < 300; i++) {
      pz -= 3 / 60
      followStep(b, 0, pz, 1 / 60, open)
    }
    const d = dist(b, 0, pz)
    expect(d).toBeGreaterThan(BUDDY.follow)
    expect(d).toBeLessThan(2.2)
  })

  it('pops back beside you from more than 6 behind', () => {
    const b = body(0, 9)
    expect(followStep(b, 0, 0, 1 / 60, open)).toBe(true)
    expect(dist(b, 0, 0)).toBeCloseTo(BUDDY.follow, 5)
    // on its own side of you
    expect(b.z).toBeGreaterThan(0)
  })

  it('slides along a wall, and pops round it when truly stuck', () => {
    // a long wall between it (z = 3) and you (z = 0)
    const wall: Collider[] = [{ kind: 'box', cx: 0, cz: 1.6, w: 40, d: 0.4 }]
    const blocked = (x: number, z: number) => collidesAt(wall, x, z, 0)
    const b = body(0.5, 3)
    expect(run(b, 0, 0, 0.5, blocked)).toBe(0)
    expect(b.z).toBeGreaterThan(1.6) // still on its side
    const pops = run(b, 0, 0, 1.5, blocked)
    expect(pops).toBeGreaterThan(0)
    expect(b.z).toBeLessThan(1.6) // now on your side
  })

  it('never lands inside something when it pops', () => {
    const rock: Collider[] = [{ kind: 'circle', cx: 0, cz: 1.2, r: 0.6 }]
    const blocked = (x: number, z: number) => collidesAt(rock, x, z, 0)
    const b = body(0, 3)
    placeBuddy(b, 0, 0, 0, 3, blocked) // its own side is the rock: tries the next ones round
    expect(blocked(b.x, b.z)).toBe(false)
    expect(dist(b, 0, 0)).toBeCloseTo(BUDDY.follow, 5)
    // nowhere fits: right where you stand
    placeBuddy(b, 0, 0, 0, 3, () => true)
    expect([b.x, b.z]).toEqual([0, 0])
  })
})

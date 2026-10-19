import { describe, expect, it } from 'vitest'
import { handPlace, sameBox, spotBox, unionBox } from '../placement'

describe('guide placement', () => {
  it('unions boxes (a row of cards spotlit as one)', () => {
    expect(unionBox([])).toBeNull()
    expect(
      unionBox([
        { x: 10, y: 20, w: 100, h: 100 },
        { x: 130, y: 25, w: 100, h: 100 },
      ]),
    ).toEqual({ x: 10, y: 20, w: 220, h: 105 })
  })

  it('pads the spotlight and rounds small things fully', () => {
    const big = spotBox({ x: 100, y: 100, w: 400, h: 300 }, 10)
    expect(big).toMatchObject({ x: 90, y: 90, w: 420, h: 320 })
    expect(big.r).toBe(38)
    const small = spotBox({ x: 0, y: 0, w: 40, h: 40 }, 6)
    expect(small.r).toBe(26) // a circle: half of 52
  })

  it('puts the hand below the target, fingertip inside it', () => {
    const t = { x: 300, y: 100, w: 200, h: 100 }
    const p = handPlace(t, 64, 1024, 768, 'tap')
    expect(p.flip).toBe(false)
    const tipX = p.x + 0.42 * 64
    const tipY = p.y + 0.05 * 64
    expect(tipX).toBeCloseTo(400, 0)
    expect(tipY).toBeGreaterThan(t.y + t.h / 2)
    expect(tipY).toBeLessThan(t.y + t.h)
    expect(p.sweep).toBe(0)
  })

  it('flips above a target near the bottom, and stays on screen', () => {
    const p = handPlace({ x: 900, y: 440, w: 120, h: 80 }, 64, 1024, 528, 'tap')
    expect(p.flip).toBe(true)
    expect(p.y + 64).toBeLessThanOrEqual(528)
    expect(p.x + 64).toBeLessThanOrEqual(1024)
  })

  it('sweeps along a row of cards, never past its ends', () => {
    const row = { x: 480, y: 200, w: 520, h: 170 }
    const p = handPlace(row, 64, 1024, 528, 'sweep')
    expect(p.sweep).toBeGreaterThan(150)
    expect(p.x - p.sweep).toBeGreaterThanOrEqual(row.x - 64)
    expect(p.x + p.sweep + 64).toBeLessThanOrEqual(1024)
  })

  it('compares boxes to the pixel', () => {
    expect(sameBox({ x: 1.2, y: 2, w: 3, h: 4 }, { x: 1.4, y: 2, w: 3, h: 4 })).toBe(true)
    expect(sameBox({ x: 1, y: 2, w: 3, h: 4 }, { x: 2, y: 2, w: 3, h: 4 })).toBe(false)
    expect(sameBox(null, null)).toBe(true)
    expect(sameBox(null, { x: 0, y: 0, w: 1, h: 1 })).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { SPEED_MAX, STREAK_MAX_MULT, hitScore, multLabel, speedBonus, streakMultiplier } from '../score'

describe('streakMultiplier', () => {
  it('climbs ×0.25 per clean answer in a row and caps at ×2', () => {
    expect([1, 2, 3, 4, 5, 6, 9].map(streakMultiplier)).toEqual([1, 1.25, 1.5, 1.75, 2, 2, 2])
    expect(streakMultiplier(100)).toBe(STREAK_MAX_MULT)
  })
  it('treats 0 / garbage as the first answer', () => {
    expect(streakMultiplier(0)).toBe(1)
    expect(streakMultiplier(-3)).toBe(1)
    expect(streakMultiplier(2.9)).toBe(1.25)
  })
})

describe('speedBonus', () => {
  it('pays the share of the threat/clock still left', () => {
    expect(speedBonus(1)).toBe(SPEED_MAX)
    expect(speedBonus(0.5)).toBe(SPEED_MAX / 2)
    expect(speedBonus(0)).toBe(0)
  })
  it('clamps out-of-range and non-finite input', () => {
    expect(speedBonus(2)).toBe(SPEED_MAX)
    expect(speedBonus(-1)).toBe(0)
    expect(speedBonus(Number.NaN)).toBe(0)
    expect(speedBonus(0.5, 100)).toBe(50)
  })
})

describe('hitScore', () => {
  it('is (base + speed) × streak multiplier, rounded', () => {
    expect(hitScore({ base: 100, fractionLeft: 1, streak: 1 })).toEqual({ base: 100, speed: 60, mult: 1, points: 160 })
    expect(hitScore({ base: 100, fractionLeft: 0.5, streak: 3 })).toEqual({ base: 100, speed: 30, mult: 1.5, points: 195 })
    expect(hitScore({ base: 200, fractionLeft: 0, streak: 9 }).points).toBe(400)
  })
  it('never goes below the base for a right answer', () => {
    for (let s = 0; s < 10; s++) for (let f = -1; f <= 2; f += 0.25) expect(hitScore({ base: 100, fractionLeft: f, streak: s }).points).toBeGreaterThanOrEqual(100)
  })
})

describe('multLabel', () => {
  it('prints a multiplier without trailing zeros', () => {
    expect(multLabel(1.5)).toBe('×1.5')
    expect(multLabel(2)).toBe('×2')
    expect(multLabel(1.25)).toBe('×1.25')
  })
})

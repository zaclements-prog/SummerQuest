import { describe, expect, it } from 'vitest'
import {
  ROUNDS,
  STAR_THRESHOLDS,
  arenaStars,
  isRightCrystal,
  makePedestalOptions,
  parseDivRound,
  shatters,
  splitPositions,
  trueFactors,
} from '../divisionCore'

describe('parseDivRound', () => {
  it('reads a division provider problem', () => {
    const r = parseDivRound({ prompt: '56 ÷ 8 = ?', answer: 7, factId: 'div:56/8' })
    expect(r).toEqual({ dividend: 56, divisor: 8, quotient: 7, factId: 'div:56/8' })
  })
  it('rejects non-division prompts and non-whole answers', () => {
    expect(() => parseDivRound({ prompt: '6 × 7 = ?', answer: 42 })).toThrow()
    expect(() => parseDivRound({ prompt: '25 ÷ 4 = ?', answer: 6 })).toThrow()
  })
})

describe('makePedestalOptions', () => {
  it('always contains exactly 3 unique crystals including the right divisor', () => {
    for (let trial = 0; trial < 200; trial++) {
      const divisor = 2 + (trial % 11)
      const quotient = 2 + ((trial * 7) % 10)
      const dividend = divisor * quotient
      const opts = makePedestalOptions(dividend, divisor)
      expect(opts).toHaveLength(3)
      expect(new Set(opts).size).toBe(3)
      expect(opts).toContain(divisor)
      for (const d of opts) expect(d).toBeGreaterThanOrEqual(2)
    }
  })
  it('places the answer at every pedestal position (no fixed-slot bias)', () => {
    const seen = new Set<number>()
    for (let trial = 0; trial < 300; trial++) seen.add(makePedestalOptions(24, 3).indexOf(3))
    expect(seen).toEqual(new Set([0, 1, 2]))
  })
  it('distractors are meaningful: near-divisor confusions or true factors', () => {
    // for 24 ÷ 3: near = 2,4,1,5 — 2 and 4 are true factors too; all legit
    const opts = makePedestalOptions(24, 3)
    for (const d of opts.filter((x: number) => x !== 3)) {
      expect(d >= 1 && d <= 12).toBe(true)
    }
  })
})

describe('shatter / right-crystal semantics', () => {
  it('right crystal = exact fact divisor', () => {
    expect(isRightCrystal(3, 3)).toBe(true)
    expect(isRightCrystal(3, 4)).toBe(false)
  })
  it('true factors shatter (wrong count), non-divisors bounce', () => {
    expect(shatters(24, 4)).toBe(true) // shatters, but wrong camel count vs pen
    expect(shatters(24, 5)).toBe(false) // bounce
    expect(shatters(24, 12)).toBe(true)
    expect(shatters(7, 2)).toBe(false)
  })
})

describe('trueFactors', () => {
  it('lists whole divisors in range', () => {
    expect(trueFactors(24)).toEqual([2, 3, 4, 6, 8])
    expect(trueFactors(7)).toEqual([7])
    expect(trueFactors(13)).toEqual([]) // 13 > max 10 default
  })
})

describe('splitPositions', () => {
  it('returns one scatter point per mini (capped at 12), around the pen', () => {
    expect(splitPositions(8, 10, 4)).toHaveLength(8)
    expect(splitPositions(20, 10, 4)).toHaveLength(12)
    const [x, z] = splitPositions(6, 10, 4)[0]
    expect(Math.hypot(x - 10, z - 4)).toBeLessThanOrEqual(1.3)
  })
})

describe('arenaStars', () => {
  it('matches the [1,3,5] thresholds over 5 rounds', () => {
    expect(ROUNDS).toBe(5)
    expect(STAR_THRESHOLDS).toEqual([1, 3, 5])
    expect([0, 1, 2, 3, 4, 5].map(arenaStars)).toEqual([0, 1, 1, 2, 2, 3])
  })
})

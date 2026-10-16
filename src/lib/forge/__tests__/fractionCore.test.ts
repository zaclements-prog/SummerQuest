import { describe, expect, it } from 'vitest'
import {
  FORGE_LIMITS,
  ROUNDS,
  fillState,
  forgeFactConfig,
  forgeStarThresholds,
  forgeStars,
  parseFracEqRound,
  slabOffsets,
} from '../fractionCore'

describe('parseFracEqRound', () => {
  it('reads a fraction-equivalence provider problem', () => {
    const r = parseFracEqRound({ prompt: '2/3 = ?/6', answer: 4, factId: 'frac-eq:2/3=?/6' })
    expect(r).toEqual({ baseNum: 2, baseDenom: 3, targetDenom: 6, targetNum: 4, factId: 'frac-eq:2/3=?/6' })
  })
  it('rejects non-equivalence prompts and non-whole answers', () => {
    expect(() => parseFracEqRound({ prompt: '24 ÷ 3 = ?', answer: 8 })).toThrow()
    expect(() => parseFracEqRound({ prompt: '2/3 = ?/5', answer: 3 })).toThrow() // 5 not a multiple of 3
    expect(() => parseFracEqRound({ prompt: '2/3 = ?/6', answer: 3 })).toThrow() // answer ≠ 2·(6/3)
    expect(() => parseFracEqRound({ prompt: '2/3 = ?/6', answer: 4.5 })).toThrow()
  })
})

describe('fillState', () => {
  it('classifies short / exact / over', () => {
    expect(fillState(3, 4)).toBe('short')
    expect(fillState(4, 4)).toBe('exact')
    expect(fillState(5, 4)).toBe('over')
  })
})

describe('forgeFactConfig', () => {
  it('never exceeds the model limit, whatever the grade widens to', () => {
    // grade tiers: G2 8, G3 12, G4 16 — the forge must stay ≤ 12
    for (const tierDenomMax of [2, 8, 12, 16, 99]) {
      const c = forgeFactConfig(tierDenomMax)
      expect(c.maxDenominator).toBeLessThanOrEqual(FORGE_LIMITS.denomMax)
      expect(c.maxDenominator).toBeLessThanOrEqual(Math.max(2, tierDenomMax))
      expect(c.maxDenominator).toBeGreaterThanOrEqual(2)
    }
    expect(forgeFactConfig(16).maxDenominator).toBe(12)
    expect(forgeFactConfig(8).maxDenominator).toBe(8)
  })
  it('keeps every servable round inside what the gauge can show', () => {
    const c = forgeFactConfig(16)
    // worst case: the largest target numerator the config can produce
    const maxSlabs = c.maxDenominator - 1
    expect(slabOffsets(maxSlabs, 2.6)).toHaveLength(maxSlabs)
  })
})

describe('slabOffsets', () => {
  it('is centered, ordered and evenly spaced', () => {
    const o = slabOffsets(4, 2.4)
    expect(o).toHaveLength(4)
    expect(o.reduce((a, b) => a + b, 0)).toBeCloseTo(0)
    for (let i = 1; i < o.length; i++) expect(o[i] - o[i - 1]).toBeCloseTo(0.6)
  })
  it('handles the degenerate rows', () => {
    expect(slabOffsets(1, 2.4)).toEqual([0])
    expect(slabOffsets(0, 2.4)).toEqual([])
  })
})

describe('forgeStars', () => {
  it('matches the arena shape over 5 rounds', () => {
    expect(ROUNDS).toBe(5)
    expect(forgeStarThresholds(5)).toEqual([1, 3, 5])
    expect([0, 1, 2, 3, 4, 5].map((n) => forgeStars(n, 5))).toEqual([0, 1, 1, 2, 2, 3])
  })
  it('requires a clean run over the stage\'s 6 questions for 3 stars', () => {
    expect(forgeStarThresholds(6)).toEqual([2, 4, 6])
    expect([0, 1, 2, 3, 4, 5, 6].map((n) => forgeStars(n, 6))).toEqual([0, 0, 1, 1, 2, 2, 3])
  })
})

import { describe, expect, it } from 'vitest'
import {
  FORGE_LIMITS,
  MAX_STACK,
  ROUNDS,
  SCORE,
  fillState,
  forgeFactConfig,
  forgeProblemCount,
  forgeRunPlan,
  forgeScore,
  forgeStarThresholds,
  forgeStars,
  parseFracEqRound,
  pourOutcome,
  slabOffsets,
  stampStack,
} from '../fractionCore'

describe('stampStack', () => {
  it('stamps up and nibbles down, clamped to 0..MAX_STACK', () => {
    expect(stampStack(0, 1)).toBe(1)
    expect(stampStack(3, -1)).toBe(2)
    expect(stampStack(0, -1)).toBe(0)
    expect(stampStack(MAX_STACK, 1)).toBe(MAX_STACK)
  })
  it('lets the kid build any answer the forge can ask (≤ 11 slabs for /12)', () => {
    expect(MAX_STACK).toBeGreaterThanOrEqual(FORGE_LIMITS.denomMax)
  })
})

describe('pourOutcome', () => {
  it('fills exactly and keeps the candy', () => {
    expect(pourOutcome(0, 4, 4)).toEqual({ state: 'exact', total: 4, fitted: 4, spill: 0, gap: 0, moldAfter: 4 })
  })
  it('stops short, keeps the poured slabs and shows the gap', () => {
    expect(pourOutcome(0, 3, 6)).toEqual({ state: 'short', total: 3, fitted: 3, spill: 0, gap: 3, moldAfter: 3 })
  })
  it('a second pour adds to what is already in the mold', () => {
    const first = pourOutcome(0, 3, 6)
    expect(pourOutcome(first.moldAfter, 3, 6).state).toBe('exact')
    expect(pourOutcome(first.moldAfter, 2, 6)).toMatchObject({ state: 'short', gap: 1, moldAfter: 5 })
  })
  it('overflows: the extras spill and the mold tips out', () => {
    expect(pourOutcome(0, 8, 6)).toEqual({ state: 'over', total: 8, fitted: 6, spill: 2, gap: 0, moldAfter: 0 })
    expect(pourOutcome(4, 3, 6)).toMatchObject({ state: 'over', spill: 1, moldAfter: 0 })
  })
  it('agrees with fillState for every count', () => {
    for (let t = 1; t <= 11; t++) for (let n = 1; n <= MAX_STACK; n++) expect(pourOutcome(0, n, t).state).toBe(fillState(n, t))
  })
})

describe('forgeRunPlan', () => {
  it('builds the arc: 2 warm-ups (ruler), rush orders, a two-candy finale', () => {
    const plan = forgeRunPlan(5)
    expect(plan.map((r) => r.kind)).toEqual(['warmup', 'warmup', 'rush', 'rush', 'finale'])
    expect(plan.map((r) => r.grid)).toEqual([true, true, false, false, false])
    expect(plan[4].orders).toBe(2)
    expect(forgeProblemCount(plan)).toBe(6)
  })
  it('customers get less patient as the run escalates', () => {
    const [w, , r] = forgeRunPlan(5)
    expect(r.patienceSec).toBeLessThan(w.patienceSec)
  })
  it('degrades gracefully for short stages', () => {
    expect(forgeRunPlan(1).map((r) => r.kind)).toEqual(['warmup'])
    expect(forgeRunPlan(2).map((r) => r.kind)).toEqual(['warmup', 'finale'])
    expect(forgeRunPlan(3).map((r) => r.kind)).toEqual(['warmup', 'warmup', 'finale'])
    expect(forgeRunPlan(0)).toHaveLength(1)
  })
})

describe('forgeScore', () => {
  it('pays base + streak + speed', () => {
    expect(forgeScore({ firstTry: true, streak: 1, patienceLeft: 1 })).toEqual({ base: 100, streak: 0, speed: 50, total: 150 })
    expect(forgeScore({ firstTry: true, streak: 3, patienceLeft: 0.5 })).toEqual({ base: 100, streak: 40, speed: 25, total: 165 })
  })
  it('caps the streak bonus and clamps patience', () => {
    expect(forgeScore({ firstTry: true, streak: 40, patienceLeft: 3 }).streak).toBe(SCORE.streakCap)
    expect(forgeScore({ firstTry: true, streak: 1, patienceLeft: -1 }).speed).toBe(0)
  })
  it('a fixed-up pour still scores, without a streak bonus', () => {
    expect(forgeScore({ firstTry: false, streak: 0, patienceLeft: 0 })).toEqual({ base: 50, streak: 0, speed: 0, total: 50 })
  })
})

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

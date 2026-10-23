import { describe, expect, it, vi } from 'vitest'
import {
  ARENA_LIMITS,
  BOSS_REDRAWS,
  BOSS_SPEED,
  BOSS_STEP_POINTS,
  GOLEM_POINTS,
  KNOCKBACK,
  LANE,
  LANE_LEN,
  MAIN_SPEED,
  MAX_HERD,
  PEN_MARKS,
  ROUNDS,
  STALL_PITCH_X,
  STAR_THRESHOLDS,
  WARM_SPEED,
  advanceProgress,
  arenaFactConfig,
  arenaPlan,
  arenaStars,
  arenaStarsOf,
  bossChain,
  bossKMax,
  herdSpots,
  isBossFact,
  isRightCrystal,
  laneSeconds,
  laneZ,
  makePedestalOptions,
  parseDivRound,
  penStalls,
  shatterPoints,
  shatters,
  splitPositions,
  throwOutcome,
  trueFactors,
  warmFactConfig,
} from '../divisionCore'
import { GRADE_LEVELS, GRADE_TIERS } from '../../gradeTiers'
import { makeDivisionProvider } from '../../providers/division'
import { seededRng } from '../../random'
import type { Problem } from '../../problem'

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

describe('arenaFactConfig', () => {
  it('never exceeds the model limits, whatever the grade widens division to', () => {
    // grade tiers: G2 divMax 5, G3 10, G4 12 — the arena must stay ≤ 9 / ≤ 10
    for (const tierDivMax of [2, 5, 10, 12, 144]) {
      const c = arenaFactConfig(tierDivMax)
      // 4th grade's tier (÷12) leaves the ÷2 and "2 each" facts behind
      expect(c.divisorMin).toBe(tierDivMax >= 12 ? 3 : 2)
      expect(c.quotientMin).toBe(tierDivMax >= 12 ? 3 : 2)
      expect(c.divisorMax).toBeLessThanOrEqual(ARENA_LIMITS.divisorMax)
      expect(c.quotientMax).toBeLessThanOrEqual(ARENA_LIMITS.quotientMax)
      // and never harder than the grade itself
      expect(c.divisorMax).toBeLessThanOrEqual(Math.max(2, tierDivMax))
      expect(c.quotientMax).toBeLessThanOrEqual(Math.max(2, tierDivMax))
    }
  })
  it('keeps every servable quotient inside what the pen can show', () => {
    const c = arenaFactConfig(12)
    // worst case for the pen: the largest dividend the config can produce
    const maxQuotient = c.quotientMax
    expect(splitPositions(maxQuotient, 0, 0)).toHaveLength(maxQuotient)
    expect(penStalls(maxQuotient, 0, 0)).toHaveLength(maxQuotient)
  })
})

describe('makePedestalOptions — four crystals', () => {
  it('serves 4 unique crystals with the answer when asked', () => {
    for (let divisor = 2; divisor <= 9; divisor++) {
      for (let quotient = 2; quotient <= 10; quotient++) {
        const opts = makePedestalOptions(divisor * quotient, divisor, 4)
        expect(opts).toHaveLength(4)
        expect(new Set(opts).size).toBe(4)
        expect(opts).toContain(divisor)
        for (const d of opts) expect(d).toBeGreaterThanOrEqual(2)
      }
    }
  })
  it('defaults to three', () => {
    expect(makePedestalOptions(24, 3)).toHaveLength(3)
  })
})

describe('throwOutcome', () => {
  it('right / wrong-size split / bounce', () => {
    const r = { dividend: 24, divisor: 3 }
    expect(throwOutcome(r, 3)).toEqual({ kind: 'right', camels: 8 })
    expect(throwOutcome(r, 4)).toEqual({ kind: 'split', camels: 6 })
    expect(throwOutcome(r, 2)).toEqual({ kind: 'split', camels: 12 })
    expect(throwOutcome(r, 5)).toEqual({ kind: 'bounce' })
  })
})

describe('the pen', () => {
  it('lays stalls out in rows of five, like a ten-frame', () => {
    const s = penStalls(8, 0, 0)
    expect(s).toHaveLength(8)
    expect(new Set(s.map(([, z]) => z.toFixed(3))).size).toBe(2)
    // first row is full (5), second has 3, both left-aligned
    expect(s.slice(0, 5).every(([, z]) => z === s[0][1])).toBe(true)
    expect(s[5][0]).toBeCloseTo(s[0][0])
    expect(s[1][0] - s[0][0]).toBeCloseTo(STALL_PITCH_X)
    expect(penStalls(3, 0, 0).every(([, z]) => z === 0)).toBe(true)
    expect(penStalls(50, 0, 0)).toHaveLength(PEN_MARKS)
  })

  it('a right split fills every stall exactly', () => {
    const spots = herdSpots(8, 8, 0, 2.75, 1.85)
    expect(spots).toHaveLength(8)
    expect(spots.every((x) => x.inPen)).toBe(true)
    expect(spots.map((x) => x.spot)).toEqual(penStalls(8, 0, 2.75))
  })

  it('too many camels: extras stand OUTSIDE the fence', () => {
    const spots = herdSpots(12, 8, 0, 2.75, 1.85)
    expect(spots.filter((x) => x.inPen)).toHaveLength(8)
    for (const x of spots.filter((y) => !y.inPen)) expect(Math.hypot(x.spot[0], x.spot[1] - 2.75)).toBeGreaterThan(1.85)
  })

  it('not enough camels: some stalls stay empty', () => {
    const spots = herdSpots(6, 8, 0, 2.75, 1.85)
    expect(spots).toHaveLength(6)
    expect(spots.every((x) => x.inPen)).toBe(true)
  })

  it('caps a huge split at MAX_HERD', () => {
    expect(herdSpots(45, 10, 0, 0, 1.85)).toHaveLength(MAX_HERD)
  })
})

describe('arenaPlan', () => {
  it('5 rounds: two slow warm-ups (3 crystals), two faster mains (4), the giant last', () => {
    const p = arenaPlan(5)
    expect(p.map((r) => r.kind)).toEqual(['warm', 'warm', 'main', 'main', 'boss'])
    expect(p.map((r) => r.crystals)).toEqual([3, 3, 4, 4, 4])
    expect(p[0].speed).toBe(WARM_SPEED)
    expect(p[2].speed).toBe(MAIN_SPEED[0])
    expect(p[3].speed).toBe(MAIN_SPEED[1])
    expect(p[4].speed).toBe(BOSS_SPEED)
    expect(p[4].banner).toMatch(/GIANT/)
  })
  it('mains march faster each round and never slower than the warm-up', () => {
    const p = arenaPlan(8).filter((r) => r.kind === 'main')
    for (let i = 1; i < p.length; i++) expect(p[i].speed).toBeGreaterThan(p[i - 1].speed)
    for (const r of p) expect(r.speed).toBeGreaterThan(WARM_SPEED)
  })
  it('degrades gracefully for short runs', () => {
    expect(arenaPlan(1).map((r) => r.kind)).toEqual(['boss'])
    expect(arenaPlan(2).map((r) => r.kind)).toEqual(['warm', 'boss'])
    expect(arenaPlan(3).map((r) => r.kind)).toEqual(['warm', 'main', 'boss'])
    expect(arenaPlan(0)).toHaveLength(1)
  })
})

describe('golem lane timing', () => {
  it('maps progress to the lane and clamps', () => {
    expect(laneZ(0)).toBe(LANE.start)
    expect(laneZ(1)).toBeCloseTo(LANE.end)
    expect(laneZ(0.5)).toBeCloseTo((LANE.start + LANE.end) / 2)
    expect(laneZ(-1)).toBe(LANE.start)
    expect(laneZ(3)).toBeCloseTo(LANE.end)
  })
  it('advances at speed / lane length and stops at the pen', () => {
    expect(advanceProgress(0, 1, 1)).toBeCloseTo(1 / LANE_LEN)
    expect(advanceProgress(0.99, 10, 1)).toBe(1)
    expect(advanceProgress(0.3, 1, -5)).toBe(0.3)
  })
  it('gives a 7–9-year-old real time: warm-ups ≥ 15 s, every golem ≥ 10 s down the lane', () => {
    expect(laneSeconds(WARM_SPEED)).toBeGreaterThanOrEqual(15)
    for (const r of arenaPlan(5)) expect(laneSeconds(r.speed)).toBeGreaterThanOrEqual(10)
    expect(laneSeconds(0)).toBe(Infinity)
  })
  it('a stomp knocks the golem back up the lane, not to the start', () => {
    expect(KNOCKBACK).toBeGreaterThan(0)
    expect(KNOCKBACK).toBeLessThan(1)
  })
})

describe('bossChain', () => {
  it('builds giant = dividend × k, cracked down in two true steps', () => {
    for (const r of [0.01, 0.6]) {
      const c = bossChain({ dividend: 24, divisor: 3, quotient: 8, factId: 'div:24/3' }, 3, () => r)
      expect(c.giant).toBe(24 * c.steps[0].divisor)
      expect(c.steps[0]).toEqual({ dividend: c.giant, divisor: c.giant / 24, quotient: 24 })
      expect(c.steps[1]).toEqual({ dividend: 24, divisor: 3, quotient: 8, factId: 'div:24/3' })
    }
  })
  it('keeps the giant a two-digit number and k within the grade', () => {
    for (let d = 4; d <= 45; d++) {
      for (const kMax of [2, 3]) {
        for (const r of [0, 0.5, 0.99]) {
          const c = bossChain({ dividend: d, divisor: 2, quotient: d / 2 }, kMax, () => r)
          expect(c.steps[0].divisor).toBeGreaterThanOrEqual(2)
          expect(c.steps[0].divisor).toBeLessThanOrEqual(kMax)
          expect(c.giant).toBeLessThanOrEqual(99)
        }
      }
    }
  })
  it('the youngest grade only ever doubles', () => {
    expect(bossKMax(5)).toBe(2)
    expect(bossKMax(10)).toBe(3)
  })
})

describe('shatterPoints', () => {
  it('pays more for shattering early and for streaks; the giant is worth more', () => {
    const early = shatterPoints({ progress: 0.1, streak: 1, kind: 'main' })
    const late = shatterPoints({ progress: 0.9, streak: 1, kind: 'main' })
    expect(early.points).toBeGreaterThan(late.points)
    expect(late.points).toBeGreaterThanOrEqual(GOLEM_POINTS)
    expect(shatterPoints({ progress: 0.5, streak: 4, kind: 'main' }).points).toBeGreaterThan(shatterPoints({ progress: 0.5, streak: 1, kind: 'main' }).points)
    expect(shatterPoints({ progress: 1, streak: 1, kind: 'boss' }).points).toBe(BOSS_STEP_POINTS)
  })
})

describe('arenaStarsOf', () => {
  it('matches arenaStars for 5 and scales for other round counts', () => {
    for (let c = 0; c <= 5; c++) expect(arenaStarsOf(c, 5)).toBe(arenaStars(c))
    expect([0, 1, 2, 3, 4].map((c) => arenaStarsOf(c, 4))).toEqual([0, 1, 1, 2, 3])
  })
})

describe('warmFactConfig', () => {
  it('stays in the friendly corner and never above the arena config', () => {
    for (const tier of [2, 5, 10, 12]) {
      const w = warmFactConfig(tier)
      const a = arenaFactConfig(tier)
      expect(w.divisorMax).toBeLessThanOrEqual(Math.min(5, a.divisorMax))
      expect(w.quotientMax).toBeLessThanOrEqual(Math.min(5, a.quotientMax))
      expect(w.divisorMin).toBe(a.divisorMin)
      expect(w.quotientMin).toBe(a.quotientMin)
    }
  })
  it('2nd grade warms up on ÷2 and ÷3 only; 3rd and 4th keep ÷ up to 5', () => {
    expect(warmFactConfig(GRADE_TIERS[2].divMax)).toEqual({ divisorMin: 2, divisorMax: 3, quotientMin: 2, quotientMax: 5 })
    expect(warmFactConfig(GRADE_TIERS[3].divMax)).toEqual({ divisorMin: 2, divisorMax: 5, quotientMin: 2, quotientMax: 5 })
    expect(warmFactConfig(GRADE_TIERS[4].divMax)).toEqual({ divisorMin: 3, divisorMax: 5, quotientMin: 3, quotientMax: 5 })
  })
  it('4th grade asks harder facts than 3rd: same ceiling (the pen), a higher floor', () => {
    expect(arenaFactConfig(GRADE_TIERS[3].divMax)).toEqual({ divisorMin: 2, divisorMax: 9, quotientMin: 2, quotientMax: 10 })
    expect(arenaFactConfig(GRADE_TIERS[4].divMax)).toEqual({ divisorMin: 3, divisorMax: 9, quotientMin: 3, quotientMax: 10 })
    // and the giant still finds its fact at every grade
    for (const g of [2, 3, 4] as const) {
      const tier = GRADE_TIERS[g].divMax
      const c = arenaFactConfig(tier)
      let found = 0
      for (let d = c.divisorMin; d <= c.divisorMax; d++) for (let q = c.quotientMin; q <= c.quotientMax; q++) if (isBossFact({ dividend: d * q, quotient: q }, tier)) found++
      expect(found, `grade ${g}`).toBeGreaterThanOrEqual(4)
    }
  })
})

describe('the Giant Golem’s fact', () => {
  it('every boss fact cracks down from a two-digit giant', () => {
    for (const tier of [5, 10, 12]) {
      const c = arenaFactConfig(tier)
      for (let divisor = c.divisorMin; divisor <= c.divisorMax; divisor++) {
        for (let quotient = c.quotientMin; quotient <= c.quotientMax; quotient++) {
          const r = { dividend: divisor * quotient, divisor, quotient }
          if (!isBossFact(r, tier)) continue
          for (const pick of [0, 0.5, 0.99]) expect(bossChain(r, bossKMax(tier), () => pick).giant).toBeLessThanOrEqual(99)
        }
      }
    }
  })

  it('the arena’s own provider finds one within the re-draws, at every grade', () => {
    // 8 re-draws (the old limit) missed ~4% of the time at 3rd/4th grade and
    // built a three-digit giant over a 50–90 dividend
    for (const grade of GRADE_LEVELS) {
      const tier = GRADE_TIERS[grade].divMax
      vi.spyOn(Math, 'random').mockImplementation(seededRng(`giant:${grade}`))
      const facts = makeDivisionProvider(arenaFactConfig(tier))
      const draw = () => parseDivRound(facts.next() as Problem)
      for (let run = 0; run < 300; run++) {
        let r = draw()
        for (let i = 0; i < BOSS_REDRAWS && !isBossFact(r, tier); i++) r = draw()
        expect(isBossFact(r, tier), `G${grade}: ${r.dividend} ÷ ${r.divisor}`).toBe(true)
        expect(bossChain(r, bossKMax(tier)).giant).toBeLessThanOrEqual(99)
      }
      vi.restoreAllMocks()
    }
  })
})

import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  BOSS_CRACKED_SPEED,
  MAX_HERD,
  PEN_MARKS,
  TWO_DIGIT_ARENA,
  arenaFactConfig,
  arenaPlan,
  arenaRules,
  bossChain,
  bossKMax,
  isBossFact,
  makePedestalOptions,
  makeTwoDigitPedestals,
  throwOutcome,
  twoDigitBossChain,
  warmFactConfig,
} from '../divisionCore'
import { GRADE_LEVELS, GRADE_TIERS } from '../../gradeTiers'
import { seededRng } from '../../random'
import { makeDivisionProvider } from '../../providers/division'
import { CRYSTAL_COLORS, crystalColor, golemChalkSize } from '../../../games/DivisionArena.layout'
import { curriculum, zoneStages } from '../../../curriculum'

/*
 * Crystal Golems' 5th-grade tier (two-digit divisors) next to its grades 2–4
 * arena: the old rules must come back byte for byte (same functions, same
 * numbers, same draws for the same random numbers), and only a stage that
 * asks for `divisorDigits: 2` gets the new ones.
 */

afterEach(() => vi.restoreAllMocks())

const seeded = (seed: string) => vi.spyOn(Math, 'random').mockImplementation(seededRng(seed))

describe('grades 2–4: the arena rules are exactly the old ones', () => {
  for (const g of GRADE_LEVELS) {
    const t = GRADE_TIERS[g].divMax
    it(`tier ÷${t} (grade ${g})`, () => {
      const r = arenaRules(1, t)
      expect(r.facts).toEqual(arenaFactConfig(t))
      expect(r.warm).toEqual(warmFactConfig(t))
      expect(r.plan).toBe(arenaPlan)
      expect(r.pedestals).toBe(makePedestalOptions)
      expect(r.crackedSpeed).toBe(BOSS_CRACKED_SPEED)
      expect(r.crackSkill).toEqual({ id: 'div-basic', label: 'basic division facts' })
      expect(r.skill).toBeUndefined()
      // the giant and the boss-fact test give what the old calls gave, draw for draw
      for (let d = 2; d <= 9; d++)
        for (let q = 2; q <= 10; q++) {
          const round = { dividend: d * q, divisor: d, quotient: q, factId: `div:${d * q}/${d}` }
          expect(r.isBossFact(round)).toBe(isBossFact(round, t))
          seeded(`chain-${d}-${q}`)
          const mine = r.bossChain(round)
          vi.restoreAllMocks()
          seeded(`chain-${d}-${q}`)
          const old = bossChain(round, bossKMax(t))
          vi.restoreAllMocks()
          expect(mine).toEqual(old)
        }
    })
  }

  it('the 2–4 stage never asks for two-digit crystals, and its facts are the same draws as before', () => {
    const dunes = curriculum.zones.find((z) => z.id === 'division-dunes')!
    for (const g of [2, 3, 4] as const) {
      const arena = zoneStages(dunes, g).find((s) => s.gameId === 'divisionArena')!
      expect(arena.id).toBe('div-arena')
      expect(arena.params?.divisorDigits).toBeUndefined()
      const t = GRADE_TIERS[g].divMax
      seeded('facts')
      const a = makeDivisionProvider(arenaRules(1, t).facts)
      const mine = Array.from({ length: 50 }, () => a.next().prompt)
      vi.restoreAllMocks()
      seeded('facts')
      const b = makeDivisionProvider(arenaFactConfig(t))
      expect(Array.from({ length: 50 }, () => b.next().prompt)).toEqual(mine)
    }
  })

  it('crystal colours and chest chalk for 2–12 and two-digit numbers are unchanged', () => {
    for (let n = 2; n <= 12; n++) expect(crystalColor(n)).toBe(CRYSTAL_COLORS[n])
    expect(golemChalkSize(1)).toEqual({ w: 0.36, gap: 0.1 })
    expect(golemChalkSize(2)).toEqual({ w: 0.3, gap: 0.1 })
  })
})

describe('grade 5: two-digit crystals', () => {
  const r = arenaRules(2, 12)

  it('the stage asks for it, and the rules draw two-digit facts the pen can show', () => {
    const dunes = curriculum.zones.find((z) => z.id === 'division-dunes')!
    const arena = zoneStages(dunes, 5).find((s) => s.gameId === 'divisionArena')!
    expect(arena.id).toBe('g5-div-arena')
    expect(arena.params?.divisorDigits).toBe(2)
    seeded('g5-facts')
    for (const cfg of [r.facts, r.warm]) {
      const p = makeDivisionProvider(cfg)
      for (let i = 0; i < 300; i++) {
        const m = /^(\d+) ÷ (\d+) = \?$/.exec(p.next().prompt)!
        const [dividend, divisor] = [Number(m[1]), Number(m[2])]
        expect(divisor).toBeGreaterThanOrEqual(11)
        expect(divisor).toBeLessThanOrEqual(TWO_DIGIT_ARENA.divisorMax)
        expect(dividend / divisor).toBeLessThanOrEqual(PEN_MARKS)
        expect(String(dividend).length).toBeLessThanOrEqual(3)
      }
    }
    expect(r.skill?.id).toBe('g5-div-2digit')
    expect(r.plan(5).map((p) => p.kind)).toEqual(arenaPlan(5).map((p) => p.kind))
    for (const [a, b] of r.plan(5).map((p, i) => [p.speed, arenaPlan(5)[i].speed])) expect(a).toBeLessThan(b)
  })

  it('pedestals: all two-digit, the right one exactly once, any true factor splits into a herd we can draw', () => {
    seeded('pedestals')
    for (let d = 11; d <= 25; d++)
      for (let q = 2; q <= 9; q++)
        for (const count of [3, 4]) {
          const opts = makeTwoDigitPedestals(d * q, d, count)
          expect(opts).toHaveLength(count)
          expect(new Set(opts).size).toBe(count)
          expect(opts.filter((o) => o === d)).toHaveLength(1)
          for (const o of opts) {
            expect(o).toBeGreaterThanOrEqual(10)
            expect(o).toBeLessThanOrEqual(99)
            const out = throwOutcome({ dividend: d * q, divisor: d }, o)
            if (out.kind !== 'bounce') expect(out.camels).toBeLessThanOrEqual(MAX_HERD)
            expect(crystalColor(o)).toMatch(/^#[0-9a-f]{6}$/)
          }
        }
  })

  it('the giant is ten golems: 2,250 ÷ 10 = 225, then 225 ÷ 25 = 9 — four digits fit the chest plaque', () => {
    const c = twoDigitBossChain({ dividend: 225, divisor: 25, quotient: 9 })
    expect(c.giant).toBe(2250)
    expect(c.steps[0]).toEqual({ dividend: 2250, divisor: 10, quotient: 225 })
    expect(c.steps[1]).toMatchObject({ dividend: 225, divisor: 25, quotient: 9 })
    for (const digits of [3, 4]) {
      const { w, gap } = golemChalkSize(digits)
      expect(digits * w + (digits - 1) * gap).toBeLessThan(1.0) // the plaque is 1.1 wide
    }
    expect(makeTwoDigitPedestals(2250, 10, 4)).toContain(10)
  })
})

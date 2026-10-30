import { describe, expect, it } from 'vitest'
import {
  K_FOODS,
  changeShowMe,
  elapsedShowMe,
  makeSnackShackProvider,
  planShift,
  shackSkill,
  type ClockAtOrder,
  type CountOrder,
  type ElapsedOrder,
  type MoneyOrder,
} from '../snackShack'
import { createProvider } from '..'
import type { Problem } from '../../problem'
import { SHACK_K_FOODS } from '../../../voice/packs/snack-shack'
import { voiceText } from '../../../voice/registry'
import { HALF_DAY, crossesNoon, fmtTime } from '../../shack/clock'
import { fewestPieces, trayTotal } from '../../shack/money'
import { SKILLS } from '../../../tutoring/skills'

const SEEDS = Array.from({ length: 300 }, (_, i) => `seed-${i}`)

describe('Snack Shack orders: kindergarten (count, then how many in all)', () => {
  it('ramps from one kind of snack to two within 5, then within 10; every number is a recorded template value', () => {
    for (const seed of SEEDS) {
      const plan = planShift({ grade: 0, seed })
      expect(plan.band).toBe('k1')
      expect(plan.orders).toHaveLength(6)
      plan.orders.forEach((o, i) => {
        expect(o.kind).toBe('count')
        const c = o as CountOrder
        const sum = c.lines.reduce((s, l) => s + l.qty, 0)
        if (i === 0) expect(c.lines.length === 1 && sum >= 2 && sum <= 3).toBe(true)
        if (i <= 1) expect(c.lines).toHaveLength(1)
        else expect(c.lines).toHaveLength(2)
        if (i <= 3) expect(sum).toBeLessThanOrEqual(5)
        expect(sum).toBeLessThanOrEqual(10)
        expect(new Set(c.lines.map((l) => l.food.id)).size).toBe(c.lines.length)
        for (const l of c.lines) expect(l.qty).toBeGreaterThanOrEqual(2)
        // the said order and every help line resolve (throws on a bad slot value)
        expect(() => voiceText(c.speech)).not.toThrow()
        for (const l of c.lines) expect(() => voiceText({ template: 'snack-shack/weNeed', slots: { n: l.qty, food: l.food.id } })).not.toThrow()
        expect(() => voiceText({ template: 'snack-shack/inAll', slots: { n: sum } })).not.toThrow()
        // how many in all: three different numeral cards, the sum among them once
        expect(c.askTotal).toBe(c.lines.length > 1)
        expect(c.totalOptions).toHaveLength(3)
        expect(new Set(c.totalOptions).size).toBe(3)
        expect(c.totalOptions.filter((n) => n === sum)).toHaveLength(1)
        for (const n of c.totalOptions) expect(n).toBeGreaterThanOrEqual(1)
      })
    }
  })

  it("the snacks' names are the voice pack's words", () => {
    expect(Object.keys(K_FOODS).sort()).toEqual([...SHACK_K_FOODS].sort())
    expect(voiceText({ template: 'snack-shack/orderTwo', slots: { a: 3, foodA: 'apples', b: 2, foodB: 'bananas' } })).toBe('3 apples and 2 bananas, please!')
  })
})

describe('Snack Shack orders: 1st grade (the pick-up clock)', () => {
  it('hours first, then half hours, never 12:00 (where the clock starts), never twice in a row', () => {
    for (const seed of SEEDS) {
      const plan = planShift({ grade: 1, seed })
      expect(plan.band).toBe('g1')
      expect(plan.clockStep).toBe(30)
      let last = -1
      plan.orders.forEach((o, i) => {
        const c = o as ClockAtOrder
        expect(c.kind).toBe('clockAt')
        expect(c.time % 60).toBe(i >= 3 ? 30 : 0)
        expect(c.time).toBeGreaterThan(0)
        expect(c.time).toBeLessThan(HALF_DAY)
        expect(c.time).not.toBe(last)
        last = c.time
        expect(c.lines.reduce((s, l) => s + l.qty, 0)).toBeLessThanOrEqual(5)
        expect(() => voiceText(c.speech)).not.toThrow()
        expect(() => voiceText(c.fillSpeech)).not.toThrow()
      })
    }
  })
})

const DRAWER_BILLS: Record<number, number[]> = { 2: [100, 200, 500], 3: [500, 1000], 4: [1000, 2000], 5: [2000] }
const MAX_TOTAL: Record<number, number> = { 2: 190, 3: 480, 4: 950, 5: 1650 }

describe('Snack Shack orders: grades 2–5 (money and the Clock Tower)', () => {
  for (const grade of [2, 3, 4, 5]) {
    it(`grade ${grade}: every money order adds up, has change, and can be paid from the drawer`, () => {
      for (const seed of SEEDS) {
        const plan = planShift({ grade, seed })
        expect(plan.band).toBe(grade === 5 ? 'g5' : 'g24')
        expect(new Set(plan.menu.map((m) => m.price)).size).toBe(plan.menu.length)
        const money = plan.orders.filter((o): o is MoneyOrder => o.kind === 'money')
        expect(money).toHaveLength(3)
        expect(plan.orders.map((o) => o.kind)).toEqual(['money', 'elapsed', 'money', 'elapsed', 'money', 'elapsed'])
        money.forEach((o, j) => {
          const total = o.lines.reduce((s, l) => s + l.qty * l.price, 0)
          expect(o.total).toBe(total)
          expect(total).toBeLessThanOrEqual(MAX_TOTAL[grade])
          expect(o.paid).toBeGreaterThan(total)
          expect(DRAWER_BILLS[grade]).toContain(o.paid)
          expect(o.change).toBe(o.paid - total)
          // the change can always be counted out of this grade's drawer
          expect(trayTotal(fewestPieces(o.change, plan.drawer))).toBe(o.change)
          for (const l of o.lines) expect(plan.menu.find((m) => m.food.id === l.food.id)?.price).toBe(l.price)
          // the first customer is the easiest: one kind
          if (j === 0) expect(o.lines).toHaveLength(1)
          // 5th grade multiplies: several of one item
          if (grade === 5) expect(o.lines[0].qty).toBeGreaterThanOrEqual(2)
          const items = o.lines.reduce((s, l) => s + l.qty, 0)
          expect(o.askTotal).toBe(items > 1)
          if (o.askTotal) {
            expect(o.totalOptions).toHaveLength(3)
            expect(new Set(o.totalOptions).size).toBe(3)
            expect(o.totalOptions.filter((c) => c === total)).toHaveLength(1)
            for (const c of o.totalOptions) expect(c).toBeGreaterThan(0)
          }
          // "Show me how": counting up from the cost lands on what was paid
          const steps = changeShowMe(o)
          const last = steps[steps.length - 1]
          expect(last.yourTurn).toBe(true)
          expect(last.visual.kind).toBe('countUp')
          if (last.visual.kind === 'countUp') expect(last.visual.hops.reduce((s, h) => s + h.each * h.count, 0)).toBe(o.change)
          // the walkthrough never says the change
          for (const s of steps) expect(s.say).not.toContain(`$${Math.floor(o.change / 100)}.${String(o.change % 100).padStart(2, '0')} change`)
        })
      }
    })

    it(`grade ${grade}: Clock Tower orders are about time, cross the hour or noon as the grade needs, and walk through right`, () => {
      for (const seed of SEEDS) {
        const plan = planShift({ grade, seed })
        expect(plan.clockSpan).toBe(grade >= 4 ? 1440 : 720)
        const clocks = plan.orders.filter((o): o is ElapsedOrder => o.kind === 'elapsed')
        expect(clocks).toHaveLength(3)
        clocks.forEach((o, j) => {
          expect(o.end).toBe(o.start + o.hours * 60 + o.minutes)
          expect(o.hours * 60 + o.minutes).toBeGreaterThan(0)
          expect(o.start % 5).toBe(0)
          expect(o.end % 5).toBe(0)
          expect(o.meridiem).toBe(grade >= 4)
          expect(o.story).toContain(o.duration)
          expect(o.story).toContain(fmtTime(o.start, o.meridiem))
          expect(o.story).not.toContain('..')
          if (grade >= 4) {
            // a whole-day clock: morning starts, no midnight
            expect(o.start).toBeGreaterThanOrEqual(7 * 60)
            expect(o.end).toBeLessThan(21 * 60)
          }
          if (grade === 2) expect(o.minutes % 30).toBe(0)
          if (grade === 3 && j >= 1) expect((o.start % 60) + o.minutes).toBeGreaterThanOrEqual(60)
          if (grade === 4 && j === 2) expect(crossesNoon(o.start, o.end)).toBe(true)
          if (grade === 5 && j >= 1) expect(crossesNoon(o.start, o.end)).toBe(true)
          if (grade === 5 && j === 1) expect(o.duration).toBe(`${o.hours * 60 + o.minutes} minutes`)
          if (o.decoy) expect(o.decoy).not.toBe(o.duration)
          // the walkthrough's jumps add up to the length, starting at the start, stopping one short
          const steps = elapsedShowMe(o)
          const last = steps[steps.length - 1]
          expect(last.yourTurn).toBe(true)
          expect(last.visual.kind).toBe('timeJumps')
          if (last.visual.kind === 'timeJumps') {
            expect(last.visual.start).toBe(o.start % HALF_DAY)
            expect(last.visual.jumps.reduce((s, x) => s + x, 0) + (last.visual.pending ?? 0)).toBe(o.hours * 60 + o.minutes)
            expect(last.visual.pending).toBeGreaterThan(0)
          }
          const said = steps.map((s) => s.say).join(' ')
          // (the end time never appears on its own: "11:45" may, "1:45" not)
          expect(said).not.toMatch(new RegExp(`(^|[^0-9])${fmtTime(o.end)}`))
          if (o.meridiem && crossesNoon(o.start, o.end)) expect(said).toContain('p.m.')
        })
      }
    })
  }

  it('is deterministic for a seed', () => {
    expect(planShift({ grade: 4, seed: 'x' })).toEqual(planShift({ grade: 4, seed: 'x' }))
    expect(planShift({ grade: 4, seed: 'x' })).not.toEqual(planShift({ grade: 4, seed: 'y' }))
  })

  it('reports under the skills the zones already use', () => {
    for (const band of ['k1', 'g1', 'g24', 'g5'] as const) {
      for (const step of ['count', 'clock', 'money'] as const) expect(SKILLS[shackSkill(band, step).id], `${band} ${step}`).toBeDefined()
    }
    expect(shackSkill('g24', 'money').id).toBe('meas-money')
    expect(shackSkill('g24', 'clock').id).toBe('meas-time')
    expect(shackSkill('k1', 'count').id).toBe('k-add-take')
    expect(shackSkill('g1', 'clock').id).toBe('g1-time')
  })
})

describe('the Snack Shack provider (plain questions for any host)', () => {
  it('serves valid multiple-choice problems at every band', () => {
    for (const cfg of [{ band: 'k1' as const }, { band: 'g1' as const }, { band: 'g24' as const, grade: 2 }, { band: 'g24' as const, grade: 3 }, { band: 'g24' as const, grade: 4 }, { band: 'g5' as const }]) {
      for (let s = 0; s < 40; s++) {
        const p = makeSnackShackProvider(cfg, `p-${s}`)
        for (let i = 0; i < 8; i++) {
          const q = p.next() as Problem
          expect(q.options).toContain(q.answer)
          expect(new Set(q.options).size).toBe(q.options.length)
          expect(q.options.length).toBeGreaterThanOrEqual(3)
          expect(q.topic).toBe('snack-shack')
        }
      }
    }
  })

  it('is registered with the provider factory', () => {
    expect(createProvider({ kind: 'snackShack', band: 'g5' }).topic).toBe('snack-shack')
  })
})

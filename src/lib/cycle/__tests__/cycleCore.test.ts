import { describe, expect, it } from 'vitest'
import {
  CYCLE_SCORE,
  CYCLE_START,
  DROP_FORMS,
  FORM_AFTER,
  FORM_ICON,
  NEED_LINE,
  NEXT_PROCESS,
  PROCESSES,
  PROCESS_CHEER,
  PROCESS_ICON,
  ROUNDS,
  WRONG_HINT,
  applyProcess,
  cycleLegCount,
  cycleRunPlan,
  cycleStarThresholds,
  cycleStars,
  isProcess,
  legScore,
  parseCycleRound,
  routeStep,
  type DropForm,
} from '../cycleCore'
import { seededRng } from '../../random'

describe('route order (guiding Drip)', () => {
  it('walks the loop water → vapor → cloud → water in process order', () => {
    let form: DropForm = 'water'
    const seen: string[] = []
    for (let i = 0; i < 6; i++) {
      const step = routeStep(form, NEXT_PROCESS[form])
      expect(step.ok).toBe(true)
      expect(step.hint).toBeNull()
      seen.push(step.need)
      form = step.form
    }
    expect(seen).toEqual(['evaporation', 'condensation', 'precipitation', 'evaporation', 'condensation', 'precipitation'])
    expect(form).toBe('water')
  })

  it('every form has exactly one right station, and wrong ones leave Drip unchanged', () => {
    for (const form of DROP_FORMS) {
      const oks = PROCESSES.filter((p) => routeStep(form, p).ok)
      expect(oks).toEqual([NEXT_PROCESS[form]])
      for (const p of PROCESSES) {
        const r = routeStep(form, p)
        if (!r.ok) {
          expect(r.form).toBe(form)
          expect(r.need).toBe(NEXT_PROCESS[form])
        }
      }
    }
  })

  it('wrong-station hints are three words at most and never empty', () => {
    for (const form of DROP_FORMS) {
      for (const p of PROCESSES) {
        const r = routeStep(form, p)
        if (r.ok) continue
        expect(r.hint).toBeTruthy()
        expect(r.hint!.split(/\s+/).length).toBeLessThanOrEqual(3)
        expect(r.hint).toBe(WRONG_HINT[form][p])
      }
    }
  })

  it('every process turns Drip into the form whose next process follows it in the cycle', () => {
    for (let i = 0; i < PROCESSES.length; i++) {
      const after = FORM_AFTER[PROCESSES[i]]
      expect(NEXT_PROCESS[after]).toBe(PROCESSES[(i + 1) % PROCESSES.length])
    }
  })

  it('has short copy and icons for every form and process', () => {
    for (const f of DROP_FORMS) {
      expect(FORM_ICON[f]).toBeTruthy()
      expect(NEED_LINE[f].split(/\s+/).length).toBeLessThanOrEqual(4)
    }
    for (const p of PROCESSES) {
      expect(PROCESS_ICON[p]).toBeTruthy()
      expect(PROCESS_CHEER[p].toLowerCase()).toContain(p)
    }
    // Drip's cloud icon must never equal a station icon (no icon-matching shortcut)
    for (const f of DROP_FORMS) expect(Object.values(PROCESS_ICON)).not.toContain(FORM_ICON[f])
  })
})

describe('cycleRunPlan', () => {
  it('builds the arc: guided warm-up loop, windy loop, storm finale (9 legs at 5 rounds)', () => {
    const plan = cycleRunPlan(5, seededRng('a'))
    expect(plan.map((g) => g.kind)).toEqual(['warmup', 'twist', 'storm'])
    expect(plan.map((g) => g.guide)).toEqual([true, false, false])
    expect(plan[1].twist).toBe('wind')
    expect(cycleLegCount(plan)).toBe(9)
  })

  it('the storm rescues one friend of each form, shuffled', () => {
    const orders = new Set<string>()
    for (let i = 0; i < 30; i++) {
      const storm = cycleRunPlan(5, seededRng(`s${i}`)).at(-1)!.storm!
      expect([...storm].sort()).toEqual([...DROP_FORMS].sort())
      orders.add(storm.join(','))
    }
    expect(orders.size).toBeGreaterThan(1)
  })

  it('scales with the stage rounds and stays sane at the edges', () => {
    expect(cycleRunPlan(1).map((g) => g.kind)).toEqual(['warmup', 'storm'])
    expect(cycleRunPlan(6).map((g) => g.kind)).toEqual(['warmup', 'twist', 'twist', 'storm'])
    expect(cycleRunPlan(99)).toHaveLength(5)
  })
})

describe('legScore', () => {
  it('pays base + streak + speed for a clean, quick leg', () => {
    expect(legScore({ firstTry: true, streak: 1, seconds: 2 })).toEqual({ base: 100, streak: 0, speed: CYCLE_SCORE.speedMax, total: 130 })
    expect(legScore({ firstTry: true, streak: 4, seconds: CYCLE_SCORE.slowSec })).toEqual({ base: 100, streak: 60, speed: 0, total: 160 })
  })
  it('caps the streak bonus; a fixed-up leg earns the retry base only', () => {
    expect(legScore({ firstTry: true, streak: 50, seconds: 99 }).streak).toBe(CYCLE_SCORE.streakCap)
    expect(legScore({ firstTry: false, streak: 0, seconds: 1 })).toEqual({ base: 40, streak: 0, speed: 0, total: 40 })
  })
})

describe('parseCycleRound', () => {
  it('accepts problems whose answer is a process word', () => {
    const r = parseCycleRound({ prompt: 'x', answer: 'evaporation', factId: 'cycle:0' })
    expect(r).toEqual({ prompt: 'x', answer: 'evaporation', factId: 'cycle:0' })
  })

  it('rejects answers that are not processes', () => {
    expect(() => parseCycleRound({ prompt: 'x', answer: 'rain' })).toThrow(/not a water-cycle process/)
    expect(isProcess('condensation')).toBe(true)
    expect(isProcess('RAIN')).toBe(false)
    expect(isProcess(3)).toBe(false)
  })
})

describe('stars', () => {
  it('gives the arena/forge 20/60/100% shape for any round count', () => {
    expect(cycleStarThresholds(5)).toEqual([1, 3, 5])
    expect(cycleStarThresholds(6)).toEqual([2, 4, 6])
  })

  it('maps first-try clears to stars', () => {
    expect(cycleStars(0, 5)).toBe(0)
    expect(cycleStars(1, 5)).toBe(1)
    expect(cycleStars(3, 5)).toBe(2)
    expect(cycleStars(5, 5)).toBe(3)
  })
})

describe('applyProcess', () => {
  it('evaporation lowers the pond and seeds the sky', () => {
    const s = applyProcess(CYCLE_START, 'evaporation')
    expect(s.pond).toBeCloseTo(0.66)
    expect(s.cloud).toBeCloseTo(0.12)
    expect(s.garden).toBeCloseTo(0.25)
  })

  it('condensation grows the cloud only', () => {
    const s = applyProcess({ pond: 0.5, cloud: 0.2, garden: 0.5 }, 'condensation')
    expect(s).toEqual({ pond: 0.5, cloud: 0.75, garden: 0.5 })
  })

  it('precipitation drains the cloud, refills the pond, greens the garden', () => {
    const s = applyProcess({ pond: 0.2, cloud: 0.8, garden: 0.1 }, 'precipitation')
    expect(s.pond).toBeCloseTo(0.54)
    expect(s.cloud).toBeCloseTo(0.25)
    expect(s.garden).toBeCloseTo(0.5)
  })

  it('clamps every level to 0..1', () => {
    let s = CYCLE_START
    for (const p of ['evaporation', 'evaporation', 'evaporation', 'evaporation'] as const) s = applyProcess(s, p)
    expect(s.pond).toBe(0)
    s = applyProcess(s, 'condensation')
    s = applyProcess(s, 'condensation')
    s = applyProcess(s, 'condensation')
    expect(s.cloud).toBe(1)
    s = applyProcess(s, 'precipitation')
    s = applyProcess(s, 'precipitation')
    s = applyProcess(s, 'precipitation')
    expect(s.pond).toBe(1)
    expect(s.garden).toBe(1)
  })

  it('a full cycle returns the pond to full', () => {
    const start = { pond: 0.66, cloud: 0.12, garden: 0.25 }
    const s = applyProcess(applyProcess(start, 'condensation'), 'precipitation')
    expect(s.pond).toBe(1)
  })

  it('stays pure', () => {
    const before = { ...CYCLE_START }
    applyProcess(CYCLE_START, 'precipitation')
    expect(CYCLE_START).toEqual(before)
  })
})

describe('constants', () => {
  it('exposes exactly the three processes and five rounds', () => {
    expect(PROCESSES).toEqual(['evaporation', 'condensation', 'precipitation'])
    expect(ROUNDS).toBe(5)
  })

  it('gives every process a digit, a win line and a wrong-station lesson', async () => {
    const { BAD_HINT, GOOD_LINE, PROCESS_DIGIT } = await import('../cycleCore')
    for (const p of PROCESSES) {
      expect(PROCESS_DIGIT[p]).toMatch(/^[123]$/)
      expect(GOOD_LINE[p].length).toBeGreaterThan(30)
      expect(BAD_HINT[p].length).toBeGreaterThan(40)
    }
    expect(new Set(PROCESSES.map((p) => PROCESS_DIGIT[p])).size).toBe(3)
  })
})

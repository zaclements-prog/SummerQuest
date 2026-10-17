import { describe, expect, it } from 'vitest'
import {
  CYCLE_START,
  PROCESSES,
  ROUNDS,
  applyProcess,
  cycleStarThresholds,
  cycleStars,
  isProcess,
  parseCycleRound,
} from '../cycleCore'

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

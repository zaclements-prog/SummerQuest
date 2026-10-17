import { afterEach, describe, expect, it, vi } from 'vitest'
import { EMPTY_BEST, loadBest, mergeRun, parseBest, recordRun } from '../bests'

const KEY = 'sq-best-test-v1'

afterEach(() => {
  vi.restoreAllMocks()
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
})

describe('parseBest', () => {
  it('reads a stored record and zeroes anything garbled', () => {
    expect(parseBest(JSON.stringify({ score: 1200, streak: 5, perfect: 1, runs: 3 }))).toEqual({ score: 1200, streak: 5, perfect: 1, runs: 3 })
    expect(parseBest(JSON.stringify({ score: 'lots', streak: -2, perfect: 1.7 }))).toEqual({ score: 0, streak: 0, perfect: 1, runs: 0 })
    expect(parseBest('{not json')).toEqual(EMPTY_BEST)
    expect(parseBest(null)).toEqual(EMPTY_BEST)
    expect(parseBest('null')).toEqual(EMPTY_BEST)
  })
})

describe('mergeRun', () => {
  it('keeps the max score and streak, counts runs and perfect runs', () => {
    const a = mergeRun(EMPTY_BEST, { score: 800, streak: 3, perfect: false })
    expect(a).toEqual({ score: 800, streak: 3, perfect: 0, runs: 1 })
    const b = mergeRun(a, { score: 650, streak: 5, perfect: true })
    expect(b).toEqual({ score: 800, streak: 5, perfect: 1, runs: 2 })
  })
})

describe('recordRun / loadBest', () => {
  it('stores under the game key and flags a new best only when beaten', () => {
    const first = recordRun(KEY, { score: 500, streak: 2, perfect: false })
    expect(first.newBest).toBe(true)
    expect(first.prev.score).toBe(0)
    expect(loadBest(KEY).score).toBe(500)
    const worse = recordRun(KEY, { score: 300, streak: 4, perfect: false })
    expect(worse.newBest).toBe(false)
    expect(worse.best).toEqual({ score: 500, streak: 4, perfect: 0, runs: 2 })
    const better = recordRun(KEY, { score: 900, streak: 1, perfect: true })
    expect(better.newBest).toBe(true)
    expect(loadBest(KEY)).toEqual({ score: 900, streak: 4, perfect: 1, runs: 3 })
  })

  it('survives blocked storage: reads as empty, the write is skipped', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(loadBest(KEY)).toEqual(EMPTY_BEST)
    const r = recordRun(KEY, { score: 100, streak: 1, perfect: false })
    expect(r.newBest).toBe(true)
    expect(r.best.score).toBe(100)
  })
})

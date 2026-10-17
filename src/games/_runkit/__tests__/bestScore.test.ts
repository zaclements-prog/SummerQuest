import { describe, expect, it } from 'vitest'
import { loadBest, mergeBest, recordRunBest, saveBest } from '../bestScore'

function memStore() {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m }
}

describe('mergeBest', () => {
  it('starts a fresh best from the first run', () => {
    expect(mergeBest(null, { score: 420, streak: 3, perfect: false })).toEqual({ best: { score: 420, streak: 3, perfectRuns: 0 }, newBest: true })
  })
  it('keeps the higher score and streak independently and counts perfect runs', () => {
    const r = mergeBest({ score: 500, streak: 2, perfectRuns: 1 }, { score: 300, streak: 6, perfect: true })
    expect(r).toEqual({ best: { score: 500, streak: 6, perfectRuns: 2 }, newBest: false })
  })
  it('a tie is not a new best', () => {
    expect(mergeBest({ score: 300, streak: 1, perfectRuns: 0 }, { score: 300, streak: 1, perfect: false }).newBest).toBe(false)
  })
})

describe('storage', () => {
  it('round-trips through a store and tolerates junk', () => {
    const s = memStore()
    expect(loadBest('k', s)).toBeNull()
    saveBest('k', { score: 10, streak: 2, perfectRuns: 0 }, s)
    expect(loadBest('k', s)).toEqual({ score: 10, streak: 2, perfectRuns: 0 })
    s.setItem('k', '{not json')
    expect(loadBest('k', s)).toBeNull()
    s.setItem('k', JSON.stringify({ score: -4, streak: 'x' }))
    expect(loadBest('k', s)).toEqual({ score: 0, streak: 0, perfectRuns: 0 })
  })
  it('never throws when storage is missing or blocked', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(loadBest('k', blocked)).toBeNull()
    expect(() => saveBest('k', { score: 1, streak: 1, perfectRuns: 0 }, blocked)).not.toThrow()
    expect(loadBest('k', null)).toBeNull()
    expect(recordRunBest('k', { score: 5, streak: 1, perfect: false }, blocked).newBest).toBe(true)
  })
  it('recordRunBest loads, merges and saves', () => {
    const s = memStore()
    expect(recordRunBest('g', { score: 200, streak: 2, perfect: false }, s)).toMatchObject({ prev: null, newBest: true })
    expect(recordRunBest('g', { score: 150, streak: 4, perfect: true }, s)).toMatchObject({ newBest: false, best: { score: 200, streak: 4, perfectRuns: 1 } })
  })
})

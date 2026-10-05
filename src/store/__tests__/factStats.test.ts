import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useProgress, currentFactStats } from '../progress'
import { MAX_FACT_STATS } from '../../lib/adaptive'

const KEY = 'summerquest-progress-v1'

beforeEach(() => useProgress.getState().resetPlayer())
afterEach(() => localStorage.removeItem(KEY))

describe('recordAnswer → factStats', () => {
  it('updates the per-fact record for fact problems', () => {
    const { recordAnswer } = useProgress.getState()
    recordAnswer(false, { factId: 'mult:7x8' })
    recordAnswer(true, { factId: 'mult:7x8' })
    const s = useProgress.getState()
    expect(s.factStats['mult:7x8']).toMatchObject({ attempts: 2, misses: 1, streak: 1 })
    expect(typeof s.factStats['mult:7x8'].lastMissedAt).toBe('number')
    expect(s.stats.problemsAnswered).toBe(2)
    expect(s.stats.problemsCorrect).toBe(1)
    expect(currentFactStats()).toBe(s.factStats)
  })

  it('leaves factStats alone for problems without a factId', () => {
    const { recordAnswer } = useProgress.getState()
    recordAnswer(true)
    recordAnswer(false, {})
    recordAnswer(false, null)
    const s = useProgress.getState()
    expect(s.factStats).toEqual({})
    expect(s.stats.problemsAnswered).toBe(3)
  })

  it(`keeps at most ${MAX_FACT_STATS} facts (the most recent)`, () => {
    const { recordAnswer } = useProgress.getState()
    for (let i = 0; i < MAX_FACT_STATS + 10; i++) recordAnswer(i % 2 === 0, { factId: `f:${i}` })
    const ids = Object.keys(useProgress.getState().factStats)
    expect(ids).toHaveLength(MAX_FACT_STATS)
    expect(ids).toContain(`f:${MAX_FACT_STATS + 9}`)
  })

  it('resetPlayer clears factStats', () => {
    useProgress.getState().recordAnswer(false, { factId: 'div:56/8' })
    useProgress.getState().resetPlayer()
    expect(useProgress.getState().factStats).toEqual({})
  })
})

describe('rehydrating saves from before adaptive practice', () => {
  it('a v1 save without factStats gets an empty record and keeps everything else', async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        version: 1,
        state: {
          player: { emoji: '🦊', color: '#f97316', name: 'Before Facts' },
          coins: 17,
          stats: { problemsAnswered: 9, problemsCorrect: 7, secondsPlayed: 300, streakDays: 2 },
          attempts: [],
        },
      }),
    )
    await useProgress.persist.rehydrate()
    const s = useProgress.getState()
    expect(s.player?.name).toBe('Before Facts')
    expect(s.coins).toBe(17)
    expect(s.factStats).toEqual({})
    // and recording works straight away
    s.recordAnswer(false, { factId: 'mult:6x8' })
    expect(useProgress.getState().factStats['mult:6x8'].misses).toBe(1)
    expect(useProgress.getState().stats.problemsAnswered).toBe(10)
  })

  it('a v0 save (migrated) also gets an empty record', async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ version: 0, state: { coins: 3, stats: { problemsAnswered: 1, problemsCorrect: 1, secondsPlayed: 5, streakDays: 1 } } }),
    )
    await useProgress.persist.rehydrate()
    expect(useProgress.getState().coins).toBe(3)
    expect(useProgress.getState().factStats).toEqual({})
  })

  it('a save with factStats keeps them; a corrupt value falls back to empty', async () => {
    const factStats = { 'mult:7x8': { attempts: 3, misses: 2, streak: 0, lastSeenAt: 1, lastMissedAt: 1 } }
    localStorage.setItem(KEY, JSON.stringify({ version: 1, state: { factStats } }))
    await useProgress.persist.rehydrate()
    expect(useProgress.getState().factStats).toEqual(factStats)

    useProgress.getState().resetPlayer()
    localStorage.setItem(KEY, JSON.stringify({ version: 1, state: { factStats: [1, 2] } }))
    await useProgress.persist.rehydrate()
    expect(useProgress.getState().factStats).toEqual({})
  })
})

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useProgress } from '../progress'
import { migrateV0toV1 } from '../migrations'
import { computeBadges } from '../../lib/badges'

// Node's process.env (Node re-reads TZ on assignment); typed locally since the app tsconfig has no node types.
const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env

const ORIGINAL_TZ = env.TZ

beforeEach(() => {
  env.TZ = 'America/Los_Angeles'
  vi.useFakeTimers()
  useProgress.getState().resetPlayer()
})
afterEach(() => {
  vi.useRealTimers()
  if (ORIGINAL_TZ === undefined) delete env.TZ
  else env.TZ = ORIGINAL_TZ
})

/** Local wall-clock time in America/Los_Angeles (PDT, UTC-7, in October). */
const pdt = (day: string, hour: number) => new Date(`${day}T${String(hour).padStart(2, '0')}:00:00-07:00`)

describe('daily streak (local days)', () => {
  it('counts consecutive local days, and only once per day', () => {
    const bump = () => useProgress.getState().bumpStreakIfNeeded()
    vi.setSystemTime(pdt('2026-10-03', 9))
    bump()
    vi.setSystemTime(pdt('2026-10-03', 18)) // after 5 PM: a new UTC day, same local day
    bump()
    expect(useProgress.getState().stats.streakDays).toBe(1)
    vi.setSystemTime(pdt('2026-10-04', 10))
    bump()
    expect(useProgress.getState().stats.streakDays).toBe(2)
  })

  it('keeps the best streak (and Week Warrior) after the streak breaks', () => {
    const bump = () => useProgress.getState().bumpStreakIfNeeded()
    for (let d = 1; d <= 7; d++) {
      vi.setSystemTime(pdt(`2026-10-0${d}`, 12))
      bump()
    }
    vi.setSystemTime(pdt('2026-10-09', 12)) // skipped the 8th
    bump()
    const s = useProgress.getState()
    expect(s.stats.streakDays).toBe(1)
    expect(s.stats.bestStreak).toBe(7)
    const ww = computeBadges(s).find((b) => b.id === 'week-warrior')
    expect(ww?.earned).toBe(true)
  })

  it('a learning tick counts toward today even if the app was opened yesterday', () => {
    vi.setSystemTime(pdt('2026-10-03', 20))
    useProgress.getState().bumpStreakIfNeeded()
    vi.setSystemTime(pdt('2026-10-04', 8))
    useProgress.getState().tickPlay(5)
    expect(useProgress.getState().stats.streakDays).toBe(2)
  })

  it('the daily learning goal resets at local midnight, not UTC midnight', () => {
    vi.setSystemTime(pdt('2026-10-03', 16))
    useProgress.getState().tickPlay(15)
    vi.setSystemTime(pdt('2026-10-03', 18)) // UTC has rolled over; local day has not
    useProgress.getState().tickPlay(15)
    expect(useProgress.getState().playSecondsToday).toBe(30)
  })
})

describe('migrateV0toV1', () => {
  it('clamps UTC day keys that are ahead of the local date', () => {
    const now = pdt('2026-10-03', 19).getTime() // local Oct 3; UTC already Oct 4
    const out = migrateV0toV1(
      { stats: { streakDays: 4, lastStreakDate: '2026-10-04' }, playDate: '2026-10-04' },
      now,
    )
    expect(out.stats?.lastStreakDate).toBe('2026-10-03')
    expect(out.stats?.bestStreak).toBe(4)
    expect(out.playDate).toBe('2026-10-03')
  })

  it('recovers the daily-challenge claim date from the last daily session', () => {
    const at = pdt('2026-10-02', 19).getTime()
    const out = migrateV0toV1(
      { dailyClaimedDate: '2026-10-03', sessions: [{ at, kind: 'daily' }] },
      pdt('2026-10-03', 9).getTime(),
    )
    expect(out.dailyClaimedDate).toBe('2026-10-02')
  })

  it('returns furniture that no longer fits the 10×10 room to the inventory', () => {
    const out = migrateV0toV1({
      ownedHomeItems: { bed: 0, chair: 1 },
      placedItems: [
        { uid: 'a', itemId: 'bed', gx: 14, gz: 2, rot: 0 }, // outside the shrunken room
        { uid: 'b', itemId: 'chair', gx: 1, gz: 1, rot: 0 },
        { uid: 'c', itemId: 'chair', gx: 1, gz: 1, rot: 0 }, // overlaps b
      ],
    })
    expect(out.placedItems?.map((p) => p.uid)).toEqual(['b'])
    expect(out.ownedHomeItems).toEqual({ bed: 1, chair: 2 })
  })
})

describe('persist rehydration of an old (v0) save', () => {
  it('runs the v1 migration and keeps the deep-merged accessory slots', async () => {
    vi.setSystemTime(pdt('2026-10-03', 19))
    localStorage.setItem(
      'summerquest-progress-v1',
      JSON.stringify({
        version: 0,
        state: {
          player: { emoji: '🦊', color: '#f97316', name: 'Old Save' },
          coins: 42,
          stats: { problemsAnswered: 3, problemsCorrect: 2, secondsPlayed: 60, streakDays: 3, lastStreakDate: '2026-10-04' },
          ownedHomeItems: {},
          placedItems: [{ uid: 'x', itemId: 'bed', gx: 15, gz: 15, rot: 0 }],
          equippedAccessories: { head: 'cap' },
        },
      }),
    )
    await useProgress.persist.rehydrate()
    const s = useProgress.getState()
    expect(s.player?.name).toBe('Old Save')
    expect(s.coins).toBe(42)
    expect(s.stats.lastStreakDate).toBe('2026-10-03')
    expect(s.placedItems).toEqual([])
    expect(s.ownedHomeItems).toEqual({ bed: 1 })
    expect(s.equippedAccessories).toEqual({ head: 'cap', face: null, back: null, body: null })
    localStorage.removeItem('summerquest-progress-v1')
  })
})

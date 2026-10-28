// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { useProgress } from '../progress'
import { helpAskRows, weakSkills } from '../../lib/analytics'
import { skillRecovered } from '../../lib/pets/schoolPet'

/**
 * "Show me how" tracking: opens are counted per skill (local only), a right
 * answer after it is recorded as right but `helped`, and This Week's Focus
 * weighs a helped right answer as half.
 */

const KEY = 'summerquest-progress-v1'
const DAY = 86_400_000
const s = () => useProgress.getState()

beforeEach(() => {
  localStorage.clear()
  s().resetPlayer()
})

describe('help asks', () => {
  it('counts every open per skill, with the last time', () => {
    s().recordHelpAsk('meas-time', 'telling time', 1000)
    s().recordHelpAsk('meas-time', 'telling time', 5000)
    s().recordHelpAsk('pv-round', 'rounding numbers', 3000)
    expect(s().helpAsks).toEqual({
      'meas-time': { label: 'telling time', count: 2, lastAt: 5000 },
      'pv-round': { label: 'rounding numbers', count: 1, lastAt: 3000 },
    })
    s().resetPlayer()
    expect(s().helpAsks).toEqual({})
  })

  it('a save from before "Show me how" (v5, no helpAsks) loads with none; nothing else changes', async () => {
    const player = { emoji: '🦊', color: '#f97316', name: 'T', grade: 3 }
    localStorage.setItem(KEY, JSON.stringify({ state: { player, coins: 42, attempts: [] }, version: 5 }))
    await useProgress.persist.rehydrate()
    expect(s().helpAsks).toEqual({})
    expect(s().coins).toBe(42)
    expect(JSON.parse(localStorage.getItem(KEY)!).version).toBe(5)
  })

  it('a malformed saved record keeps only its good entries', async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        state: {
          player: { emoji: '🦊', color: '#f97316', name: 'T', grade: 3 },
          helpAsks: { ok: { label: 'money', count: 3, lastAt: 9 }, bad: { count: 'x' }, worse: 7, zero: { label: 'z', count: 0, lastAt: 1 } },
        },
        version: 5,
      }),
    )
    await useProgress.persist.rehydrate()
    expect(s().helpAsks).toEqual({ ok: { label: 'money', count: 3, lastAt: 9 } })
    localStorage.setItem(KEY, JSON.stringify({ state: { helpAsks: 'oops' }, version: 5 }))
    await useProgress.persist.rehydrate()
    expect(s().helpAsks).toEqual({})
  })

  it('lists most recent first, with friendly "last asked" labels', () => {
    const now = new Date('2026-07-10T15:00:00').getTime()
    const rows = helpAskRows(
      {
        a: { label: 'telling time', count: 4, lastAt: now - 60_000 },
        b: { label: 'money', count: 1, lastAt: now - DAY },
        c: { label: 'rounding numbers', count: 2, lastAt: now - 3 * DAY },
        d: { label: 'area', count: 1, lastAt: new Date('2026-06-01T10:00:00').getTime() },
      },
      now,
    )
    expect(rows.map((r) => [r.label, r.count, r.lastLabel])).toEqual([
      ['telling time', 4, 'today'],
      ['money', 1, 'yesterday'],
      ['rounding numbers', 2, '3 days ago'],
      ['area', 1, '6/1'],
    ])
  })
})

describe('helped answers on This Week\'s Focus', () => {
  const at = (i: number, correct: boolean, helped = false) => ({
    id: `a${i}`, at: 1_000_000 + i, zoneId: 'measurement-marsh', topic: 'measurement', skillId: 'meas-time', skillLabel: 'telling time', correct, ...(helped ? { helped } : {}),
  })
  const now = 1_000_000 + 100

  it('a right answer after "Show me how" counts half toward the skill\'s accuracy', () => {
    // 4 right on their own: 100%, off the list
    expect(weakSkills([0, 1, 2, 3].map((i) => at(i, true)), { now })).toEqual([])
    // 4 right, but 2 of them helped: 75%, on the list (still 4 correct)
    const w = weakSkills([at(0, true), at(1, true), at(2, true, true), at(3, true, true)], { now })
    expect(w).toMatchObject([{ skillId: 'meas-time', attempts: 4, correct: 4, accuracy: 75 }])
    expect(skillRecovered([at(0, true), at(1, true), at(2, true, true), at(3, true, true)], 'meas-time', now)).toBe(false)
    expect(skillRecovered([at(0, true), at(1, true), at(2, true), at(3, true, true), at(4, true)], 'meas-time', now)).toBe(true)
  })

  it('recordAttempt keeps the helped mark', () => {
    s().recordAttempt({ zoneId: 'z', topic: 't', skillId: 's', skillLabel: 'x', correct: true, helped: true })
    expect(s().attempts[0]).toMatchObject({ correct: true, helped: true })
  })
})

// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { useProgress } from '../progress'
import { migrateV4toV5 } from '../migrations'
import { FOCUS_REWARD_COINS, emptySchoolPet } from '../../lib/pets/schoolPet'
import { localDayKey } from '../../lib/dates'
import { allPetStages, pendingMoments } from '../../lib/pets/growth'

const KEY = 'summerquest-progress-v1'
const DAY = 86_400_000
const s = () => useProgress.getState()

/** One answer on a skill at `at` (default: now). */
function answer(skillId: string, correct: boolean, at = Date.now()) {
  s().recordAttempt({ zoneId: 'multiplication-mesa', topic: 't', skillId, skillLabel: skillId, correct, at })
}
/** Put a skill on This Week's Focus: 3 right, 1 wrong (75 %), just before `at`. */
function weak(skillId: string, at = Date.now()) {
  answer(skillId, false, at - 4000)
  answer(skillId, true, at - 3000)
  answer(skillId, true, at - 2000)
  answer(skillId, true, at - 1000)
}

beforeEach(() => {
  localStorage.clear()
  s().resetPlayer()
  useProgress.setState({ player: { emoji: '🦊', color: '#f97316', name: 'T', grade: 3 }, ownedCreatures: ['fox'], activeCreature: 'fox' })
})

describe('the Schoolhouse raven in the store', () => {
  it('clearing a skill by practice hatches the raven; it becomes the buddy as the first pet', () => {
    weak('mult-f6_9')
    expect(s().schoolPet.clears).toBe(0)
    answer('mult-f6_9', true) // 4 of 5 = 80 %: off the list
    expect(s().schoolPet.clears).toBe(1)
    expect(s().buddyPet).toBe('raven')
  })

  it('clearing the whole list pays the reward once per week (coins, a celebration waiting)', () => {
    const t0 = Date.now()
    weak('mult-f6_9', t0)
    const coins = s().coins
    answer('mult-f6_9', true, t0)
    expect(s().coins).toBe(coins + FOCUS_REWARD_COINS)
    expect(s().schoolPet).toMatchObject({ fullClears: 1, rewardPending: true, rewardDay: localDayKey(t0) })
    s().markFocusRewardCelebrated()
    expect(s().schoolPet.rewardPending).toBe(false)

    // the list fills and empties again two days later: counted, but no second reward this week
    const t1 = t0 + 2 * DAY
    weak('mult-f2_5', t1)
    answer('mult-f2_5', true, t1)
    expect(s().schoolPet.fullClears).toBe(2)
    expect(s().coins).toBe(coins + FOCUS_REWARD_COINS)
    expect(s().schoolPet.rewardPending).toBe(false)

    // a week after the first: paid again
    const t2 = t0 + 7 * DAY
    weak('mult-f10_12', t2)
    answer('mult-f10_12', true, t2)
    expect(s().coins).toBe(coins + 2 * FOCUS_REWARD_COINS)
  })

  it('the list emptying because time passed pays nothing', () => {
    const t0 = Date.now() - 8 * DAY
    weak('mult-f6_9', t0)
    const coins = s().coins
    // a week later the old tries have aged out; a right answer now is not a clear
    answer('mult-f6_9', true)
    expect(s().schoolPet).toMatchObject({ clears: 0, fullClears: 0, rewardPending: false })
    expect(s().coins).toBe(coins)
  })

  it('a Daily Challenge counts once a day', () => {
    s().claimDaily()
    s().claimDaily()
    expect(s().schoolPet.dailies).toBe(1)
  })

  it('the 3rd Daily Challenge hatches the raven (no cleared skill needed); it becomes the buddy', () => {
    useProgress.setState({ schoolPet: { ...emptySchoolPet(), dailies: 2 }, dailyClaimedDate: '2000-01-01' })
    expect(s().buddyPet).toBeNull()
    s().claimDaily()
    expect(s().schoolPet).toMatchObject({ dailies: 3, hatched: true })
    expect(s().buddyPet).toBe('raven')
  })

  it('a grown-up raven joins the avatars', () => {
    useProgress.setState({ schoolPet: { ...emptySchoolPet(), clears: 3, dailies: 11, fullClears: 1, hatched: true } })
    s().claimDaily() // 15 points + a full clear
    expect(s().ownedCreatures).toContain('raven')
    s().becomeCreature('raven')
    expect(s().activeCreature).toBe('raven')
  })

  it('only a hatched raven can be the buddy; its celebrations are remembered', () => {
    s().setBuddyPet('raven')
    expect(s().buddyPet).toBeNull()
    useProgress.setState({ schoolPet: { ...emptySchoolPet(), clears: 1, hatched: true } })
    s().setBuddyPet('raven')
    expect(s().buddyPet).toBe('raven')
    s().markPetsSeen({ raven: 'baby' })
    expect(s().petsSeen.raven).toBe('baby')
  })

  it('reset clears it', () => {
    useProgress.setState({ schoolPet: { ...emptySchoolPet(), clears: 4 } })
    s().resetPlayer()
    expect(s().schoolPet).toEqual(emptySchoolPet())
  })
})

describe('v4 → v5 migration (the Schoolhouse raven)', () => {
  it('counts the Daily Challenges already played, one per day, and starts as an egg', () => {
    const d1 = new Date(2026, 9, 1, 9).getTime()
    const sessions = [
      { at: d1, kind: 'daily' },
      { at: d1 + 3_600_000, kind: 'daily' }, // same day
      { at: d1 + DAY, kind: 'daily' },
      { at: d1 + 2 * DAY, kind: 'stage' },
    ]
    expect(migrateV4toV5({ sessions }).schoolPet).toEqual({ ...emptySchoolPet(), dailies: 2 })
    expect(migrateV4toV5({}).schoolPet).toEqual(emptySchoolPet())
  })

  it('3+ dailies played before the update: still an egg after it (no silent hatch), hatching with a celebration on the next daily', async () => {
    const d1 = new Date(2026, 9, 1, 9).getTime()
    const sessions = [0, 1, 2, 3].map((i) => ({ id: `d${i}`, at: d1 + i * DAY, zoneId: 'multiplication-mesa', zoneTitle: 'M', zoneEmoji: '✖️', stageId: 's', stageTitle: 'D', kind: 'daily', correct: 5, total: 5, stars: 3, score: 50 }))
    localStorage.setItem(
      KEY,
      JSON.stringify({ state: { player: { emoji: '🦊', color: '#f97316', name: 'T', grade: 3 }, sessions, petsSeen: {}, quest: null, dailyClaimedDate: '2026-10-04' }, version: 4 }),
    )
    await useProgress.persist.rehydrate()
    expect(s().schoolPet).toMatchObject({ dailies: 4, hatched: false })
    expect(pendingMoments(allPetStages(s()), s().petsSeen)).toEqual([])
    s().claimDaily()
    expect(s().schoolPet).toMatchObject({ dailies: 5, hatched: true })
    // the celebration is waiting (straight to kid: 5 points)
    expect(pendingMoments(allPetStages(s()), s().petsSeen)).toEqual([{ creatureId: 'raven', from: 'egg', to: 'kid' }])
  })

  it('a saved v4 game rehydrates with the raven and is saved back as v5', async () => {
    const d1 = new Date(2026, 9, 1, 9).getTime()
    localStorage.setItem(
      KEY,
      JSON.stringify({
        state: {
          player: { emoji: '🦊', color: '#f97316', name: 'T', grade: 3 },
          sessions: [{ id: 'x', at: d1, zoneId: 'multiplication-mesa', zoneTitle: 'M', zoneEmoji: '✖️', stageId: 's', stageTitle: 'D', kind: 'daily', correct: 5, total: 5, stars: 3, score: 50 }],
          petsSeen: {},
          quest: null,
        },
        version: 4,
      }),
    )
    await useProgress.persist.rehydrate()
    expect(s().schoolPet).toEqual({ ...emptySchoolPet(), dailies: 1 })
    expect(JSON.parse(localStorage.getItem(KEY)!).version).toBe(5)
  })

  it('a malformed saved record falls back to nothing yet', async () => {
    localStorage.setItem(KEY, JSON.stringify({ state: { player: { emoji: '🦊', color: '#f97316', name: 'T', grade: 3 }, schoolPet: 'oops' }, version: 5 }))
    await useProgress.persist.rehydrate()
    expect(s().schoolPet).toEqual(emptySchoolPet())
  })
})

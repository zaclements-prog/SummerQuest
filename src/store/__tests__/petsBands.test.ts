// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useProgress } from '../progress'
import { getZone, type Stage } from '../../curriculum'
import { pendingMoments, petStages, petStatus } from '../../lib/pets/growth'
import { petById } from '../../lib/pets/catalog'
import { computeBadges } from '../../lib/badges'

/*
 * Pets across grade bands (K–5 plan, kindergarten pilot contract): any of a
 * zone's lessons hatches its pet (`lessonIds`), and a pet's stage is the best
 * it reaches in any of its zone's bands — so changing grade never shrinks a
 * pet, and bands are never added together.
 *
 * The K–1 stage sets arrive with the content work; here Counting Mesa gets
 * the contract's three stages hung on the real zone.
 */

const KEY = 'summerquest-progress-v1'
const MESA = 'multiplication-mesa'
const mesa = getZone(MESA)!
const G24 = mesa.stages
const kStage = (id: string, kind: Stage['kind'], gameId: Stage['gameId']): Stage => ({
  id,
  kind,
  title: id,
  description: '',
  gameId,
  providerConfig: { kind: 'multiplication', factorMin: 1, factorMax: 2 },
  starsToEarn: 3,
})
const K1: Stage[] = [kStage('k-count-1', 'concept', 'listenPlay'), kStage('k-count-parade', 'practice', 'critterParade'), kStage('k-count-3', 'mastery', 'listenPlay')]

const s = () => useProgress.getState()
const lion = () => petStages(s().zones, s().lessonsDone, s().player?.grade).lion
const badges = () => computeBadges({ zones: s().zones, stats: s().stats, totalCoinsEarned: s().totalCoinsEarned, grade: s().player?.grade })
const mesaBadge = () => badges().find((b) => b.id === `zone-${MESA}`)!.earned

function start(grade: 0 | 1 | 3) {
  localStorage.clear()
  s().resetPlayer()
  useProgress.setState({ player: { emoji: '🦊', color: '#f97316', name: 'T', grade }, ownedCreatures: ['fox'], activeCreature: 'fox' })
}

afterEach(() => {
  delete mesa.stagesByBand
})

describe('a 2–4 player with a grown-up lion switches to K', () => {
  beforeEach(() => start(3))

  for (const withKSet of [true, false]) {
    it(`keeps the lion grown up${withKSet ? ' (Counting Mesa has its K stages)' : ' (before the K stages land)'}`, () => {
      if (withKSet) mesa.stagesByBand = { k1: K1 }
      for (const st of G24) s().awardStage(MESA, st.id, 3, 10)
      expect(lion()).toBe('adult')
      expect(s().ownedCreatures).toEqual(['fox', 'lion'])
      expect(s().buddyPet).toBe('lion')
      s().markPetsSeen({ lion: 'adult' })
      expect(mesaBadge()).toBe(true)

      s().setGrade(0)
      expect(lion()).toBe('adult')
      const st = petStatus(petById('lion')!, s().zones, s().lessonsDone, 0)
      expect(st.stage).toBe('adult')
      expect(st.next).toBeNull()
      expect(s().ownedCreatures).toEqual(['fox', 'lion'])
      expect(s().buddyPet).toBe('lion')
      // nothing to celebrate, nothing taken back
      expect(pendingMoments(petStages(s().zones, s().lessonsDone, 0), s().petsSeen)).toEqual([])
      expect(mesaBadge()).toBe(true)

      // and back again
      s().setGrade(3)
      expect(lion()).toBe('adult')
      expect(mesaBadge()).toBe(true)
    })
  }

  it('a half-grown pet keeps its stage, and its next step counts in the new band', () => {
    mesa.stagesByBand = { k1: K1 }
    s().awardStage(MESA, G24[0].id, 3, 10)
    s().awardStage(MESA, G24[1].id, 3, 10)
    expect(lion()).toBe('kid')
    s().setGrade(0)
    expect(lion()).toBe('kid')
    // at K: all 9 of the K stars to grow up (2–4's 6 don't carry over)
    expect(petStatus(petById('lion')!, s().zones, s().lessonsDone, 0)).toMatchObject({ stage: 'kid', stars: 0, total: 9, next: { stage: 'adult', more: 9 } })
  })
})

describe('a K player and the lion', () => {
  beforeEach(() => start(0))

  it('hatches it by finishing the K counting lesson (kCounting)', () => {
    expect(lion()).toBe('egg')
    s().markLessonDone('kCounting')
    expect(lion()).toBe('baby')
    expect(s().buddyPet).toBe('lion')
  })

  it('hatches and grows it with K stars', () => {
    mesa.stagesByBand = { k1: K1 }
    s().awardStage(MESA, 'k-count-1', 1, 10)
    expect(lion()).toBe('baby')
    expect(s().buddyPet).toBe('lion')
    s().awardStage(MESA, 'k-count-1', 3, 10)
    s().awardStage(MESA, 'k-count-parade', 2, 10)
    expect(lion()).toBe('kid')
    s().awardStage(MESA, 'k-count-parade', 3, 10)
    s().awardStage(MESA, 'k-count-3', 3, 10)
    expect(lion()).toBe('adult')
    expect(s().ownedCreatures).toEqual(['fox', 'lion'])
    expect(mesaBadge()).toBe(true)

    // grown in K, it stays grown in 2nd–4th grade
    s().setGrade(3)
    expect(lion()).toBe('adult')
    expect(mesaBadge()).toBe(true)
  })

  it('never adds bands together (a max, not a sum)', () => {
    mesa.stagesByBand = { k1: K1 }
    // 3 stars in 2–4 and 2 in K: 5 together would make a kid; each band alone is a baby
    s().awardStage(MESA, G24[0].id, 3, 10)
    s().awardStage(MESA, 'k-count-1', 2, 10)
    expect(lion()).toBe('baby')
    expect(petStatus(petById('lion')!, s().zones, s().lessonsDone, 0)).toMatchObject({ stars: 2, total: 9 })
    expect(petStatus(petById('lion')!, s().zones, s().lessonsDone, 3)).toMatchObject({ stars: 3, total: 9 })
  })

  it('the 2–4 lesson still hatches it too', () => {
    s().markLessonDone('multiplication')
    expect(lion()).toBe('baby')
  })
})

describe('a migrated save keeps everything', () => {
  const v2 = () => ({
    player: { emoji: '🦊', color: '#f97316', name: 'Maya', grade: 3 },
    coins: 140,
    ownedCreatures: ['fox'],
    activeCreature: 'fox',
    zones: {
      [MESA]: {
        zoneId: MESA,
        stages: Object.fromEntries(G24.map((st) => [st.id, { stageId: st.id, stars: 3, bestScore: 10, attempts: 1, completedAt: 1 }])),
      },
    },
  })

  beforeEach(() => start(3))

  it('a v2 save: pets, avatars, buddy and badges survive a switch to K', async () => {
    mesa.stagesByBand = { k1: K1 }
    localStorage.setItem(KEY, JSON.stringify({ state: v2(), version: 2 }))
    await useProgress.persist.rehydrate()
    expect(s().ownedCreatures).toEqual(['fox', 'lion'])
    expect(s().buddyPet).toBe('lion')
    expect(s().toursSeen).toEqual([])
    expect(lion()).toBe('adult')
    s().setGrade(0)
    expect(lion()).toBe('adult')
    expect(s().ownedCreatures).toEqual(['fox', 'lion'])
    expect(s().buddyPet).toBe('lion')
    expect(s().coins).toBe(140)
    expect(mesaBadge()).toBe(true)
    expect(pendingMoments(petStages(s().zones, s().lessonsDone, 0), s().petsSeen)).toEqual([])
  })

  it('a v3 save: a lesson finished before `lessonIds` still hatches its pet', async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ state: { ...v2(), zones: {}, lessonsDone: { geometry: 5 }, petsSeen: { panda: 'baby' }, buddyPet: 'panda', toursSeen: ['world', 7] }, version: 3 }),
    )
    await useProgress.persist.rehydrate()
    expect(petStages(s().zones, s().lessonsDone, 3).panda).toBe('baby')
    expect(s().buddyPet).toBe('panda')
    expect(s().toursSeen).toEqual(['world'])
    s().setGrade(1)
    expect(petStages(s().zones, s().lessonsDone, 1).panda).toBe('baby')
    expect(s().buddyPet).toBe('panda')
  })
})

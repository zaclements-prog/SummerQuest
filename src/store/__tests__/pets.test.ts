// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { useProgress, petSyncPatch } from '../progress'
import { migrateV2toV3 } from '../migrations'
import { getZone } from '../../curriculum'
import { pendingMoments, petStages } from '../../lib/pets/growth'

const KEY = 'summerquest-progress-v1'

/** Award every stage of a zone `stars` stars (in stage order, from a list). */
function award(zoneId: string, perStage: number[]) {
  const zone = getZone(zoneId)!
  perStage.forEach((n, i) => useProgress.getState().awardStage(zoneId, zone.stages[i].id, n, 10))
}

/** The zones record a v2 save would hold for these stars. */
function zonesRecord(spec: Record<string, number[]>) {
  const out: Record<string, { zoneId: string; stages: Record<string, unknown> }> = {}
  for (const [zoneId, perStage] of Object.entries(spec)) {
    const zone = getZone(zoneId)!
    const stages: Record<string, unknown> = {}
    perStage.forEach((n, i) => {
      const id = zone.stages[i].id
      stages[id] = { stageId: id, stars: n, bestScore: 10, attempts: 1, completedAt: 1 }
    })
    out[zoneId] = { zoneId, stages }
  }
  return out
}

const s = () => useProgress.getState()

beforeEach(() => {
  localStorage.clear()
  s().resetPlayer()
  useProgress.setState({ player: { emoji: '🦊', color: '#f97316', name: 'T', grade: 3 }, ownedCreatures: ['fox'], activeCreature: 'fox' })
})

describe('lessons and pets in the store', () => {
  it('markLessonDone records the first finish only, and hatches that zone’s pet', () => {
    s().markLessonDone('fractions')
    const first = s().lessonsDone.fractions
    expect(first).toBeGreaterThan(0)
    s().markLessonDone('fractions')
    expect(s().lessonsDone.fractions).toBe(first)
    expect(petStages(s().zones, s().lessonsDone).frog).toBe('baby')
  })

  it('the first pet to hatch becomes the World buddy', () => {
    expect(s().buddyPet).toBeNull()
    award('reading-reef', [1])
    expect(s().buddyPet).toBe('octopus')
    // a second hatch doesn't take over
    s().markLessonDone('fractions')
    expect(s().buddyPet).toBe('octopus')
  })

  it('leaving every pet at home sticks: a later hatch picks no new buddy', () => {
    award('reading-reef', [1])
    s().setBuddyPet(null)
    award('fraction-falls', [1])
    expect(s().buddyPet).toBeNull()
  })

  it('setBuddyPet takes hatched pets only', () => {
    award('reading-reef', [1])
    s().setBuddyPet('lion') // still an egg
    expect(s().buddyPet).toBe('octopus')
    s().setBuddyPet('dragon-king') // not a pet
    expect(s().buddyPet).toBe('octopus')
    s().markLessonDone('multiplication')
    s().setBuddyPet('lion')
    expect(s().buddyPet).toBe('lion')
  })

  it('a grown-up pet joins the avatars, and you can become it', () => {
    award('multiplication-mesa', [3, 3, 2])
    expect(s().ownedCreatures).toEqual(['fox'])
    award('multiplication-mesa', [3, 3, 3])
    expect(s().ownedCreatures).toEqual(['fox', 'lion'])
    s().becomeCreature('lion')
    expect(s().activeCreature).toBe('lion')
    // replaying doesn't add it twice
    award('multiplication-mesa', [3])
    expect(s().ownedCreatures).toEqual(['fox', 'lion'])
  })

  it("Tower Battlefront's dragon grows up on its 3 stars", () => {
    award('tower-battlefront', [3])
    expect(s().ownedCreatures).toContain('dragon')
  })

  it('markPetsSeen only moves forward and ignores junk', () => {
    s().markPetsSeen({ frog: 'kid' })
    s().markPetsSeen({ frog: 'baby', lion: 'gigantic' as never, nobody: 'adult' })
    expect(s().petsSeen).toEqual({ frog: 'kid' })
    s().markPetsSeen({ frog: 'adult' })
    expect(s().petsSeen.frog).toBe('adult')
  })

  it('petSyncPatch is a no-op when nothing grew', () => {
    const st = s()
    expect(petSyncPatch(st, st)).toEqual({})
  })

  it('resetPlayer clears pets but keeps the device settings', () => {
    useProgress.setState({ soundEnabled: false, graphicsQuality: 'low' })
    award('multiplication-mesa', [3, 3, 3])
    s().markLessonDone('reading')
    s().markPetsSeen({ lion: 'adult' })
    s().resetPlayer()
    expect(s()).toMatchObject({
      player: null,
      lessonsDone: {},
      petsSeen: {},
      buddyPet: null,
      ownedCreatures: [],
      activeCreature: null,
      zones: {},
      soundEnabled: false,
      graphicsQuality: 'low',
    })
  })
})

describe('v2 → v3 migration (pets)', () => {
  // A realistic v2 player: a finished Multiplication Mesa, 5 stars in Fraction
  // Falls, one in Reading Reef; bought the frog and plays as it.
  const v2 = () => ({
    player: { emoji: '🦊', color: '#f97316', name: 'Maya', grade: 3 },
    coins: 140,
    ownedCreatures: ['fox', 'frog'],
    activeCreature: 'frog',
    zones: zonesRecord({ 'multiplication-mesa': [3, 3, 3], 'fraction-falls': [3, 2], 'reading-reef': [1] }),
  })

  it('starts petsSeen at every current stage and adds grown-ups to the avatars', () => {
    const out = migrateV2toV3(v2())
    expect(out.lessonsDone).toEqual({})
    expect(out.petsSeen).toMatchObject({ lion: 'adult', frog: 'kid', octopus: 'baby', panda: 'egg', dragon: 'egg' })
    expect(Object.keys(out.petsSeen as object)).toHaveLength(12)
    expect(out.ownedCreatures).toEqual(['fox', 'frog', 'lion'])
    expect(out.activeCreature).toBe('frog')
    expect(out.coins).toBe(140)
    // the most grown pet comes along
    expect(out.buddyPet).toBe('lion')
  })

  it("prefers a buddy you aren't playing as", () => {
    const out = migrateV2toV3({ ...v2(), activeCreature: 'lion', ownedCreatures: ['fox', 'lion'] })
    expect(out.buddyPet).toBe('frog')
  })

  it('a player without progress gets no buddy and no new avatars', () => {
    const out = migrateV2toV3({ player: v2().player, ownedCreatures: ['fox'], activeCreature: 'fox' })
    expect(out.buddyPet).toBeNull()
    expect(out.ownedCreatures).toEqual(['fox'])
    expect(Object.values(out.petsSeen as object).every((g) => g === 'egg')).toBe(true)
  })

  it('survives a save without zones or creatures', () => {
    const out = migrateV2toV3({})
    expect(out.ownedCreatures).toEqual([])
    expect(out.buddyPet).toBeNull()
  })

  it('a saved v2 game rehydrates with no celebrations waiting', async () => {
    localStorage.setItem(KEY, JSON.stringify({ state: v2(), version: 2 }))
    await useProgress.persist.rehydrate()
    const st = s()
    expect(st.ownedCreatures).toEqual(['fox', 'frog', 'lion'])
    expect(st.activeCreature).toBe('frog')
    expect(st.buddyPet).toBe('lion')
    expect(pendingMoments(petStages(st.zones, st.lessonsDone), st.petsSeen)).toEqual([])
    expect(JSON.parse(localStorage.getItem(KEY)!).version).toBe(3)
  })

  it('a v3 save with broken pet fields loads clean', async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        state: { ...v2(), lessonsDone: { fractions: 'yesterday', reading: 5 }, petsSeen: { frog: 'kid', lion: 7, zebra: 'adult' }, buddyPet: 'zebra' },
        version: 3,
      }),
    )
    await useProgress.persist.rehydrate()
    expect(s().lessonsDone).toEqual({ reading: 5 })
    expect(s().petsSeen).toEqual({ frog: 'kid' })
    expect(s().buddyPet).toBeNull()
  })
})

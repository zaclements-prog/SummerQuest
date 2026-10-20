// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { curriculum, getStage, getZone, zoneStages, type Stage } from '..'
import { GRADE_LEVELS } from '../../lib/gradeTiers'
import { isStageUnlocked, playableStageId } from '../../lib/stageLocks'
import { petStatus, zoneStarTotals } from '../../lib/pets/growth'
import { petById } from '../../lib/pets/catalog'
import { computeBadges } from '../../lib/badges'
import { pickTodaysChallenge } from '../../lib/daily'
import { localDayKey } from '../../lib/dates'
import { zoneStageRows } from '../../world/hubContent'
import { useProgress, zoneMastered, zoneStars } from '../../store/progress'

/*
 * Band-aware stage sets: a zone plays `stagesByBand.k1` at K–1 and
 * `stagesByBand.g5` at 5th grade once they're authored, and its 2nd–4th grade
 * `stages` otherwise. Every reader goes through `zoneStages(zone, grade)`.
 * None is authored yet, so these tests hang a fake set on a real zone.
 */

const ZONE = 'multiplication-mesa'
const mesa = getZone(ZONE)!
const G24 = mesa.stages
const kStage = (id: string, kind: Stage['kind']): Stage => ({
  id,
  kind,
  title: `Count ${id}`,
  description: 'Count the apples.',
  gameId: 'conceptPlay',
  providerConfig: { kind: 'multiplication', factorMin: 2, factorMax: 5 },
  starsToEarn: 3,
})
const K1: Stage[] = [kStage('count-k-1', 'concept'), kStage('count-k-2', 'mastery')]
const G5: Stage[] = [kStage('mult-5-1', 'concept')]

/** Zone progress with these stars per stage id. */
const progressOf = (stars: Record<string, number>) => ({
  stages: Object.fromEntries(Object.entries(stars).map(([id, n]) => [id, { stars: n }])),
})
const allG24 = (n: number) => Object.fromEntries(G24.map((s) => [s.id, n]))

afterEach(() => {
  delete mesa.stagesByBand
})

describe('zoneStages', () => {
  it('falls back to the 2nd–4th grade stages while a band has no set (every zone, every grade)', () => {
    for (const zone of curriculum.zones) {
      for (const g of GRADE_LEVELS) expect(zoneStages(zone, g)).toBe(zone.stages)
      expect(zoneStages(zone, null)).toBe(zone.stages)
      expect(zoneStages(zone, undefined)).toBe(zone.stages)
    }
    // an empty set counts as "not authored yet"
    mesa.stagesByBand = { k1: [] }
    expect(zoneStages(mesa, 0)).toBe(G24)
  })

  it('uses a K–1 set for kindergarten and 1st grade only', () => {
    mesa.stagesByBand = { k1: K1 }
    expect(zoneStages(mesa, 0)).toBe(K1)
    expect(zoneStages(mesa, 1)).toBe(K1)
    for (const g of [2, 3, 4, 5] as const) expect(zoneStages(mesa, g)).toBe(G24)
    expect(zoneStages(mesa, null)).toBe(G24) // no profile: the default grade (4)
  })

  it('uses a grade-5 set for 5th grade only', () => {
    mesa.stagesByBand = { k1: K1, g5: G5 }
    expect(zoneStages(mesa, 5)).toBe(G5)
    expect(zoneStages(mesa, 4)).toBe(G24)
    expect(zoneStages(mesa, 0)).toBe(K1)
  })

  it('getStage finds only the grade’s own band', () => {
    mesa.stagesByBand = { k1: K1 }
    expect(getStage(ZONE, 'count-k-1', 0)?.id).toBe('count-k-1')
    expect(getStage(ZONE, 'count-k-1', 1)?.id).toBe('count-k-1')
    expect(getStage(ZONE, 'count-k-1', 3)).toBeUndefined()
    expect(getStage(ZONE, G24[0].id, 0)).toBeUndefined()
    expect(getStage(ZONE, G24[0].id, 5)?.id).toBe(G24[0].id)
    expect(getStage('nope', G24[0].id, 3)).toBeUndefined()
  })
})

describe('readers follow the current band', () => {
  it('the unlock ladder (and practice links) climb the band’s own stages', () => {
    mesa.stagesByBand = { k1: K1 }
    expect(isStageUnlocked(mesa, 'count-k-1', undefined, 0)).toBe(true)
    expect(isStageUnlocked(mesa, 'count-k-2', undefined, 0)).toBe(false)
    expect(isStageUnlocked(mesa, 'count-k-2', progressOf({ 'count-k-1': 1 }), 1)).toBe(true)
    // the 2–4 ladder isn't K's: a 2nd–4th grade stage isn't playable at grade 0
    expect(isStageUnlocked(mesa, G24[0].id, undefined, 0)).toBe(false)
    // a 2–4 lesson's practice link lands on the band's first open step
    expect(playableStageId(mesa, G24[1].id, undefined, 0)).toBe('count-k-1')
    expect(playableStageId(mesa, G24[1].id, progressOf({ [G24[0].id]: 2 }), 3)).toBe(G24[1].id)
  })

  it('zone star totals use the current band; a pet keeps its best band', () => {
    mesa.stagesByBand = { k1: K1 }
    const lion = petById('lion')!
    const zones = { [ZONE]: progressOf(allG24(3)) }

    expect(zoneStarTotals(mesa, zones[ZONE], 3)).toEqual({ earned: 9, total: 9, complete: true })
    expect(zoneStarTotals(mesa, zones[ZONE], 0)).toEqual({ earned: 0, total: 6, complete: false })
    expect(petStatus(lion, zones, {}, 3).stage).toBe('adult')
    // grown up in 2–4 stays grown up at K (its K stars still count from 0)
    expect(petStatus(lion, zones, {}, 0)).toMatchObject({ stage: 'adult', stars: 0, total: 6, next: null })

    // K's own stars grow the pet at K too (5 of 6 make a kid, all 6 a grown-up)
    const kOnly = { [ZONE]: progressOf({ 'count-k-1': 3, 'count-k-2': 2 }) }
    expect(petStatus(lion, kOnly, {}, 0)).toMatchObject({ stage: 'kid', stars: 5 })
    expect(petStatus(lion, kOnly, {}, 3)).toMatchObject({ stage: 'kid', stars: 0, next: { stage: 'adult', more: 9 } })
    kOnly[ZONE].stages['count-k-2'].stars = 3
    expect(petStatus(lion, kOnly, {}, 1).stage).toBe('adult')
    // …and never leak into the 2–4 totals
    expect(zoneStarTotals(mesa, progressOf({ 'count-k-1': 3, 'count-k-2': 3 }), 3).earned).toBe(0)
  })

  it('a zone badge takes every stage of any one band (it never goes away on a grade change); star milestones count every band', () => {
    mesa.stagesByBand = { k1: K1 }
    const ctx = (grade: 0 | 3, stars: Record<string, number>) => ({
      zones: { [ZONE]: progressOf(stars) },
      stats: { problemsAnswered: 0, streakDays: 0 },
      totalCoinsEarned: 0,
      grade,
    })
    const badge = (c: ReturnType<typeof ctx>, id: string) => computeBadges(c).find((b) => b.id === id)!.earned
    expect(badge(ctx(3, allG24(1)), 'zone-multiplication-mesa')).toBe(true)
    expect(badge(ctx(0, allG24(1)), 'zone-multiplication-mesa')).toBe(true)
    expect(badge(ctx(0, { 'count-k-1': 1, 'count-k-2': 1 }), 'zone-multiplication-mesa')).toBe(true)
    expect(badge(ctx(3, { 'count-k-1': 1, 'count-k-2': 1 }), 'zone-multiplication-mesa')).toBe(true)
    // half of each band is neither (bands never add up)
    expect(badge(ctx(0, { [G24[0].id]: 1, [G24[1].id]: 1, 'count-k-1': 1 }), 'zone-multiplication-mesa')).toBe(false)
    // "Perfect!" (3 stars on any stage) still counts a star earned in another band
    expect(badge(ctx(0, { [G24[0].id]: 3 }), 'perfect')).toBe(true)
  })

  it('the Daily Challenge and the World panel use the band’s set', () => {
    mesa.stagesByBand = { k1: K1 }
    // a day whose challenge is this zone (the zone pick is the same at every grade)
    let day = ''
    for (let d = 0; d < 366 && !day; d++) {
      const key = localDayKey(new Date(2026, 0, 1 + d))
      if (pickTodaysChallenge(0, key).zone.id === ZONE) day = key
    }
    expect(day).not.toBe('')
    expect(K1).toContain(pickTodaysChallenge(0, day).stage)
    expect(pickTodaysChallenge(3, day).stage).toBe(G24[0])

    const k = zoneStageRows(ZONE, { zones: {}, grade: 0 })
    expect(k.map((r) => [r.stageId, r.locked])).toEqual([['count-k-1', false], ['count-k-2', true]])
    expect(zoneStageRows(ZONE, { zones: {}, grade: 3 }).map((r) => r.stageId)).toEqual(G24.map((s) => s.id))
  })
})

describe('changing grade', () => {
  const s = () => useProgress.getState()

  beforeEach(() => {
    localStorage.clear()
    s().resetPlayer()
    s().setAvatar({ emoji: '🦁', color: '#fb923c', name: 'T', grade: 3 })
  })

  it('keeps every star: each band’s count again on switching back', () => {
    mesa.stagesByBand = { k1: K1 }
    for (const st of G24) s().awardStage(ZONE, st.id, 3, 10)
    expect(zoneStars(ZONE)).toBe(9)
    expect(zoneMastered(ZONE)).toBe(true)
    expect(s().ownedCreatures).toContain('lion') // grown up in 2–4

    s().setGrade(0)
    expect(s().player?.grade).toBe(0)
    expect(zoneStars(ZONE)).toBe(0) // K's own stages: none yet
    expect(zoneMastered(ZONE)).toBe(false)
    expect(s().zones[ZONE].stages[G24[0].id].stars).toBe(3) // …but nothing was lost
    expect(s().ownedCreatures).toContain('lion') // a grown-up pet stays an avatar

    s().awardStage(ZONE, 'count-k-1', 2, 10)
    expect(zoneStars(ZONE)).toBe(2)

    s().setGrade(3)
    expect(zoneStars(ZONE)).toBe(9)
    expect(zoneMastered(ZONE)).toBe(true)
    expect(s().zones[ZONE].stages['count-k-1'].stars).toBe(2)

    s().setGrade(1)
    expect(zoneStars(ZONE)).toBe(2)
    expect(zoneStars(ZONE, 4)).toBe(9) // any grade can be asked for
  })

  it('without band sets, a grade change moves nothing (2–4 as today)', () => {
    for (const st of G24) s().awardStage(ZONE, st.id, 2, 10)
    for (const g of GRADE_LEVELS) {
      s().setGrade(g)
      expect(zoneStars(ZONE)).toBe(6)
      expect(zoneMastered(ZONE)).toBe(true)
    }
  })
})

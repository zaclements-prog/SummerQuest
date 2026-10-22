// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { curriculum, getStage, getZone, zoneStages, zoneTitle, type Stage, type Zone } from '..'
import { GRADE_LEVELS } from '../../lib/gradeTiers'
import { isStageUnlocked, playableStageId } from '../../lib/stageLocks'
import { petStatus, zoneStarTotals } from '../../lib/pets/growth'
import { petById } from '../../lib/pets/catalog'
import { computeBadges } from '../../lib/badges'
import { pickTodaysChallenge } from '../../lib/daily'
import { localDayKey } from '../../lib/dates'
import { zoneStageRows } from '../../world/hubContent'
import { isZoneSleeping } from '../../lib/listenNav'
import { TRACE_ROUND } from '../../lib/providers/kTrace'
import { useProgress, zoneMastered, zoneStars } from '../../store/progress'
import { createProvider } from '../../lib/providers'
import type { ListenProblem } from '../../games/listenPlay/types'

/*
 * Band-aware stage sets: a zone plays `stagesByBand.k1` at K–1 and
 * `stagesByBand.g5` at 5th grade once they're authored, and its 2nd–4th grade
 * `stages` otherwise. Every reader goes through `zoneStages(zone, grade)`.
 * Most of these tests hang a fake set on a real zone (Multiplication Mesa's
 * own K–1 set is put aside meanwhile); the last block checks the real K–1
 * pilot sets.
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

// Multiplication Mesa's real band sets, put back after each test that swaps in a fake one
const MESA_BANDS = mesa.stagesByBand
beforeEach(() => {
  delete mesa.stagesByBand
})
afterEach(() => {
  mesa.stagesByBand = MESA_BANDS
})

describe('zoneStages', () => {
  it('falls back to the 2nd–4th grade stages while a band has no set (every zone, every grade)', () => {
    for (const zone of curriculum.zones) {
      // (5th grade plays its own set where the zone has one: G5_IDS)
      for (const g of GRADE_LEVELS) if ((!zone.stagesByBand?.k1 || g >= 2) && !(g === 5 && zone.stagesByBand?.g5?.length)) expect(zoneStages(zone, g)).toBe(zone.stages)
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

  it('1st grade plays its own set where the zone has one, else kindergarten’s', () => {
    const G1: Stage[] = [kStage('add-g1-1', 'concept'), kStage('add-g1-2', 'mastery')]
    mesa.stagesByBand = { k1: K1, g1: G1 }
    expect(zoneStages(mesa, 1)).toBe(G1)
    expect(zoneStages(mesa, 0)).toBe(K1) // kindergarten never sees 1st grade's
    for (const g of [2, 3, 4, 5] as const) expect(zoneStages(mesa, g)).toBe(G24)
    expect(getStage(ZONE, 'add-g1-1', 1)?.id).toBe('add-g1-1')
    expect(getStage(ZONE, 'add-g1-1', 0)).toBeUndefined()
    expect(getStage(ZONE, 'count-k-1', 1)).toBeUndefined()
    // an empty 1st grade set counts as none
    mesa.stagesByBand = { k1: K1, g1: [] }
    expect(zoneStages(mesa, 1)).toBe(K1)
    // only a 1st grade set: kindergarten plays 2–4's (and sees the zone sleeping)
    mesa.stagesByBand = { g1: G1 }
    expect(zoneStages(mesa, 0)).toBe(G24)
    expect(isZoneSleeping(mesa, 0)).toBe(true)
    expect(isZoneSleeping(mesa, 1)).toBe(false)
    // a 1st grade name of its own, else kindergarten's
    const named = { title: 'Multiplication Mesa', titleByBand: { k1: 'Counting Mesa' } as Zone['titleByBand'] }
    expect(zoneTitle(named, 1)).toBe('Counting Mesa')
    named.titleByBand = { k1: 'Counting Mesa', g1: 'Adding Mesa' }
    expect(zoneTitle(named, 1)).toBe('Adding Mesa')
    expect(zoneTitle(named, 0)).toBe('Counting Mesa')
    expect(zoneTitle(named, 3)).toBe('Multiplication Mesa')
  })

  it('a pet grows from its best band, 1st grade’s set included', () => {
    const G1: Stage[] = [kStage('add-g1-1', 'concept'), kStage('add-g1-2', 'mastery')]
    mesa.stagesByBand = { k1: K1, g1: G1 }
    const lion = petById('lion')!
    const g1Only = { [ZONE]: progressOf({ 'add-g1-1': 3, 'add-g1-2': 3 }) }
    expect(petStatus(lion, g1Only, {}, 1).stage).toBe('adult')
    // grown up in 1st grade stays grown up after a switch to kindergarten or 3rd grade
    expect(petStatus(lion, g1Only, {}, 0).stage).toBe('adult')
    expect(petStatus(lion, g1Only, {}, 3).stage).toBe('adult')
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
    // a day whose challenge is this zone, at this grade (K–1 picks from fewer zones)
    const dayFor = (grade: 0 | 3) => {
      for (let d = 0; d < 366; d++) {
        const key = localDayKey(new Date(2026, 0, 1 + d))
        if (pickTodaysChallenge(grade, key).zone.id === ZONE) return key
      }
      return ''
    }
    expect(dayFor(0)).not.toBe('')
    expect(dayFor(3)).not.toBe('')
    expect(K1).toContain(pickTodaysChallenge(0, dayFor(0)).stage)
    expect(pickTodaysChallenge(3, dayFor(3)).stage).toBe(G24[0])

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

/** The zones with a 5th-grade set of their own (K–5 plan, phase-3 contract). */
const G5_IDS: Record<string, string[]> = {
  // Reading Reef, Writing Workshop, Science Summit (phase 3)
  'reading-reef': ['g5-read-1', 'g5-read-2', 'g5-read-3'],
  'writing-workshop': ['g5-write-1', 'g5-write-2', 'g5-write-3'],
  'science-summit': ['g5-sci-1', 'g5-sci-cycle', 'g5-sci-2', 'g5-sci-3'],
  // Fraction Falls, Place Value Plateau, Tower Battlefront (phase 3)
  'fraction-falls': ['g5-frac-1', 'g5-frac-2', 'g5-frac-3'],
  'place-value-plateau': ['g5-dec-1', 'g5-dec-2', 'g5-dec-3'],
  'tower-battlefront': ['g5-td-1'],
  // Measurement Marsh, Geometry Grove, Data Delta (phase 3)
  'measurement-marsh': ['g5-measure-1', 'g5-measure-2', 'g5-measure-3'],
  'geometry-grove': ['g5-geo-1', 'g5-geo-2', 'g5-geo-3'],
  'data-delta': ['g5-data-1', 'g5-data-2', 'g5-data-3'],
}

/**
 * The zones with a 1st-grade set of their own (K–5 plan, phase-2b contract), and
 * the ones with a 1st-grade name of their own. Every other zone plays (and is
 * called) what kindergarten does at grade 1.
 */
const G1_IDS: Record<string, string[]> = {
  // Word Reef, Writing Workshop, Counting Towers (phase 2b)
  'reading-reef': ['g1-vowels-1', 'g1-digraphs-1', 'g1-words-1', 'g1-sentences-1', 'g1-sight-1'],
  'writing-workshop': ['g1-trace-1', 'g1-spell-1', 'g1-sentence-1'],
  'tower-battlefront': ['g1-towers-1', 'g1-towers-2', 'g1-towers-3'],
  // Tens Plateau, Fair Share Falls, Shape Grove (phase 2b)
  'place-value-plateau': ['g1-tens-1', 'g1-tens-2', 'g1-tens-3'],
  'fraction-falls': ['g1-shares-1', 'g1-shares-2', 'g1-shares-3'],
  'geometry-grove': ['g1-shapes-1', 'g1-shapes-2', 'g1-shapes-3'],
  // Measure Marsh, Graph Delta, Sky Summit (phase 2b)
  'measurement-marsh': ['g1-measure-1', 'g1-measure-2', 'g1-measure-3'],
  'data-delta': ['g1-graphs-1', 'g1-graphs-2', 'g1-graphs-3'],
  'science-summit': ['g1-science-1', 'g1-science-2', 'g1-science-3'],
  // Adding Mesa, Take-Away Dunes, Story Woods (phase 2b)
  'multiplication-mesa': ['g1-add-1', 'g1-add-parade', 'g1-add-3'],
  'division-dunes': ['g1-sub-1', 'g1-sub-parade', 'g1-sub-3'],
  'word-problem-woods': ['g1-woods-1', 'g1-woods-2', 'g1-woods-3'],
}
const G1_TITLES: Record<string, string> = {
  // Word Reef, Tens Plateau, Fair Share Falls, Graph Delta, Sky Summit, Adding Mesa, Take-Away Dunes (phase 2b; the others keep kindergarten's name)
  'reading-reef': 'Word Reef',
  'place-value-plateau': 'Tens Plateau',
  'fraction-falls': 'Fair Share Falls',
  'data-delta': 'Graph Delta',
  'science-summit': 'Sky Summit',
  'multiplication-mesa': 'Adding Mesa',
  'division-dunes': 'Take-Away Dunes',
}

describe('the K–1 pilot (fixed ids: K–5 plan, phase-1 contract)', () => {
  // (the top-level beforeEach puts Multiplication Mesa's set aside: bring it back)
  beforeEach(() => {
    mesa.stagesByBand = MESA_BANDS
  })

  const K1_IDS: Record<string, string[]> = {
    'multiplication-mesa': ['k-count-1', 'k-count-parade', 'k-count-3'],
    'geometry-grove': ['k-shapes-1', 'k-shapes-2', 'k-shapes-3'],
    // the pilot's three letter stages, with the literacy stages between them (phase-1b contract)
    'reading-reef': ['k-letters-1', 'k-rhyme-1', 'k-letters-2', 'k-syllables-1', 'k-letters-3', 'k-rhyme-2', 'k-blend-1', 'k-sight-1'],
    // (K literacy, phase 1b: Writing Workshop wakes up as the fourth K zone)
    'writing-workshop': ['k-trace-1', 'k-trace-2', 'k-trace-3', 'k-story-1'],
    // (K complete, phase 2a)
    'fraction-falls': ['k-addsub-1', 'k-addsub-2', 'k-addsub-3'],
    'word-problem-woods': ['k-woods-1', 'k-woods-2', 'k-woods-3'],
    // (K complete, phase 2a: Number Dunes, Ten Frame Plateau)
    'division-dunes': ['k-dunes-1', 'k-dunes-2', 'k-dunes-3'],
    'place-value-plateau': ['k-teens-1', 'k-teens-2', 'k-teens-3'],
    // K complete (phase 2a)
    'measurement-marsh': ['k-measure-1', 'k-measure-2', 'k-measure-3'],
    'data-delta': ['k-sort-1', 'k-sort-2', 'k-sort-3'],
    'science-summit': ['k-science-1', 'k-science-2', 'k-science-3'],
    'tower-battlefront': ['k-towers-1', 'k-towers-2', 'k-towers-3'],
  }
  const K1_TITLES: Record<string, string> = {
    'multiplication-mesa': 'Counting Mesa',
    'geometry-grove': 'Shape Grove',
    'reading-reef': 'Letter Reef',
    // (K complete, phase 2a)
    'fraction-falls': 'Add-and-Take Falls',
    'word-problem-woods': 'Story Woods',
    'division-dunes': 'Number Dunes',
    'place-value-plateau': 'Ten Frame Plateau',
    // K complete (phase 2a)
    'measurement-marsh': 'Measure Marsh',
    'data-delta': 'Sorting Delta',
    'science-summit': 'Nature Summit',
    'tower-battlefront': 'Counting Towers',
  }

  it('kindergarten and 1st grade see the K–1 stage sets; 2nd–5th grade still see today’s', () => {
    for (const zone of curriculum.zones) {
      for (const g of [0, 1] as const) {
        const ids = zoneStages(zone, g).map((s) => s.id)
        // (zones without a K–1 set fall back to their 2–4 stages; the World shows them as still sleeping;
        // 1st grade plays its own set where the zone has one: G1_IDS)
        expect(ids, `${zone.id} at grade ${g}`).toEqual((g === 1 ? G1_IDS[zone.id] : undefined) ?? K1_IDS[zone.id] ?? zone.stages.map((s) => s.id))
      }
      for (const g of [2, 3, 4] as const) expect(zoneStages(zone, g)).toBe(zone.stages)
      // (5th grade: its own set where the zone has one, G5_IDS)
      expect(zoneStages(zone, 5).map((s) => s.id), zone.id).toEqual(G5_IDS[zone.id] ?? zone.stages.map((s) => s.id))
    }
    // today's 2–4 stage ids, unchanged
    expect(getZone('multiplication-mesa')!.stages.map((s) => s.id)).toEqual(['mult-concept', 'mult-practice', 'mult-mastery'])
    expect(getZone('geometry-grove')!.stages.map((s) => s.id)).toEqual(['geo-shapes', 'geo-angles', 'geo-mastery'])
    expect(getZone('reading-reef')!.stages.map((s) => s.id)).toEqual(['read-3rd', 'read-4th', 'read-mastery'])
    expect(getZone('writing-workshop')!.stages.map((s) => s.id)).toEqual(['write-sentence', 'write-paragraph', 'write-story'])
    for (const ids of Object.values(K1_IDS)) for (const id of ids) expect(getStage(Object.keys(K1_IDS).find((z) => K1_IDS[z] === ids)!, id, 3)).toBeUndefined()
  })

  it('every K–1 stage is a voice-first game of 5–6 items with 3 stars, the parade with K–1 gates', () => {
    const all = Object.keys(K1_IDS).flatMap((z) => zoneStages(getZone(z)!, 0))
    expect(new Set(all.map((s) => s.id)).size).toBe(Object.values(K1_IDS).flat().length)
    for (const s of all) {
      expect(s.starsToEarn, s.id).toBe(3)
      expect(s.title.length, s.id).toBeGreaterThan(0)
      // titles and descriptions are said aloud: short, plain sentences
      expect(s.description.split(' ').length, s.id).toBeLessThanOrEqual(10)
      expect(s.description, s.id).toMatch(/[.!?]$/)
      if (s.id === 'k-count-parade') {
        expect(s.gameId).toBe('critterParade')
        expect(s.params?.ops).not.toBe('div')
        continue
      }
      // Counting Towers: the tower defense in its K–1 mode (its questions build the towers)
      if (s.id.startsWith('k-towers-')) {
        expect(s.gameId, s.id).toBe('towerDefense')
        expect(s.params?.listen, s.id).toBe(true)
        continue
      }
      expect(s.gameId, s.id).toBe('listenPlay')
      expect(s.params?.questionCount, s.id).toBeGreaterThanOrEqual(5)
      expect(s.params?.questionCount, s.id).toBeLessThanOrEqual(6)
    }
    expect(all.map((s) => s.providerConfig.kind)).toEqual([
      ...['kCounting', 'kCounting', 'kCounting', 'kShapes', 'kShapes', 'kShapes'],
      ...['kLetters', 'kLiteracy', 'kLetters', 'kLiteracy', 'kLetters', 'kLiteracy', 'kLiteracy', 'kLiteracy'],
      ...['kTrace', 'kTrace', 'kTrace', 'kStories'],
      // (K complete, phase 2a)
      ...['kAddTake', 'kAddTake', 'kAddTake'],
      ...['kStoryMath', 'kStoryMath', 'kStoryMath'],
      ...['kCompare', 'kCompare', 'kCompare', 'kTeens', 'kTeens', 'kTeens'],
      // K complete (phase 2a), in K1_IDS order
      ...['kMeasure', 'kMeasure', 'kMeasure', 'kSort', 'kSort', 'kSort'],
      ...['kScience', 'kScience', 'kScience', 'kTowers', 'kTowers', 'kTowers'],
    ])
    // the counting stages climb: count to 10, count on to 20 (the parade), then compare
    expect(all.slice(0, 3).map((s) => s.providerConfig)).toMatchObject([
      { mode: 'count', max: 10 },
      { mode: 'count', max: 20 },
      { mode: 'compare', max: 10 },
    ])
    // Count with me ends with a trace of the number just counted: its round is the stage's length
    const count1 = zoneStages(mesa, 0)[0]
    expect(count1.providerConfig).toMatchObject({ kind: 'kCounting', traceLast: count1.params?.questionCount })
    // the stage kinds the contract names
    expect(zoneStages(mesa, 0).map((s) => s.kind)).toEqual(['concept', 'practice', 'mastery'])
  })

  it('Letter Reef’s literacy stages: the phase-1b titles, kinds and question kinds, in unlock order', () => {
    const reef = getZone('reading-reef')!
    const set = zoneStages(reef, 0)
    expect(set.map((s) => [s.id, s.title])).toEqual([
      ['k-letters-1', 'Find the letter'],
      ['k-rhyme-1', 'Rhyme time'],
      ['k-letters-2', 'Big and little letters'],
      ['k-syllables-1', 'Clap the parts'],
      ['k-letters-3', 'First sounds'],
      ['k-rhyme-2', 'Finish the rhyme'],
      ['k-blend-1', 'Sound it out'],
      ['k-sight-1', 'Word hunt'],
    ])
    // the pilot's three letter stages, exactly as they were
    expect(set.filter((s) => s.id.startsWith('k-letters-')).map((s) => [s.kind, s.providerConfig])).toEqual([
      ['concept', { kind: 'kLetters', mode: 'findUpper' }],
      ['practice', { kind: 'kLetters', mode: 'matchCase', confusablesAfter: 3 }],
      ['mastery', { kind: 'kLetters', mode: 'firstSound' }],
    ])
    const at = (id: string) => set.find((s) => s.id === id)!
    // rhymes, word parts and blending are practice; the sight words close the reef
    for (const id of ['k-rhyme-1', 'k-syllables-1', 'k-rhyme-2', 'k-blend-1']) expect(at(id).kind, id).toBe('practice')
    expect(at('k-sight-1').kind).toBe('mastery')
    expect(set.slice(1).filter((s) => !s.id.startsWith('k-letters-')).map((s) => (s.providerConfig as { mode?: string }).mode)).toEqual(['rhyme', 'syllables', 'finishRhyme', 'blend', 'sight'])
    // each unlocks after the one before it
    const stars = (ids: string[]) => ({ stages: Object.fromEntries(ids.map((id) => [id, { stars: 1 }])) })
    set.forEach((s, i) => {
      expect(isStageUnlocked(reef, s.id, stars(set.slice(0, i).map((x) => x.id)), 0), s.id).toBe(true)
      if (i > 0) expect(isStageUnlocked(reef, s.id, stars(set.slice(0, i - 1).map((x) => x.id)), 0), s.id).toBe(false)
    })
    // "Clap the parts" is answered with the drum, not cards
    const drum = createProvider(at('k-syllables-1').providerConfig).next() as ListenProblem
    expect(drum.activity?.kind).toBe('drum')
    expect(drum.pictureOptions).toBeUndefined()
  })

  it('Writing Workshop (K literacy contract): trace lines, numbers, big letters, then story order, a round per stage', () => {
    const ww = zoneStages(getZone('writing-workshop')!, 0)
    expect(ww.map((s) => [s.id, s.title])).toEqual([
      ['k-trace-1', 'Warm-up lines'],
      ['k-trace-2', 'Trace numbers'],
      ['k-trace-3', 'Trace big letters'],
      ['k-story-1', 'Story order'],
    ])
    expect(ww.slice(0, 3).map((s) => s.providerConfig)).toEqual([
      { kind: 'kTrace', mode: 'warmup' },
      { kind: 'kTrace', mode: 'numbers' },
      { kind: 'kTrace', mode: 'letters' },
    ])
    // a trace stage plays one dealt round (lines, then slants, then curves: lib/providers/kTrace)
    for (const s of ww.slice(0, 3)) expect(s.params?.questionCount, s.id).toBe(TRACE_ROUND)
    expect(ww.map((s) => s.kind)).toEqual(['concept', 'practice', 'practice', 'mastery'])
    // and it's no longer sleeping for K–1; it keeps its own name
    expect(isZoneSleeping(getZone('writing-workshop')!, 0)).toBe(false)
    expect(zoneTitle(getZone('writing-workshop')!, 0)).toBe('Writing Workshop')
  })

  it('Add-and-Take Falls and Story Woods (phase-2a contract): their K titles, stage ids, kinds and lessons', () => {
    const falls = getZone('fraction-falls')!
    const woods = getZone('word-problem-woods')!
    for (const [zone, title, ids] of [
      [falls, 'Add-and-Take Falls', ['k-addsub-1', 'k-addsub-2', 'k-addsub-3']],
      [woods, 'Story Woods', ['k-woods-1', 'k-woods-2', 'k-woods-3']],
    ] as const) {
      const set = zoneStages(zone, 0)
      expect(set.map((s) => s.id)).toEqual(ids)
      expect(set.map((s) => s.kind)).toEqual(['concept', 'practice', 'mastery'])
      expect(zoneTitle(zone, 0)).toBe(title)
      expect(isZoneSleeping(zone, 0)).toBe(false)
      // each unlocks after the one before it
      const stars = (xs: string[]) => ({ stages: Object.fromEntries(xs.map((id) => [id, { stars: 1 }])) })
      set.forEach((s, i) => expect(isStageUnlocked(zone, s.id, stars(ids.slice(0, i)), 0), s.id).toBe(true))
      expect(isStageUnlocked(zone, ids[2], stars([ids[0]]), 0)).toBe(false)
      // answered by the mathStory activity (things join and leave on screen), never by reading
      const q = createProvider(set[0].providerConfig).next() as ListenProblem
      expect(q.activity?.kind).toBe('mathStory')
    }
    // the 2–4 stages are unchanged
    expect(falls.stages.map((s) => s.id)).toEqual(['frac-concept', 'frac-practice', 'frac-mastery'])
    expect(woods.stages.map((s) => s.id)).toEqual(['wp-concept', 'wp-practice', 'wp-mastery'])
  })

  it('names the three zones for K–1 only (zoneTitle)', () => {
    for (const zone of curriculum.zones) {
      for (const g of [0, 1] as const) expect(zoneTitle(zone, g)).toBe((g === 1 ? G1_TITLES[zone.id] : undefined) ?? K1_TITLES[zone.id] ?? zone.title)
      for (const g of [2, 3, 4, 5] as const) expect(zoneTitle(zone, g)).toBe(zone.title)
      expect(zoneTitle(zone, null)).toBe(zone.title)
    }
    expect(['multiplication-mesa', 'geometry-grove', 'reading-reef'].map((id) => getZone(id)!.title)).toEqual(['Multiplication Mesa', 'Geometry Grove', 'Reading Reef'])
  })
})

describe('K complete (phase-2a contract): Number Dunes and Ten Frame Plateau', () => {
  it('Number Dunes: concept, practice, mastery: line them up, which is more, numbers in order', () => {
    const dunes = getZone('division-dunes')!
    const set = zoneStages(dunes, 0)
    expect(set.map((s) => [s.id, s.kind, s.title])).toEqual([
      ['k-dunes-1', 'concept', 'Line them up'],
      ['k-dunes-2', 'practice', 'Which is more?'],
      ['k-dunes-3', 'mastery', 'Numbers in order'],
    ])
    expect(set.map((s) => s.providerConfig)).toEqual([
      { kind: 'kCompare', mode: 'match' },
      { kind: 'kCompare', mode: 'numbers' },
      { kind: 'kCompare', mode: 'lineUp' },
    ])
    expect(zoneTitle(dunes, 0)).toBe('Number Dunes')
    expect(isZoneSleeping(dunes, 0)).toBe(false)
    // grades 2–4 keep Division Dunes
    expect(zoneTitle(dunes, 3)).toBe('Division Dunes')
    expect(dunes.stages.map((s) => s.id)).toEqual(['div-concept', 'div-arena', 'div-practice', 'div-mastery'])
  })

  it('Ten Frame Plateau: ten and more, fill the frames, count to twenty', () => {
    const plateau = getZone('place-value-plateau')!
    // (kindergarten's: 1st grade has Tens Plateau now, phase 2b)
    const set = zoneStages(plateau, 0)
    expect(set.map((s) => [s.id, s.kind, s.title])).toEqual([
      ['k-teens-1', 'concept', 'Ten and more'],
      ['k-teens-2', 'practice', 'Fill the frames'],
      ['k-teens-3', 'mastery', 'Count to twenty'],
    ])
    expect(set.map((s) => s.providerConfig)).toEqual([
      { kind: 'kTeens', mode: 'tenAnd' },
      { kind: 'kTeens', mode: 'build' },
      { kind: 'kTeens', mode: 'twenty' },
    ])
    expect(zoneTitle(plateau, 0)).toBe('Ten Frame Plateau')
    expect(isZoneSleeping(plateau, 0)).toBe(false)
    expect(zoneTitle(plateau, 4)).toBe('Place Value Plateau')
    expect(plateau.stages.map((s) => s.id)).toEqual(['pv-concept', 'pv-practice', 'pv-mastery'])
  })

  it('every question is answered by doing a number activity (no plain cards), and each unlocks after the one before', () => {
    for (const zoneId of ['division-dunes', 'place-value-plateau']) {
      const zone = getZone(zoneId)!
      const set = zoneStages(zone, 0)
      for (const s of set) {
        const p = createProvider(s.providerConfig)
        for (let i = 0; i < 6; i++) expect((p.next() as ListenProblem).activity, `${s.id} #${i}`).toBeDefined()
      }
      const stars = (ids: string[]) => ({ stages: Object.fromEntries(ids.map((id) => [id, { stars: 1 }])) })
      set.forEach((s, i) => {
        expect(isStageUnlocked(zone, s.id, stars(set.slice(0, i).map((x) => x.id)), 0), s.id).toBe(true)
        if (i > 0) expect(isStageUnlocked(zone, s.id, stars(set.slice(0, i - 1).map((x) => x.id)), 0), s.id).toBe(false)
      })
    }
  })
})

describe('Nature Summit and Counting Towers (phase-2a contract)', () => {
  const stars = (ids: string[]) => ({ stages: Object.fromEntries(ids.map((id) => [id, { stars: 1 }])) })

  it('Nature Summit: weather and what to wear, what living things need, push and pull', () => {
    const zone = getZone('science-summit')!
    const set = zoneStages(zone, 0)
    expect(set.map((s) => [s.id, s.kind, s.title])).toEqual([
      ['k-science-1', 'concept', 'What to wear'],
      ['k-science-2', 'practice', 'Plants and animals'],
      ['k-science-3', 'mastery', 'Push and pull'],
    ])
    expect(set.map((s) => s.providerConfig)).toEqual([
      { kind: 'kScience', mode: 'weather' },
      { kind: 'kScience', mode: 'needs' },
      { kind: 'kScience', mode: 'pushPull' },
    ])
    expect(zoneTitle(zone, 0)).toBe('Nature Summit')
    expect(isZoneSleeping(zone, 0)).toBe(false)
    // the 2–4 set is untouched
    expect(zone.stages.map((s) => s.id)).toEqual(['science-3rd', 'science-cycle', 'science-4th', 'science-mastery'])
    set.forEach((s, i) => {
      expect(isStageUnlocked(zone, s.id, stars(set.slice(0, i).map((x) => x.id)), 0), s.id).toBe(true)
      if (i > 0) expect(isStageUnlocked(zone, s.id, undefined, 0), s.id).toBe(false)
    })
  })

  it('Counting Towers: the tower defense in its K–1 mode, how many → more or fewer → mixed to 20', () => {
    const zone = getZone('tower-battlefront')!
    const set = zoneStages(zone, 0)
    expect(set.map((s) => [s.id, s.kind, s.gameId])).toEqual([
      ['k-towers-1', 'concept', 'towerDefense'],
      ['k-towers-2', 'practice', 'towerDefense'],
      ['k-towers-3', 'mastery', 'towerDefense'],
    ])
    expect(set.map((s) => s.providerConfig)).toEqual([
      { kind: 'kTowers', mode: 'count' },
      { kind: 'kTowers', mode: 'compare' },
      { kind: 'kTowers', mode: 'mixed' },
    ])
    // K–1 behaviour lives behind the stage's params (the 2–4 stage has none)
    expect(set.map((s) => s.params)).toEqual([
      { listen: true, waves: 3 },
      { listen: true, waves: 3 },
      { listen: true, waves: 4 },
    ])
    expect(zoneTitle(zone, 0)).toBe('Counting Towers')
    expect(isZoneSleeping(zone, 0)).toBe(false)
    // grades 2–4 keep today's one stage, exactly
    expect(zone.stages).toHaveLength(1)
    expect(zone.stages[0]).toMatchObject({ id: 'td-arena', gameId: 'towerDefense', providerConfig: { kind: 'multiplication', factorMin: 2, factorMax: 10 } })
    expect(zone.stages[0].params).toBeUndefined()
    for (const g of [2, 3, 4] as const) expect(zoneStages(zone, g).map((s) => s.id)).toEqual(['td-arena'])
  })
})

describe('Grade 1 (phase-2b contract): Word Reef, Writing Workshop, Counting Towers', () => {
  const G1: Record<string, { title: string; ids: [string, Stage['kind']][]; kinds: string[] }> = {
    'reading-reef': {
      title: 'Word Reef',
      ids: [
        ['g1-vowels-1', 'concept'],
        ['g1-digraphs-1', 'practice'],
        ['g1-words-1', 'practice'],
        ['g1-sentences-1', 'practice'],
        ['g1-sight-1', 'mastery'],
      ],
      kinds: ['g1Reading'],
    },
    'writing-workshop': {
      title: 'Writing Workshop',
      ids: [
        ['g1-trace-1', 'concept'],
        ['g1-spell-1', 'practice'],
        ['g1-sentence-1', 'mastery'],
      ],
      kinds: ['g1Writing'],
    },
    'tower-battlefront': {
      title: 'Counting Towers',
      ids: [
        ['g1-towers-1', 'concept'],
        ['g1-towers-2', 'practice'],
        ['g1-towers-3', 'mastery'],
      ],
      kinds: ['g1Towers'],
    },
  }

  it.each(Object.keys(G1))('%s: its 1st-grade set and name; kindergarten and grades 2–4 unchanged', (zoneId) => {
    const zone = getZone(zoneId)!
    const want = G1[zoneId]
    const set = zoneStages(zone, 1)
    expect(set.map((st) => [st.id, st.kind])).toEqual(want.ids)
    expect(zoneTitle(zone, 1)).toBe(want.title)
    expect(isZoneSleeping(zone, 1)).toBe(false)
    // kindergarten keeps its own set and name
    expect(zoneStages(zone, 0)).toBe(zone.stagesByBand!.k1)
    expect(zoneStages(zone, 0).some((st) => st.id.startsWith('g1-'))).toBe(false)
    for (const g of [2, 3, 4] as const) expect(zoneStages(zone, g)).toBe(zone.stages)
    for (const st of set) {
      expect(want.kinds).toContain(st.providerConfig.kind)
      expect(st.starsToEarn).toBe(3)
      // said aloud: short, plain sentences
      expect(st.description.split(' ').length, st.id).toBeLessThanOrEqual(10)
      expect(st.description, st.id).toMatch(/[.!?]$/)
      if (zoneId === 'tower-battlefront') {
        expect(st.gameId).toBe('towerDefense')
        expect(st.params?.listen).toBe(true)
      } else {
        expect(st.gameId).toBe('listenPlay')
        expect(st.params?.questionCount, st.id).toBeGreaterThanOrEqual(5)
        expect(st.params?.questionCount, st.id).toBeLessThanOrEqual(6)
      }
      // a 1st-grade stage is never found at another grade
      expect(getStage(zoneId, st.id, 0)).toBeUndefined()
      expect(getStage(zoneId, st.id, 3)).toBeUndefined()
    }
    // each unlocks after the one before it
    const ids = set.map((st) => st.id)
    const stars = (xs: string[]) => ({ stages: Object.fromEntries(xs.map((id) => [id, { stars: 1 }])) })
    set.forEach((st, i) => {
      expect(isStageUnlocked(zone, st.id, stars(ids.slice(0, i)), 1), st.id).toBe(true)
      if (i > 0) expect(isStageUnlocked(zone, st.id, undefined, 1), st.id).toBe(false)
    })
  })

  it('Word Reef asks spoken picture questions and reads with the readAlong activity; Writing Workshop traces and builds from tiles', () => {
    const play = (zoneId: string, stageId: string) => {
      const st = zoneStages(getZone(zoneId)!, 1).find((x) => x.id === stageId)!
      const p = createProvider(st.providerConfig)
      return Array.from({ length: 6 }, () => p.next() as ListenProblem)
    }
    expect(play('reading-reef', 'g1-words-1').every((q) => q.activity?.kind === 'readAlong')).toBe(true)
    expect(play('reading-reef', 'g1-sentences-1').every((q) => q.activity?.kind === 'readAlong')).toBe(true)
    expect(play('reading-reef', 'g1-sight-1').every((q) => !q.activity && q.pictureOptions?.every((o) => o.picture.kind === 'word'))).toBe(true)
    expect(play('writing-workshop', 'g1-trace-1').every((q) => q.activity?.kind === 'trace')).toBe(true)
    expect(play('writing-workshop', 'g1-spell-1').every((q) => q.activity?.kind === 'tiles')).toBe(true)
    expect(play('writing-workshop', 'g1-sentence-1').every((q) => q.activity?.kind === 'tiles')).toBe(true)
  })
})

describe('1st grade (phase-2b contract): Tens Plateau, Fair Share Falls, Shape Grove', () => {
  const stars = (ids: string[]) => ({ stages: Object.fromEntries(ids.map((id) => [id, { stars: 1 }])) })
  const SETS = [
    {
      zoneId: 'place-value-plateau',
      title: 'Tens Plateau',
      k: 'Ten Frame Plateau',
      g24: 'Place Value Plateau',
      stages: [
        ['g1-tens-1', 'concept', 'Tens and ones', { kind: 'g1Tens', mode: 'tensOnes' }],
        ['g1-tens-2', 'practice', 'Bigger or smaller', { kind: 'g1Tens', mode: 'compare' }],
        ['g1-tens-3', 'mastery', 'Count to 120', { kind: 'g1Tens', mode: 'to120' }],
      ],
    },
    {
      zoneId: 'fraction-falls',
      title: 'Fair Share Falls',
      k: 'Add-and-Take Falls',
      g24: 'Fraction Falls',
      stages: [
        ['g1-shares-1', 'concept', 'Equal shares', { kind: 'g1Shares', mode: 'equal' }],
        ['g1-shares-2', 'practice', 'Halves and fourths', { kind: 'g1Shares', mode: 'halvesFourths' }],
        ['g1-shares-3', 'mastery', 'Smaller shares', { kind: 'g1Shares', mode: 'size' }],
      ],
    },
    {
      zoneId: 'geometry-grove',
      title: 'Shape Grove',
      k: 'Shape Grove',
      g24: 'Geometry Grove',
      stages: [
        ['g1-shapes-1', 'concept', 'Still a triangle?', { kind: 'g1Shapes', mode: 'attributes' }],
        ['g1-shapes-2', 'practice', 'Put shapes together', { kind: 'g1Shapes', mode: 'compose' }],
        ['g1-shapes-3', 'mastery', 'Roll or stack', { kind: 'g1Shapes', mode: 'solids' }],
      ],
    },
  ] as const

  it('their 1st-grade titles, stage ids, kinds and providers; kindergarten and 2nd–4th grade unchanged', () => {
    for (const z of SETS) {
      const zone = getZone(z.zoneId)!
      const set = zoneStages(zone, 1)
      expect(set.map((s) => [s.id, s.kind, s.title, s.providerConfig]), z.zoneId).toEqual(z.stages.map((s) => [...s]))
      expect(set.map((s) => s.id)).toEqual(G1_IDS[z.zoneId])
      expect(zoneTitle(zone, 1)).toBe(z.title)
      expect(zoneTitle(zone, 0)).toBe(z.k)
      expect(zoneTitle(zone, 3)).toBe(z.g24)
      expect(isZoneSleeping(zone, 1)).toBe(false)
      // kindergarten never sees 1st grade's stages
      for (const s of zoneStages(zone, 0)) expect(s.id, z.zoneId).toMatch(/^k-/)
      for (const s of set) expect(getStage(z.zoneId, s.id, 0), s.id).toBeUndefined()
    }
  })

  it('every stage is a spoken Listen & Play round of 5–6 with 3 stars, each unlocking the next', () => {
    for (const z of SETS) {
      const zone = getZone(z.zoneId)!
      const set = zoneStages(zone, 1)
      set.forEach((s, i) => {
        expect(s.gameId, s.id).toBe('listenPlay')
        expect(s.starsToEarn, s.id).toBe(3)
        expect(s.params?.questionCount, s.id).toBeGreaterThanOrEqual(5)
        expect(s.params?.questionCount, s.id).toBeLessThanOrEqual(6)
        expect(s.description.split(' ').length, s.id).toBeLessThanOrEqual(10)
        expect(s.description, s.id).toMatch(/[.!?]$/)
        expect(isStageUnlocked(zone, s.id, stars(set.slice(0, i).map((x) => x.id)), 1), s.id).toBe(true)
        if (i > 0) expect(isStageUnlocked(zone, s.id, stars(set.slice(0, i - 1).map((x) => x.id)), 1), s.id).toBe(false)
        // every question is said, and comes from the stage's own provider
        const p = createProvider(s.providerConfig)
        for (let k = 0; k < 6; k++) expect((p.next() as ListenProblem).speech, `${s.id} #${k}`).toBeDefined()
      })
    }
  })
})

describe('Grade 1 (phase-2b contract): Measure Marsh, Graph Delta, Sky Summit', () => {
  const zones = ['measurement-marsh', 'data-delta', 'science-summit']

  it('1st grade plays its own sets, in unlock order, with the contract’s titles; kindergarten keeps its own', () => {
    for (const id of zones) {
      const zone = getZone(id)!
      const set = zoneStages(zone, 1)
      expect(set.map((s) => s.id)).toEqual(G1_IDS[id])
      expect(set.map((s) => s.kind)).toEqual(['concept', 'practice', 'mastery'])
      // each unlocks after the one before it
      const stars = (xs: string[]) => ({ stages: Object.fromEntries(xs.map((x) => [x, { stars: 1 }])) })
      set.forEach((s, i) => expect(isStageUnlocked(zone, s.id, stars(G1_IDS[id].slice(0, i)), 1), s.id).toBe(true))
      expect(isStageUnlocked(zone, G1_IDS[id][2], stars([G1_IDS[id][0]]), 1)).toBe(false)
      // a 1st-grade stage is no stage at any other grade (and the K set is untouched)
      for (const g of [0, 2, 3, 4, 5] as const) for (const s of set) expect(getStage(id, s.id, g), `${s.id} at grade ${g}`).toBeUndefined()
      expect(zoneStages(zone, 0).every((s) => s.id.startsWith('k-'))).toBe(true)
      expect(isZoneSleeping(zone, 1)).toBe(false)
    }
    expect(zoneTitle(getZone('measurement-marsh')!, 1)).toBe('Measure Marsh')
    expect(zoneTitle(getZone('data-delta')!, 1)).toBe('Graph Delta')
    expect(zoneTitle(getZone('science-summit')!, 1)).toBe('Sky Summit')
    // kindergarten's names, unchanged
    expect(zones.map((z) => zoneTitle(getZone(z)!, 0))).toEqual(['Measure Marsh', 'Sorting Delta', 'Nature Summit'])
  })

  it('every 1st-grade stage is a voice-first round of 5–6 with 3 stars and a short spoken description', () => {
    const all = zones.flatMap((z) => zoneStages(getZone(z)!, 1))
    for (const s of all) {
      expect(s.gameId, s.id).toBe('listenPlay')
      expect(s.starsToEarn, s.id).toBe(3)
      expect(s.params?.questionCount, s.id).toBeGreaterThanOrEqual(5)
      expect(s.params?.questionCount, s.id).toBeLessThanOrEqual(6)
      expect(s.description.split(' ').length, s.id).toBeLessThanOrEqual(10)
      expect(s.description, s.id).toMatch(/[.!?]$/)
    }
    expect(all.map((s) => s.providerConfig)).toEqual([
      { kind: 'g1Measure', mode: 'order' },
      { kind: 'g1Measure', mode: 'units' },
      { kind: 'g1Measure', mode: 'time' },
      { kind: 'g1Graphs', mode: 'build' },
      { kind: 'g1Graphs', mode: 'read' },
      { kind: 'g1Graphs', mode: 'tally' },
      { kind: 'g1Science', mode: 'lightSound' },
      { kind: 'g1Science', mode: 'sky' },
      { kind: 'g1Science', mode: 'families' },
    ])
    // answered through their activities (Measure Marsh, Graph Delta) or picture cards (Sky Summit)
    const first = (z: string, i: number) => createProvider(zoneStages(getZone(z)!, 1)[i].providerConfig).next() as ListenProblem
    expect(first('measurement-marsh', 0).activity?.kind).toBe('lengthOrder')
    expect(first('measurement-marsh', 1).activity?.kind).toBe('units')
    expect(first('measurement-marsh', 2).activity?.kind).toBe('clockMatch')
    for (const i of [0, 1, 2]) expect(first('data-delta', i).activity?.kind).toBe('graph')
    for (const i of [0, 1, 2]) expect(first('science-summit', i).pictureOptions?.length).toBeGreaterThanOrEqual(2)
  })
})

// ── 1st grade (phase 2b): the real 1st-grade sets ──
describe('1st grade (phase-2b contract): Adding Mesa, Take-Away Dunes and Story Woods', () => {
  // (the top-level beforeEach puts Multiplication Mesa's sets aside: bring them back)
  beforeEach(() => {
    mesa.stagesByBand = MESA_BANDS
  })

  const OWN_IDS: Record<string, string[]> = {
    'multiplication-mesa': ['g1-add-1', 'g1-add-parade', 'g1-add-3'],
    'division-dunes': ['g1-sub-1', 'g1-sub-parade', 'g1-sub-3'],
    'word-problem-woods': ['g1-woods-1', 'g1-woods-2', 'g1-woods-3'],
  }
  const OWN_TITLES: Record<string, string> = {
    'multiplication-mesa': 'Adding Mesa',
    'division-dunes': 'Take-Away Dunes',
    // (keeps kindergarten's name)
    'word-problem-woods': 'Story Woods',
  }
  const stars = (ids: string[]) => ({ stages: Object.fromEntries(ids.map((id) => [id, { stars: 1 }])) })

  it('1st grade plays these zones’ own sets under their 1st-grade names; kindergarten and 2nd–5th grade are unchanged', () => {
    for (const [zoneId, ids] of Object.entries(OWN_IDS)) {
      const zone = getZone(zoneId)!
      expect(zoneStages(zone, 1).map((s) => s.id), zoneId).toEqual(ids)
      expect(zoneStages(zone, 1).map((s) => s.kind), zoneId).toEqual(['concept', 'practice', 'mastery'])
      expect(zoneTitle(zone, 1), zoneId).toBe(OWN_TITLES[zoneId])
      expect(isZoneSleeping(zone, 1)).toBe(false)
      // kindergarten keeps its own set and name; 2nd–5th grade keep theirs
      expect(zoneStages(zone, 0).every((s) => s.id.startsWith('k-')), zoneId).toBe(true)
      for (const g of [2, 3, 4, 5] as const) expect(zoneStages(zone, g)).toBe(zone.stages)
      for (const id of ids) {
        expect(getStage(zoneId, id, 1)?.id).toBe(id)
        expect(getStage(zoneId, id, 0)).toBeUndefined()
        expect(getStage(zoneId, id, 3)).toBeUndefined()
      }
      // each unlocks after the one before it
      ids.forEach((id, i) => {
        expect(isStageUnlocked(zone, id, stars(ids.slice(0, i)), 1), id).toBe(true)
        if (i > 0) expect(isStageUnlocked(zone, id, stars(ids.slice(0, i - 1)), 1), id).toBe(false)
      })
    }
    expect(zoneTitle(getZone('multiplication-mesa')!, 0)).toBe('Counting Mesa')
    expect(zoneTitle(getZone('word-problem-woods')!, 0)).toBe('Story Woods')
    expect(zoneTitle(getZone('division-dunes')!, 0)).toBe('Number Dunes')
    expect(zoneTitle(getZone('division-dunes')!, 3)).toBe('Division Dunes')
  })

  it('every stage is voice-first: a short spoken description, 5–6 number-sentence or story questions, or the parade with 1st-grade gates', () => {
    for (const [zoneId, ids] of Object.entries(OWN_IDS)) {
      for (const s of zoneStages(getZone(zoneId)!, 1)) {
        expect(ids).toContain(s.id)
        expect(s.starsToEarn, s.id).toBe(3)
        expect(s.description.split(' ').length, s.id).toBeLessThanOrEqual(10)
        expect(s.description, s.id).toMatch(/[.!?]$/)
        if (s.id.endsWith('-parade')) {
          expect(s.gameId, s.id).toBe('critterParade')
          expect(s.params?.ops, s.id).toBe(zoneId === 'division-dunes' ? 'sub' : 'add')
          continue
        }
        expect(s.gameId, s.id).toBe('listenPlay')
        expect(s.params?.questionCount, s.id).toBeGreaterThanOrEqual(5)
        expect(s.params?.questionCount, s.id).toBeLessThanOrEqual(6)
        const p = createProvider(s.providerConfig)
        for (let i = 0; i < 6; i++) {
          const q = p.next() as ListenProblem
          expect(q.activity?.kind, `${s.id} #${i}`).toBe(zoneId === 'word-problem-woods' ? 'mathStory' : 'numberSentence')
        }
      }
    }
    expect(Object.values(OWN_IDS).flat().map((id) => getStage(Object.keys(OWN_IDS).find((z) => OWN_IDS[z].includes(id))!, id, 1)!.providerConfig.kind)).toEqual([
      ...['g1Adding', 'g1Adding', 'g1Adding'],
      ...['g1Subtract', 'g1Subtract', 'g1Subtract'],
      ...['g1StoryMath', 'g1StoryMath', 'g1StoryMath'],
    ])
  })

  it('a pet grows from its 1st-grade stars too', () => {
    const lion = petById('lion')!
    const g1Only = { 'multiplication-mesa': progressOf({ 'g1-add-1': 3, 'g1-add-parade': 3, 'g1-add-3': 3 }) }
    expect(petStatus(lion, g1Only, {}, 1).stage).toBe('adult')
    expect(petStatus(lion, g1Only, {}, 0).stage).toBe('adult')
  })
})

describe('Grade 5 (phase-3 contract): Reading Reef, Writing Workshop, Science Summit', () => {
  const zones = ['reading-reef', 'writing-workshop', 'science-summit']

  it('5th grade plays its own set in the contract’s order; the zones keep their names; every other grade is unchanged', () => {
    for (const id of zones) {
      const zone = getZone(id)!
      const set = zoneStages(zone, 5)
      expect(set.map((s) => s.id)).toEqual(G5_IDS[id])
      expect(zoneTitle(zone, 5)).toBe(zone.title)
      for (const g of [2, 3, 4] as const) expect(zoneStages(zone, g)).toBe(zone.stages)
      for (const g of [0, 1, 2, 3, 4] as const) for (const s of set) expect(getStage(id, s.id, g), `${s.id} at grade ${g}`).toBeUndefined()
      // each unlocks after the one before it
      const stars = (xs: string[]) => ({ stages: Object.fromEntries(xs.map((x) => [x, { stars: 1 }])) })
      set.forEach((s, i) => expect(isStageUnlocked(zone, s.id, stars(G5_IDS[id].slice(0, i)), 5), s.id).toBe(true))
      expect(isStageUnlocked(zone, G5_IDS[id][2], stars([G5_IDS[id][0]]), 5)).toBe(false)
      for (const s of set) {
        expect(s.starsToEarn).toBe(3)
        expect(s.providerConfig.kind.startsWith('g5'), s.id).toBe(true)
      }
    }
  })

  it('mirrors the 2–4 shapes: concept, practice, a mastery boss (the pad for writing), Cloud Keeper’s spheres tier', () => {
    const shape = (id: string) => zoneStages(getZone(id)!, 5).map((s) => [s.kind, s.gameId])
    expect(shape('reading-reef')).toEqual([['concept', 'conceptPlay'], ['practice', 'conceptPlay'], ['mastery', 'bossBattle']])
    expect(shape('writing-workshop')).toEqual([['concept', 'writingPad'], ['practice', 'writingPad'], ['mastery', 'writingPad']])
    expect(shape('science-summit')).toEqual([['concept', 'conceptPlay'], ['practice', 'cloudKeeper'], ['practice', 'conceptPlay'], ['mastery', 'bossBattle']])
    const cycle = zoneStages(getZone('science-summit')!, 5)[1]
    expect(cycle.providerConfig).toEqual({ kind: 'g5Spheres' })
    expect(cycle.params).toMatchObject({ mode: 'spheres' })
  })
})

describe('Grade 5 (phase-3 contract): Measurement Marsh, Geometry Grove, Data Delta', () => {
  const zones = ['measurement-marsh', 'geometry-grove', 'data-delta']

  it('5th grade plays its own sets, in unlock order: concept, practice, then a boss; every other grade keeps its own', () => {
    for (const id of zones) {
      const zone = getZone(id)!
      const set = zoneStages(zone, 5)
      expect(set.map((s) => s.id)).toEqual(G5_IDS[id])
      expect(set.map((s) => s.kind)).toEqual(['concept', 'practice', 'mastery'])
      expect(set[2].gameId).toBe('bossBattle')
      const stars = (xs: string[]) => ({ stages: Object.fromEntries(xs.map((x) => [x, { stars: 1 }])) })
      set.forEach((s, i) => expect(isStageUnlocked(zone, s.id, stars(G5_IDS[id].slice(0, i)), 5), s.id).toBe(true))
      expect(isStageUnlocked(zone, G5_IDS[id][2], stars([G5_IDS[id][0]]), 5)).toBe(false)
      // a 5th-grade stage is no stage at any other grade, and 2nd–4th grade still play today's
      for (const g of [0, 1, 2, 3, 4] as const) for (const s of set) expect(getStage(id, s.id, g), `${s.id} at grade ${g}`).toBeUndefined()
      for (const g of [2, 3, 4] as const) expect(zoneStages(zone, g)).toBe(zone.stages)
      // the zone keeps its name
      expect(zoneTitle(zone, 5)).toBe(zone.title)
    }
  })

  it('every stage is a 2nd–4th grade game with 3 stars, fed by 5th grade’s own provider kinds (no grade tier rewrites them)', () => {
    const all = zones.flatMap((z) => zoneStages(getZone(z)!, 5))
    expect(all.map((s) => s.gameId)).toEqual(['conceptPlay', 'speedRun', 'bossBattle', 'conceptPlay', 'conceptPlay', 'bossBattle', 'conceptPlay', 'conceptPlay', 'bossBattle'])
    expect(all.map((s) => s.providerConfig)).toEqual([
      { kind: 'g5Measure', mode: 'volume' },
      { kind: 'g5Measure', mode: 'convert' },
      { kind: 'g5Measure', mode: 'mixed' },
      { kind: 'g5Geometry', mode: 'coordinates' },
      { kind: 'g5Geometry', mode: 'classify' },
      { kind: 'g5Geometry', mode: 'mixed' },
      { kind: 'g5Data', mode: 'linePlot' },
      { kind: 'g5Data', mode: 'patterns' },
      { kind: 'g5Data', mode: 'mixed' },
    ])
    for (const s of all) {
      expect(s.starsToEarn, s.id).toBe(3)
      expect(s.title.length, s.id).toBeLessThanOrEqual(20)
      expect(s.description, s.id).toMatch(/[.!?]$/)
      const p = createProvider(s.providerConfig).next() as { options: unknown[] }
      expect(p.options.length, s.id).toBeGreaterThanOrEqual(3)
    }
  })
})

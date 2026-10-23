import { describe, it, expect } from 'vitest'
import { curriculum, zoneStages } from '../../curriculum'
import type { Zone } from '../../curriculum/types'
import type { GradeLevel } from '../gradeTiers'
import { isZoneSleeping } from '../listenNav'
import { chooseQuest, questStillValid } from '../quest'
import { recordFactAnswer, type FactStats } from '../adaptive'

type Zones = Record<string, { stages: Record<string, { stars: number; attempts?: number }> }>

const NOW = Date.UTC(2026, 9, 23, 12)
const openZones = (grade: GradeLevel) => curriculum.zones.filter((z) => z.available && !isZoneSleeping(z, grade))
const stagesOf = (zone: Zone, grade: GradeLevel) => zoneStages(zone, grade)

/** Every stage of every open place at `stars` (1 attempt each). */
function everything(grade: GradeLevel, stars: number): Zones {
  return Object.fromEntries(
    openZones(grade).map((z) => [z.id, { stages: Object.fromEntries(stagesOf(z, grade).map((s) => [s.id, { stars, attempts: 1 }])) }]),
  )
}

// One grade from each band: kindergarten, 1st, 2nd–4th, 5th.
const BANDS: [string, GradeLevel][] = [
  ['kindergarten', 0],
  ['1st grade', 1],
  ['3rd grade', 3],
  ['5th grade', 5],
]

describe.each(BANDS)('quest choice — %s', (_name, grade) => {
  const [first] = openZones(grade)

  it('a new child gets a first quest: the first stage of the first open place', () => {
    expect(chooseQuest({ zones: {}, grade, now: NOW })).toEqual({
      zoneId: first.id,
      stageId: stagesOf(first, grade)[0].id,
      reason: 'first',
    })
  })

  it('stars from another grade band still leave this band a first quest', () => {
    const other: GradeLevel = grade === 3 ? 0 : 3
    expect(chooseQuest({ zones: everything(other, 3), grade, now: NOW })?.reason).toBe('first')
  })

  it('a returning child goes on to the next uncleared stage', () => {
    const [s1, s2] = stagesOf(first, grade)
    const zones: Zones = { [first.id]: { stages: { [s1.id]: { stars: 3, attempts: 1 } } } }
    expect(chooseQuest({ zones, grade, now: NOW })).toEqual({ zoneId: first.id, stageId: s2.id, reason: 'nextStage' })
  })

  it('a stage tried without a star comes first: close to its first star', () => {
    const [s1] = stagesOf(first, grade)
    const second = openZones(grade)[1]
    const zones: Zones = {
      [second.id]: { stages: { [stagesOf(second, grade)[0].id]: { stars: 3, attempts: 1 } } },
      [first.id]: { stages: { [s1.id]: { stars: 0, attempts: 2 } } },
    }
    expect(chooseQuest({ zones, grade, now: NOW })).toEqual({ zoneId: first.id, stageId: s1.id, reason: 'almostStar' })
  })

  it('once every stage is cleared, it goes back for missing stars', () => {
    const zones = everything(grade, 3)
    const last = openZones(grade).at(-1)!
    const lastStage = stagesOf(last, grade).at(-1)!
    zones[last.id].stages[lastStage.id] = { stars: 1, attempts: 1 }
    expect(chooseQuest({ zones, grade, now: NOW })).toEqual({ zoneId: last.id, stageId: lastStage.id, reason: 'moreStars' })
  })

  it('all done: no quest (free play)', () => {
    expect(chooseQuest({ zones: everything(grade, 3), grade, now: NOW })).toBeNull()
  })

  it('the pick is a stage of this grade (stays valid until the grade changes)', () => {
    const pick = chooseQuest({ zones: {}, grade, now: NOW })!
    expect(questStillValid(pick, grade)).toBe(true)
    expect(questStillValid({ zoneId: first.id, stageId: 'no-such-stage' }, grade)).toBe(false)
  })
})

describe('quest choice — missed facts (2nd–4th grade)', () => {
  const grade: GradeLevel = 3
  // the first place with a stage that asks multiplication facts
  const multZone = openZones(grade).find((z) => stagesOf(z, grade).some((s) => s.providerConfig.kind === 'multiplication'))!
  const multStage = stagesOf(multZone, grade).find((s) => s.providerConfig.kind === 'multiplication')!
  const missed = (factId: string): FactStats => recordFactAnswer({}, factId, false, NOW - 60_000)

  it('a played stage that asks the fact the child keeps missing becomes today’s quest', () => {
    const zones = everything(grade, 3)
    expect(chooseQuest({ zones, factStats: missed('mult:3x4'), grade, now: NOW })).toEqual({
      zoneId: multZone.id,
      stageId: multStage.id,
      reason: 'missedFacts',
    })
  })

  it('only stages the child has played count (an unplayed one is still the next stage)', () => {
    const quest = chooseQuest({ zones: { [multZone.id]: { stages: {} } }, factStats: missed('mult:3x4'), grade, now: NOW })
    expect(quest?.reason).not.toBe('missedFacts')
  })

  it('a fact the child has since got right twice in a row no longer counts', () => {
    let stats = missed('mult:3x4')
    stats = recordFactAnswer(stats, 'mult:3x4', true, NOW - 30_000)
    stats = recordFactAnswer(stats, 'mult:3x4', true, NOW - 20_000)
    expect(chooseQuest({ zones: everything(grade, 3), factStats: stats, grade, now: NOW })).toBeNull()
  })

  it('a fact no played stage can ask is skipped', () => {
    expect(chooseQuest({ zones: everything(grade, 3), factStats: missed('mult:99x99'), grade, now: NOW })).toBeNull()
  })
})

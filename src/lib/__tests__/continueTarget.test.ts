import { describe, it, expect } from 'vitest'
import { curriculum, zoneStages } from '../../curriculum'
import { findNextTarget } from '../continueTarget'

type Zones = Record<string, { stages: Record<string, { stars: number }> }>

/** Every stage of a zone's 2–4 set at `stars`. */
const all = (zoneId: string, stars: number) => ({
  stages: Object.fromEntries(zoneStages(curriculum.zones.find((z) => z.id === zoneId)!, 3).map((s) => [s.id, { stars }])),
})

const [first, second] = curriculum.zones
const stagesOf = (zoneId: string) => zoneStages(curriculum.zones.find((z) => z.id === zoneId)!, 3)

describe('"Continue your quest" target', () => {
  it('starts at the first stage of the first place', () => {
    expect(findNextTarget({}, 3)).toEqual({ zoneId: first.id, stageId: stagesOf(first.id)[0].id })
  })

  it('a place whose stages are all cleared (1 star each) is finished: it goes on to the next place', () => {
    // the 3rd-grade playtest: Multiplication Mesa 5/9 with every stage cleared still said "Continue" there
    const zones: Zones = { [first.id]: all(first.id, 1) }
    expect(findNextTarget(zones, 3)).toEqual({ zoneId: second.id, stageId: stagesOf(second.id)[0].id })
  })

  it('goes to the first uncleared stage, even in a later place, before going back for missing stars', () => {
    const zones: Zones = { [first.id]: all(first.id, 3), [second.id]: all(second.id, 1) }
    const third = curriculum.zones[2]
    expect(findNextTarget(zones, 3)).toEqual({ zoneId: third.id, stageId: stagesOf(third.id)[0].id })
  })

  it('once every stage is cleared, it goes back for the first stage short of its stars; null when all are full', () => {
    const zones: Zones = Object.fromEntries(curriculum.zones.map((z) => [z.id, all(z.id, 3)]))
    expect(findNextTarget(zones, 3)).toBeNull()
    zones[second.id] = all(second.id, 1)
    expect(findNextTarget(zones, 3)).toEqual({ zoneId: second.id, stageId: stagesOf(second.id)[0].id })
  })
})

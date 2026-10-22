import { describe, expect, it } from 'vitest'
import { curriculum, zoneStages, zoneTitle } from '../../curriculum'
import { hasK1Set, isZoneSleeping, stagePicture, stageVoice, zoneNameVoice, zoneWelcomeVoice } from '../listenNav'
import { voiceText } from '../../voice/registry'
import { PETS } from '../pets/catalog'
import { k1Lessons } from '../../tutoring/lessons'
import { SKILLS } from '../../tutoring/skills'

/**
 * Every zone open to a K child (one with a `k1` stage set) can be found and
 * played without reading: its name and welcome are said, each stage button
 * has a picture of its own and says its title, its pet hatches from its K
 * lesson, and that lesson practises the zone's first K stage.
 */
const open = curriculum.zones.filter(hasK1Set)

describe('every open K zone', () => {
  it('includes Measure Marsh and Sorting Delta (phase 2a), awake for K and grade 1', () => {
    expect(open.map((z) => z.id)).toEqual(expect.arrayContaining(['measurement-marsh', 'data-delta']))
    for (const id of ['measurement-marsh', 'data-delta']) {
      const z = curriculum.zones.find((x) => x.id === id)!
      expect(isZoneSleeping(z, 0)).toBe(false)
      expect(isZoneSleeping(z, 1)).toBe(false)
    }
    expect(zoneTitle(curriculum.zones.find((x) => x.id === 'measurement-marsh')!, 0)).toBe('Measure Marsh')
    expect(zoneTitle(curriculum.zones.find((x) => x.id === 'data-delta')!, 0)).toBe('Sorting Delta')
  })

  it.each(open.map((z) => [z.id, z] as const))('%s: its name and welcome are said (k-nav)', (_id, zone) => {
    const title = zoneTitle(zone, 0)
    expect(voiceText(zoneNameVoice(zone.id)!)).toBe(`${title}!`)
    expect(voiceText(zoneWelcomeVoice(zone.id))).toBe(`${title}! Tap a star to play!`)
  })

  it.each(open.map((z) => [z.id, z] as const))('%s: each stage button has its own picture and says its title', (_id, zone) => {
    const set = zoneStages(zone, 0)
    const pics = set.map((s) => stagePicture(s))
    for (const [i, p] of pics.entries()) expect(p, set[i].id).not.toMatch(/^[💡⚡🏆⭐]$/u)
    expect(new Set(pics).size).toBe(pics.length)
    // the title said with a lift: "Count with me!" (a title that is already a question keeps its "?")
    for (const s of set) expect(voiceText(stageVoice(s.id)!), s.id).toBe(/[?!]$/.test(s.title) ? s.title : `${s.title}!`)
  })

  it.each(open.map((z) => [z.id, z] as const))('%s: its K lesson hatches its pet and practises its first K stage', (_id, zone) => {
    const lessons = k1Lessons.filter((l) => l.zoneId === zone.id)
    expect(lessons.length, zone.id).toBeGreaterThanOrEqual(1)
    const pet = PETS.find((p) => p.zoneId === zone.id)!
    for (const l of lessons) {
      expect(pet.lessonIds, `${pet.creatureId} hatches from ${l.id}`).toContain(l.id)
      expect(zoneStages(zone, 0).map((s) => s.id)).toContain(l.practiceStageId)
    }
  })

  it('Measure Marsh and Sorting Delta: their lessons and pets (the bear, the fox)', () => {
    const lesson = (id: string) => k1Lessons.find((l) => l.id === id)!
    expect(lesson('kMeasure')).toMatchObject({ band: 'k1', zoneId: 'measurement-marsh', practiceStageId: 'k-measure-1' })
    expect(lesson('kSorting')).toMatchObject({ band: 'k1', zoneId: 'data-delta', practiceStageId: 'k-sort-1' })
    expect(PETS.find((p) => p.creatureId === 'bear')!.lessonIds).toContain('kMeasure')
    expect(PETS.find((p) => p.creatureId === 'fox')!.lessonIds).toContain('kSorting')
    for (const l of [lesson('kMeasure'), lesson('kSorting')]) for (const sk of l.skillIds) expect(SKILLS[sk], sk).toMatchObject({ zoneId: l.zoneId, lessonId: l.id })
    // the method is part of the lesson: line them up at the start
    expect(lesson('kMeasure').steps.map((s) => s.narration).join(' ')).toMatch(/line them up at the start/i)
    // two picture-card "your turn" checks each
    for (const id of ['kMeasure', 'kSorting']) expect(lesson(id).steps.filter((s) => s.check?.pictures?.length)).toHaveLength(2)
  })
})

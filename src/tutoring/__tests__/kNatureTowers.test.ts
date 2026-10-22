import { describe, expect, it } from 'vitest'
import { getLesson, lessonsFor, zoneLessonFor } from '../lessons'
import { practiceHref } from '../lessonLinks'
import { SKILLS } from '../skills'
import { DRAWINGS } from '../../games/listenPlay/drawings'
import { getZone, zoneStages } from '../../curriculum'
import { stagePicture, stageVoice, zoneNameVoice, zoneWelcomeVoice } from '../../lib/listenNav'
import { petById } from '../../lib/pets/catalog'
import { petStatus } from '../../lib/pets/growth'
import { voiceText } from '../../voice/registry'

/**
 * Nature Summit and Counting Towers (phase-2a contract): their K voice
 * lessons, the pets they hatch, their skills, and what the voice says on the
 * map and the zone page.
 */

describe('kScience (Nature Summit)', () => {
  const lesson = getLesson('kScience')!

  it('is a Nature Summit K lesson of four steps, practised in What to wear', () => {
    expect(lesson).toMatchObject({ band: 'k1', zoneId: 'science-summit', practiceStageId: 'k-science-1' })
    expect(lesson.steps.map((s) => s.id)).toEqual(['weather', 'rain', 'needs', 'push'])
    expect(practiceHref(lesson, undefined, 0)).toBe('/play/science-summit/k-science-1')
    expect(zoneLessonFor('science-summit', 0)).toBe(lesson)
    expect(lessonsFor(3).map((l) => l.id)).not.toContain('kScience')
  })

  it('teaches the weather, what living things need, and push and pull', () => {
    const told = lesson.steps.map((s) => s.narration).join(' ')
    for (const w of ['sunny', 'rainy', 'snowy', 'windy', 'sun and water', 'food, water and a home', 'push moves it away', 'pull brings it close']) expect(told).toContain(w)
  })

  it('two picture-card checks: what to take in the rain, and the push and pull icon pair', () => {
    const checks = lesson.steps.filter((s) => s.check).map((s) => s.check!)
    expect(checks).toHaveLength(2)
    const [rain, push] = checks
    expect(rain.answer).toBe('umbrella')
    expect(push.answer).toBe('push')
    expect(push.pictures!.map((p) => p.picture)).toEqual([
      { kind: 'art', name: 'pushIcon' },
      { kind: 'art', name: 'pullIcon' },
    ])
    for (const c of checks)
      for (const p of c.pictures!) {
        expect(p.picture.kind).toBe('art')
        expect(DRAWINGS[(p.picture as { name: string }).name]).toBeDefined()
        expect(voiceText(p.speech!)).toMatch(/!$/)
      }
  })

  it('hatches the tiger', () => {
    expect(petById('tiger')!.lessonIds).toContain('kScience')
    expect(petStatus(petById('tiger')!, {}, { kScience: 1 }, 0).stage).toBe('baby')
  })
})

describe('kTowers (Counting Towers)', () => {
  const lesson = getLesson('kTowers')!

  it('is a Counting Towers K lesson of four steps on how to play, practised in How many?', () => {
    expect(lesson).toMatchObject({ band: 'k1', zoneId: 'tower-battlefront', practiceStageId: 'k-towers-1' })
    expect(lesson.steps).toHaveLength(4)
    expect(practiceHref(lesson, undefined, 0)).toBe('/play/tower-battlefront/k-towers-1')
    const told = lesson.steps.map((s) => s.narration).join(' ')
    for (const w of ['Tap a spot', 'Answer the question', 'tower', 'stop the critters', 'stronger']) expect(told).toContain(w)
    // friendly: nothing about fighting
    expect(told).not.toMatch(/\b(kill|shoot|fight|attack|weapon|destroy)/i)
  })

  it('two checks that are the game’s own questions: how many critters, which group has more', () => {
    const checks = lesson.steps.filter((s) => s.check).map((s) => s.check!)
    expect(checks.map((c) => voiceText(c.speech!))).toEqual(['How many critters? Tap the number.', 'Which group has more?'])
    expect(checks.map((c) => c.answer)).toEqual([4, 5])
  })

  it('hatches the dragon (its first lesson)', () => {
    expect(petById('dragon')!.lessonIds).toEqual(['kTowers'])
    expect(petStatus(petById('dragon')!, {}, { kTowers: 1 }, 0).stage).toBe('baby')
  })
})

describe('the skills and the voice on the map and the zone page', () => {
  it('every K stage’s skill is registered, practised in the zone’s own stages', () => {
    for (const [zoneId, ids] of [
      ['science-summit', ['k-science-weather', 'k-science-needs', 'k-science-push']],
      ['tower-battlefront', ['k-towers-count', 'k-towers-compare']],
    ] as const) {
      const stages = zoneStages(getZone(zoneId)!, 0).map((s) => s.id)
      for (const id of ids) {
        expect(SKILLS[id], id).toMatchObject({ zoneId })
        expect(stages).toContain(SKILLS[id].practiceStageId)
      }
    }
  })

  it('each zone says its K name and welcome; each stage its title; each stage has its own picture', () => {
    expect(voiceText(zoneNameVoice('science-summit')!)).toBe('Nature Summit!')
    expect(voiceText(zoneWelcomeVoice('science-summit'))).toBe('Nature Summit! Tap a star to play!')
    expect(voiceText(zoneNameVoice('tower-battlefront')!)).toBe('Counting Towers!')
    expect(voiceText(zoneWelcomeVoice('tower-battlefront'))).toBe('Counting Towers! Tap a star to play!')
    for (const zoneId of ['science-summit', 'tower-battlefront']) {
      const set = zoneStages(getZone(zoneId)!, 0)
      const pics = set.map((s) => stagePicture(s))
      expect(new Set(pics).size).toBe(3)
      for (const [i, p] of pics.entries()) expect(p, set[i].id).not.toMatch(/^[💡⚡🏆⭐]$/u)
      for (const s of set) expect(voiceText(stageVoice(s.id)!)).toBe(`${s.title}${s.title.endsWith('?') ? '' : '!'}`)
    }
  })
})

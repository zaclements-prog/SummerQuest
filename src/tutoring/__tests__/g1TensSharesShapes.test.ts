import { describe, it, expect } from 'vitest'
import { g1Lessons, getLesson, lessonsFor } from '../lessons'
import { sceneFor } from '../motion/scenes'
import { phraseIndex } from '../motion/cues'
import { SKILLS } from '../skills'
import { voiceText } from '../../voice/registry'
import { getZone, zoneStages } from '../../curriculum'
import { DRAWINGS } from '../../games/listenPlay/drawings'
import { petById } from '../../lib/pets/catalog'
import { isWord } from '../../test/textBudget'
import { askSteps, checkCards, lessonCard } from '../ui/listenScript'
import narration from '../narration.json'

/**
 * The 1st-grade voice lessons of Tens Plateau, Fair Share Falls and Shape
 * Grove (K–5 plan, phase-2b contract): `g1Tens`, `g1Shares`, `g1Shapes`, in
 * the kindergarten lessons' style but a step up — about four steps told over
 * motion scenes, nothing to read, two picture-card "your turn" checks; each
 * practised in its zone's first 1st-grade stage, and each hatching the zone's
 * pet.
 */

const CONTRACT = {
  g1Tens: { zoneId: 'place-value-plateau', practiceStageId: 'g1-tens-1', pet: 'unicorn' },
  g1Shares: { zoneId: 'fraction-falls', practiceStageId: 'g1-shares-1', pet: 'frog' },
  g1Shapes: { zoneId: 'geometry-grove', practiceStageId: 'g1-shapes-1', pet: 'panda' },
} as const

const lessons = Object.keys(CONTRACT).map((id) => getLesson(id)!)
const words = (s: string) => s.split(/\s+/).filter(Boolean)

describe('the 1st-grade lessons of Tens Plateau, Fair Share Falls and Shape Grove', () => {
  it('are band g1, in g1Lessons, for their zones, practised in the zone’s first 1st-grade stage', () => {
    for (const l of lessons) {
      const c = CONTRACT[l.id as keyof typeof CONTRACT]
      expect(l.band, l.id).toBe('g1')
      expect(g1Lessons).toContain(l)
      expect({ zoneId: l.zoneId, practiceStageId: l.practiceStageId }).toEqual({ zoneId: c.zoneId, practiceStageId: c.practiceStageId })
      expect(zoneStages(getZone(c.zoneId)!, 1)[0].id).toBe(l.practiceStageId)
      expect(lessonsFor(1)).toContain(l)
      expect(lessonsFor(0)).not.toContain(l)
      // its skills are registered, and point back at it
      for (const s of l.skillIds) expect(SKILLS[s], `${l.id}: ${s}`).toMatchObject({ zoneId: c.zoneId, lessonId: l.id })
      // the zone's pet hatches from it
      expect(petById(c.pet)!.lessonIds).toContain(l.id)
    }
  })

  it('have 4–5 short steps, each with a scene and stable ids, told for 1st graders: numbers as words, short sentences', () => {
    for (const l of lessons) {
      expect(l.steps.length, l.id).toBeGreaterThanOrEqual(4)
      expect(l.steps.length, l.id).toBeLessThanOrEqual(5)
      expect(new Set(l.steps.map((s) => s.id)).size).toBe(l.steps.length)
      for (const s of l.steps) {
        const key = `${l.id}/${s.id}`
        expect(s.id, key).toMatch(/^[a-z][A-Za-z0-9]*$/)
        expect(sceneFor(l.id, s.id), `${key} has no scene`).toBeDefined()
        expect(s.narration, key).not.toMatch(/\d/)
        expect(words(s.narration).length, key).toBeLessThanOrEqual(30)
        for (const sentence of s.narration.split(/[.!?:]+/).filter((x) => x.trim())) expect(words(sentence).length, `${key}: "${sentence.trim()}"`).toBeLessThanOrEqual(13)
        expect(s.body, key).toBeUndefined()
        // its clip is in the narration dump (npm run tts:dump)
        expect((narration as Record<string, { stepId: string; text: string }[]>)[l.id]?.find((x) => x.stepId === s.id)?.text, key).toBe(s.narration)
      }
    }
  })

  it('teach what the contract names', () => {
    const told = (id: string) => getLesson(id)!.steps.map((s) => s.narration).join(' ')
    expect(told('g1Tens')).toMatch(/one rod is a ten/i)
    expect(told('g1Tens')).toMatch(/tens and six ones/i)
    expect(told('g1Tens')).toMatch(/tens first/i)
    expect(told('g1Tens')).toMatch(/greater than/i)
    expect(told('g1Shares')).toMatch(/equal shares/i)
    expect(told('g1Shares')).toMatch(/halves/i)
    expect(told('g1Shares')).toMatch(/fourths, or quarters/i)
    expect(told('g1Shares')).toMatch(/more shares make smaller shares/i)
    expect(told('g1Shapes')).toMatch(/three straight sides and three corners/i)
    expect(told('g1Shapes')).toMatch(/still a triangle/i)
    expect(told('g1Shapes')).toMatch(/two triangles/i)
    expect(told('g1Shapes')).toMatch(/roll and stack/i)
  })
})

describe('their "your turn" checks', () => {
  const checks = lessons.flatMap((l) => l.steps.filter((s) => s.check).map((s) => ({ l, s, check: s.check! })))

  it('two per lesson, answered with pictures: one per option, each said as it is tapped, nothing to read but symbols', () => {
    for (const l of lessons) expect(checks.filter((c) => c.l === l), l.id).toHaveLength(2)
    for (const { l, s, check } of checks) {
      const key = `${l.id}/${s.id}`
      expect(check.pictures!.map((p) => p.value), key).toEqual(check.options)
      expect(new Set(check.options).size, key).toBe(check.options.length)
      expect(check.options, key).toContain(check.answer)
      expect(check.options.length, key).toBeGreaterThanOrEqual(2)
      expect(check.options.length, key).toBeLessThanOrEqual(3)
      for (const p of check.pictures!) {
        if (p.picture.kind === 'word') expect(isWord(p.picture.text), `${key}: "${p.picture.text}" is a word to read`).toBe(false)
        if (p.picture.kind === 'art') expect(DRAWINGS[p.picture.name], p.picture.name).toBeDefined()
        expect(p.speech, `${key}: card ${String(p.value)} is never said`).toBeDefined()
        expect(() => voiceText(p.speech!), key).not.toThrow()
      }
      expect(checkCards(check)).toBe(check.pictures)
    }
  })

  it('are asked aloud with the zones’ own recorded lines, the guide sweeping the cards (never the answer alone)', () => {
    for (const { l, s, check } of checks) {
      const key = `${l.id}/${s.id}`
      expect(voiceText(check.speech!), key).toBe(check.question)
      expect(JSON.stringify(check.speech), key).toMatch(/g1-(tens|shares|shapes)\//)
      const open = check.options.map((_, i) => i)
      const steps = askSteps(check, check.pictures!, open)
      expect(steps[0].voice).toEqual(check.speech)
      const sweep = steps[steps.length - 1]
      expect(sweep.target, key).toEqual(open.map(lessonCard))
      expect(sweep.hand, key).toBe('sweep')
      for (const st of steps) if (typeof st.cue === 'string') expect(phraseIndex(check.question, st.cue), `${key}: "${st.cue}"`).toBeGreaterThanOrEqual(0)
    }
  })
})

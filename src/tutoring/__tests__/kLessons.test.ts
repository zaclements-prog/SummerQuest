import { describe, it, expect } from 'vitest'
import { k1Lessons } from '../lessons'
import { sceneFor } from '../motion/scenes'
import { phraseIndex } from '../motion/cues'
import { VOICE_PACKS, voiceText } from '../../voice/registry'
import { seededShuffle } from '../../lib/random'
import { LESSON_STAGE, askSteps, checkCards, lessonCard } from '../ui/listenScript'

/** The kindergarten pilot contract (docs/superpowers/specs/2026-10-19-k5-expansion-plan.md). */
const CONTRACT = {
  kCounting: { zoneId: 'multiplication-mesa', practiceStageId: 'k-count-1' },
  kShapes: { zoneId: 'geometry-grove', practiceStageId: 'k-shapes-1' },
  kLetters: { zoneId: 'reading-reef', practiceStageId: 'k-letters-1' },
}

const checks = k1Lessons.flatMap((l) => l.steps.filter((s) => s.check).map((s) => ({ lesson: l, step: s, check: s.check! })))
const words = (s: string) => s.split(/\s+/).filter(Boolean)

describe('the kindergarten lessons', () => {
  it('are the pilot’s fixed lessons, zones and practice stages', () => {
    expect(Object.fromEntries(k1Lessons.map((l) => [l.id, { zoneId: l.zoneId, practiceStageId: l.practiceStageId }]))).toEqual(CONTRACT)
    for (const l of k1Lessons) expect(l.band).toBe('k1')
  })

  it('have 3–5 short steps, each with a scene and stable unique ids, and at least one "your turn"', () => {
    for (const l of k1Lessons) {
      expect(l.steps.length, l.id).toBeGreaterThanOrEqual(3)
      expect(l.steps.length, l.id).toBeLessThanOrEqual(5)
      expect(new Set(l.steps.map((s) => s.id)).size).toBe(l.steps.length)
      for (const s of l.steps) {
        expect(s.id, `${l.id}/${s.id}`).toMatch(/^[a-z][A-Za-z0-9]*$/)
        expect(sceneFor(l.id, s.id), `${l.id}/${s.id} has no scene`).toBeDefined()
      }
      expect(l.steps.some((s) => s.check), `${l.id} has no check`).toBe(true)
    }
  })

  it('are told for five-year-olds: short sentences, numbers as words, no on-screen body text', () => {
    for (const l of k1Lessons)
      for (const s of l.steps) {
        const key = `${l.id}/${s.id}`
        expect(s.narration, key).not.toMatch(/\d/)
        expect(words(s.narration).length, key).toBeLessThanOrEqual(22)
        for (const sentence of s.narration.split(/[.!?]+/).filter((x) => x.trim())) expect(words(sentence).length, `${key}: "${sentence.trim()}"`).toBeLessThanOrEqual(9)
        expect(s.body, key).toBeUndefined()
      }
  })
})

describe('the kindergarten checks', () => {
  it('are answered with pictures: one card per option, a valid answer, each card named aloud', () => {
    expect(checks.length).toBeGreaterThanOrEqual(3)
    for (const { lesson, step, check } of checks) {
      const key = `${lesson.id}/${step.id}`
      expect(check.pictures, key).toBeDefined()
      expect(check.pictures!.map((p) => p.value), key).toEqual(check.options)
      expect(new Set(check.options).size, key).toBe(check.options.length)
      expect(check.options, key).toContain(check.answer)
      expect(check.options.length, key).toBeGreaterThanOrEqual(2)
      expect(check.options.length, key).toBeLessThanOrEqual(3)
      for (const p of check.pictures!) {
        expect(p.picture.kind, key).not.toBe('word') // K reads no words
        expect(p.speech, `${key}: card ${String(p.value)} is never said`).toBeDefined()
        expect(() => voiceText(p.speech!), key).not.toThrow()
      }
      expect(checkCards(check)).toBe(check.pictures)
    }
  })

  it('are asked aloud: the question is exactly its voice line', () => {
    for (const { lesson, step, check } of checks) {
      expect(check.speech, `${lesson.id}/${step.id}`).toBeDefined()
      expect(voiceText(check.speech!)).toBe(check.question)
    }
    // the k-lessons pack carries the questions that aren't k-math lines
    const pack = VOICE_PACKS['k-lessons']
    expect(pack).toBeDefined()
    for (const { check } of checks) {
      const ref = check.speech!
      if ('line' in ref && ref.line.startsWith('k-lessons/')) expect(pack.lines[ref.line.slice('k-lessons/'.length)]).toBe(check.question)
    }
  })

  it('name only real options at real cue words, and count along only small groups', () => {
    for (const { lesson, step, check } of checks) {
      const key = `${lesson.id}/${step.id}`
      for (const n of check.namedAt ?? []) {
        expect(check.options, key).toContain(n.option)
        expect(phraseIndex(check.question, n.cue), `${key}: cue "${n.cue}"`).toBeGreaterThanOrEqual(0)
      }
      if (check.countAlong !== undefined) {
        expect(check.countAlong).toBeGreaterThan(0)
        expect(check.countAlong).toBeLessThanOrEqual(20)
      }
    }
  })

  it('put the answer in different places (cards are shown in a stable shuffle)', () => {
    const at = checks.map(({ lesson, step, check }) => seededShuffle(checkCards(check), `${lesson.id}/${step.id}`).findIndex((c) => c.value === check.answer))
    expect(new Set(at).size).toBeGreaterThanOrEqual(3)
  })

  it('the guide lights what is asked about, then sweeps the cards without ever pointing at the answer alone', () => {
    for (const { lesson, step, check } of checks) {
      const key = `${lesson.id}/${step.id}`
      const cards = seededShuffle(checkCards(check), key)
      const open = cards.map((_, i) => i)
      const steps = askSteps(check, cards, open)
      expect(steps[0].voice, key).toEqual(check.speech)
      expect(steps.slice(1).every((s) => s.voice === undefined), key).toBe(true)
      const sweep = steps[steps.length - 1]
      expect(sweep.target, key).toEqual(open.map(lessonCard))
      expect(sweep.hand, key).toBe('sweep')
      if (check.countAlong) expect(steps[0].target, key).toBe(LESSON_STAGE)
      // every phrase cue is said in the question
      for (const s of steps) if (typeof s.cue === 'string') expect(phraseIndex(check.question, s.cue), `${key}: "${s.cue}"`).toBeGreaterThanOrEqual(0)
      // a card named on its own is pointed at only as its name is said
      const named = steps.filter((s) => typeof s.target === 'string' && s.target.startsWith('lesson-card-'))
      expect(named.length, key).toBe(check.namedAt?.length ?? 0)
    }
    // after a wrong pick, only the cards still in play are swept
    const { lesson, step, check } = checks[0]
    const cards = seededShuffle(checkCards(check), `${lesson.id}/${step.id}`)
    const sweep = askSteps(check, cards, [0, 2]).at(-1)!
    expect(sweep.target).toEqual([lessonCard(0), lessonCard(2)])
  })
})

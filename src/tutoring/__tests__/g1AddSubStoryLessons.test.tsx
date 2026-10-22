import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { g1Lessons, lessonsFor, narrationPace } from '../lessons'
import { sceneFor } from '../motion/scenes'
import { DEFAULT_CHARS_PER_SEC, phraseIndex, timeAtChar } from '../motion/cues'
import { Defs } from '../motion/kit'
import { H, W } from '../motion/palette'
import { VOICE_PACKS, voiceText } from '../../voice/registry'
import { seededShuffle } from '../../lib/random'
import { getStage } from '../../curriculum'
import { petById } from '../../lib/pets/catalog'
import { practiceStageFor } from '../lessonLinks'
import { askSteps, checkCards, lessonCard } from '../ui/listenScript'

/**
 * The 1st-grade voice lessons of the phase-2b contract (Adding Mesa,
 * Take-Away Dunes, Story Woods): about four short steps, each with a motion
 * scene cued to its narration, two picture-card "your turn" checks asked
 * aloud, nothing to read but the numbers and signs being taught, practised in
 * the zone's first 1st-grade stage, and hatching the zone's pet.
 */

const CONTRACT = {
  g1Adding: { zoneId: 'multiplication-mesa', practiceStageId: 'g1-add-1', pet: 'lion' },
  g1Subtract: { zoneId: 'division-dunes', practiceStageId: 'g1-sub-1', pet: 'trex' },
  g1StoryMath: { zoneId: 'word-problem-woods', practiceStageId: 'g1-woods-1', pet: 'owl' },
} as const

const mine = g1Lessons.filter((l) => l.id in CONTRACT)
const checks = mine.flatMap((l) => l.steps.filter((s) => s.check).map((s) => ({ lesson: l, step: s, check: s.check! })))
const words = (s: string) => s.split(/\s+/).filter(Boolean)

describe('the 1st-grade lessons (Adding Mesa, Take-Away Dunes, Story Woods)', () => {
  it('are the contract’s lessons, zones and practice stages, in the g1 band; 1st grade sees them, kindergarten doesn’t', () => {
    expect(mine.map((l) => l.id).sort()).toEqual(Object.keys(CONTRACT).sort())
    for (const l of mine) {
      const c = CONTRACT[l.id as keyof typeof CONTRACT]
      expect(l).toMatchObject({ band: 'g1', zoneId: c.zoneId, practiceStageId: c.practiceStageId })
      // the practice stage is the zone's first 1st-grade stage, and the lesson's link lands there
      expect(getStage(c.zoneId, c.practiceStageId, 1)?.kind).toBe('concept')
      expect(practiceStageFor(l, undefined, 1)).toBe(c.practiceStageId)
      // the zone's pet hatches from it
      expect(petById(c.pet)!.lessonIds).toContain(l.id)
      expect(lessonsFor(1).map((x) => x.id)).toContain(l.id)
      expect(lessonsFor(0).map((x) => x.id)).not.toContain(l.id)
    }
  })

  it('have four short steps, each with a scene, and two "your turn" checks', () => {
    for (const l of mine) {
      expect(l.steps, l.id).toHaveLength(4)
      expect(new Set(l.steps.map((s) => s.id)).size).toBe(4)
      for (const s of l.steps) {
        expect(s.id, `${l.id}/${s.id}`).toMatch(/^[a-z][A-Za-z0-9]*$/)
        expect(sceneFor(l.id, s.id), `${l.id}/${s.id} has no scene`).toBeDefined()
      }
      expect(l.steps.filter((s) => s.check), l.id).toHaveLength(2)
    }
  })

  it('are told for six-year-olds: short sentences, numbers as words, no on-screen body text', () => {
    for (const l of mine)
      for (const s of l.steps) {
        const key = `${l.id}/${s.id}`
        expect(s.narration, key).not.toMatch(/\d/)
        expect(words(s.narration).length, key).toBeLessThanOrEqual(22)
        for (const sentence of s.narration.split(/[.!?]+/).filter((x) => x.trim())) expect(words(sentence).length, `${key}: "${sentence.trim()}"`).toBeLessThanOrEqual(9)
        expect(s.body, key).toBeUndefined()
      }
  })

  it('teach the strategies: count on, a turn-around, make ten, doubles; take away, count back, think addition, a family; act it out, a missing number, three groups, fewer', () => {
    const told = (id: string) => mine.find((l) => l.id === id)!.steps.map((s) => s.narration).join(' ')
    expect(told('g1Adding')).toMatch(/count on/i)
    expect(told('g1Adding')).toMatch(/turn it around/i)
    expect(told('g1Adding')).toMatch(/make ten/i)
    expect(told('g1Adding')).toMatch(/double/i)
    expect(told('g1Subtract')).toMatch(/take away/i)
    expect(told('g1Subtract')).toMatch(/hop back/i)
    expect(told('g1Subtract')).toMatch(/think addition/i)
    expect(told('g1Subtract')).toMatch(/family/i)
    expect(told('g1StoryMath')).toMatch(/some flew away/i)
    expect(told('g1StoryMath')).toMatch(/four and six make ten/i)
  })
})

describe('the 1st-grade checks', () => {
  it('are answered with numeral cards: one per option, a valid answer, each said', () => {
    expect(checks).toHaveLength(6)
    for (const { lesson, step, check } of checks) {
      const key = `${lesson.id}/${step.id}`
      expect(check.pictures!.map((p) => p.value), key).toEqual(check.options)
      expect(new Set(check.options).size, key).toBe(3)
      expect(check.options, key).toContain(check.answer)
      for (const p of check.pictures!) {
        expect(p.picture.kind, key).toBe('numeral')
        expect(() => voiceText(p.speech!), key).not.toThrow()
      }
      expect(checkCards(check)).toBe(check.pictures)
      if (check.countAlong !== undefined) expect(check.countAlong).toBeLessThanOrEqual(20)
    }
  })

  it('are asked aloud: the question is exactly its k-lessons line', () => {
    const pack = VOICE_PACKS['k-lessons']
    for (const { lesson, step, check } of checks) {
      const ref = check.speech!
      expect(voiceText(ref), `${lesson.id}/${step.id}`).toBe(check.question)
      expect('line' in ref && pack.lines[ref.line.slice('k-lessons/'.length)]).toBe(check.question)
    }
  })

  it('put the answer in different places, and the guide sweeps the cards without pointing at the answer alone', () => {
    const at = checks.map(({ lesson, step, check }) => seededShuffle(checkCards(check), `${lesson.id}/${step.id}`).findIndex((c) => c.value === check.answer))
    expect(new Set(at).size).toBeGreaterThanOrEqual(2)
    for (const { lesson, step, check } of checks) {
      const cards = seededShuffle(checkCards(check), `${lesson.id}/${step.id}`)
      const open = cards.map((_, i) => i)
      const steps = askSteps(check, cards, open)
      const sweep = steps[steps.length - 1]
      expect(sweep.target).toEqual(open.map(lessonCard))
      expect(sweep.hand).toBe('sweep')
    }
  })
})

/**
 * The scenes keep the lesson stage's performance rules (as kindergarten's,
 * src/tutoring/motion/__tests__/kScenes.test.tsx), timed as the app's silent
 * timeline at the K–1 pace: about 150 elements, no filters, deterministic
 * frames, motion that ends, the finished picture when reduced, and nothing to
 * read: numerals, math signs and single letters only.
 */
const elements = (svg: string) => (svg.match(/<[a-zA-Z]/g) ?? []).length
const settled = (svg: string) =>
  svg
    .replace(/-?\d+(\.\d+)?(e-?\d+)?/g, (m) => (Math.round(Number(m) * 10) / 10).toFixed(1).replace('-0.0', '0.0'))
    .replace(/ ?rotate\(0\.0\)/g, '')
    .replace(/ ?scale\(1\.0\)/g, '')

for (const lesson of mine) {
  describe(`${lesson.id} scenes`, () => {
    for (const step of lesson.steps) {
      const Scene = sceneFor(lesson.id, step.id)!
      const text = step.narration
      const dur = text.length / (DEFAULT_CHARS_PER_SEC * narrationPace(lesson))
      const cue = (phrase: string, nth = 0) => {
        const i = phraseIndex(text, phrase, nth)
        if (i < 0) throw new Error(`cue "${phrase}" is not in ${lesson.id}/${step.id}`)
        return timeAtChar(i, text.length, dur)
      }
      const frame = (t: number, reduced = false) =>
        renderToStaticMarkup(
          <svg viewBox={`0 0 ${W} ${H}`}>
            <Defs />
            <Scene t={t} dur={dur} cue={cue} reduced={reduced} />
          </svg>,
        )
      const defsOnly = elements(renderToStaticMarkup(<svg><Defs /></svg>))

      it(`${step.id}: stays light, filter-free and deterministic on every frame`, () => {
        let peak = 0
        for (let t = 0; t <= dur + 3; t += 0.25) {
          const svg = frame(t)
          peak = Math.max(peak, elements(svg) - defsOnly)
          expect(svg, `${step.id} @ ${t}s`).not.toMatch(/filter=/)
          expect(frame(t), `${step.id} @ ${t}s`).toBe(svg)
        }
        expect(peak, `${step.id} peak elements`).toBeLessThanOrEqual(150)
      })

      it(`${step.id}: motion ends, and reduced motion shows the finished picture`, () => {
        const end = settled(frame(dur + 2.5))
        expect(settled(frame(dur + 8)), `${step.id} still moving after the narration`).toBe(end)
        expect(settled(frame(1e4, true)), `${step.id} reduced`).toBe(end)
      })

      it(`${step.id}: shows nothing to read (numerals and math signs only)`, () => {
        for (const t of [dur * 0.5, dur + 2.5]) {
          const texts = [...frame(t).matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1].trim()).filter(Boolean)
          for (const s of texts) expect(s, `${step.id} shows "${s}"`).toMatch(/^([0-9?+−=]+|[A-Za-z])$/)
        }
      })
    }
  })
}

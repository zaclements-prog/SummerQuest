import { afterEach, describe, expect, it, vi } from 'vitest'
import { K_THING_EMOJI, countDistractors, makeKCountingProvider } from '../kCounting'
import { K_COUNT_THINGS } from '../../../voice/packs/k-math'
import { voiceText } from '../../../voice/registry'
import { seededRng } from '../../random'
import { phraseIndex } from '../../../tutoring/motion/cues'

afterEach(() => vi.restoreAllMocks())

describe('kindergarten counting provider', () => {
  it('every problem is a fair, spoken, picture question', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRng('kcount'))
    const p = makeKCountingProvider()
    const kinds = new Set<string>()
    for (let i = 0; i < 400; i++) {
      const q = p.next()
      kinds.add(q.subtopic!)
      // 3 different options, the answer once, all 1–10
      expect(q.options).toHaveLength(3)
      expect(new Set(q.options).size).toBe(3)
      expect(q.options.filter((o) => o === q.answer)).toHaveLength(1)
      for (const o of q.options) expect(o).toSatisfy((n: number) => Number.isInteger(n) && n >= 1 && n <= 10)
      // one picture per option, standing for it, each with a spoken label
      expect(q.pictureOptions!.map((o) => o.value)).toEqual(q.options)
      for (const o of q.pictureOptions!) expect(voiceText(o.speech!)).toBe(`${o.value}!`)
      // the question is said, and every guide cue is a phrase of it (or a fraction)
      const said = voiceText(q.speech!)
      for (const c of q.cues ?? []) if (typeof c.cue === 'string') expect(phraseIndex(said, c.cue), `${c.cue} in ${said}`).toBeGreaterThanOrEqual(0)
      if (q.subtopic === 'howMany') {
        expect(q.picture).toMatchObject({ kind: 'group', count: q.answer })
        expect(q.pictureOptions!.every((o) => o.picture.kind === 'numeral')).toBe(true)
      } else {
        expect(q.picture).toEqual({ kind: 'numeral', n: q.answer })
        expect(q.answer).toBeGreaterThanOrEqual(2) // "Tap the group with 2 apples" and up
        expect(q.pictureOptions!.every((o) => o.picture.kind === 'group' && o.picture.count === o.value)).toBe(true)
      }
      expect(q.prompt).not.toMatch(/undefined|NaN|\{/)
    }
    expect(kinds).toEqual(new Set(['howMany', 'findGroup']))
  })

  it('never repeats the same count or thing twice in a row', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRng('kcount-repeat'))
    const p = makeKCountingProvider({ kinds: ['howMany'] })
    let prev = p.next()
    for (let i = 0; i < 200; i++) {
      const q = p.next()
      expect(q.answer).not.toBe(prev.answer)
      expect(q.prompt).not.toBe(prev.prompt)
      prev = q
    }
  })

  it('honours the range and the number of cards', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRng('kcount-range'))
    const p = makeKCountingProvider({ min: 1, max: 5, choices: 2 })
    for (let i = 0; i < 100; i++) {
      const q = p.next()
      expect(q.options).toHaveLength(2)
      for (const o of q.options) expect(o).toSatisfy((n: number) => n >= 1 && n <= 5)
    }
  })

  it('distractors are near the answer but never it', () => {
    for (let n = 1; n <= 10; n++) {
      const d = countDistractors(n, 1, 10, 2)
      expect(d).toHaveLength(2)
      expect(d).not.toContain(n)
      for (const v of d) expect(Math.abs(v - n)).toBeLessThanOrEqual(3)
    }
  })

  it('has a picture for every countable thing in the voice pack', () => {
    expect(Object.keys(K_THING_EMOJI).sort()).toEqual([...K_COUNT_THINGS].sort())
  })
})

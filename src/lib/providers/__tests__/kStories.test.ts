import { afterEach, describe, expect, it, vi } from 'vitest'
import { STORY_PICTURES, makeKStoriesProvider, type OrderSpec } from '../kStories'
import { K_STORIES } from '../../../voice/packs/k-stories'
import { seededRng } from '../../random'
import { voiceText } from '../../../voice/registry'
import { SKILLS } from '../../../tutoring/skills'

afterEach(() => vi.restoreAllMocks())

/**
 * Emoji from Unicode 10 on, which older Android tablets draw as boxes: most of
 * U+1F900 and up (these few up there are older), the coloured circles and
 * squares (U+1F7E0…, Unicode 12), the newest transport signs.
 */
const OLD_HIGH = new Map([
  [0x1f9c0, 'cheese wedge, Unicode 8'],
  [0x1f98b, 'butterfly, Unicode 9'],
  [0x1f95a, 'egg, Unicode 9'],
])
const tooNew = (cp: number) => (cp >= 0x1f900 && !OLD_HIGH.has(cp)) || (cp >= 0x1f7e0 && cp <= 0x1f7ff) || (cp >= 0x1f6d5 && cp <= 0x1f6df) || (cp >= 0x1f6f7 && cp <= 0x1f6ff)

describe('kindergarten story order', () => {
  it('has at least ten tiny three-step stories, each sentence first, next, last', () => {
    expect(K_STORIES.length).toBeGreaterThanOrEqual(10)
    expect(new Set(K_STORIES.map((s) => s.id)).size).toBe(K_STORIES.length)
    for (const s of K_STORIES) {
      expect(s.lines.map((l) => l.split(',')[0])).toEqual(['First', 'Next', 'Last'])
      for (const l of s.lines) {
        expect(l.split(/\s+/).length, l).toBeLessThanOrEqual(8)
        expect(l, l).toMatch(/[.!]$/)
      }
    }
  })

  it('every story has three pictures every Android tablet draws (one emoji each, Unicode 9 or older)', () => {
    expect(Object.keys(STORY_PICTURES).sort()).toEqual(K_STORIES.map((s) => s.id).sort())
    for (const [id, pics] of Object.entries(STORY_PICTURES)) {
      expect(pics, id).toHaveLength(3)
      expect(new Set(pics).size, id).toBe(3)
      for (const e of pics) {
        expect(e, id).not.toMatch(/\u200d/)
        const cps = [...e.replace(/\ufe0f/g, '')]
        expect(cps, `${id}: ${e}`).toHaveLength(1)
        const cp = cps[0].codePointAt(0)!
        expect(tooNew(cp), `${id}: ${e} (U+${cp.toString(16)}) is too new`).toBe(false)
      }
    }
  })

  it('each question: told aloud, its pictures, a real mix-up, a registered skill', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRng('kstories'))
    const p = makeKStoriesProvider()
    let lastMix = ''
    const firstAt: number[] = []
    const seen: string[] = []
    for (let i = 0; i < 120; i++) {
      const q = p.next()
      const a = q.activity as OrderSpec
      expect(a.kind).toBe('order')
      expect(a.pictures).toEqual(STORY_PICTURES[a.story])
      expect(a.lines.map(voiceText)).toEqual(K_STORIES.find((s) => s.id === a.story)!.lines)
      expect(voiceText(q.speech!)).toBe('Listen to the story!')
      expect(q.answer).toBe(a.pictures.join(''))
      expect(SKILLS[q.skill!.id]).toBeDefined()
      for (const r of q.praise ?? []) expect(() => voiceText(r)).not.toThrow()
      // mixed up: never left in story order, never the same mix twice running
      const mix = a.mixed.join('')
      expect([...a.mixed].sort().join('')).toBe('012')
      expect(mix).not.toBe('012')
      expect(mix).not.toBe(lastMix)
      lastMix = mix
      firstAt.push(a.mixed.indexOf(0))
      seen.push(a.story)
    }
    // the first picture never lands in the same place three times running
    for (let i = 2; i < firstAt.length; i++) expect(firstAt[i] === firstAt[i - 1] && firstAt[i] === firstAt[i - 2]).toBe(false)
    // a deck: every story is told before any is told again
    expect(new Set(seen.slice(0, K_STORIES.length)).size).toBe(K_STORIES.length)
  })

  it('the activity lines are all in the k-stories pack', () => {
    for (const id of ['listen', 'tapInOrder', 'whatFirst', 'whatNext', 'whatLast', 'slotFirst', 'slotNext', 'slotLast']) expect(() => voiceText({ line: `k-stories/${id}` })).not.toThrow()
    // the slots are lit on these words of the line
    expect(voiceText({ line: 'k-stories/tapInOrder' })).toMatch(/first, next, last/)
  })
})

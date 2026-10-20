import { afterEach, describe, expect, it, vi } from 'vitest'
import { TRACE_ROUND, makeKTraceProvider, pictureWord, traceSpec } from '../kTrace'
import { seededRng } from '../../random'
import { LETTER_FAMILIES, WARMUP_FAMILIES, glyph } from '../../trace/glyphs'
import type { TraceSpec } from '../../trace/spec'
import { voiceText } from '../../../voice/registry'
import { SKILLS } from '../../../tutoring/skills'
import type { ListenProblem } from '../../../games/listenPlay/types'

afterEach(() => vi.restoreAllMocks())

const draw = (mode: 'warmup' | 'numbers' | 'letters', rounds: number, seed = `ktrace-${mode}`) => {
  vi.spyOn(Math, 'random').mockImplementation(seededRng(seed))
  const p = makeKTraceProvider({ mode })
  return Array.from({ length: rounds }, () => Array.from({ length: TRACE_ROUND }, () => p.next()))
}
const ids = (qs: ListenProblem[]) => qs.map((q) => (q.activity as TraceSpec).id)

describe('kindergarten tracing provider', () => {
  it('letters: each round two straight-line letters, then two slants, then two curves, none twice', () => {
    const rounds = draw('letters', 8)
    const fam = (id: string) => (Object.entries(LETTER_FAMILIES).find(([, xs]) => (xs as readonly string[]).includes(id)) ?? ['?'])[0]
    for (const r of rounds) {
      expect(ids(r).map(fam)).toEqual(['straight', 'straight', 'slant', 'slant', 'curve', 'curve'])
      expect(new Set(ids(r)).size).toBe(TRACE_ROUND)
    }
    // the decks carry on: a few rounds meet every letter
    expect(new Set(rounds.slice(0, 6).flatMap(ids)).size).toBe(26)
  })

  it('warm-ups: both lines, a slant, the circle and the curve, then a zig-zag or a wave; both of each in two rounds', () => {
    const rounds = draw('warmup', 2)
    for (const r of rounds) {
      const got = ids(r)
      expect(got.slice(0, 2)).toEqual(['down', 'across'])
      expect(WARMUP_FAMILIES.slants).toContain(got[2])
      expect(got.slice(3, 5)).toEqual(['circle', 'curve'])
      expect(WARMUP_FAMILIES.patterns).toContain(got[5])
    }
    expect(new Set(rounds.flatMap(ids)).size).toBe(8)
  })

  it('numbers: six different numerals a round, in counting order; all ten in two rounds', () => {
    const rounds = draw('numbers', 2)
    for (const r of rounds) {
      const ns = ids(r).map(Number)
      expect(ns).toEqual([...ns].sort((a, b) => a - b))
      expect(new Set(ns).size).toBe(6)
    }
    expect(new Set(rounds.flatMap(ids))).toEqual(new Set('0123456789'.split('')))
  })

  it('every question is a spoken trace of a real glyph, with a registered skill', () => {
    for (const mode of ['warmup', 'numbers', 'letters'] as const)
      for (const q of draw(mode, 3).flat()) {
        const a = q.activity as TraceSpec
        expect(a.kind).toBe('trace')
        const g = glyph(a.glyph, a.id)
        expect(q.answer).toBe(g.id)
        expect(q.options).toEqual([])
        expect(q.prompt).toBe(voiceText(q.speech!))
        expect(q.prompt).toMatch(/^Let's trace (the letter [A-Z]|an? (zero|one|two|three|four|five|six|seven|eight|nine)|an? [a-z -]+)!$/)
        for (const s of g.strokes) expect(() => voiceText({ line: `k-trace/say-${s.say}` })).not.toThrow()
        for (const p of q.praise ?? []) expect(() => voiceText(p)).not.toThrow()
        if (a.name) expect(() => voiceText(a.name!)).not.toThrow()
        if (a.picture) expect(() => voiceText(a.picture!.speech)).not.toThrow()
        expect(SKILLS[q.skill!.id], q.skill!.id).toBeDefined()
      }
  })

  it('"Let’s trace an eight!": the numerals are written out, with the right a or an', () => {
    expect(voiceText(makeKTraceProvider({ mode: 'numbers' }).next().speech!)).toMatch(/^Let's trace an? \w+!$/)
    expect(voiceText({ line: 'k-trace/digit-8' })).toBe("Let's trace an eight!")
    expect(voiceText({ line: 'k-trace/digit-7' })).toBe("Let's trace a seven!")
    expect(voiceText({ line: 'k-trace/counted-8' })).toBe('You counted eight! Now trace an eight.')
  })

  it('a letter done shows (and says) its picture word: B is for ball; E has none', () => {
    expect(traceSpec('letter', 'B')).toEqual({
      kind: 'trace',
      glyph: 'letter',
      id: 'B',
      name: { template: 'k-letters/letter', slots: { letter: 'B' } },
      picture: { emoji: '⚽', speech: { template: 'k-letters/word', slots: { word: 'ball' } } },
    })
    expect(traceSpec('letter', 'E').picture).toBeUndefined()
    expect(pictureWord('O')).toBe('octopus')
    expect(traceSpec('digit', '7').name).toEqual({ template: 'listen/number', slots: { n: 7 } })
    expect(traceSpec('warmup', 'circle').name).toBeUndefined()
  })

  it('reset() starts a new round, from where the decks are (a replay meets other letters)', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRng('ktrace-reset'))
    const p = makeKTraceProvider({ mode: 'letters' })
    const first = [p.next(), p.next(), p.next()]
    p.reset?.()
    const again = Array.from({ length: TRACE_ROUND }, () => p.next())
    expect(ids(again).slice(0, 2).every((id) => (LETTER_FAMILIES.straight as readonly string[]).includes(id))).toBe(true)
    // the straight letters already met don't come straight back
    expect(ids(again).slice(0, 2)).not.toEqual(ids(first).slice(0, 2))
  })
})

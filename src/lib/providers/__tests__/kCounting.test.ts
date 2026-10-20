import { afterEach, describe, expect, it, vi } from 'vitest'
import { K_THING_EMOJI, countDistractors, makeKCountingProvider } from '../kCounting'
import { K_COUNT_THINGS } from '../../../voice/packs/k-math'
import { voiceText } from '../../../voice/registry'
import { seededRng } from '../../random'
import { phraseIndex } from '../../../tutoring/motion/cues'
import type { TraceSpec } from '../../trace/spec'

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

describe('kindergarten counting to 20', () => {
  it('asks "how many?" and "find the group" past ten, with two cards for a big group', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRng('kcount-20'))
    const p = makeKCountingProvider({ mode: 'count', min: 1, max: 20 })
    const teens = new Set<number>()
    for (let i = 0; i < 400; i++) {
      const q = p.next()
      const n = q.answer as number
      expect(n).toBeGreaterThanOrEqual(1)
      expect(n).toBeLessThanOrEqual(20)
      if (n > 10) teens.add(n)
      if (q.subtopic === 'findGroup' && n > 10) expect(q.options).toHaveLength(2)
      for (const o of q.options as number[]) expect(o).toBeLessThanOrEqual(20)
      expect(voiceText(q.speech!)).toBe(q.subtopic === 'howMany' ? `${q.prompt} Tap the number.` : q.prompt)
    }
    expect(teens.size).toBe(10)
  })
})

describe('kindergarten comparing (K.CC.6–7)', () => {
  const compare = (seed: string, n = 400) => {
    vi.spyOn(Math, 'random').mockImplementation(seededRng(seed))
    const p = makeKCountingProvider({ mode: 'compare', min: 1, max: 10 })
    return Array.from({ length: n }, () => p.next())
  }

  it('mixes more, fewer, same and bigger, never three of one in a row', () => {
    const qs = compare('kcmp-mix')
    expect(new Set(qs.map((q) => q.subtopic))).toEqual(new Set(['more', 'fewer', 'same', 'bigger']))
    for (let i = 2; i < qs.length; i++) expect(qs[i].subtopic === qs[i - 1].subtopic && qs[i].subtopic === qs[i - 2].subtopic).toBe(false)
  })

  it('"Which group has more / fewer?": two group cards of different sizes up to 10, the right one is the answer', () => {
    for (const q of compare('kcmp-groups').filter((q) => q.subtopic === 'more' || q.subtopic === 'fewer')) {
      const counts = q.pictureOptions!.map((o) => (o.picture.kind === 'group' ? o.picture.count : NaN))
      expect(counts).toEqual(q.options)
      expect(counts[0]).not.toBe(counts[1])
      for (const c of counts) expect(c).toSatisfy((n: number) => n >= 1 && n <= 10)
      expect(Math.abs(counts[0] - counts[1])).toBeLessThanOrEqual(3)
      expect(q.answer).toBe(q.subtopic === 'more' ? Math.max(...counts) : Math.min(...counts))
      expect(new Set(q.pictureOptions!.map((o) => (o.picture.kind === 'group' ? o.picture.emoji : ''))).size).toBe(1)
      expect(voiceText(q.speech!)).toBe(q.prompt)
      expect(q.walkthrough).toBe('each') // a wrong pick: both groups are counted
    }
  })

  it('"Are they the same?": two groups side by side, 👍 / 👎 in that order, about half the time the same', () => {
    const same = compare('kcmp-same', 600).filter((q) => q.subtopic === 'same')
    let equal = 0
    for (const q of same) {
      const [a, b] = q.pair!.map((p) => (p.kind === 'group' ? p.count : NaN))
      expect(q.answer).toBe(a === b ? 'yes' : 'no')
      if (a === b) equal++
      else expect(Math.abs(a - b)).toBeLessThanOrEqual(3)
      expect(q.options).toEqual(['yes', 'no'])
      expect(q.pictureOptions!.map((o) => (o.picture.kind === 'emoji' ? o.picture.emoji : ''))).toEqual(['👍', '👎'])
      expect(q.pictureOptions!.map((o) => voiceText(o.speech!))).toEqual(['Yes!', 'No!'])
      // the guide lights 👍 on "yes" and 👎 on "no"
      expect(q.cues).toEqual([{ target: 'picture' }, { target: 'card0', cue: 'yes' }, { target: 'card1', cue: 'no' }])
    }
    expect(equal / same.length).toBeGreaterThan(0.35)
    expect(equal / same.length).toBeLessThan(0.65)
  })

  it('"Which number is bigger?": two numerals 1–10, the bigger one is the answer, then counting up to it helps', () => {
    for (const q of compare('kcmp-bigger').filter((q) => q.subtopic === 'bigger')) {
      const ns = q.pictureOptions!.map((o) => (o.picture.kind === 'numeral' ? o.picture.n : NaN))
      expect(ns).toEqual(q.options)
      expect(q.answer).toBe(Math.max(...ns))
      for (const n of ns) expect(n).toSatisfy((v: number) => v >= 1 && v <= 10)
      expect(q.walkthrough).toBe('countUp')
      expect(q.picture).toBeUndefined() // the numerals take the stage
    }
  })
})

describe('Count with me: the round ends with a trace (traceLast)', () => {
  it('every fifth question traces the number the one before it counted (1–9); the others are as before', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRng('kcount-trace'))
    const p = makeKCountingProvider({ mode: 'count', min: 1, max: 10, traceLast: 5 })
    const qs = Array.from({ length: 60 }, () => p.next())
    qs.forEach((q, i) => {
      if ((i + 1) % 5 !== 0) {
        expect(q.activity, `item ${i + 1}`).toBeUndefined()
        expect(q.options).toHaveLength(3)
        return
      }
      const before = qs[i - 1]
      const n = before.answer as number
      expect(n).toBeGreaterThanOrEqual(1)
      expect(n).toBeLessThanOrEqual(9)
      const a = q.activity as TraceSpec
      expect(a).toMatchObject({ kind: 'trace', glyph: 'digit', id: String(n) })
      expect(q.answer).toBe(String(n))
      expect(q.speech).toEqual({ line: `k-trace/counted-${n}` })
      expect(voiceText(q.speech!)).toMatch(/^You counted \w+! Now trace an? \w+\.$/)
      expect(q.skill?.id).toBe('k-count')
    })
  })

  it('reset() starts the round again (a replay ends with its trace too)', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRng('kcount-trace-reset'))
    const p = makeKCountingProvider({ mode: 'count', traceLast: 5 })
    for (let i = 0; i < 3; i++) p.next()
    p.reset?.()
    const round = Array.from({ length: 5 }, () => p.next())
    expect(round.map((q) => !!q.activity)).toEqual([false, false, false, false, true])
  })

  it('without traceLast nothing changes: no trace, ever', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRng('kcount-no-trace'))
    const p = makeKCountingProvider({ mode: 'count' })
    for (let i = 0; i < 50; i++) expect(p.next().activity).toBeUndefined()
  })
})

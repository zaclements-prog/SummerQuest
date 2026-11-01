import { afterEach, describe, expect, it, vi } from 'vitest'
import { getZone, zoneStages } from '../../../curriculum'
import { createProvider, type ProviderConfig } from '..'
import { seededRng } from '../../random'
import type { ListenProblem } from '../../../games/listenPlay/types'
import {
  answerOf,
  isNumberSpec,
  matchAnswer,
  numberLines,
  type NumberActivitySpec,
} from '../../../games/listenPlay/activities/numberSpecs'
import { activityDef } from '../../../games/listenPlay/activities'
import { K_PAIRS } from '../../../voice/packs/k-compare'
import { VOICE_PACKS, voiceText } from '../../../voice/registry'
import { SKILLS } from '../../../tutoring/skills'
import { stagePicture } from '../../listenNav'
import { K_THING_EMOJI } from '../kCounting'

/**
 * Number Dunes (kCompare) and Ten Frame Plateau (kTeens): every question, over
 * many seeded rounds, is answered by a number activity, has the right answer
 * worked out from its own pictures, fair cards (the answer once, wrong cards
 * that are a K child's real mistakes), says everything from recorded lines,
 * and ramps gently through its round.
 */

const SEEDS = 40
const ROUND = 6

afterEach(() => vi.restoreAllMocks())

/** Rounds of a stage's questions, as the shell asks them (a fresh round each time). */
function rounds(config: ProviderConfig, seed: string, n = SEEDS, length = ROUND): ListenProblem[][] {
  const out: ListenProblem[][] = []
  for (let r = 0; r < n; r++) {
    vi.spyOn(Math, 'random').mockImplementation(seededRng(`${seed}:${r}`))
    const p = createProvider(config)
    p.reset?.()
    out.push(Array.from({ length }, () => p.next() as ListenProblem))
    vi.restoreAllMocks()
  }
  return out
}

// (the Listen & Play stages: Gobble Garden makes its own snacks, tested in lib/gobble)
const STAGES = ['division-dunes', 'place-value-plateau'].flatMap((z) =>
  zoneStages(getZone(z)!, 0)
    .filter((s) => s.gameId === 'listenPlay')
    .map((s) => ({ id: s.id, config: s.providerConfig, count: Number(s.params?.questionCount) })),
)

/** The answer, worked out from the activity's own numbers (not from the provider's bookkeeping). */
function solve(s: NumberActivitySpec): string | number {
  switch (s.kind) {
    case 'matchRows':
      return s.top === s.bottom ? 'same' : (s.top > s.bottom) === (s.ask === 'more') ? 'top' : 'bottom'
    case 'compareNumbers':
      return s.ask === 'more' ? Math.max(s.a, s.b!) : s.ask === 'less' ? Math.min(s.a, s.b!) : s.ask === 'oneMore' ? s.a + 1 : s.a - 1
    case 'numberOrder':
      return [...s.numbers].sort((x, y) => x - y).join(' ')
    case 'teenFrames':
    case 'buildTeen':
      return s.n
  }
}

/** A K child's real mistakes: what each wrong card stands for. */
function wrongCardsMakeSense(s: NumberActivitySpec, answer: number): string[] {
  if (s.kind !== 'compareNumbers' && s.kind !== 'teenFrames') return []
  const errs: string[] = []
  const wrong = s.cards.filter((c) => c !== answer)
  if (s.kind === 'compareNumbers') {
    if (s.ask === 'more' || s.ask === 'less') return wrong.length === 1 ? [] : ['two numbers, one wrong']
    // one more / one less: the number we started with, or a step too far (or the wrong way)
    for (const c of wrong) if (Math.abs(c - answer) > 2 || (c !== s.a && Math.abs(c - answer) !== 1 && Math.abs(c - answer) !== 2)) errs.push(`card ${c} for ${s.ask} ${s.a}`)
    return errs
  }
  if (s.ask === 'next') {
    // one skipped, the last said again (or one back)
    for (const c of wrong) if (!(c === answer + 1 || c === answer - 1 || c === answer - 2)) errs.push(`card ${c} after ${answer - 1}`)
    return errs
  }
  // the ones without the ten, and one off
  const ones = answer === 20 ? 10 : answer - 10
  if (!wrong.includes(ones)) errs.push(`no ones-alone card (${ones}) for ${answer}`)
  for (const c of wrong) if (c !== ones && Math.abs(c - answer) !== 1) errs.push(`card ${c} for ${answer}`)
  return errs
}

/** Whole blocks from Unicode 9 or older, and the Unicode 8–9 parts of the newer ones (as kLetters' test). */
const unicode9 = (e: string) => {
  const cps = [...e].map((c) => c.codePointAt(0)!).filter((cp) => cp !== 0xfe0f)
  const old = (cp: number) =>
    cp < 0x1f6d3 ||
    (cp >= 0x1f910 && cp <= 0x1f91e) ||
    (cp >= 0x1f920 && cp <= 0x1f927) ||
    (cp >= 0x1f940 && cp <= 0x1f94b) ||
    (cp >= 0x1f950 && cp <= 0x1f95e) ||
    (cp >= 0x1f980 && cp <= 0x1f991)
  return cps.length === 1 && old(cps[0])
}

describe.each(STAGES)('$id', ({ id, config, count }) => {
  const all = rounds(config, `k-numbers:${id}`)
  const qs = all.flat()

  it('every question is a number activity with the right answer, worked out from its pictures', () => {
    for (const q of qs) {
      const where = `${q.prompt} ${JSON.stringify(q.activity)}`
      expect(isNumberSpec(q.activity), where).toBe(true)
      const s = q.activity as NumberActivitySpec
      expect(activityDef(s), where).not.toBeNull()
      expect(q.answer, where).toBe(solve(s))
      expect(q.answer, where).toBe(answerOf(s))
      expect(q.answer, where).toBeTruthy()
      expect(SKILLS[q.skill!.id], where).toBeDefined()
      expect(q.prompt, where).toBe(voiceText(q.speech!))
    }
  })

  it('the cards are fair: the answer on one card, the wrong ones a real mistake, all within range', () => {
    const top = id.startsWith('k-dunes') ? 10 : 20
    for (const q of qs) {
      const s = q.activity as NumberActivitySpec
      const where = `${q.prompt} ${JSON.stringify(s)}`
      if (s.kind === 'compareNumbers' || s.kind === 'teenFrames') {
        expect(q.options, where).toEqual(s.cards)
        expect(new Set(s.cards).size, where).toBe(s.cards.length)
        expect(s.cards.filter((c) => c === q.answer), where).toHaveLength(1)
        for (const c of s.cards) {
          expect(Number.isInteger(c) && c >= 1 && c <= top, `${where}: card ${c}`).toBe(true)
        }
        expect(wrongCardsMakeSense(s, Number(q.answer)), where).toEqual([])
      }
      if (s.kind === 'matchRows') {
        expect(q.options).toEqual(['top', 'bottom', 'same'])
        for (const n of [s.top, s.bottom]) expect(n >= 1 && n <= 10, where).toBe(true)
        expect(K_PAIRS.some((p) => p.id === s.pair), where).toBe(true)
      }
      if (s.kind === 'numberOrder') {
        expect(s.numbers.every((n, i) => n >= 1 && n <= 10 && (i === 0 || n === s.numbers[i - 1] + 1)), where).toBe(true)
        expect(s.mixed.every((x, i) => x === i), where).toBe(false)
        expect([...s.mixed].sort().join(), where).toBe(s.numbers.map((_, i) => i).join())
      }
      if (s.kind === 'teenFrames' || s.kind === 'buildTeen') expect(s.n >= 11 && s.n <= 20, where).toBe(true)
    }
  })

  it('everything said is a recorded line: the question, each card, the help, the praise', () => {
    for (const q of qs) {
      for (const ref of numberLines(q.speech, q.activity as NumberActivitySpec)) expect(() => voiceText(ref), `${q.prompt}: ${JSON.stringify(ref)}`).not.toThrow()
      for (const p of q.praise ?? []) expect(() => voiceText(p)).not.toThrow()
    }
  })

  it('never the same question twice in a row; the answer moves between the cards', () => {
    const at: number[][] = []
    for (const round of all) {
      for (let i = 1; i < round.length; i++) expect(`${round[i].prompt}|${JSON.stringify(round[i].activity)}`).not.toBe(`${round[i - 1].prompt}|${JSON.stringify(round[i - 1].activity)}`)
      at.push(round.map((q) => q.options.indexOf(q.answer)).filter((x) => x >= 0))
    }
    for (const xs of at) for (let i = 2; i < xs.length; i++) expect(xs[i] === xs[i - 1] && xs[i] === xs[i - 2], `positions ${xs.join(',')}`).toBe(false)
    // every place gets used, among the questions with that many cards
    for (const cards of [2, 3]) {
      const these = qs.filter((q) => q.options.length === cards && q.options.includes(q.answer))
      if (these.length < 20) continue
      for (let k = 0; k < cards; k++) expect(these.filter((q) => q.options.indexOf(q.answer) === k).length, `answer at card ${k} of ${cards}`).toBeGreaterThan(these.length * 0.15)
    }
  })

  it(`its round (${count}) ramps up gently`, () => {
    expect(count).toBeGreaterThanOrEqual(5)
    expect(count).toBeLessThanOrEqual(6)
    for (const round of all) {
      const specs = round.slice(0, count).map((q) => q.activity as NumberActivitySpec)
      const first = specs[0]
      switch (id) {
        case 'k-dunes-1': {
          // small rows lined up first; spread out (and up to 10) later; "the same" in every round
          const m = specs.filter((s) => s.kind === 'matchRows')
          expect(m.slice(0, 2).every((s) => s.lined && Math.max(s.top, s.bottom) <= 5)).toBe(true)
          expect(m.slice(2).every((s) => !s.lined)).toBe(true)
          expect(m.some((s) => matchAnswer(s) === 'same')).toBe(true)
          expect(m.slice(0, 2).every((s) => s.ask === 'more')).toBe(true)
          break
        }
        case 'k-dunes-2': {
          // far apart first, a step apart last; one more early, one less later
          expect(first.kind === 'compareNumbers' && first.ask === 'more' && Math.abs(first.a - first.b!) >= 3).toBe(true)
          expect(specs.map((s) => (s.kind === 'compareNumbers' ? s.ask : s.kind))).toEqual(['more', 'less', 'oneMore', expect.stringMatching(/more|less/), 'oneLess', expect.stringMatching(/more|less/)])
          const last = specs[5]
          expect(last.kind === 'compareNumbers' && Math.abs(last.a - last.b!) === 1).toBe(true)
          break
        }
        case 'k-dunes-3': {
          // numbers in order, three then four then five, with a line-up, one more and two numbers between
          const orders = specs.filter((s) => s.kind === 'numberOrder')
          expect(orders.map((s) => (s.kind === 'numberOrder' ? s.numbers.length : 0))).toEqual([3, 4, 5])
          expect(specs.map((s) => s.kind)).toEqual(['numberOrder', 'matchRows', 'numberOrder', 'compareNumbers', 'compareNumbers', 'numberOrder'])
          break
        }
        case 'k-teens-1': {
          // a full ten and a little more first (said in the question), then the frames to find, then bigger teens
          expect(first.kind === 'teenFrames' && first.ask === 'howMany' && first.n <= 13).toBe(true)
          expect(round[0].speech).toEqual({ line: `k-teens/tenAnd-${(first as { n: number }).n - 10}` })
          expect(specs.map((s) => (s.kind === 'teenFrames' ? s.ask : s.kind))).toEqual(['howMany', 'howMany', 'shows', 'howMany', 'shows'])
          expect(specs.slice(3).every((s) => s.kind === 'teenFrames' && s.n >= 14)).toBe(true)
          break
        }
        case 'k-teens-2': {
          // make a small teen first, a big one last; "a full ten and…" said in the first three
          const ns = specs.map((s) => (s.kind === 'buildTeen' ? s.n : 0))
          expect(ns[0]).toBeLessThanOrEqual(13)
          expect(ns[4]).toBeGreaterThanOrEqual(16)
          expect(round.slice(0, 3).every((q) => 'line' in q.speech! && q.speech.line.startsWith('k-teens/make-'))).toBe(true)
          expect(round.slice(3, 5).every((q) => 'line' in q.speech! && q.speech.line.startsWith('k-teens/makeJust-'))).toBe(true)
          break
        }
        case 'k-teens-3': {
          // counting on to twenty: what comes next, things on ten-frames, making a number, then the frames
          expect(specs.map((s) => (s.kind === 'teenFrames' ? s.ask : s.kind))).toEqual(['next', 'howMany', 'buildTeen', 'next', 'shows', 'howMany'])
          const things = specs[1]
          expect(things.kind === 'teenFrames' && !!things.emoji).toBe(true)
          break
        }
        default:
          throw new Error(`no ramp check for ${id}`)
      }
    }
  })
})

describe('Number Dunes and Ten Frame Plateau pictures and voice', () => {
  it('every picture is an emoji every Android tablet draws (Unicode 9 or older, one symbol)', () => {
    for (const p of K_PAIRS) for (const e of [p.top.emoji, p.bottom.emoji]) expect(unicode9(e), `${p.id} ${e}`).toBe(true)
    expect(unicode9('⚖️')).toBe(true)
    for (const e of Object.values(K_THING_EMOJI)) expect(unicode9(e), e).toBe(true)
    for (const zone of ['division-dunes', 'place-value-plateau']) {
      for (const s of zoneStages(getZone(zone)!, 0)) expect(unicode9(stagePicture(s)), `${s.id} ${stagePicture(s)}`).toBe(true)
    }
  })

  it('the packs are recorded word for word: numbers spelled out, nothing in braces, short K sentences', () => {
    for (const id of ['k-compare', 'k-teens']) {
      const pack = VOICE_PACKS[id]
      expect(pack, id).toBeDefined()
      for (const [k, text] of Object.entries(pack.lines)) {
        expect(text, `${id}/${k}`).not.toMatch(/\d|\{|\}/)
        expect(text, `${id}/${k}`).toMatch(/[.!?]$/)
        for (const sentence of text.split(/[.!?]+/).filter((x) => x.trim())) expect(sentence.trim().split(/\s+/).length, `${id}/${k}: "${sentence}"`).toBeLessThanOrEqual(10)
      }
    }
    // every teen number is said as a ten and some more
    expect(voiceText({ line: 'k-teens/is-13' })).toBe('Ten and three more: thirteen.')
    expect(voiceText({ line: 'k-teens/is-20' })).toBe('Two full tens: twenty!')
    expect(voiceText({ line: 'k-compare/same-hens' })).toBe('Every hen has an egg. They are the same!')
  })
})

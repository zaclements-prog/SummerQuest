import { afterEach, describe, expect, it, vi } from 'vitest'
import { seededRng } from '../../random'
import { createProvider } from '..'
import {
  UNIT_WAYS,
  clockSpeech,
  digital,
  isClockSpec,
  isLengthOrderSpec,
  isUnitsSpec,
  lengthOrderSpeech,
  makeG1MeasureProvider,
  orderOf,
  sameTime,
  stringLine,
  timeHow,
  timeName,
  timeSays,
  unitWayArt,
  unitsSpeech,
  type ClockTime,
  type G1MeasureMode,
} from '../g1Measure'
import { K_LENGTH_THINGS } from '../../../voice/packs/k-measure'
import { voiceText } from '../../../voice/registry'
import type { VoiceRef } from '../../../voice/types'
import type { ListenProblem } from '../../../games/listenPlay/types'
import { DRAWINGS } from '../../../games/listenPlay/drawings'
import { SKILLS } from '../../../tutoring/skills'
import { getZone, zoneStages } from '../../../curriculum'

/**
 * 1st-grade Measure Marsh (1.MD.1–3): every question of every stage, over
 * many seeds, is answerable one way only, its wrong choices are the sensible
 * mistakes (and never right), and everything it says resolves to a line.
 */

afterEach(() => vi.restoreAllMocks())

const SEEDS = 40
const said = (ref: VoiceRef | null | undefined) => {
  expect(ref).toBeTruthy()
  return voiceText(ref!)
}

function rounds(mode: G1MeasureMode, seed: string, n = 12): ListenProblem[] {
  vi.spyOn(Math, 'random').mockImplementation(seededRng(seed))
  const p = makeG1MeasureProvider({ mode })
  return Array.from({ length: n }, () => p.next())
}

describe('Measure Marsh, 1st grade: the stages', () => {
  it('are the contract’s three stages, each a round of six on its own mode', () => {
    // (the Snack Shack, its own game, sits before the clock stage)
    const all = zoneStages(getZone('measurement-marsh')!, 1)
    expect(all.map((s) => s.id)).toEqual(['g1-measure-1', 'g1-measure-2', 'g1-measure-shack', 'g1-measure-3'])
    const set = all.filter((s) => s.gameId === 'listenPlay')
    expect(set.map((s) => [s.id, (s.providerConfig as { mode?: string }).mode, s.params?.questionCount])).toEqual([
      ['g1-measure-1', 'order', 6],
      ['g1-measure-2', 'units', 6],
      ['g1-measure-3', 'time', 6],
    ])
    for (const s of set) expect(createProvider(s.providerConfig).topic).toBe('g1Measure')
  })
})

describe('Longest to shortest (lengthOrder)', () => {
  it('ramps: in order, in order, a string, then out of line twice, then a string', () => {
    for (let s = 0; s < 10; s++) {
      const qs = rounds('order', `order-ramp-${s}`, 6)
      const shape = qs.map((q) => {
        const a = q.activity
        if (!isLengthOrderSpec(a)) return 'x'
        return a.mode === 'third' ? 'third' : a.starts ? 'out' : 'lined'
      })
      expect(shape).toEqual(['lined', 'lined', 'third', 'out', 'out', 'third'])
      expect(qs.slice(0, 2).map((q) => (q.activity as unknown as { ask: string }).ask)).toEqual(['long', 'short'])
    }
  })

  it('three different lengths, easy to tell apart, tapped longest (or shortest) first', () => {
    for (let s = 0; s < SEEDS; s++) {
      for (const q of rounds('order', `order-${s}`)) {
        const a = q.activity
        expect(isLengthOrderSpec(a)).toBe(true)
        if (!isLengthOrderSpec(a) || a.mode !== 'order') continue
        expect(K_LENGTH_THINGS).toContain(a.thing)
        expect(a.sizes).toHaveLength(3)
        const sorted = [...a.sizes].sort((x, y) => x - y)
        expect(sorted[0]).toBeGreaterThanOrEqual(2)
        expect(sorted[1] - sorted[0], JSON.stringify(a.sizes)).toBeGreaterThanOrEqual(2)
        expect(sorted[2] - sorted[1], JSON.stringify(a.sizes)).toBeGreaterThanOrEqual(2)
        expect(a.answer).toEqual(orderOf(a.sizes, a.ask))
        expect(q.answer).toBe(a.answer.join('-'))
        expect(new Set(a.colors).size).toBe(3)
        if (a.starts) {
          // out of line, the ends come in the WRONG order (the shortest sticks out furthest), all on the stage
          const ends = a.sizes.map((n, i) => n + a.starts![i])
          for (const e of ends) expect(e).toBeLessThanOrEqual(10)
          const [short, mid, long] = orderOf(a.sizes, 'short')
          expect(ends[short]).toBeGreaterThan(ends[mid])
          expect(ends[mid]).toBeGreaterThan(ends[long])
        } else expect(Math.max(...a.sizes)).toBeLessThanOrEqual(10)
        expect(said(q.speech)).toBe(said(lengthOrderSpeech(a)))
        expect(q.prompt).toBe(said(q.speech))
      }
    }
  })

  it('through a string: the string is strictly between the two, so only one is longer (or shorter)', () => {
    const at: number[] = []
    for (let s = 0; s < SEEDS; s++) {
      for (const q of rounds('order', `third-${s}`)) {
        const a = q.activity
        if (!isLengthOrderSpec(a) || a.mode !== 'third') continue
        const [x, y] = a.sizes
        const str = a.string!
        expect(Math.abs(x - y)).toBeGreaterThanOrEqual(2)
        expect(Math.min(x, y)).toBeLessThan(str)
        expect(Math.max(x, y)).toBeGreaterThan(str)
        expect(Math.max(x, y)).toBeLessThanOrEqual(8)
        const longer = x > y ? 0 : 1
        expect(a.answer).toEqual([a.ask === 'long' ? longer : 1 - longer])
        // what the string shows against each one is true
        for (const k of [0, 1]) expect(said(stringLine(a, k))).toBe(`The string is ${str > a.sizes[k] ? 'longer' : 'shorter'} than this ${a.thing}.`)
        at.push(a.answer[0])
      }
    }
    // the one to tap lies down and hangs down about as often
    expect(at.filter((x) => x === 0).length).toBeGreaterThan(at.length * 0.25)
    expect(at.filter((x) => x === 1).length).toBeGreaterThan(at.length * 0.25)
  })
})

describe('Paper clip ruler (units)', () => {
  it('ramps: clips, cubes, laying clips, the right way, laying cubes, the right way', () => {
    for (let s = 0; s < 10; s++) {
      const qs = rounds('units', `units-ramp-${s}`, 6)
      expect(qs.map((q) => (isUnitsSpec(q.activity) ? `${q.activity.unit}${q.activity.lay ? '-lay' : ''}` : 'rightWay'))).toEqual(['clip', 'cube', 'clip-lay', 'rightWay', 'cube-lay', 'rightWay'])
    }
  })

  it('the cards hold the length once, beside its neighbours; the length fits the stage', () => {
    for (let s = 0; s < SEEDS; s++) {
      for (const q of rounds('units', `units-${s}`)) {
        const a = q.activity
        if (!isUnitsSpec(a)) continue
        expect(a.n).toBeGreaterThanOrEqual(3)
        expect(a.n).toBeLessThanOrEqual(8)
        expect(a.cards).toHaveLength(3)
        expect(new Set(a.cards).size).toBe(3)
        expect(a.cards.filter((c) => c === a.n)).toHaveLength(1)
        for (const c of a.cards) {
          expect(c).toBeGreaterThanOrEqual(1)
          expect(Math.abs(c - a.n)).toBeLessThanOrEqual(2)
        }
        expect(q.answer).toBe(a.n)
        expect(said(q.speech)).toBe(said(unitsSpeech(a)))
        expect(said(q.speech)).toMatch(/^How many (paper clips|cubes) long is the \w+\?$/)
      }
    }
  })

  it('"measured the right way?": the right drawing and two different mistakes, each mistake explained', () => {
    for (let s = 0; s < SEEDS; s++) {
      for (const q of rounds('units', `ways-${s}`)) {
        if (q.activity) continue
        expect(q.options).toHaveLength(3)
        expect(q.options.filter((o) => o === 'right')).toHaveLength(1)
        expect(q.answer).toBe('right')
        for (const o of q.options) expect(UNIT_WAYS).toContain(o)
        expect(new Set(q.options).size).toBe(3)
        q.pictureOptions!.forEach((c, i) => {
          expect(c.value).toBe(q.options[i])
          expect(c.picture.kind).toBe('art')
          if (c.picture.kind === 'art') {
            expect(DRAWINGS[c.picture.name], c.picture.name).toBeDefined()
            expect(c.picture.name).toMatch(/^g1units-\w+-(clip|cube)$/)
          }
          const note = q.notes![i]
          if (c.value === 'right') expect(note).toBeNull()
          else said(note)
        })
      }
    }
    for (const how of UNIT_WAYS) for (const u of ['clip', 'cube'] as const) expect(DRAWINGS[unitWayArt(how, u)]).toBeDefined()
  })
})

describe('What time is it? (clockMatch)', () => {
  it('ramps: read and show o’clock, read and show half past, then said aloud', () => {
    for (let s = 0; s < 10; s++) {
      const qs = rounds('time', `time-ramp-${s}`, 6)
      const shape = qs.map((q) => (isClockSpec(q.activity) ? `${q.activity.mode}-${q.activity.time.half ? 'half' : 'hour'}` : 'x'))
      expect(shape.slice(0, 4)).toEqual(['read-hour', 'show-hour', 'read-half', 'show-half'])
      expect(shape[4]).toMatch(/^say-/)
      expect(shape[5]).toMatch(/^(read|say)-half$/)
    }
  })

  it('three different times, the right one once; the wrong ones are the mistakes children make', () => {
    const answerAt = new Map<number, number>()
    for (let s = 0; s < SEEDS; s++) {
      for (const q of rounds('time', `time-${s}`)) {
        const a = q.activity
        expect(isClockSpec(a)).toBe(true)
        if (!isClockSpec(a)) continue
        const t = a.time
        expect(t.hour).toBeGreaterThanOrEqual(1)
        expect(t.hour).toBeLessThanOrEqual(12)
        expect(a.cards).toHaveLength(3)
        expect(new Set(a.cards.map(digital)).size).toBe(3)
        expect(a.cards.filter((c) => sameTime(c, t))).toHaveLength(1)
        for (const c of a.cards) {
          expect(c.hour).toBeGreaterThanOrEqual(1)
          expect(c.hour).toBeLessThanOrEqual(12)
        }
        const next = (h: number) => (h % 12) + 1
        const prev = (h: number) => ((h + 10) % 12) + 1
        const has = (c: ClockTime) => a.cards.some((x) => sameTime(x, c))
        if (t.half) {
          // reading: the next hour's half past ("half past 4" for 3:30); finding the clock: the hour before's
          expect(has({ hour: a.mode === 'read' ? next(t.hour) : prev(t.hour), half: true })).toBe(true)
          expect(has({ hour: t.hour, half: false })).toBe(true)
        } else {
          expect(has({ hour: t.hour, half: true })).toBe(true)
          expect(a.cards.some((c) => !c.half && c.hour !== t.hour && (c.hour === next(t.hour) || c.hour === prev(t.hour) || c.hour === 12))).toBe(true)
        }
        expect(q.answer).toBe(digital(t))
        answerAt.set(a.cards.findIndex((c) => sameTime(c, t)), (answerAt.get(a.cards.findIndex((c) => sameTime(c, t))) ?? 0) + 1)
        // what is said: the question, each card's name, the word about a wrong card, the method
        expect(said(q.speech)).toBe(said(clockSpeech(a)))
        if (a.mode === 'read') expect(said(q.speech)).toBe('What time is it? Tap it!')
        else expect(said(q.speech)).toBe(t.half ? `Tap the clock that shows half past ${t.hour}.` : `Tap the clock that shows ${t.hour} o'clock.`)
        for (const c of a.cards) {
          expect(said(timeName(c))).toBe(c.half ? `Half past ${c.hour}!` : `${c.hour} o'clock!`)
          said(timeSays(c))
        }
        expect(said(timeHow(t))).toContain(t.half ? 'down to 6' : 'up to 12')
      }
    }
    // the answer moves between the three places
    for (const i of [0, 1, 2]) expect(answerAt.get(i) ?? 0).toBeGreaterThan(20)
  })
})

describe('every Measure Marsh question', () => {
  it('has a registered skill and praise that resolves', () => {
    for (const mode of ['order', 'units', 'time'] as const) {
      for (const q of rounds(mode, `skills-${mode}`)) {
        expect(SKILLS[q.skill!.id], q.skill!.id).toBeDefined()
        for (const p of q.praise ?? []) said(p)
      }
    }
  })
})

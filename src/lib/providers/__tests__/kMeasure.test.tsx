import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createProvider } from '..'
import { K_BIG_LIGHT, K_SAME_BOXES, K_WEIGHT_PAIRS, K_WEIGHT_PICTURES, heavySide, makeKMeasureProvider, measureSpeech, reach, type KMeasureMode, type MeasureSpec } from '../kMeasure'
import { K_HEIGHT_THINGS, K_LENGTH_THINGS } from '../../../voice/packs/k-measure'
import { HeightThingArt, LengthThingArt, MEASURE_PALETTE } from '../../../games/listenPlay/activities/measureArt'
import { seededRng } from '../../random'
import { voiceText } from '../../../voice/registry'
import type { VoiceRef } from '../../../voice/types'
import { SKILLS } from '../../../tutoring/skills'
import type { ListenProblem } from '../../../games/listenPlay/types'
import { curriculum, zoneStages } from '../../../curriculum'

/**
 * Measure Marsh (K.MD.1–2): every question is fair to SEE (two things that
 * differ by at least two units, lined up, or a scale that tips), the answer is
 * the thing asked for, each stage ramps the way the plan says, and everything
 * said resolves to a recorded line. Many seeds, a fresh provider each.
 */

afterEach(() => vi.restoreAllMocks())

const SEEDS = Array.from({ length: 12 }, (_, i) => `s${i}`)
const ROUNDS = 8

function draw(mode: KMeasureMode, seed: string, n = 6 * ROUNDS): ListenProblem[] {
  vi.spyOn(Math, 'random').mockImplementation(seededRng(`kmeasure:${mode}:${seed}`))
  const p = makeKMeasureProvider({ mode })
  const out = Array.from({ length: n }, () => p.next())
  vi.restoreAllMocks()
  return out
}
const runs = (mode: KMeasureMode) => SEEDS.map((s) => draw(mode, s))
const spec = (q: ListenProblem) => q.activity as MeasureSpec
const said = (ref: VoiceRef | null | undefined) => {
  expect(ref).toBeTruthy()
  return voiceText(ref!)
}

/** Unicode 9 or older, one symbol (a text-default symbol may carry U+FE0F). */
function oldEmoji(e: string): boolean {
  const cps = [...e].map((c) => c.codePointAt(0)!).filter((cp) => cp !== 0xfe0f)
  if (cps.length !== 1) return false
  const cp = cps[0]
  return (
    cp < 0x1f6d3 ||
    (cp >= 0x1f6e0 && cp <= 0x1f6f6) ||
    (cp >= 0x1f910 && cp <= 0x1f91e) ||
    (cp >= 0x1f920 && cp <= 0x1f927) ||
    (cp >= 0x1f930 && cp <= 0x1f93e) ||
    (cp >= 0x1f940 && cp <= 0x1f94b) ||
    (cp >= 0x1f950 && cp <= 0x1f95e) ||
    (cp >= 0x1f980 && cp <= 0x1f991) ||
    cp === 0x1f9c0
  )
}

/** The checks every question passes, whatever its stage. */
function fair(q: ListenProblem) {
  const s = spec(q)
  const where = `${q.prompt} ${JSON.stringify(s)}`
  expect(s.kind, where).toBe('measure')
  expect(q.options, where).toEqual([])
  expect(q.answer, where).toBe(s.answer === 0 ? 'first' : 'second')
  expect(q.prompt, where).toBe(said(q.speech))
  expect(q.speech, where).toEqual(measureSpeech(s))
  expect(q.prompt, where).not.toMatch(/undefined|NaN|\{|\s{2}|\s[,.!?]/)
  for (const p of q.praise ?? []) said(p)
  expect(SKILLS[q.skill!.id], where).toBeDefined()
  expect(q.skill!.id, where).toBe(`k-measure-${s.attr}`)
  expect(s.colors[0], where).not.toBe(s.colors[1])
  for (const c of s.colors) expect(MEASURE_PALETTE[c], where).toBeDefined()
  if (s.attr === 'weight') {
    expect(s.items, where).toHaveLength(2)
    expect(s.sizes, where).toBeUndefined()
    const heavy = heavySide(s)
    const [h, l] = [s.items![heavy], s.items![1 - heavy]]
    const pair = K_WEIGHT_PAIRS.find((p) => p.heavy === h.pic && p.light === l.pic)
    const box = K_SAME_BOXES.includes(h.pic) && h.pic === l.pic
    const big = K_BIG_LIGHT.find((p) => p.small === h.pic && p.big === l.pic)
    // the heavy side is a heavy thing: an obvious pair (heavy one drawn bigger), two same boxes, or big but light
    expect(!!pair || box || !!big, `${where}: the scale tips toward the wrong thing`).toBe(true)
    if (pair) expect(h.size, where).toBeGreaterThan(l.size)
    if (box) expect(h.size, where).toBe(l.size)
    if (big) {
      expect(l.size, where).toBeGreaterThan(h.size)
      expect(s.bigLight, where).toBe(1 - heavy)
    } else expect(s.bigLight, where).toBeUndefined()
    for (const it of s.items!) if (it.pic !== 'rock') expect(oldEmoji(it.pic), `${it.pic} draws on every tablet`).toBe(true)
    return
  }
  // lengths and heights: same kind of thing, sizes 2–10 that differ by 2 or more, the answer the one asked for
  const things: readonly string[] = s.attr === 'length' ? K_LENGTH_THINGS : K_HEIGHT_THINGS
  expect(things, where).toContain(s.thing)
  const [a, b] = s.sizes!
  for (const n of [a, b]) {
    expect(Number.isInteger(n), where).toBe(true)
    expect(n, where).toBeGreaterThanOrEqual(2)
    expect(n, where).toBeLessThanOrEqual(10)
  }
  expect(Math.abs(a - b), where).toBeGreaterThanOrEqual(2)
  const longer = a > b ? 0 : 1
  expect(s.answer, where).toBe(s.ask === 'more' ? longer : 1 - longer)
  expect(s.items, where).toBeUndefined()
  if (s.starts) {
    // out of line: only the shorter one, and it sticks out past the longer one's end (so lining up matters), all inside the stage
    const short = (1 - longer) as 0 | 1
    expect(s.starts[longer], where).toBe(0)
    expect(s.starts[short], where).toBeGreaterThan(0)
    expect(reach(s, short, false), where).toBeGreaterThan(reach(s, longer as 0 | 1, false))
    for (const k of [0, 1] as const) expect(reach(s, k, false), where).toBeLessThanOrEqual(10)
  }
}

describe('Measure Marsh questions (kMeasure)', () => {
  it('every stage config in the curriculum uses a known mode, a round of six', () => {
    const stages = zoneStages(curriculum.zones.find((z) => z.id === 'measurement-marsh')!, 0)
    expect(stages.map((s) => s.providerConfig)).toEqual([
      { kind: 'kMeasure', mode: 'length' },
      { kind: 'kMeasure', mode: 'weight' },
      { kind: 'kMeasure', mode: 'mix' },
    ])
    for (const s of stages) expect(s.params?.questionCount).toBe(6)
    expect((createProvider(stages[0].providerConfig).next() as ListenProblem).activity?.kind).toBe('measure')
  })

  for (const mode of ['length', 'weight', 'mix'] as const) {
    it(`${mode}: every question is fair, answerable and said aloud (${SEEDS.length} seeds × ${ROUNDS} rounds)`, () => {
      for (const run of runs(mode)) for (const q of run) fair(q)
    })

    it(`${mode}: the answer moves between the two things, never in one place three times running`, () => {
      for (const run of runs(mode)) {
        const at = run.map((q) => spec(q).answer)
        for (let i = 2; i < at.length; i++) expect(at[i] === at[i - 1] && at[i] === at[i - 2], `${at.join('')}`).toBe(false)
        expect(new Set(at).size).toBe(2)
      }
    })
  }

  it('Long and tall ramps: big differences, longer and taller first; then shorter; then differences of two', () => {
    for (const run of runs('length')) {
      for (let r = 0; r < ROUNDS; r++) {
        const round = run.slice(r * 6, r * 6 + 6).map(spec)
        expect(round.map((s) => s.attr).slice(0, 4)).toEqual(['length', 'height', 'length', 'height'])
        expect(round.map((s) => s.ask)).toEqual(['more', 'more', 'less', 'less', 'more', 'less'])
        const diff = (s: MeasureSpec) => Math.abs(s.sizes![0] - s.sizes![1])
        expect(diff(round[0])).toBeGreaterThanOrEqual(4)
        expect(diff(round[1])).toBeGreaterThanOrEqual(4)
        expect(diff(round[5])).toBe(2)
        expect(new Set(round.slice(4).map((s) => s.attr)).size).toBe(2)
        // always lined up here
        for (const s of round) expect(s.starts).toBeUndefined()
      }
    }
  })

  it('Heavy and light: obvious pairs first, then two boxes that look the same (only the scale tells), no big-but-light', () => {
    for (const run of runs('weight')) {
      for (let r = 0; r < ROUNDS; r++) {
        const round = run.slice(r * 6, r * 6 + 6).map(spec)
        expect(round.every((s) => s.attr === 'weight' && s.bigLight === undefined)).toBe(true)
        expect(round.map((s) => s.ask)).toEqual(['more', 'less', 'more', 'more', 'less', 'less'])
        const boxes = round.map((s) => s.items![0].pic === s.items![1].pic)
        expect(boxes).toEqual([false, false, false, true, false, true])
      }
    }
  })

  it('Measure mix: lengths and heights start out of line; one or two big-but-light things a round; every kind of question', () => {
    const kinds = new Set<string>()
    for (const run of runs('mix')) {
      for (let r = 0; r < ROUNDS; r++) {
        const round = run.slice(r * 6, r * 6 + 6).map(spec)
        for (const s of round) {
          kinds.add(`${s.attr}-${s.ask}`)
          if (s.attr !== 'weight') expect(s.starts, JSON.stringify(s)).toBeDefined()
        }
        const big = round.filter((s) => s.bigLight !== undefined).length
        expect(big).toBeGreaterThanOrEqual(1)
        expect(big).toBeLessThanOrEqual(2)
        expect(round[1].bigLight).toBeDefined()
      }
    }
    expect([...kinds].sort()).toEqual(['height-less', 'height-more', 'length-less', 'length-more', 'weight-less', 'weight-more'])
  })

  it('every thing is drawn (each length and height thing, at any size), every picture is one tablets draw', () => {
    for (const thing of K_LENGTH_THINGS)
      for (const n of [2, 5, 10]) expect(renderToStaticMarkup(<svg><LengthThingArt thing={thing} len={n * 60} thick={50} unit={60} color={MEASURE_PALETTE[0]} /></svg>)).toMatch(/<(path|rect|circle|ellipse)/)
    for (const thing of K_HEIGHT_THINGS)
      for (const n of [2, 5, 10]) expect(renderToStaticMarkup(<svg><HeightThingArt thing={thing} h={n * 40} w={100} unit={40} color={MEASURE_PALETTE[3]} /></svg>)).toMatch(/<(path|rect|circle|ellipse)/)
    for (const pic of K_WEIGHT_PICTURES) if (pic !== 'rock') expect(oldEmoji(pic), pic).toBe(true)
  })

  it('every line the activity says resolves: the set-up lines, the notes, the help', () => {
    for (const id of ['lookScale', 'lineUp', 'sameGround', 'isLonger', 'isShorter', 'isTaller', 'isHeavier', 'isLighter', 'helpLength', 'helpHeight', 'helpWeight', 'bigLight']) said({ line: `k-measure/${id}` })
    // the cues the activity lights things on are in their lines
    expect(voiceText({ line: 'k-measure/lineUp' })).toMatch(/line them up/)
    expect(voiceText({ line: 'k-measure/sameGround' })).toMatch(/stand them/)
    expect(voiceText({ line: 'k-measure/helpLength' })).toMatch(/start.*ends/)
    expect(voiceText({ line: 'k-measure/helpHeight' })).toMatch(/ground.*tops/)
    expect(voiceText({ line: 'k-measure/helpWeight' })).toMatch(/heavy.*light/)
    expect(voiceText({ line: 'k-measure/bigLight' })).toMatch(/scale/)
    for (const thing of K_LENGTH_THINGS) for (const ask of ['more', 'less'] as const) expect(voiceText(measureSpeech({ attr: 'length', ask, thing }))).toMatch(/Tap it!$/)
    for (const thing of K_HEIGHT_THINGS) for (const ask of ['more', 'less'] as const) expect(voiceText(measureSpeech({ attr: 'height', ask, thing }))).toMatch(/Tap it!$/)
  })

  it('reset() starts the round over', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRng('kmeasure-reset'))
    const p = makeKMeasureProvider({ mode: 'length' })
    p.next()
    p.next()
    p.reset?.()
    expect(spec(p.next()).attr).toBe('length')
    expect(spec(p.next()).attr).toBe('height')
    expect(spec(p.next()).ask).toBe('less')
  })
})

import type { ProblemProvider } from '../problem'
import type { ListenActivitySpec, ListenProblem } from '../../games/listenPlay/types'
import { K_HEIGHT_THINGS, K_LENGTH_THINGS } from '../../voice/packs/k-measure'
import { voiceText } from '../../voice/registry'
import type { VoiceRef } from '../../voice/types'
import { randInt } from '../random'
import { makeDeck, makePositionGuard } from './kShared'

/**
 * Kindergarten measurement (Measure Marsh, K.MD.1–2), for the Listen & Play
 * `measure` activity: two things drawn side by side, and the child taps the
 * one that is longer, shorter, taller, heavier or lighter.
 *
 * - Lengths (pencils, ribbons, snakes, trains, worms) lie one above the other,
 *   LINED UP at a start line, so the comparison is fair; heights (towers,
 *   trees, flowers, candles, rockets) stand on the same ground.
 * - Weights sit on a balance scale that tips toward the heavier thing.
 *
 * Each stage is a round of six that ramps:
 * - `length` (Long and tall): big differences first, longer and taller, then
 *   shorter, then differences of two units;
 * - `weight` (Heavy and light): heavier and lighter with things that look it
 *   (an elephant and a mouse), then two boxes that look the same, where only
 *   the scale can tell;
 * - `mix` (Measure mix): everything, with lengths that start OUT of line (the
 *   shorter one sticking out further) and slide into line as the question
 *   begins ("Let's line them up at the start!"), heights raised on a crate that
 *   step down to the ground, and one or two big-but-light things (a big
 *   balloon and a small rock), with their own help.
 */

export type LengthThing = (typeof K_LENGTH_THINGS)[number]
export type HeightThing = (typeof K_HEIGHT_THINGS)[number]
export type MeasureAttr = 'length' | 'height' | 'weight'

/** Something on a pan: an emoji every Android tablet draws, or `rock` (drawn: there's no old rock emoji). */
export interface WeightItem {
  pic: string
  /** How big it is drawn (1 ≈ a pan's width). */
  size: number
}

/** A `measure` question (`ListenProblem.activity`). */
export interface MeasureSpec extends ListenActivitySpec {
  kind: 'measure'
  attr: MeasureAttr
  /** `more`: longer, taller, heavier; `less`: shorter, lighter. */
  ask: 'more' | 'less'
  /** Lengths and heights: what is drawn (two of the same thing, in two colours). */
  thing?: LengthThing | HeightThing
  /** Lengths and heights: each one's size in units (2–10; the stage is 10 units long). */
  sizes?: readonly [number, number]
  /**
   * Lengths and heights: where each one starts, in units past the start line
   * (or up off the ground, on a crate). Out of line, they slide into line as the
   * question begins; without it they are lined up from the start.
   */
  starts?: readonly [number, number]
  /** Weights: the two things on the pans, left and right. */
  items?: readonly [WeightItem, WeightItem]
  /** Sticker colours (indexes into the activity's palette), one per thing. */
  colors: readonly [number, number]
  /** The one to tap: 0 (the top one, or the left) or 1 (the bottom one, or the right). */
  answer: 0 | 1
  /** Big but light: the big, light thing (0 or 1). Its help says "Big things can be light!" first. */
  bigLight?: 0 | 1
}

export const isMeasureSpec = (s: { kind: string } | undefined): s is MeasureSpec => s?.kind === 'measure'

/** Which side of the scale goes down: the heavier one (`answer` for "heavier", the other for "lighter"). */
export const heavySide = (s: MeasureSpec): 0 | 1 => (s.ask === 'more' ? s.answer : ((1 - s.answer) as 0 | 1))

/** The size of each thing once lined up: its end (or top) is how far it reaches. */
export const reach = (s: MeasureSpec, k: 0 | 1, lined = true): number => (s.sizes?.[k] ?? 0) + (lined ? 0 : (s.starts?.[k] ?? 0))

/** Two things that obviously differ, heavier first: the scale agrees with what a child expects. */
export const K_WEIGHT_PAIRS: readonly { heavy: string; light: string }[] = [
  { heavy: '🐘', light: '🐭' },
  { heavy: '🍉', light: '🍓' },
  { heavy: '🍍', light: '🍒' },
  { heavy: '🐶', light: '🐥' },
  { heavy: '🎃', light: '🍇' },
  { heavy: '📚', light: '✏️' },
  { heavy: '🍞', light: '🍪' },
  { heavy: '🐷', light: '🐝' },
]
/** Two of the same box: they look the same, so only the scale can tell. */
export const K_SAME_BOXES: readonly string[] = ['📦', '🎁']
/** Big but light, then small but heavy: the scale says the small one is heavier. */
export const K_BIG_LIGHT: readonly { big: string; small: string }[] = [
  { big: '🎈', small: 'rock' },
  { big: '🍃', small: '🍎' },
]

/** How big each kind of thing is drawn on a pan. */
const SIZE = { heavy: 1.0, light: 0.55, box: 0.85, big: 1.3, small: 0.5 } as const

/** Sticker colours a pair can take (indexes into the activity's palette: two that are easy to tell apart). */
const COLOR_PAIRS: readonly (readonly [number, number])[] = [
  [0, 3],
  [1, 4],
  [2, 0],
  [3, 1],
  [6, 4],
  [7, 3],
]

const QUESTION_PRAISE: VoiceRef[] = [{ line: 'k-measure/greatMeasuring' }, { line: 'k-measure/youCompared' }]

/** One question of a round: what is compared, which way, and how hard. */
interface Plan {
  attr: MeasureAttr
  ask: 'more' | 'less'
  /** Lengths and heights: the difference in units [min, max]. */
  diff?: readonly [number, number]
  /** Lengths and heights: start out of line (the shorter one sticking out further). */
  outOfLine?: boolean
  /** Weights: obvious pair, two same boxes, or big but light. */
  weigh?: 'pair' | 'boxes' | 'bigLight'
}

export type KMeasureMode = 'length' | 'weight' | 'mix'

export interface KMeasureConfig {
  /** `length` (Long and tall, the default), `weight` (Heavy and light) or `mix` (Measure mix). */
  mode?: KMeasureMode
}

/** The stage's round, in order (it repeats). `pick` lets a slot choose between two plans. */
function roundPlan(mode: KMeasureMode, coin: () => boolean): Plan[] {
  switch (mode) {
    case 'length': {
      const lenFirst = coin()
      return [
        { attr: 'length', ask: 'more', diff: [4, 6] },
        { attr: 'height', ask: 'more', diff: [4, 6] },
        { attr: 'length', ask: 'less', diff: [3, 4] },
        { attr: 'height', ask: 'less', diff: [3, 4] },
        { attr: lenFirst ? 'length' : 'height', ask: 'more', diff: [2, 3] },
        { attr: lenFirst ? 'height' : 'length', ask: 'less', diff: [2, 2] },
      ]
    }
    case 'weight':
      return [
        { attr: 'weight', ask: 'more', weigh: 'pair' },
        { attr: 'weight', ask: 'less', weigh: 'pair' },
        { attr: 'weight', ask: 'more', weigh: 'pair' },
        { attr: 'weight', ask: 'more', weigh: 'boxes' },
        { attr: 'weight', ask: 'less', weigh: 'pair' },
        { attr: 'weight', ask: 'less', weigh: 'boxes' },
      ]
    case 'mix':
      return [
        { attr: 'length', ask: 'more', diff: [2, 3], outOfLine: true },
        { attr: 'weight', ask: 'more', weigh: 'bigLight' },
        { attr: 'height', ask: 'more', diff: [2, 3], outOfLine: true },
        { attr: 'weight', ask: 'less', weigh: coin() ? 'pair' : 'boxes' },
        { attr: 'length', ask: 'less', diff: [2, 2], outOfLine: true },
        // a second big-but-light thing in about half the rounds ("one or two")
        coin() ? { attr: 'weight', ask: 'less', weigh: 'bigLight' } : { attr: 'height', ask: 'less', diff: [2, 2], outOfLine: true },
      ]
  }
}

/** The question line for a spec. */
export function measureSpeech(s: Pick<MeasureSpec, 'attr' | 'ask' | 'thing'>): VoiceRef {
  if (s.attr === 'weight') return { line: s.ask === 'more' ? 'k-measure/whichHeavier' : 'k-measure/whichLighter' }
  const thing = String(s.thing)
  if (s.ask === 'less') return { template: 'k-measure/whichShorter', slots: { thing } }
  return { template: s.attr === 'length' ? 'k-measure/whichLonger' : 'k-measure/whichTaller', slots: { thing } }
}

/** The skill a question practises. */
const SKILL: Record<MeasureAttr, { id: string; label: string }> = {
  length: { id: 'k-measure-length', label: 'longer and shorter' },
  height: { id: 'k-measure-height', label: 'taller and shorter' },
  weight: { id: 'k-measure-weight', label: 'heavier and lighter' },
}

export function makeKMeasureProvider(cfg: KMeasureConfig = {}): Omit<ProblemProvider, 'next'> & { next(): ListenProblem } {
  const mode = cfg.mode ?? 'length'
  const lengths = makeDeck(K_LENGTH_THINGS)
  const heights = makeDeck(K_HEIGHT_THINGS)
  const pairs = makeDeck(K_WEIGHT_PAIRS)
  const boxes = makeDeck(K_SAME_BOXES)
  const bigLights = makeDeck(K_BIG_LIGHT)
  const colorDeck = makeDeck(COLOR_PAIRS)
  const places = makePositionGuard()
  const coin = () => randInt(0, 1) === 0
  let plan: Plan[] = []
  let asked = 0
  let serial = 0

  /** The answer's place, never three times running in the same one. */
  function answerAt(): 0 | 1 {
    const at = places.arrange([0, 1] as const, 0).indexOf(0) as 0 | 1
    places.note(at)
    return at
  }

  function sized(p: Plan): MeasureSpec {
    const [lo, hi] = p.diff ?? [2, 3]
    const d = randInt(lo, hi)
    // out of line, the shorter one starts far enough along to stick out past the longer one's end
    // (and still ends inside the stage): start ≥ d + 1 and start + small ≤ 10, so big ≤ 9
    const bigMax = p.outOfLine ? 9 : 10
    const big = randInt(Math.min(bigMax, 2 + d), bigMax)
    const small = big - d
    const at = answerAt()
    // the one that is longer (or taller) sits at `longIdx`
    const longIdx = (p.ask === 'more' ? at : 1 - at) as 0 | 1
    const sizes: [number, number] = longIdx === 0 ? [big, small] : [small, big]
    let starts: [number, number] | undefined
    if (p.outOfLine) {
      const off = randInt(d + 1, 10 - small)
      starts = longIdx === 0 ? [0, off] : [off, 0]
    }
    const thing = p.attr === 'length' ? lengths.next() : heights.next()
    return { kind: 'measure', attr: p.attr, ask: p.ask, thing, sizes, ...(starts ? { starts } : {}), colors: colorDeck.next(), answer: at }
  }

  function weighed(p: Plan): MeasureSpec {
    const at = answerAt()
    const heavy = (p.ask === 'more' ? at : 1 - at) as 0 | 1
    let items: [WeightItem, WeightItem]
    let bigLight: 0 | 1 | undefined
    if (p.weigh === 'boxes') {
      const box = boxes.next()
      items = [
        { pic: box, size: SIZE.box },
        { pic: box, size: SIZE.box },
      ]
    } else if (p.weigh === 'bigLight') {
      const b = bigLights.next()
      const heavyItem = { pic: b.small, size: SIZE.small }
      const lightItem = { pic: b.big, size: SIZE.big }
      items = heavy === 0 ? [heavyItem, lightItem] : [lightItem, heavyItem]
      bigLight = (1 - heavy) as 0 | 1
    } else {
      const pr = pairs.next()
      const heavyItem = { pic: pr.heavy, size: SIZE.heavy }
      const lightItem = { pic: pr.light, size: SIZE.light }
      items = heavy === 0 ? [heavyItem, lightItem] : [lightItem, heavyItem]
    }
    return { kind: 'measure', attr: 'weight', ask: p.ask, items, colors: colorDeck.next(), answer: at, ...(bigLight !== undefined ? { bigLight } : {}) }
  }

  return {
    topic: 'kMeasure',
    reset() {
      asked = 0
      serial = 0
      plan = []
      places.reset()
    },
    next(): ListenProblem {
      if (asked % 6 === 0) plan = roundPlan(mode, coin)
      const p = plan[asked % 6]
      asked++
      const spec = p.attr === 'weight' ? weighed(p) : sized(p)
      const speech = measureSpeech(spec)
      return {
        id: `kmeasure-${serial++}`,
        topic: 'kMeasure',
        subtopic: `${spec.attr}-${spec.ask}`,
        prompt: voiceText(speech),
        // (answered by tapping one of the two things: the activity checks it)
        options: [],
        answer: spec.answer === 0 ? 'first' : 'second',
        difficulty: spec.sizes ? Math.abs(spec.sizes[0] - spec.sizes[1]) : undefined,
        skill: SKILL[spec.attr],
        speech,
        praise: QUESTION_PRAISE,
        activity: spec,
      }
    },
  }
}

/** Every picture a weight question can put on a pan (for tests and the art). */
export const K_WEIGHT_PICTURES: readonly string[] = [
  ...new Set([...K_WEIGHT_PAIRS.flatMap((p) => [p.heavy, p.light]), ...K_SAME_BOXES, ...K_BIG_LIGHT.flatMap((p) => [p.big, p.small])]),
]

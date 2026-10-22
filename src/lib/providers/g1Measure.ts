import type { PictureOption, ProblemProvider } from '../problem'
import type { ListenActivitySpec, ListenProblem } from '../../games/listenPlay/types'
import { G1_ORDER_THINGS, G1_THIRD_THINGS, G1_UNIT_THINGS } from '../../voice/packs/g1-measure'
import { voiceText } from '../../voice/registry'
import type { VoiceRef } from '../../voice/types'
import { randInt, shuffle } from '../random'
import type { LengthThing } from './kMeasure'
import { makeDeck, makePositionGuard } from './kShared'

/**
 * 1st-grade measurement (Measure Marsh, 1.MD.1–3), for Listen & Play. Three
 * stages, a round of six each, ramping:
 *
 * - `order` (Longest to shortest, 1.MD.1), the `lengthOrder` activity: three
 *   things LINED UP at a start line, tapped in order, longest first (or
 *   shortest first); later they start out of line and slide to the start
 *   first. Twice a round, two things far apart (one lies down, one hangs
 *   down) are compared through a string: the string is longer than one and
 *   shorter than the other, so…
 * - `units` (Paper clip ruler, 1.MD.2), the `units` activity: "How many paper
 *   clips long is the pencil?" The clips (or cubes) lie end to end under it,
 *   or the child lays them one by one until they reach the end; then numeral
 *   cards. Twice a round: "Which one is measured the right way?" (three
 *   drawings: end to end; with gaps; overlapping, or not begun at the start).
 * - `time` (What time is it?, 1.MD.3), the `clockMatch` activity: an analog
 *   clock and digital cards ("What time is it?"), a digital time and clock
 *   cards, then a time that is only said. Hours and half hours; the wrong
 *   cards are the mistakes children make (the next hour at half past, the
 *   hour before, the other half).
 *
 * Every wrong pick gets help: the ends lit, the clips counted aloud, the clock's
 * hands lit as the method is said ("The long hand points up to 12…").
 */

export type G1MeasureMode = 'order' | 'units' | 'time'

export interface G1MeasureConfig {
  /** `order` (the default), `units` or `time`. */
  mode?: G1MeasureMode
}

// ── in order, and through a string (`lengthOrder`) ───────────────────────────

/** A `lengthOrder` question (`ListenProblem.activity`). */
export interface LengthOrderSpec extends ListenActivitySpec {
  kind: 'lengthOrder'
  /** `order`: three things to tap in order; `third`: two things far apart, compared through a string. */
  mode: 'order' | 'third'
  /** What is drawn (the K Measure Marsh art). */
  thing: LengthThing
  /**
   * Sizes in units. `order`: three, top to bottom (a stage is 10 units long);
   * `third`: [the one lying down, the one hanging down].
   */
  sizes: readonly number[]
  /** `order`, out of line: how far past the start line each one starts (they slide back as the question begins). */
  starts?: readonly number[]
  /** Sticker colours (indexes into the measure palette), one per thing. */
  colors: readonly number[]
  /** `order`: longest first (`long`) or shortest first (`short`); `third`: which is longer (`long`) or shorter (`short`). */
  ask: 'long' | 'short'
  /** `third`: the string's length in units (strictly between the two). */
  string?: number
  /** `order`: the things' indexes in the order to tap them; `third`: [the one to tap]. */
  answer: readonly number[]
}

export const isLengthOrderSpec = (s: { kind: string } | undefined): s is LengthOrderSpec => s?.kind === 'lengthOrder'

/** The order a `lengthOrder` question wants: longest (or shortest) first. */
export function orderOf(sizes: readonly number[], ask: 'long' | 'short'): number[] {
  return sizes.map((_, i) => i).sort((a, b) => (ask === 'long' ? sizes[b] - sizes[a] : sizes[a] - sizes[b]))
}

/** The plural the voice uses for a thing ("Put the pencils in order."). */
const PLURAL: Record<LengthThing, (typeof G1_ORDER_THINGS)[number]> = { pencil: 'pencils', ribbon: 'ribbons', snake: 'snakes', train: 'trains', worm: 'worms' }

/** How a `lengthOrder` question is first said. */
export function lengthOrderSpeech(s: Pick<LengthOrderSpec, 'mode' | 'thing' | 'ask'>): VoiceRef {
  if (s.mode === 'third') return { template: s.ask === 'long' ? 'g1-measure/thirdLonger' : 'g1-measure/thirdShorter', slots: { thing: s.thing } }
  return { template: s.ask === 'long' ? 'g1-measure/orderLong' : 'g1-measure/orderShort', slots: { things: PLURAL[s.thing] } }
}

/** "The string is longer than this ribbon.": what the string shows against thing `k`. */
export function stringLine(s: LengthOrderSpec, k: number): VoiceRef {
  const longer = (s.string ?? 0) > s.sizes[k]
  return { template: longer ? 'g1-measure/stringLonger' : 'g1-measure/stringShorter', slots: { thing: s.thing } }
}

// ── units (`units`) ──────────────────────────────────────────────────────────

export type UnitKind = 'clip' | 'cube'
export type UnitThing = (typeof G1_UNIT_THINGS)[number]

/** A `units` question (`ListenProblem.activity`). */
export interface UnitsSpec extends ListenActivitySpec {
  kind: 'units'
  thing: UnitThing
  unit: UnitKind
  /** Its length in units (2–10). */
  n: number
  /** The child lays the units one by one (else they are there already). */
  lay: boolean
  /** Sticker colour of the thing. */
  color: number
  /** The numeral cards (one of them is `n`). */
  cards: readonly number[]
}

export const isUnitsSpec = (s: { kind: string } | undefined): s is UnitsSpec => s?.kind === 'units'

export const UNIT_WORD: Record<UnitKind, 'paper clips' | 'cubes'> = { clip: 'paper clips', cube: 'cubes' }

export const unitsSpeech = (s: Pick<UnitsSpec, 'unit' | 'thing'>): VoiceRef => ({ template: 'g1-measure/howManyLong', slots: { units: UNIT_WORD[s.unit], thing: s.thing } })

/** How a drawing of "measured the right way?" is measured. */
export const UNIT_WAYS = ['right', 'gaps', 'overlap', 'late'] as const
export type UnitWay = (typeof UNIT_WAYS)[number]
/** The drawing's name (`art`): a pencil with paper clips (or cubes) under it, laid this way. */
export const unitWayArt = (how: UnitWay, unit: UnitKind) => `g1units-${how}-${unit}`
const WAY_NOTE: Record<Exclude<UnitWay, 'right'>, VoiceRef> = {
  gaps: { line: 'g1-measure/hasGaps' },
  overlap: { line: 'g1-measure/hasOverlap' },
  late: { line: 'g1-measure/lateStart' },
}

// ── time (`clockMatch`) ──────────────────────────────────────────────────────

export interface ClockTime {
  /** 1–12. */
  hour: number
  /** Half past (else o'clock). */
  half: boolean
}

/** A `clockMatch` question (`ListenProblem.activity`). */
export interface ClockSpec extends ListenActivitySpec {
  kind: 'clockMatch'
  /**
   * `read`: an analog clock, digital cards ("What time is it?"); `show`: a
   * digital time, clock cards ("Tap the clock that shows…"); `say`: the time
   * is only said, clock cards.
   */
  mode: 'read' | 'show' | 'say'
  time: ClockTime
  /** The cards, in their places (one of them is `time`). */
  cards: readonly ClockTime[]
}

export const isClockSpec = (s: { kind: string } | undefined): s is ClockSpec => s?.kind === 'clockMatch'

/** "3:30", "12:00": a time as a digital clock shows it (and as a question's answer). */
export const digital = (t: ClockTime) => `${t.hour}:${t.half ? '30' : '00'}`
export const sameTime = (a: ClockTime, b: ClockTime) => a.hour === b.hour && a.half === b.half
const nextHour = (h: number) => (h % 12) + 1
const prevHour = (h: number) => ((h + 10) % 12) + 1

/** A time's name, said as its card is tapped ("Half past 3!"). */
export const timeName = (t: ClockTime): VoiceRef => ({ template: t.half ? 'g1-measure/halfPast' : 'g1-measure/oclock', slots: { hour: t.hour } })
/** "That one says 4 o'clock." */
export const timeSays = (t: ClockTime): VoiceRef => ({ template: t.half ? 'g1-measure/saysHalf' : 'g1-measure/saysOclock', slots: { hour: t.hour } })
/** The method for the time, its hands lit on "long hand" and "short hand". */
export const timeHow = (t: ClockTime): VoiceRef => ({ template: t.half ? 'g1-measure/howHalf' : 'g1-measure/howOclock', slots: { hour: t.hour } })

export function clockSpeech(s: Pick<ClockSpec, 'mode' | 'time'>): VoiceRef {
  if (s.mode === 'read') return { line: 'g1-measure/whatTime' }
  return { template: s.time.half ? 'g1-measure/tapHalf' : 'g1-measure/tapOclock', slots: { hour: s.time.hour } }
}

/** The wrong cards for a time: the mistakes children make with each kind of question. */
export function clockDistractors(mode: ClockSpec['mode'], t: ClockTime, coin: () => boolean): ClockTime[] {
  if (!t.half) {
    // o'clock: the hour next door (or 12, reading the long hand as the hour), and half past the same hour
    const other = mode === 'read' && t.hour !== 12 && coin() ? 12 : coin() ? nextHour(t.hour) : prevHour(t.hour)
    return [
      { hour: other, half: false },
      { hour: t.hour, half: true },
    ]
  }
  // half past: reading the clock, the short hand is nearly at the next number ("half past 4" for 3:30);
  // finding the clock, the one whose short hand is just before the number; and the hour itself
  return [
    { hour: mode === 'read' ? nextHour(t.hour) : prevHour(t.hour), half: true },
    { hour: t.hour, half: false },
  ]
}

// ── the provider ─────────────────────────────────────────────────────────────

const PRAISE: Record<G1MeasureMode, VoiceRef[]> = {
  order: [{ line: 'g1-measure/inOrder' }, { line: 'g1-measure/greatMeasuring' }],
  units: [{ line: 'g1-measure/greatMeasuring' }, { line: 'g1-measure/endToEnd' }],
  time: [{ line: 'g1-measure/timeTeller' }, { line: 'g1-measure/greatMeasuring' }],
}

const SKILL: Record<G1MeasureMode, { id: string; label: string }> = {
  order: { id: 'g1-measure-order', label: 'putting lengths in order' },
  units: { id: 'g1-measure-units', label: 'measuring with paper clips and cubes' },
  time: { id: 'g1-time', label: 'time to the hour and half hour' },
}

/** One question of a round. */
type Plan =
  | { q: 'order'; ask: 'long' | 'short'; diff: readonly [number, number]; outOfLine?: boolean }
  | { q: 'third'; ask: 'long' | 'short' }
  | { q: 'units'; unit: UnitKind; lay: boolean; n: readonly [number, number] }
  | { q: 'rightWay'; unit: UnitKind }
  | { q: 'clock'; mode: ClockSpec['mode']; half: boolean }

function roundPlan(mode: G1MeasureMode, coin: () => boolean): Plan[] {
  switch (mode) {
    case 'order':
      return [
        { q: 'order', ask: 'long', diff: [3, 4] },
        { q: 'order', ask: 'short', diff: [2, 3] },
        { q: 'third', ask: 'long' },
        { q: 'order', ask: 'long', diff: [2, 3], outOfLine: true },
        { q: 'order', ask: 'short', diff: [2, 2], outOfLine: true },
        { q: 'third', ask: coin() ? 'short' : 'long' },
      ]
    case 'units': {
      const first: UnitKind = coin() ? 'clip' : 'cube'
      return [
        { q: 'units', unit: 'clip', lay: false, n: [3, 5] },
        { q: 'units', unit: 'cube', lay: false, n: [4, 6] },
        { q: 'units', unit: 'clip', lay: true, n: [4, 6] },
        { q: 'rightWay', unit: first },
        { q: 'units', unit: 'cube', lay: true, n: [5, 8] },
        { q: 'rightWay', unit: first === 'clip' ? 'cube' : 'clip' },
      ]
    }
    case 'time':
      return [
        { q: 'clock', mode: 'read', half: false },
        { q: 'clock', mode: 'show', half: false },
        { q: 'clock', mode: 'read', half: true },
        { q: 'clock', mode: 'show', half: true },
        { q: 'clock', mode: 'say', half: coin() },
        { q: 'clock', mode: coin() ? 'read' : 'say', half: true },
      ]
  }
}

/** Colours a set of things can take (indexes into the measure palette: easy to tell apart). */
const COLOR_SETS: readonly (readonly number[])[] = [
  [0, 3, 1],
  [2, 4, 0],
  [3, 1, 6],
  [7, 3, 2],
  [6, 0, 4],
  [1, 4, 2],
]

export function makeG1MeasureProvider(cfg: G1MeasureConfig = {}): Omit<ProblemProvider, 'next'> & { next(): ListenProblem } {
  const mode: G1MeasureMode = cfg.mode && cfg.mode in PRAISE ? cfg.mode : 'order'
  const orderThings = makeDeck(Object.keys(PLURAL) as LengthThing[])
  const thirdThings = makeDeck(G1_THIRD_THINGS)
  const unitThings = makeDeck(G1_UNIT_THINGS)
  const colors = makeDeck(COLOR_SETS)
  const hours = makeDeck(Array.from({ length: 12 }, (_, i) => i + 1))
  const places = makePositionGuard()
  const coin = () => randInt(0, 1) === 0
  let plan: Plan[] = []
  let asked = 0
  let serial = 0
  let lastWrong: UnitWay | '' = ''
  let lastThirdAt = -1

  /** Three different sizes, `diff` apart (a step of at least two units: easy to see). */
  function threeSizes(diff: readonly [number, number], maxBig: number): number[] {
    for (;;) {
      const d1 = randInt(diff[0], diff[1])
      const d2 = randInt(diff[0], diff[1])
      const small = randInt(2, Math.max(2, maxBig - d1 - d2))
      const big = small + d1 + d2
      if (big <= maxBig) return shuffle([big, small + d2, small])
    }
  }

  function order(p: Extract<Plan, { q: 'order' }>): ListenProblem {
    const thing = orderThings.next()
    // out of line, they start further along: the shortest sticking out past the longest's end
    const maxBig = p.outOfLine ? 7 : 10
    let sizes = threeSizes(p.diff, maxBig)
    // the first to tap never in the same place three times running
    for (let tries = 0; tries < 8 && places.wouldRepeat(orderOf(sizes, p.ask)[0]); tries++) sizes = shuffle(sizes)
    let starts: number[] | undefined
    if (p.outOfLine) {
      // the shorter a thing is, the further along it starts: the ends come out in the wrong
      // order (the shortest sticks out furthest), until they slide back to the start line
      const [s0, s1, s2] = orderOf(sizes, 'short')
      const top = sizes[s2]
      starts = sizes.map(() => 0)
      starts[s1] = top + 1 - sizes[s1]
      starts[s0] = top + 2 + (top <= 6 ? randInt(0, 1) : 0) - sizes[s0]
    }
    const spec: LengthOrderSpec = { kind: 'lengthOrder', mode: 'order', thing, sizes, ...(starts ? { starts } : {}), colors: shuffle(colors.next()), ask: p.ask, answer: orderOf(sizes, p.ask) }
    places.note(spec.answer[0])
    const speech = lengthOrderSpeech(spec)
    return {
      ...base('order', speech, spec.answer.join('-'), p.outOfLine ? 3 : 2),
      activity: spec,
    }
  }

  function third(p: Extract<Plan, { q: 'third' }>): ListenProblem {
    const thing = thirdThings.next()
    // two sizes 3–8, at least two apart, the string strictly between them
    const lo = randInt(3, 5)
    const hi = randInt(lo + 2, Math.min(8, lo + 3))
    const str = randInt(lo + 1, hi - 1)
    // the longer one lies down (0) or hangs down (1), never in one place three times running
    let longAt = coin() ? 0 : 1
    const answerAt = (la: number) => (p.ask === 'long' ? la : 1 - la)
    if (answerAt(longAt) === lastThirdAt && coin()) longAt = 1 - longAt
    lastThirdAt = answerAt(longAt)
    const sizes = longAt === 0 ? [hi, lo] : [lo, hi]
    const spec: LengthOrderSpec = { kind: 'lengthOrder', mode: 'third', thing, sizes, string: str, colors: colors.next().slice(0, 2), ask: p.ask, answer: [answerAt(longAt)] }
    const speech = lengthOrderSpeech(spec)
    return { ...base('third', speech, String(spec.answer[0]), 3), activity: spec }
  }

  /** Numeral cards for `n`: n with its neighbours, the answer moving between places. */
  function numeralCards(n: number): number[] {
    const near = n <= 2 ? [n + 1, n + 2] : [n - 1, n + 1]
    const cards = places.arrange([n, ...near], n)
    places.note(cards.indexOf(n))
    return cards
  }

  function units(p: Extract<Plan, { q: 'units' }>): ListenProblem {
    const thing = unitThings.next()
    const n = randInt(p.n[0], p.n[1])
    const spec: UnitsSpec = { kind: 'units', thing, unit: p.unit, n, lay: p.lay, color: colors.next()[0], cards: numeralCards(n) }
    const speech = unitsSpeech(spec)
    return { ...base(p.lay ? 'lay' : 'count', speech, n, n), activity: spec }
  }

  function rightWay(p: Extract<Plan, { q: 'rightWay' }>): ListenProblem {
    // two of the three mistakes (the one shown last time sits out when it can)
    const pool = shuffle(UNIT_WAYS.filter((w): w is Exclude<UnitWay, 'right'> => w !== 'right'))
    const wrong = [...pool.filter((w) => w !== lastWrong), ...pool.filter((w) => w === lastWrong)].slice(0, 2)
    lastWrong = wrong[0]
    const options = places.arrange<UnitWay>(['right', ...wrong], 'right')
    places.note(options.indexOf('right'))
    const speech: VoiceRef = { line: 'g1-measure/rightWay' }
    const pictureOptions: PictureOption[] = options.map((how) => ({ value: how, picture: { kind: 'art', name: unitWayArt(how, p.unit) }, speech: { line: 'g1-measure/thisOne' } }))
    return {
      ...base('rightWay', speech, 'right', 2),
      options,
      pictureOptions,
      notes: options.map((how) => (how === 'right' ? null : WAY_NOTE[how])),
      cues: [{ target: 'cards' }],
      walkthrough: 'none',
    }
  }

  function clock(p: Extract<Plan, { q: 'clock' }>): ListenProblem {
    const time: ClockTime = { hour: hours.next(), half: p.half }
    const wrong = clockDistractors(p.mode, time, coin)
    const cards = places.arrange([time, ...wrong], time)
    places.note(cards.indexOf(time))
    const spec: ClockSpec = { kind: 'clockMatch', mode: p.mode, time, cards }
    const speech = clockSpeech(spec)
    return { ...base(`${p.mode}-${p.half ? 'half' : 'hour'}`, speech, digital(time), p.half ? 2 : 1), activity: spec }
  }

  const skill = SKILL[mode]
  function base(sub: string, speech: VoiceRef, answer: string | number, difficulty: number) {
    return {
      id: `g1measure-${serial++}`,
      topic: 'g1Measure',
      subtopic: sub,
      prompt: voiceText(speech),
      // (answered through the activity: it checks the answer itself)
      options: [] as (string | number)[],
      answer,
      difficulty,
      skill,
      speech,
      praise: PRAISE[mode],
    }
  }

  return {
    topic: 'g1Measure',
    reset() {
      asked = 0
      serial = 0
      plan = []
      lastWrong = ''
      lastThirdAt = -1
      places.reset()
    },
    next(): ListenProblem {
      if (asked % 6 === 0) plan = roundPlan(mode, coin)
      const p = plan[asked % 6]
      asked++
      switch (p.q) {
        case 'order':
          return order(p)
        case 'third':
          return third(p)
        case 'units':
          return units(p)
        case 'rightWay':
          return rightWay(p)
        case 'clock':
          return clock(p)
      }
    },
  }
}

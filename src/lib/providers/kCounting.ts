import type { PictureOption, ProblemProvider } from '../problem'
import type { ListenProblem } from '../../games/listenPlay/types'
import { K_COUNT_THINGS } from '../../voice/packs/k-math'
import type { VoiceRef } from '../../voice/types'
import { randInt, shuffle } from '../random'
import { makeKindPicker, makePositionGuard, pickOne } from './kShared'
import { traceQuestion } from './kTrace'

/**
 * Kindergarten counting and comparing, voice-first, for the Listen & Play
 * shell (Counting Mesa).
 *
 * `count` mode (K.CC.4–5), counts 1–20:
 * - "How many apples? Tap the number." — a group to count, numeral cards;
 * - "Tap the group with 5 apples." — a numeral to match, group cards ("find
 *   the group" starts at 2: no "1 apples"; past 10 it shows two cards).
 *
 * `compare` mode (K.CC.6–7), groups up to 10, numerals up to the range:
 * - "Which group has more?" / "…fewer?" — two group cards;
 * - "Are they the same? Tap yes or no." — two groups side by side, 👍 / 👎;
 * - "Which number is bigger?" — two numeral cards.
 *
 * Every problem carries its spoken question (`k-math` pack), a spoken label
 * per card, its own picture where it has one, the guide's cues and how the
 * walkthrough helps after a wrong pick (count the group, count both groups,
 * count up to the bigger number).
 *
 * `traceLast` (Count with me): the round's last question is "You counted 6!
 * Now trace a 6.", a trace of the numeral the question before it counted
 * (that one stays within 1–9, so there is always one numeral to trace).
 */

export type KCountingKind = 'howMany' | 'findGroup'
export type KCompareKind = 'more' | 'fewer' | 'same' | 'bigger'
export type KCountingItem = KCountingKind | KCompareKind
export type KThing = (typeof K_COUNT_THINGS)[number]

/** The picture for each countable thing in the k-math voice pack. */
export const K_THING_EMOJI: Record<KThing, string> = {
  apples: '🍎',
  stars: '⭐',
  fish: '🐟',
  ducks: '🦆',
  balls: '⚽',
  flowers: '🌼',
  bees: '🐝',
  cars: '🚗',
  cookies: '🍪',
  frogs: '🐸',
}

export const K_COUNT_MAX = 20
/** Groups to compare stay within 10 (K.CC.6); numerals go as far as the range. */
export const K_COMPARE_GROUP_MAX = 10

export interface KCountingConfig {
  /** `count` (how many / find the group, the default) or `compare` (more / fewer / same / bigger). */
  mode?: 'count' | 'compare'
  /** Smallest and largest count (defaults 1 and 10; at most 20). */
  min?: number
  max?: number
  /** Which question shapes to mix (default: the mode's). */
  kinds?: KCountingItem[]
  /** Answer cards per counting question: 2 or 3 (default 3). Comparisons always show two. */
  choices?: 2 | 3
  /**
   * The round's length (the stage's question count): its last question is a
   * trace of the number just counted (the `trace` activity). Rounds repeat
   * (question 2 × traceLast is a trace too); `reset()` starts a round.
   */
  traceLast?: number
}

const MODE_KINDS: Record<'count' | 'compare', KCountingItem[]> = {
  count: ['howMany', 'findGroup'],
  compare: ['more', 'fewer', 'same', 'bigger'],
}

/**
 * Two (or one) other counts near `n`: one a step away, one a little further,
 * so the cards differ but still make the child count.
 */
export function countDistractors(n: number, lo: number, hi: number, k: number): number[] {
  const near = shuffle([n - 1, n + 1].filter((v) => v >= lo && v <= hi))
  const far = shuffle([n - 2, n + 2, n - 3, n + 3].filter((v) => v >= lo && v <= hi))
  const out: number[] = []
  for (const v of [...near.slice(0, 1), ...far, ...near.slice(1)]) {
    if (out.length >= k) break
    if (!out.includes(v)) out.push(v)
  }
  return out
}

const say = (v: number): VoiceRef => ({ template: 'listen/number', slots: { n: v } })
const numeralCard = (v: number): PictureOption => ({ value: v, picture: { kind: 'numeral', n: v }, speech: say(v) })
const groupCard = (v: number, emoji: string): PictureOption => ({ value: v, picture: { kind: 'group', count: v, emoji }, speech: say(v) })

const COUNT_PRAISE: VoiceRef[] = [{ line: 'k-math/greatCounting' }, { line: 'k-math/youKnowNumbers' }]
const COMPARE_PRAISE: VoiceRef[] = [{ line: 'k-math/sharpEyes' }, { line: 'k-math/youKnowNumbers' }]

export function makeKCountingProvider(cfg: KCountingConfig = {}): Omit<ProblemProvider, 'next'> & { next(): ListenProblem } {
  const min = Math.max(1, cfg.min ?? 1)
  const max = Math.max(min + 1, Math.min(K_COUNT_MAX, cfg.max ?? 10))
  const kinds = cfg.kinds?.length ? cfg.kinds : MODE_KINDS[cfg.mode ?? 'count']
  const choices = cfg.choices ?? 3
  const traceLast = cfg.traceLast && cfg.traceLast >= 2 ? Math.floor(cfg.traceLast) : 0
  /** Questions asked this round (for `traceLast`). */
  let asked = 0
  let serial = 0
  let lastN = -1
  let lastThing = ''
  let lastSig = ''
  const sameAnswers: boolean[] = []
  const picker = makeKindPicker(kinds)
  const places = makePositionGuard()

  function pickThing(): KThing {
    const t = pickOne(K_COUNT_THINGS, [lastThing as KThing])
    lastThing = t
    return t
  }

  /** A count in [lo, hi], not the last answer. */
  function pickN(lo: number, hi: number): number {
    if (lo >= hi) return hi
    let n: number
    do n = randInt(lo, hi)
    while (n === lastN)
    return n
  }

  const base = (n: number, kind: KCountingItem) => ({
    id: `kcount-${serial++}`,
    topic: 'kCounting',
    subtopic: kind,
    difficulty: n,
  })

  function count(kind: KCountingKind, hiCap = max): ListenProblem {
    const thing = pickThing()
    const emoji = K_THING_EMOJI[thing]
    // "find the group" needs a plural ("2 apples" and up)
    const lo = kind === 'findGroup' ? Math.max(2, min) : min
    const n = pickN(lo, Math.max(lo, Math.min(max, hiCap)))
    // past ten, a group card is crowded: two cards, not three
    const cards = kind === 'findGroup' && n > 10 ? 2 : choices
    const options = places.arrange([n, ...countDistractors(n, kind === 'findGroup' ? Math.max(1, min) : min, max, cards - 1)], n)
    const common = {
      ...base(n, kind),
      options,
      answer: n,
      praise: COUNT_PRAISE,
      // (the array visual lets a grade 2–4 quiz host show the same question)
      visual: { kind: 'array' as const, rows: 1, cols: n, itemEmoji: emoji },
    }
    if (kind === 'howMany') {
      return {
        ...common,
        prompt: `How many ${thing}?`,
        skill: { id: 'k-count', label: 'counting to 20' },
        speech: { template: 'k-math/howMany', slots: { thing } },
        picture: { kind: 'group', count: n, emoji },
        pictureOptions: options.map(numeralCard),
        cues: [
          { target: 'picture' },
          { target: 'cards', cue: 'Tap' },
        ],
      }
    }
    return {
      ...common,
      prompt: `Tap the group with ${n} ${thing}.`,
      skill: { id: 'k-count', label: 'counting to 20' },
      speech: { template: 'k-math/findGroup', slots: { n, thing } },
      picture: { kind: 'numeral', n },
      pictureOptions: options.map((v) => groupCard(v, emoji)),
      cues: [
        { target: 'cards' },
        { target: 'picture', cue: 'with' },
        // (back to the cards as the line ends, and the hand stays there)
        { target: 'cards', cue: 1 },
      ],
    }
  }

  /** Two different counts a step or three apart, both in [lo, hi]. */
  function twoCounts(lo: number, hi: number): [number, number] {
    const d = randInt(1, Math.min(3, hi - lo))
    const small = randInt(lo, hi - d)
    return [small, small + d]
  }

  function compare(kind: KCompareKind): ListenProblem {
    const skill = { id: 'k-compare', label: 'more, fewer and the same' }
    if (kind === 'bigger') {
      const [a, b] = twoCounts(min, max)
      const options = places.arrange([a, b], b)
      return {
        ...base(b, kind),
        prompt: 'Which number is bigger?',
        options,
        answer: b,
        skill,
        praise: COMPARE_PRAISE,
        speech: { line: 'k-math/whichBigger' },
        pictureOptions: options.map(numeralCard),
        cues: [{ target: 'cards' }],
        walkthrough: 'countUp',
      }
    }
    const thing = pickThing()
    const emoji = K_THING_EMOJI[thing]
    const hi = Math.min(K_COMPARE_GROUP_MAX, max)
    if (kind === 'same') {
      // half the time the same; never the same answer three times running, and
      // (👍 first, always) never the answer in the same place three times running
      const two = sameAnswers.slice(-2)
      const equal = places.wouldRepeat(0) ? false : places.wouldRepeat(1) ? true : two.length === 2 && two[0] === two[1] ? !two[0] : randInt(0, 1) === 0
      sameAnswers.push(equal)
      let a: number
      let b: number
      if (equal) {
        a = b = randInt(Math.max(2, min), hi)
      } else {
        ;[a, b] = twoCounts(Math.max(1, min), hi)
        if (randInt(0, 1)) [a, b] = [b, a]
      }
      const answer = equal ? 'yes' : 'no'
      // 👍 then 👎, always: "yes or no", in the order they're said
      return {
        ...base(Math.max(a, b), kind),
        prompt: 'Are they the same? Tap yes or no.',
        options: ['yes', 'no'],
        answer,
        skill,
        praise: COMPARE_PRAISE,
        speech: { line: 'k-math/areSame' },
        pair: [
          { kind: 'group', count: a, emoji },
          { kind: 'group', count: b, emoji },
        ],
        pictureOptions: [
          { value: 'yes', picture: { kind: 'emoji', emoji: '👍' }, speech: { line: 'k-math/yes' } },
          { value: 'no', picture: { kind: 'emoji', emoji: '👎' }, speech: { line: 'k-math/no' } },
        ],
        cues: [
          { target: 'picture' },
          { target: 'card0', cue: 'yes' },
          { target: 'card1', cue: 'no' },
        ],
        walkthrough: 'each',
      }
    }
    const [small, big] = twoCounts(Math.max(1, min), hi)
    const answer = kind === 'more' ? big : small
    const options = places.arrange([small, big], answer)
    return {
      ...base(big, kind),
      prompt: kind === 'more' ? 'Which group has more?' : 'Which group has fewer?',
      options,
      answer,
      skill,
      praise: COMPARE_PRAISE,
      speech: { line: kind === 'more' ? 'k-math/whichMore' : 'k-math/whichFewer' },
      pictureOptions: options.map((v) => groupCard(v, emoji)),
      cues: [{ target: 'cards' }],
      walkthrough: 'each',
    }
  }

  return {
    topic: 'kCounting',
    reset() {
      serial = 0
      asked = 0
      lastN = -1
      lastThing = ''
      lastSig = ''
      sameAnswers.length = 0
      picker.reset()
      places.reset()
    },
    next(): ListenProblem {
      asked++
      if (traceLast && asked % traceLast === 0) {
        // "You counted 6! Now trace a 6." (the number the last question counted)
        const n = Number.isInteger(lastN) && lastN >= 1 && lastN <= 9 ? lastN : randInt(1, 9)
        return traceQuestion('digit', String(n), {
          id: `kcount-${serial++}`,
          topic: 'kCounting',
          subtopic: 'trace',
          speech: { line: `k-trace/counted-${n}` },
          skill: { id: 'k-count', label: 'counting to 20' },
          praise: COUNT_PRAISE,
        })
      }
      // (the question before a trace counts to 9 at most: one numeral to trace)
      const cap = traceLast && asked % traceLast === traceLast - 1 ? 9 : max
      // never the same question twice in a row
      for (let tries = 0; ; tries++) {
        const kind = picker.next()
        const p = kind === 'howMany' || kind === 'findGroup' ? count(kind, cap) : compare(kind)
        const sig = `${p.prompt}|${JSON.stringify(p.pair ?? p.pictureOptions?.map((o) => o.value))}`
        if (sig !== lastSig || tries >= 8) {
          lastSig = sig
          if (typeof p.answer === 'number') lastN = p.answer
          places.note(p.options.indexOf(p.answer))
          return p
        }
      }
    },
  }
}

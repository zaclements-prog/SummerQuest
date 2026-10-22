import type { ProblemProvider } from '../problem'
import type { ListenProblem } from '../../games/listenPlay/types'
import { MATCH_CARDS, matchAnswer, numbersAnswer, type MatchAnswer, type MatchSpec, type NumberOrderSpec, type NumbersSpec } from '../../games/listenPlay/activities/numberSpecs'
import { K_DUNES_MAX, K_PAIRS, type KPairId } from '../../voice/packs/k-compare'
import { voiceText } from '../../voice/registry'
import type { VoiceRef } from '../../voice/types'
import { randInt, shuffle } from '../random'
import { makeDeck, makePositionGuard } from './kShared'

/**
 * Kindergarten comparing (Number Dunes, K.CC.6–7 and K.CC.4c), voice-first,
 * for the Listen & Play shell. Every question is answered through one of the
 * number activities (src/games/listenPlay/activities), which show the help
 * a K child needs after a miss: the rows lined up and matched one to one, a
 * ten-frame under each number, the dots counted, the numbers counted in order.
 *
 * Modes (one per stage), each a round that ramps question by question
 * (`reset()` starts a round):
 * - `match` ("Line them up"): two rows of things that go together — more,
 *   fewer or the same. Small rows lined up in columns first; then rows spread
 *   out (match or count to tell), up to 10; "fewer" from the third; "the same"
 *   at least once a round.
 * - `numbers` ("Which is more?"): "Which number is more, seven or four?"
 *   (far apart first, then a step or two), "…less…", and one more / one less
 *   on a ten-frame.
 * - `lineUp` ("Numbers in order", the mastery): numbers in order (three, then
 *   four, then five in a row), with a line-up, a one more / one less and a
 *   close pair of numbers between them.
 */

export type KCompareMode = 'match' | 'numbers' | 'lineUp'

export interface KCompareConfig {
  mode?: KCompareMode
}

type Item =
  | { q: 'match'; lo: number; hi: number; gap: number; lined: boolean; fewer: boolean }
  | { q: 'numbers'; gap: [number, number]; first?: 'more' | 'less' }
  | { q: 'oneMore'; hi: number }
  | { q: 'oneLess'; lo: number }
  | { q: 'order'; length: number }

/** Each mode's round, question by question (a longer round starts the plan again, hardest half). */
const PLAN: Record<KCompareMode, Item[]> = {
  match: [
    { q: 'match', lo: 2, hi: 4, gap: 2, lined: true, fewer: false },
    { q: 'match', lo: 2, hi: 5, gap: 2, lined: true, fewer: false },
    { q: 'match', lo: 3, hi: 6, gap: 2, lined: false, fewer: true },
    { q: 'match', lo: 4, hi: 8, gap: 2, lined: false, fewer: true },
    { q: 'match', lo: 5, hi: 10, gap: 1, lined: false, fewer: true },
    { q: 'match', lo: 5, hi: 10, gap: 1, lined: false, fewer: true },
  ],
  numbers: [
    { q: 'numbers', gap: [3, 6], first: 'more' },
    { q: 'numbers', gap: [3, 5], first: 'less' },
    { q: 'oneMore', hi: 5 },
    { q: 'numbers', gap: [1, 2] },
    { q: 'oneLess', lo: 2 },
    { q: 'numbers', gap: [1, 1] },
  ],
  lineUp: [
    { q: 'order', length: 3 },
    { q: 'match', lo: 4, hi: 9, gap: 2, lined: false, fewer: true },
    { q: 'order', length: 4 },
    { q: 'oneMore', hi: 9 },
    { q: 'numbers', gap: [1, 2] },
    { q: 'order', length: 5 },
  ],
}

const SKILL = {
  match: { id: 'k-match', label: 'matching: more, fewer and the same' },
  numbers: { id: 'k-compare-numbers', label: 'comparing numbers to 10' },
  oneMore: { id: 'k-one-more', label: 'one more and one less' },
  order: { id: 'k-number-order', label: 'putting numbers in order' },
} as const

const PRAISE: Record<keyof typeof SKILL, VoiceRef[]> = {
  match: [{ line: 'k-compare/greatMatching' }, { line: 'k-math/sharpEyes' }],
  numbers: [{ line: 'k-math/youKnowNumbers' }, { line: 'k-math/sharpEyes' }],
  oneMore: [{ line: 'k-math/youKnowNumbers' }, { line: 'k-math/greatCounting' }],
  order: [{ line: 'k-compare/inOrder' }, { line: 'k-math/youKnowNumbers' }],
}

/** Two different numbers in [lo, hi], `gap` apart (a step or more): [smaller, bigger]. */
function twoNumbers(lo: number, hi: number, gap: [number, number]): [number, number] {
  const d = randInt(Math.min(gap[0], hi - lo), Math.min(gap[1], hi - lo))
  const small = randInt(lo, hi - d)
  return [small, small + d]
}

/** A mix of 0…n−1 that isn't in order (nor the last mix). */
function mixUp(n: number, last: string): number[] {
  let m = shuffle(Array.from({ length: n }, (_, i) => i))
  for (let tries = 0; tries < 30 && (m.every((x, i) => x === i) || m.join('') === last); tries++) m = shuffle(m)
  if (m.every((x, i) => x === i)) m = [...m.slice(1), m[0]]
  return m
}

export function makeKCompareProvider(cfg: KCompareConfig = {}): Omit<ProblemProvider, 'next'> & { next(): ListenProblem } {
  const mode = cfg.mode ?? 'match'
  const plan = PLAN[mode]
  const pairs = makeDeck(K_PAIRS.map((p) => p.id))
  const places = makePositionGuard()
  let asked = 0
  let serial = 0
  let lastSig = ''
  let lastMix = ''
  /** This round's match answers so far ("the same" at least once a round, never three alike running). */
  const answers: MatchAnswer[] = []
  let lastAsk: 'more' | 'less' = 'less'

  const base = (subtopic: string, difficulty: number, skill: keyof typeof SKILL, speech: VoiceRef) => ({
    id: `kcompare-${serial++}`,
    topic: 'kCompare',
    subtopic,
    difficulty,
    skill: SKILL[skill],
    praise: PRAISE[skill],
    speech,
    prompt: voiceText(speech),
  })

  /** The answer the next line-up question should have. */
  function nextMatchAnswer(): MatchAnswer {
    const two = answers.slice(-2)
    const pool = MATCH_CARDS.filter((a) => !(two.length === 2 && two[0] === a && two[1] === a) && !places.wouldRepeat(MATCH_CARDS.indexOf(a)))
    // "the same" once a round at least: by the round's fourth line-up, if it hasn't come up
    if (!answers.includes('same') && answers.length >= 3 && pool.includes('same')) return 'same'
    const from = pool.length ? pool : [...MATCH_CARDS]
    return from[randInt(0, from.length - 1)]
  }

  function match(it: Extract<Item, { q: 'match' }>): ListenProblem {
    const answer = nextMatchAnswer()
    const ask: 'more' | 'fewer' = it.fewer && randInt(0, 1) === 1 ? 'fewer' : 'more'
    let top: number
    let bottom: number
    if (answer === 'same') {
      top = bottom = randInt(Math.max(2, it.lo), it.hi)
    } else {
      const [small, big] = twoNumbers(it.lo, it.hi, [1, it.gap])
      // the answer's row has more when asked "more", fewer when asked "fewer"
      const answerBig = ask === 'more'
      const answerCount = answerBig ? big : small
      const other = answerBig ? small : big
      ;[top, bottom] = answer === 'top' ? [answerCount, other] : [other, answerCount]
    }
    const pair: KPairId = pairs.next()
    const spec: MatchSpec = { kind: 'matchRows', pair, top, bottom, ask, lined: it.lined }
    if (matchAnswer(spec) !== answer) throw new Error('kCompare: a line-up question with the wrong answer')
    answers.push(answer)
    return {
      ...base(ask, Math.max(top, bottom), 'match', { line: `k-compare/ask-${ask}-${pair}` }),
      options: [...MATCH_CARDS],
      answer,
      activity: spec,
    }
  }

  function numbers(it: Extract<Item, { q: 'numbers' }>): ListenProblem {
    const ask: 'more' | 'less' = it.first ?? (lastAsk === 'more' ? 'less' : 'more')
    lastAsk = ask
    const [small, big] = twoNumbers(1, K_DUNES_MAX, it.gap)
    const answer = ask === 'more' ? big : small
    // the cards are in the order the numbers are said: the answer said first or second, by turns
    const [a, b] = places.arrange([small, big], answer)
    const spec: NumbersSpec = { kind: 'compareNumbers', ask, a, b, cards: [a, b] }
    return {
      ...base(ask, big, 'numbers', { line: `k-compare/${ask}-${a}-${b}` }),
      options: [a, b],
      answer: numbersAnswer(spec),
      activity: spec,
    }
  }

  function oneMoreLess(it: Extract<Item, { q: 'oneMore' | 'oneLess' }>): ListenProblem {
    const more = it.q === 'oneMore'
    const a = more ? randInt(1, Math.min(it.hi, K_DUNES_MAX - 1)) : randInt(Math.max(2, it.lo), K_DUNES_MAX)
    const answer = more ? a + 1 : a - 1
    // the number we started with (nothing changed), and one step too far (or the wrong way)
    const near = more ? (a + 2 <= K_DUNES_MAX ? [a, a + 2] : [a - 1, a]) : a - 2 >= 1 ? [a - 2, a] : [a, a + 1]
    const cards = places.arrange([answer, ...near], answer)
    const spec: NumbersSpec = { kind: 'compareNumbers', ask: it.q, a, cards }
    return {
      ...base(it.q, answer, 'oneMore', { line: `k-compare/${it.q}-${a}` }),
      options: cards,
      answer,
      activity: spec,
    }
  }

  function order(it: Extract<Item, { q: 'order' }>): ListenProblem {
    const start = randInt(1, K_DUNES_MAX - it.length + 1)
    const numbers = Array.from({ length: it.length }, (_, i) => start + i)
    const mixed = mixUp(it.length, lastMix)
    lastMix = mixed.join('')
    const spec: NumberOrderSpec = { kind: 'numberOrder', numbers, mixed }
    return {
      ...base('order', numbers[numbers.length - 1], 'order', { line: 'k-compare/orderAsk' }),
      // (answered by tapping them in order: the activity checks each tap)
      options: [],
      answer: numbers.join(' '),
      activity: spec,
    }
  }

  function make(it: Item): ListenProblem {
    switch (it.q) {
      case 'match':
        return match(it)
      case 'numbers':
        return numbers(it)
      case 'oneMore':
      case 'oneLess':
        return oneMoreLess(it)
      case 'order':
        return order(it)
    }
  }

  return {
    topic: 'kCompare',
    reset() {
      asked = 0
      serial = 0
      lastSig = ''
      lastMix = ''
      lastAsk = 'less'
      answers.length = 0
      pairs.reset()
      places.reset()
    },
    next(): ListenProblem {
      // past the plan (a longer round), its harder second half again
      const i = asked < plan.length ? asked : Math.floor(plan.length / 2) + ((asked - plan.length) % Math.ceil(plan.length / 2))
      asked++
      const it = plan[i]
      // never the same question twice in a row
      for (let tries = 0; ; tries++) {
        const p = make(it)
        const sig = `${p.prompt}|${JSON.stringify(p.activity)}`
        if (sig !== lastSig || tries >= 8) {
          lastSig = sig
          const at = p.options.indexOf(p.answer)
          if (at >= 0) places.note(at)
          return p
        }
        if (it.q === 'match') answers.pop()
      }
    },
  }
}

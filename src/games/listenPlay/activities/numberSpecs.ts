import { K_PAIRS, type KPairId } from '../../../voice/packs/k-compare'
import { COUNT_MAX } from '../../../voice/packs/listen'
import type { VoiceRef } from '../../../voice/types'
import type { ListenActivitySpec } from '../types'

/**
 * The number activities' questions (Number Dunes and Ten Frame Plateau, K.CC
 * and K.NBT.1): plain data, no React, so the providers can build them and the
 * tests can check them. Each activity draws its own stage and judges its own
 * tries (see ./index); `answerOf` is what a question's `answer` must be.
 */

// ── Number Dunes ─────────────────────────────────────────────────────────────

/**
 * "Line them up" (K.CC.6): two rows of things that go together (bees and
 * flowers), more, fewer or the same; the cards are the top thing, the bottom
 * thing and ⚖️ "the same". After a miss the rows line up, the pairs are
 * joined one to one, and what is left over shows which has more.
 */
export interface MatchSpec extends ListenActivitySpec {
  kind: 'matchRows'
  pair: KPairId
  /** How many in the top row and the bottom row (1–10). */
  top: number
  bottom: number
  ask: 'more' | 'fewer'
  /** Lined up in columns from the start (the matching is there to see), else each row spread out evenly. */
  lined: boolean
}

export type MatchAnswer = 'top' | 'bottom' | 'same'

/** Which card answers a match question: the row with more (or fewer), or "the same". */
export function matchAnswer(s: Pick<MatchSpec, 'top' | 'bottom' | 'ask'>): MatchAnswer {
  if (s.top === s.bottom) return 'same'
  return (s.top > s.bottom) === (s.ask === 'more') ? 'top' : 'bottom'
}

/** The match cards, in the order they are said: the top thing, the bottom thing, the same. */
export const MATCH_CARDS: readonly MatchAnswer[] = ['top', 'bottom', 'same']

/**
 * Two written numbers (K.CC.7) or one more / one less (K.CC.4c), answered
 * with numeral cards:
 * - `more` / `less`: "Which number is more, seven or four?" — the cards are
 *   `a` and `b` in the order said; after a miss each card shows its
 *   ten-frame, and the dots are counted;
 * - `oneMore` / `oneLess`: a ten-frame with `a` dots; one more drops in (or
 *   one hops away) as it is said; "How many now?"; after a miss the dots are
 *   counted.
 */
export interface NumbersSpec extends ListenActivitySpec {
  kind: 'compareNumbers'
  ask: 'more' | 'less' | 'oneMore' | 'oneLess'
  /** more / less: the first number said. oneMore / oneLess: the dots to start with. */
  a: number
  /** more / less: the second number said. */
  b?: number
  /** The numeral cards, in order. */
  cards: readonly number[]
}

export function numbersAnswer(s: Pick<NumbersSpec, 'ask' | 'a' | 'b'>): number {
  switch (s.ask) {
    case 'more':
      return Math.max(s.a, s.b ?? s.a)
    case 'less':
      return Math.min(s.a, s.b ?? s.a)
    case 'oneMore':
      return s.a + 1
    case 'oneLess':
      return s.a - 1
  }
}

/**
 * Numbers in order (K.CC.4c, K.CC.2): a short run of numbers within 10, mixed
 * up; tap them into the slots smallest first. A wrong tap wobbles (a try that
 * wasn't right); the help counts them in order, each lighting as it is said.
 */
export interface NumberOrderSpec extends ListenActivitySpec {
  kind: 'numberOrder'
  /** The numbers in order (3–5 in a row). */
  numbers: readonly number[]
  /** Where each one sits once mixed up: `mixed[k]` is the step (index into `numbers`) shown in place k. */
  mixed: readonly number[]
}

// ── Ten Frame Plateau ────────────────────────────────────────────────────────

/**
 * Teen numbers on two ten-frames (K.NBT.1), answered with cards:
 * - `howMany`: two ten-frames, a full ten on top and the ones below (dots, or
 *   things to count: `emoji`); numeral cards. The help lights the full ten
 *   ("A full ten!"), counts on the ones ("Eleven! Twelve! Thirteen!") and
 *   says "Ten and three more: thirteen.";
 * - `shows`: a numeral; ten-frame cards (the number, the ones alone without
 *   the ten, one off). The help counts the card that was tapped;
 * - `next`: three numbers counting up, then a blank (K.CC.2, to 20); numeral
 *   cards. The help counts on, lighting each number and then the blank.
 */
export interface TenFramesSpec extends ListenActivitySpec {
  kind: 'teenFrames'
  ask: 'howMany' | 'shows' | 'next'
  /** The answer: how many, the number shown, or the number that comes next. */
  n: number
  /** The cards: numerals (howMany, next) or how many dots each ten-frame card shows (shows). */
  cards: readonly number[]
  /** howMany: things to count instead of dots (an emoji), set out on the ten-frames. */
  emoji?: string
}

/**
 * Fill the ten-frames (K.NBT.1): "Make fourteen: a full ten and four more!"
 * Each tap puts the next counter in (the first frame first), said as it is
 * counted; ✓ when done. After a miss the help fills a full ten, counts on the
 * ones, and says "Ten and four more: fourteen."; the next try starts with
 * the full ten in place.
 */
export interface BuildSpec extends ListenActivitySpec {
  kind: 'buildTeen'
  /** How many to make (11–20). */
  n: number
}

export type NumberActivitySpec = MatchSpec | NumbersSpec | NumberOrderSpec | TenFramesSpec | BuildSpec

const KINDS = new Set(['matchRows', 'compareNumbers', 'numberOrder', 'teenFrames', 'buildTeen'])
export const isNumberSpec = (s: ListenActivitySpec | undefined): s is NumberActivitySpec => !!s && KINDS.has(s.kind)

/** What a question's `answer` is, worked out from its activity (the tests recompute it this way). */
export function answerOf(s: NumberActivitySpec): string | number {
  switch (s.kind) {
    case 'matchRows':
      return matchAnswer(s)
    case 'compareNumbers':
      return numbersAnswer(s)
    case 'numberOrder':
      return s.numbers.join(' ')
    case 'teenFrames':
      return s.n
    case 'buildTeen':
      return s.n
  }
}

/** A numeral card's name ("seven!"), from the Listen & Play kit. */
export const sayNumber = (n: number): VoiceRef => ({ template: 'listen/number', slots: { n } })

// ── what the activities say (the activities and the tests share these) ───────

/** "One, two, three." — the kit's count-along clip for 1…n. */
export const countLine = (n: number): VoiceRef => ({ line: `listen/count${Math.max(1, Math.min(COUNT_MAX, n))}` })

const pairOf = (id: KPairId) => K_PAIRS.find((p) => p.id === id) ?? K_PAIRS[0]

/** A line-up's cards' names, in card order: the top thing, the bottom thing, the same. */
export function matchCardLines(s: Pick<MatchSpec, 'pair'>): VoiceRef[] {
  const p = pairOf(s.pair)
  return [{ line: `k-compare/thing-${p.top.many}` }, { line: `k-compare/thing-${p.bottom.many}` }, { line: 'k-compare/same' }]
}

/**
 * A line-up's help: "Let's line them up!", the pairs counted, then "Every bee
 * has a flower. They are the same!" or "Some bees have no flower." and "There
 * are more bees!" (or "…fewer flowers!", as asked).
 */
export function matchHelpLines(s: MatchSpec): { lineUp: VoiceRef; count: VoiceRef; after: VoiceRef[] } {
  const p = pairOf(s.pair)
  const lineUp = { line: 'k-compare/lineUp' }
  const count = countLine(Math.min(s.top, s.bottom))
  if (s.top === s.bottom) return { lineUp, count, after: [{ line: `k-compare/same-${p.id}` }] }
  const more = s.top > s.bottom ? 'top' : 'bottom'
  const less = more === 'top' ? 'bottom' : 'top'
  const thing = s.ask === 'more' ? p[more].many : p[less].many
  return { lineUp, count, after: [{ line: `k-compare/left-${p.id}-${more}` }, { line: `k-compare/${s.ask}-${thing}` }] }
}

/**
 * Two numbers' help: "Let's count the dots on each one.", each card's dots
 * counted, "Seven is more than four." One more / one less: "Let's count
 * together.", the dots counted, "Six and one more is seven."
 */
export function numbersHelpLines(s: NumbersSpec): VoiceRef[] {
  if (s.ask === 'more' || s.ask === 'less') {
    const a = s.a
    const b = s.b ?? s.a
    const big = Math.max(a, b)
    const small = Math.min(a, b)
    return [{ line: 'k-compare/countEach' }, ...s.cards.map(countLine), { line: s.ask === 'more' ? `k-compare/isMore-${big}-${small}` : `k-compare/isLess-${small}-${big}` }]
  }
  return [{ line: 'listen/countTogether' }, countLine(numbersAnswer(s)), { line: `k-compare/${s.ask}Is-${s.a}` }]
}

/** Numbers in order: asked again after a miss, the help's line, then each number as it is said. */
export function orderLines(s: NumberOrderSpec): VoiceRef[] {
  return [{ line: 'k-compare/orderNext' }, { line: 'k-compare/orderHelp' }, ...s.numbers.map(sayNumber)]
}

/**
 * "A full ten!" (twice for twenty), each one more counted on ("Eleven!
 * Twelve!…"), then "Ten and three more: thirteen."
 */
export function tenAndMoreLines(n: number): VoiceRef[] {
  const full = { line: 'k-teens/fullTen' }
  const ones = n >= 20 ? [full] : Array.from({ length: Math.max(0, n - 10) }, (_, k) => sayNumber(11 + k))
  return [full, ...ones, { line: `k-teens/is-${Math.min(20, Math.max(10, n))}` }]
}

/** A ten-frame card counted after it was tapped: a full ten and more, or the ones alone ("That's only four…"). */
export function frameCardLines(v: number): VoiceRef[] {
  return v >= 10 ? tenAndMoreLines(v) : [countLine(v), { line: `k-teens/onlyOnes-${v}` }]
}

/** Every line a number question can say: asked, its cards' names, and its help (whichever card is tapped). */
export function numberLines(speech: VoiceRef | undefined, s: NumberActivitySpec): VoiceRef[] {
  const asked = speech ? [speech] : []
  switch (s.kind) {
    case 'matchRows': {
      const h = matchHelpLines(s)
      return [...asked, ...matchCardLines(s), h.lineUp, h.count, ...h.after]
    }
    case 'compareNumbers':
      return [...asked, ...s.cards.map(sayNumber), ...numbersHelpLines(s)]
    case 'numberOrder':
      return [...asked, ...orderLines(s)]
    case 'teenFrames': {
      const cards = s.cards.map(sayNumber)
      if (s.ask === 'howMany') return [...asked, ...cards, ...tenAndMoreLines(s.n)]
      if (s.ask === 'shows') return [...asked, ...cards, ...s.cards.flatMap(frameCardLines)]
      return [...asked, ...cards, { line: 'k-teens/countOn' }, ...[s.n - 3, s.n - 2, s.n - 1, s.n].map(sayNumber)]
    }
    case 'buildTeen':
      return [...asked, { line: 'k-teens/fillTen' }, ...tenAndMoreLines(s.n), ...Array.from({ length: s.n }, (_, k) => sayNumber(k + 1))]
  }
}

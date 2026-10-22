import type { VoiceRef } from '../../../voice/types'
import type { ListenActivitySpec } from '../types'

/**
 * Tens Plateau's questions (1st grade; 1.NBT.1–3, 1.NBT.5): plain data, no
 * React, so the provider can build them and the tests can check them. A rod
 * is a ten and a cube is a one (base-ten blocks); numbers run to 120.
 *
 * The `tens` activity (./TensQuiz) asks with cards:
 * - `howMany`: rods and cubes; numeral cards. Help: the rods counted by tens
 *   ("Ten, twenty, thirty."), the cubes counted on ("Thirty-one!…"), then
 *   "Three tens and six ones: thirty-six.";
 * - `shows`: a numeral; three base-ten cards (the number, its digits swapped,
 *   a ten off). Help: the card that was tapped, counted the same way;
 * - `tensIn`: a numeral; how many tens? (cards: the tens digit, the ones
 *   digit, the tens' worth). Help: its blocks appear and the tens are counted;
 * - `tenMore` / `tenLess`: rods and cubes; a rod rolls in (or away) as it is
 *   said; numeral cards. Help: the new number counted, "The ones stay the same.";
 * - `bigger` / `smaller`: two numeral cards (1.NBT.3). Help: the blocks under
 *   each, "Look at the tens first.", each said as tens and ones, then what
 *   decides it ("More tens is bigger!");
 * - `sign`: two numbers and a box between them; the cards are > < =. Help: as
 *   comparing, then "The open side faces the bigger number.";
 * - `next`: three numbers counting up and a blank (to 120, 1.NBT.1); numeral
 *   cards. Help: "Let's count on.", each number lit as it is said.
 *
 * The `buildTens` activity (./BuildTens): "Make thirty-six: three tens and six
 * ones!" — tap rods and cubes onto the mat, then ✓.
 */

export type TensAsk = 'howMany' | 'shows' | 'tensIn' | 'tenMore' | 'tenLess' | 'bigger' | 'smaller' | 'sign' | 'next'
export type TensSign = '>' | '<' | '='
export const TENS_SIGNS: readonly TensSign[] = ['>', '<', '=']

export interface TensSpec extends ListenActivitySpec {
  kind: 'tens'
  ask: TensAsk
  /**
   * howMany / shows / tensIn: the number. tenMore / tenLess: the number to
   * start from. bigger / smaller / sign: the number on the left (said first).
   * next: the number that comes next (the answer).
   */
  n: number
  /** bigger / smaller / sign: the number on the right. */
  m?: number
  /**
   * The cards, in order: numerals (howMany, tensIn, tenMore / tenLess,
   * bigger / smaller, next), the numbers the base-ten cards show (shows), or
   * signs (sign).
   */
  cards: readonly (number | TensSign)[]
  /** howMany: "Count the tens, then the ones." (else "Tap the number."). Compare: blocks under the numbers from the start. */
  scaffold?: boolean
}

export interface BuildTensSpec extends ListenActivitySpec {
  kind: 'buildTens'
  /** The number to make (11–99): its tens as rods, its ones as cubes. */
  n: number
}

export type G1TensActivitySpec = TensSpec | BuildTensSpec

export const isTensSpec = (s: ListenActivitySpec | undefined): s is G1TensActivitySpec => s?.kind === 'tens' || s?.kind === 'buildTens'

export const tensOf = (n: number) => Math.floor(n / 10)
export const onesOf = (n: number) => n % 10

/** Which sign makes "a ? b" true. */
export const signFor = (a: number, b: number): TensSign => (a > b ? '>' : a < b ? '<' : '=')

/** What a question's `answer` is, worked out from its activity (the tests recompute it this way). */
export function tensAnswer(s: G1TensActivitySpec): number | TensSign {
  if (s.kind === 'buildTens') return s.n
  const m = s.m ?? s.n
  switch (s.ask) {
    case 'howMany':
    case 'shows':
    case 'next':
      return s.n
    case 'tensIn':
      return tensOf(s.n)
    case 'tenMore':
      return s.n + 10
    case 'tenLess':
      return s.n - 10
    case 'bigger':
      return Math.max(s.n, m)
    case 'smaller':
      return Math.min(s.n, m)
    case 'sign':
      return signFor(s.n, m)
  }
}

/** The number the blocks show after a ten came or went (tenMore / tenLess), else the number. */
export const shownAfter = (s: TensSpec) => (s.ask === 'tenMore' ? s.n + 10 : s.ask === 'tenLess' ? s.n - 10 : s.n)

// ── what the activities say (the activities and the tests share these) ──────

/** A number card's name, or a count said on ("forty-seven!"). */
export const sayTens = (n: number): VoiceRef => ({ template: 'g1-tens/number', slots: { n } })

const SIGN_LINE: Record<TensSign, string> = { '>': 'g1-tens/greater', '<': 'g1-tens/less', '=': 'g1-tens/equal' }
/** A sign card's name: "Greater than!" */
export const saySign = (s: TensSign): VoiceRef => ({ line: SIGN_LINE[s] })

/** A card's name, whatever it shows. */
export const sayCard = (c: number | TensSign): VoiceRef => (typeof c === 'number' ? sayTens(c) : saySign(c))

/** "Ten, twenty, thirty." (nothing for no tens) */
export const tensCountLine = (n: number): VoiceRef | null => (tensOf(n) >= 1 ? { line: `g1-tens/tens-${Math.min(9, tensOf(n))}` } : null)

/** "Three tens and six ones: thirty-six." */
export const isLine = (n: number): VoiceRef => ({ line: `g1-tens/is-${n}` })

/**
 * Counting a number's blocks: the tens by tens (each rod lit on its word),
 * each cube counted on ("Thirty-one! Thirty-two!…"), then "Three tens and six
 * ones: thirty-six."
 */
export function countBlocksLines(n: number): { tens: VoiceRef | null; ones: VoiceRef[]; is: VoiceRef } {
  const t = tensOf(n)
  return { tens: tensCountLine(n), ones: Array.from({ length: onesOf(n) }, (_, k) => sayTens(t * 10 + k + 1)), is: isLine(n) }
}

const flat = (c: { tens: VoiceRef | null; ones: VoiceRef[]; is: VoiceRef }) => [...(c.tens ? [c.tens] : []), ...c.ones, c.is]

/** What decides a comparison: more tens, the same tens (then the ones), or the same number. */
export function decideLine(a: number, b: number): VoiceRef {
  if (a === b) return { line: 'g1-tens/sameNumber' }
  return { line: tensOf(a) === tensOf(b) ? 'g1-tens/sameTens' : 'g1-tens/moreTens' }
}

/** A comparison's help: "Look at the tens first.", each number's tens and ones, what decides it, and (signs) which way the sign opens. */
export function compareHelpLines(s: TensSpec): VoiceRef[] {
  const m = s.m ?? s.n
  return [{ line: 'g1-tens/tensFirst' }, isLine(s.n), isLine(m), decideLine(s.n, m), ...(s.ask === 'sign' && s.n !== m ? [{ line: 'g1-tens/openSide' }] : [])]
}

/** Every line a Tens Plateau question can say: asked, its cards' names, and its help (whichever card is tapped). */
export function tensLines(speech: VoiceRef | undefined, s: G1TensActivitySpec): VoiceRef[] {
  const asked = speech ? [speech] : []
  if (s.kind === 'buildTens') {
    // each tap says the running count; the help builds it and counts it
    const counts = Array.from({ length: s.n }, (_, k) => sayTens(k + 1))
    return [...asked, { line: 'g1-tens/letsMake' }, { line: 'g1-tens/tenOnesMakeTen' }, ...flat(countBlocksLines(s.n)), ...counts]
  }
  const cards = s.cards.map(sayCard)
  switch (s.ask) {
    case 'howMany':
      return [...asked, ...cards, ...flat(countBlocksLines(s.n))]
    case 'shows':
      return [...asked, ...cards, ...s.cards.flatMap((c) => (typeof c === 'number' ? flat(countBlocksLines(c)) : []))]
    case 'tensIn':
      return [...asked, ...cards, ...flat(countBlocksLines(s.n))]
    case 'tenMore':
    case 'tenLess':
      return [...asked, ...cards, ...flat(countBlocksLines(shownAfter(s))), { line: 'g1-tens/onesStay' }]
    case 'bigger':
    case 'smaller':
    case 'sign':
      return [...asked, ...cards, ...compareHelpLines(s)]
    case 'next':
      return [...asked, ...cards, { line: 'g1-tens/countOn' }, ...[s.n - 3, s.n - 2, s.n - 1, s.n].map(sayTens)]
  }
}

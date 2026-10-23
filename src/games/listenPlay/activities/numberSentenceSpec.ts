import type { VoiceRef } from '../../../voice/types'
import type { ListenActivitySpec } from '../types'

/**
 * The `numberSentence` activity's question (1st grade: Adding Mesa and
 * Take-Away Dunes, 1.OA.3–8), as plain data (no React), so providers and
 * tests can build and read it: a number sentence written big ("8 + 5 = ?",
 * "? + 4 = 9", "13 − 5 = ?"), a picture of a strategy under it (the
 * `model`), and numeral cards.
 *
 * Models (what is drawn, what a tap does, what the help shows):
 *
 * - `countOn`: the bigger number in a box, then a dot for each one to count
 *   on; a tap on a dot says the next number ("nine!", "ten!", "eleven!");
 * - `rows`: two rows of counters: a double (6 and 6), a near double (6 and
 *   7, the extra one marked), or a turn-around fact (3 and 5 swap places);
 * - `makeTen`: two ten-frames (8 and 5); a tap moves a counter from the
 *   second into the first until it is a full ten (then 10 and 3);
 * - `takeAway`: counters on ten-frames; a tap takes one away (crossed out);
 * - `countBack`: a path of numbered stones, a frog on the start; a tap hops
 *   it one back, said as it lands ("twelve!", "eleven!");
 * - `parts`: one part on ten-frames and dashed spots up to the whole; a tap
 *   fills a spot, counting up ("six!", "seven!"): think addition, and the
 *   missing number in "? + 4 = 9" or "9 − ? = 4";
 * - `family`: a fact-family house: the three numbers on the roof, four
 *   sentences in it, one with the unknown.
 *
 * With `act` the child does the model first (count on, take away, hop back,
 * fill, move to make ten): the cards open once it is done. Without it the
 * model is a help to tap, and the cards open with the question.
 */

export type SentenceSign = '+' | '−' | '='
/** A number sentence, left to right: numbers, signs and one unknown (`'?'`). */
export type SentenceToken = number | SentenceSign | '?'

export type FactModel =
  | { kind: 'countOn'; start: number; on: number }
  | { kind: 'rows'; top: number; bottom: number; turn?: boolean }
  | { kind: 'makeTen'; a: number; b: number }
  | { kind: 'takeAway'; whole: number; take: number }
  | { kind: 'countBack'; start: number; back: number }
  | { kind: 'parts'; whole: number; part: number }
  | { kind: 'family'; a: number; b: number; whole: number; sentences: readonly (readonly SentenceToken[])[]; blank: number }

export type FactModelKind = FactModel['kind']

/** What the help does to the model as a line is said. */
export type HelpDo =
  /** Light the model (or a part of it) without changing it. */
  | { kind: 'light'; part: 'model' | 'start' | 'top' | 'bottom' | 'extra' | 'first' | 'second' | 'roof' | 'house' }
  /** countOn: dot `i` gets its number. */
  | { kind: 'dot'; i: number; n: number }
  /** rows / takeAway leftovers / family: counter `i` (in reading order) gets number `n` in a count-along. */
  | { kind: 'count'; i: number; n: number }
  /** rows (a turn-around): the two rows swap places. */
  | { kind: 'turn' }
  /** makeTen: one more counter moves into the first frame. */
  | { kind: 'move'; n: number }
  /** takeAway: one more counter is taken away (`n`: how many so far). */
  | { kind: 'take'; n: number }
  /** countBack: the frog hops back one stone, landing on `to`. */
  | { kind: 'hop'; to: number }
  /** parts: one more empty spot fills, counted up to `n`. */
  | { kind: 'fill'; n: number }
  /** The unknown in the sentence shows its number. */
  | { kind: 'solve' }

export interface HelpBeat {
  voice: VoiceRef
  /** What it lights: the model (default) or the sentence. */
  target?: 'model' | 'sentence'
  /** Run as the line starts; a count-along of numbers runs one per beat. */
  do?: HelpDo
  /**
   * This beat says how it comes out ("Eight and three make eleven."): on a
   * first miss the help stops one step short and asks this instead ("So how
   * many in all?"), so the next try isn't parroting (see `helpAgain`).
   */
  short?: VoiceRef
}

export interface NumberSentenceSpec extends ListenActivitySpec {
  kind: 'numberSentence'
  /** The sentence asked (with one `'?'`). A fact family shows it in its house. */
  sentence: readonly SentenceToken[]
  /** A sentence that is already known, written above the question (a turn-around fact: "3 + 5 = 8"). */
  given?: readonly SentenceToken[]
  model: FactModel
  /** The numeral cards, in order. */
  cards: readonly number[]
  /** The number that goes where the `'?'` is. */
  answer: number
  /** The question, said with the sentence lit. */
  ask: VoiceRef
  /** Said next with the model lit (a strategy: "Start with the bigger number. Count on!"). */
  hint?: VoiceRef
  /** The child does the model first, after this prompt; the cards open once it is done. */
  act?: VoiceRef
  /** The help after a miss: lines, each doing something to the model as it is said. */
  help: readonly HelpBeat[]
  /** From the second miss: a more direct help (it ends by saying how it comes out). Default: `help` again. */
  helpAgain?: readonly HelpBeat[]
}

export const isNumberSentenceSpec = (s: { kind: string } | undefined | null): s is NumberSentenceSpec => s?.kind === 'numberSentence'

/** The value of a sentence with its unknown filled in by `x`: true when it is a true sentence. */
export function sentenceHolds(tokens: readonly SentenceToken[], x: number): boolean {
  const eq = tokens.indexOf('=')
  if (eq < 0) return false
  const side = (ts: readonly SentenceToken[]): number | null => {
    let total: number | null = null
    let sign: '+' | '−' = '+'
    for (const t of ts) {
      if (t === '+' || t === '−') {
        sign = t
        continue
      }
      if (t === '=') return null
      const v = t === '?' ? x : t
      total = total === null ? v : sign === '+' ? total + v : total - v
    }
    return total
  }
  const l = side(tokens.slice(0, eq))
  const r = side(tokens.slice(eq + 1))
  return l !== null && r !== null && l === r
}

/** The one number that makes the sentence true (0–20), or null when none or several do. */
export function solveSentence(tokens: readonly SentenceToken[]): number | null {
  const hits: number[] = []
  for (let x = 0; x <= 20; x++) if (sentenceHolds(tokens, x)) hits.push(x)
  return hits.length === 1 ? hits[0] : null
}

/** How many things the model has the child do when it acts it out (taps). */
export function actTaps(m: FactModel): number {
  switch (m.kind) {
    case 'countOn':
      return m.on
    case 'makeTen':
      return 10 - m.a
    case 'takeAway':
      return m.take
    case 'countBack':
      return m.back
    case 'parts':
      return m.whole - m.part
    case 'rows':
    case 'family':
      return 0
  }
}

/** The sentence as text ("8 + 5 = ?"), for captions, labels and tests. */
export function sentenceText(tokens: readonly SentenceToken[]): string {
  return tokens.map(String).join(' ')
}

/** Guide ids inside the activity. */
export const NS_SENTENCE = 'ns-sentence'
export const NS_MODEL = 'ns-model'

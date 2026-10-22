import { defineVoicePack } from '../types'
import { numberWord } from '../../lib/numberWords'

/**
 * Counting Towers for 1st grade (Tower Battlefront, `g1-towers-1..3`): the
 * addition and subtraction facts that build the towers (1.OA.6), shown as a
 * number sentence ("3 + 4") and said aloud. Each fact is recorded whole, and so
 * is its strategy line, said after a wrong pick: count on from the bigger
 * number, count back, or (taking away most of it) count up.
 */

export type G1Fact = { op: '+' | '-'; a: number; b: number }

/** Addition within 10 (`g1-towers-1`): both numbers 1 or more. */
export const ADD_10: readonly G1Fact[] = range(1, 9).flatMap((a) => range(1, 10 - a).map((b) => ({ op: '+' as const, a, b })))
/** Subtraction within 10 (`g1-towers-2`): 2–10 take away 1 or more, never all of it. */
export const SUB_10: readonly G1Fact[] = range(2, 10).flatMap((a) => range(1, a - 1).map((b) => ({ op: '-' as const, a, b })))
/** Addition past 10 (`g1-towers-3`): two numbers up to 10, making 11–20. */
export const ADD_20: readonly G1Fact[] = range(1, 10).flatMap((a) => range(Math.max(1, 11 - a), 10).map((b) => ({ op: '+' as const, a, b })))
/** Subtraction from the teens (`g1-towers-3`): 11–20 take away up to 10, leaving 10 or less. */
export const SUB_20: readonly G1Fact[] = range(11, 20).flatMap((a) => range(a - 10, 10).map((b) => ({ op: '-' as const, a, b })))

function range(lo: number, hi: number): number[] {
  const out: number[] = []
  for (let n = lo; n <= hi; n++) out.push(n)
  return out
}

export const factAnswer = (f: G1Fact) => (f.op === '+' ? f.a + f.b : f.a - f.b)
/** The number sentence as shown: "3 + 4", "9 − 3" (a real minus sign). */
export const factText = (f: G1Fact) => `${f.a} ${f.op === '+' ? '+' : '−'} ${f.b}`
/** Its voice-line id: `add-3-4`, `sub-9-3`. */
export const factId = (f: G1Fact) => `${f.op === '+' ? 'add' : 'sub'}-${f.a}-${f.b}`

const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

/** "Three plus four. Tap the answer." */
export function factQuestion(f: G1Fact): string {
  return `${cap(numberWord(f.a))} ${f.op === '+' ? 'plus' : 'minus'} ${numberWord(f.b)}. Tap the answer.`
}

/**
 * The strategy, said after a wrong pick. Adding: start at the bigger number
 * and count on the smaller ("Start at seven. Count on two: eight, nine!").
 * Taking away a little: count back ("Start at nine. Count back two: eight,
 * seven!"). Taking away most of it: count up from what is taken to the start
 * ("Count up from seven to nine: eight, nine. That's two!").
 */
export function factStrategy(f: G1Fact): string {
  const w = numberWord
  if (f.op === '+') {
    const big = Math.max(f.a, f.b)
    const small = Math.min(f.a, f.b)
    const steps = range(big + 1, big + small).map(w)
    return `Start at ${w(big)}. Count on ${w(small)}: ${steps.join(', ')}!`
  }
  const left = f.a - f.b
  if (f.b <= left || f.b <= 3) {
    const steps = range(left, f.a - 1).reverse().map(w)
    return `Start at ${w(f.a)}. Count back ${w(f.b)}: ${steps.join(', ')}!`
  }
  const steps = range(f.b + 1, f.a).map(w)
  return `Count up from ${w(f.b)} to ${w(f.a)}: ${steps.join(', ')}. That's ${w(left)}!`
}

/** Every fact a 1st-grade tower stage asks. */
export const ALL_FACTS: readonly G1Fact[] = [...ADD_10, ...SUB_10, ...ADD_20, ...SUB_20]

export default defineVoicePack({
  id: 'g1-towers',
  lines: {
    // the questions: the number sentence lights up as it is said, the numeral cards on "Tap"
    ...Object.fromEntries(ALL_FACTS.map((f) => [factId(f), factQuestion(f)])),
    // the strategy after a wrong pick
    ...Object.fromEntries(ALL_FACTS.map((f) => [`how-${factId(f)}`, factStrategy(f)])),
    // praise (taking turns with the kit's own and Counting Towers' "Tower power!")
    mathPower: 'Math power!',
    greatAdding: 'Great adding!',
    greatTakingAway: 'Great taking away!',
  },
})

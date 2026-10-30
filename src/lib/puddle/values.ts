import { fromDecimal, int, rat, type Rational } from '../numbers'

/**
 * Puddle Patrol's numbers (docs/superpowers/specs/2026-10-19-trending-games-plan.md
 * §3): the value a Mud Pudding carries on its tummy, in the form its band
 * reads it in. Every form has an exact value (`valueOf`), so a rule never
 * meets a floating-point surprise (0.50 is exactly ½).
 *
 * - `dots` (kindergarten): a group of dots to count, never a numeral to read.
 * - `sum` (1st grade): a number sentence, "3 + 2" or "7 − 2".
 * - `whole` (grades 2–5): a whole number.
 * - `frac` (grade 5): a fraction as written, NOT reduced ("3/6" stays 3/6).
 * - `dec` (grade 5): a decimal as written ("0.50" keeps its zero).
 */
export type PuddleValue =
  | { kind: 'dots'; n: number }
  | { kind: 'sum'; a: number; op: '+' | '-'; b: number }
  | { kind: 'whole'; n: number }
  | { kind: 'frac'; n: number; d: number }
  | { kind: 'dec'; text: string }

export const dots = (n: number): PuddleValue => ({ kind: 'dots', n })
export const whole = (n: number): PuddleValue => ({ kind: 'whole', n })
export const plus = (a: number, b: number): PuddleValue => ({ kind: 'sum', a, op: '+', b })
export const minus = (a: number, b: number): PuddleValue => ({ kind: 'sum', a, op: '-', b })
export const frac = (n: number, d: number): PuddleValue => ({ kind: 'frac', n, d })
export const dec = (text: string): PuddleValue => ({ kind: 'dec', text })

/** The exact value. */
export function valueOf(v: PuddleValue): Rational {
  switch (v.kind) {
    case 'dots':
    case 'whole':
      return int(v.n)
    case 'sum':
      return int(v.op === '+' ? v.a + v.b : v.a - v.b)
    case 'frac':
      return rat(v.n, v.d)
    case 'dec':
      return fromDecimal(v.text)
  }
}

/** A whole-number value (dots, sums, wholes), else null. */
export function wholeOf(v: PuddleValue): number | null {
  const r = valueOf(v)
  return r.d === 1 ? r.n : null
}

/** As written on the Pudding's label: "3 + 2", "7 − 2", "21", "3/6", "0.50" (dots: their count). */
export function valueText(v: PuddleValue): string {
  switch (v.kind) {
    case 'dots':
    case 'whole':
      return String(v.n)
    case 'sum':
      return `${v.a} ${v.op === '+' ? '+' : '−'} ${v.b}`
    case 'frac':
      return `${v.n}/${v.d}`
    case 'dec':
      return v.text
  }
}

/** A stable key (two Puddings with the same key look the same). */
export const valueKey = (v: PuddleValue): string => `${v.kind}:${valueText(v)}`

/** True for the forms a kindergartner or 1st grader meets (said aloud, shown as pictures). */
export const isPictureForm = (v: PuddleValue): boolean => v.kind === 'dots' || v.kind === 'sum'

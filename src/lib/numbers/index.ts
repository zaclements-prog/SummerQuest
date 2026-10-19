/**
 * The Number Model (docs/superpowers/specs/2026-10-19-trending-games-plan.md):
 * exact values plus the ways a child sees and hears them.
 *
 *   const v = numberValue(fromDecimal('1.5'), 'decimal')
 *   v.text   // "1.5"
 *   v.speech // "one point five"
 */
import type { NumberForm } from './format'
import { formatValue, speakValue } from './format'
import type { Rational } from './rational'

export * from './rational'
export * from './format'

/** A value with the form it is shown in, and what the narrator says for it. */
export interface NumberValue {
  value: Rational
  form: NumberForm
  /** As written ("¾", "0.25", "12"). */
  text: string
  /**
   * As spoken ("three quarters"). Plain text for now: the voice system turns
   * it into a recorded template + slots where one exists (K–5 plan §3).
   */
  speech: string
}

export function numberValue(value: Rational, form: NumberForm = 'numeral'): NumberValue {
  return { value, form, text: formatValue(value, form), speech: speakValue(value, form) }
}

import { isInteger, isTerminating, type Rational } from './rational'

/**
 * Display and speech forms of an exact value (see `rational.ts`). Pure strings
 * plus small "picture specs" (dot rows, fraction bars) that a canvas or SVG
 * renderer draws; nothing here touches the DOM.
 */

/** How a value is written on a gate, a badge or a card. */
export type NumberForm = 'numeral' | 'fraction' | 'decimal'

export const MINUS = '−' // − (a real minus sign, not a hyphen)
export const TIMES = '×' // ×
export const DIVIDE = '÷' // ÷

const VULGAR: Record<string, string> = {
  '1/2': '½',
  '1/3': '⅓',
  '2/3': '⅔',
  '1/4': '¼',
  '3/4': '¾',
  '1/5': '⅕',
  '2/5': '⅖',
  '3/5': '⅗',
  '4/5': '⅘',
  '1/6': '⅙',
  '5/6': '⅚',
  '1/8': '⅛',
  '3/8': '⅜',
  '5/8': '⅝',
  '7/8': '⅞',
}

/** The exact terminating decimal ("0.25", "1.5", "12"), or null when it doesn't terminate (⅓). */
export function decimalText(r: Rational): string | null {
  if (!isTerminating(r)) return null
  const sign = r.n < 0 ? '-' : ''
  let n = Math.abs(r.n)
  const whole = Math.floor(n / r.d)
  n -= whole * r.d
  if (n === 0) return `${sign}${whole}`
  let digits = ''
  // terminating: at most max(i, j) digits for d = 2^i 5^j (tiny here)
  for (let k = 0; k < 20 && n !== 0; k++) {
    n *= 10
    const q = Math.floor(n / r.d)
    digits += String(q)
    n -= q * r.d
  }
  return `${sign}${whole}.${digits}`
}

/**
 * A fraction as written for kids: vulgar-fraction glyphs when there is one
 * ("½", "¾"), a mixed number for improper ones ("1½"), whole numbers plain,
 * otherwise "5/12".
 */
export function fractionText(r: Rational, opts: { glyphs?: boolean } = {}): string {
  const glyphs = opts.glyphs ?? true
  if (isInteger(r)) return String(r.n)
  const sign = r.n < 0 ? MINUS : ''
  const n = Math.abs(r.n)
  const whole = Math.floor(n / r.d)
  const rest = n - whole * r.d
  const key = `${rest}/${r.d}`
  const part = glyphs && VULGAR[key] ? VULGAR[key] : key
  return `${sign}${whole > 0 ? whole : ''}${whole > 0 && !(glyphs && VULGAR[key]) ? ' ' : ''}${part}`
}

/** The value in the asked form (a decimal that doesn't terminate falls back to a fraction). */
export function formatValue(r: Rational, form: NumberForm = 'numeral'): string {
  if (form === 'decimal') return decimalText(r) ?? fractionText(r)
  if (form === 'fraction') return fractionText(r)
  return isInteger(r) ? String(r.n) : fractionText(r)
}

// ── Speech ──────────────────────────────────────────────────────────────────

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

/** A whole number in words, 0–999 999 ("three hundred twelve"); bigger ones stay digits. */
export function numberWords(k: number): string {
  if (!Number.isInteger(k)) return String(k)
  if (k < 0) return `minus ${numberWords(-k)}`
  if (k < 20) return ONES[k]
  if (k < 100) return TENS[Math.floor(k / 10)] + (k % 10 ? `-${ONES[k % 10]}` : '')
  if (k < 1000) return `${ONES[Math.floor(k / 100)]} hundred${k % 100 ? ` ${numberWords(k % 100)}` : ''}`
  if (k < 1_000_000) return `${numberWords(Math.floor(k / 1000))} thousand${k % 1000 ? ` ${numberWords(k % 1000)}` : ''}`
  return String(k)
}

const ORDINAL_PLURAL: Record<number, [string, string]> = {
  2: ['half', 'halves'],
  3: ['third', 'thirds'],
  4: ['quarter', 'quarters'],
  5: ['fifth', 'fifths'],
  6: ['sixth', 'sixths'],
  8: ['eighth', 'eighths'],
  10: ['tenth', 'tenths'],
  12: ['twelfth', 'twelfths'],
}

/**
 * How the narrator says a value: "seven", "three quarters", "one and a half",
 * "zero point two five" (decimal form reads digit by digit after the point).
 */
export function speakValue(r: Rational, form: NumberForm = 'numeral'): string {
  if (isInteger(r)) return numberWords(r.n)
  if (form === 'decimal') {
    const t = decimalText(r)
    if (t) {
      const [w, f] = t.replace('-', '').split('.')
      return `${r.n < 0 ? 'minus ' : ''}${numberWords(Number(w))} point ${f
        .split('')
        .map((c) => ONES[Number(c)])
        .join(' ')}`
    }
  }
  const n = Math.abs(r.n)
  const whole = Math.floor(n / r.d)
  const rest = n - whole * r.d
  const names = ORDINAL_PLURAL[r.d]
  const part = names ? `${numberWords(rest)} ${rest === 1 ? names[0] : names[1]}` : `${numberWords(rest)} over ${numberWords(r.d)}`
  const body = whole === 0 ? part : r.d === 2 && rest === 1 ? `${numberWords(whole)} and a half` : `${numberWords(whole)} and ${part}`
  return `${r.n < 0 ? 'minus ' : ''}${body}`
}

// ── Picture specs (drawn by the game's canvas / SVG renderers) ───────────────

/**
 * Dots for a small count laid out like ten-frames: rows of 5, a gap after
 * every ten. Returns [col, row] cells (col 0–4, row counting down) so 7 reads
 * as "5 and 2" at a glance (subitizing).
 */
export function dotCells(count: number): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i < Math.max(0, Math.floor(count)); i++) out.push([i % 5, Math.floor(i / 5)])
  return out
}

/** A fraction bar: `parts` equal pieces, `filled` of them shaded (wholes stack as full bars). */
export function fractionBar(r: Rational): { parts: number; filled: number; wholes: number } {
  const n = Math.abs(r.n)
  const wholes = Math.floor(n / r.d)
  return { parts: r.d, filled: n - wholes * r.d, wholes }
}

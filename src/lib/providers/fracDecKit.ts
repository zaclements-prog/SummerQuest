import { compare, gcd, isInteger, rat, type Rational } from '../numbers'
import { numberWords } from '../numbers/format'
import { randInt, shuffle } from '../random'

/**
 * Exact fraction and decimal helpers for the grade-5 providers (Fraction Falls,
 * Place Value Plateau, Tower Battlefront's gates). Fractions are exact
 * rationals (lib/numbers); decimals are whole numbers of THOUSANDTHS, so every
 * answer is computed and printed exactly (0.1 + 0.2 is 300 thousandths, never
 * 0.30000000000000004).
 */

/** A no-break space: keeps a mixed number ("2 1/3") on one line and reads as one token. */
export const NBSP = ' '
/** A real minus sign (not a hyphen). */
export const MINUS = '−'

export const lcm = (a: number, b: number) => (a / gcd(a, b)) * b

/**
 * A fraction as a 5th grader writes it: simplest form, a mixed number when it is
 * more than one ("1 5/12"), a whole number plain ("3").
 */
export function fracText(r: Rational): string {
  if (isInteger(r)) return String(r.n)
  const whole = Math.floor(r.n / r.d)
  const rest = r.n - whole * r.d
  return whole > 0 ? `${whole}${NBSP}${rest}/${r.d}` : `${rest}/${r.d}`
}

/** A fraction written exactly as given (not simplified): "4/6". */
export const rawFrac = (n: number, d: number) => `${n}/${d}`

/**
 * The answer plus up to `count` distractors, as option strings, shuffled.
 * A candidate is dropped when it is not positive, EQUALS the answer in value
 * (so "4/6" never sits beside the answer "2/3"), or repeats another option.
 * `fill` makes more near-misses when the misconceptions run out.
 */
export function fracOptions(answer: Rational, candidates: (Rational | null)[], fill: (k: number) => Rational, count = 3): { options: string[]; answer: string } {
  const answerText = fracText(answer)
  const seen = new Set<string>([answerText])
  const out: string[] = []
  const tryAdd = (c: Rational | null) => {
    if (!c || out.length >= count) return
    if (c.n <= 0 || compare(c, answer) === 0) return
    const t = fracText(c)
    if (seen.has(t)) return
    seen.add(t)
    out.push(t)
  }
  for (const c of candidates) tryAdd(c)
  for (let k = 1; out.length < count && k < 40; k++) tryAdd(fill(k))
  return { options: shuffle([answerText, ...out]), answer: answerText }
}

/** A safe rational: null instead of throwing on a zero or negative denominator. */
export function ratOrNull(n: number, d: number): Rational | null {
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || d <= 0) return null
  return rat(n, d)
}

/** A random proper fraction in simplest form with this denominator. */
export function properOf(d: number): Rational {
  for (;;) {
    const n = randInt(1, d - 1)
    if (gcd(n, d) === 1) return rat(n, d)
  }
}

export function pick<T>(xs: readonly T[]): T {
  return xs[randInt(0, xs.length - 1)]
}

/** A weighted pick: `[weight, value]` pairs. */
export function weighted<T>(pairs: readonly (readonly [number, T])[]): T {
  const total = pairs.reduce((s, [w]) => s + w, 0)
  let r = Math.random() * total
  for (const [w, v] of pairs) {
    r -= w
    if (r < 0) return v
  }
  return pairs[pairs.length - 1][1]
}

// ── decimals as whole thousandths ────────────────────────────────────────────

/** How many decimal places a thousandths value really needs (0–3). */
export function placesOf(milli: number): 0 | 1 | 2 | 3 {
  if (milli % 1000 === 0) return 0
  if (milli % 100 === 0) return 1
  if (milli % 10 === 0) return 2
  return 3
}

/**
 * A thousandths value as a decimal numeral: `decText(3470)` → "3.47",
 * `decText(3470, 3)` → "3.470", `decText(3000, 1)` → "3.0". The whole part
 * gets US digit grouping ("3,450"). Never fewer places than the value needs.
 */
export function decText(milli: number, places?: number): string {
  if (!Number.isSafeInteger(milli) || milli < 0) throw new RangeError(`decText: ${milli}`)
  const p = Math.max(places ?? 0, placesOf(milli))
  const whole = Math.floor(milli / 1000)
  const frac = milli % 1000
  const wholeText = whole.toLocaleString('en-US')
  if (p === 0) return wholeText
  return `${wholeText}.${String(frac).padStart(3, '0').slice(0, p)}`
}

/** "$4.15" from thousandths that are whole cents. */
export const dollarText = (milli: number) => `$${decText(milli, 2)}`

const PLACE_NAMES = ['', 'tenths', 'hundredths', 'thousandths'] as const
const PLACE_ONE = ['', 'tenth', 'hundredth', 'thousandth'] as const

/**
 * A decimal's name, the way it is read: "three and forty-two hundredths",
 * "seven thousandths", "five and one tenth". The "and" is the decimal point.
 */
export function decName(milli: number): string {
  const whole = Math.floor(milli / 1000)
  const p = placesOf(milli)
  if (p === 0) return numberWords(whole)
  const frac = Math.round((milli % 1000) / 10 ** (3 - p))
  const part = `${numberWords(frac)} ${frac === 1 ? PLACE_ONE[p] : PLACE_NAMES[p]}`
  return whole === 0 ? part : `${numberWords(whole)} and ${part}`
}

/** Round thousandths to the nearest `unit` thousandths (1000 = a whole, 100 = a tenth, 10 = a hundredth); halves round up. */
export const roundMilli = (milli: number, unit: number) => Math.floor((milli + unit / 2) / unit) * unit

/**
 * Decimal option strings: the answer (shown with `places`) plus distractors,
 * each a thousandths value with how to print it. A candidate is dropped when it
 * is negative, EQUALS the answer in value (2.3 and 2.30 never both show), or
 * repeats another option's value.
 */
export function decOptions(answer: number, places: number | undefined, candidates: ([number, number?] | null)[], fill: (k: number) => [number, number?], count = 3): { options: string[]; answer: string } {
  const answerText = decText(answer, places)
  const seen = new Set<number>([answer])
  const out: string[] = []
  const tryAdd = (c: [number, number?] | null) => {
    if (!c || out.length >= count) return
    const [v, p] = c
    if (!Number.isSafeInteger(v) || v < 0 || seen.has(v)) return
    seen.add(v)
    out.push(decText(v, p))
  }
  for (const c of candidates) tryAdd(c)
  for (let k = 1; out.length < count && k < 60; k++) tryAdd(fill(k))
  return { options: shuffle([answerText, ...out]), answer: answerText }
}

/** A thousandths value as an exact fraction (for a fraction ↔ decimal question). */
export const milliAsRational = (milli: number) => rat(milli, 1000)

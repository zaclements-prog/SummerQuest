/**
 * Exact numbers for the gate games (docs/superpowers/specs/2026-10-19-trending-games-plan.md,
 * "Shared foundation"): integers, fractions and decimals are all stored as a
 * rational `n / d` with `d > 0` and `gcd(|n|, d) = 1`, so comparisons and sums
 * are exact (0.1 + 0.2 is exactly 3/10, ½ of 7 is exactly 7/2).
 *
 * Pure and allocation-light: plain frozen objects, safe-integer arithmetic
 * (the games stay far below 2^53; anything that overflows throws instead of
 * silently rounding).
 */

export interface Rational {
  /** Numerator (any sign). */
  readonly n: number
  /** Denominator, always > 0. */
  readonly d: number
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) {
    const t = a % b
    a = b
    b = t
  }
  return a
}

function checkInt(v: number, what: string) {
  if (!Number.isSafeInteger(v)) throw new RangeError(`rational: ${what} must be a safe integer (got ${v})`)
}

/** The rational `n / d`, reduced. Throws on a zero denominator or non-integers. */
export function rat(n: number, d = 1): Rational {
  checkInt(n, 'numerator')
  checkInt(d, 'denominator')
  if (d === 0) throw new RangeError('rational: zero denominator')
  if (n === 0) return ZERO
  const g = gcd(n, d)
  const s = d < 0 ? -1 : 1
  return Object.freeze({ n: (s * n) / g, d: (s * d) / g })
}

export const ZERO: Rational = Object.freeze({ n: 0, d: 1 })
export const ONE: Rational = Object.freeze({ n: 1, d: 1 })

/** An integer as a rational. */
export const int = (k: number): Rational => rat(k, 1)

/**
 * A decimal, exactly: `"1.5"` → 3/2, `"0.25"` → 1/4, `"-2.125"` → -17/8. A number
 * argument goes through its shortest round-trip string (`0.1` → "0.1" → 1/10).
 */
export function fromDecimal(v: string | number): Rational {
  const s = typeof v === 'number' ? String(v) : v.trim()
  const m = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(s)
  if (!m) throw new RangeError(`rational: "${s}" is not a plain decimal`)
  const frac = m[3] ?? ''
  const scale = 10 ** frac.length
  const n = Number(m[2]) * scale + (frac ? Number(frac) : 0)
  return rat(m[1] === '-' ? -n : n, scale)
}

/** Parse "7", "3/4", "-2/6", "1.25" (also "1 1/2" as a mixed number). */
export function parseRational(s: string): Rational {
  const t = s.trim()
  const mixed = /^([+-]?\d+)\s+(\d+)\/(\d+)$/.exec(t)
  if (mixed) {
    const whole = Number(mixed[1])
    const f = rat(Number(mixed[2]), Number(mixed[3]))
    return whole < 0 ? sub(int(whole), f) : add(int(whole), f)
  }
  const frac = /^([+-]?\d+)\/([+-]?\d+)$/.exec(t)
  if (frac) return rat(Number(frac[1]), Number(frac[2]))
  return fromDecimal(t)
}

export function add(a: Rational, b: Rational): Rational {
  return rat(a.n * b.d + b.n * a.d, a.d * b.d)
}
export function sub(a: Rational, b: Rational): Rational {
  return rat(a.n * b.d - b.n * a.d, a.d * b.d)
}
export function mul(a: Rational, b: Rational): Rational {
  // cross-reduce first so products stay small
  const g1 = gcd(a.n, b.d) || 1
  const g2 = gcd(b.n, a.d) || 1
  return rat((a.n / g1) * (b.n / g2), (a.d / g2) * (b.d / g1))
}
export function div(a: Rational, b: Rational): Rational {
  if (b.n === 0) throw new RangeError('rational: division by zero')
  return mul(a, rat(b.d, b.n))
}
export function neg(a: Rational): Rational {
  return rat(-a.n, a.d)
}

/** -1, 0 or 1 as `a` is less than, equal to or greater than `b` (exact). */
export function compare(a: Rational, b: Rational): -1 | 0 | 1 {
  const l = a.n * b.d
  const r = b.n * a.d
  return l < r ? -1 : l > r ? 1 : 0
}
export const eq = (a: Rational, b: Rational) => a.n === b.n && a.d === b.d
export const lt = (a: Rational, b: Rational) => compare(a, b) < 0
export const gt = (a: Rational, b: Rational) => compare(a, b) > 0

export const isInteger = (a: Rational) => a.d === 1

/** The nearest double (for layout and animation only — never for comparisons). */
export const toNumber = (a: Rational) => a.n / a.d

/** The integer value; throws if `a` isn't whole (use where wholeness is a guarantee). */
export function toInt(a: Rational): number {
  if (a.d !== 1) throw new RangeError(`rational: ${a.n}/${a.d} is not a whole number`)
  return a.n
}

/** True when `a` has a terminating decimal form (its denominator is 2^i · 5^j). */
export function isTerminating(a: Rational): boolean {
  let d = a.d
  while (d % 2 === 0) d /= 2
  while (d % 5 === 0) d /= 5
  return d === 1
}

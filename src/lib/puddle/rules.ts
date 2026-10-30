import { compare, decimalText, eq, rat, type Rational } from '../numbers'
import { valueOf, valueText, wholeOf, type PuddleValue } from './values'

/**
 * Sprinkler rules: each tower washes ONLY the Puddings whose value fits its
 * rule. A rule knows how to say why a value fits ("5 × 5 = 25") and why it
 * doesn't ("21 is not a multiple of 5: 5 × 4 = 20, 5 × 5 = 25"), because
 * every bounce-off is a small lesson, never just "wrong".
 *
 * Ids are written as the rule reads: `dots-3`, `more-5`, `fewer-5`,
 * `make-10`, `even`, `odd`, `mult-5`, `factor-24`, `prime`, `eq-1/2`.
 */
export type RuleId =
  | `dots-${number}`
  | 'more-5'
  | 'fewer-5'
  | `make-${number}`
  | 'even'
  | 'odd'
  | `mult-${number}`
  | `factor-${number}`
  | 'prime'
  | `eq-${number}/${number}`

/** The tower's body (each rule family has its own silhouette). */
export type TowerShape = 'pump' | 'tulip' | 'mushroom' | 'lighthouse' | 'shell' | 'barrel'

export interface Rule {
  id: RuleId
  /** Its name on the card ("Multiples of 5", "Groups of 3"). */
  name: string
  /** The badge on the tower: a big mark and a small word over it ("×5" / "multiples"). */
  badge: { big: string; small?: string }
  /** K: the badge is this many dots (and `more-5` / `fewer-5`: an arrow up / down beside 5 dots). */
  badgeDots?: { n: number; arrow?: 'up' | 'down' }
  color: string
  shape: TowerShape
  fits(v: PuddleValue): boolean
  /** Why it fits, as a short sum ("5 × 5 = 25", "3 + 2 = 5"). */
  yes(v: PuddleValue): string
  /** Why it doesn't, in one plain line ("21 is not a multiple of 5: 5 × 4 = 20, 5 × 5 = 25"). */
  why(v: PuddleValue): string
}

const MULT_COLORS: Record<number, string> = {
  2: '#5fa8e8',
  3: '#b48ae8',
  4: '#4fc1b0',
  5: '#f29a52',
  6: '#e86f8f',
  7: '#7fc85a',
  10: '#e8c23d',
}
const DOT_COLORS = ['#5fa8e8', '#f29a52', '#b48ae8', '#e86f8f', '#4fc1b0']
const MAKE_COLORS: Record<number, string> = { 3: '#4fc1b0', 4: '#b48ae8', 5: '#f29a52', 7: '#e86f8f', 10: '#5fa8e8', 15: '#7fc85a' }

/** The divisors of n, ascending. */
export function divisors(n: number): number[] {
  const out: number[] = []
  for (let k = 1; k <= n; k++) if (n % k === 0) out.push(k)
  return out
}

export function isPrime(n: number): boolean {
  if (n < 2 || !Number.isInteger(n)) return false
  for (let k = 2; k * k <= n; k++) if (n % k === 0) return false
  return true
}

/** "6 = 2 × 3" (the smallest factor pair past 1). */
function factorPair(n: number): string {
  for (let k = 2; k * k <= n; k++) if (n % k === 0) return `${n} = ${k} × ${n / k}`
  return `${n} = 1 × ${n}`
}

const sumText = (v: PuddleValue, n: number) => `${valueText(v)} = ${n}`

/** ½ ¼ ¾ ⅕ as a glyph where there is one. */
function fracGlyph(r: Rational): string {
  const g: Record<string, string> = { '1/2': '½', '1/4': '¼', '3/4': '¾', '1/5': '⅕', '1/3': '⅓', '2/3': '⅔' }
  return g[`${r.n}/${r.d}`] ?? `${r.n}/${r.d}`
}

/**
 * How a fraction or decimal that ISN'T the target reads beside it: the
 * target in the value's own terms where it can be ("half of 8 is 4, so ½ =
 * 4/8"), else both as decimals.
 */
function notEqual(v: PuddleValue, target: Rational): string {
  const t = fracGlyph(target)
  const text = valueText(v)
  if (v.kind === 'frac' && (v.d * target.n) % target.d === 0) {
    return `${text} is not ${t}: ${t} = ${(v.d * target.n) / target.d}/${v.d}`
  }
  if (v.kind === 'dec') return `${text} is not ${t}: ${t} = ${decimalText(target)}`
  const r = valueOf(v)
  const asDec = decimalText(r)
  return `${text} is not ${t}: ${text} = ${asDec ?? fracGlyph(r)}, ${t} = ${decimalText(target)}`
}

function equalWhy(v: PuddleValue, target: Rational): string {
  const t = fracGlyph(target)
  const text = valueText(v)
  if (v.kind === 'frac') {
    const k = v.d / target.d
    return Number.isInteger(k) && k > 1 ? `${text} = ${t} (${target.n} × ${k} = ${v.n}, ${target.d} × ${k} = ${v.d})` : `${text} = ${t}`
  }
  return `${text} = ${t}`
}

const cache = new Map<string, Rule>()

/** The rule for an id (cached; throws on an id it can't read). */
export function rule(id: RuleId): Rule {
  let r = cache.get(id)
  if (!r) {
    r = build(id)
    cache.set(id, r)
  }
  return r
}

function build(id: RuleId): Rule {
  let m: RegExpExecArray | null
  if ((m = /^dots-(\d+)$/.exec(id))) {
    const k = Number(m[1])
    const word = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'][k] ?? String(k)
    return {
      id,
      name: `Groups of ${k}`,
      badge: { big: String(k), small: 'dots' },
      badgeDots: { n: k },
      color: DOT_COLORS[(k - 2 + DOT_COLORS.length) % DOT_COLORS.length],
      shape: k % 2 ? 'tulip' : 'pump',
      fits: (v) => wholeOf(v) === k,
      yes: () => `${k} dots!`,
      why: (v) => `That's ${wholeOf(v)}, not ${word}.`,
    }
  }
  if (id === 'more-5' || id === 'fewer-5') {
    const more = id === 'more-5'
    return {
      id,
      name: more ? 'More than 5' : 'Fewer than 5',
      badge: { big: more ? '> 5' : '< 5', small: more ? 'more' : 'fewer' },
      badgeDots: { n: 5, arrow: more ? 'up' : 'down' },
      color: more ? '#e8c23d' : '#4fc1b0',
      shape: more ? 'lighthouse' : 'mushroom',
      fits: (v) => {
        const n = wholeOf(v)
        return n !== null && (more ? n > 5 : n < 5)
      },
      yes: (v) => `${wholeOf(v)} is ${more ? 'more' : 'fewer'} than 5.`,
      why: (v) => {
        const n = wholeOf(v)
        return n === 5 ? '5 is just 5.' : `${n} is ${more ? 'fewer' : 'more'} than 5.`
      },
    }
  }
  if ((m = /^make-(\d+)$/.exec(id))) {
    const k = Number(m[1])
    return {
      id,
      name: `Makes ${k}`,
      badge: { big: String(k), small: 'makes' },
      color: MAKE_COLORS[k] ?? '#5fa8e8',
      shape: k >= 10 ? 'lighthouse' : k % 2 ? 'tulip' : 'pump',
      fits: (v) => wholeOf(v) === k,
      yes: (v) => sumText(v, k),
      why: (v) => `${valueText(v)} makes ${wholeOf(v)}, not ${k}.`,
    }
  }
  if (id === 'even' || id === 'odd') {
    const even = id === 'even'
    return {
      id,
      name: even ? 'Even numbers' : 'Odd numbers',
      badge: { big: even ? 'EVEN' : 'ODD' },
      color: even ? '#5fa8e8' : '#f29a52',
      shape: even ? 'pump' : 'tulip',
      fits: (v) => {
        const n = wholeOf(v)
        return n !== null && (n % 2 === 0) === even
      },
      yes: (v) => {
        const n = wholeOf(v)!
        return even ? `${n} = ${n / 2} + ${n / 2}` : `${n} = ${(n - 1) / 2} + ${(n + 1) / 2}`
      },
      why: (v) => {
        const n = wholeOf(v)!
        return even ? `${n} is odd: ${n - 1} + 1 = ${n}` : `${n} is even: ${n / 2} + ${n / 2} = ${n}`
      },
    }
  }
  if ((m = /^mult-(\d+)$/.exec(id))) {
    const k = Number(m[1])
    return {
      id,
      name: `Multiples of ${k}`,
      badge: { big: `×${k}`, small: 'multiples' },
      color: MULT_COLORS[k] ?? '#5fa8e8',
      shape: k === 10 ? 'lighthouse' : k === 5 ? 'barrel' : k % 2 ? 'tulip' : 'pump',
      fits: (v) => {
        const n = wholeOf(v)
        return n !== null && n > 0 && n % k === 0
      },
      yes: (v) => {
        const n = wholeOf(v)!
        return `${k} × ${n / k} = ${n}`
      },
      why: (v) => {
        const n = wholeOf(v)!
        const q = Math.floor(n / k)
        return q === 0 ? `${n} is less than ${k}.` : `${n} is not a multiple of ${k}: ${k} × ${q} = ${k * q}, ${k} × ${q + 1} = ${k * (q + 1)}`
      },
    }
  }
  if ((m = /^factor-(\d+)$/.exec(id))) {
    const k = Number(m[1])
    return {
      id,
      name: `Factors of ${k}`,
      badge: { big: String(k), small: 'factors of' },
      color: k === 24 ? '#4fc1b0' : '#b48ae8',
      shape: 'mushroom',
      fits: (v) => {
        const n = wholeOf(v)
        return n !== null && n > 0 && k % n === 0
      },
      yes: (v) => {
        const n = wholeOf(v)!
        return `${n} × ${k / n} = ${k}`
      },
      why: (v) => {
        const n = wholeOf(v)!
        if (n > k) return `${n} is bigger than ${k}, so it can't be a factor.`
        return `${n} is not a factor of ${k}: ${k} ÷ ${n} = ${Math.floor(k / n)} R ${k % n}`
      },
    }
  }
  if (id === 'prime') {
    return {
      id,
      name: 'Prime numbers',
      badge: { big: 'PRIME' },
      color: '#e8c23d',
      shape: 'lighthouse',
      fits: (v) => isPrime(wholeOf(v) ?? 0),
      yes: (v) => `${wholeOf(v)} = 1 × ${wholeOf(v)} only`,
      why: (v) => {
        const n = wholeOf(v)!
        return n < 2 ? `${n} is not prime.` : `${n} is not prime: ${factorPair(n)}`
      },
    }
  }
  if ((m = /^eq-(\d+)\/(\d+)$/.exec(id))) {
    const target = rat(Number(m[1]), Number(m[2]))
    const glyph = fracGlyph(target)
    const colors: Record<string, string> = { '1/2': '#5fa8e8', '1/4': '#f29a52', '3/4': '#b48ae8', '1/5': '#7fc85a' }
    return {
      id,
      name: `Equal to ${glyph}`,
      badge: { big: `= ${glyph}`, small: 'equal to' },
      color: colors[`${target.n}/${target.d}`] ?? '#4fc1b0',
      shape: 'shell',
      fits: (v) => (v.kind === 'frac' || v.kind === 'dec') && eq(valueOf(v), target),
      yes: (v) => equalWhy(v, target),
      why: (v) => notEqual(v, target),
    }
  }
  throw new RangeError(`puddle: unknown rule "${id}"`)
}

/** The rules a value fits, of these. */
export const fitting = (v: PuddleValue, rules: readonly RuleId[]): RuleId[] => rules.filter((r) => rule(r).fits(v))

/** Two values in order (for the info card's tidy lists). */
export const byValue = (a: PuddleValue, b: PuddleValue) => compare(valueOf(a), valueOf(b))

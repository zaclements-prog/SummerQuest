import type { Problem, ProblemProvider } from '../problem'
import { randInt, shuffle } from '../random'
import { MINUS, decName, decOptions, decText, dollarText, pick, placesOf, roundMilli, weighted } from './fracDecKit'

/**
 * Place Value Plateau, 5th grade (CCSS 5.NBT.1, 5.NBT.3–4, 5.NBT.7, and the
 * powers-of-ten patterns of 5.NBT.2): decimals to thousandths read and written
 * as numerals, names and expanded form; a digit's value and the "ten times the
 * place to its right" pattern; comparing with > < =; rounding to any place;
 * +, −, × and ÷ to hundredths; × and ÷ by 10, 100, 1,000 (and 10², 10³).
 *
 * Every number is a whole count of THOUSANDTHS (3.472 is 3472), so answers are
 * exact and printed exactly (`decText`); distractors come from the classic
 * slips (the longer decimal looks bigger, a zero placeholder dropped, the point
 * slid the wrong way, digits lined up on the right) and never equal the answer
 * in value (2.3 and 2.30 never both show).
 *
 * Modes (one per stage):
 *  - `place`: read, write, expanded form, digit value, × 10 pattern, compare;
 *  - `roundOps`: rounding, powers of ten, + − × ÷;
 *  - `mixed`: all of it (the boss).
 */

export type G5DecMode = 'place' | 'roundOps' | 'mixed'

export interface G5DecimalsConfig {
  mode: G5DecMode
}

export const G5_DEC_SKILLS = {
  place: { id: 'g5-dec-place', label: 'reading and writing decimals' },
  compare: { id: 'g5-dec-compare', label: 'comparing decimals' },
  round: { id: 'g5-dec-round', label: 'rounding decimals' },
  ops: { id: 'g5-dec-ops', label: 'adding, subtracting, multiplying and dividing decimals' },
  pow10: { id: 'g5-dec-pow10', label: 'multiplying and dividing by powers of 10' },
} as const

const TOPIC = 'g5-decimals'

type Item = Omit<Problem, 'id' | 'topic'>

/** Thousandths per unit of each place: 1 → a tenth (100), 2 → a hundredth (10), 3 → a thousandth (1). */
const UNIT = [1000, 100, 10, 1] as const
const PLACE = ['ones', 'tenths', 'hundredths', 'thousandths'] as const

/** A decimal with exactly `places` places (its last digit not zero) and a whole part in [lo, hi]. */
export function randDec(places: 1 | 2 | 3, hi: number, lo = 0): number {
  const top = 10 ** places
  let f: number
  do f = randInt(1, top - 1)
  while (f % 10 === 0)
  return randInt(lo, hi) * 1000 + f * UNIT[places]
}

/** The digit of `milli` at a place (0 = ones, 1 = tenths, 2 = hundredths, 3 = thousandths). */
const digitAt = (milli: number, place: number) => Math.floor(milli / UNIT[place]) % 10

/** The same fractional digits read at another place ("42 hundredths" written as 42 thousandths: 3.042). */
function otherPlaces(milli: number): number[] {
  const p = placesOf(milli)
  if (p === 0) return []
  const whole = Math.floor(milli / 1000)
  const f = (milli % 1000) / UNIT[p]
  const out: number[] = []
  for (const q of [1, 2, 3] as const) if (q !== p && f < 10 ** q) out.push(whole * 1000 + f * UNIT[q])
  return out
}

/** "4 + 0.3 + 0.006" (zero digits left out). */
export function expandedText(milli: number): string {
  const terms: string[] = []
  const whole = String(Math.floor(milli / 1000))
  for (let i = 0; i < whole.length; i++) {
    const d = Number(whole[i])
    if (d) terms.push(String(d * 10 ** (whole.length - 1 - i)))
  }
  for (let p = 1; p <= 3; p++) {
    const d = digitAt(milli, p)
    if (d) terms.push(decText(d * UNIT[p]))
  }
  return terms.join(' + ')
}

// ── reading, writing, place value (5.NBT.1, 5.NBT.3a) ────────────────────────

/** "Which number is three and forty-two hundredths?" */
function nameToNumeral(): Item {
  const m = randDec(pick([1, 2, 3] as const), 20)
  const { options, answer } = decOptions(m, undefined, [...otherPlaces(m).map((v) => [v] as [number]), [m * 10]], (k) => [m + k * UNIT[placesOf(m)]])
  return {
    prompt: `Which number is ${decName(m)}?`,
    options,
    answer,
    subtopic: 'name-to-numeral',
    skill: G5_DEC_SKILLS.place,
    hint: `"And" is the decimal point. ${PLACE[placesOf(m)][0].toUpperCase()}${PLACE[placesOf(m)].slice(1)} means ${placesOf(m)} digit${placesOf(m) > 1 ? 's' : ''} after it.`,
    explanation: `${decName(m)} is written ${answer}.`,
  }
}

/** "How do you read 5.08?" → "five and eight hundredths". */
/** Names short enough for an answer button. */
const NAME_MAX = 36

function numeralToName(): Item {
  let m: number
  do m = randDec(pick([1, 2, 3] as const), 12)
  while (decName(m).length > NAME_MAX)
  const seen = new Set([m])
  const wrong: string[] = []
  const u = UNIT[placesOf(m)]
  for (const v of [...otherPlaces(m), m * 10, m + u, m - u, m + 2 * u, m - 2 * u, m + 3 * u, m + 4 * u]) {
    if (v <= 0 || seen.has(v) || wrong.length >= 3 || decName(v).length > NAME_MAX) continue
    seen.add(v)
    wrong.push(decName(v))
  }
  const answer = decName(m)
  return {
    prompt: `How do you read ${decText(m)}?`,
    options: shuffle([answer, ...wrong]),
    answer,
    subtopic: 'numeral-to-name',
    skill: G5_DEC_SKILLS.place,
    hint: `Read the whole number, say "and" for the point, then name the last place: ${PLACE[placesOf(m)]}.`,
    explanation: `${decText(m)} is read "${answer}".`,
  }
}

/** A decimal with a zero placeholder inside it sometimes (4.306), whole part 1–20. */
function placeholderDec(): number {
  const m = randDec(3, 20, 1)
  if (Math.random() < 0.6) {
    // knock out the tenths or hundredths digit
    const p = pick([1, 2])
    return m - digitAt(m, p) * UNIT[p]
  }
  return m
}

/** Fractional digits squeezed together without the zero placeholders (4.306 → 4.36). */
function squeezed(milli: number): number {
  const digits = [1, 2, 3].map((p) => digitAt(milli, p)).filter((d) => d > 0)
  return Math.floor(milli / 1000) * 1000 + digits.reduce((s, d, i) => s + d * UNIT[i + 1], 0)
}

/** "Which number is 4 + 0.3 + 0.006?" → 4.306. */
function expandedToStandard(): Item {
  const m = placeholderDec()
  const last = placesOf(m)
  const lastDigit = digitAt(m, last)
  const shifted = last > 1 ? m - lastDigit * UNIT[last] + lastDigit * UNIT[last - 1] : null
  const { options, answer } = decOptions(m, undefined, [[squeezed(m)], shifted === null ? null : [shifted], [m * 10]], (k) => [m + k * 100])
  return {
    prompt: `Which number is ${expandedText(m)}?`,
    options,
    answer,
    subtopic: 'expanded-to-standard',
    skill: G5_DEC_SKILLS.place,
    hint: 'Put each digit in its place. An empty place gets a 0.',
    explanation: `${expandedText(m)} = ${answer}.`,
  }
}

/** "Which shows 7.205 in expanded form?" */
function standardToExpanded(): Item {
  const m = placeholderDec()
  const last = placesOf(m)
  const lastDigit = digitAt(m, last)
  const candidates = [
    last > 1 ? m - lastDigit * UNIT[last] + lastDigit * UNIT[last - 1] : null,
    last < 3 ? m - lastDigit * UNIT[last] + lastDigit * UNIT[last + 1] : null,
    squeezed(m),
    m * 10,
    m + 100,
  ]
  const seen = new Set([m])
  const wrong: string[] = []
  for (const v of candidates) {
    if (v === null || seen.has(v) || wrong.length >= 3) continue
    seen.add(v)
    wrong.push(expandedText(v))
  }
  const answer = expandedText(m)
  return {
    prompt: `Which shows ${decText(m)} in expanded form?`,
    options: shuffle([answer, ...wrong]),
    answer,
    subtopic: 'standard-to-expanded',
    skill: G5_DEC_SKILLS.place,
    hint: 'Write each digit with its place value: tenths are 0.1s, hundredths 0.01s, thousandths 0.001s.',
    explanation: `${decText(m)} = ${answer}.`,
  }
}

/** "In 6.384, what is the value of the 8?" (a digit that appears once). */
function digitValue(): Item {
  for (;;) {
    const m = randDec(3, 9, 1)
    const text = decText(m)
    const place = pick([1, 2, 3, 1, 2])
    const d = digitAt(m, place)
    if (d === 0 || text.split('').filter((c) => c === String(d)).length !== 1) continue
    const value = d * UNIT[place]
    const { options, answer } = decOptions(value, undefined, [[d * 1000], [value * 10], place < 3 ? [value / 10] : [d * 10000], [d * 10000]], (k) => [value + k * UNIT[place]])
    return {
      prompt: `In ${text}, what is the value of the ${d}?`,
      options,
      answer,
      subtopic: 'digit-value',
      skill: G5_DEC_SKILLS.place,
      hint: `The ${d} is in the ${PLACE[place]} place.`,
      explanation: `The ${d} is ${d} ${PLACE[place]}, which is ${answer}.`,
    }
  }
}

/** "In 4.44, the 4 in the tenths place is how many times the 4 in the hundredths place?" (5.NBT.1). */
function tenTimes(): Item {
  const d = randInt(1, 9)
  const places = pick([2, 3])
  // the same digit in the ones place and every decimal place: 4.44 or 4.444
  let m = d * 1000
  for (let p = 1; p <= places; p++) m += d * UNIT[p]
  let a: number
  let b: number
  do {
    a = randInt(0, places)
    b = randInt(0, places)
  } while (a === b || Math.abs(a - b) > 2)
  const answer = a < b ? (b - a === 1 ? '10' : '100') : a - b === 1 ? '1/10' : '1/100'
  return {
    prompt: `In ${decText(m)}, the ${d} in the ${PLACE[a]} place is how many times the ${d} in the ${PLACE[b]} place?`,
    options: shuffle(['10', '100', '1/10', '1/100']),
    answer,
    subtopic: 'ten-times',
    skill: G5_DEC_SKILLS.place,
    hint: 'Each place is worth 10 times the place to its right, and 1/10 of the place to its left.',
    explanation: `${decText(d * UNIT[a])} is ${answer} times ${decText(d * UNIT[b])}.`,
  }
}

/** "0.45 ? 0.405": which sign? (the longer decimal is NOT always bigger; trailing zeros change nothing). */
function compareSign(): Item {
  let a: number
  let b: number
  let pa: number | undefined
  let pb: number | undefined
  const kind = weighted([
    [3, 'long'],
    [1, 'zeros'],
    [2, 'random'],
  ] as const)
  if (kind === 'long') {
    // a short decimal against a longer one with a smaller first digit: 0.5 vs 0.45
    const w = randInt(0, 9)
    const t = randInt(2, 9)
    a = w * 1000 + t * 100
    b = w * 1000 + (t - 1) * 100 + randInt(1, 9) * 10 + (Math.random() < 0.5 ? randInt(1, 9) : 0)
  } else if (kind === 'zeros') {
    a = randDec(pick([1, 2] as const), 9)
    b = a
    pa = placesOf(a)
    pb = 3
  } else {
    do {
      a = randDec(pick([1, 2, 3] as const), 9)
      b = randDec(pick([1, 2, 3] as const), 9)
    } while (a === b)
  }
  if (Math.random() < 0.5) [a, b, pa, pb] = [b, a, pb, pa]
  const answer = a < b ? '<' : a > b ? '>' : '='
  return {
    prompt: `${decText(a, pa)} ? ${decText(b, pb)}`,
    options: shuffle(['<', '>', '=']),
    answer,
    subtopic: 'compare',
    skill: G5_DEC_SKILLS.compare,
    hint: 'Compare place by place from the left. Add zeros so both have the same number of digits.',
    explanation: `${decText(a, 3)} ${answer} ${decText(b, 3)}, so ${decText(a, pa)} ${answer} ${decText(b, pb)}.`,
  }
}

/** "Which number is the greatest?" (or least) among four that tempt by length. */
function greatestOf(): Item {
  const w = randInt(0, 9)
  const t = randInt(2, 9)
  const big = w * 1000 + t * 100 // w.t
  const two = w * 1000 + (t - 1) * 100 + randInt(1, 9) * 10 // w.(t−1)d
  const three = w * 1000 + (t - 1) * 100 + randInt(0, 9) * 10 + randInt(1, 9) // w.(t−1)dd
  const small = w * 1000 + t * 10 // w.0t
  const vals = [...new Set([big, two, three, small])]
  const most = Math.random() < 0.7
  const key = most ? Math.max(...vals) : Math.min(...vals)
  const options = shuffle(vals.map((v) => decText(v)))
  return {
    prompt: most ? 'Which number is the greatest?' : 'Which number is the least?',
    options,
    answer: decText(key),
    subtopic: most ? 'greatest' : 'least',
    skill: G5_DEC_SKILLS.compare,
    hint: 'Look at the tenths first, not at how long the number is.',
    explanation: `Lined up to thousandths: ${vals.map((v) => decText(v, 3)).join(', ')}.`,
  }
}

export function placeItem(): Item {
  return weighted<() => Item>([
    [2, nameToNumeral],
    [2, numeralToName],
    [2, expandedToStandard],
    [1, standardToExpanded],
    [2, digitValue],
    [1, tenTimes],
    [3, compareSign],
    [1, greatestOf],
  ])()
}

// ── rounding (5.NBT.4) ───────────────────────────────────────────────────────

const ROUND_TO = [
  { label: 'whole number', unit: 1000, places: 0, next: 'tenths' },
  { label: 'tenth', unit: 100, places: 1, next: 'hundredths' },
  { label: 'hundredth', unit: 10, places: 2, next: 'thousandths' },
] as const

/** "Round 3.476 to the nearest tenth." */
export function roundItem(): Item {
  const to = pick(ROUND_TO)
  const m = randDec(Math.min(3, randInt(to.places + 1, 3)) as 1 | 2 | 3, 30, 1)
  const ans = roundMilli(m, to.unit)
  const trunc = Math.floor(m / to.unit) * to.unit
  const finer = to.unit > 10 ? roundMilli(m, to.unit / 10) : null
  const { options, answer } = decOptions(
    ans,
    to.places,
    [[trunc, to.places], [ans + to.unit, to.places], [ans - to.unit, to.places], finer === null ? null : [finer, to.places + 1]],
    (k) => [ans + (k + 1) * to.unit, to.places],
  )
  return {
    prompt: `Round ${decText(m)} to the nearest ${to.label}.`,
    options,
    answer,
    subtopic: `round-${to.label.split(' ')[0]}`,
    skill: G5_DEC_SKILLS.round,
    hint: `Look at the ${to.next} digit: 5 or more rounds up.`,
    explanation: `The ${to.next} digit is ${digitAt(m, to.places + 1)}, so ${decText(m)} rounds to ${answer}.`,
  }
}

// ── powers of ten (5.NBT.2) ──────────────────────────────────────────────────

const POW_TEXT = ['', '10', '100', '1,000'] as const
const POW_EXP = ['', '10¹', '10²', '10³'] as const

/** "3.45 × 100 = ?", "52.7 ÷ 100 = ?", "0.6 × 10² = ?" */
export function powersItem(): Item {
  const k = pick([1, 2, 3] as const)
  const times = Math.random() < 0.55
  const f = 10 ** k
  // ÷ keeps the answer within thousandths: the number has at most 3 − k places
  const m = times ? randDec(pick([1, 2, 3] as const), 60) : 3 - k === 0 ? randInt(2, 999) * 1000 : randDec(randInt(1, 3 - k) as 1 | 2, 99, 1)
  const result = times ? m * f : m / f
  const other = (j: number) => {
    const g = 10 ** j
    if (times) return m * g
    return m % g === 0 ? m / g : null
  }
  const wrongWay = times ? (m % f === 0 ? m / f : null) : m * f
  const cands: ([number, number?] | null)[] = [
    wrongWay === null ? null : [wrongWay],
    k > 1 ? [other(k - 1)!] : null,
    k < 3 && other(k + 1) !== null ? [other(k + 1)!] : null,
    // "just add zeros": the digits don't move
    times && placesOf(m) + k <= 3 ? [m, placesOf(m) + k] : null,
  ]
  // more choices: the same digits with the point moved further (34,100 → 341,000 or 341),
  // never a tacked-on ".1" or ".2" that no one would pick
  const shift = (j: number): [number] => [j % 2 ? result * 10 ** ((j + 1) / 2) : result / 10 ** (j / 2)]
  const { options, answer } = decOptions(result, undefined, cands, shift)
  const exp = Math.random() < 0.3
  const sign = times ? '×' : '÷'
  return {
    prompt: `${decText(m)} ${sign} ${exp ? POW_EXP[k] : POW_TEXT[k]} = ?`,
    options,
    answer,
    subtopic: `${times ? 'times' : 'divide'}-${f}`,
    skill: G5_DEC_SKILLS.pow10,
    hint: `${sign} ${POW_TEXT[k]} moves every digit ${k} place${k > 1 ? 's' : ''} to the ${times ? 'left' : 'right'}.`,
    explanation: `${decText(m)} ${sign} ${POW_TEXT[k]} = ${answer}.`,
  }
}

// ── +, −, ×, ÷ to hundredths (5.NBT.7) ───────────────────────────────────────

/** The digits of a decimal as a whole number (4.5 → 45): what lining digits up on the right adds. */
const digitsOnly = (milli: number) => milli / UNIT[placesOf(milli)]

function addSubDecimals(): Item {
  const money = Math.random() < 0.3
  const op = Math.random() < 0.5 ? '+' : '−'
  let a = money ? randInt(100, 999) * 10 : randDec(pick([1, 2] as const), 20)
  let b = money ? randInt(100, 999) * 10 : randDec(pick([1, 2] as const), 20)
  if (op === '−' && a < b) [a, b] = [b, a]
  if (a === b) a += 100
  const result = op === '+' ? a + b : a - b
  const pMax = Math.max(placesOf(a), placesOf(b), 1)
  // lining the digits up on the right ("4.5 + 2.37" as 45 + 237)
  const misDigits = op === '+' ? digitsOnly(a) + digitsOnly(b) : Math.abs(digitsOnly(a) - digitsOnly(b))
  const misaligned = placesOf(a) !== placesOf(b) ? misDigits * UNIT[pMax] : null
  const step = UNIT[pMax]
  const places = money ? 2 : undefined
  const { options, answer } = decOptions(
    result,
    places,
    [misaligned === null ? null : [misaligned, places], [result + 100, places], [result - 100, places], [result + 1000, places], [result + step, places]],
    (k) => [result + (k + 1) * step, places],
  )
  if (money) {
    const story =
      op === '+'
        ? `A notebook costs ${dollarText(a)} and a pen costs ${dollarText(b)}. How much do they cost together?`
        : `You have ${dollarText(a)}. You spend ${dollarText(b)}. How much money is left?`
    return {
      prompt: story,
      options: options.map((o) => `$${o}`),
      answer: `$${answer}`,
      subtopic: op === '+' ? 'add-money' : 'subtract-money',
      skill: G5_DEC_SKILLS.ops,
      hint: 'Line up the decimal points, then add or subtract like places.',
      explanation: `${dollarText(a)} ${op === '+' ? '+' : MINUS} ${dollarText(b)} = $${answer}.`,
    }
  }
  const sign = op === '+' ? '+' : MINUS
  return {
    prompt: `${decText(a)} ${sign} ${decText(b)} = ?`,
    options,
    answer,
    subtopic: op === '+' ? 'add' : 'subtract',
    skill: G5_DEC_SKILLS.ops,
    hint: `Line up the decimal points: ${decText(a, pMax)} ${sign} ${decText(b, pMax)}.`,
    explanation: `${decText(a, pMax)} ${sign} ${decText(b, pMax)} = ${answer}.`,
  }
}

/** "0.6 × 0.4 = ?", "3 × 1.5 = ?", "4 × 0.25 = ?", "2.4 × 3 = ?" (products to hundredths). */
function multiplyDecimals(): Item {
  const kind = pick(['tt', 'wt', 'wh', 'tw'] as const)
  let a: number
  let b: number
  if (kind === 'tt') {
    a = randInt(1, 9) * 100
    b = randInt(1, 9) * 100
    if (Math.random() < 0.4) a += randInt(1, 3) * 1000
  } else if (kind === 'wt' || kind === 'tw') {
    a = randInt(2, 9) * 1000
    b = randDec(1, 5)
    if (kind === 'tw') [a, b] = [b, a]
  } else {
    a = randInt(2, 9) * 1000
    b = pick([25, 50, 75, 5, 15, 35, 45]) * 10
  }
  const result = (a * b) / 1000
  const digits = digitsOnly(a) * digitsOnly(b)
  const { options, answer } = decOptions(
    result,
    undefined,
    [[result * 10], result % 10 === 0 ? [result / 10] : null, [digits * 1000], [result + UNIT[Math.max(1, placesOf(result))]]],
    (k) => [result + (k + 1) * UNIT[Math.max(1, placesOf(result))]],
  )
  const places = placesOf(a) + placesOf(b)
  return {
    prompt: `${decText(a)} × ${decText(b)} = ?`,
    options,
    answer,
    subtopic: `multiply-${kind}`,
    skill: G5_DEC_SKILLS.ops,
    hint: `Multiply ${digitsOnly(a)} × ${digitsOnly(b)} = ${digits}, then count the decimal places: ${places}.`,
    explanation: `${digitsOnly(a)} × ${digitsOnly(b)} = ${digits}, and ${places} decimal place${places === 1 ? '' : 's'} make ${answer}.`,
  }
}

/** "4.8 ÷ 4 = ?", "6.3 ÷ 0.7 = ?", "3 ÷ 0.5 = ?" (built from the quotient, so it is exact). */
function divideDecimals(): Item {
  const kind = pick(['dw', 'dd', 'wd'] as const)
  let q = 0
  let d: number
  if (kind === 'dw') {
    d = randInt(2, 9) * 1000
    q = randDec(pick([1, 2] as const), 3)
  } else if (kind === 'dd') {
    d = randInt(2, 9) * 100
    q = randInt(2, 9) * 1000
  } else {
    d = pick([500, 250, 200])
    q = randInt(1, 8) * (1000 * 1000) / d
    q = Math.round(q / 1000) * 1000
  }
  const n = (q * d) / 1000
  const { options, answer } = decOptions(
    q,
    undefined,
    [[q * 10], q % 10 === 0 ? [q / 10] : null, [q + UNIT[Math.max(1, placesOf(q))]], [q * 100]],
    (k) => [q + (k + 1) * UNIT[Math.max(1, placesOf(q))]],
  )
  return {
    prompt: `${decText(n)} ÷ ${decText(d)} = ?`,
    options,
    answer,
    subtopic: `divide-${kind}`,
    skill: G5_DEC_SKILLS.ops,
    hint: kind === 'dw' ? `Divide as if there were no point, then put it right above the point in ${decText(n)}.` : `Check by multiplying: ? × ${decText(d)} = ${decText(n)}.`,
    explanation: `${answer} × ${decText(d)} = ${decText(n)}.`,
  }
}

export function opsItem(): Item {
  return weighted<() => Item>([
    [3, addSubDecimals],
    [2, multiplyDecimals],
    [2, divideDecimals],
  ])()
}

// ── the provider ─────────────────────────────────────────────────────────────

function itemFor(mode: G5DecMode): Item {
  switch (mode) {
    case 'place':
      return placeItem()
    case 'roundOps':
      return weighted<() => Item>([
        [2, roundItem],
        [2, powersItem],
        [4, opsItem],
      ])()
    case 'mixed':
      return weighted<() => Item>([
        [3, placeItem],
        [2, roundItem],
        [2, powersItem],
        [3, opsItem],
      ])()
  }
}

export function makeG5DecimalsProvider(cfg: G5DecimalsConfig): ProblemProvider {
  let serial = 0
  return {
    topic: TOPIC,
    next(): Problem {
      return { id: `g5-dec-${serial++}`, topic: TOPIC, ...itemFor(cfg.mode) }
    },
  }
}

import { compare, decimalText, fromDecimal, int, rat, toNumber, type Rational } from '../numbers'

/**
 * Gobble Garden's number sets (docs/superpowers/specs/2026-10-19-trending-games-plan.md §2):
 * what the cloud's number climbs through in each band, and the snacks laid out
 * against it. Pure and seeded (every pick takes the caller's `rng`), so the
 * park, the provider and the tests share one source of snacks.
 *
 * Every snack is checked exactly (lib/numbers rationals): it is never equal to
 * the cloud's number (no "same size" snack: the rule is "smaller than"), and
 * an "edible" snack is always strictly smaller.
 */

export type GobbleSetId =
  /** Kindergarten (Number Dunes): dot groups and numerals 1–10. */
  | 'k'
  /** 1st grade (Tens Plateau): two-digit numbers, with tens-and-ones pictures. */
  | 'g1'
  /** Grades 2–4 (Place Value Plateau): whole numbers into the thousands, and simple expressions (3 + 4, 5 × 2). */
  | 'whole'
  /** Grades 2–4 (Fraction Falls): the same denominator, the same numerator, benchmarks against ½. */
  | 'frac'
  /** 5th grade (Place Value Plateau): decimals to thousandths. */
  | 'dec'
  /** 5th grade (Fraction Falls): fractions and decimals mixed ("you are 0.7: can you eat ⅝?"). */
  | 'fracDec'

export interface GobbleConfig {
  set: GobbleSetId
  /** `whole`: the grade's place-value reach (lib/gradeTiers: 1 000 in 2nd grade, 10 000 in 3rd, 100 000 in 4th); the snacks stay within the thousands. */
  maxPlace?: number
  /** `frac`: the largest denominator (the grade's: 8, 10 or 12). */
  maxDen?: number
}

/** How a value is written on a snack or on the cloud. */
export type SnackForm = 'dots' | 'numeral' | 'expr' | 'fraction' | 'decimal'

/**
 * The kind of comparison a snack makes against the cloud (the late-round
 * traps, the tests and the skill buckets read it):
 *
 * - `far` / `near`: a big or a small gap;
 * - `sameTens` (1st grade): the same tens digit, so the ones decide;
 * - `flip` (1st grade): the cloud's digits swapped (42 vs 24);
 * - `sameLead` (whole numbers): the same leading digit, so a later place decides;
 * - `expr`: an expression to work out first;
 * - `sameDen` / `sameNum` / `benchmark` (fractions): compare the tops, the
 *   bottoms (more pieces, smaller pieces), or each against ½;
 * - `longer` (decimals): the misleading length trap (0.65 is smaller than 0.7;
 *   0.5 is bigger than 0.45);
 * - `cross` (fractions and decimals): the other form from the cloud's.
 */
export type SnackFamily = 'far' | 'near' | 'sameTens' | 'flip' | 'sameLead' | 'expr' | 'sameDen' | 'sameNum' | 'benchmark' | 'longer' | 'cross' | 'other'

export interface NumberShown {
  value: Rational
  /** As written: "7", "3,409", "3 + 4", "5/8", "0.625". */
  text: string
  form: SnackForm
  /** A fraction as written (2/4 stays 2/4). */
  frac?: { n: number; d: number }
}

export interface SnackValue extends NumberShown {
  family: SnackFamily
}

type Rng = () => number

// ── formatting ───────────────────────────────────────────────────────────────

/** "3,409" (a thousands comma from 1 000; 2nd–4th grade write them). */
export function withCommas(k: number): string {
  return k >= 1000 ? k.toLocaleString('en-US') : String(k)
}

function shownInt(k: number, form: SnackForm = 'numeral'): NumberShown {
  return { value: int(k), text: withCommas(k), form }
}

function shownFrac(n: number, d: number): NumberShown {
  return { value: rat(n, d), text: `${n}/${d}`, form: 'fraction', frac: { n, d } }
}

function shownDec(r: Rational): NumberShown {
  return { value: r, text: decimalText(r) ?? String(toNumber(r)), form: 'decimal' }
}

/** Digits after the point (0.5 → 1, 0.625 → 3). */
export function decimalPlaces(r: Rational): number {
  const t = decimalText(r) ?? ''
  const i = t.indexOf('.')
  return i < 0 ? 0 : t.length - i - 1
}

// ── the cloud's ladder ───────────────────────────────────────────────────────

/**
 * The numbers the cloud climbs through, smallest first. Its number goes up one
 * rung each time its belly fills, and stops at the top (see park.ts on why
 * the number climbs a ladder instead of adding up everything eaten).
 */
export function cloudLadder(cfg: GobbleConfig): NumberShown[] {
  switch (cfg.set) {
    case 'k':
      // 1–10 on the snacks: from 8 up there would be no bigger snacks left to dodge
      return [4, 5, 6, 7, 8].map((k) => shownInt(k, 'dots'))
    case 'g1':
      return [25, 32, 38, 45, 53, 61, 68, 76, 84].map((k) => shownInt(k))
    case 'whole': {
      // 2nd grade within 1,000; 3rd into the thousands; 4th starts past the facts and stays in the thousands
      const max = cfg.maxPlace ?? 10000
      const rungs = max <= 1000 ? [12, 18, 30, 45, 80, 150, 300, 520, 800] : max <= 10000 ? [15, 30, 60, 150, 400, 900, 1600, 3200, 5400, 8100] : [60, 150, 400, 900, 1600, 3200, 5400, 7300, 8800]
      return rungs.map((k) => shownInt(k))
    }
    case 'frac': {
      const maxDen = cfg.maxDen ?? 12
      return (
        [
          [1, 2],
          [3, 5],
          [2, 3],
          [3, 4],
          [4, 5],
          [5, 6],
          [7, 8],
          // (3rd and 4th grade's tenths and twelfths: two more rungs, so the third park still grows)
          [9, 10],
          [11, 12],
        ] as const
      )
        .filter(([, d]) => d <= maxDen)
        .map(([n, d]) => shownFrac(n, d))
    }
    case 'dec':
      return ['0.3', '0.45', '0.5', '0.62', '0.7', '0.75', '0.8', '0.875', '0.9'].map((s) => shownDec(fromDecimal(s)))
    case 'fracDec':
      // the form alternates, so every rung asks for the other form on its snacks
      return [shownDec(fromDecimal('0.4')), shownFrac(1, 2), shownDec(fromDecimal('0.6')), shownFrac(2, 3), shownDec(fromDecimal('0.7')), shownFrac(3, 4), shownDec(fromDecimal('0.8')), shownFrac(7, 8), shownDec(fromDecimal('0.9'))]
  }
}

// ── weighted picking ─────────────────────────────────────────────────────────

interface Cand {
  shown: NumberShown
  family: SnackFamily
  w: number
}

function pickWeighted(cands: readonly Cand[], rng: Rng): Cand | null {
  let total = 0
  for (const c of cands) total += c.w
  if (total <= 0) return null
  let x = rng() * total
  for (const c of cands) {
    x -= c.w
    if (x <= 0) return c
  }
  return cands[cands.length - 1]
}

const randInt = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1))

/** Keep the candidates on the wanted side of the cloud, never equal to it. */
function sideOk(v: Rational, cloud: Rational, edible: boolean): boolean {
  const c = compare(v, cloud)
  return edible ? c < 0 : c > 0
}

/**
 * The first non-empty, positively weighted pool among `tiers` (the families
 * the moment asks for, then wider ones), picked by weight.
 */
function pickTiered(tiers: readonly Cand[][], rng: Rng): Cand | null {
  for (const t of tiers) {
    const pool = t.filter((c) => c.w > 0)
    if (pool.length) return pickWeighted(pool, rng)
  }
  return null
}

// ── the sets ─────────────────────────────────────────────────────────────────

/** Kindergarten: early snacks are never a neighbour of the cloud's number (5 vs 3, not 5 vs 4). */
function kSnack(cloud: number, edible: boolean, d: number, rng: Rng): Cand {
  const minGap = d < 0.3 ? 2 : 1
  const cands: Cand[] = []
  for (let k = 1; k <= 10; k++) {
    const gap = Math.abs(k - cloud)
    if (gap < minGap || (edible ? k >= cloud : k <= cloud)) continue
    // later on, the close ones come up more (4 vs 5 is the real comparison)
    const w = d < 0.5 ? 1 : 1 + 2 / gap
    cands.push({ shown: shownInt(k, 'dots'), family: gap <= 1 ? 'near' : 'far', w })
  }
  return pickWeighted(cands, rng) ?? { shown: shownInt(edible ? 1 : 10, 'dots'), family: 'far', w: 1 }
}

/** 1st grade: different tens first, then the same tens (the ones decide), then the swapped digits (42 vs 24). */
function g1Snack(cloud: number, edible: boolean, d: number, rng: Rng): Cand {
  const ct = Math.floor(cloud / 10)
  const flip = (cloud % 10) * 10 + ct
  const all: Cand[] = []
  for (let k = 10; k <= 99; k++) {
    if (k === cloud || (edible ? k > cloud : k < cloud)) continue
    const gap = Math.abs(k - cloud)
    const family: SnackFamily = k === flip ? 'flip' : Math.floor(k / 10) === ct ? 'sameTens' : gap <= 6 ? 'near' : 'far'
    all.push({ shown: shownInt(k), family, w: 1 })
  }
  const weigh = (c: Cand): number => {
    const gap = Math.abs(toNumber(c.shown.value) - cloud)
    if (d < 0.35) return c.family === 'far' && gap >= 8 ? 1 : 0
    if (d < 0.7) return c.family === 'sameTens' ? 3 : c.family === 'far' ? 1 : c.family === 'near' ? 1.5 : 0
    return c.family === 'flip' ? 6 : c.family === 'sameTens' ? 3 : c.family === 'near' ? 2 : 0.6
  }
  const tiered = all.map((c) => ({ ...c, w: weigh(c) }))
  return pickTiered([tiered, all], rng) ?? { shown: shownInt(edible ? 10 : 99), family: 'far', w: 1 }
}

/** A friendly way to write `t` as an expression to work out ("3 + 4", "5 × 2", "4,000 + 780"), or null. */
export function expressionFor(t: number, rng: Rng): string | null {
  if (t < 2) return null
  if (t <= 20) {
    if (t >= 4 && rng() < 0.25) {
      // a take-away fact now and then ("10 − 3")
      const b = randInt(rng, 1, 9)
      return `${t + b} − ${b}`
    }
    const a = randInt(rng, 1, t - 1)
    return `${a} + ${t - a}`
  }
  if (t <= 100) {
    const facts: [number, number][] = []
    for (let a = 2; a <= 10; a++) if (t % a === 0 && t / a >= 2 && t / a <= 10) facts.push([a, t / a])
    if (facts.length && rng() < 0.7) {
      const [a, b] = facts[Math.floor(rng() * facts.length)]
      return `${a} × ${b}`
    }
    const a = Math.floor(t / 10) * 10
    return a > 0 && a < t ? `${a} + ${t - a}` : null
  }
  if (t % 100 === 0 && t / 100 <= 12 && rng() < 0.5) return `${t / 100} × 100`
  if (t % 10 === 0 && t / 10 <= 99 && rng() < 0.4) return `${t / 10} × 10`
  // expanded form: the leading place plus the rest ("4,000 + 780")
  const place = 10 ** Math.floor(Math.log10(t))
  const lead = Math.floor(t / place) * place
  return lead < t ? `${withCommas(lead)} + ${withCommas(t - lead)}` : null
}

/** A rounder number near `x` (keeps big snacks readable: 3,400 rather than 3,397, early on). */
function roundTo(x: number, step: number) {
  return Math.max(1, Math.round(x / step) * step)
}

/**
 * Grades 2–4, whole numbers: far gaps first; then the same leading digit
 * (3,409 vs 3,490: a later place decides) and swapped digits; expressions
 * all along (computing the snack is the math), more of them while the
 * numbers are small.
 */
function wholeSnack(cloud: number, edible: boolean, d: number, maxPlace: number, rng: Rng): Cand {
  const cap = Math.min(maxPlace, 10000) * 2 - 1
  const place = 10 ** Math.max(0, Math.floor(Math.log10(cloud)))
  const out: Cand[] = []
  const push = (v: number, family: SnackFamily, w: number) => {
    if (!Number.isInteger(v) || v < 1 || v > cap || v === cloud || (edible ? v > cloud : v < cloud)) return
    out.push({ shown: shownInt(v), family, w })
  }
  // far: well under half, or well over half again
  for (let i = 0; i < 4; i++) {
    const k = edible ? 0.2 + rng() * 0.4 : 1.5 + rng() * 1.2
    push(roundTo(cloud * k, cloud >= 100 ? place / 10 : 1), 'far', d < 0.4 ? 3 : 1)
  }
  // near: within about 10%
  for (let i = 0; i < 3; i++) {
    const gap = Math.max(1, Math.round(cloud * (0.02 + rng() * 0.1)))
    push(cloud + (edible ? -gap : gap), 'near', d < 0.35 ? 0 : 2)
  }
  // the same leading digit, a later place different (only for two digits and up)
  if (cloud >= 10) {
    for (let i = 0; i < 3; i++) {
      const lead = Math.floor(cloud / place) * place
      push(lead + randInt(rng, 0, place - 1), 'sameLead', d < 0.45 ? 0 : 3)
    }
    // swapped digits (4,800 vs 4,080)
    const digits = String(cloud).split('')
    for (let i = 0; i + 1 < digits.length; i++) {
      if (digits[i] === digits[i + 1]) continue
      const s = [...digits]
      ;[s[i], s[i + 1]] = [s[i + 1], s[i]]
      if (s[0] !== '0') push(Number(s.join('')), 'sameLead', d < 0.6 ? 0 : 4)
    }
  }
  const picked = pickTiered([out], rng)
  const base = picked ?? { shown: shownInt(edible ? Math.max(1, Math.floor(cloud / 2)) : cloud + Math.ceil(cloud / 2)), family: 'far' as SnackFamily, w: 1 }
  // written as an expression now and then (often while the numbers are small)
  const exprShare = cloud <= 100 ? 0.45 : 0.3
  if (rng() < exprShare) {
    const t = toNumber(base.shown.value)
    const e = expressionFor(t, rng)
    if (e) return { shown: { value: base.shown.value, text: e, form: 'expr' }, family: 'expr', w: 1 }
  }
  return base
}

/** Every fraction a snack may show: n/d with d ≤ maxDen, up to one and a half (improper ones are bigger snacks). */
function fractionPool(maxDen: number): { n: number; d: number }[] {
  const out: { n: number; d: number }[] = []
  for (let d = 2; d <= maxDen; d++) for (let n = 1; n <= Math.floor(d * 1.5); n++) out.push({ n, d })
  return out
}

const HALF = rat(1, 2)

function fracFamily(s: { n: number; d: number }, c: { n: number; d: number }): SnackFamily {
  if (s.d === c.d) return 'sameDen'
  if (s.n === c.n) return 'sameNum'
  const sv = rat(s.n, s.d)
  const cv = rat(c.n, c.d)
  const ss = compare(sv, HALF)
  const cs = compare(cv, HALF)
  if (ss !== 0 && (cs === 0 || ss !== cs)) return 'benchmark'
  return 'other'
}

/**
 * Grades 2–4, fractions (3.NF.3d, 4.NF.2): the same denominator first
 * (compare the tops), then the same numerator (more pieces are smaller
 * pieces: ⅓ vs ¼), then benchmarks across ½, and closer gaps late.
 */
function fracSnack(cloud: { n: number; d: number }, edible: boolean, dif: number, maxDen: number, rng: Rng): Cand {
  const cv = rat(cloud.n, cloud.d)
  const base: Cand[] = []
  for (const f of fractionPool(maxDen)) {
    const v = rat(f.n, f.d)
    if (!sideOk(v, cv, edible)) continue
    // (whole numbers like 4/4 only as the same-bottom "one whole" snack)
    if (f.n % f.d === 0 && f.d !== cloud.d) continue
    base.push({ shown: shownFrac(f.n, f.d), family: fracFamily(f, cloud), w: 1 })
  }
  const gapW = (c: Cand) => {
    const gap = Math.abs(toNumber(c.shown.value) - toNumber(cv))
    return dif < 0.4 ? (gap >= 0.2 ? 2 : 0.4) : dif < 0.7 ? 1 : gap <= 0.2 ? 2.5 : 0.7
  }
  const fam = (allowed: SnackFamily[]) => base.filter((c) => allowed.includes(c.family)).map((c) => ({ ...c, w: gapW(c) }))
  const tiers =
    dif < 0.3
      ? [fam(['sameDen']), fam(['sameNum', 'benchmark'])]
      : dif < 0.6
        ? [fam(['sameDen', 'sameNum']), fam(['benchmark'])]
        : [fam(['sameNum', 'benchmark', 'sameDen']).map((c) => (c.family === 'sameDen' ? { ...c, w: c.w * 0.4 } : c))]
  return pickTiered([...tiers, fam(['sameDen', 'sameNum', 'benchmark']), base], rng) ?? { shown: edible ? shownFrac(1, 12) : shownFrac(3, 2), family: 'other', w: 1 }
}

/** Every thousandth from 0.001 to 1.5 with its decimal places, built once. */
let DEC_POOL: { k: number; v: Rational; p: number }[] | null = null
function decimalPool() {
  DEC_POOL ??= Array.from({ length: 1500 }, (_, i) => {
    const v = rat(i + 1, 1000)
    return { k: i + 1, v, p: decimalPlaces(v) }
  })
  return DEC_POOL
}

/**
 * 5th grade, decimals to thousandths (5.NBT.3b): far gaps in tenths and
 * hundredths first, then thousandths, close gaps and the length trap (a
 * longer decimal isn't a bigger one).
 */
function decSnack(cloud: Rational, edible: boolean, dif: number, rng: Rng): Cand {
  const cv = toNumber(cloud)
  const cp = decimalPlaces(cloud)
  const maxPlaces = dif < 0.35 ? 2 : 3
  const out: Cand[] = []
  for (const { k, v, p } of decimalPool()) {
    if (p > maxPlaces || !sideOk(v, cloud, edible)) continue
    const gap = Math.abs(k / 1000 - cv)
    const longer = edible ? p > cp : p < cp
    const family: SnackFamily = longer ? 'longer' : gap <= 0.05 ? 'near' : gap >= 0.2 ? 'far' : 'other'
    let w: number
    if (dif < 0.35) w = family === 'far' ? 2 : family === 'longer' || family === 'near' ? 0 : 0.6
    else if (dif < 0.7) w = family === 'longer' ? 2.5 : family === 'near' ? 1.5 : 1
    else w = family === 'longer' ? 4 : family === 'near' ? 3 : 0.5
    // thousandths are many; keep them from crowding out the tenths and hundredths
    if (p === 3) w *= 0.12
    else if (p === 2) w *= 0.4
    out.push({ shown: shownDec(v), family, w })
  }
  return pickTiered([out], rng) ?? { shown: shownDec(edible ? rat(1, 100) : rat(3, 2)), family: 'far', w: 1 }
}

const FD_DENS = [2, 3, 4, 5, 6, 8, 10, 12]
const FD_THOUSANDTHS = ['0.125', '0.375', '0.625', '0.875']

/** 5th grade, fractions and decimals mixed: the same form and far apart first, then the other form, then close. */
function fracDecSnack(cloud: NumberShown, edible: boolean, dif: number, rng: Rng): Cand {
  const cv = cloud.value
  const seen = new Set<string>()
  const out: Cand[] = []
  const add = (shown: NumberShown) => {
    if (seen.has(shown.text) || !sideOk(shown.value, cv, edible)) return
    seen.add(shown.text)
    const gap = Math.abs(toNumber(shown.value) - toNumber(cv))
    const cross = shown.form !== cloud.form
    const family: SnackFamily = cross ? 'cross' : gap <= 0.1 ? 'near' : gap >= 0.25 ? 'far' : 'other'
    let w: number
    if (dif < 0.3) w = !cross && gap >= 0.2 ? 2 : 0.05
    else if (dif < 0.65) w = cross ? (gap >= 0.15 ? 2.5 : 0.8) : 0.7
    else w = cross ? (gap <= 0.15 ? 4 : 1) : gap <= 0.1 ? 1.5 : 0.4
    out.push({ shown, family, w })
  }
  // proper fractions (a bigger snack than 0.9 is a decimal past one, or 11/12)
  for (const d of FD_DENS) for (let n = 1; n < d; n++) add(shownFrac(n, d))
  for (let k = 5; k <= 150; k += 5) add(shownDec(rat(k, 100)))
  for (const s of FD_THOUSANDTHS) add(shownDec(fromDecimal(s)))
  return pickTiered([out], rng) ?? { shown: edible ? shownDec(rat(1, 20)) : shownFrac(3, 2), family: 'far', w: 1 }
}

/**
 * One snack for a cloud showing `cloud`: smaller than it when `edible`, bigger
 * otherwise, never equal. `difficulty` (0–1) moves from far gaps and the
 * plainest comparisons to close ones and each band's traps.
 */
export function makeSnack(cfg: GobbleConfig, cloud: NumberShown, edible: boolean, difficulty: number, rng: Rng): SnackValue {
  const d = Math.max(0, Math.min(1, difficulty))
  let c: Cand
  switch (cfg.set) {
    case 'k':
      c = kSnack(cloud.value.n, edible, d, rng)
      break
    case 'g1':
      c = g1Snack(cloud.value.n, edible, d, rng)
      break
    case 'whole':
      c = wholeSnack(cloud.value.n, edible, d, cfg.maxPlace ?? 10000, rng)
      break
    case 'frac':
      c = fracSnack(cloud.frac ?? { n: cloud.value.n, d: cloud.value.d }, edible, d, cfg.maxDen ?? 12, rng)
      break
    case 'dec':
      c = decSnack(cloud.value, edible, d, rng)
      break
    case 'fracDec':
      c = fracDecSnack(cloud, edible, d, rng)
      break
  }
  return { ...c.shown, family: c.family }
}

/** True when a cloud showing `cloud` can swallow `snack` (strictly smaller). */
export const canEat = (snack: Pick<NumberShown, 'value'>, cloud: Pick<NumberShown, 'value'>) => compare(snack.value, cloud.value) < 0

/** The picture a band's wrong move shows (with the value): dots, base-ten blocks, a number line or fraction bars. */
export type PictureKind = 'dots' | 'blocks' | 'line' | 'bars'

export function pictureKind(set: GobbleSetId): PictureKind {
  switch (set) {
    case 'k':
      return 'dots'
    case 'g1':
      return 'blocks'
    case 'frac':
      return 'bars'
    case 'whole':
    case 'dec':
    case 'fracDec':
      return 'line'
  }
}

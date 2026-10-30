import type { Problem, ProblemProvider, WalkStep } from '../problem'
import type { VoiceRef } from '../../voice/types'
import { SHACK_K_FOODS, type ShackKFood } from '../../voice/packs/snack-shack'
import { lineText } from '../../voice/registry'
import { seededRng } from '../random'
import { DEFAULT_GRADE } from '../gradeTiers'
import { contentBand, type ContentBand } from '../gradeBand'
import { DAY, HALF_DAY, crossesNoon, durationText, fmtTime, type ClockSpan } from '../shack/clock'
import { dollars, priceText, type Denom } from '../shack/money'
import { moneyWalkthrough, timeWalkthrough } from './measurement'

/**
 * Snack Shack's orders (src/games/SnackShack.tsx): a seeded shift of island
 * critters at a beach snack stand. Pure: the same grade and seed always give
 * the same shift, and every order is checked to have one right answer.
 *
 * - `count` (kindergarten, Add-and-Take Falls, K.CC.5 / K.OA.1): "3 apples
 *   and 2 bananas, please!" Tap the snacks onto the tray, then "How many
 *   snacks in all?" Every number is said; within 5, then within 10.
 * - `clockAt` (1st grade, Measure Marsh, 1.MD.3): fill a small order, then
 *   "I'll be back at 3 o'clock": set the pick-up clock (hours, then half hours).
 * - `money` (grades 2–5, Measurement Marsh): fill the order from the menu
 *   board, pick the total, take the bill and count out the change by
 *   dragging coins and bills. Grade 2: under $5 in 5¢ steps; 3: to $10; 4: to
 *   $20 with the odd penny; 5: decimal prices and several of one item
 *   (3 × $1.25), change from $20.
 * - `elapsed` (the Clock Tower orders, grades 2–5): "My picnic starts at
 *   10:00. It lasts 2 hours 15 minutes. What time does it end?" The child
 *   moves the clock on from the start time. Grade 2: whole and half hours; 3:
 *   minutes that cross the hour; 4: a.m. and p.m.; 5: across noon, and a
 *   length said in minutes (150 minutes) to convert.
 *
 * Orders ramp inside a shift (the first is the easiest). The provider wraps
 * the same orders as plain multiple-choice problems for any other host.
 */

export type ShackBand = ContentBand

export interface SnackShackConfig {
  /** The stage's band (each band's stage names its own); else the grade's. */
  band?: ShackBand
  /** Grades 2–4 share a stage: the profile grade picks the money and the clock (lib/gradeTiers). */
  grade?: number
}

/** A food on the counter or the menu board. */
export interface ShackFood {
  id: string
  emoji: string
  one: string
  many: string
}

/** Kindergarten's and 1st grade's snacks: their spoken names are the voice pack's words. */
export const K_FOODS: Record<ShackKFood, ShackFood> = {
  apples: { id: 'apples', emoji: '🍎', one: 'apple', many: 'apples' },
  bananas: { id: 'bananas', emoji: '🍌', one: 'banana', many: 'bananas' },
  cookies: { id: 'cookies', emoji: '🍪', one: 'cookie', many: 'cookies' },
  strawberries: { id: 'strawberries', emoji: '🍓', one: 'strawberry', many: 'strawberries' },
  donuts: { id: 'donuts', emoji: '🍩', one: 'donut', many: 'donuts' },
  lemons: { id: 'lemons', emoji: '🍋', one: 'lemon', many: 'lemons' },
}

/** The menu board's snacks for grades 2–5 (emoji from Unicode 9 or older: every Fire tablet draws them). */
export const MENU_FOODS: readonly ShackFood[] = [
  { id: 'lemonade', emoji: '🥤', one: 'lemonade', many: 'lemonades' },
  { id: 'taco', emoji: '🌮', one: 'taco', many: 'tacos' },
  { id: 'icecream', emoji: '🍦', one: 'ice cream', many: 'ice creams' },
  { id: 'hotdog', emoji: '🌭', one: 'hot dog', many: 'hot dogs' },
  { id: 'popcorn', emoji: '🍿', one: 'popcorn', many: 'popcorns' },
  { id: 'pizza', emoji: '🍕', one: 'pizza slice', many: 'pizza slices' },
  { id: 'melon', emoji: '🍉', one: 'melon slice', many: 'melon slices' },
  { id: 'donut', emoji: '🍩', one: 'donut', many: 'donuts' },
  { id: 'cookie', emoji: '🍪', one: 'cookie', many: 'cookies' },
]

/** The critters who queue at the stand. */
export const CRITTERS: readonly { emoji: string; name: string }[] = [
  { emoji: '🐢', name: 'Turtle' },
  { emoji: '🦀', name: 'Crab' },
  { emoji: '🐸', name: 'Frog' },
  { emoji: '🐧', name: 'Penguin' },
  { emoji: '🐙', name: 'Octopus' },
  { emoji: '🐰', name: 'Bunny' },
  { emoji: '🦉', name: 'Owl' },
  { emoji: '🐨', name: 'Koala' },
  { emoji: '🦊', name: 'Fox' },
  { emoji: '🐷', name: 'Piggy' },
]

export interface MenuItem {
  food: ShackFood
  /** Cents. */
  price: number
}

export interface OrderLine {
  food: ShackFood
  qty: number
  /** Cents each (0 for kindergarten and 1st grade: no money). */
  price: number
}

interface OrderBase {
  id: string
  critter: { emoji: string; name: string }
}

export interface CountOrder extends OrderBase {
  kind: 'count'
  lines: OrderLine[]
  /** Two kinds of snack: "How many snacks in all?" after the tray is full. */
  askTotal: boolean
  /** The numeral cards for "how many in all" (the sum among them). */
  totalOptions: number[]
  speech: VoiceRef
}

export interface ClockAtOrder extends OrderBase {
  kind: 'clockAt'
  lines: OrderLine[]
  /** The pick-up time (minutes after 12:00, on the hour or half hour). */
  time: number
  /** Where the clock starts (12:00). */
  start: number
  speech: VoiceRef
  fillSpeech: VoiceRef
}

export interface MoneyOrder extends OrderBase {
  kind: 'money'
  lines: OrderLine[]
  total: number
  /** What the customer hands over (cents): one bill. */
  paid: number
  change: number
  /** More than one snack: pick the total from `totalOptions`; one snack's price is on the board. */
  askTotal: boolean
  totalOptions: number[]
  /** What the customer says (device speech). */
  say: string
}

export interface ElapsedOrder extends OrderBase {
  kind: 'elapsed'
  /** Minutes after midnight (a 12-hour clock reads it mod 720). */
  start: number
  hours: number
  minutes: number
  end: number
  /** Show and check a.m. / p.m. (grades 4–5). */
  meridiem: boolean
  /** The story, shown and said: "My picnic starts at 10:00. It lasts 2 hours 15 minutes." */
  story: string
  /** The question under it: "What time does it end?" */
  ask: string
  /** The length as the story says it. */
  duration: string
  /** A first length the customer takes back ("…5 and a half hours… no wait, 2 hours 15 minutes!"). */
  decoy?: string
}

export type ShackOrder = CountOrder | ClockAtOrder | MoneyOrder | ElapsedOrder

export interface ShiftPlan {
  band: ShackBand
  grade: number
  orders: ShackOrder[]
  /** Grades 2–5: the menu board (every money order's lines come from it). */
  menu: MenuItem[]
  /** Grades 2–5: the coins and bills in the cash drawer. */
  drawer: Denom[]
  /** The clock's snap (minutes) and span. */
  clockStep: number
  clockSpan: ClockSpan
  /** Prices read as dollars and cents everywhere ("$0.75"), grades 4–5; else "75¢". */
  decimals: boolean
}

export const DEFAULT_CUSTOMERS = 6

type Rng = () => number
const int = (r: Rng, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1))
const pickOf = <T,>(r: Rng, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]
function shuffled<T>(r: Rng, xs: readonly T[]): T[] {
  const out = [...xs]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** The band a grade plays (a config's own band wins). */
export function shackBand(grade: number, band?: ShackBand): ShackBand {
  return band ?? contentBand(grade)
}

/** The skill each kind of step is reported under: the ids the zone's other stages already use. */
export function shackSkill(band: ShackBand, step: 'count' | 'clock' | 'money'): { id: string; label: string } {
  if (band === 'k1') return { id: 'k-add-take', label: 'adding and taking away' }
  if (band === 'g1') return { id: 'g1-time', label: 'time to the hour and half hour' }
  if (band === 'g5') return step === 'clock' ? { id: 'g5-convert', label: 'converting units' } : { id: 'g5-dec-ops', label: 'adding, subtracting, multiplying and dividing decimals' }
  return step === 'clock' ? { id: 'meas-time', label: 'telling time' } : { id: 'meas-money', label: 'money' }
}

// ── kindergarten: count the snacks, then how many in all ─────────────────────

/** Order `i` of a shift: one kind of snack (2–3, then 3–5), then two kinds within 5, then within 10. */
function countLines(r: Rng, i: number, foods: readonly ShackKFood[]): OrderLine[] {
  const [a, b] = shuffled(r, foods)
  const line = (f: ShackKFood, qty: number): OrderLine => ({ food: K_FOODS[f], qty, price: 0 })
  if (i === 0) return [line(a, int(r, 2, 3))]
  if (i === 1) return [line(a, int(r, 3, 5))]
  if (i <= 3) {
    const x = int(r, 2, 3)
    return [line(a, x), line(b, x === 3 ? 2 : int(r, 2, 3))]
  }
  // within 10: 6 to 10 in all, each kind 2–6
  const total = i === 4 ? int(r, 6, 8) : int(r, 7, 10)
  const x = int(r, Math.max(2, total - 6), Math.min(6, total - 2))
  return [line(a, x), line(b, total - x)]
}

/** Three numeral cards around the sum (all 1 or more). */
function countOptions(r: Rng, sum: number): number[] {
  const near = [sum - 1, sum + 1, sum + 2, sum - 2].filter((n) => n >= 1 && n !== sum)
  return shuffled(r, [sum, ...shuffled(r, near.slice(0, 3)).slice(0, 2)])
}

function orderSpeech(lines: readonly OrderLine[]): VoiceRef {
  if (lines.length === 1) return { template: 'snack-shack/orderOne', slots: { n: lines[0].qty, food: lines[0].food.id } }
  return { template: 'snack-shack/orderTwo', slots: { a: lines[0].qty, foodA: lines[0].food.id, b: lines[1].qty, foodB: lines[1].food.id } }
}

// ── 1st grade: the pick-up clock ─────────────────────────────────────────────

/** Order `i`'s pick-up time: hours first, then half hours (never 12:00, where the clock starts). */
function g1Time(r: Rng, i: number, last: number | null): number {
  for (;;) {
    const h = int(r, 1, 11)
    const t = h * 60 + (i >= 3 ? 30 : 0)
    if (t !== last) return t
  }
}

// ── grades 2–5: the menu, the money ──────────────────────────────────────────

interface MoneyTier {
  /** Menu prices: drawn from lo–hi (cents) in `step`s. */
  lo: number
  hi: number
  step: number
  /** Order `i` lines: [kinds, max qty]. */
  shape: (i: number) => [number, number]
  /** The total stays at most this (cents). */
  maxTotal: number
  bills: number[]
  drawer: Denom[]
}

function moneyTier(grade: number): MoneyTier {
  if (grade <= 2)
    return { lo: 25, hi: 95, step: 5, shape: (i) => (i === 0 ? [1, 1] : [2, 1]), maxTotal: 190, bills: [100, 200, 500], drawer: ['dollar', 'quarter', 'dime', 'nickel', 'penny'] }
  if (grade === 3)
    return { lo: 35, hi: 250, step: 5, shape: (i) => (i === 0 ? [1, 1] : i < 3 ? [2, 1] : [2, 2]), maxTotal: 480, bills: [500, 1000], drawer: ['five', 'dollar', 'quarter', 'dime', 'nickel', 'penny'] }
  if (grade === 4)
    return { lo: 45, hi: 395, step: 5, shape: (i) => (i === 0 ? [1, 2] : i < 3 ? [2, 2] : [3, 2]), maxTotal: 950, bills: [1000, 2000], drawer: ['ten', 'five', 'dollar', 'quarter', 'dime', 'nickel', 'penny'] }
  return { lo: 85, hi: 450, step: 5, shape: (i) => (i === 0 ? [1, 4] : [2, 4]), maxTotal: 1650, bills: [2000], drawer: ['ten', 'five', 'dollar', 'quarter', 'dime', 'nickel', 'penny'] }
}

/** Five snacks with prices for the shift's board, all different. 5th grade's are quarter-ish decimals (x.25, x.40…). */
function makeMenu(r: Rng, grade: number): MenuItem[] {
  const t = moneyTier(grade)
  const foods = shuffled(r, MENU_FOODS).slice(0, 5)
  const used = new Set<number>()
  return foods.map((food) => {
    for (;;) {
      let p = t.lo + t.step * int(r, 0, Math.floor((t.hi - t.lo) / t.step))
      // 4th grade: a price or two that needs pennies ($1.49)
      if (grade === 4 && r() < 0.25) p = Math.max(t.lo, p - 1)
      // 5th grade: prices kids multiply (x.25, x.50, x.75, x.40, x.20, x.85)
      if (grade >= 5) p = 100 * int(r, 0, 3) + pickOf(r, [25, 50, 75, 40, 20, 85, 60])
      if (p >= t.lo && !used.has(p)) {
        used.add(p)
        return { food, price: p }
      }
    }
  })
}

const sumLines = (lines: readonly OrderLine[]) => lines.reduce((s, l) => s + l.qty * l.price, 0)

/** The order's lines from the board, within the tier's shape and total. */
function moneyLines(r: Rng, i: number, grade: number, menu: readonly MenuItem[]): OrderLine[] {
  const t = moneyTier(grade)
  const [kinds, maxQty] = t.shape(i)
  for (let tries = 0; ; tries++) {
    const items = shuffled(r, menu).slice(0, kinds)
    const lines = items.map((m, k) => ({
      food: m.food,
      price: m.price,
      // 5th grade: the first line is "several of one item" (×), the second one or two
      qty: grade >= 5 ? (k === 0 ? int(r, i === 0 ? 2 : 2, maxQty) : int(r, 1, 2)) : int(r, 1, maxQty),
    }))
    if (sumLines(lines) <= t.maxTotal || tries > 40) {
      // (a pathological board: trim to one of the cheapest)
      if (sumLines(lines) > t.maxTotal) {
        const cheap = [...menu].sort((a, b) => a.price - b.price)[0]
        return [{ food: cheap.food, price: cheap.price, qty: 1 }]
      }
      return lines
    }
  }
}

/**
 * Three totals to pick from: the right one and the slips children make
 * (counting a "2 ×" line once, leaving a line out, a dollar or a dime off).
 */
export function totalChoices(r: Rng, lines: readonly OrderLine[]): number[] {
  const total = sumLines(lines)
  const slips = new Set<number>()
  for (const l of lines) {
    if (l.qty > 1) slips.add(total - (l.qty - 1) * l.price)
    if (lines.length > 1) slips.add(total - l.qty * l.price)
  }
  for (const d of [100, -100, 10, -10, 25, 50]) slips.add(total + d)
  const wrong = shuffled(r, [...slips].filter((c) => c > 0 && c !== total))
  return shuffled(r, [total, wrong[0], wrong[1]])
}

/**
 * The bill the customer pays with: more than the total (so there is change),
 * from the tier's bills, and not silly ($20 for a $1 snack): the smallest
 * bill that covers it, or the next one when it is under five times the total.
 */
function payWith(r: Rng, total: number, bills: readonly number[]): number {
  const ok = bills.filter((b) => b > total)
  const sensible = ok.filter((b, i) => i === 0 || (i === 1 && b < total * 5))
  return sensible.length ? pickOf(r, sensible) : Math.ceil((total + 1) / 500) * 500
}

function moneySay(lines: readonly OrderLine[]): string {
  const parts = lines.map((l) => (l.qty === 1 ? `${/^[aeiou]/i.test(l.food.one) ? 'an' : 'a'} ${l.food.one}` : `${l.qty} ${l.food.many}`))
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
  return `${list}, please!`
}

// ── grades 2–5: the Clock Tower (elapsed time) ───────────────────────────────

interface Story {
  /** `s`: the start time, `d`: the length. */
  text: (s: string, d: string) => string
  ask: string
}

const STORIES: readonly Story[] = [
  { text: (s, d) => `My picnic starts at ${s}. It lasts ${d}.`, ask: 'What time does it end?' },
  { text: (s, d) => `I'm baking a cake at ${s}. It takes ${d}.`, ask: 'When is the cake ready?' },
  { text: (s, d) => `It's ${s} now. Pick-up is in ${d}.`, ask: 'What time is pick-up?' },
  { text: (s, d) => `The beach party starts at ${s} and goes for ${d}.`, ask: 'When does it end?' },
  { text: (s, d) => `My boat leaves at ${s}. The trip takes ${d}.`, ask: 'When do I get back?' },
  { text: (s, d) => `I start building a sandcastle at ${s}. It takes ${d}.`, ask: 'When is it done?' },
]

interface ElapsedSpec {
  start: number
  hours: number
  minutes: number
  style: 'plain' | 'half' | 'minutesOnly'
}

/**
 * Clock Tower order `j` of a shift (0, 1, 2…; `last`: the shift's last one):
 * grade 2 whole and half hours from an o'clock or half past; grade 3 minutes
 * that cross the hour; grade 4 a.m. / p.m. (the last one past noon); grade 5
 * across noon, once in minutes. Never past 9 p.m. (no midnight).
 */
function elapsedSpec(r: Rng, j: number, grade: number, last: boolean): ElapsedSpec {
  if (grade <= 2) {
    const start = int(r, 1, 10) * 60 + (j === 0 ? 0 : pickOf(r, [0, 30]))
    const [hours, minutes] = j === 0 ? [int(r, 1, 2), 0] : j === 1 ? [0, 30] : [int(r, 1, 2), 30]
    return { start, hours, minutes, style: 'half' }
  }
  if (grade === 3) {
    const start = int(r, 7, 10) * 60 + 5 * int(r, 0, 11)
    if (j === 0) return { start: start - (start % 60), hours: int(r, 1, 3), minutes: 5 * int(r, 1, 9), style: 'plain' }
    // the minutes cross the hour: 10:45 + 30 minutes
    const from = start % 60 < 30 ? start + 30 : start
    const need = 60 - (from % 60)
    return { start: from, hours: j === 1 ? 0 : int(r, 1, 2), minutes: Math.min(55, need + 5 * int(r, 1, 4)), style: 'plain' }
  }
  if (grade === 4) {
    // morning starts; the last order crosses noon
    const start = (last && j > 0 ? int(r, 9, 11) : int(r, 7, 10)) * 60 + 15 * int(r, 0, 3)
    const hours = j === 0 ? int(r, 1, 3) : int(r, 1, 4)
    const minutes = j === 0 ? pickOf(r, [0, 30]) : 15 * int(r, 1, 3)
    const spec: ElapsedSpec = { start, hours, minutes, style: minutes === 30 ? 'half' : 'plain' }
    return last && j > 0 ? forceNoon(spec) : spec
  }
  // grade 5: crosses noon (after the first), and once said in minutes
  const start = int(r, 8, 11) * 60 + 5 * int(r, 0, 11)
  if (j === 1) {
    // "The pie bakes for 150 minutes": a late-morning start, so it is 90–210 minutes and still crosses noon
    const total = 15 * int(r, 6, 14)
    const late = 12 * 60 - total + 5 * int(r, 1, 6)
    return forceNoon({ start: Math.max(8 * 60, late), hours: Math.floor(total / 60), minutes: total % 60, style: 'minutesOnly' })
  }
  const spec: ElapsedSpec = { start, hours: int(r, 2, 5), minutes: 5 * int(r, 1, 11), style: 'plain' }
  if (spec.minutes === 30) spec.style = 'half'
  return j === 0 ? spec : forceNoon(spec)
}

/** Make the order end after 12 noon (start before it): add hours until it does. */
function forceNoon(s: ElapsedSpec): ElapsedSpec {
  let hours = s.hours
  while (s.start + hours * 60 + s.minutes < HALF_DAY) hours++
  return { ...s, hours }
}

function makeElapsed(r: Rng, j: number, last: boolean, grade: number, base: OrderBase): ElapsedOrder {
  const spec = elapsedSpec(r, j, grade, last)
  const meridiem = grade >= 4
  const end = spec.start + spec.hours * 60 + spec.minutes
  const story = pickOf(r, STORIES)
  const duration = durationText(spec.hours, spec.minutes, spec.style)
  const order: ElapsedOrder = {
    ...base,
    kind: 'elapsed',
    start: spec.start,
    hours: spec.hours,
    minutes: spec.minutes,
    end,
    meridiem,
    // ("10:30 a.m.. It takes…": one period after a.m.)
    story: story.text(fmtTime(spec.start, meridiem), duration).replace(/\.\./g, '.'),
    ask: story.ask,
    duration,
  }
  // 4th–5th grade, the last Clock Tower order (not the first): the customer changes their mind once (read carefully!)
  if (grade >= 4 && last && j > 0) {
    const dh = spec.hours + 3 > 9 ? Math.max(0, spec.hours - 2) : spec.hours + 3
    order.decoy = durationText(dh, 30, 'half')
  }
  return order
}

// ── the shift ────────────────────────────────────────────────────────────────

/**
 * A whole shift: `customers` orders (default 6) for the grade, easiest first.
 * Grades 2–5 alternate money and Clock Tower orders, money first.
 */
export function planShift({ grade, seed, customers = DEFAULT_CUSTOMERS, band }: { grade: number; seed: string; customers?: number; band?: ShackBand }): ShiftPlan {
  const r = seededRng(`snack-shack:${seed}`)
  const b = shackBand(grade, band)
  const g = b === 'g24' ? Math.min(4, Math.max(2, grade)) : b === 'g5' ? 5 : b === 'g1' ? 1 : 0
  const critters = shuffled(r, CRITTERS)
  const base = (i: number): OrderBase => ({ id: `${seed}-${i}`, critter: critters[i % critters.length] })
  const orders: ShackOrder[] = []
  const menu = b === 'k1' || b === 'g1' ? [] : makeMenu(r, g)
  const kFoods = shuffled(r, SHACK_K_FOODS)
  let lastTime: number | null = null
  let clockJ = 0
  let moneyJ = 0
  for (let i = 0; i < customers; i++) {
    if (b === 'k1') {
      const lines = countLines(r, i, kFoods.slice(0, 4))
      const sum = lines.reduce((s, l) => s + l.qty, 0)
      orders.push({ ...base(i), kind: 'count', lines, askTotal: lines.length > 1, totalOptions: countOptions(r, sum), speech: orderSpeech(lines) })
    } else if (b === 'g1') {
      // a small order (one kind, or two within 10), then the clock
      const lines = countLines(r, Math.min(i, 3), kFoods.slice(0, 4))
      const time = g1Time(r, i, lastTime)
      lastTime = time
      const h = Math.floor(time / 60) || 12
      const speech: VoiceRef = time % 60 === 0 ? { template: 'snack-shack/backAt', slots: { h } } : { template: 'snack-shack/backAtHalf', slots: { h } }
      orders.push({ ...base(i), kind: 'clockAt', lines, time, start: 0, speech, fillSpeech: orderSpeech(lines) })
    } else if (i % 2 === 1) {
      const j = clockJ++
      orders.push(makeElapsed(r, j, j === Math.floor(customers / 2) - 1, g, base(i)))
    } else {
      const t = moneyTier(g)
      const lines = moneyLines(r, moneyJ++, g, menu)
      const total = sumLines(lines)
      const paid = payWith(r, total, t.bills)
      const askTotal = lines.reduce((s, l) => s + l.qty, 0) > 1
      orders.push({ ...base(i), kind: 'money', lines, total, paid, change: paid - total, askTotal, totalOptions: askTotal ? totalChoices(r, lines) : [total], say: moneySay(lines) })
    }
  }
  return {
    band: b,
    grade: g,
    orders,
    menu,
    drawer: b === 'k1' || b === 'g1' ? [] : moneyTier(g).drawer,
    clockStep: b === 'g1' ? 30 : 5,
    clockSpan: g >= 4 ? DAY : HALF_DAY,
    decimals: g >= 4,
  }
}

// ── "Show me how" for the shack's orders ─────────────────────────────────────

/** Making change: the shared count-up walkthrough (src/lib/providers/measurement.ts). */
export function changeShowMe(o: MoneyOrder): WalkStep[] {
  return moneyWalkthrough(o.total, o.paid)
}

/**
 * Elapsed time: the shared timeline walkthrough on the 12-hour clock; across
 * noon (grades 4–5) one more step before "Your turn!" says the p.m.
 */
export function elapsedShowMe(o: ElapsedOrder): WalkStep[] {
  // whole hours: the last hour goes in two half-hour jumps, so the child still makes the last one
  const steps = o.minutes === 0 ? timeWalkthrough(o.start % HALF_DAY, o.hours - 1, 60) : timeWalkthrough(o.start % HALF_DAY, o.hours, o.minutes)
  if (o.meridiem && crossesNoon(o.start, o.end)) {
    const last = steps[steps.length - 1]
    steps.splice(steps.length - 1, 0, { say: lineText('snack-shack/overNoon') ?? '', voice: { line: 'snack-shack/overNoon' }, visual: last.visual })
  }
  return steps
}

// ── the provider: the same orders as multiple-choice problems ────────────────

/** Near-miss clock times (an hour off, 5 or 10 minutes off, the other half of the day). */
function timeChoices(r: Rng, end: number, meridiem: boolean): string[] {
  const right = fmtTime(end, meridiem)
  const near = [-60, 60, 10, -10, 30, ...(meridiem ? [HALF_DAY] : [])].map((d) => fmtTime(end + d, meridiem))
  const wrong = shuffled(r, [...new Set(near)].filter((t) => t !== right)).slice(0, 3)
  return shuffled(r, [right, ...wrong])
}

/** One order as a plain problem (for hosts that only ask questions: the Daily Challenge, tests). */
export function orderProblem(o: ShackOrder, band: ShackBand, decimals: boolean, r: Rng): Problem {
  switch (o.kind) {
    case 'count': {
      const sum = o.lines.reduce((s, l) => s + l.qty, 0)
      const list = o.lines.map((l) => `${l.qty} ${l.food.many}`).join(' and ')
      return {
        id: `shack-${o.id}`,
        prompt: `${list}. How many snacks in all?`,
        options: o.totalOptions,
        answer: sum,
        topic: 'snack-shack',
        skill: shackSkill(band, 'count'),
        speech: o.speech,
        pictureOptions: o.totalOptions.map((n) => ({ value: n, picture: { kind: 'numeral', n } })),
      }
    }
    case 'clockAt': {
      const right = fmtTime(o.time)
      const wrong = [fmtTime(o.time + 60), fmtTime(o.time - 60), fmtTime(o.time + 30)].filter((t) => t !== right)
      return {
        id: `shack-${o.id}`,
        prompt: `Pick-up is at ${right}. Which clock shows it?`,
        options: shuffled(r, [right, ...wrong.slice(0, 2)]),
        answer: right,
        topic: 'snack-shack',
        skill: shackSkill(band, 'clock'),
        speech: o.speech,
        pictureOptions: shuffled(r, [o.time, o.time + 60, o.time - 60]).map((t) => ({ value: fmtTime(t), picture: { kind: 'clock', hour: Math.floor(((t % 720) + 720) % 720 / 60) || 12, minute: t % 60 } })),
      }
    }
    case 'money': {
      const right = dollars(o.change)
      const wrong = shuffled(r, [o.change + 100, o.change - 25, o.change + 10, o.change - 10, o.change + 25].filter((c) => c > 0).map(dollars)).filter((x) => x !== right)
      return {
        id: `shack-${o.id}`,
        prompt: `The order costs ${priceText(o.total, decimals)}. They pay with ${priceText(o.paid, decimals)}. How much change?`,
        options: shuffled(r, [right, ...[...new Set(wrong)].slice(0, 3)]),
        answer: right,
        topic: 'snack-shack',
        skill: shackSkill(band, 'money'),
        visual: { kind: 'money', cents: o.total },
        showMe: changeShowMe(o),
      }
    }
    case 'elapsed':
      return {
        id: `shack-${o.id}`,
        prompt: `${o.story} ${o.ask}`,
        options: timeChoices(r, o.end, o.meridiem),
        answer: fmtTime(o.end, o.meridiem),
        topic: 'snack-shack',
        skill: shackSkill(band, 'clock'),
        visual: { kind: 'clock', hour: Math.floor((o.start % HALF_DAY) / 60) || 12, minute: o.start % 60 },
        showMe: elapsedShowMe(o),
      }
  }
}

export function makeSnackShackProvider(cfg: SnackShackConfig = {}, seed = `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`): ProblemProvider {
  const grade = cfg.grade ?? (cfg.band === 'k1' ? 0 : cfg.band === 'g1' ? 1 : cfg.band === 'g5' ? 5 : DEFAULT_GRADE)
  const r = seededRng(`snack-shack-problems:${seed}`)
  let shift = 0
  let queue: Problem[] = []
  return {
    topic: 'snack-shack',
    next() {
      if (queue.length === 0) {
        const plan = planShift({ grade, seed: `${seed}-${shift++}`, band: cfg.band })
        queue = plan.orders.map((o) => orderProblem(o, plan.band, plan.decimals, r))
      }
      return queue.shift()!
    },
    reset() {
      shift = 0
      queue = []
    },
  }
}

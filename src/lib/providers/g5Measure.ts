import type { Problem, ProblemProvider, ProblemVisual } from '../problem'
import { randInt } from '../random'
import { NAMES, amountChoices, fmt, pick, withDistractors } from './g5MgdKit'

/**
 * 5th-grade Measurement Marsh (5.MD.1, 5.MD.3–5), procedural and correct by
 * construction:
 *
 * - `volume`: rectangular prisms: count the unit cubes, V = l × w × h, V = B × h,
 *   and figures made of two prisms (the `prism` visual);
 * - `convert`: converting units within one system (mm / cm / m / km, g / kg,
 *   mL / L, in / ft / yd, oz / lb, min / h): a speed round, every question
 *   readable without a picture;
 * - `mixed`: the boss: volume (also a missing edge) and multi-step story
 *   problems with conversions.
 *
 * Wrong options come from real slips: adding the edges, one layer only, a
 * layer too many, the cubes you can see, the wrong conversion factor, or
 * thinking an hour has 100 minutes.
 */

export type G5MeasureMode = 'volume' | 'convert' | 'mixed'
export interface G5MeasureConfig {
  mode: G5MeasureMode
}

export const G5_VOLUME_SKILL = { id: 'g5-volume', label: 'volume of prisms' }
export const G5_CONVERT_SKILL = { id: 'g5-convert', label: 'converting units' }

// ── units ────────────────────────────────────────────────────────────────────

interface UnitName {
  one: string
  many: string
}
const U: Record<string, UnitName> = {
  mm: { one: 'millimeter', many: 'millimeters' },
  cm: { one: 'centimeter', many: 'centimeters' },
  m: { one: 'meter', many: 'meters' },
  km: { one: 'kilometer', many: 'kilometers' },
  g: { one: 'gram', many: 'grams' },
  kg: { one: 'kilogram', many: 'kilograms' },
  mL: { one: 'milliliter', many: 'milliliters' },
  L: { one: 'liter', many: 'liters' },
  in: { one: 'inch', many: 'inches' },
  ft: { one: 'foot', many: 'feet' },
  yd: { one: 'yard', many: 'yards' },
  oz: { one: 'ounce', many: 'ounces' },
  lb: { one: 'pound', many: 'pounds' },
  min: { one: 'minute', many: 'minutes' },
  h: { one: 'hour', many: 'hours' },
}
/** "1 foot", "3 feet", "2.5 meters", "1,750 grams". */
export const qty = (n: number, unit: string) => `${fmt(n)} ${n === 1 ? U[unit].one : U[unit].many}`

/** A bigger unit, a smaller one, and how many of the smaller make one bigger. */
export interface UnitPair {
  big: string
  small: string
  f: number
  system: 'metric' | 'customary' | 'time'
}
export const UNIT_PAIRS: readonly UnitPair[] = [
  { big: 'cm', small: 'mm', f: 10, system: 'metric' },
  { big: 'm', small: 'cm', f: 100, system: 'metric' },
  { big: 'm', small: 'mm', f: 1000, system: 'metric' },
  { big: 'km', small: 'm', f: 1000, system: 'metric' },
  { big: 'kg', small: 'g', f: 1000, system: 'metric' },
  { big: 'L', small: 'mL', f: 1000, system: 'metric' },
  { big: 'ft', small: 'in', f: 12, system: 'customary' },
  { big: 'yd', small: 'ft', f: 3, system: 'customary' },
  { big: 'yd', small: 'in', f: 36, system: 'customary' },
  { big: 'lb', small: 'oz', f: 16, system: 'customary' },
  { big: 'h', small: 'min', f: 60, system: 'time' },
]
/** The factors a child mixes up within each system. */
const CONFUSE: Record<UnitPair['system'], number[]> = { metric: [10, 100, 1000], customary: [10, 12, 16, 3, 36], time: [100, 10, 30] }
/** Base-ten thinking: "3 hours 20 minutes is 320 minutes", "2 feet 5 inches is 25 inches". */
const BASE_SLIP: Record<UnitPair['system'], number> = { metric: 10, customary: 10, time: 100 }

// ── volume ───────────────────────────────────────────────────────────────────

const VOLUME_THINGS: Record<string, string[]> = {
  cm: ['A gift box', 'A pencil box', 'A jewelry box'],
  in: ['A shoebox', 'A fish tank', 'A cereal box'],
  ft: ['A toy chest', 'A garden bed', 'A sandbox'],
  m: ['A shipping crate', 'A storage shed', 'A moving truck'],
}
const EDGE_RANGE: Record<string, [number, number]> = { cm: [2, 12], in: [3, 12], ft: [2, 8], m: [2, 6] }
const cubic = (unit: string) => `cubic ${U[unit].many}`
const square = (unit: string) => `square ${U[unit].many}`

function prism(boxes: { l: number; w: number; h: number }[], unit: string, cubes: boolean, labels: 'edges' | 'base' | 'none'): ProblemVisual {
  return { kind: 'prism', boxes, unit, cubes, labels }
}

function vol(id: string, prompt: string, answer: number, cands: number[], hint: string, visual?: ProblemVisual, subtopic?: string): Problem {
  return {
    id,
    prompt,
    answer,
    options: withDistractors(answer, cands, (i) => answer + i * (i % 2 ? 1 : -1) * Math.max(1, Math.round(answer / 10))),
    topic: 'g5-volume',
    subtopic,
    visual,
    hint,
    skill: G5_VOLUME_SKILL,
  }
}

/** Count the 1-unit cubes of a box you can see the layers of (5.MD.3–4). */
function cubeCount(id: string): Problem {
  const l = randInt(2, 5)
  const w = randInt(2, 4)
  const h = randInt(2, 4)
  const unit = pick(['cm', 'in'])
  const V = l * w * h
  const seen = V - (l - 1) * (w - 1) * (h - 1)
  return vol(
    id,
    `This box is built from 1-${U[unit].one} cubes. What is its volume in ${cubic(unit)}?`,
    V,
    [seen, V + l * w, l * w, V - l * w, 2 * (l * w + l * h + w * h), l + w + h],
    `Count the cubes in the bottom layer (${l} × ${w}), then count the layers.`,
    prism([{ l, w, h }], unit, true, 'none'),
    'cubes',
  )
}

/** V = l × w × h from labelled edges (5.MD.5b). */
function edges(id: string): Problem {
  const unit = pick(['cm', 'in', 'ft', 'm'])
  const [lo, hi] = EDGE_RANGE[unit]
  let l = randInt(lo, hi)
  let w = randInt(lo, Math.min(hi, 9))
  const h = randInt(lo, Math.min(hi, 10))
  if (w > l) [l, w] = [w, l]
  const V = l * w * h
  const thing = pick(VOLUME_THINGS[unit])
  return vol(
    id,
    `${thing} is ${qty(l, unit)} long, ${qty(w, unit)} wide and ${qty(h, unit)} tall. What is its volume in ${cubic(unit)}?`,
    V,
    [l * w, l + w + h, V - l * w, V + l * w, 2 * (l * w + l * h + w * h)],
    `Volume = length × width × height = ${l} × ${w} × ${h}.`,
    prism([{ l, w, h }], unit, false, 'edges'),
    'lwh',
  )
}

/** V = B × h from the base's area (5.MD.5b). */
function baseTimesHeight(id: string): Problem {
  const unit = pick(['cm', 'in', 'ft', 'm'])
  const l = randInt(3, 9)
  const w = randInt(2, 7)
  const h = randInt(2, 9)
  const B = l * w
  return vol(
    id,
    `The base of this prism has an area of ${B} ${square(unit)}. The prism is ${h} ${U[unit].many} tall. What is its volume in ${cubic(unit)}?`,
    B * h,
    [B + h, B * (h + 1), B * (h - 1), B * h + h],
    `Volume = base area × height = ${B} × ${h}.`,
    prism([{ l, w, h }], unit, false, 'base'),
    'Bh',
  )
}

/** Two prisms side by side: add their volumes (5.MD.5c). */
function composed(id: string): Problem {
  const unit = pick(['cm', 'in', 'ft', 'm'])
  const cubes = Math.random() < 0.3
  const w = randInt(2, cubes ? 3 : 5)
  const l1 = randInt(2, cubes ? 4 : 6)
  const l2 = randInt(2, cubes ? 3 : 5)
  let h1 = randInt(2, cubes ? 4 : 7)
  let h2 = randInt(1, cubes ? 3 : 6)
  if (h1 === h2) h1++
  // counting cubes: the shorter box in front, so every layer shows
  if (cubes && h2 > h1) [h1, h2] = [h2, h1]
  const V1 = l1 * w * h1
  const V2 = l2 * w * h2
  const V = V1 + V2
  const big = (l1 + l2) * w * Math.max(h1, h2)
  const prompt = cubes
    ? `This figure is built from 1-${U[unit].one} cubes. What is its volume in ${cubic(unit)}?`
    : `This figure is made of two rectangular prisms. What is its total volume in ${cubic(unit)}?`
  return vol(
    id,
    prompt,
    V,
    [big, V1, (l1 + l2) * w * Math.min(h1, h2), V2, V + w],
    `Find the volume of each box (${l1} × ${w} × ${h1} and ${l2} × ${w} × ${h2}), then add them.`,
    prism(
      [
        { l: l1, w, h: h1 },
        { l: l2, w, h: h2 },
      ],
      unit,
      cubes,
      cubes ? 'none' : 'edges',
    ),
    'composed',
  )
}

/** A missing edge from the volume and the base (5.MD.5b, the other way round). */
function missingEdge(id: string): Problem {
  const unit = pick(['cm', 'in', 'ft', 'm'])
  const l = randInt(3, 9)
  const w = randInt(2, 6)
  const h = randInt(2, 9)
  const V = l * w * h
  const thing = pick(VOLUME_THINGS[unit])
  return vol(
    id,
    `${thing} has a volume of ${V} ${cubic(unit)}. Its base is ${qty(l, unit)} long and ${qty(w, unit)} wide. How many ${U[unit].many} tall is it?`,
    h,
    [w * h, l * h, l * w, V - l * w],
    `The base holds ${l} × ${w} = ${l * w} cubes in each layer. How many layers make ${V}?`,
    undefined,
    'missingEdge',
  )
}

// ── conversions ──────────────────────────────────────────────────────────────

function conv(id: string, prompt: string, answer: string, options: string[], hint: string, subtopic: string): Problem {
  return { id, prompt, answer, options, topic: 'g5-convert', subtopic, hint, skill: G5_CONVERT_SKILL }
}

/** Bigger unit → smaller: multiply ("3.5 kilograms = ? grams"). */
function toSmall(id: string, p: UnitPair): Problem {
  // metric: sometimes a decimal amount (5.MD.1 with 5.NBT.7)
  const tenths = p.system === 'metric' && p.f >= 100 && Math.random() < 0.4 ? pick([5, 15, 25, 35, 45, 75]) : randInt(2, p.f >= 36 ? 9 : 12) * 10
  const n = tenths / 10
  const answer = (tenths * p.f) / 10
  const [text, options] = amountChoices(
    answer,
    [...CONFUSE[p.system].filter((f) => f !== p.f).map((f) => (tenths * f) / 10), n + p.f, n],
    (i) => answer + i * p.f,
  )
  return conv(id, `${qty(n, p.big)} = ? ${U[p.small].many}`, text, options, `1 ${U[p.big].one} = ${qty(p.f, p.small)}, so multiply by ${p.f}.`, 'toSmall')
}

/** Smaller unit → bigger: divide ("350 centimeters = ? meters", "84 inches = ? feet"). */
function toBig(id: string, p: UnitPair): Problem {
  // metric answers may be decimals (3.5 m); customary and time come out whole
  const n = p.system === 'metric' ? pick([2, 3, 4, 5, 6, 7, 8, 9]) + (p.f >= 100 ? pick([0, 0.5, 0.25, 0.75]) : pick([0, 0.5])) : randInt(2, p.f >= 36 ? 6 : 10)
  const small = Math.round(n * p.f)
  const [text, options] = amountChoices(
    n,
    p.system === 'metric' ? [n * 10, n / 10, n * 100, n / 100, small] : [small / 10, small - p.f, n + 1, n * 2, n - 1],
    (i) => n + i,
  )
  return conv(id, `${qty(small, p.small)} = ? ${U[p.big].many}`, text, options, `${qty(p.f, p.small)} make 1 ${U[p.big].one}, so divide by ${p.f}.`, 'toBig')
}

const SHORT: Record<string, string> = { ft: 'ft', in: 'in', yd: 'yd', lb: 'lb', oz: 'oz', h: 'h', min: 'min' }
const mixed = (q: number, r: number, p: UnitPair) => `${q} ${SHORT[p.big]} ${r} ${SHORT[p.small]}`

/** A small amount as big and small units: "50 inches = 4 ft 2 in" (customary and time). */
function remainder(id: string, p: UnitPair): Problem {
  const q = randInt(1, p.f >= 36 ? 3 : 5)
  const r = randInt(1, p.f - 1)
  const n = q * p.f + r
  const b = BASE_SLIP[p.system]
  const answer = mixed(q, r, p)
  const options = withDistractors(
    answer,
    // (base-ten thinking; never "0 yd 4 ft", which is just another way to write 4 feet)
    [...(n >= b ? [mixed(Math.floor(n / b), n % b, p)] : []), mixed(q + 1, r, p), q > 1 ? mixed(q - 1, r, p) : mixed(q, (r + 1) % p.f || 1, p), mixed(q, Math.max(1, p.f - r), p)],
    (i) => mixed(q + i + 1, r, p),
  )
  return conv(id, `Write ${qty(n, p.small)} in ${U[p.big].many} and ${U[p.small].many}.`, answer, options, `How many groups of ${p.f} ${U[p.small].many} fit in ${n}? The ${U[p.small].many} left over stay.`, 'remainder')
}

/** Big and small units → all small: "2 feet 5 inches = ? inches". */
function fromMixed(id: string, p: UnitPair): Problem {
  const q = randInt(2, p.f >= 36 ? 4 : 6)
  const r = randInt(1, p.f - 1)
  const n = q * p.f + r
  const [text, options] = amountChoices(n, [q * BASE_SLIP[p.system] + r, q * p.f, q * p.f - r, q + r], (i) => n + i * (i % 2 ? 1 : -1))
  return conv(id, `${qty(q, p.big)} ${qty(r, p.small)} = ? ${U[p.small].many}`, text, options, `${qty(q, p.big)} = ${qty(q * p.f, p.small)}. Then add ${r} more.`, 'fromMixed')
}

const CUSTOMARY = UNIT_PAIRS.filter((p) => p.system !== 'metric')

function convertQuick(id: string): Problem {
  const r = Math.random()
  if (r < 0.4) return toSmall(id, pick(UNIT_PAIRS))
  if (r < 0.7) return toBig(id, pick(UNIT_PAIRS))
  if (r < 0.85) return fromMixed(id, pick(CUSTOMARY))
  return remainder(id, pick(CUSTOMARY))
}

// ── multi-step story problems (5.MD.1) ───────────────────────────────────────

type Story = (id: string) => Problem

const STORIES: Story[] = [
  // cut a ribbon
  (id) => {
    const name = pick(NAMES)
    const m = randInt(2, 5)
    const c = pick([25, 40, 45, 60, 75, 80, 120, 150])
    const left = 100 * m - c
    const [text, options] = amountChoices(left, [100 * m + c, 1000 * m - c, 10 * m - c, left - 100], (i) => left + 5 * i)
    return conv(id, `${name} has a ribbon ${qty(m, 'm')} long and cuts off ${qty(c, 'cm')}. How many centimeters of ribbon are left?`, text, options, `${qty(m, 'm')} = ${qty(100 * m, 'cm')}. Then subtract ${c}.`, 'story')
  },
  // trail mix bags
  (id) => {
    const name = pick(NAMES)
    const p = randInt(2, 5)
    const o = pick([2, 4, 8])
    const bags = (16 * p) / o
    const [text, options] = amountChoices(bags, [(10 * p) / o, 16 * p, (12 * p) / o, bags * 2, bags / 2], (i) => bags + i)
    return conv(id, `${name} has ${qty(p, 'lb')} of trail mix and fills bags that hold ${qty(o, 'oz')} each. How many bags can ${name} fill?`, text, options, `${qty(p, 'lb')} = ${qty(16 * p, 'oz')}. How many groups of ${o} is that?`, 'story')
  },
  // lemonade
  (id) => {
    const ml = pick([250, 500, 750])
    const k = randInt(2, 8)
    const liters = (ml * k) / 1000
    const [text, options] = amountChoices(liters, [(ml * k) / 100, (ml * k) / 10, ml * k, liters * 10], (i) => liters + i * 0.5)
    return conv(id, `One pitcher of lemonade uses ${qty(ml, 'mL')} of juice. How many liters of juice do ${k} pitchers use?`, text, options, `${k} × ${ml} = ${fmt(ml * k)} milliliters, and 1,000 milliliters make 1 liter.`, 'story')
  },
  // laps
  (id) => {
    const name = pick(NAMES)
    const lap = pick([200, 250, 400, 500])
    const km = lap === 400 ? pick([2, 4]) : randInt(1, 4)
    const laps = (1000 * km) / lap
    const [text, options] = amountChoices(laps, [laps * 10, laps / 10, laps + 1, laps - 1, laps * 2], (i) => laps + i + 1)
    return conv(id, `One lap of the track is ${qty(lap, 'm')}. How many laps does ${name} run to go ${qty(km, 'km')}?`, text, options, `${qty(km, 'km')} = ${qty(1000 * km, 'm')}. How many ${lap}s fit in ${fmt(1000 * km)}?`, 'story')
  },
  // a movie
  (id) => {
    const h = randInt(1, 2)
    const m = randInt(1, 11) * 5
    const total = 60 * h + m
    const [text, options] = amountChoices(total, [100 * h + m, 60 * h, h + m, 60 * h - m], (i) => total + 5 * i)
    return conv(id, `A movie is ${qty(h, 'h')} ${qty(m, 'min')} long. How many minutes long is it?`, text, options, `${qty(h, 'h')} = ${qty(60 * h, 'min')}. Then add ${m}.`, 'story')
  },
  // who ran farther
  (id) => {
    const [a, b] = [pick(NAMES.slice(0, 6)), pick(NAMES.slice(6))]
    const km = randInt(2, 5)
    const d = pick([150, 250, 300, 450, 500, 750])
    const meters = 1000 * km - d
    const [text, options] = amountChoices(d, [meters - km, 1000 * km + meters, d + 1000, d * 10], (i) => d + 50 * i)
    return conv(id, `${a} ran ${qty(km, 'km')}. ${b} ran ${qty(meters, 'm')}. How many more meters did ${a} run?`, text, options, `${qty(km, 'km')} = ${qty(1000 * km, 'm')}. Subtract ${fmt(meters)}.`, 'story')
  },
  // a water jug
  (id) => {
    const L = randInt(2, 5)
    const cup = pick([200, 250, 500])
    const cups = (1000 * L) / cup
    const [text, options] = amountChoices(cups, [cups * 10, cups / 10, cups + L, cups - 1], (i) => cups + i)
    return conv(id, `A jug holds ${qty(L, 'L')} of water. Each cup holds ${qty(cup, 'mL')}. How many cups can be filled?`, text, options, `${qty(L, 'L')} = ${qty(1000 * L, 'mL')}. How many ${cup}s fit in ${fmt(1000 * L)}?`, 'story')
  },
  // kittens' weight
  (id) => {
    const [o, k] = pick([[8, 4], [8, 6], [12, 4], [6, 8], [10, 8], [4, 8], [12, 8], [16, 3]] as const)
    const lb = (o * k) / 16
    const [text, options] = amountChoices(lb, [o * k, (o * k) / 10, (o * k) / 12, lb + 1], (i) => lb + i)
    return conv(id, `Each kitten in a litter weighs ${qty(o, 'oz')}. How many pounds do ${k} kittens weigh in all?`, text, options, `${k} × ${o} = ${o * k} ounces, and 16 ounces make 1 pound.`, 'story')
  },
]

// ── the provider ─────────────────────────────────────────────────────────────

function volumeQuestion(id: string, boss: boolean): Problem {
  const r = Math.random()
  if (boss) {
    if (r < 0.15) return cubeCount(id)
    if (r < 0.4) return edges(id)
    if (r < 0.55) return baseTimesHeight(id)
    if (r < 0.8) return composed(id)
    return missingEdge(id)
  }
  if (r < 0.3) return cubeCount(id)
  if (r < 0.6) return edges(id)
  if (r < 0.8) return baseTimesHeight(id)
  return composed(id)
}

export function makeG5MeasureProvider(cfg: G5MeasureConfig): ProblemProvider {
  let serial = 0
  return {
    topic: 'g5-measurement',
    next(): Problem {
      const id = `g5-measure-${cfg.mode}-${serial++}`
      switch (cfg.mode) {
        case 'volume':
          return volumeQuestion(id, false)
        case 'convert':
          return convertQuick(id)
        case 'mixed': {
          // the boss: half volume, half conversions (mostly story problems)
          if (serial % 2 === 1) return volumeQuestion(id, true)
          return Math.random() < 0.65 ? pick(STORIES)(id) : convertQuick(id)
        }
      }
    },
  }
}

import type { Problem, ProblemProvider } from '../problem'
import { randInt } from '../random'
import { TWO_DIGIT_ARENA } from '../arena/divisionCore'
import { fmt, numberOptions, pick, textOptions, weighted } from './g5Shared'

/**
 * 5th-grade Division Dunes (K–5 plan, grade-5 contract): long division up to
 * 4-digit by 2-digit, and what to do with a remainder in a story: round up,
 * drop it, or answer with it (5.NBT.6). Procedural: every dividend is built
 * from its quotient (dividend = divisor × quotient + remainder), so answers are
 * right by construction; wrong choices are real slips (one more or one fewer,
 * a zero lost from the middle of the quotient, the remainder given as the
 * answer, "6 R 13" when the story wants a whole number).
 *
 * Modes:
 * - `long`: long division, with the set-up drawn (a quotient, the first step, an estimate);
 * - `arena`: Crystal Golems' two-digit-divisor facts ("288 ÷ ? = 12");
 * - `remainders`: story problems where the remainder decides the answer;
 * - `mastery`: everything, in words only (the boss shows no pictures).
 */

export type G5DivMode = 'long' | 'arena' | 'remainders' | 'mastery'
export interface G5DivConfig {
  mode: G5DivMode
}

export const G5_DIV_SKILLS = {
  long: { id: 'g5-div-long', label: 'long division' },
  twoDigit: { id: 'g5-div-2digit', label: 'dividing by two-digit numbers' },
  remainders: { id: 'g5-div-remainders', label: 'what to do with a remainder' },
} as const

const TOPIC = 'g5-division'

/** A quotient with a zero in the middle written without it: 104 → 14, 2,030 → 23 (or null when it has none). */
export function lostZero(q: number): number | null {
  const s = String(q)
  const inner = s.slice(1, -1)
  if (!inner.includes('0')) return null
  return Number(s[0] + inner.replace(/0/g, '') + s[s.length - 1])
}

export interface LongDivision {
  dividend: number
  divisor: number
  quotient: number
}

/**
 * A whole-number long division of a given size: 3-digit ÷ 1-digit, 3-digit ÷
 * 2-digit or 4-digit ÷ 2-digit. About a third of the bigger quotients get a
 * zero in the middle (the digit kids forget to write).
 */
export function longDivision(size: '3by1' | '3by2' | '4by2'): LongDivision {
  for (;;) {
    let divisor: number
    let quotient: number
    if (size === '3by1') {
      divisor = randInt(3, 9)
      quotient = Math.random() < 0.3 ? randInt(1, 1) * 100 + randInt(1, 9) : randInt(21, 199)
    } else if (size === '3by2') {
      divisor = randInt(12, 49)
      quotient = randInt(12, 39)
    } else {
      divisor = randInt(12, 89)
      quotient = Math.random() < 0.3 ? randInt(1, 2) * 100 + randInt(1, 9) : randInt(21, 299)
    }
    if (divisor % 10 === 0) continue
    const dividend = divisor * quotient
    const digits = String(dividend).length
    if (size === '4by2' ? digits === 4 : digits === 3) return { dividend, divisor, quotient }
  }
}

/** The first part of the dividend the divisor fits into (the first step of long division): 672 ÷ 28 → 67. */
export function firstChunk(dividend: number, divisor: number): { chunk: number; digits: number } {
  const s = String(dividend)
  for (let k = 1; k <= s.length; k++) {
    const chunk = Number(s.slice(0, k))
    if (chunk >= divisor) return { chunk, digits: k }
  }
  return { chunk: dividend, digits: s.length }
}

function quotientProblem(id: string, d: LongDivision, drawn: boolean): Problem {
  const { dividend, divisor, quotient } = d
  const lz = lostZero(quotient)
  const { options, answer } = numberOptions(quotient, [lz ?? NaN, quotient + 1, quotient - 1, quotient + 10, quotient * 10])
  const { chunk } = firstChunk(dividend, divisor)
  return {
    id,
    prompt: `${fmt(dividend)} ÷ ${divisor} = ?`,
    options,
    answer,
    visual: drawn ? { kind: 'longDivision', dividend, divisor } : undefined,
    topic: TOPIC,
    subtopic: 'quotient',
    difficulty: String(dividend).length + String(divisor).length - 2,
    skill: { ...(divisor >= 10 ? G5_DIV_SKILLS.twoDigit : G5_DIV_SKILLS.long) },
    hint: `Start with ${chunk}: how many ${divisor}s fit? Then bring down the next digit. Check: ${divisor} × your answer should be ${fmt(dividend)}.`,
  }
}

function firstStepProblem(id: string, d: LongDivision, drawn: boolean): Problem {
  const { dividend, divisor } = d
  const { chunk, digits } = firstChunk(dividend, divisor)
  const n = Math.floor(chunk / divisor)
  const { options, answer } = numberOptions(n, [n + 1, n - 1, n + 2, Math.ceil(chunk / divisor) + 1])
  return {
    id,
    prompt: `The first step of ${fmt(dividend)} ÷ ${divisor}: how many ${divisor}s fit in ${chunk}?`,
    options,
    answer,
    visual: drawn ? { kind: 'longDivision', dividend, divisor, highlight: digits } : undefined,
    topic: TOPIC,
    subtopic: 'first-step',
    difficulty: 2,
    skill: { ...G5_DIV_SKILLS.long },
    hint: `${divisor} × ${n} = ${divisor * n}, and ${divisor} × ${n + 1} = ${divisor * (n + 1)} is too big for ${chunk}.`,
  }
}

/**
 * "Which is the best estimate for 4,512 ÷ 48?": the divisor sits next to a
 * multiple of ten and the dividend next to a multiple of it, so compatible
 * numbers give one clear estimate (4,500 ÷ 50 = 90).
 */
function estimateProblem(id: string): Problem {
  const tens = randInt(2, 9)
  const divisor = tens * 10 + pick([-2, -1, 1, 2])
  const est = randInt(2, 9) * 10
  const dividend = est * tens * 10 + randInt(-4, 4) * tens
  const { options, answer } = numberOptions(est, [est * 10, est / 10, est - 10, est + 10])
  return {
    id,
    prompt: `Which is the best estimate for ${fmt(dividend)} ÷ ${divisor}?`,
    options,
    answer,
    topic: TOPIC,
    subtopic: 'estimate',
    difficulty: 2,
    skill: { ...G5_DIV_SKILLS.long },
    hint: `${divisor} is close to ${tens * 10}, and ${fmt(dividend)} is close to ${fmt(est * tens * 10)}. Divide those.`,
  }
}

/** A two-digit-divisor fact the size Crystal Golems uses (the pen shows the quotient). */
export function arenaFact(): LongDivision {
  const divisor = randInt(TWO_DIGIT_ARENA.divisorMin, TWO_DIGIT_ARENA.divisorMax)
  const quotient = randInt(Math.max(3, TWO_DIGIT_ARENA.quotientMin), TWO_DIGIT_ARENA.quotientMax)
  return { dividend: divisor * quotient, divisor, quotient }
}

/** Two-digit factors of n (other than `not`) whose split stays small. */
function twoDigitFactors(n: number, not: number): number[] {
  const out: number[] = []
  for (let f = 11; f <= 99 && f < n; f++) if (n % f === 0 && f !== not) out.push(f)
  return out
}

function arenaProblem(id: string): Problem {
  const { dividend, divisor, quotient } = arenaFact()
  if (Math.random() < 0.5) {
    // the arena's own question: which divisor makes this many groups?
    const { options, answer } = numberOptions(divisor, [divisor + 1, divisor - 1, ...twoDigitFactors(dividend, divisor), divisor + 10, divisor + 2])
    return {
      id,
      prompt: `${fmt(dividend)} ÷ ? = ${quotient}`,
      options,
      answer,
      topic: TOPIC,
      subtopic: 'missing-divisor',
      difficulty: 2,
      skill: { ...G5_DIV_SKILLS.twoDigit },
      hint: `Think: ${quotient} × what = ${fmt(dividend)}?`,
    }
  }
  const { options, answer } = numberOptions(quotient, [quotient + 1, quotient - 1, quotient + 2, quotient * 10])
  return {
    id,
    prompt: `${fmt(dividend)} ÷ ${divisor} = ?`,
    options,
    answer,
    topic: TOPIC,
    subtopic: 'two-digit-fact',
    difficulty: 2,
    skill: { ...G5_DIV_SKILLS.twoDigit },
    hint: `Try ${divisor} × ${Math.min(quotient + 1, 9)} = ${divisor * Math.min(quotient + 1, 9)}. Too big? Go down one.`,
  }
}

// ── remainders in stories ───────────────────────────────────────────────────

/** What the story does with the remainder: round up (one more bus), drop it (full boxes only), or ask for it. */
export type RemainderUse = 'up' | 'drop' | 'left'

export interface RemainderStory {
  use: RemainderUse
  /** The group size's range (the divisor). */
  per: [number, number]
  text: (total: string, per: string) => string
}

/** Story templates (5.NBT.6 in context); the numbers are filled in so there is always a remainder. */
export const REMAINDER_STORIES: RemainderStory[] = [
  // round up: the leftovers still need a bus (a box, a table, a trip)
  { use: 'up', per: [24, 48], text: (n, d) => `${n} students are going on a field trip. Each bus holds ${d} students. How many buses are needed?` },
  { use: 'up', per: [12, 16], text: (n, d) => `A camp has ${n} campers. Each cabin sleeps ${d} campers. How many cabins are needed so every camper has a bed?` },
  { use: 'up', per: [18, 36], text: (n, d) => `${n} books need to be packed. Each box holds ${d} books. How many boxes are needed to pack all of them?` },
  { use: 'up', per: [12, 24], text: (n, d) => `A ferry carries ${d} cars on each trip. ${n} cars are waiting. How many trips does the ferry need to carry them all?` },
  { use: 'up', per: [12, 24], text: (n, d) => `Juice comes in packs of ${d} bottles. The school needs ${n} bottles. How many packs must it buy?` },
  { use: 'up', per: [11, 14], text: (n, d) => `${n} people are coming to a dinner. Each table seats ${d} people. How many tables are needed?` },
  // drop it: only full groups count
  { use: 'drop', per: [12, 30], text: (n, d) => `A baker has ${n} cookies. She puts ${d} cookies in each box. How many boxes can she fill?` },
  { use: 'drop', per: [15, 45], text: (n, d) => `A ribbon is ${n} centimeters long. Each bow needs ${d} centimeters. How many bows can be made?` },
  { use: 'drop', per: [15, 35], text: (n, d) => `Max has ${n} cents. Each sticker costs ${d} cents. How many stickers can he buy?` },
  { use: 'drop', per: [12, 18], text: (n, d) => `A farmer packs ${n} eggs in cartons of ${d}. How many full cartons can he pack?` },
  { use: 'drop', per: [11, 15], text: (n, d) => `${n} players sign up for a tournament. Each team needs exactly ${d} players. How many full teams can be made?` },
  { use: 'drop', per: [16, 36], text: (n, d) => `A rope is ${n} inches long. It is cut into pieces ${d} inches long. How many whole pieces are there?` },
  // the remainder is the answer
  { use: 'left', per: [12, 25], text: (n, d) => `${n} marbles are shared equally among ${d} friends. How many marbles are left over?` },
  { use: 'left', per: [12, 24], text: (n, d) => `A teacher has ${n} pencils and puts ${d} pencils in each cup. After filling every cup she can, how many pencils are left?` },
  { use: 'left', per: [11, 16], text: (n, d) => `${n} cards are dealt equally to ${d} players. How many cards are left over?` },
  { use: 'left', per: [14, 32], text: (n, d) => `A gardener plants ${n} seeds in rows of ${d}. How many seeds are in the last row, the one that is not full?` },
  { use: 'left', per: [20, 45], text: (n, d) => `A library has ${n} books for shelves that hold ${d} books each. After filling as many shelves as it can, how many books are left?` },
  { use: 'left', per: [12, 30], text: (n, d) => `${n} stickers come on sheets of ${d}. How many stickers are left after the full sheets?` },
]

/** The answer a story wants from total ÷ per = quotient R remainder. */
export function remainderAnswer(use: RemainderUse, quotient: number, remainder: number): number {
  return use === 'up' ? quotient + 1 : use === 'drop' ? quotient : remainder
}

function remainderProblem(id: string, use: RemainderUse = pick(['up', 'drop', 'left'] as const)): Problem {
  const s = pick(REMAINDER_STORIES.filter((x) => x.use === use))
  const per = randInt(s.per[0], s.per[1])
  const quotient = randInt(3, 64)
  // a remainder that isn't the quotient (or one off it), so every choice says something different
  let remainder = randInt(1, per - 1)
  for (let i = 0; i < 20 && Math.abs(remainder - quotient) <= 1; i++) remainder = randInt(1, per - 1)
  const total = per * quotient + remainder
  const want = remainderAnswer(use, quotient, remainder)
  const raw = `${quotient} R ${remainder}`
  const wrongs = use === 'up' ? [quotient, remainder, quotient + 2] : use === 'drop' ? [quotient + 1, remainder, quotient - 1] : [quotient, per - remainder, quotient + 1]
  const nums = [...new Set(wrongs.filter((w) => w > 0 && w !== want))].map(fmt)
  const { options, answer } = textOptions(fmt(want), [raw, ...nums, fmt(want + 2), fmt(want + 3)])
  const why =
    use === 'up'
      ? `${remainder === 1 ? 'That 1 left over still needs' : `Those ${remainder} left over still need`} a place, so it takes one more: ${quotient + 1}.`
      : use === 'drop'
        ? `Only full groups count, so the ${remainder} left over are not enough for another one.`
        : `The question asks for the leftovers: that is the remainder.`
  return {
    id,
    prompt: s.text(fmt(total), String(per)),
    options,
    answer,
    topic: TOPIC,
    subtopic: `remainder-${use}`,
    difficulty: 3,
    skill: { ...G5_DIV_SKILLS.remainders },
    hint: `${fmt(total)} ÷ ${per} = ${quotient} R ${remainder}. ${why}`,
  }
}

// ── the provider ────────────────────────────────────────────────────────────

export function makeG5DivProvider(cfg: G5DivConfig): ProblemProvider {
  let serial = 0
  // the remainder stage cycles through the three uses, so a round of six meets each twice
  let useTurn = randInt(0, 2)
  const nextUse = (): RemainderUse => (['up', 'drop', 'left'] as const)[useTurn++ % 3]
  return {
    topic: TOPIC,
    next(): Problem {
      const id = `g5div-${cfg.mode}-${serial++}`
      switch (cfg.mode) {
        case 'long': {
          const k = weighted([
            ['quotient', 0.55],
            ['first', 0.25],
            ['estimate', 0.2],
          ] as const)
          const size = weighted([
            ['3by1', 0.25],
            ['3by2', 0.35],
            ['4by2', 0.4],
          ] as const)
          if (k === 'estimate') return estimateProblem(id)
          if (k === 'first') return firstStepProblem(id, longDivision(size === '3by1' ? '3by2' : size), true)
          return quotientProblem(id, longDivision(size), true)
        }
        case 'arena':
          return arenaProblem(id)
        case 'remainders':
          return remainderProblem(id, nextUse())
        case 'mastery': {
          const k = weighted([
            ['quotient', 0.35],
            ['remainder', 0.35],
            ['estimate', 0.15],
            ['first', 0.15],
          ] as const)
          if (k === 'remainder') return remainderProblem(id, nextUse())
          if (k === 'estimate') return estimateProblem(id)
          if (k === 'first') return firstStepProblem(id, longDivision('4by2'), false)
          return quotientProblem(id, longDivision(Math.random() < 0.7 ? '4by2' : '3by2'), false)
        }
      }
    },
  }
}

/** For tests and the lesson: one problem of a given shape. */
export const g5DivMakers = { quotientProblem, firstStepProblem, estimateProblem, arenaProblem, remainderProblem }

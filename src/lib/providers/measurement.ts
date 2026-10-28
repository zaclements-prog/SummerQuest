import type { Problem, ProblemProvider, WalkCoinHop, WalkStep } from '../problem'
import { lineText } from '../../voice/registry'
import { randInt, shuffle } from '../random'

interface Config {
  type: 'area' | 'perimeter' | 'time' | 'money' | 'mixed'
}

export function makeMeasurementProvider(cfg: Config): ProblemProvider {
  let serial = 0
  function pick(): 'area' | 'perimeter' | 'time' | 'money' {
    if (cfg.type === 'mixed') {
      return (['area', 'perimeter', 'time', 'money'] as const)[randInt(0, 3)]
    }
    return cfg.type
  }
  return {
    topic: 'measurement',
    next(): Problem {
      const which = pick()
      switch (which) {
        case 'area':
          return area(serial++)
        case 'perimeter':
          return perimeter(serial++)
        case 'time':
          return time(serial++)
        case 'money':
          return money(serial++)
      }
    },
  }
}

function area(idx: number): Problem {
  const w = randInt(2, 9)
  const h = randInt(2, 9)
  const ans = w * h
  return mcProblem({
    id: `meas-area-${idx}`,
    prompt: `A rectangle is ${w} units wide and ${h} units tall. What is its area?`,
    answer: ans,
    topic: 'measurement-area',
    hint: `Area = width × height = ${w} × ${h}`,
    visual: { kind: 'shape', type: 'rect', width: w, height: h, unit: 'units' },
    distractors: [w + h, 2 * (w + h), w * h + w, w * h - w],
    skill: { id: 'meas-area', label: 'area' },
  })
}

function perimeter(idx: number): Problem {
  const w = randInt(2, 12)
  const h = randInt(2, 12)
  const ans = 2 * (w + h)
  return mcProblem({
    id: `meas-perim-${idx}`,
    prompt: `A rectangle is ${w} units wide and ${h} units tall. What is its perimeter?`,
    answer: ans,
    topic: 'measurement-perimeter',
    hint: `Perimeter = 2 × (width + height) = 2 × (${w} + ${h})`,
    visual: { kind: 'shape', type: 'rect', width: w, height: h, unit: 'units' },
    distractors: [w + h, w * h, 4 * (w + h), 2 * w + h],
    skill: { id: 'meas-perimeter', label: 'perimeter' },
  })
}

function time(idx: number): Problem {
  // elapsed time problem
  const startH = randInt(1, 11)
  const startM = randInt(0, 5) * 5
  const elapsedH = randInt(0, 2)
  const elapsedM = randInt(1, 11) * 5
  const endTotal = startH * 60 + startM + elapsedH * 60 + elapsedM
  const elapsedStr =
    elapsedH > 0
      ? `${elapsedH} hour${elapsedH > 1 ? 's' : ''} and ${elapsedM} minutes`
      : `${elapsedM} minutes`
  const ans = clockTime(endTotal)
  // Near-miss times (5 or 10 minutes off, an hour off), deduped so the answer can
  // never appear twice (e.g. "−10 minutes" from 4:00 used to clamp to 4:00).
  const distractors = uniqueOptions(
    ans,
    [5, 60, -10, -5, 10, -60].map((d) => clockTime(endTotal + d)),
  )
  return {
    id: `meas-time-${idx}`,
    prompt: `It is ${startH}:${String(startM).padStart(2, '0')}. What time will it be in ${elapsedStr}?`,
    options: shuffle([ans, ...distractors]),
    answer: ans,
    topic: 'measurement-time',
    visual: { kind: 'clock', hour: startH, minute: startM },
    hint: `Add ${elapsedStr}.`,
    skill: { id: 'meas-time', label: 'telling time' },
    showMe: timeWalkthrough(startH * 60 + startM, elapsedH, elapsedM),
  }
}

function money(idx: number): Problem {
  // give amount, ask for change from $X
  const costCents = randInt(20, 480)
  // Pay with the next dollar up, a dollar more, or a $5/$10 bill — so the change
  // isn't always $1.xx (which made the answer guessable from the pattern).
  const bills = [Math.ceil(costCents / 100), Math.ceil(costCents / 100) + 1, 5, 10].filter(
    (d) => d * 100 > costCents,
  )
  const paidDollars = bills[randInt(0, bills.length - 1)]
  const change = paidDollars * 100 - costCents
  const ans = formatMoney(change)
  const distractors = uniqueOptions(ans, [
    formatMoney(change + 10),
    formatMoney(change + 100),
    formatMoney(Math.max(1, change - 25)),
    formatMoney(change + 5),
    formatMoney(Math.max(1, change - 10)),
  ])
  return {
    id: `meas-money-${idx}`,
    prompt: `Something costs ${formatMoney(costCents)}. You pay with $${paidDollars}. How much change do you get?`,
    options: shuffle([ans, ...distractors]),
    answer: ans,
    topic: 'measurement-money',
    visual: { kind: 'money', cents: costCents },
    hint: `Subtract ${formatMoney(costCents)} from $${paidDollars}.00`,
    skill: { id: 'meas-money', label: 'money' },
    showMe: moneyWalkthrough(costCents, paidDollars * 100),
  }
}

// ── "Show me how" walkthroughs (src/games/_shared/ShowMeHow.tsx) ─────────────
// Built from the problem's own numbers (no randomness: the question stream is
// unchanged), stopping one step short: the last step asks, never answers.

/** The fixed text of a show-me voice line (the step says exactly what the clip says). */
function fixedLine(id: string): Pick<WalkStep, 'say' | 'voice'> {
  return { say: lineText(id) ?? '', voice: { line: id } }
}

/**
 * The minutes part of an elapsed-time jump, in friendly chunks: crossing the
 * hour goes to the hour first (11:45 + 30 → +15 to 12:00, then +15); a long
 * jump that stays inside the hour goes by half an hour first (+45 → +30, +15).
 */
export function minuteChunks(fromMinute: number, minutes: number): number[] {
  if (fromMinute > 0 && fromMinute + minutes > 60) return [60 - fromMinute, fromMinute + minutes - 60]
  return minutes > 30 ? [30, minutes - 30] : [minutes]
}

/**
 * Elapsed time: start at the start time, jump the whole hours one by one,
 * then the minutes in friendly chunks; the last chunk's landing is the
 * child's ("So what time will it be?").
 */
export function timeWalkthrough(start: number, hours: number, minutes: number): WalkStep[] {
  const steps: WalkStep[] = []
  const jumps: number[] = []
  const vis = (pending?: number) => ({ kind: 'timeJumps' as const, start, jumps: [...jumps], ...(pending ? { pending } : {}) })
  let cur = start
  steps.push({ say: `We start at ${clockTime(cur)}.`, visual: vis() })
  for (let i = 0; i < hours; i++) {
    const from = cur
    cur += 60
    jumps.push(60)
    steps.push({ say: `Jump ${i === 0 ? '1 hour' : '1 more hour'}: ${clockTime(from)} to ${clockTime(cur)}.`, visual: vis() })
  }
  const chunks = minuteChunks(cur % 60, minutes)
  const last = chunks.pop()!
  for (const c of chunks) {
    const from = cur
    cur += c
    jumps.push(c)
    const toHour = cur % 60 === 0
    steps.push({
      say: toHour
        ? `Jump ${c} minutes to the next hour: ${clockTime(from)} to ${clockTime(cur)}.`
        : `Now the minutes. Jump ${c} minutes: ${clockTime(from)} to ${clockTime(cur)}.`,
      visual: vis(),
    })
  }
  steps.push({
    say: chunks.length ? `Then ${last} more minutes.` : hours ? `Now the minutes: ${last} more.` : `Now jump ${last} minutes.`,
    visual: vis(last),
  })
  steps.push({ ...fixedLine('show-me/timeYourTurn'), visual: vis(last), yourTurn: true })
  return steps
}

const COINS: { coin: WalkCoinHop['coin']; each: number; one: string; many: string }[] = [
  { coin: 'penny', each: 1, one: 'a penny', many: 'pennies' },
  { coin: 'nickel', each: 5, one: 'a nickel', many: 'nickels' },
  { coin: 'dime', each: 10, one: 'a dime', many: 'dimes' },
  { coin: 'quarter', each: 25, one: 'a quarter', many: 'quarters' },
  { coin: 'dollar', each: 100, one: 'a 1 dollar bill', many: 'one-dollar bills' },
  { coin: 'five', each: 500, one: 'a 5 dollar bill', many: 'five-dollar bills' },
]
const coinOf = (coin: WalkCoinHop['coin']) => COINS.find((c) => c.coin === coin)!

/**
 * Counting up from the cost to what was paid, as a shopkeeper gives change:
 * pennies to a nickel's worth, dimes (and a nickel) to the next quarter,
 * quarters to the next dollar, then dollar bills (a $5 bill from $5 to $10).
 * Same coins in a row are one hop.
 */
export function countUpHops(cost: number, paid: number): WalkCoinHop[] {
  const hops: WalkCoinHop[] = []
  const add = (coin: WalkCoinHop['coin'], count: number) => {
    if (count <= 0) return
    const last = hops[hops.length - 1]
    if (last && last.coin === coin) last.count += count
    else hops.push({ coin, each: coinOf(coin).each, count })
  }
  let cur = cost
  const pennies = (5 - (cur % 5)) % 5
  add('penny', pennies)
  cur += pennies
  const toQuarter = (25 - (cur % 25)) % 25
  add('dime', Math.floor(toQuarter / 10))
  add('nickel', toQuarter % 10 === 5 ? 1 : 0)
  cur += toQuarter
  const quarters = ((100 - (cur % 100)) % 100) / 25
  add('quarter', quarters)
  cur += quarters * 25
  while (cur < paid) {
    if (cur % 500 === 0 && cur + 500 <= paid) {
      add('five', 1)
      cur += 500
    } else {
      add('dollar', 1)
      cur += 100
    }
  }
  return hops
}

/** Making change: count up from the cost to what was paid; the child adds up the hops. */
export function moneyWalkthrough(cost: number, paid: number): WalkStep[] {
  const hops = countUpHops(cost, paid)
  const steps: WalkStep[] = []
  const done: WalkCoinHop[] = []
  const vis = (askTotal = false) => ({ kind: 'countUp' as const, cost, paid, hops: done.map((h) => ({ ...h })), ...(askTotal ? { askTotal } : {}) })
  steps.push({ say: `It costs ${formatMoney(cost)}. Let's count up to the ${formatMoney(paid)} we paid, like a shopkeeper!`, visual: vis() })
  let cur = cost
  for (const h of hops) {
    const c = coinOf(h.coin)
    cur += h.each * h.count
    done.push(h)
    steps.push({ say: `Add ${h.count === 1 ? c.one : `${h.count} ${c.many}`}. That makes ${formatMoney(cur)}.`, visual: vis() })
  }
  steps.push({ ...fixedLine('show-me/moneyYourTurn'), visual: vis(true), yourTurn: true })
  return steps
}

/** h:mm on a 12-hour clock for a number of minutes after midnight. */
export function clockTime(totalMinutes: number): string {
  const t = ((totalMinutes % 720) + 720) % 720
  return `${Math.floor(t / 60) || 12}:${String(t % 60).padStart(2, '0')}`
}

/** First three candidates that differ from the answer and from each other. */
function uniqueOptions(answer: string, candidates: string[]): string[] {
  const out: string[] = []
  for (const c of candidates) {
    if (c !== answer && !out.includes(c)) out.push(c)
    if (out.length === 3) break
  }
  return out
}

export function formatMoney(cents: number): string {
  const d = Math.floor(cents / 100)
  const c = cents % 100
  return `$${d}.${String(c).padStart(2, '0')}`
}

function mcProblem(args: {
  id: string
  prompt: string
  answer: number
  topic: string
  hint?: string
  visual?: Problem['visual']
  distractors: number[]
  skill?: Problem['skill']
}): Problem {
  const set = new Set<number>()
  for (const d of args.distractors) {
    if (d > 0 && d !== args.answer && set.size < 3) set.add(d)
  }
  while (set.size < 3) set.add(args.answer + randInt(1, 5))
  return {
    id: args.id,
    prompt: args.prompt,
    options: shuffle([args.answer, ...Array.from(set)]),
    answer: args.answer,
    topic: args.topic,
    visual: args.visual,
    hint: args.hint,
    skill: args.skill,
  }
}

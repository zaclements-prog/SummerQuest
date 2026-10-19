import { seededRng } from '../random'
import { OP_SETS, makeGatePair, maxFactorFor, opSetFor, type GatePair, type OpFamily, type OpSetId } from '../gates'

/**
 * Critter Parade levels (docs/superpowers/specs/2026-10-19-trending-games-plan.md §1):
 * a level is a straight parade route with 5–6 gate pairs and 1–2 counting
 * cages ("3 friends join!"), ending in a tug-of-war against the Grumble Gang.
 *
 * Gate pairs are made just in time against the live count (the best gate
 * depends on the state), but every pair is a pure function of the level seed,
 * the gate number, the count and the previous pair — so a level can be played
 * ahead in its two extreme ways (every pick smart / every pick weak) to tune
 * the Gang: smart play wins, weak play comes close and can win the rematch.
 */

export interface ParadeSetup {
  family: OpFamily
  /** 0 = K … 5. */
  grade: number
  /** Run seed (a fresh one per run; tests pin it). */
  seed: string
}

export interface CageEvent {
  kind: 'cage'
  /** Track distance from the level start. */
  at: number
  /** Index among the level's events (seeds the amount). */
  index: number
}

export interface GateEvent {
  kind: 'gate'
  at: number
  index: number
  /** Gate number within the level (0-based). */
  gate: number
}

export type ParadeEvent = CageEvent | GateEvent

export interface LevelPlan {
  level: number
  seed: string
  opSet: OpSetId
  maxFactor: number
  difficulty: 0 | 1 | 2
  /** The parade's size at the start; the crowd never drops below it. */
  start: number
  events: ParadeEvent[]
  gates: number
  /** Track distance of the tug-of-war rope. */
  finaleAt: number
  /** Soft ceiling per gate: growth is budgeted over the level. */
  ceilings: number[]
  /** Final count with every pick smart / every pick weak. */
  smart: number
  weak: number
  /** The Grumble Gang's size. */
  gang: number
  /** The count cap for this grade (≤ the set's). */
  cap: number
  /** At this count the parade is full and skips its remaining gates. */
  fullAt: number
}

/** Track layout (world units): the first event, then one every `SPACING`. */
export const TRACK = {
  first: 34,
  spacing: 36,
  /** From the last event to the rope. */
  finale: 44,
} as const

export const LEVELS = 3

/** How each level's events run (g = gate pair, c = counting cage). */
function sequence(opSet: OpSetId, level: number): ('g' | 'c')[] {
  if (opSet === 'divSub') {
    // keep-more pairs need friends to keep: a big welcome cage, then refills
    return level === 2 ? ['c', 'g', 'g', 'c', 'g', 'g', 'c', 'g', 'g'] : ['c', 'g', 'g', 'c', 'g', 'g', 'c', 'g']
  }
  if (opSet === 'addSub') return level === 2 ? ['g', 'g', 'c', 'g', 'g', 'g', 'g'] : ['g', 'g', 'c', 'g', 'g', 'g']
  if (level === 0) return ['g', 'g', 'c', 'g', 'g', 'g']
  if (level === 1) return ['c', 'g', 'g', 'g', 'c', 'g', 'g']
  return ['g', 'g', 'c', 'g', 'g', 'g', 'g']
}

/** Where each level's growth should top out (a soft budget under the band's cap). */
const LEVEL_TOP: Record<OpSetId, [number, number, number]> = {
  addSub: [12, 15, 18],
  mulAdd: [60, 120, 200],
  divSub: [100, 100, 100],
  mulFrac: [120, 200, 280],
  fracDec: [200, 450, 900],
}

function startCount(opSet: OpSetId, rng: () => number): number {
  const pickOf = (xs: number[]) => xs[Math.floor(rng() * xs.length)]
  switch (opSet) {
    case 'addSub':
      return pickOf([2, 3])
    case 'mulAdd':
      return pickOf([2, 3, 4])
    case 'divSub':
      return pickOf([3, 4, 5])
    case 'mulFrac':
      return pickOf([4, 6, 8])
    case 'fracDec':
      return pickOf([4, 8])
  }
}

export function planLevel(setup: ParadeSetup, level: number): LevelPlan {
  const opSet = opSetFor(setup.family, setup.grade)
  const maxFactor = maxFactorFor(opSet, setup.grade)
  const seed = `${setup.seed}|L${level}`
  const rng = seededRng(`${seed}|plan`)
  const start = startCount(opSet, rng)
  const seq = sequence(opSet, level)
  const events: ParadeEvent[] = []
  let gate = 0
  seq.forEach((k, i) => {
    const at = TRACK.first + i * TRACK.spacing
    if (k === 'g') events.push({ kind: 'gate', at, index: i, gate: gate++ })
    else events.push({ kind: 'cage', at, index: i })
  })
  const cap = capFor(opSet, setup.grade)
  const top = Math.min(cap, LEVEL_TOP[opSet][Math.min(level, 2)])
  // growth compounds, so the budget does too: start × (top / start)^((g + 1) / gates)
  const ceilings = Array.from({ length: gate }, (_, g) => Math.round(start * Math.pow(top / start, (g + 1) / gate)))
  const plan: LevelPlan = {
    level,
    seed,
    opSet,
    maxFactor,
    difficulty: Math.min(level, 2) as 0 | 1 | 2,
    start,
    events,
    gates: gate,
    finaleAt: events[events.length - 1].at + TRACK.finale,
    ceilings,
    smart: 0,
    weak: 0,
    gang: 0,
    cap,
    fullAt: fullAt(opSet, cap),
  }
  plan.smart = simulate(plan, 'smart')
  plan.weak = simulate(plan, 'weak')
  plan.gang = gangFor(plan.smart, plan.weak)
  return plan
}

/** All three levels of a run. */
export function planRun(setup: ParadeSetup): LevelPlan[] {
  return Array.from({ length: LEVELS }, (_, l) => planLevel(setup, l))
}

/** "Nice" totals for the Dunes' welcome cages: lots of divisors. */
const NICE = [12, 16, 18, 20, 24, 30, 36, 40, 48, 60, 72, 84, 96]

/** How many friends a cage holds, given the parade's size when it gets there. */
export function cageAmount(plan: LevelPlan, ev: CageEvent, count: number): number {
  const rng = seededRng(`${plan.seed}|cage|${ev.index}|${count}`)
  const room = plan.cap - count
  if (room <= 0) return 0
  const ri = (lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1))
  let amount: number
  switch (plan.opSet) {
    case 'addSub':
      amount = ri(1, 2)
      break
    case 'mulAdd':
      amount = plan.level === 0 ? ri(2, 5) : ri(3, 8)
      break
    case 'divSub': {
      // land on a total with many divisors, well above the floor
      const lo = Math.max(count + 10, plan.start * 5)
      const hi = Math.min(plan.cap, count + 40)
      const ok = NICE.filter((t) => t >= lo && t <= hi)
      amount = ok.length ? ok[Math.floor(rng() * ok.length)] - count : ri(6, 12)
      break
    }
    case 'mulFrac':
    case 'fracDec': {
      // 4–12 friends, landing on a multiple of 4 (quarters and halves stay whole)
      const want = ri(4, 12)
      amount = want + ((4 - ((count + want) % 4)) % 4)
      break
    }
  }
  return Math.max(0, Math.min(room, amount))
}

/** The gate pair at gate `g` for the live count. */
export function gatePairFor(plan: LevelPlan, g: number, count: number, prevKey: string | null): GatePair {
  return makeGatePair({
    count,
    opSet: plan.opSet,
    floor: plan.start,
    ceiling: plan.ceilings[g],
    difficulty: plan.difficulty,
    index: g,
    prevKey,
    seed: plan.seed,
    maxFactor: plan.maxFactor,
    cap: plan.cap,
  })
}

/**
 * A growing parade that gets near its band's cap is FULL: the gates left
 * in the level are skipped (there is no honest growth pair left under the cap)
 * and the parade marches on to the tug-of-war. Keep-more sets never fill.
 */
export function isFull(plan: LevelPlan, count: number): boolean {
  return count >= plan.fullAt
}

/** Where a growing parade is full: no honest growth pair fits under the cap any more (× needs room to double). */
function fullAt(opSet: OpSetId, cap: number): number {
  switch (opSet) {
    case 'addSub':
      return cap - 2
    case 'divSub':
      return Infinity
    case 'mulAdd':
      // past half the cap the pairs are "+m or +k" (two-digit adding): fine for a few gates
      return Math.floor(cap * 0.9)
    default:
      return Math.floor(cap / 2) + 1
  }
}

/** The count cap for a set and grade: 2nd grade counts stay within 100. */
export function capFor(opSet: OpSetId, grade: number): number {
  const cap = OP_SETS[opSet].cap
  return opSet === 'mulAdd' && grade <= 2 ? Math.min(cap, 100) : cap
}

/** Play the level ahead with every pick smart (or every pick weak); returns the final count. */
export function simulate(plan: LevelPlan, policy: 'smart' | 'weak'): number {
  let count = plan.start
  let prev: string | null = null
  for (const ev of plan.events) {
    if (ev.kind === 'cage') count += cageAmount(plan, ev, count)
    else if (!isFull(plan, count)) {
      const p = gatePairFor(plan, ev.gate, count, prev)
      const hi = Math.max(p.left.result, p.right.result)
      const lo = Math.min(p.left.result, p.right.result)
      count = policy === 'smart' ? hi : lo
      prev = p.key
    }
  }
  return count
}

/**
 * The Grumble Gang's size: 40 % of the way from the all-weak finish to the
 * all-smart one. Smart play always wins (by construction: the all-smart path
 * IS the level's play when every pick is smart), mostly-weak play falls a
 * little short and the rematch is winnable. Never a fail-by-one tuning: the
 * number is fixed when the level starts and shown on the Gang's banner.
 */
export function gangFor(smart: number, weak: number): number {
  if (smart - weak >= 2) return Math.min(smart - 1, Math.max(weak + 1, weak + Math.round(0.4 * (smart - weak))))
  // the weak path ended as big (an early weak pick met kinder gates later): both
  // ways win, the smart one comfortably
  return Math.max(1, Math.min(smart - 1, Math.round(smart * 0.8)))
}

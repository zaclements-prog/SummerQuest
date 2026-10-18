import type { Problem } from '../problem'
import { shuffle } from '../random'
import { hitScore, type HitScore } from '../../games/_juice/score'

/**
 * Pure logic for Crystal Golems, the Division Arena (docs/superpowers/specs/
 * 2026-10-12-division-arena-design.md + the 2026-10-17 fun pass). No three.js,
 * no DOM: the mechanics are unit-tested here before anything renders.
 *
 * A golem carries `dividend` and MARCHES down a lane toward the camel pen; the
 * pen has `quotient` stalls. The kid grabs a divisor crystal and throws it: the
 * right crystal shatters the golem into exactly `quotient` mini-camels that run
 * into the stalls (counted out loud — the quotient, seen). Another true factor
 * splits it into the WRONG number of camels (stalls left empty, or camels left
 * outside); a non-divisor bounces off. Wrong throws cost time and the streak,
 * never the run. A golem that reaches the pen stomps (streak lost) and gets
 * knocked back. The last round is a Giant Golem cracked down in two steps.
 */

export interface DivRound {
  dividend: number
  divisor: number
  quotient: number
  factId?: string
}

/** A provider Problem (prompt `${dividend} ÷ ${divisor} = ?`) → round numbers. */
export function parseDivRound(p: Pick<Problem, 'prompt' | 'answer' | 'factId'>): DivRound {
  const m = /^(\d+)\s*÷\s*(\d+)\s*=\s*\?$/.exec(p.prompt)
  if (!m) throw new Error(`not a division problem: ${p.prompt}`)
  const dividend = Number(m[1])
  const divisor = Number(m[2])
  const quotient = Number(p.answer)
  if (!Number.isInteger(quotient) || divisor * quotient !== dividend) {
    throw new Error(`not a whole division fact: ${p.prompt} → ${p.answer}`)
  }
  return { dividend, divisor, quotient, factId: p.factId }
}

/** All whole-number divisors of n within [2, max]. */
export function trueFactors(n: number, max = 10): number[] {
  const out: number[] = []
  for (let d = 2; d <= Math.min(max, n); d++) if (n % d === 0) out.push(d)
  return out
}

/**
 * The pedestal crystals for a round (3 in warm-ups, 4 later): always includes
 * the round's correct divisor. The win condition is *exact* (see
 * `isRightCrystal`), so any other crystal is a wrong answer — and that's
 * pedagogically rich either way: a true factor shatters the golem into the
 * WRONG number of camels (the pen's stalls visibly don't match), while a
 * non-divisor just bounces off. Distractors prefer numbers near the divisor
 * (the classic ±1 confusions), then true factors, then anything ≤12. Order is
 * shuffled: the answer never sits at a fixed pedestal.
 */
export function makePedestalOptions(dividend: number, divisor: number, count = 3): number[] {
  const n = Math.max(2, Math.min(6, Math.floor(count)))
  const used = new Set<number>([divisor])
  const want: number[] = [divisor]
  const push = (d: number) => {
    used.add(d)
    want.push(d)
  }
  for (const d of [divisor - 1, divisor + 1, divisor - 2, divisor + 2]) {
    if (want.length === n) break
    if (d >= 2 && d <= 12 && !used.has(d)) push(d)
  }
  for (const d of trueFactors(dividend)) {
    if (want.length === n) break
    if (!used.has(d)) push(d)
  }
  for (let d = 2; want.length < n && d <= 12; d++) if (!used.has(d)) push(d)
  return shuffle(want)
}

/** The exact right crystal for this round's fact (drives credit + pen fill). */
export function isRightCrystal(divisor: number, picked: number): boolean {
  return picked === divisor
}

/** Does the picked crystal shatter the golem at all? (divides → yes, splits) */
export function shatters(dividend: number, picked: number): boolean {
  return dividend % picked === 0
}

/** What a throw does: the right split, a wrong-sized split, or a bounce. */
export type ThrowOutcome = { kind: 'right'; camels: number } | { kind: 'split'; camels: number } | { kind: 'bounce' }

export function throwOutcome(round: Pick<DivRound, 'dividend' | 'divisor'>, picked: number): ThrowOutcome {
  if (isRightCrystal(round.divisor, picked)) return { kind: 'right', camels: round.dividend / picked }
  if (shatters(round.dividend, picked)) return { kind: 'split', camels: round.dividend / picked }
  return { kind: 'bounce' }
}

/** Ground scatter points for `count` minis around a centre (pure math). */
export function splitPositions(count: number, cx: number, cz: number, r = 1.2): [number, number][] {
  const n = Math.min(count, 12)
  const out: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (i % 2) * 0.4
    const rr = r * (0.55 + (i % 3) * 0.22)
    out.push([cx + Math.cos(a) * rr, cz + Math.sin(a) * rr])
  }
  return out
}

// ── the pen: stalls laid out like a ten-frame (rows of five) ─────────────────

/** Most camels the herd will draw at once (a 2÷ split of 90 is still "45"). */
export const MAX_HERD = 16
export const STALL_PITCH_X = 0.66
export const STALL_PITCH_Z = 0.8

/**
 * Stall marks inside the pen for a quotient: rows of five, left-aligned like a
 * ten-frame, so "8" reads as one full five and three more. Centred on (cx, cz);
 * rows run along +z (the first row is the far one).
 */
export function penStalls(quotient: number, cx: number, cz: number): [number, number][] {
  const n = Math.max(0, Math.min(PEN_MARKS, Math.floor(quotient)))
  const rows = Math.ceil(n / 5)
  const out: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / 5)
    const c = i % 5
    out.push([cx + (c - 2) * STALL_PITCH_X, cz + (r - (rows - 1) / 2) * STALL_PITCH_Z])
  }
  return out
}

/**
 * Where each camel of a split runs: the first `min(camels, stalls)` fill the
 * stalls in order; any extra camels stand in an arc OUTSIDE the pen fence (too
 * many!). A short split simply leaves stalls empty (not enough!).
 */
export function herdSpots(camels: number, quotient: number, cx: number, cz: number, fenceR: number): { spot: [number, number]; inPen: boolean }[] {
  const n = Math.max(0, Math.min(MAX_HERD, Math.floor(camels)))
  const stalls = penStalls(quotient, cx, cz)
  const out: { spot: [number, number]; inPen: boolean }[] = []
  const extra = n - Math.min(n, stalls.length)
  for (let i = 0; i < n; i++) {
    if (i < stalls.length) {
      out.push({ spot: stalls[i], inPen: true })
      continue
    }
    // extras: an arc on the near side of the fence, fanning out evenly
    const k = i - stalls.length
    const a = Math.PI / 2 + ((k + 0.5) / Math.max(1, extra) - 0.5) * 2.4
    const rr = fenceR + 0.55 + (k % 2) * 0.35
    out.push({ spot: [cx + Math.cos(a) * rr, cz + Math.sin(a) * rr], inPen: false })
  }
  return out
}

// ── run structure: warm-ups → escalation → the giant ─────────────────────────

export type RoundKind = 'warm' | 'main' | 'boss'

export interface RoundPlan {
  kind: RoundKind
  /** March speed in lane units per second. */
  speed: number
  /** Crystals on the pedestals. */
  crystals: 3 | 4
  /** Short banner shown as the golem comes out (null = none). */
  banner: string | null
}

export const WARM_SPEED = 0.3
export const MAIN_SPEED: [number, number] = [0.38, 0.5]
export const BOSS_SPEED = 0.24
/** After the giant is cracked down to size it hurries. */
export const BOSS_CRACKED_SPEED = 0.36

/**
 * The run for `rounds` golems: up to two slow warm-ups with three crystals,
 * then main golems marching a little faster each time with four crystals, and
 * the Giant Golem last. Never fewer than one round; one round = just the giant.
 */
export function arenaPlan(rounds: number): RoundPlan[] {
  const n = Math.max(1, Math.floor(rounds))
  const warm = n >= 4 ? 2 : n >= 2 ? 1 : 0
  const mains = n - 1 - warm
  const out: RoundPlan[] = []
  for (let i = 0; i < warm; i++) out.push({ kind: 'warm', speed: WARM_SPEED, crystals: 3, banner: null })
  for (let i = 0; i < mains; i++) {
    const k = mains === 1 ? 0.5 : i / (mains - 1)
    const speed = +(MAIN_SPEED[0] + (MAIN_SPEED[1] - MAIN_SPEED[0]) * k).toFixed(3)
    out.push({ kind: 'main', speed, crystals: 4, banner: i === 0 ? 'Faster!' : i === mains - 1 && mains > 1 ? 'Even faster!' : null })
  }
  out.push({ kind: 'boss', speed: BOSS_SPEED, crystals: 4, banner: 'GIANT GOLEM!' })
  return out
}

// ── the lane (local arena frame: +z runs toward the camera / the pen) ───────

/** Golems walk out of the cave at `start` and stop at the pen fence at `end`. */
export const LANE = { start: -5.6, end: 0.1 } as const
export const LANE_LEN = LANE.end - LANE.start
/** Where a stomped golem is knocked back to (fraction of the lane). */
export const KNOCKBACK = 0.5

/** Lane z for a progress in [0, 1]. */
export function laneZ(progress: number): number {
  const p = Math.min(1, Math.max(0, progress))
  return LANE.start + LANE_LEN * p
}

/** Progress after marching `dt` seconds at `speed` (lane units/s); clamps at 1. */
export function advanceProgress(progress: number, speed: number, dt: number): number {
  return Math.min(1, Math.max(0, progress + (speed * Math.max(0, dt)) / LANE_LEN))
}

/** Seconds a golem at `speed` takes to walk the whole lane (the round's soft clock). */
export function laneSeconds(speed: number): number {
  return speed > 0 ? LANE_LEN / speed : Infinity
}

// ── the Giant Golem: two cracks down to the round's fact ────────────────────

export interface BossChain {
  giant: number
  /** Crack 1: giant ÷ k = the round's dividend. Crack 2 is the round's own fact. */
  steps: [DivRound, DivRound]
}

/**
 * Build the giant over a provider fact: giant = dividend × k, so crack 1 is
 * `giant ÷ k = dividend` (a doubling/tripling the kid can reason about) and
 * crack 2 is the provider's fact itself (recorded to factStats). k stays ≤
 * kMax and the giant stays a two-digit number the chalk can draw.
 */
export function bossChain(round: DivRound, kMax: number, rng: () => number = Math.random): BossChain {
  const ks: number[] = []
  for (let k = 2; k <= Math.max(2, kMax); k++) if (round.dividend * k <= 99) ks.push(k)
  const k = ks.length ? ks[Math.min(ks.length - 1, Math.floor(rng() * ks.length))] : 2
  const giant = round.dividend * k
  return {
    giant,
    steps: [
      { dividend: giant, divisor: k, quotient: round.dividend },
      { dividend: round.dividend, divisor: round.divisor, quotient: round.quotient, factId: round.factId },
    ],
  }
}

// ── scoring ──────────────────────────────────────────────────────────────────

export const GOLEM_POINTS = 100
export const BOSS_STEP_POINTS = 150
export const BOSS_FINISH_BONUS = 100

/**
 * Points for a correct throw: base + speed bonus for shattering the golem
 * while it's still far from the pen (1 − progress), × the streak multiplier.
 */
export function shatterPoints({ progress, streak, kind }: { progress: number; streak: number; kind: RoundKind }): HitScore {
  return hitScore({ base: kind === 'boss' ? BOSS_STEP_POINTS : GOLEM_POINTS, fractionLeft: 1 - progress, streak })
}

export const ROUNDS = 5
/** Stars from clean first-try clears out of 5 rounds (wrong throws still let you retry the golem). */
export const STAR_THRESHOLDS: [number, number, number] = [1, 3, 5]
export function arenaStars(correctFirstTry: number): number {
  return correctFirstTry >= STAR_THRESHOLDS[2] ? 3 : correctFirstTry >= STAR_THRESHOLDS[1] ? 2 : correctFirstTry >= STAR_THRESHOLDS[0] ? 1 : 0
}

/** Stars for any round count: the same 20 / 60 / 100 % shape as 5 rounds. */
export function arenaStarsOf(correctFirstTry: number, total: number): number {
  if (total === ROUNDS) return arenaStars(correctFirstTry)
  const t1 = Math.max(1, Math.ceil(total * 0.2))
  const t2 = Math.ceil(total * 0.6)
  return correctFirstTry >= total ? 3 : correctFirstTry >= t2 ? 2 : correctFirstTry >= t1 ? 1 : 0
}

/**
 * The arena is a *model* of grouping, so its facts are bounded for legibility
 * regardless of how wide the grade tier makes division: the pen must show
 * exactly `quotient` stalls (rows of five, ≤ `PEN_MARKS`) and the chalk must
 * fit the golem's chest. Grade tiers widen division to ÷12 (dividends to 144),
 * which would break both.
 */
export const ARENA_LIMITS = { divisorMax: 9, quotientMax: 10 } as const
/** Camels the pen can show; a quotient above this can't be modelled truthfully. */
export const PEN_MARKS = 12

/** Grade's division ceiling → arena-bounded provider config (never harder than the grade). */
export function arenaFactConfig(tierDivMax: number) {
  const cap = (arenaMax: number, floor: number) => Math.min(arenaMax, Math.max(floor, tierDivMax))
  return {
    divisorMin: 2,
    divisorMax: cap(ARENA_LIMITS.divisorMax, 2),
    quotientMin: 2,
    quotientMax: cap(ARENA_LIMITS.quotientMax, 2),
  }
}

/** Warm-up facts: the friendly corner of the grade's range (÷2–5, quotients 2–5). */
export function warmFactConfig(tierDivMax: number) {
  const c = arenaFactConfig(tierDivMax)
  return { ...c, divisorMax: Math.min(5, c.divisorMax), quotientMax: Math.min(5, c.quotientMax) }
}

/** Giant multiplier ceiling for the grade: ×2 for the youngest, up to ×3 after. */
export function bossKMax(tierDivMax: number): number {
  return tierDivMax <= 5 ? 2 : 3
}

/**
 * Is this fact meaty enough to build the Giant Golem over? Big enough to feel
 * like a boss (with a big camel parade at the end), and ≤ 49 so the doubled
 * giant stays a two-digit chalk number.
 */
export function isBossFact(round: Pick<DivRound, 'dividend' | 'quotient'>, tierDivMax: number): boolean {
  const min = tierDivMax <= 5 ? 12 : 18
  const minQuotient = tierDivMax <= 5 ? 4 : 6
  return round.dividend >= min && round.dividend <= 49 && round.quotient >= minQuotient
}

/**
 * Re-draws the boss round may take to find a boss fact. Only about a third of a
 * 3rd/4th-grade arena's facts qualify, so 8 tries still missed ~4% of the time
 * (a 50–90 dividend then doubled into a three-digit giant); 40 makes that
 * vanishingly rare.
 */
export const BOSS_REDRAWS = 40

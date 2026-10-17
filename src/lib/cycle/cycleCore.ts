import type { Problem } from '../problem'

/**
 * Pure logic for Cloud Keeper (docs/superpowers/specs/2026-10-16-cloud-keeper-
 * design.md). No three.js, no DOM: the cycle mechanics are unit-tested here
 * before anything renders.
 *
 * A situation prompt describes one step of the water cycle; the answer is
 * WHICH process it is. The game maps each process to a station the kid walks
 * onto and performs — the answer is a place, not a word.
 */

export const PROCESSES = ['evaporation', 'condensation', 'precipitation'] as const
export type Process = (typeof PROCESSES)[number]

const PROCESS_SET = new Set<string>(PROCESSES)
export const isProcess = (v: unknown): v is Process => typeof v === 'string' && PROCESS_SET.has(v)

export interface CycleRound {
  prompt: string
  answer: Process
  factId?: string
}

/** A provider Problem (MCQ whose answer is a process word) → a cycle round. */
export function parseCycleRound(p: Pick<Problem, 'prompt' | 'answer' | 'factId'>): CycleRound {
  if (!isProcess(p.answer)) throw new Error(`not a water-cycle process answer: ${p.answer}`)
  return { prompt: p.prompt, answer: p.answer, factId: p.factId }
}

export const ROUNDS = 5

/**
 * The stations are NUMBERED in cycle order (the easel board traces performed
 * steps as digits — the chalk font is numeric-only, the station cards carry
 * the big numerals, and the loop's real order gets taught by the trace).
 */
export const PROCESS_DIGIT: Record<Process, string> = {
  evaporation: '1',
  condensation: '2',
  precipitation: '3',
}

/** Win copy, spoken after the right station performs. */
export const GOOD_LINE: Record<Process, string> = {
  evaporation: 'Evaporation — the sun lifts water up into the sky as vapor!',
  condensation: 'Condensation — the cool air turns vapor into cloud droplets!',
  precipitation: 'Precipitation — the heavy cloud lets the water fall!',
}

/** Wrong-station copy: a mini-lesson about the tried process, then try again. */
export const BAD_HINT: Record<Process, string> = {
  evaporation: 'That step floats vapor up from water — but this story is about somewhere else. Try again!',
  condensation: 'That step cools vapor into droplets — but there is no rising vapor in this story. Try again!',
  precipitation: 'That step drops water from a heavy cloud — but this story is not at a raining cloud. Try again!',
}


/** Stars from clean first-try clears: the arena/forge 20 / 60 / 100 % shape. */
export function cycleStarThresholds(total: number): [number, number, number] {
  return [Math.max(1, Math.ceil(total * 0.2)), Math.ceil(total * 0.6), total]
}

export function cycleStars(correctFirstTry: number, total: number): number {
  const [t1, t2, t3] = cycleStarThresholds(total)
  return correctFirstTry >= t3 ? 3 : correctFirstTry >= t2 ? 2 : correctFirstTry >= t1 ? 1 : 0
}

/**
 * The physical trace of the loop. Only CORRECT answers move it (wrong answers
 * run their station's animation but leave the world unchanged — there was no
 * vapor to condense, no cloud to rain). 0..1 levels, clamped.
 */
export interface CycleState {
  pond: number
  cloud: number
  garden: number
}

export const CYCLE_START: CycleState = { pond: 1, cloud: 0, garden: 0.25 }

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export function applyProcess(s: CycleState, p: Process): CycleState {
  switch (p) {
    case 'evaporation':
      return { ...s, pond: clamp01(s.pond - 0.34), cloud: clamp01(s.cloud + 0.12) }
    case 'condensation':
      return { ...s, cloud: clamp01(s.cloud + 0.55) }
    case 'precipitation':
      return { ...s, cloud: clamp01(s.cloud - 0.55), pond: clamp01(s.pond + 0.34), garden: clamp01(s.garden + 0.4) }
  }
}

// ── Fun pass: guide the droplet (docs/superpowers/specs/2026-10-17-mini-games-fun-pass.md)
//
// The kid escorts Drip, a water droplet, around the loop. Drip's FORM is the
// state of the water: liquid water needs warming (evaporation), vapor needs
// cooling into a cloud (condensation), a cloud droplet falls (precipitation)
// and the river carries it home as water again. Each leg is one answer: walk
// Drip to the station whose process comes next. A wrong station wobbles and
// says why in three words; Drip stays as it was.

export const DROP_FORMS = ['water', 'vapor', 'cloud'] as const
export type DropForm = (typeof DROP_FORMS)[number]

/** The process that comes next for water in this form: the right station. */
export const NEXT_PROCESS: Record<DropForm, Process> = {
  water: 'evaporation',
  vapor: 'condensation',
  cloud: 'precipitation',
}

/** Drip's form after a station performs its process. */
export const FORM_AFTER: Record<Process, DropForm> = {
  evaporation: 'vapor',
  condensation: 'cloud',
  precipitation: 'water',
}

/** Wrong-station feedback, three words max: why this station can't work on Drip yet. */
export const WRONG_HINT: Record<DropForm, Record<Process, string>> = {
  water: { evaporation: '', condensation: 'No vapor yet!', precipitation: 'No cloud yet!' },
  vapor: { evaporation: 'Already vapor!', condensation: '', precipitation: 'No cloud yet!' },
  cloud: { evaporation: 'Already up high!', condensation: 'Already a cloud!', precipitation: '' },
}

/** What Drip needs next, as a nudge after a wrong station (a few words). */
export const NEED_LINE: Record<DropForm, string> = {
  water: 'Water needs warming',
  vapor: 'Vapor needs cooling',
  cloud: 'Heavy cloud must fall',
}

/** Short win line spoken when the station performs (the process named). */
export const PROCESS_CHEER: Record<Process, string> = {
  evaporation: 'Evaporation!',
  condensation: 'Condensation!',
  precipitation: 'Precipitation!',
}

/** HUD icons: Drip's forms and what each station does (heat / cool / fall). */
export const FORM_ICON: Record<DropForm, string> = { water: '💧', vapor: '💨', cloud: '☁️' }
export const PROCESS_ICON: Record<Process, string> = { evaporation: '☀️', condensation: '❄️', precipitation: '🌧️' }

export interface RouteResult {
  ok: boolean
  /** The station that was right for this form. */
  need: Process
  /** Drip's form after this step (unchanged when wrong). */
  form: DropForm
  /** Three-word reason when wrong, null when right. */
  hint: string | null
}

/** Drip (in `form`) is walked onto `station`. */
export function routeStep(form: DropForm, station: Process): RouteResult {
  const need = NEXT_PROCESS[form]
  const ok = station === need
  return { ok, need, form: ok ? FORM_AFTER[station] : form, hint: ok ? null : WRONG_HINT[form][station] }
}

/** Twists: 'calm' (warm-up) or 'wind' (the cloud drifts across the sky and the peak turns snowy). */
export type Twist = 'calm' | 'wind'
export type CycleSegKind = 'warmup' | 'twist' | 'storm'

export interface CycleSegment {
  kind: CycleSegKind
  /** Answers in this segment: a loop is 3 legs; the storm is one per friend droplet. */
  legs: number
  twist: Twist
  /** Show the glowing path to the right station (the first, warm-up loop only). */
  guide: boolean
  /** Storm only: the forms of the three friend droplets to rescue (shuffled). */
  storm: DropForm[] | null
}

/** Seconds before the storm clears and the rainbow comes out (bonus only). */
export const STORM_SEC = 55

/**
 * The run arc: a guided warm-up loop → a windy, snowy loop (the cloud drifts:
 * catch it) → the storm finale (three friend droplets in mixed forms, routed
 * before the rainbow). `rounds` is the stage's `params.rounds`: 5 → 2 loops.
 */
export function cycleRunPlan(rounds: number, rng: () => number = Math.random): CycleSegment[] {
  const loops = Math.min(4, Math.max(1, Math.floor(rounds) - 3))
  const out: CycleSegment[] = [{ kind: 'warmup', legs: 3, twist: 'calm', guide: true, storm: null }]
  for (let i = 1; i < loops; i++) out.push({ kind: 'twist', legs: 3, twist: 'wind', guide: false, storm: null })
  const storm = [...DROP_FORMS]
  for (let i = storm.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[storm[i], storm[j]] = [storm[j], storm[i]]
  }
  out.push({ kind: 'storm', legs: storm.length, twist: 'calm', guide: false, storm })
  return out
}

/** Answers a run asks for (= the stars denominator). */
export function cycleLegCount(plan: CycleSegment[]): number {
  return plan.reduce((s, g) => s + g.legs, 0)
}

export const CYCLE_SCORE = {
  first: 100,
  retry: 40,
  streakStep: 20,
  streakCap: 100,
  speedMax: 30,
  /** A leg done within this many seconds earns the full speed bonus… */
  fastSec: 4,
  /** …fading to nothing at this many. */
  slowSec: 14,
  /** Bonus for bringing Drip all the way round the loop. */
  loop: 50,
  /** Bonus for saving every friend before the rainbow. */
  storm: 150,
} as const

export interface LegScore {
  base: number
  streak: number
  speed: number
  total: number
}

/** Points for one right station: base + streak (clean legs in a row incl. this one) + speed. */
export function legScore({ firstTry, streak, seconds }: { firstTry: boolean; streak: number; seconds: number }): LegScore {
  const c = CYCLE_SCORE
  const base = firstTry ? c.first : c.retry
  const s = firstTry ? Math.min(c.streakCap, c.streakStep * Math.max(0, streak - 1)) : 0
  const k = (c.slowSec - seconds) / (c.slowSec - c.fastSec)
  const speed = firstTry ? Math.round(c.speedMax * Math.min(1, Math.max(0, k))) : 0
  return { base, streak: s, speed, total: base + s + speed }
}

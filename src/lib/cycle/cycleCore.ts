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

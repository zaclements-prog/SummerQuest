import { decide, scaffoldCheck, smartTally, type Decision, type GatePair, type Side } from '../gates'
import { cageAmount, gatePairFor, isFull, type LevelPlan, type ParadeEvent } from './plan'

/**
 * One level in play, as plain data the game steps through (pure: the 3D scene
 * calls these as the parade crosses each event). The crowd never drops below
 * the level's start count — the gate engine guarantees it for every pair.
 */

export type NextUp = { ev: ParadeEvent; kind: 'gate'; pair: GatePair } | { ev: ParadeEvent; kind: 'cage'; amount: number } | null

export interface LevelState {
  plan: LevelPlan
  count: number
  /** Index of the next event to cross. */
  next: number
  prevKey: string | null
  decisions: Decision[]
  /** The next event, made against the live count (shown on the track ahead). */
  upcoming: NextUp
}

/** The next event the parade will meet from `next` on (a full parade skips its gates). */
function resolve(plan: LevelPlan, next: number, count: number, prevKey: string | null): NextUp {
  for (let i = next; i < plan.events.length; i++) {
    const ev = plan.events[i]
    if (ev.kind === 'cage') return { ev, kind: 'cage', amount: cageAmount(plan, ev, count) }
    if (!isFull(plan, count)) return { ev, kind: 'gate', pair: gatePairFor(plan, ev.gate, count, prevKey) }
  }
  return null
}

/** True when the parade filled up and the level's remaining gates are skipped. */
export function paradeFull(s: LevelState): boolean {
  return isFull(s.plan, s.count)
}

export function startLevel(plan: LevelPlan): LevelState {
  return { plan, count: plan.start, next: 0, prevKey: null, decisions: [], upcoming: resolve(plan, 0, plan.start, null) }
}

/** Walk through one side of the upcoming gate pair. */
export function passGate(s: LevelState, side: Side): { state: LevelState; decision: Decision } {
  const up = s.upcoming
  if (!up || up.kind !== 'gate') throw new Error('parade: no gate pair ahead')
  const decision = decide(up.pair, side)
  const count = Math.max(s.plan.start, decision.result)
  const next = s.plan.events.indexOf(up.ev) + 1
  const prevKey = up.pair.key
  return {
    decision,
    state: { ...s, count, next, prevKey, decisions: [...s.decisions, decision], upcoming: resolve(s.plan, next, count, prevKey) },
  }
}

/** Open the upcoming counting cage: its friends join. */
export function passCage(s: LevelState): { state: LevelState; amount: number } {
  const up = s.upcoming
  if (!up || up.kind !== 'cage') throw new Error('parade: no cage ahead')
  const count = s.count + up.amount
  const next = s.plan.events.indexOf(up.ev) + 1
  return { amount: up.amount, state: { ...s, count, next, upcoming: resolve(s.plan, next, count, s.prevKey) } }
}

export interface FinaleOutcome {
  ours: number
  gang: number
  /** ours − gang (≥ 0 is a win; 0 is a happy tie). */
  margin: number
  win: boolean
}

export function finaleOutcome(s: LevelState): FinaleOutcome {
  const margin = s.count - s.plan.gang
  return { ours: s.count, gang: s.plan.gang, margin, win: margin >= 0 }
}

/** Scaffold over the whole run so far (decisions from every level, oldest first). */
export function runScaffold(all: readonly Decision[]): boolean {
  return scaffoldCheck(all).scaffold
}

export { smartTally }

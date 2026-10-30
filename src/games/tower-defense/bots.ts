import { rule, type PatrolPlan, type RuleId } from '../../lib/puddle'
import { seededRng } from '../../lib/random'
import { canBuild, createPatrol, placeTower, pondClean, patrolStars, rulesNow, startWave, step } from './engine'
import type { PatrolState, Tower } from './types'

/**
 * Playtest bots for Puddle Patrol (the balance tests and
 * scripts/puddle-balance.mjs). Each plays a whole stage through the real
 * engine, between waves exactly as a child can (place, swap, Go), and counts
 * the seconds a child would spend: the waves themselves plus thinking time.
 *
 * - `optimal`: reads the incoming lineup and tries each rule on each tower
 *   (in the best slots first), keeping whatever washes the most.
 * - `kid`: mostly sensible (builds for the rules the lineup needs most), but
 *   one pick in four is a guess, it sometimes forgets to swap, and it taps slowly.
 * - `naive`: random rules in random slots, never looks at the lineup, never swaps.
 */

export type BotKind = 'optimal' | 'kid' | 'naive'

export interface BotRun {
  clean: number
  stars: 1 | 2 | 3
  /** Seconds the stage takes: waves + thinking + the game's own beats. */
  seconds: number
  /** Placements and swaps made, and how many of them fit the incoming lineup. */
  placements: number
  smartPlacements: number
}

/** A copy of the moving parts (the plan and the field are shared, never changed). */
function clone(s: PatrolState): PatrolState {
  return {
    ...s,
    towers: s.towers.map((t) => (t ? { ...t } : null)),
    puddings: s.puddings.map((p) => ({ ...p })),
    shots: s.shots.map((x) => ({ ...x })),
    tallies: s.tallies.map((t) => ({ ...t })),
    events: [],
  }
}

/** Play the current wave to its end; Puddings washed. */
function playOut(s: PatrolState): number {
  const w = s.wave
  startWave(s)
  let guard = 0
  while (s.phase === 'wave' && guard++ < 20000) step(s)
  s.events = []
  return s.tallies[w].washed
}

/** Slots, best first: those reaching the most path (the middle slots reach both rows). */
function slotOrder(s: PatrolState): number[] {
  const reach = (i: number) => s.layout.slots[i].reach.reduce((a, [x, y]) => a + (y - x), 0)
  return s.layout.slots.map((_, i) => i).sort((a, b) => reach(b) - reach(a))
}

/** How much of the incoming wave each rule could wash (shared values split between the rules they fit). */
export function demand(s: PatrolState): Map<RuleId, number> {
  const rules = rulesNow(s)
  const out = new Map<RuleId, number>(rules.map((r) => [r, 0]))
  for (const p of s.plan.waves[s.wave].puddings) {
    const f = rules.filter((r) => rule(r).fits(p.value))
    for (const r of f) out.set(r, out.get(r)! + 1 / f.length)
  }
  return out
}

/** A placement is smart when the lineup has real work for that rule (at least a fifth of the wave). */
function smart(s: PatrolState, r: RuleId): boolean {
  const ps = s.plan.waves[s.wave].puddings
  return ps.filter((p) => rule(r).fits(p.value)).length >= Math.max(1, ps.length / 5)
}

interface Tally {
  placements: number
  smart: number
}

function record(s: PatrolState, tally: Tally, r: RuleId) {
  tally.placements++
  if (smart(s, r)) tally.smart++
}

function planOptimal(s: PatrolState, tally: Tally) {
  const rules = rulesNow(s)
  const order = slotOrder(s)
  // how many towers we can have this wave: those standing, plus what the drops buy
  const standing = s.towers.filter(Boolean).length
  const affordable = Math.min(s.tuning.maxTowers - standing, Math.floor(s.drops / s.tuning.cost))
  const want = Math.min(s.tuning.maxTowers, standing + affordable)
  // the slots to use: the standing towers' slots, then the best empty ones
  const used = order.filter((i) => s.towers[i]).concat(order.filter((i) => !s.towers[i])).slice(0, want)
  const best: (RuleId | null)[] = s.towers.map(() => null)
  for (const i of used) {
    let top = -1
    let pick: RuleId = rules[0]
    for (const r of rules) {
      const trial = clone(s)
      // every tower decided so far (and the ones still to decide: off for now)
      trial.towers = trial.towers.map(() => null)
      for (let j = 0; j < best.length; j++) if (best[j]) trial.towers[j] = { slot: j, rule: best[j]!, cooldown: 0, washed: 0 }
      trial.towers[i] = { slot: i, rule: r, cooldown: 0, washed: 0 }
      const got = playOut(trial)
      if (got > top) {
        top = got
        pick = r
      }
    }
    best[i] = pick
  }
  for (const i of used) {
    const r = best[i]!
    const was = s.towers[i]?.rule
    const res = placeTower(s, i, r)
    if (res === 'built' || (res === 'swapped' && was !== r)) record(s, tally, r)
  }
}

function sensibleRule(s: PatrolState, need: Map<RuleId, number>): RuleId {
  let pick: RuleId = rulesNow(s)[0]
  let top = -Infinity
  for (const [r, n] of need) if (n > top) {
    top = n
    pick = r
  }
  return pick
}

function planKid(s: PatrolState, tally: Tally, rnd: () => number) {
  const rules = rulesNow(s)
  const need = demand(s)
  const order = slotOrder(s)
  const assigned: Tower[] = []
  // look at what's standing: keep what's needed, maybe swap the rest
  for (const i of order) {
    const t = s.towers[i]
    if (!t) continue
    const left = need.get(t.rule) ?? 0
    if (left >= 1.5 || rnd() < 0.3) {
      // keep it (and sometimes keep it even when it's not needed: forgot to swap)
      need.set(t.rule, left - 3)
      assigned.push(t)
      continue
    }
    const r = rnd() < 0.75 ? sensibleRule(s, need) : rules[Math.floor(rnd() * rules.length)]
    if (placeTower(s, i, r) === 'swapped') record(s, tally, r)
    need.set(r, (need.get(r) ?? 0) - 3)
  }
  // build while the drops allow (now and then it saves them instead)
  for (const i of order) {
    if (s.towers[i] || !canBuild(s)) continue
    if (rnd() < 0.15) break
    const r = rnd() < 0.75 ? sensibleRule(s, need) : rules[Math.floor(rnd() * rules.length)]
    if (placeTower(s, i, r) === 'built') record(s, tally, r)
    need.set(r, (need.get(r) ?? 0) - 3)
  }
}

function planNaive(s: PatrolState, tally: Tally, rnd: () => number) {
  const rules = rulesNow(s)
  while (canBuild(s)) {
    const empty = s.towers.map((t, i) => (t ? -1 : i)).filter((i) => i >= 0)
    const i = empty[Math.floor(rnd() * empty.length)]
    const r = rules[Math.floor(rnd() * rules.length)]
    if (placeTower(s, i, r) === 'built') record(s, tally, r)
  }
}

/** Seconds a bot spends between waves (reading the lineup, tapping cards). */
const THINK: Record<BotKind, { k1: [number, number]; older: [number, number] }> = {
  optimal: { k1: [8, 10], older: [5, 7] },
  kid: { k1: [12, 22], older: [8, 16] },
  naive: { k1: [5, 8], older: [3, 5] },
}

/** The game's own beats per wave (the "wave clear" moment, a new rule's intro) and per stage (intro, results). */
const BEATS = { wave: 2.5, freshRule: 4, stage: 12 }

export function playBot(plan: PatrolPlan, kind: BotKind, seed = 'bot'): BotRun {
  const s = createPatrol(plan)
  const rnd = seededRng(`${kind}|${seed}`)
  const young = plan.spec.band === 'k1' || plan.spec.band === 'g1'
  const [lo, hi] = THINK[kind][young ? 'k1' : 'older']
  const tally: Tally = { placements: 0, smart: 0 }
  let seconds = BEATS.stage
  while (s.phase === 'plan') {
    const wave = plan.waves[s.wave]
    seconds += lo + rnd() * (hi - lo) + BEATS.wave + (wave.fresh.length ? BEATS.freshRule : 0)
    if (kind === 'optimal') planOptimal(s, tally)
    else if (kind === 'kid') planKid(s, tally, rnd)
    else planNaive(s, tally, rnd)
    const t0 = s.t
    playOut(s)
    seconds += s.t - t0
  }
  const clean = pondClean(s)
  return { clean, stars: patrolStars(clean, plan.spec.band), seconds, placements: tally.placements, smartPlacements: tally.smart }
}

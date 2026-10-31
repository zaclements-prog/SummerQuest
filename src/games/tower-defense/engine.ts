import { rule, type PatrolPlan, type RuleId } from '../../lib/puddle'
import type { ContentBand } from '../../lib/gradeBand'
import { TICK, TUNING, buildLayout, inReach, pointAt } from './config'
import type { PatrolState, Pudding, Tower, Vec2 } from './types'

/**
 * Puddle Patrol's simulation: pure, deterministic, fixed-timestep. The game
 * (PuddlePatrol.tsx) and the bots (bots.ts) drive it through these functions;
 * the 3D scene only reads the state and drains `events`. No clock, no random:
 * the same plan and the same moves give the same run, at any frame rate.
 *
 * - Between waves the field waits (`phase: 'plan'`) as long as the child
 *   likes: place a sprinkler on a slot, or swap a placed one's rule (free).
 *   During a wave a swap still works, but the tower has to refill first (one
 *   whole reload): a well-timed change can save a Pudding, tapping through
 *   the cards to see what sticks can't (the rule has to be read, not guessed).
 * - Drops buy new towers and, once the field is full, a Super Soak (one a
 *   wave): give a tower its own card again and it sprays twice as fast until
 *   the wave ends. Which tower deserves it is the lineup's question (the
 *   rule the wave leans on), so the late game's drops still go to a math
 *   decision; drops left at the end add to the score.
 * - In a wave, Puddings leave the mud pit on the plan's schedule and waddle
 *   to the pond. A tower sprays the furthest-along Pudding in reach that fits
 *   its rule (one spray per `reload`), and that Pudding is washed clean
 *   (+ drops). A Pudding that doesn't fit gets one test spray from each tower
 *   it passes, which bounces off (the scene shows why).
 * - A Pudding that reaches the pond just splashes in: no lives, no failing
 *   out. Stars come from how clean the pond stays (`pondClean`).
 */

const _p: Vec2 = { x: 0, z: 0 }

export function createPatrol(plan: PatrolPlan, band: ContentBand = plan.spec.band): PatrolState {
  const layout = buildLayout(band)
  const tuning = TUNING[band]
  return {
    plan,
    layout,
    tuning,
    phase: 'plan',
    wave: 0,
    waveT: 0,
    spawned: 0,
    t: 0,
    acc: 0,
    towers: layout.slots.map(() => null),
    built: 0,
    supered: false,
    drops: tuning.startDrops,
    puddings: [],
    shots: [],
    nextId: 1,
    tallies: plan.waves.map((w) => ({ washed: 0, leaked: 0, total: w.puddings.length })),
    events: [],
  }
}

/** The rules on offer right now (the tray's cards). */
export const rulesNow = (s: PatrolState): RuleId[] => s.plan.waves[Math.min(s.wave, s.plan.waves.length - 1)].rules

export const towerCount = (s: PatrolState) => s.towers.filter(Boolean).length

/** Can a NEW tower go up (drops and room)? Swapping a placed tower's rule is always free. */
export function canBuild(s: PatrolState): boolean {
  return s.phase !== 'done' && s.drops >= s.tuning.cost && towerCount(s) < s.tuning.maxTowers
}

export type PlaceResult = 'built' | 'swapped' | 'boosted' | 'same' | 'noDrops' | 'full' | 'closed'

/** A Super Soaked tower's reload, as a share of the normal one. */
export const SUPER_RELOAD = 0.5

/** Can this tower be Super Soaked now (not already, and the drops are there)? */
export const canSuper = (s: PatrolState, slot: number): boolean => {
  const t = s.towers[slot]
  return s.phase !== 'done' && !!t && !t.super && !s.supered && s.drops >= s.tuning.superCost
}

/**
 * Put a sprinkler with `ruleId` on a slot: a new tower (costs drops), a new
 * rule for the one standing there (free while planning: a better idea is
 * never taxed; mid-wave it refills first), or, the same rule again, a Super
 * Soak for it (costs drops).
 */
export function placeTower(s: PatrolState, slot: number, ruleId: RuleId): PlaceResult {
  if (s.phase === 'done' || slot < 0 || slot >= s.towers.length) return 'closed'
  if (!rulesNow(s).includes(ruleId)) return 'closed'
  const here = s.towers[slot]
  if (here) {
    if (here.rule === ruleId) {
      if (here.super || s.supered) return 'same'
      if (s.drops < s.tuning.superCost) return 'noDrops'
      s.drops -= s.tuning.superCost
      here.super = true
      s.supered = true
      return 'boosted'
    }
    here.rule = ruleId
    // (mid-wave: it refills with the new rule before it sprays again)
    here.cooldown = s.phase === 'wave' ? Math.max(here.cooldown, s.tuning.reload) : 0
    here.refill = s.phase === 'wave' ? here.cooldown : 0
    return 'swapped'
  }
  if (towerCount(s) >= s.tuning.maxTowers) return 'full'
  if (s.drops < s.tuning.cost) return 'noDrops'
  s.drops -= s.tuning.cost
  s.built++
  const t: Tower = { slot, rule: ruleId, cooldown: 0, washed: 0 }
  s.towers[slot] = t
  return 'built'
}

/** Send the next wave (between waves only). */
export function startWave(s: PatrolState): boolean {
  if (s.phase !== 'plan') return false
  s.phase = 'wave'
  s.waveT = 0
  s.spawned = 0
  s.events.push({ kind: 'waveStart', wave: s.wave })
  return true
}

function spawn(s: PatrolState) {
  const wave = s.plan.waves[s.wave]
  while (s.spawned < wave.puddings.length && wave.puddings[s.spawned].at <= s.waveT + 1e-9) {
    const p: Pudding = { id: s.nextId++, value: wave.puddings[s.spawned].value, s: 0, state: 'walk', bounced: 0, incoming: false, wave: s.wave }
    s.puddings.push(p)
    s.spawned++
    s.events.push({ kind: 'spawn', id: p.id })
  }
}

function fire(s: PatrolState, t: Tower) {
  const slot = s.layout.slots[t.slot]
  const r = rule(t.rule)
  let best: Pudding | null = null
  for (const p of s.puddings) {
    if (p.state !== 'walk' || !inReach(slot, p.s)) continue
    if (r.fits(p.value)) {
      if (!p.incoming && t.cooldown <= 0 && (!best || p.s > best.s)) best = p
    } else if (!(p.bounced & (1 << t.slot))) {
      // one test spray per tower: it bounces off, and the Pudding shows why
      p.bounced |= 1 << t.slot
      s.shots.push({ id: s.nextId++, slot: t.slot, target: p.id, fits: false, t: 0 })
      s.events.push({ kind: 'spray', slot: t.slot, id: p.id, fits: false })
    }
  }
  if (best) {
    best.incoming = true
    t.cooldown = s.tuning.reload * (t.super ? SUPER_RELOAD : 1)
    s.shots.push({ id: s.nextId++, slot: t.slot, target: best.id, fits: true, t: 0 })
    s.events.push({ kind: 'spray', slot: t.slot, id: best.id, fits: true })
  }
}

function land(s: PatrolState) {
  for (const sh of s.shots) {
    sh.t += TICK
    if (sh.t < s.tuning.flight) continue
    const p = s.puddings.find((q) => q.id === sh.target)
    sh.t = Infinity
    if (!p || p.state !== 'walk') continue
    const at = { ...pointAt(s.layout, p.s, _p) }
    if (sh.fits) {
      p.state = 'washed'
      s.drops += s.tuning.washReward
      const t = s.towers[sh.slot]
      if (t) t.washed++
      s.tallies[p.wave].washed++
      s.events.push({ kind: 'wash', slot: sh.slot, id: p.id, at, drops: s.tuning.washReward, value: p.value })
    } else {
      s.events.push({ kind: 'bounce', slot: sh.slot, id: p.id, at, value: p.value })
    }
  }
  s.shots = s.shots.filter((sh) => sh.t !== Infinity)
}

/** One fixed tick (`TICK` seconds). Only a running wave moves. */
export function step(s: PatrolState) {
  if (s.phase !== 'wave') return
  s.t += TICK
  s.waveT += TICK
  spawn(s)
  // walk
  const speed = s.tuning.speed * TICK
  for (const p of s.puddings) {
    if (p.state !== 'walk') continue
    p.s += speed
    if (p.s >= s.layout.length) {
      p.state = 'leaked'
      p.incoming = false
      s.tallies[p.wave].leaked++
      s.events.push({ kind: 'leak', id: p.id, at: { x: s.layout.pond.x, z: s.layout.pond.z }, value: p.value })
    }
  }
  // spray
  for (const t of s.towers) {
    if (!t) continue
    t.cooldown -= TICK
    if (t.refill) t.refill = Math.max(0, t.refill - TICK)
    fire(s, t)
  }
  land(s)
  s.puddings = s.puddings.filter((p) => p.state === 'walk')
  // the wave is over once every Pudding is washed or home in the pond
  const wave = s.plan.waves[s.wave]
  if (s.spawned >= wave.puddings.length && s.puddings.length === 0 && s.shots.length === 0) {
    const tally = s.tallies[s.wave]
    s.events.push({ kind: 'waveEnd', wave: s.wave, washed: tally.washed, leaked: tally.leaked })
    for (const t of s.towers)
      if (t) {
        t.cooldown = 0
        t.refill = 0
        t.super = false
      }
    s.supered = false
    if (s.wave + 1 >= s.plan.waves.length) {
      s.phase = 'done'
      s.events.push({ kind: 'done' })
    } else {
      s.wave++
      s.phase = 'plan'
    }
  }
}

/** Run the simulation forward by real seconds (whole ticks; the rest carries over). */
export function advance(s: PatrolState, seconds: number) {
  s.acc += Math.min(seconds, 0.25)
  while (s.acc >= TICK) {
    s.acc -= TICK
    step(s)
    if (s.phase !== 'wave') {
      s.acc = 0
      break
    }
  }
}

/** Take the events since the last drain. */
export function drainEvents(s: PatrolState) {
  const out = s.events
  s.events = []
  return out
}

/** How clean the pond stayed: the share of Puddings washed (0–1; 1 before any wave). */
export function pondClean(s: PatrolState): number {
  let washed = 0
  let total = 0
  for (let w = 0; w < s.tallies.length; w++) {
    const t = s.tallies[w]
    if (w < s.wave || s.phase === 'done' || (w === s.wave && s.phase === 'wave')) {
      washed += t.washed
      total += t.washed + t.leaked
    }
  }
  return total === 0 ? 1 : washed / total
}

/**
 * The pond's cleanness that earns each star, by band (1 star for finishing:
 * nobody fails out). Tuned with the bots (bots.ts): a planner who matches
 * towers to the lineup earns 3, a sensible child with a few slips 2 or 3,
 * random placement 1. Grades 2–4 ask for more because their two-rule stages
 * (even / odd) forgive random towers more than the others do.
 */
export const STAR_AT: Record<ContentBand, { two: number; three: number }> = {
  k1: { two: 0.72, three: 0.9 },
  g1: { two: 0.76, three: 0.9 },
  g24: { two: 0.8, three: 0.93 },
  g5: { two: 0.72, three: 0.88 },
}

export function patrolStars(clean: number, band: ContentBand): 1 | 2 | 3 {
  const at = STAR_AT[band]
  return clean >= at.three - 1e-9 ? 3 : clean >= at.two - 1e-9 ? 2 : 1
}

/** Who is where right now (the scene's per-frame read, allocation-free into `out`). */
export function puddingPos(s: PatrolState, p: Pudding, out: Vec2): Vec2 {
  return pointAt(s.layout, p.s, out)
}

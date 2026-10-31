import { rule, type PatrolPlan, type RuleId } from '../../lib/puddle'
import { seededRng } from '../../lib/random'
import { canBuild, canSuper, createPatrol, placeTower, pondClean, patrolStars, rulesNow, startWave, step } from './engine'
import type { PatrolState } from './types'

/**
 * Playtest bots for Puddle Patrol (the balance tests and
 * scripts/puddle-balance.mjs). Each plays a whole stage through the real
 * engine, exactly as a child can (place, swap, Super Soak, Go), and counts
 * the seconds a child would spend: the waves themselves plus thinking time.
 *
 * - `optimal`: reads the incoming lineup and tries each rule on each tower
 *   (in the best slots first), keeping whatever washes the most; Super Soaks
 *   the tower that gains the most; mid-wave, fixes a tower with nothing left
 *   to wash when a Pudding is coming that no tower washes.
 * - `kid`: mostly sensible (builds and Super Soaks for the rules the lineup
 *   needs most), but one pick in four is a guess, it sometimes forgets to swap.
 * - the five playtest personas (`k`, `g1`, `g3strong`, `g3weak`, `g5`): the
 *   same sensible child with each persona's accuracy, slips and tap speed.
 * - `naive`: random rules in random slots, never looks at the lineup, never swaps.
 * - `spread`: one of each rule, round robin, never looks at the lineup.
 * - `spam`: fills every slot with anything, then keeps changing rules all
 *   through the wave (one swap every 0.8 s), never looking at who is coming.
 *
 * Every bot that isn't `optimal` spends its spare drops on Super Soaks,
 * sensibly or at random, the way it places towers.
 */

export type PersonaKind = 'k' | 'g1' | 'g3strong' | 'g3weak' | 'g5'
export type BotKind = 'optimal' | 'kid' | 'naive' | 'spam' | 'spread' | PersonaKind

export interface BotRun {
  clean: number
  stars: 1 | 2 | 3
  /** Seconds the stage takes: waves + thinking + the game's own beats. */
  seconds: number
  /** Seconds of waves (watching), and the longest single wave. */
  waveSeconds: number
  longestWave: number
  /** Placements and swaps made, and how many of them fit the incoming lineup. */
  placements: number
  smartPlacements: number
  /** Super Soaks bought, and drops left unspent at the end. */
  supers: number
  dropsLeft: number
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
  supers: number
  taps: number
}

function record(s: PatrolState, tally: Tally, r: RuleId) {
  tally.placements++
  if (smart(s, r)) tally.smart++
}

function superSoak(s: PatrolState, tally: Tally, slot: number) {
  const t = s.towers[slot]
  if (t && placeTower(s, slot, t.rule) === 'boosted') tally.supers++
}

// ── optimal ─────────────────────────────────────────────────────────────────

function planOptimal(s: PatrolState, tally: Tally) {
  const rules = rulesNow(s)
  const order = slotOrder(s)
  // how many towers we can have this wave: those standing, plus what the drops buy
  const standing = s.towers.filter(Boolean).length
  const affordable = Math.min(s.tuning.maxTowers - standing, Math.floor(s.drops / s.tuning.cost))
  const want = Math.min(s.tuning.maxTowers, standing + affordable)
  // the slots to use: the standing towers' slots, then the best empty ones
  const used = order.filter((i) => s.towers[i]).concat(order.filter((i) => !s.towers[i])).slice(0, want)
  const left = s.drops - (want - standing) * s.tuning.cost
  const canSoak = want >= s.tuning.maxTowers && left >= s.tuning.superCost && !s.supered
  // every way to give the used slots rules, then the Super Soak on one tower of the three best (or none): keep the best
  const tryOut = (pick: RuleId[], soak: number) => {
    const trial = clone(s)
    trial.towers = trial.towers.map(() => null)
    used.forEach((slot, k) => (trial.towers[slot] = { slot, rule: pick[k], cooldown: 0, washed: 0, super: k === soak }))
    // (a Super Soak is only worth its drops when it washes more)
    return playOut(trial) - (soak >= 0 ? 0.5 : 0)
  }
  const combos = Array.from({ length: rules.length ** used.length }, (_, c) => used.map((_, k) => rules[Math.floor(c / rules.length ** k) % rules.length]))
  const scored = combos.map((pick) => ({ pick, got: tryOut(pick, -1) })).sort((a, b) => b.got - a.got)
  let top = scored[0].got
  let best: { rules: RuleId[]; soak: number } = { rules: scored[0].pick, soak: -1 }
  if (canSoak)
    for (const { pick } of scored.slice(0, 3))
      for (let soak = 0; soak < used.length; soak++) {
        const got = tryOut(pick, soak)
        if (got > top) {
          top = got
          best = { rules: pick, soak }
        }
      }
  used.forEach((slot, k) => {
    const r = best.rules[k]
    // (its own rule again would be a Super Soak: leave it be)
    if (s.towers[slot]?.rule === r) return
    const res = placeTower(s, slot, r)
    if (res === 'built' || res === 'swapped') record(s, tally, r)
  })
  if (best.soak >= 0) superSoak(s, tally, used[best.soak])
}

// ── a sensible child, and the personas ──────────────────────────────────────

interface Persona {
  /** How often a pick is the one the lineup asks for (the rest are slips). */
  sense: number
  /** A slip: a random card, or the first card on the tray ("the first / bigger-looking option"). */
  slip: 'random' | 'first'
  /** A tap that lands on another card than meant. */
  mistap: number
  /** Leaves a standing tower alone even when the lineup doesn't need it. */
  forget: number
  /** Now and then it saves its drops instead of building. */
  save: number
  /** Seconds to read one Pudding of the lineup, and per tap. */
  read: number
  tap: number
  /** Buys Super Soaks with spare drops (some children never find them). */
  supers: number
  /** Watches a wave closely enough to fix a tower mid-wave (a Pudding no tower washes, a tower with nothing to do). */
  fix: number
}

/** The optimal bot's eye during a wave: it always watches, and taps quickly. */
const WATCHER: Persona = { sense: 1, slip: 'random', mistap: 0, forget: 0, save: 0, read: 0.4, tap: 0.4, supers: 1, fix: 1 }

const PERSONAS: Record<'kid' | PersonaKind, Persona> = {
  kid: { sense: 0.75, slip: 'random', mistap: 0, forget: 0.3, save: 0.15, read: 1.2, tap: 1, supers: 0.8, fix: 0.4 },
  // can't read; counts dots slowly; about 2 s a tap; 1 tap in 5 lands wrong
  k: { sense: 0.7, slip: 'random', mistap: 0.2, forget: 0.35, save: 0.2, read: 2, tap: 2, supers: 0.5, fix: 0.3 },
  g1: { sense: 0.72, slip: 'random', mistap: 0.1, forget: 0.3, save: 0.15, read: 1.8, tap: 1.4, supers: 0.6, fix: 0.35 },
  g3strong: { sense: 0.9, slip: 'random', mistap: 0.02, forget: 0.1, save: 0.05, read: 0.5, tap: 0.6, supers: 0.95, fix: 0.7 },
  g3weak: { sense: 0.55, slip: 'first', mistap: 0.05, forget: 0.4, save: 0.1, read: 1.3, tap: 1, supers: 0.6, fix: 0.25 },
  g5: { sense: 0.85, slip: 'random', mistap: 0.03, forget: 0.15, save: 0.05, read: 0.5, tap: 0.6, supers: 0.9, fix: 0.6 },
}

/**
 * The towers a child who reads the lineup wants: one for each rule with
 * Puddings coming (busiest first), the rest on whichever rule has the most
 * Puddings per tower (`n` towers in all).
 */
export function wanted(s: PatrolState, n: number): RuleId[] {
  const need = demand(s)
  const busy = [...need].filter(([, k]) => k >= 1).sort((a, b) => b[1] - a[1])
  const out: RuleId[] = busy.slice(0, n).map(([r]) => r)
  const count = new Map<RuleId, number>(out.map((r) => [r, 1]))
  while (out.length < n && busy.length) {
    const [r] = busy.reduce((a, b) => (b[1] / ((count.get(b[0]) ?? 0) + 1) > a[1] / ((count.get(a[0]) ?? 0) + 1) ? b : a))
    out.push(r)
    count.set(r, (count.get(r) ?? 0) + 1)
  }
  return out
}

function planPersona(s: PatrolState, tally: Tally, rnd: () => number, p: Persona) {
  const rules = rulesNow(s)
  const order = slotOrder(s)
  const standing = s.towers.filter(Boolean).length
  const affordable = Math.min(s.tuning.maxTowers - standing, Math.floor(s.drops / s.tuning.cost))
  // what it means to have up: the busiest rules first (a slip: a guess, or the first card)
  const want = wanted(s, standing + affordable)
  const pickFor = (meant: RuleId): RuleId => {
    tally.taps += 2
    const r = rnd() < p.sense ? meant : p.slip === 'first' ? rules[0] : rules[Math.floor(rnd() * rules.length)]
    return rnd() < p.mistap ? rules[Math.floor(rnd() * rules.length)] : r
  }
  const take = (r: RuleId) => {
    const i = want.indexOf(r)
    if (i >= 0) want.splice(i, 1)
  }
  // look at what's standing: keep what's wanted (or forget to look), swap the rest
  const toSwap: number[] = []
  for (const i of order) {
    const t = s.towers[i]
    if (!t) continue
    if (want.includes(t.rule) || rnd() < p.forget) take(t.rule)
    else toSwap.push(i)
  }
  for (const i of toSwap) {
    const meant = want.shift() ?? rules[0]
    const r = pickFor(meant)
    if (r !== s.towers[i]!.rule && placeTower(s, i, r) === 'swapped') record(s, tally, r)
  }
  // build while the drops allow (now and then it saves them instead)
  for (const i of order) {
    if (s.towers[i] || !canBuild(s)) continue
    if (rnd() < p.save) break
    const r = pickFor(want.shift() ?? rules[0])
    if (placeTower(s, i, r) === 'built') record(s, tally, r)
  }
  // spare drops: the Super Soak goes on the tower with the most Puddings to wash (or a slip)
  if (towersFull(s) && rnd() < p.supers) {
    const able = s.towers.map((_, i) => (canSuper(s, i) ? i : -1)).filter((i) => i >= 0)
    if (able.length) {
      tally.taps += 2
      const need = demand(s)
      const per = (i: number) => (need.get(s.towers[i]!.rule) ?? 0) / s.towers.filter((t) => t?.rule === s.towers[i]!.rule).length
      const i = rnd() < p.sense ? able.reduce((a, b) => (per(b) > per(a) ? b : a)) : able[Math.floor(rnd() * able.length)]
      superSoak(s, tally, i)
    }
  }
}

const towersFull = (s: PatrolState) => s.towers.filter(Boolean).length >= s.tuning.maxTowers

// ── the ones that don't read ────────────────────────────────────────────────

/** Spare drops, spent on any tower. */
function superAtRandom(s: PatrolState, tally: Tally, rnd: () => number) {
  if (!towersFull(s)) return
  for (let guard = 0; guard < s.towers.length; guard++) {
    const able = s.towers.map((_, i) => (canSuper(s, i) ? i : -1)).filter((i) => i >= 0)
    if (!able.length) break
    superSoak(s, tally, able[Math.floor(rnd() * able.length)])
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
  superAtRandom(s, tally, rnd)
}

/** Fill every slot it can with any rule (never reads the lineup). */
function planFill(s: PatrolState, tally: Tally, rnd: () => number) {
  const rules = rulesNow(s)
  for (const i of slotOrder(s)) {
    if (s.towers[i] || !canBuild(s)) continue
    const r = rules[Math.floor(rnd() * rules.length)]
    if (placeTower(s, i, r) === 'built') record(s, tally, r)
  }
  superAtRandom(s, tally, rnd)
}

/** One of each rule, round robin, in the best slots (never reads the lineup, never swaps). */
function planSpread(s: PatrolState, tally: Tally, rnd: () => number) {
  const rules = rulesNow(s)
  let k = s.towers.filter(Boolean).length
  for (const i of slotOrder(s)) {
    if (s.towers[i] || !canBuild(s)) continue
    const r = rules[k++ % rules.length]
    if (placeTower(s, i, r) === 'built') record(s, tally, r)
  }
  superAtRandom(s, tally, rnd)
}

/**
 * The rule-change spammer's wave: it keeps tapping a tower and the next card
 * (one swap every `SPAM_EVERY` seconds, round robin over the towers).
 */
const SPAM_EVERY = 0.8
function spamWave(s: PatrolState, tally: Tally) {
  startWave(s)
  let next = SPAM_EVERY
  let k = 0
  let guard = 0
  while (s.phase === 'wave' && guard++ < 20000) {
    step(s)
    if (s.phase === 'wave' && s.waveT >= next) {
      next += SPAM_EVERY
      const standing = s.towers.map((t, i) => (t ? i : -1)).filter((i) => i >= 0)
      if (!standing.length) continue
      const i = standing[k++ % standing.length]
      const rules = rulesNow(s)
      const r = rules[(rules.indexOf(s.towers[i]!.rule) + 1) % rules.length]
      if (placeTower(s, i, r) === 'swapped') record(s, tally, r)
    }
  }
  s.events = []
}

/**
 * A persona's wave: it may watch closely, and when a Pudding is coming that
 * no tower washes while a tower has nothing left to wash, it gives that tower
 * the rule the Pudding needs (it refills first: one reload).
 */
function watchWave(s: PatrolState, tally: Tally, rnd: () => number, p: Persona) {
  const w = s.wave
  const watching = rnd() < p.fix
  startWave(s)
  let next = 1
  const fixed = new Set<number>()
  let guard = 0
  while (s.phase === 'wave' && guard++ < 20000) {
    step(s)
    if (!watching || s.phase !== 'wave' || s.waveT < next) continue
    next += p.tap * 2
    const rules = rulesNow(s)
    const towers = s.towers.map((t, i) => (t ? i : -1)).filter((i) => i >= 0)
    const left = s.plan.waves[w].puddings.slice(s.spawned).map((q) => q.value)
    const walking = s.puddings.filter((q) => q.state === 'walk' && q.s < s.layout.length * 0.4)
    const orphan = walking.find((q) => !towers.some((i) => rule(s.towers[i]!.rule).fits(q.value)))
    if (!orphan) continue
    const idle = towers.find((i) => !fixed.has(i) && ![...left, ...s.puddings.filter((q) => q.state === 'walk').map((q) => q.value)].some((v) => rule(s.towers[i]!.rule).fits(v)))
    const r = rules.find((x) => rule(x).fits(orphan.value))
    if (idle === undefined || !r) continue
    tally.taps += 2
    fixed.add(idle)
    if (placeTower(s, idle, r) === 'swapped') record(s, tally, r)
  }
  s.events = []
}

/** Seconds the non-persona bots spend between waves (reading the lineup, tapping cards). */
const THINK: Record<'optimal' | 'naive' | 'spam' | 'spread', { k1: [number, number]; older: [number, number] }> = {
  optimal: { k1: [8, 10], older: [5, 7] },
  naive: { k1: [5, 8], older: [3, 5] },
  spam: { k1: [3, 5], older: [2, 4] },
  spread: { k1: [4, 6], older: [3, 5] },
}

/** The game's own beats per wave (the "wave clear" moment, a new rule's intro) and per stage (intro, results). */
const BEATS = { wave: 2.5, freshRule: 4, stage: 12 }

export function playBot(plan: PatrolPlan, kind: BotKind, seed = 'bot'): BotRun {
  const s = createPatrol(plan)
  const rnd = seededRng(`${kind}|${seed}`)
  const young = plan.spec.band === 'k1' || plan.spec.band === 'g1'
  const persona = kind in PERSONAS ? PERSONAS[kind as keyof typeof PERSONAS] : null
  const tally: Tally = { placements: 0, smart: 0, supers: 0, taps: 0 }
  let seconds = BEATS.stage
  let waveSeconds = 0
  let longestWave = 0
  while (s.phase === 'plan') {
    const wave = plan.waves[s.wave]
    seconds += BEATS.wave + (wave.fresh.length ? BEATS.freshRule : 0)
    const taps0 = tally.taps
    if (kind === 'optimal') planOptimal(s, tally)
    else if (persona) planPersona(s, tally, rnd, persona)
    else if (kind === 'spam') planFill(s, tally, rnd)
    else if (kind === 'spread') planSpread(s, tally, rnd)
    else planNaive(s, tally, rnd)
    if (persona) seconds += persona.read * wave.puddings.length * (0.5 + rnd() * 0.5) + (tally.taps - taps0 + 1) * persona.tap
    else {
      const [lo, hi] = THINK[kind as keyof typeof THINK][young ? 'k1' : 'older']
      seconds += lo + rnd() * (hi - lo)
    }
    const t0 = s.t
    if (kind === 'spam') spamWave(s, tally)
    else if (persona) watchWave(s, tally, rnd, persona)
    else if (kind === 'optimal') watchWave(s, tally, rnd, WATCHER)
    else playOut(s)
    const w = s.t - t0
    seconds += w
    waveSeconds += w
    longestWave = Math.max(longestWave, w)
  }
  const clean = pondClean(s)
  return {
    clean,
    stars: patrolStars(clean, plan.spec.band),
    seconds,
    waveSeconds,
    longestWave,
    placements: tally.placements,
    smartPlacements: tally.smart,
    supers: tally.supers,
    dropsLeft: s.drops,
  }
}

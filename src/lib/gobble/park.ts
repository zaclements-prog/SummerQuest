import { toNumber } from '../numbers'
import { seededRng } from '../random'
import { canEat, cloudLadder, makeSnack, type GobbleConfig, type NumberShown, type SnackValue } from './sets'

/**
 * Gobble Garden's park, as a pure simulation: the cloud, the snacks, eating,
 * bumping, growing and re-seeding. The 3D scene calls `stepPark` once a frame
 * and turns the events it returns into juice; the tests run whole sessions
 * through it with a bot. No three.js, no React, no allocation per step beyond
 * the (rare) events.
 *
 * ## Why the cloud's number climbs a ladder (fair growth)
 *
 * Hole.io grows by everything it swallows. Done literally (5 eats 3 and
 * becomes 8, then eats 7 and becomes 15…) the number outruns the snacks
 * within a few bites, every snack becomes edible and the comparisons vanish:
 * the late round turns into "eat everything". So the cloud grows in two ways:
 *
 * - its SIZE and its belly grow by what it eats: each snack fills the belly
 *   by its value over the cloud's number (the closer to the cloud's number,
 *   the more it fills, and the more points: careful comparisons pay);
 * - its NUMBER climbs one rung of a fixed, capped ladder (sets.ts) each time
 *   the belly fills. At the top it stays put.
 *
 * And the park scales with it: every new snack is drawn against the cloud's
 * current number, the side (edible or too big) chosen to keep about
 * `EDIBLE_SHARE` of the park edible; when the number climbs, far-away snacks
 * that just became edible are swapped for bigger ones; and a check keeps at
 * least two edible snacks and one too-big snack near the cloud at all times.
 * So every steer stays a real choice, in the first second and the last.
 */

// ── tuning ───────────────────────────────────────────────────────────────────

export const PARK = {
  /** Half the park's side (world units): the hedges sit just outside. */
  half: 13,
  /** Snack slots (one label cell and one instance each). */
  slots: 18,
  /** Snack radius. */
  snackR: 0.78,
  /** The cloud's radius, fresh and full grown. */
  cloudR0: 1.1,
  cloudRMax: 2.0,
  /** Cloud top speed (units / s); kindergarten's is gentler. */
  speed: 6.4,
  speedListen: 5.2,
  /** "Near the cloud" for the fairness check, and about what the camera shows. */
  near: 7.5,
  view: 10,
  /** Seconds before an eaten snack's slot grows a new one. */
  respawn: 0.9,
  /** How often the near-the-cloud check runs (s). */
  checkEvery: 0.5,
  /** Edible snacks within this reach drift into the cloud (forgiving steering). */
  magnet: 0.95,
  /** A too-big snack only burps when the cloud runs into it at least this fast (a graze just slides off). */
  bonkSpeed: 1.1,
  /** Seconds before the same too-big snack can burp again (one burp per bump, not one a frame). */
  reburp: 3,
  /** Seconds the cloud sits dizzy after a burp (it bounces off and can't steer): ramming everything is slow. */
  daze: 0.7,
  /** Spacing between snacks. */
  gap: 2.9,
} as const

/** The belly is full (the number climbs a rung) at this much eaten value, in "cloud numbers" (K–1). */
export const BELLY_FULL = 2.5
/**
 * Grades 2–5's belly: their parks are longer (30 snacks), so the number climbs
 * a little slower and reaches the top late in the third park, not by the end
 * of the second (playtests at 2.5: a strong 3rd grader topped out with a whole
 * park to go, and the growing stopped).
 */
export const BELLY_FULL_READERS = 3.5

export const bellyFull = (listen: boolean) => (listen ? BELLY_FULL : BELLY_FULL_READERS)
/**
 * A burp lets this much out of the belly (about one bite; never below empty,
 * and the cloud's number never shrinks): bumping everything grows slower than
 * choosing.
 */
export const BURP_COST = 0.5
/**
 * About this share of the park is edible. Under half, so steering blindly
 * into everything bumps more than it eats (playtests: at 55% a lawnmower
 * sweep scored 73% smart bites and 2 stars without reading a number).
 */
export const EDIBLE_SHARE = 0.45
/** Near the cloud there are always at least this many edible and too-big snacks. */
export const NEAR_EDIBLE = 2
export const NEAR_TOO_BIG = 1

export interface RoundPlan {
  /** Snacks to eat for a tidy park. */
  goal: number
  /** Seconds on the clock (grades 2–5), or null: no clock (K–1). */
  seconds: number | null
  /** Difficulty at the start of the round (0–1); it ramps by `ramp` as the round goes. */
  start: number
  ramp: number
}

export const ROUNDS = 3

/**
 * Snacks for a tidy park: about 40 s of play for a kindergartner (12) or a
 * 1st grader (14); in grades 2–5 (30) a quick, sure player tidies in 35–45 s
 * and a slower one meets the 80 s clock first (playtests: at 20 a strong 3rd
 * grader tidied in 24 s and never saw the clock).
 */
export function parkGoal(listen: boolean, set?: GobbleConfig['set']): number {
  return set === 'k' ? 12 : listen ? 14 : 30
}

/**
 * The session: three parks. The first is easy (far gaps, the plainest
 * comparisons), each starts harder, and each ramps as it goes. K–1 has no
 * clock (a park ends when it's tidy); grades 2–5 have about 80 s or the goal.
 */
export function roundPlans(listen: boolean, seconds = 80, set?: GobbleConfig['set']): RoundPlan[] {
  return [0, 1, 2].map((i) => ({
    goal: parkGoal(listen, set),
    seconds: listen ? null : seconds,
    start: [0, 0.32, 0.62][i],
    ramp: 0.38,
  }))
}

// ── state ────────────────────────────────────────────────────────────────────

export interface ParkSnack {
  slot: number
  snack: SnackValue
  x: number
  z: number
  alive: boolean
  /** Park time this slot grows a new snack (when not alive). */
  respawnAt: number
  /** Bumps whenever the snack (or its value) changes: the label redraws. */
  serial: number
  /** Park time it appeared (its pop-in), and of its last bonk wobble (its last burp: see PARK.reburp). */
  bornAt: number
  wobbleAt: number
}

export interface CloudState {
  x: number
  z: number
  vx: number
  vz: number
  /** Radius (grows with what it eats). */
  r: number
  rung: number
  value: NumberShown
  /** Belly fill, 0 to `bellyFull`. */
  belly: number
  /** Everything eaten, in cloud numbers (drives the size). */
  fed: number
  /** Park time the dizziness after a burp wears off (no steering until then). */
  dazedUntil: number
}

export interface Decision {
  right: boolean
  snack: SnackValue
  cloud: NumberShown
}

export interface ParkInput {
  /** Where the finger is (the cloud heads there and stops). */
  target: { x: number; z: number } | null
  /** Arrow keys (−1…1 each way). */
  axis: { x: number; z: number }
}

export type ParkEvent =
  | { kind: 'eat'; slot: number; snack: SnackValue; cloud: NumberShown; points: number; x: number; z: number; streak: number }
  | { kind: 'burp'; slot: number; snack: SnackValue; cloud: NumberShown; x: number; z: number }
  | { kind: 'grow'; from: NumberShown; to: NumberShown; top: boolean }
  | { kind: 'spawn'; slot: number }
  | { kind: 'roundEnd'; reason: 'tidy' | 'time' }

export interface ParkRun {
  cfg: GobbleConfig
  rng: () => number
  ladder: NumberShown[]
  listen: boolean
  plans: RoundPlan[]
  t: number
  round: number
  /** This round's eats and seconds used. */
  roundEaten: number
  roundT: number
  /** Where this round's decisions start in `decisions`. */
  roundFrom: number
  over: boolean
  cloud: CloudState
  snacks: ParkSnack[]
  decisions: Decision[]
  score: number
  streak: number
  bestStreak: number
  eaten: number
  /** Near chance over the last ten decisions: pictures on the snacks and a slower cloud. */
  scaffold: boolean
  nextCheck: number
  input: ParkInput
}

export function makePark(cfg: GobbleConfig, opts: { seed: string; listen: boolean; seconds?: number }): ParkRun {
  const ladder = cloudLadder(cfg)
  const run: ParkRun = {
    cfg,
    rng: seededRng(opts.seed),
    ladder,
    listen: opts.listen,
    plans: roundPlans(opts.listen, opts.seconds, cfg.set),
    t: 0,
    round: 0,
    roundEaten: 0,
    roundT: 0,
    roundFrom: 0,
    over: false,
    cloud: { x: 0, z: 0, vx: 0, vz: 0, r: PARK.cloudR0, rung: 0, value: ladder[0], belly: 0, fed: 0, dazedUntil: 0 },
    snacks: [],
    decisions: [],
    score: 0,
    streak: 0,
    bestStreak: 0,
    eaten: 0,
    scaffold: false,
    nextCheck: 0,
    input: { target: null, axis: { x: 0, z: 0 } },
  }
  for (let i = 0; i < PARK.slots; i++) run.snacks.push({ slot: i, snack: ladder[0] as SnackValue, x: 0, z: 0, alive: false, respawnAt: 0, serial: 0, bornAt: 0, wobbleAt: -9 })
  seedRound(run)
  return run
}

/** How hard the snacks are right now: the round's start, ramping with its progress (eats or the clock). */
export function difficulty(run: ParkRun): number {
  const p = run.plans[Math.min(run.round, run.plans.length - 1)]
  const byEats = run.roundEaten / p.goal
  const byTime = p.seconds ? run.roundT / p.seconds : 0
  return Math.min(1, p.start + p.ramp * Math.min(1, Math.max(byEats, byTime)))
}

export function roundPlan(run: ParkRun): RoundPlan {
  return run.plans[Math.min(run.round, run.plans.length - 1)]
}

const dist2 = (ax: number, az: number, bx: number, bz: number) => (ax - bx) ** 2 + (az - bz) ** 2

function edibleShare(run: ParkRun): number {
  let e = 0
  let n = 0
  for (const s of run.snacks) {
    if (!s.alive) continue
    n++
    if (canEat(s.snack, run.cloud.value)) e++
  }
  return n ? e / n : 0
}

/** A free spot: `lo`–`hi` from the cloud when asked (else anywhere), clear of the other snacks. */
function freeSpot(run: ParkRun, lo: number, hi: number, self: number): { x: number; z: number } {
  const { cloud } = run
  const lim = PARK.half - PARK.snackR
  let best: { x: number; z: number } | null = null
  let bestScore = -1
  for (let i = 0; i < 28; i++) {
    let x: number
    let z: number
    if (hi > 0) {
      const a = run.rng() * Math.PI * 2
      const d = lo + run.rng() * (hi - lo)
      x = cloud.x + Math.cos(a) * d
      z = cloud.z + Math.sin(a) * d
    } else {
      x = (run.rng() * 2 - 1) * lim
      z = (run.rng() * 2 - 1) * lim
    }
    x = Math.max(-lim, Math.min(lim, x))
    z = Math.max(-lim, Math.min(lim, z))
    if (dist2(x, z, cloud.x, cloud.z) < (cloud.r + PARK.snackR + 1.4) ** 2) continue
    let nearest = Infinity
    for (const s of run.snacks) if (s.alive && s.slot !== self) nearest = Math.min(nearest, dist2(x, z, s.x, s.z))
    if (nearest >= PARK.gap * PARK.gap) return { x, z }
    if (nearest > bestScore) {
      bestScore = nearest
      best = { x, z }
    }
  }
  return best ?? { x: Math.max(-lim, Math.min(lim, cloud.x + 4)), z: Math.max(-lim, Math.min(lim, cloud.z + 4)) }
}

/** Give a slot a new snack (`edible` or too big), at a spot. */
function placeSnack(run: ParkRun, s: ParkSnack, edible: boolean, spot: { x: number; z: number }) {
  s.snack = makeSnack(run.cfg, run.cloud.value, edible, difficulty(run), run.rng)
  s.x = spot.x
  s.z = spot.z
  s.alive = true
  s.respawnAt = 0
  s.wobbleAt = -9
  s.serial++
  s.bornAt = run.t
}

/** Edible or too big for the next snack: whichever brings the park back toward EDIBLE_SHARE. */
function nextSide(run: ParkRun): boolean {
  return edibleShare(run) < EDIBLE_SHARE
}

/** The first six snacks, right around the cloud: a mix, so the first choice is right there. */
const OPENING = [true, false, true, false, true, true]

/** A fresh park: snacks everywhere (about EDIBLE_SHARE edible), the cloud where it stands. */
function seedRound(run: ParkRun) {
  for (const s of run.snacks) s.alive = false
  const edibleLeft = Math.round(PARK.slots * EDIBLE_SHARE) - OPENING.filter(Boolean).length
  const rest = Array.from({ length: PARK.slots - OPENING.length }, (_, i) => i < edibleLeft)
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(run.rng() * (i + 1))
    ;[rest[i], rest[j]] = [rest[j], rest[i]]
  }
  run.snacks.forEach((s, i) => {
    if (i < OPENING.length) placeSnack(run, s, OPENING[i], freeSpot(run, 3, PARK.near - 1, s.slot))
    else placeSnack(run, s, rest[i - OPENING.length], freeSpot(run, 0, 0, s.slot))
  })
  ensureNear(run, [])
  run.nextCheck = run.t + PARK.checkEvery
}

/**
 * The fairness check: near the cloud there are always NEAR_EDIBLE edible
 * snacks and NEAR_TOO_BIG too-big ones. A short side takes a snack from far
 * away (off screen when there is one) and grows it here, with the side it
 * needs.
 */
function ensureNear(run: ParkRun, events: ParkEvent[]) {
  const { cloud } = run
  const near2 = PARK.near * PARK.near
  let e = 0
  let b = 0
  for (const s of run.snacks) {
    if (!s.alive || dist2(s.x, s.z, cloud.x, cloud.z) > near2) continue
    if (canEat(s.snack, cloud.value)) e++
    else b++
  }
  const need: boolean[] = []
  for (let i = e; i < NEAR_EDIBLE; i++) need.push(true)
  for (let i = b; i < NEAR_TOO_BIG; i++) need.push(false)
  for (const edible of need) {
    // a slot waiting to regrow first, else the farthest snack (never one near the cloud)
    let donor: ParkSnack | null = null
    let far = near2
    for (const s of run.snacks) {
      if (!s.alive) {
        donor = s
        break
      }
      const d = dist2(s.x, s.z, cloud.x, cloud.z)
      if (d > far) {
        far = d
        donor = s
      }
    }
    if (!donor) return
    placeSnack(run, donor, edible, freeSpot(run, 2.6, PARK.near - 0.6, donor.slot))
    events.push({ kind: 'spawn', slot: donor.slot })
  }
}

/** After the number climbs: far-off snacks that just became edible turn into bigger ones, back toward the share. */
function rebalance(run: ParkRun, events: ParkEvent[]) {
  const { cloud } = run
  const view2 = PARK.view * PARK.view
  const far = run.snacks
    .filter((s) => s.alive && canEat(s.snack, cloud.value) && dist2(s.x, s.z, cloud.x, cloud.z) > view2)
    .sort((a, b) => dist2(b.x, b.z, cloud.x, cloud.z) - dist2(a.x, a.z, cloud.x, cloud.z))
  for (const s of far) {
    if (edibleShare(run) <= EDIBLE_SHARE + 0.05) break
    placeSnack(run, s, false, { x: s.x, z: s.z })
    events.push({ kind: 'spawn', slot: s.slot })
  }
}

/** Points for a snack: 10, up to 20 the closer it is to the cloud's number, and a streak bonus. */
export function snackPoints(snack: SnackValue, cloud: NumberShown, streak: number): number {
  const k = Math.max(0, Math.min(1, toNumber(snack.value) / toNumber(cloud.value)))
  return 10 + Math.round(10 * k) + 2 * Math.min(5, streak)
}

/** Near chance (≤ 55%) over the last ten decisions turns the pictures on; ≥ 70% turns them off. */
export function scaffoldNow(ds: readonly Decision[], was: boolean): boolean {
  if (ds.length < 6) return was
  const last = ds.slice(-10)
  const share = last.filter((d) => d.right).length / last.length
  return was ? share < 0.7 : share <= 0.55
}

function eat(run: ParkRun, s: ParkSnack, events: ParkEvent[]) {
  const { cloud } = run
  s.alive = false
  s.respawnAt = run.t + PARK.respawn
  run.decisions.push({ right: true, snack: s.snack, cloud: cloud.value })
  run.streak++
  run.bestStreak = Math.max(run.bestStreak, run.streak)
  const points = snackPoints(s.snack, cloud.value, run.streak - 1)
  run.score += points
  run.eaten++
  run.roundEaten++
  events.push({ kind: 'eat', slot: s.slot, snack: s.snack, cloud: cloud.value, points, x: s.x, z: s.z, streak: run.streak })
  // grows by what it eats: the belly by the snack's share of the cloud's number
  const share = Math.max(0.1, Math.min(1, toNumber(s.snack.value) / toNumber(cloud.value.value)))
  cloud.belly += share
  cloud.fed += share
  cloud.r = PARK.cloudR0 + (PARK.cloudRMax - PARK.cloudR0) * (1 - Math.exp(-cloud.fed / 10))
  const full = bellyFull(run.listen)
  if (cloud.belly >= full) {
    cloud.belly -= full
    const from = cloud.value
    const top = cloud.rung >= run.ladder.length - 1
    if (!top) {
      cloud.rung++
      cloud.value = run.ladder[cloud.rung]
    } else run.score += 20 // a full belly at the top: a bonus instead of a bigger number
    events.push({ kind: 'grow', from, to: cloud.value, top })
    if (!top) rebalance(run, events)
  }
  run.scaffold = scaffoldNow(run.decisions, run.scaffold)
}

function burp(run: ParkRun, s: ParkSnack, events: ParkEvent[]) {
  s.wobbleAt = run.t
  run.cloud.belly = Math.max(0, run.cloud.belly - BURP_COST)
  run.cloud.dazedUntil = run.t + PARK.daze
  run.decisions.push({ right: false, snack: s.snack, cloud: run.cloud.value })
  run.streak = 0
  // (stop heading for it: a tap on a too-big snack shouldn't grind against it)
  run.input.target = null
  events.push({ kind: 'burp', slot: s.slot, snack: s.snack, cloud: run.cloud.value, x: s.x, z: s.z })
  run.scaffold = scaffoldNow(run.decisions, run.scaffold)
}

/** The cloud's top speed now. */
export function cloudSpeed(run: ParkRun): number {
  return (run.listen ? PARK.speedListen : PARK.speed) * (run.scaffold ? 0.85 : 1)
}

/**
 * One step of the park (`dt` seconds): steer, eat, bump, regrow, keep it
 * fair, run the clock. Returns what happened (appended to `events`: the
 * frame loop passes one array it reuses), for the scene's juice.
 */
export function stepPark(run: ParkRun, dt: number, events: ParkEvent[] = []): ParkEvent[] {
  if (run.over) return events
  dt = Math.min(dt, 0.1)
  run.t += dt
  run.roundT += dt
  const { cloud, input } = run

  // ── steering: the finger (arrive and stop) or the arrow keys ──
  const top = cloudSpeed(run)
  let wx = 0
  let wz = 0
  const ax = input.axis.x
  const az = input.axis.z
  if (run.t < cloud.dazedUntil) {
    // dizzy after a burp: the bounce coasts, no steering
  } else if (ax !== 0 || az !== 0) {
    const m = Math.hypot(ax, az)
    wx = (ax / m) * top
    wz = (az / m) * top
    input.target = null
  } else if (input.target) {
    const dx = input.target.x - cloud.x
    const dz = input.target.z - cloud.z
    const d = Math.hypot(dx, dz)
    if (d > 0.12) {
      // ease in over the last stretch, so it stops under the finger
      const sp = top * Math.min(1, d / 1.6)
      wx = (dx / d) * sp
      wz = (dz / d) * sp
    }
  }
  const k = Math.min(1, dt * 7)
  cloud.vx += (wx - cloud.vx) * k
  cloud.vz += (wz - cloud.vz) * k
  cloud.x += cloud.vx * dt
  cloud.z += cloud.vz * dt
  const lim = PARK.half - cloud.r * 0.6
  if (Math.abs(cloud.x) > lim) {
    cloud.x = Math.sign(cloud.x) * lim
    cloud.vx = 0
  }
  if (Math.abs(cloud.z) > lim) {
    cloud.z = Math.sign(cloud.z) * lim
    cloud.vz = 0
  }

  // ── snacks: eat the edible ones it touches (they drift in when close), bump the big ones ──
  for (const s of run.snacks) {
    if (!s.alive) {
      if (run.t >= s.respawnAt && s.respawnAt > 0) {
        s.respawnAt = 0
        placeSnack(run, s, nextSide(run), freeSpot(run, 4, PARK.view - 0.5, s.slot))
        events.push({ kind: 'spawn', slot: s.slot })
      }
      continue
    }
    const dx = cloud.x - s.x
    const dz = cloud.z - s.z
    const d = Math.hypot(dx, dz) || 1e-6
    if (canEat(s.snack, cloud.value)) {
      if (d < cloud.r + PARK.snackR * 0.35) eat(run, s, events)
      else if (d < cloud.r + PARK.snackR + PARK.magnet) {
        const pull = Math.min(d, 3.2 * dt)
        s.x += (dx / d) * pull
        s.z += (dz / d) * pull
      }
      continue
    }
    const touch = cloud.r + PARK.snackR * 0.7
    if (d >= touch) continue
    // too big: the cloud bounces off; a run straight into it is a burp (once per bump: see PARK.reburp).
    // The snack gives a little (it is shoved a third of the overlap), so a big cloud wedged
    // between two big snacks and a hedge can always push its way out.
    const nx = dx / d
    const nz = dz / d
    const approach = -(cloud.vx * nx + cloud.vz * nz)
    const overlap = touch - d
    const slim = PARK.half - PARK.snackR
    s.x = Math.max(-slim, Math.min(slim, s.x - nx * overlap * 0.35))
    s.z = Math.max(-slim, Math.min(slim, s.z - nz * overlap * 0.35))
    cloud.x = s.x + nx * touch
    cloud.z = s.z + nz * touch
    if (approach > 0) {
      cloud.vx += nx * approach * 1.6
      cloud.vz += nz * approach * 1.6
    }
    if (approach >= PARK.bonkSpeed && run.t - s.wobbleAt >= PARK.reburp) burp(run, s, events)
  }

  // ── fairness: edible and too-big snacks near the cloud, always ──
  if (run.t >= run.nextCheck) {
    run.nextCheck = run.t + PARK.checkEvery
    ensureNear(run, events)
  }

  // ── the round's end: a tidy park (the goal), or the clock (grades 2–5) ──
  const plan = roundPlan(run)
  if (run.roundEaten >= plan.goal) endRound(run, 'tidy', events)
  else if (plan.seconds !== null && run.roundT >= plan.seconds) endRound(run, 'time', events)
  return events
}

function endRound(run: ParkRun, reason: 'tidy' | 'time', events: ParkEvent[]) {
  run.over = true
  cloudStop(run)
  events.push({ kind: 'roundEnd', reason })
}

function cloudStop(run: ParkRun) {
  run.cloud.vx = 0
  run.cloud.vz = 0
  run.input.target = null
}

/** The next park: the cloud keeps its number, size and score (nothing eaten is ever lost). */
export function nextRound(run: ParkRun) {
  run.round++
  run.roundEaten = 0
  run.roundT = 0
  run.roundFrom = run.decisions.length
  run.over = false
  cloudStop(run)
  seedRound(run)
}

/** True once every park has been played. */
export const sessionDone = (run: ParkRun) => run.over && run.round >= run.plans.length - 1

// ── results ──────────────────────────────────────────────────────────────────

/**
 * Stars count smart snacking (design rule 7): the share of decisions that
 * were edible snacks eaten (not bumps into too-big ones). Nobody fails out:
 * a played session earns at least one star. Two need 70%: steering blindly
 * into everything lands near 65% (playtests), so the second star is the math.
 */
export function gobbleStars(right: number, total: number): number {
  if (total === 0) return 1
  const share = right / total
  return share >= 0.85 ? 3 : share >= 0.7 ? 2 : 1
}

export function gobbleBestKey(stageId: string | undefined): string {
  return stageId ? `sq-best-gobble-garden-v1:${stageId}` : 'sq-best-gobble-garden-v1'
}

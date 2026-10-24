import type { PetStage } from '../../lib/pets/types'

/**
 * How a creature carries itself: `avatar` is the upright chibi the player
 * walks around as; `pet` re-poses the same model as the animal it is (a lion
 * on four legs, a hopping frog, a gliding octopus) and gives it its own gait.
 */
export type Posture = 'avatar' | 'pet'

/**
 * The pure gait maths behind pet mode: one profile per creature (cadence,
 * swing, bob, hop, idle repertoire), per-stage tempo (babies take quicker,
 * smaller steps), leg phase offsets, the hop arc, the idle scheduler and one
 * per-frame step (`stepPose`) that writes everything the limbs read into a
 * plain mutable object. No three.js, no React, no allocation per frame.
 */

// ── Profiles ─────────────────────────────────────────────────────────────────

export type GaitKind =
  /** four legs, diagonal pairs (front-left with back-right) */
  | 'trot'
  /** four legs, 4-beat lateral sequence with a rolling shoulder sway */
  | 'lumber'
  /** springing hops with pauses between (never walks) */
  | 'hop'
  /** two feet together: little hops with a side-to-side waddle */
  | 'hopWaddle'
  /** no steps: a smooth glide, the arms rippling behind */
  | 'glide'
  /** two legs, body leaning forward, heavy stomps */
  | 'stomp'

/** What the model's arms do in pet mode: front legs reaching the floor, or still arms / tentacles. */
export type GaitBody = 'quad' | 'biped' | 'octo'

export type IdleKind =
  /** lie down (quadrupeds: sploot, legs out front and back) — stays down until it walks again */
  | 'lie'
  /** settle down onto its belly (bipeds) — stays down until it walks again */
  | 'sit'
  /** head down, nose twitching */
  | 'sniff'
  /** turn the head one way, then the other */
  | 'look'
  /** a happy, fast tail wag */
  | 'wag'
  /** a little hop on the spot */
  | 'hopInPlace'

export const IDLE_KINDS: readonly IdleKind[] = ['lie', 'sit', 'sniff', 'look', 'wag', 'hopInPlace']

/** Idles that settle the pet down for the rest of its stop (not in `calm` scenes: lineups, celebrations). */
export function isSettling(k: IdleKind): boolean {
  return k === 'lie' || k === 'sit'
}

export interface HopSpec {
  /** seconds per hop cycle (crouch, air, landing squash, pause) */
  every: number
  /** share of the cycle spent in the air */
  air: number
  /** jump height (units, at kid size) */
  height: number
  /** ground covered per hop (units, at kid size) */
  reach: number
}

export interface GlideSpec {
  /** seconds between the starts of two hop-glides while walking */
  every: number
  /** how long one lasts (s) */
  dur: number
  /** how high it rises (units, at kid size) */
  height: number
}

export interface GaitProfile {
  kind: GaitKind
  body: GaitBody
  /** strides per second at kid size (a stride = every leg once) */
  cadence: number
  /** leg swing either side of vertical (rad) */
  swing: number
  /** how far a swinging leg lifts its foot, as a share of the leg's length */
  lift: number
  /** extra prance: front legs reach this much further forward on the swing (unicorn) */
  prance: number
  /** body bob per step (units at kid size) */
  bob: number
  /** head nod per step (rad) */
  nod: number
  /** side-to-side body roll per stride (rad): the bear's rolling shoulders, the owl's waddle */
  roll: number
  /** tail swish (rad) while walking */
  tail: number
  /** stomp: how hard each footfall jolts the body down (units at kid size) */
  stomp: number
  /** wander speed (units/s at kid size) */
  speed: number
  /** hopping gaits: the hop cycle */
  hop?: HopSpec
  /** occasional hop-glide with a wing flap while walking (dragons) */
  glide?: GlideSpec
  /** wing flap strength on each hop (owl) */
  flutter: number
  /** two-footed hoppers: how far the body leans into each hop (rad, at full air) */
  lean: number
  /** wings held folded while walking (dragons) */
  foldWings: boolean
  /** what it does while standing still */
  idles: readonly IdleKind[]
}

const BASE: GaitProfile = {
  kind: 'trot',
  body: 'quad',
  cadence: 1.4,
  swing: 0.5,
  lift: 0.18,
  prance: 0,
  bob: 0.012,
  nod: 0.05,
  roll: 0,
  tail: 0.35,
  stomp: 0,
  speed: 1,
  flutter: 0,
  lean: 0,
  foldWings: false,
  idles: ['lie', 'sniff', 'look', 'wag'],
}

function gait(p: Partial<GaitProfile>): GaitProfile {
  return { ...BASE, ...p }
}

/**
 * The owl's two-footed hop-waddle with a wing flutter on each hop. Any bird
 * adopts it with one line in `GAITS` (e.g. `raven: BIRD_HOP`).
 */
export const BIRD_HOP: GaitProfile = gait({
  kind: 'hopWaddle',
  body: 'biped',
  cadence: 1.6,
  swing: 0.12,
  lift: 0,
  bob: 0,
  nod: 0.1,
  roll: 0.1,
  tail: 0.2,
  speed: 0.6,
  hop: { every: 0.5, air: 0.55, height: 0.07, reach: 0.22 },
  flutter: 0.9,
  lean: 0.17,
  idles: ['sit', 'look', 'look', 'hopInPlace'],
})

/** The dragons' four-legged walk with folded wings and an occasional hop-glide. */
const DRAGON_WALK: GaitProfile = gait({
  cadence: 1.25,
  swing: 0.5,
  bob: 0.014,
  tail: 0.3,
  speed: 0.95,
  glide: { every: 6.5, dur: 1.1, height: 0.32 },
  foldWings: true,
  flutter: 1,
  idles: ['lie', 'sniff', 'look', 'wag'],
})

/** Every creature's pet gait (see `gaitFor`). */
export const GAITS: Readonly<Record<string, GaitProfile>> = {
  lion: gait({ cadence: 1.3, swing: 0.5, bob: 0.012, nod: 0.05, tail: 0.4, speed: 1 }),
  tiger: gait({ cadence: 1.3, swing: 0.52, bob: 0.01, nod: 0.04, tail: 0.45, speed: 1.05 }),
  // quick and light: short fast steps, a springy bob, the brush tail floats
  fox: gait({ cadence: 2, swing: 0.45, lift: 0.24, bob: 0.018, nod: 0.06, tail: 0.25, speed: 1.35, idles: ['sniff', 'look', 'lie', 'wag', 'sniff'] }),
  // a slow amble: long low swings, a heavy nod
  panda: gait({ cadence: 0.85, swing: 0.42, lift: 0.12, bob: 0.008, nod: 0.07, roll: 0.03, tail: 0.15, speed: 0.6, idles: ['lie', 'lie', 'look', 'sniff'] }),
  // a prancing high-step: the front legs reach high and far
  unicorn: gait({ cadence: 1.2, swing: 0.45, lift: 0.3, prance: 0.55, bob: 0.02, nod: 0.08, tail: 0.3, speed: 1, idles: ['look', 'sniff', 'lie', 'wag'] }),
  // a lumbering amble: 4-beat, rolling shoulders
  bear: gait({ kind: 'lumber', cadence: 0.8, swing: 0.4, lift: 0.12, bob: 0.01, nod: 0.06, roll: 0.075, tail: 0.1, speed: 0.7, idles: ['lie', 'sniff', 'look', 'sniff'] }),
  // hops: crouch, a jump arc, a squash on landing, a pause — never walks
  frog: gait({
    kind: 'hop',
    cadence: 1,
    swing: 0,
    lift: 0,
    bob: 0,
    nod: 0,
    tail: 0,
    speed: 0.8,
    hop: { every: 1.25, air: 0.36, height: 0.26, reach: 0.75 },
    idles: ['look', 'hopInPlace', 'look', 'sniff'],
  }),
  owl: BIRD_HOP,
  raven: BIRD_HOP,
  // glides and undulates: no stepping bob
  octopus: gait({
    kind: 'glide',
    body: 'octo',
    cadence: 0.9,
    swing: 0,
    lift: 0,
    bob: 0.03,
    nod: 0,
    tail: 0,
    speed: 0.7,
    idles: ['look', 'sit', 'look'],
  }),
  // two legs, leaning forward with the tail out level, heavy stomps
  trex: gait({
    kind: 'stomp',
    body: 'biped',
    cadence: 0.85,
    swing: 0.5,
    lift: 0.22,
    bob: 0,
    nod: 0.07,
    roll: 0.04,
    tail: 0.18,
    stomp: 0.03,
    speed: 0.85,
    idles: ['look', 'sniff', 'sit', 'wag'],
  }),
  dragonet: DRAGON_WALK,
  dragon: gait({ ...DRAGON_WALK, cadence: 1.15, speed: 0.9 }),
}

/** A creature without its own entry walks as a plain four-legged trot. */
export const DEFAULT_GAIT: GaitProfile = BASE

export function gaitFor(id: string | null | undefined): GaitProfile {
  return (id && GAITS[id]) || DEFAULT_GAIT
}

// ── Stage tempo ──────────────────────────────────────────────────────────────

export interface StageTempo {
  /** stride-rate multiplier */
  cadence: number
  /** leg-swing multiplier */
  swing: number
  /** wander-speed multiplier */
  speed: number
  /** size of bobs, hops and stomps (the model's own scale) */
  size: number
}

/** Babies take quicker, smaller steps; grown-ups longer, slower ones that still cover more ground. */
export const STAGE_TEMPO: Readonly<Record<PetStage, StageTempo>> = {
  baby: { cadence: 1.45, swing: 0.85, speed: 0.75, size: 0.55 },
  kid: { cadence: 1, swing: 1, speed: 1, size: 1 },
  adult: { cadence: 0.78, swing: 0.9, speed: 1.2, size: 1.45 },
}

export function tempoFor(stage: PetStage | undefined): StageTempo {
  return STAGE_TEMPO[stage ?? 'adult'] ?? STAGE_TEMPO.adult
}

/** Seconds for one full stride (or one hop cycle) of this gait at this stage. */
export function cyclePeriod(g: GaitProfile, tempo: StageTempo): number {
  if (g.hop) return g.hop.every / Math.sqrt(tempo.cadence)
  return 1 / (g.cadence * tempo.cadence)
}

/** Wander speed while walking (units/s); hopping gaits average it over the hop cycle. */
export function walkSpeed(g: GaitProfile, tempo: StageTempo): number {
  return g.speed * tempo.speed
}

/**
 * A pet's wander speed this frame (units/s): its gait's pace, and 0 for a
 * hopper between hops (it only covers ground in the air, faster to make up
 * for the pauses). `advancing` is the walk state's flag (see `PetRoot`).
 */
export function petWanderSpeed(g: GaitProfile, tempo: StageTempo, advancing: boolean | undefined): number {
  return hopPace(g, walkSpeed(g, tempo), advancing)
}

/**
 * Ground speed this frame (units/s) for a pet that should average `v`: a
 * walker moves at `v` all the time; a hopper only while airborne
 * (`advancing`), at `v / air` then, so it keeps the same average without ever
 * sliding along the ground between hops.
 */
export function hopPace(g: GaitProfile, v: number, advancing: boolean | undefined): number {
  if (!g.hop) return v
  return advancing ? v / g.hop.air : 0
}

/** How much quicker a hopper's hops come when it has fallen behind: +`perUnit` per unit behind, at most `max`×. */
export const HOP_HURRY = { perUnit: 0.35, max: 1.8 } as const

/**
 * Rate (≥ 1) a following hopper's hop clock runs at when it is `behind` units
 * further back than it likes to be: it catches up with more frequent hops
 * (and, with `hopPace`, longer ones). Walkers and pets in place: 1.
 */
export function hopHurry(g: GaitProfile, behind: number): number {
  if (!g.hop || !(behind > 0)) return 1
  return Math.min(HOP_HURRY.max, 1 + behind * HOP_HURRY.perUnit)
}

// ── Leg phases ───────────────────────────────────────────────────────────────

/** front/back × the model's −x / +x side */
export type LegSlot = 'FL' | 'FR' | 'BL' | 'BR'

export function legSlot(front: boolean, x: number): LegSlot {
  // the model faces +z, so its left side is +x
  const left = x >= 0
  return front ? (left ? 'FL' : 'FR') : left ? 'BL' : 'BR'
}

const TAU = Math.PI * 2

/**
 * Phase offset (rad) of one leg in the stride. A trot moves diagonal pairs
 * together (front-left with back-right); the lumber is a 4-beat lateral walk
 * (back-left, front-left, back-right, front-right); bipeds alternate; hoppers
 * keep their feet together.
 */
export function legPhase(kind: GaitKind, slot: LegSlot): number {
  switch (kind) {
    case 'lumber':
      return { BL: 0, FL: Math.PI / 2, BR: Math.PI, FR: (3 * Math.PI) / 2 }[slot]
    case 'stomp':
      return slot === 'BL' || slot === 'FL' ? 0 : Math.PI
    case 'hop':
    case 'hopWaddle':
    case 'glide':
      return 0
    case 'trot':
    default:
      return slot === 'FL' || slot === 'BR' ? 0 : Math.PI
  }
}

/**
 * One leg's swing at stride phase `q` (already offset for the leg):
 * `angle` is its rotation about x (+ swings the foot back, − forward) and
 * `lift` the share of its length it draws up (greatest mid-swing, as the foot
 * comes forward). `prance` lets the forward reach go further than the push.
 */
export function legSwing(q: number, swing: number, lift: number, prance = 0): { angle: number; lift: number } {
  const s = Math.sin(q)
  // forward reach (s < 0 → the foot is ahead) is stretched by `prance`
  const angle = swing * (s < 0 ? s * (1 + prance) : s)
  // foot comes forward while cos q < 0; mid-swing at q = π
  const up = Math.max(0, -Math.cos(q))
  return { angle, lift: lift * up * (1 + prance * 0.6) }
}

/**
 * Body drop (units) that keeps the planted feet on the floor while legs of
 * length `len` swing through `swing`: a rigid leg at angle a is only
 * len·cos a tall.
 */
export function plantDrop(q: number, swing: number, len: number): number {
  return len * (1 - Math.cos(swing * Math.sin(q)))
}

// ── Hop arc ──────────────────────────────────────────────────────────────────

export interface HopFrame {
  /** height above the floor */
  y: number
  /** vertical scale (crouch / landing squash < 1, stretch in the air > 1) */
  squash: number
  /** 0 on the ground, 1 at full stretch in the air */
  air: number
  /** −1 crouched (legs gathered) … 1 legs flung out behind */
  legs: number
  /** share of the hop's ground covered so far (0 → 1) */
  travel: number
}

/** Crouch, launch, landing squash and the rest pause, as shares of a hop cycle. */
export const HOP_SHAPE = { crouch: 0.16, land: 0.14 } as const

function smooth(x: number): number {
  const t = x <= 0 ? 0 : x >= 1 ? 1 : x
  return t * t * (3 - 2 * t)
}

/**
 * Where a hopper is at `u` ∈ [0, 1) of its hop cycle (writes into `out`):
 * it crouches, springs up an arc (stretched tall), squashes on landing, then
 * sits for the rest of the cycle.
 */
export function hopArc(u: number, hop: HopSpec, out: HopFrame): HopFrame {
  const c = HOP_SHAPE.crouch
  const a = hop.air
  const l = HOP_SHAPE.land
  const v = u - Math.floor(u)
  if (v < c) {
    // gather: sink and squash
    const k = Math.sin((v / c) * Math.PI * 0.5)
    out.y = 0
    out.squash = 1 - 0.14 * k
    out.air = 0
    out.legs = -k
    out.travel = 0
  } else if (v < c + a) {
    const s = (v - c) / a
    out.y = hop.height * Math.sin(s * Math.PI)
    out.squash = 1 + 0.1 * Math.sin(s * Math.PI)
    out.air = Math.sin(s * Math.PI)
    // legs fling back on take-off and gather again for the landing
    out.legs = Math.cos(s * Math.PI * 0.9) * 0.5 + 0.5 - s * 0.6
    out.travel = s
  } else if (v < c + a + l) {
    const s = (v - c - a) / l
    out.y = 0
    out.squash = 1 - 0.18 * Math.sin(s * Math.PI)
    out.air = 0
    out.legs = -0.6 * Math.sin(s * Math.PI)
    out.travel = 1
  } else {
    out.y = 0
    out.squash = 1
    out.air = 0
    out.legs = 0
    out.travel = 1
  }
  return out
}

/** Ground speed share during a hop cycle (1 while airborne, 0 otherwise), so the hopper never slides while sitting. */
export function hopMoving(u: number, hop: HopSpec): boolean {
  const v = u - Math.floor(u)
  return v >= HOP_SHAPE.crouch && v < HOP_SHAPE.crouch + hop.air
}

// ── Wings ────────────────────────────────────────────────────────────────────

/** What a pet's wings do this frame: `spread` 0 (at rest / folded) → 1 (open), and a stroke −1 (down) … 1 (up). */
export interface WingFrame {
  spread: number
  beat: number
}

/**
 * A bird's wings through one hop (`u`: the hop cycle, as `hopArc`): they lift
 * away from the body as it gathers to jump, open fully in the air with one
 * soft flap (up, then a downstroke) and settle back against the body on
 * landing, before the pause. Writes into `out`.
 */
export function hopWing(u: number, hop: HopSpec, out: WingFrame): WingFrame {
  const v = u - Math.floor(u)
  // the wing window: from halfway through the crouch to most of the way through the landing
  const a = HOP_SHAPE.crouch * 0.5
  const b = HOP_SHAPE.crouch + hop.air + HOP_SHAPE.land * 0.8
  if (v <= a || v >= b) {
    out.spread = 0
    out.beat = 0
    return out
  }
  const x = (v - a) / (b - a)
  out.spread = Math.pow(Math.sin(x * Math.PI), 0.7)
  out.beat = Math.sin(x * TAU) * out.spread
  return out
}

/** Strokes a dragon's wings make in one hop-glide (slow and few: it glides, it doesn't flap). */
export const GLIDE_STROKES = 1.5

/**
 * A dragon's wings through one hop-glide (`s`: 0 → 1 across it): they unfold
 * quickly on take-off, stay spread through the glide with `GLIDE_STROKES`
 * slow strokes (a downstroke first) and fold away again as it lands. Writes
 * into `out`.
 */
export function glideWing(s: number, out: WingFrame): WingFrame {
  if (s <= 0 || s >= 1) {
    out.spread = 0
    out.beat = 0
    return out
  }
  out.spread = smooth(s / 0.16) * smooth((1 - s) / 0.18)
  out.beat = -Math.sin(s * GLIDE_STROKES * TAU) * out.spread
  return out
}

// ── On show (lineups, celebrations) ──────────────────────────────────────────

/**
 * How a pet stands on show: four-legged pets turn `yaw` (rad) off the camera —
 * head-on they read as a thin stack — swaying `sway` either side of it, and
 * every `every` s look round at the camera for `turn` s (turning `toward` of
 * the way to face it).
 */
export const SHOW = { yaw: 0.8, sway: 0.1, every: 9, turn: 3.4, toward: 0.75 } as const

/** True when a pet stands at three-quarters on show (it walks on four legs). */
export function showsThreeQuarter(g: GaitProfile): boolean {
  return g.body === 'quad'
}

/**
 * Yaw (rad, + turns its face to the viewer's right) for a four-legged pet on
 * show `t` s in: a flattering three-quarter view with a slow sway, and now and
 * then a slow turn to look at the camera and back (late in each `SHOW.every`,
 * so it never starts on one).
 */
export function showYaw(t: number): number {
  const k = t / SHOW.every
  const into = (k - Math.floor(k)) * SHOW.every
  const from = SHOW.every - SHOW.turn
  const look = into > from ? Math.pow(Math.sin(((into - from) / SHOW.turn) * Math.PI), 2) : 0
  return SHOW.yaw * (1 - SHOW.toward * look) + SHOW.sway * Math.sin(t * 0.55) * (1 - look)
}

// ── Idles ────────────────────────────────────────────────────────────────────

/** Seconds standing still before the first idle, and the length of each idle beat. */
export const IDLE_SETTLE_S = 0.9
export const IDLE_BEAT_S = 2.8

/** A small integer hash → [0, 1). */
export function hash01(seed: number, k: number): number {
  let h = Math.imul((seed * 2654435761) ^ (k * 40503 + 0x9e3779b9), 0x85ebca6b) >>> 0
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35) >>> 0
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

export interface IdleNow {
  kind: IdleKind | null
  /** 0 → 1 envelope of the current beat (a settling idle holds at 1) */
  w: number
  /** 0 → 1 progress through the current beat */
  u: number
}

/**
 * Which idle a pet still for `stillFor` seconds is doing (writes into `out`).
 * It changes every `IDLE_BEAT_S`, picked by hashing the pet's `seed` with the
 * beat number, so pets don't idle in step. Once it picks a settling idle (lie
 * down / sit) it stays settled until it walks again. `calm` scenes (the
 * lineup, a celebration) never settle.
 */
export function idleAt(stillFor: number, seed: number, idles: readonly IdleKind[], calm: boolean, out: IdleNow): IdleNow {
  out.kind = null
  out.w = 0
  out.u = 0
  if (idles.length === 0 || stillFor < IDLE_SETTLE_S) return out
  const t = stillFor - IDLE_SETTLE_S
  const beat = Math.floor(t / IDLE_BEAT_S)
  const u = t / IDLE_BEAT_S - beat
  // the first settling beat, if one came up already (small loop, no allocation)
  for (let k = 0; k <= beat; k++) {
    const pick = idles[Math.floor(hash01(seed, k) * idles.length) % idles.length]
    if (!calm && isSettling(pick)) {
      out.kind = pick
      out.u = k === beat ? u : 1
      out.w = k === beat ? smooth(u / 0.35) : 1
      return out
    }
  }
  let pick = idles[Math.floor(hash01(seed, beat) * idles.length) % idles.length]
  if (calm && isSettling(pick)) pick = 'look'
  out.kind = pick
  out.u = u
  out.w = smooth(u / 0.2) * smooth((1 - u) / 0.2)
  return out
}

// ── Rig maths ────────────────────────────────────────────────────────────────

type V3 = readonly [number, number, number]

/**
 * How a model is re-posed as a pet (authored per creature and stage, in the
 * model's own units): the body tips forward about `pivot` (usually the hips)
 * by `pitch`, the whole pet shifts by `shift` (to stand its legs on the floor
 * and recentre it over its feet), and the head turns back up about `neck` so
 * the face looks ahead, raised by `headLift`.
 */
export interface PetRig {
  pivot: V3
  pitch: number
  shift?: V3
  neck: V3
  /** head raised (+y) and brought forward (+z) after the tip (units) */
  headLift?: number
  headFwd?: number
  /** head left a little tipped (+ looks down) instead of fully level */
  headPitch?: number
  /** tail raised (rad) from its authored angle (trex: out level) */
  tailLift?: number
  /** the arms become front legs (quadrupeds) */
  frontLegs?: boolean
  /** how far the whole pet sinks when it lies down / sits (units) */
  lie?: number
  /** hind / front feet moved along z (units), e.g. to tuck the hind legs under the rump */
  hindZ?: number
  frontZ?: number
}

/** A pet with no rig of its own stays upright (birds) — it still gets its gait and idles. */
export const UPRIGHT: PetRig = { pivot: [0, 0, 0], pitch: 0, neck: [0, 0.4, 0] }

/**
 * Where a point of the model's body ends up once tipped (about `pivot` by
 * `pitch`) and shifted, as [y, z] (x is unchanged). Writes into `out`.
 */
export function tipPoint(rig: PetRig, y: number, z: number, out: [number, number]): [number, number] {
  const c = Math.cos(rig.pitch)
  const s = Math.sin(rig.pitch)
  const dy = y - rig.pivot[1]
  const dz = z - rig.pivot[2]
  out[0] = rig.pivot[1] + dy * c - dz * s + (rig.shift?.[1] ?? 0)
  out[1] = rig.pivot[2] + dy * s + dz * c + (rig.shift?.[2] ?? 0)
  return out
}

/**
 * Length a limb must have to reach the floor from a joint at height `jointY`
 * (after the tip and shift), ending in a foot `footY` tall. Never shorter
 * than `min`.
 */
export function limbLength(jointY: number, footY: number, min = 0.02): number {
  return Math.max(min, jointY - footY)
}

/**
 * Rotation (rad) that splays a rigid limb of length `len` from a joint at
 * height `jointY` so its foot (`footY` tall) still rests on the floor — how a
 * lying pet stretches its legs out. 0 when it can stand straight.
 */
export function splayToFloor(jointY: number, footY: number, len: number): number {
  const k = (jointY - footY) / Math.max(1e-4, len)
  if (k >= 1) return 0
  return Math.acos(Math.max(-1, k))
}

// ── Per-frame pose ───────────────────────────────────────────────────────────

/** Everything the limbs read each frame: written by `stepPose`, mutated in place. */
export interface PetPose {
  /** this pet's own seed (idle picks, hop and glide timing) */
  seed: number
  /** seconds since mount (its own clock: idles run even when the walk signal is frozen) */
  clock: number
  /** seconds since it stopped walking */
  stillFor: number
  /** 0 → 1 eased walk blend (limbs swing in and out of the gait smoothly) */
  walk: number
  /** stride phase (rad) */
  q: number
  /** root: height, vertical squash, roll (rad) */
  /** the share of `y` that is the stride bob with the feet down (planted legs stretch to follow it) */
  bob: number
  y: number
  squash: number
  roll: number
  /** extra body pitch (rad, + forward) */
  pitch: number
  /** head: nod (rad, + down), yaw (rad) */
  nod: number
  yaw: number
  /** 0 → 1 lying down / settled */
  lie: number
  /** 0 → 1 sniffing (head down, nose twitch) */
  sniff: number
  /** tail: extra wag (0 → 1) */
  wag: number
  /** hop legs: −1 gathered … 1 flung back */
  legs: number
  /** 0 → 1 airborne (hops, glides) */
  air: number
  /** wing flap strength 0 → 1 */
  flap: number
  /** wings spread / lifted away from the body: 0 → 1 (birds' hops, dragons' glides) */
  wing: number
  /** the wings' stroke: −1 (down) … 1 (up), already scaled by `wing` */
  beat: number
  /** the hop/glide is carrying it forward this frame (hoppers only move then) */
  advancing: boolean
}

export function newPetPose(seed: number): PetPose {
  return {
    seed,
    clock: 0,
    stillFor: 0,
    walk: 0,
    q: 0,
    y: 0,
    bob: 0,
    squash: 1,
    roll: 0,
    pitch: 0,
    nod: 0,
    yaw: 0,
    lie: 0,
    sniff: 0,
    wag: 0,
    legs: 0,
    air: 0,
    flap: 0,
    wing: 0,
    beat: 0,
    advancing: false,
  }
}

function approach(cur: number, target: number, rate: number, dt: number): number {
  return cur + (target - cur) * (1 - Math.exp(-rate * dt))
}

// reused by `stepPose`
const _hop: HopFrame = { y: 0, squash: 1, air: 0, legs: 0, travel: 0 }
const _idle: IdleNow = { kind: null, w: 0, u: 0 }
const _wing: WingFrame = { spread: 0, beat: 0 }

/**
 * Advance a pet's pose by `dt` seconds. `t` is the pet's walk clock (its
 * walk state's `t`), `moving` whether it is walking. `calm`: no lying down
 * (lineups, celebrations). Allocation-free.
 */
export function stepPose(
  pose: PetPose,
  g: GaitProfile,
  tempo: StageTempo,
  t: number,
  moving: boolean,
  dt: number,
  calm: boolean,
  instant = false,
): PetPose {
  pose.clock += dt
  pose.stillFor = moving ? 0 : pose.stillFor + dt
  pose.walk = instant ? (moving ? 1 : 0) : approach(pose.walk, moving ? 1 : 0, moving ? 7 : 5, dt)
  const w = pose.walk
  const size = tempo.size
  const period = cyclePeriod(g, tempo)
  // stride phase straight from the walk clock (offset by the seed, so pets don't march in step)
  const cyc = t / period + pose.seed
  pose.q = (cyc - Math.floor(cyc)) * TAU
  const q = pose.q

  // ── the gait ──
  let y: number
  let squash = 1
  let roll = 0
  let pitch = 0
  let nod = 0
  let legs = 0
  let air = 0
  let flap = 0
  let wing = 0
  let beat = 0
  pose.advancing = moving
  switch (g.kind) {
    case 'hop':
    case 'hopWaddle': {
      const hop = g.hop!
      hopArc(cyc, hop, _hop)
      y = _hop.y * size * w
      squash = 1 + (_hop.squash - 1) * w
      legs = _hop.legs * w
      air = _hop.air * w
      pitch = (g.kind === 'hop' ? -0.25 * _hop.air + 0.12 * Math.max(0, -_hop.legs) : g.lean * (0.3 + 0.7 * _hop.air)) * w
      // (only once the hop is really under way: a hop it eases into mid-air carries it nowhere)
      pose.advancing = moving && hopMoving(cyc, hop) && w > 0.5
      if (g.kind === 'hopWaddle') {
        // waddle: tip toward the foot it lands on, a hop each side
        const side = Math.floor(cyc) % 2 === 0 ? 1 : -1
        roll = side * g.roll * Math.sin((cyc - Math.floor(cyc)) * Math.PI) * w
        // head bob: it dips as the body gathers and lands, and comes up in the air
        nod = g.nod * (1.3 * Math.max(0, -_hop.legs) - 0.6 * _hop.air) * w
        flap = g.flutter * _hop.air * w
        // the wings lift away on each hop, flap once and settle on landing
        hopWing(cyc, hop, _wing)
        wing = g.flutter * _wing.spread * w
        beat = g.flutter * _wing.beat * w
      }
      break
    }
    case 'glide': {
      // no steps: a slow swell, leaning into the glide
      y = (g.bob * (0.5 + 0.5 * Math.sin(q)) * w + 0.012 * Math.sin(pose.clock * 1.7 + pose.seed * 9)) * size
      squash = 1 + 0.035 * Math.sin(q + 0.6) * w
      pitch = 0.12 * w
      roll = 0.03 * Math.sin(q * 0.5) * w
      break
    }
    case 'stomp': {
      // the body jolts down as each foot lands (at the ends of its swing)
      const s = Math.abs(Math.sin(q))
      y = -g.stomp * Math.pow(s, 6) * size * w
      roll = g.roll * Math.sin(q) * w
      nod = g.nod * Math.pow(s, 6) * w
      break
    }
    case 'trot':
    case 'lumber':
    default: {
      y = g.bob * Math.abs(Math.cos(q)) * size * w
      nod = g.nod * Math.sin(2 * q) * w
      roll = g.roll * Math.sin(q) * w
      break
    }
  }

  const stepY = y

  // ── an occasional hop-glide (dragons) ──
  if (g.glide && w > 0.01) {
    const gl = g.glide
    const k = t / gl.every + pose.seed * 0.37
    const into = (k - Math.floor(k)) * gl.every
    if (into < gl.dur) {
      const s = into / gl.dur
      const arc = Math.sin(s * Math.PI)
      y += gl.height * size * arc * w
      air = Math.max(air, arc * w)
      flap = Math.max(flap, g.flutter * Math.min(1, arc * 2.5) * w)
      // wings spread wide and nearly level, with a slow stroke or two (see `glideWing`)
      glideWing(s, _wing)
      wing = Math.max(wing, g.flutter * _wing.spread * w)
      beat = g.flutter * _wing.beat * w
      pitch -= 0.12 * arc * w
    }
  }

  // ── idles ──
  idleAt(pose.stillFor, Math.floor(pose.seed * 1000), g.idles, calm, _idle)
  const iw = moving ? 0 : _idle.w
  const ik = _idle.kind
  const settled = ik !== null && isSettling(ik) ? iw : 0
  pose.lie = instant ? settled : approach(pose.lie, settled, settled > pose.lie ? 3 : 6, dt)
  pose.sniff = approach(pose.sniff, ik === 'sniff' ? iw : 0, 6, dt)
  pose.wag = approach(pose.wag, ik === 'wag' ? iw : 0, 6, dt)
  // looking around: turn one way then the other across the beat
  const lookTo = ik === 'look' ? iw * 0.55 * Math.sin(_idle.u * TAU) : 0
  pose.yaw = approach(pose.yaw, lookTo, 4, dt)
  // a sniff twitches the nose; a little breathing nod always
  nod += pose.sniff * (0.32 + 0.05 * Math.sin(pose.clock * 17)) + 0.02 * Math.sin(pose.clock * 2.1 + pose.seed * 7) * (1 - w)
  if (ik === 'hopInPlace' && !moving) {
    const h = Math.max(0, Math.sin(_idle.u * Math.PI * 4)) * iw
    y += 0.06 * size * h
    air = Math.max(air, h)
    flap = Math.max(flap, g.flutter * h)
    wing = Math.max(wing, g.flutter * h)
  }

  pose.bob = g.kind === 'trot' || g.kind === 'lumber' || g.kind === 'stomp' ? stepY : 0
  pose.y = y
  pose.squash = squash
  pose.roll = roll
  pose.pitch = pitch
  pose.nod = nod
  pose.legs = legs
  pose.air = air
  pose.flap = flap
  pose.wing = wing
  pose.beat = beat
  return pose
}

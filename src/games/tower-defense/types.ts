import type { PatrolPlan, PuddleValue, RuleId } from '../../lib/puddle'

/**
 * Puddle Patrol's simulation state (engine.ts). Plain data, mutated in place
 * by fixed-timestep ticks; the renderer only reads it (and drains `events`).
 * World units, on the ground plane: x to the right, z toward the camera.
 */

export interface Vec2 {
  x: number
  z: number
}

/** A place a sprinkler can stand, with the stretches of path its spray reaches. */
export interface Slot {
  id: number
  pos: Vec2
  /** Path distance ranges [from, to] within reach (a slot between two rows reaches both). */
  reach: [number, number][]
}

export interface FieldLayout {
  /** The path, sampled densely (mud pit first, the pond last). */
  path: Vec2[]
  /** Cumulative distance at each path sample. */
  dist: number[]
  length: number
  slots: Slot[]
  /** How far a sprinkler's spray reaches (world units). */
  range: number
  pond: Vec2
  pit: Vec2
}

/** A band's pace and economy (config.ts `TUNING`). */
export interface Tuning {
  /** Pudding walking speed (units / s). */
  speed: number
  /** Seconds between two sprays of one tower. */
  reload: number
  /** Seconds a spray is in the air. */
  flight: number
  /** Drops at the start (enough for `startTowers` towers). */
  startDrops: number
  /** What a sprinkler costs (the first `freeTowers` are already paid for by the start drops). */
  cost: number
  /** Drops a wash earns. */
  washReward: number
  /** Most towers on the field at once (= slots used). */
  maxTowers: number
}

export interface Tower {
  slot: number
  rule: RuleId
  /** Seconds until it can spray again. */
  cooldown: number
  /** Total Puddings it has washed (the tower's own little score). */
  washed: number
}

export type PuddingState = 'walk' | 'washed' | 'leaked'

export interface Pudding {
  id: number
  value: PuddleValue
  /** Distance walked along the path. */
  s: number
  state: PuddingState
  /** Slots whose (wrong) spray already bounced off it: one try per tower. */
  bounced: number
  /** A washing spray is on its way (no second tower spends one on it). */
  incoming: boolean
  /** Its wave (0-based). */
  wave: number
}

export interface Shot {
  id: number
  slot: number
  target: number
  /** Washes (fits the tower's rule) or bounces off. */
  fits: boolean
  /** Seconds in the air so far. */
  t: number
}

/** What happened this tick, for the renderer's juice and the game's voice (drained each frame). */
export type PatrolEvent =
  | { kind: 'spawn'; id: number }
  | { kind: 'spray'; slot: number; id: number; fits: boolean }
  | { kind: 'wash'; slot: number; id: number; at: Vec2; drops: number; value: PuddleValue }
  | { kind: 'bounce'; slot: number; id: number; at: Vec2; value: PuddleValue }
  | { kind: 'leak'; id: number; at: Vec2; value: PuddleValue }
  | { kind: 'waveStart'; wave: number }
  | { kind: 'waveEnd'; wave: number; washed: number; leaked: number }
  | { kind: 'done' }

export type PatrolPhase = 'plan' | 'wave' | 'done'

export interface WaveTally {
  washed: number
  leaked: number
  total: number
}

export interface PatrolState {
  plan: PatrolPlan
  layout: FieldLayout
  tuning: Tuning
  phase: PatrolPhase
  /** The wave being played, or (planning) the next one. */
  wave: number
  /** Seconds since the current wave started. */
  waveT: number
  /** Puddings of the current wave spawned so far. */
  spawned: number
  /** Total simulated seconds (only while a wave runs). */
  t: number
  /** Seconds left over below one tick (`advance`). */
  acc: number
  towers: (Tower | null)[]
  /** Towers ever bought (the tray's price goes up with each). */
  built: number
  drops: number
  puddings: Pudding[]
  shots: Shot[]
  nextId: number
  tallies: WaveTally[]
  events: PatrolEvent[]
}

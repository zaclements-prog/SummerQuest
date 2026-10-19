import { CREATURES } from '../lib/home/catalog'
import type { OpSetId } from '../lib/gates'

/**
 * Critter Parade's world layout. The parade marches toward −z: the leader
 * stands at (leaderX, 0, −dist) and the crowd trails behind it (+z). Track
 * distances come from the pure plan (src/lib/parade/plan.ts `TRACK`).
 */

/** Half the walkable track width; the two gates of a pair share it. */
export const TRACK_HALF = 4.3
/** Centre of each gate's lane. */
export const LANE_X = 2.15
/** How far the leader may steer. */
export const STEER_MAX = 3.4
/** Width of one gate opening. */
export const GATE_W = 3.7

/** Recycled corridor segments. */
export const SEGMENT_LEN = 24
export const SEGMENTS = 6

/** Followers drawn at most (the true count is on the badge). */
export const CROWD_MAX = 150
/** Extra slots for critters waiting in a counting cage. */
export const CAGE_MAX = 12
/** Ghost-parade bodies at most. */
export const GHOST_MAX = 60
/** Grumble Gang bodies at most. */
export const GANG_MAX = 60

/**
 * Bodies shown by graphics setting: Pretty shows the full crowds; Fast (every
 * tablet's start) trims them so a big crowd plus the scenery stays near the
 * ~200k triangles the World already runs at on a Fire HD 8.
 */
export function crowdCaps(low: boolean): { crowd: number; ghost: number; gang: number } {
  return low ? { crowd: 110, ghost: 40, gang: 40 } : { crowd: CROWD_MAX, ghost: GHOST_MAX, gang: GANG_MAX }
}

/** Baby critters are scaled up a little so a crowd reads on a tablet. */
export const BABY_SCALE = 1.45
export const GRUMP_SCALE = 1.05

/** March speed (world units / s) by band: decisions ≥ ~5 s apart for grades 2–3. */
export function marchSpeed(opSet: OpSetId): number {
  if (opSet === 'addSub') return 4.6
  if (opSet === 'mulAdd' || opSet === 'divSub') return 5.4
  return 6.2
}

/** Where the K–1 parade stops to ask, before a gate pair. */
export const ASK_BEFORE = 9

/**
 * The camera: behind and above the parade, looking a little past the leader,
 * so the crowd fills the lower screen, the leader stands just under the middle
 * and the next gates come up above it. It pulls back as the crowd grows.
 */
export const CAM = {
  /** height and distance behind the leader (plus 0.9 and 3 per unit of crowd depth) */
  offset: [0, 5.2, 7.5] as const,
  /** look this far past the leader (plus 0.4 per unit of crowd depth) */
  look: [0, 0.4, 2.6] as const,
  fov: 50,
  /** Portrait screens pull the camera back so both gates stay on screen. */
  portraitPull: 1.55,
}

/** Gate colours: two different ones per pair, drawn at random (sides and colours tell nothing). */
export const GATE_COLORS = ['#3d9df2', '#f2766b', '#22b07d', '#a27cf0', '#ff9d2e', '#e85aa8', '#18a9b8']

/** The follower species, baby-first order: the player's own creature leads the crowd. */
export function speciesOrder(active: string | null): string[] {
  const ids = CREATURES.map((c) => c.id)
  // a fixed shuffle so neighbours in the parade differ
  const mixed = [5, 2, 9, 0, 7, 3, 11, 1, 8, 4, 10, 6].map((i) => ids[i])
  return active && ids.includes(active) ? [active, ...mixed.filter((x) => x !== active)] : mixed
}

/** Zone flavour for the track: Mesa (warm terracotta) or Dunes (sand). */
export const THEME = {
  mul: { path: '#f1d9a6', edge: '#e2b878', ground: '#9fd88a', far: '#e9a66b', accent: '#d9774f' },
  div: { path: '#f9ebc6', edge: '#dcb97a', ground: '#ecd59a', far: '#f2d293', accent: '#e8a54b' },
} as const

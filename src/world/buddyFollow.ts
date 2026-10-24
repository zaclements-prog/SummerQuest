/**
 * How the buddy pet follows you in the World: the pure parts (no React, no
 * three), so they can be tested. Everything mutates the body in place: the
 * World calls `followStep` every frame and must not allocate.
 */

export const BUDDY = {
  /** It keeps about this far behind you. */
  follow: 1.2,
  /** Further behind than this and it pops back next to you… */
  popDist: 6,
  /** …or when it has been stuck (a wall between you) this long (s). */
  stuckS: 1,
  /** Body radius for the leading-edge probe (a pet is smaller than you). */
  radius: 0.25,
  /** Top trotting speed (you walk at 3)… */
  trotMax: 4.2,
  /** …and how much faster it goes per metre behind. */
  catchUp: 4,
  /**
   * A hopper's catch-up per metre behind: gentler, so each leap carries it
   * along through the whole hop instead of lunging at the start of it.
   */
  hopCatchUp: 1.8,
} as const

export interface BuddyBody {
  x: number
  z: number
  /** Facing (rotation.y). */
  yaw: number
  /** It moved this frame (its legs walk). */
  moving: boolean
  /** Seconds spent making (almost) no headway. */
  stuck: number
}

/**
 * A buddy whose gait hops (the frog, the birds): it only covers ground while
 * it is in the air. Mutated in place each frame (no allocation).
 */
export interface HopFollow {
  /** share of its hop cycle spent in the air (see `HopSpec.air`) */
  air: number
  /** its hop is carrying it forward this frame (the pet's `WalkState.advancing`) */
  advancing: boolean
}

/** Its pace (units/s) when it is `behind` units further back than it likes to be: quicker the further behind. */
export function trotSpeed(behind: number): number {
  return Math.min(BUDDY.trotMax, 0.8 + behind * BUDDY.catchUp)
}

/**
 * A hopper's ground speed in the air (units/s), `behind` units further back
 * than it likes to be: its average pace (at most the trot's) over the share of
 * the hop cycle it spends airborne, so the further behind, the longer the leap.
 */
export function leapSpeed(behind: number, air: number): number {
  return Math.min(BUDDY.trotMax, 0.8 + behind * BUDDY.hopCatchUp) / Math.max(0.05, air)
}

/** True when the World blocks the point (x, z) (see `collidesAt`). */
export type Blocked = (x: number, z: number) => boolean

/** Its whole body fits at (x, z): the centre and four points a radius out. */
function fits(blocked: Blocked, x: number, z: number): boolean {
  const r = BUDDY.radius
  return !blocked(x, z) && !blocked(x + r, z) && !blocked(x - r, z) && !blocked(x, z + r) && !blocked(x, z - r)
}

/**
 * Put the buddy `follow` away from the player at (px, pz): on the side of
 * (fx, fz) if it fits there, else the nearest side that does (eight tries
 * around), else right on the player (where it's always walkable). It faces you.
 */
export function placeBuddy(b: BuddyBody, px: number, pz: number, fx: number, fz: number, blocked: Blocked): void {
  const base = Math.atan2(fx - px, fz - pz)
  for (let k = 0; k < 8; k++) {
    const a = base + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 4)
    const x = px + Math.sin(a) * BUDDY.follow
    const z = pz + Math.cos(a) * BUDDY.follow
    if (fits(blocked, x, z)) {
      b.x = x
      b.z = z
      b.yaw = Math.atan2(px - x, pz - z)
      b.stuck = 0
      b.moving = false
      return
    }
  }
  b.x = px
  b.z = pz
  b.stuck = 0
  b.moving = false
}

/**
 * One frame of following the player at (px, pz) for `dt` seconds: trot toward
 * them (faster the further behind), stop `follow` away, slide along walls the
 * way you do, and turn smoothly toward where it's going (toward you while it
 * waits). Returns true when it popped back beside you instead (too far behind,
 * or stuck behind something).
 *
 * A hopper (`hop`) never slides: it only moves while airborne (`leapSpeed`:
 * longer leaps the further behind it is), and `moving` stays on until the
 * hop in progress lands. Its `stuck` time only counts while it tries to move.
 */
export function followStep(b: BuddyBody, px: number, pz: number, dt: number, blocked: Blocked, hop?: HopFollow): boolean {
  let dx = px - b.x
  let dz = pz - b.z
  let dist = Math.hypot(dx, dz)
  if (dist > BUDDY.popDist || b.stuck > BUDDY.stuckS) {
    placeBuddy(b, px, pz, b.x, b.z, blocked)
    return true
  }
  let moving = false
  const behind = dist - BUDDY.follow
  // a hopper keeps hopping while it's behind, and lands the hop it is in before it stops…
  if (hop) moving = behind > 0.05 || hop.advancing
  // …but only covers ground in the air
  const go = hop ? hop.advancing && behind > 0 : behind > 0.05
  if (go) {
    const pace = hop ? leapSpeed(behind, hop.air) : trotSpeed(behind)
    const step = Math.min(pace * dt, behind)
    const ox = b.x
    const oz = b.z
    // axis-separated sub-steps, each probing the leading edge: it slides along walls
    const n = Math.max(1, Math.ceil(step / 0.1))
    const sx = ((dx / dist) * step) / n
    const sz = ((dz / dist) * step) / n
    const ex = Math.sign(sx) * BUDDY.radius
    const ez = Math.sign(sz) * BUDDY.radius
    for (let i = 0; i < n; i++) {
      if (!blocked(b.x + sx + ex, b.z)) b.x += sx
      if (!blocked(b.x, b.z + sz + ez)) b.z += sz
    }
    const moved = Math.hypot(b.x - ox, b.z - oz)
    // (a hopper keeps hopping at a wall, and pops round it once stuck; a walker's legs stop)
    if (!hop) moving = moved > step * 0.2
    b.stuck = moved < step * 0.25 ? b.stuck + dt : 0
    dx = px - b.x
    dz = pz - b.z
    dist = Math.hypot(dx, dz)
  } else if (!moving) {
    // (a hopper waiting on the ground for its next hop keeps its stuck time)
    b.stuck = 0
  }
  b.moving = moving
  // turn the short way round
  if (dist > 1e-3) {
    let turn = Math.atan2(dx, dz) - b.yaw
    turn = Math.atan2(Math.sin(turn), Math.cos(turn))
    b.yaw += turn * Math.min(1, dt * (moving ? 12 : 4))
  }
  return false
}

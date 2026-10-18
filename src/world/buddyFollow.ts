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
 */
export function followStep(b: BuddyBody, px: number, pz: number, dt: number, blocked: Blocked): boolean {
  let dx = px - b.x
  let dz = pz - b.z
  let dist = Math.hypot(dx, dz)
  if (dist > BUDDY.popDist || b.stuck > BUDDY.stuckS) {
    placeBuddy(b, px, pz, b.x, b.z, blocked)
    return true
  }
  let moving = false
  if (dist > BUDDY.follow + 0.05) {
    const speed = Math.min(BUDDY.trotMax, 0.8 + (dist - BUDDY.follow) * BUDDY.catchUp)
    const step = Math.min(speed * dt, dist - BUDDY.follow)
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
    moving = moved > step * 0.2
    b.stuck = moved < step * 0.25 ? b.stuck + dt : 0
    dx = px - b.x
    dz = pz - b.z
    dist = Math.hypot(dx, dz)
  } else {
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

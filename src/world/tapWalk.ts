import { walkStep } from './collision'

/**
 * Tap / click-to-walk: the pure parts (no React, no three), shared by every
 * scene that uses `useWanderWalk` (the World, and the 3D mini-games).
 *
 * The walkable ground is the flat plane y = 0 everywhere the avatar walks, so a
 * tap is turned into a target by intersecting the camera ray with that plane;
 * the avatar then walks toward it with the same collision (slide along walls)
 * as keyboard walking.
 */

/** Closer than this to the target counts as arrived. */
export const TAP_ARRIVE = 0.12
/** Making (almost) no progress toward the target for this long means blocked. */
export const TAP_STUCK_SECONDS = 0.35
/** A frame "makes progress" when it closes at least this share of the intended step. */
const PROGRESS_SHARE = 0.25
/** Ignore ground hits further than this along the ray (near-horizon taps). */
const MAX_RAY = 400

/**
 * Where a ray from (ox,oy,oz) along (dx,dy,dz) meets the ground plane y = 0, or
 * null when it never does (pointing up / parallel, or absurdly far away).
 */
export function groundHit(
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
): [number, number] | null {
  if (dy > -1e-6) return null
  const t = -oy / dy
  if (t < 0) return null
  const len = Math.hypot(dx, dy, dz)
  if (t * len > MAX_RAY) return null
  return [ox + dx * t, oz + dz * t]
}

export interface TapFrame {
  x: number
  z: number
  /** The body actually moved this frame. */
  moving: boolean
  /** Facing (rotation.y) toward the target, or null to keep the current one. */
  facing: number | null
  /** Seconds spent (nearly) not getting closer, carried to the next frame. */
  stuck: number
  /** Why the walk is over this frame (null = keep walking). */
  done: 'arrived' | 'blocked' | null
}

/**
 * One frame of walking from (x,z) toward the tap target (tx,tz) at `speed`
 * units/s for `dt` seconds. Uses `walkStep`, so the body (of `radius`) slides
 * along obstacles exactly like keyboard walking and stays within ±bound. It
 * never overshoots the target; it reports `blocked` once it has made almost no
 * progress for TAP_STUCK_SECONDS (pass the previous frame's `stuck` back in).
 */
export function tapWalkFrame(
  x: number, z: number,
  tx: number, tz: number,
  stuck: number,
  speed: number, dt: number,
  blocked: (px: number, pz: number, fromX: number, fromZ: number) => boolean,
  radius: number, bound: number,
): TapFrame {
  const dist = Math.hypot(tx - x, tz - z)
  if (dist <= TAP_ARRIVE) return { x, z, moving: false, facing: null, stuck: 0, done: 'arrived' }
  const ux = (tx - x) / dist
  const uz = (tz - z) / dist
  const step = Math.min(speed * dt, dist)
  const moved = walkStep(x, z, ux * step, uz * step, blocked, radius, bound)
  const left = Math.hypot(tx - moved.x, tz - moved.z)
  const movedAny = moved.x !== x || moved.z !== z
  const progress = dist - left
  const nextStuck = progress < step * PROGRESS_SHARE ? stuck + dt : 0
  return {
    x: moved.x,
    z: moved.z,
    moving: movedAny,
    facing: movedAny ? Math.atan2(ux, uz) : null,
    stuck: nextStuck,
    done: left <= TAP_ARRIVE ? 'arrived' : nextStuck >= TAP_STUCK_SECONDS ? 'blocked' : null,
  }
}

/** Keys that walk (WASD and the arrow keys), mapped to a direction. */
export function walkKey(key: string): 'w' | 'a' | 's' | 'd' | null {
  switch (key.toLowerCase()) {
    case 'w': case 'arrowup': return 'w'
    case 'a': case 'arrowleft': return 'a'
    case 's': case 'arrowdown': return 's'
    case 'd': case 'arrowright': return 'd'
    default: return null
  }
}

/** How far (CSS px) a press may travel and still count as a tap, by pointer type. */
export const TAP_SLOP_PX = { mouse: 5, touch: 12, pen: 12 } as const

/**
 * Tap-only walking (Home, where a one-finger drag orbits the camera): does a
 * press that travelled `travelPx` before lifting count as a tap? Never while
 * another finger joined it (a pinch or two-finger pan).
 */
export function isWalkTap(travelPx: number, pointerType: string, multiTouch: boolean): boolean {
  if (multiTouch) return false
  const slop = pointerType === 'mouse' ? TAP_SLOP_PX.mouse : TAP_SLOP_PX.touch
  return travelPx <= slop
}

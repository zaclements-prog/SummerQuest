import type { Collider } from './worldLayout'

/** True when a disc of `radius` at (x,z) overlaps any collider. */
export function collidesAt(colliders: Collider[], x: number, z: number, radius: number): boolean {
  for (const c of colliders) {
    if (c.kind === 'box') {
      const hx = c.w / 2 + radius
      const hz = c.d / 2 + radius
      if (Math.abs(x - c.cx) <= hx && Math.abs(z - c.cz) <= hz) return true
    } else {
      const dx = x - c.cx
      const dz = z - c.cz
      const rr = c.r + radius
      if (dx * dx + dz * dz <= rr * rr) return true
    }
  }
  return false
}

export interface Footprint { cx: number; cz: number; w: number; d: number }

/** True when (x,z) is within the footprint shrunk by `margin` (so "inside" the walls). */
export function insideFootprint(fp: Footprint, x: number, z: number, margin: number): boolean {
  return Math.abs(x - fp.cx) <= fp.w / 2 - margin && Math.abs(z - fp.cz) <= fp.d / 2 - margin
}

/** Axis-separated step: advance each axis only if its destination is clear. */
export function slideMove(
  x: number, z: number, dx: number, dz: number,
  collide: (x: number, z: number) => boolean,
): { x: number; z: number } {
  let nx = x
  let nz = z
  if (!collide(x + dx, z)) nx = x + dx
  if (!collide(nx, z + dz)) nz = z + dz
  return { x: nx, z: nz }
}

/**
 * Longest frame (seconds) the walk integrates at once. A slow frame, or the first
 * frame after a hidden tab comes back (dt = the whole hidden time), must not fling
 * the avatar across the room.
 */
export const MAX_WALK_DT = 0.05

/**
 * Move a body of `radius` centred at (x,z) by (dx,dz), sliding along obstacles.
 * Each axis advances only if the point `radius` ahead on that axis is clear, and
 * the move is split into sub-steps of at most radius/2 (min 0.05) so no step can skip
 * over a thin wall. Positions stay within [-bound, bound]. `blocked` receives the
 * probe point and the body's current centre.
 */
export function walkStep(
  x: number, z: number, dx: number, dz: number,
  blocked: (px: number, pz: number, fromX: number, fromZ: number) => boolean,
  radius: number, bound: number,
): { x: number; z: number } {
  const clamp = (v: number) => Math.max(-bound, Math.min(bound, v))
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / Math.max(radius / 2, 0.05)))
  const sx = dx / n
  const sz = dz / n
  const ox = Math.sign(dx) * radius
  const oz = Math.sign(dz) * radius
  for (let i = 0; i < n; i++) {
    const nx = clamp(x + sx)
    if (!blocked(nx + ox, z, x, z)) x = nx
    const nz = clamp(z + sz)
    if (!blocked(x, nz + oz, x, z)) z = nz
  }
  return { x, z }
}

/** With a fixed iso camera looking toward (-x,-z), the +x and +z walls face the camera. */
export function frontFacingWalls(): ('px' | 'pz')[] {
  return ['px', 'pz']
}

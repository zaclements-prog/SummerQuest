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

/** With a fixed iso camera looking toward (-x,-z), the +x and +z walls face the camera. */
export function frontFacingWalls(): ('px' | 'pz')[] {
  return ['px', 'pz']
}

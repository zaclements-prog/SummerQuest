import type { Vec3 } from '../_juice/juice'

/**
 * The local frame a mini-game set is laid out in: turned to face the iso
 * camera (yaw π/4, like Multiplication Mesa's arrays), so local +x runs across
 * the screen to the right and local +z comes toward the viewer. Sets render
 * inside `<group rotation={[0, ISO_YAW, 0]}>`; the avatar walks in WORLD space
 * (the shared walk is camera-relative), so cross between the two with these.
 */
export const ISO_YAW = Math.PI / 4
const C = Math.cos(ISO_YAW)
const S = Math.sin(ISO_YAW)

/** local (x, z) → world (x, z) */
export function toWorld(lx: number, lz: number): [number, number] {
  return [lx * C + lz * S, -lx * S + lz * C]
}
/** world (x, z) → local (x, z) */
export function toLocal(wx: number, wz: number): [number, number] {
  return [wx * C - wz * S, wx * S + wz * C]
}
/** Allocation-free halves of `toLocal`, for frame loops. */
export function localX(wx: number, wz: number): number {
  return wx * C - wz * S
}
export function localZ(wx: number, wz: number): number {
  return wx * S + wz * C
}
/** Allocation-free halves of `toWorld`, for frame loops. */
export function worldX(lx: number, lz: number): number {
  return lx * C + lz * S
}
export function worldZ(lx: number, lz: number): number {
  return -lx * S + lz * C
}
/** A juice position (world) from a local point. */
export function wpos(lx: number, y: number, lz: number): Vec3 {
  const [x, z] = toWorld(lx, lz)
  return [x, y, z]
}

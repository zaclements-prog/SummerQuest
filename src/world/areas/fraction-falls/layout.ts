/**
 * Fraction Falls placement, shared by the area renderer and its colliders (kept
 * free of imports so worldLayout.ts can load the colliders without a cycle).
 *
 * The falls are built in a local frame: local +z points out of the cliff face
 * toward the pool (and the camera), local +x runs across the face.
 */
export const FALLS = { x: -26.1, z: -17.5, yaw: Math.PI / 4 }

/** Local falls coordinates (x across the face, z out of it) → world (x, z). */
export function fallsToWorld(lx: number, lz: number): [number, number] {
  const c = Math.cos(FALLS.yaw)
  const s = Math.sin(FALLS.yaw)
  return [FALLS.x + lx * c + lz * s, FALLS.z - lx * s + lz * c]
}

/** The plunge pool at the river's source (local frame of the falls). */
export const POOL_LOCAL = { x: 0, z: 3.5, r: 2.8 }
export const POOL = (() => {
  const [x, z] = fallsToWorld(POOL_LOCAL.x, POOL_LOCAL.z)
  return { x, z, r: POOL_LOCAL.r }
})()

/** Wet rocks around the pool and on the bank (world x, z, size). `solid` ones get colliders. */
export const WET_ROCKS: { x: number; z: number; s: number; solid: boolean }[] = [
  { x: -21.2, z: -12.9, s: 0.45, solid: true },
  { x: -25.9, z: -12.6, s: 0.6, solid: true },
  { x: -26.6, z: -13.9, s: 0.42, solid: true },
  { x: -20.3, z: -13.1, s: 0.32, solid: true },
  { x: -24.6, z: -12.0, s: 0.3, solid: true },
]

/** Signpost and lamp beside the NPC (world x, z). */
export const SIGN = { x: -21.6, z: -8.6 }
export const LAMP = { x: -18.7, z: -10.4 }

/** The beaver's woodpile: a gnawed stump and two stacked logs (world x, z). */
export const STUMP = { x: -21.1, z: -7.4 }
export const LOGS = { x: -17.8, z: -11.6, rot: 0.5, length: 1.5 }

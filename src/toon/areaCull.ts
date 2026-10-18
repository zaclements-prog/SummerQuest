import { Frustum, Matrix4, Sphere } from 'three'
import type { Camera } from 'three'

/** Area culling tuning (see StaticBatch's `cull`). */
export const AREA_CULL = {
  /** World units added around an area's bounds: shadows it casts, NPCs wandering past its edge. */
  margin: 6,
  /** How often a shown area re-measures its bounds (ms): props load in, NPCs wander. */
  boundsMs: 4000,
} as const

const _frustum = new Frustum()
const _pv = new Matrix4()
const _test = new Sphere()

/**
 * Is a sphere (inflated by `margin`) inside the camera's view? Pure, for tests: the
 * camera's matrices must be current (the renderer updates them before useFrame runs
 * the next frame; a stale frame is fine, the margin covers it).
 */
export function sphereInView(camera: Camera, sphere: Sphere, margin: number): boolean {
  _pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
  _frustum.setFromProjectionMatrix(_pv)
  _test.center.copy(sphere.center)
  _test.radius = sphere.radius + margin
  return _frustum.intersectsSphere(_test)
}

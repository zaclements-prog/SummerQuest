import { Color, Euler, Matrix4, Quaternion, Vector3 } from 'three'
import type { ColorRepresentation, InstancedMesh } from 'three'

export type V3 = [number, number, number]

/** One instance of a batched shape: position, Euler rotation, uniform or xyz scale, tint. */
export interface Part {
  p: V3
  r?: V3
  s?: number | V3
  c?: ColorRepresentation
}

// Scratch objects: reused for every write, so animating instances never allocates.
const _m = new Matrix4()
const _q = new Quaternion()
const _e = new Euler()
const _p = new Vector3()
const _s = new Vector3()
const _c = new Color()

/** Write instance `i`'s transform (and optionally its color) without allocating. */
export function setInstance(
  mesh: InstancedMesh,
  i: number,
  x: number, y: number, z: number,
  rx: number, ry: number, rz: number,
  sx: number, sy: number, sz: number,
  color?: ColorRepresentation,
): void {
  _p.set(x, y, z)
  _q.setFromEuler(_e.set(rx, ry, rz))
  _s.set(sx, sy, sz)
  mesh.setMatrixAt(i, _m.compose(_p, _q, _s))
  if (color != null) mesh.setColorAt(i, _c.set(color))
}

/** Write a whole `Part` list into an instanced mesh. */
export function writeParts(mesh: InstancedMesh, items: Part[], fallback: ColorRepresentation = '#ffffff'): void {
  const tinted = items.some((it) => it.c != null)
  items.forEach((it, i) => {
    const s = it.s ?? 1
    const [sx, sy, sz] = typeof s === 'number' ? [s, s, s] : s
    const r = it.r ?? [0, 0, 0]
    setInstance(mesh, i, it.p[0], it.p[1], it.p[2], r[0], r[1], r[2], sx, sy, sz, tinted ? (it.c ?? fallback) : undefined)
  })
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  mesh.computeBoundingSphere()
}

/** Offset every part by (dx, dz) — author in local space, place in the world. */
export function shiftParts(items: Part[], dx: number, dz: number): Part[] {
  return items.map((it) => ({ ...it, p: [it.p[0] + dx, it.p[1], it.p[2] + dz] }))
}

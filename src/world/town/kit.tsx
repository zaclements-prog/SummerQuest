import { useLayoutEffect, useRef } from 'react'
import { Color, Euler, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three'
import type { BufferGeometry, ColorRepresentation, Material } from 'three'
import { toonMaterial } from '../../toon/materials'
import type { ToonMaterialOpts } from '../../toon/materials'

/** One instance: position, uniform-or-xyz scale, xyz rotation, optional tint. */
export interface Inst {
  x: number
  y?: number
  z: number
  s?: number | [number, number, number]
  rx?: number
  ry?: number
  rz?: number
  color?: ColorRepresentation
}

const _m = new Matrix4()
const _q = new Quaternion()
const _e = new Euler()
const _p = new Vector3()
const _s = new Vector3()
const _c = new Color()

/**
 * Many copies of one shape in one draw call, like ToonInstances but with full
 * rotations and any toon material options (emissive lanterns, glowing panes).
 * `items` must be a stable array (build it at module level or in a memo).
 */
export function Instances({
  geometry,
  color = '#ffffff',
  mat,
  material,
  items,
  castShadow = false,
  receiveShadow = false,
}: {
  geometry: BufferGeometry
  /** Base color (instances with their own `color` are tinted by it — keep it white then). */
  color?: ColorRepresentation
  mat?: ToonMaterialOpts
  material?: Material
  items: Inst[]
  castShadow?: boolean
  receiveShadow?: boolean
}) {
  const ref = useRef<InstancedMesh>(null)
  const m = material ?? toonMaterial(color, mat)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    items.forEach((it, i) => {
      const s = it.s ?? 1
      _p.set(it.x, it.y ?? 0, it.z)
      _q.setFromEuler(_e.set(it.rx ?? 0, it.ry ?? 0, it.rz ?? 0))
      if (Array.isArray(s)) _s.set(s[0], s[1], s[2])
      else _s.setScalar(s)
      mesh.setMatrixAt(i, _m.compose(_p, _q, _s))
      if (it.color != null) mesh.setColorAt(i, _c.set(it.color))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [items])
  if (items.length === 0) return null
  return <instancedMesh key={items.length} ref={ref} args={[geometry, m, items.length]} castShadow={castShadow} receiveShadow={receiveShadow} />
}

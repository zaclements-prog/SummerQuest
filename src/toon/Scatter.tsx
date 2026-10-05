import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, InstancedMesh, Matrix4, Quaternion, Vector3, Euler } from 'three'
import type { BufferGeometry, ColorRepresentation } from 'three'
import { seededRng } from '../lib/random'
import { toonMaterial } from './materials'
import { geo } from './geometry'
import { TOON } from './palette'

/** One instance: world position, uniform-or-xyz scale, Y rotation, optional tint. */
export interface InstanceSpec {
  x: number
  y?: number
  z: number
  s?: number | [number, number, number]
  rot?: number
  color?: ColorRepresentation
}

const _m = new Matrix4()
const _q = new Quaternion()
const _e = new Euler()
const _p = new Vector3()
const _s = new Vector3()
const _c = new Color()

/**
 * Many copies of one toon shape in a single draw call. Use for scatter (trees,
 * bushes, rocks, flowers); individual hero props should use the normal components.
 */
export function ToonInstances({
  geometry,
  color,
  items,
  castShadow = true,
  receiveShadow = false,
}: {
  geometry: BufferGeometry
  color: ColorRepresentation
  items: InstanceSpec[]
  castShadow?: boolean
  receiveShadow?: boolean
}) {
  const ref = useRef<InstancedMesh>(null)
  const material = toonMaterial(color)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    items.forEach((it, i) => {
      const s = it.s ?? 1
      _p.set(it.x, it.y ?? 0, it.z)
      _q.setFromEuler(_e.set(0, it.rot ?? 0, 0))
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
  return (
    <instancedMesh
      key={items.length}
      ref={ref}
      args={[geometry, material, items.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    />
  )
}

export interface TreeSpot {
  x: number
  z: number
  scale?: number
  kind?: 'round' | 'pine' | 'blossom'
  seed?: number
}

/**
 * Instanced forest: trunks + low-poly canopies for any number of trees in a
 * handful of draw calls. Same look as <Tree> (round / pine / blossom).
 */
export function ScatterTrees({ trees }: { trees: TreeSpot[] }) {
  const parts = useMemo(() => {
    const trunks: InstanceSpec[] = []
    const canopy: InstanceSpec[] = []
    const pines: InstanceSpec[] = []
    for (const t of trees) {
      const r = seededRng(`scatter-tree:${t.seed ?? t.x * 1000 + t.z}`)
      const k = t.scale ?? 1
      if (t.kind === 'pine') {
        trunks.push({ x: t.x, y: 0.35 * k, z: t.z, s: [0.13 * k, 0.7 * k, 0.13 * k] })
        pines.push({ x: t.x, y: 1.05 * k, z: t.z, s: [0.85 * k, 1.1 * k, 0.85 * k], rot: r() * 6, color: TOON.pineDark })
        pines.push({ x: t.x, y: 1.55 * k, z: t.z, s: [0.68 * k, 0.95 * k, 0.68 * k], rot: r() * 6, color: TOON.pine })
        pines.push({ x: t.x, y: 2.0 * k, z: t.z, s: [0.46 * k, 0.8 * k, 0.46 * k], rot: r() * 6, color: TOON.pine })
      } else {
        const h = (0.9 + r() * 0.5) * k
        trunks.push({ x: t.x, y: h / 2, z: t.z, s: [0.15 * k, h, 0.15 * k] })
        const colors = t.kind === 'blossom' ? [TOON.blossom, TOON.blossomLight, TOON.flowerPink] : [TOON.leaf, TOON.leafLight, TOON.leafDark]
        for (let i = 0; i < 3; i++) {
          const s = (0.55 + r() * 0.3 - i * 0.06) * k
          canopy.push({ x: t.x + (r() - 0.5) * 0.5 * k, y: h + (0.35 + i * 0.18 + r() * 0.15) * k, z: t.z + (r() - 0.5) * 0.5 * k, s, rot: r() * 6, color: colors[i] })
        }
      }
    }
    return { trunks, canopy, pines }
  }, [trees])

  return (
    <group>
      {/* unit cylinder / cone / blob, scaled per instance */}
      <ToonInstances geometry={geo.cyl(0.75, 1, 1, 7)} color={TOON.bark} items={parts.trunks} />
      <ToonInstances geometry={facetedBlob} color={TOON.white} items={parts.canopy} />
      <ToonInstances geometry={facetedCone} color={TOON.white} items={parts.pines} />
    </group>
  )
}

// Faceted unit shapes for scatter (tinted per instance; base color white so the
// instance color shows true).
const facetedBlob = (() => {
  const g = geo.blob(1).clone()
  g.computeVertexNormals()
  return g
})()
const facetedCone = (() => {
  const g = geo.cone(1, 1, 8).toNonIndexed()
  g.computeVertexNormals()
  return g
})()

/** Instanced low blobs: bushes, rocks, flower dots, puffs. */
export function ScatterBlobs({
  items,
  color = TOON.white,
  castShadow = true,
  faceted = true,
}: {
  items: InstanceSpec[]
  color?: ColorRepresentation
  castShadow?: boolean
  faceted?: boolean
}) {
  return <ToonInstances geometry={faceted ? facetedBlob : geo.blob(1)} color={color} items={items} castShadow={castShadow} />
}

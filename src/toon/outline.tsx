import { useLayoutEffect, useRef } from 'react'
import { InstancedMesh, Mesh } from 'three'
import type { ColorRepresentation, Group } from 'three'
import { useLowGraphics } from '../world/graphicsQuality'
import { OUTLINE } from './materials'
import { creased, outlineMaterial } from './outlineMaterial'

/**
 * Outline the parent mesh (or instanced mesh) with the toon kit's shared hull
 * (see `outlineMaterial.ts`): drop it inside a mesh, like drei's <Outlines>.
 * Skipped on "Fast" graphics — each hull is an extra draw call. `crease`
 * (default on) smooths the normals first so the hull never splits at hard
 * edges; turn it off for already-smooth shapes (spheres, capsules) to draw the
 * hull from the shape's own geometry.
 */
export function Outline({
  thickness = OUTLINE.thickness,
  color = OUTLINE.color,
  crease = true,
}: {
  thickness?: number
  color?: ColorRepresentation
  crease?: boolean
}) {
  const low = useLowGraphics()
  return low ? null : <Hull thickness={thickness} color={color} crease={crease} />
}

function Hull({ thickness, color, crease }: { thickness: number; color: ColorRepresentation; crease: boolean }) {
  const ref = useRef<Group>(null)
  useLayoutEffect(() => {
    const group = ref.current
    const parent = group?.parent as (Mesh & { isInstancedMesh?: boolean }) | null | undefined
    if (!group || !parent?.geometry) return
    const geometry = crease ? creased(parent.geometry) : parent.geometry
    const material = outlineMaterial(color, thickness)
    let hull: Mesh
    if (parent.isInstancedMesh) {
      const src = parent as unknown as InstancedMesh
      const inst = new InstancedMesh(geometry, material, src.count)
      inst.instanceMatrix = src.instanceMatrix
      inst.frustumCulled = src.frustumCulled
      hull = inst
    } else {
      hull = new Mesh(geometry, material)
    }
    hull.userData.toonOutlineHull = true
    group.add(hull)
    return () => {
      group.remove(hull)
    }
  }, [thickness, color, crease])
  return <group ref={ref} />
}

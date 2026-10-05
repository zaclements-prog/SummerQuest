import { useLayoutEffect, useRef } from 'react'
import { Outlines } from '@react-three/drei'
import type { BufferGeometry, ColorRepresentation, InstancedMesh } from 'three'
import { faceted } from '../../../toon/geometry'
import { OUTLINE, toonMaterial } from '../../../toon/materials'
import { TOON } from '../../../toon/palette'
import { TSphere } from '../../../toon/shapes'
import { writeParts, type Part, type V3 } from './instancing'

/**
 * Many copies of one toon shape in one draw call, each with its own position,
 * full rotation, scale and tint (the material color multiplies the tint, so
 * leave `color` white when items carry colors). Shared by the Story areas to
 * keep their mesh counts low. `items` must be stable (module constant or memo).
 */
export function Parts({
  geometry,
  items,
  color = TOON.white,
  flat,
  outline,
  castShadow = true,
  receiveShadow = false,
  emissive,
  emissiveIntensity,
  doubleSide,
}: {
  geometry: BufferGeometry
  items: Part[]
  color?: ColorRepresentation
  flat?: boolean
  outline?: boolean
  castShadow?: boolean
  receiveShadow?: boolean
  emissive?: ColorRepresentation
  emissiveIntensity?: number
  doubleSide?: boolean
}) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    if (ref.current) writeParts(ref.current, items)
  }, [items])
  if (items.length === 0) return null
  return (
    <instancedMesh
      key={items.length}
      ref={ref}
      args={[flat ? faceted(geometry) : geometry, toonMaterial(color, { emissive, emissiveIntensity, doubleSide }), items.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      {outline && <Outlines thickness={OUTLINE.thickness} color={OUTLINE.color} />}
    </instancedMesh>
  )
}

/**
 * A shiny cartoon eye on a character's face: a dark oval with a tiny glowing
 * catch-light up and to the side. `position` is the eye's center on the face.
 */
export function Eye({ position, size = 0.06, rotation }: { position: V3; size?: number; rotation?: V3 }) {
  return (
    <group position={position} rotation={rotation}>
      <TSphere scale={[size * 0.78, size, size * 0.5]} color={TOON.eye} castShadow={false} segments={10} />
      <TSphere
        position={[size * 0.26, size * 0.36, size * 0.38]}
        scale={size * 0.3}
        color={TOON.white}
        emissive={TOON.white}
        emissiveIntensity={0.9}
        castShadow={false}
        segments={6}
      />
    </group>
  )
}

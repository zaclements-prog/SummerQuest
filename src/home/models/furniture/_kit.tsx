import type { ReactNode } from 'react'
import { Outlines } from '@react-three/drei'
import type { BufferGeometry, ColorRepresentation } from 'three'
import { toonMaterial } from '../../../toon/materials'
import { TOON } from '../../../toon/palette'
import { TCone, TCyl, TSphere, type Vec3 } from '../../../toon/shapes'
import { F, OUTLINE_PX } from './_palette'

/**
 * Shared bits for the toon furniture. Every piece uses the toon kit's cached
 * materials and geometries, so a room full of furniture shares a handful of
 * materials.
 */

/** Thin dark line work for a main silhouette piece: drop inside a toon shape. */
export function Ol({ thickness = OUTLINE_PX }: { thickness?: number }) {
  return <Outlines thickness={thickness} color={TOON.outline} />
}

/** A mesh from any (cached) geometry with a cached toon material. */
export function TGeo({
  geometry,
  color,
  position,
  rotation,
  scale,
  castShadow = true,
  receiveShadow = false,
  emissive,
  emissiveIntensity,
  opacity,
  doubleSide,
  children,
}: {
  geometry: BufferGeometry
  color: ColorRepresentation
  position?: Vec3
  rotation?: Vec3
  scale?: number | Vec3
  castShadow?: boolean
  receiveShadow?: boolean
  emissive?: ColorRepresentation
  emissiveIntensity?: number
  opacity?: number
  doubleSide?: boolean
  children?: ReactNode
}) {
  return (
    <mesh
      geometry={geometry}
      material={toonMaterial(color, { emissive, emissiveIntensity, opacity, doubleSide })}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      {children}
    </mesh>
  )
}

/** A round drawer/door knob. */
export function Knob({ position, color = F.gold, r = 0.04 }: { position: Vec3; color?: string; r?: number }) {
  return <TSphere position={position} scale={r} color={color} segments={8} castShadow={false} />
}

/** Four stubby round feet at (±x, ±z), `h` tall, standing on the floor. */
export function Feet({ x, z, h = 0.1, r = 0.07, color = F.woodDark }: { x: number; z: number; h?: number; r?: number; color?: string }) {
  return (
    <>
      {[
        [-x, -z],
        [x, -z],
        [-x, z],
        [x, z],
      ].map(([fx, fz]) => (
        <TCyl key={`${fx},${fz}`} radiusTop={r} radiusBottom={r * 0.8} height={h} position={[fx, h / 2, fz]} color={color} segments={8} castShadow={false} />
      ))}
    </>
  )
}

/**
 * A puffy little heart badge facing +z (two lobes + a point), ~`size` wide.
 * Used as an emblem on chests, beanbags and the wardrobe.
 */
export function Heart({ position, size = 0.2, color = F.pink }: { position: Vec3; size?: number; color?: string }) {
  const r = size * 0.3
  return (
    <group position={position}>
      <TSphere position={[-r * 0.75, r * 0.35, 0]} scale={[r, r, r * 0.45]} color={color} segments={10} castShadow={false} />
      <TSphere position={[r * 0.75, r * 0.35, 0]} scale={[r, r, r * 0.45]} color={color} segments={10} castShadow={false} />
      <TCone radius={r * 1.55} height={size * 0.62} position={[0, -size * 0.2, 0]} rotation={[0, 0, Math.PI]} scale={[1, 1, 0.3]} color={color} segments={12} castShadow={false} />
    </group>
  )
}

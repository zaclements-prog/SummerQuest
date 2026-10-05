import type { ReactNode } from 'react'
import { Outlines } from '@react-three/drei'
import type { BufferGeometry, ColorRepresentation } from 'three'
import { toonMaterial, OUTLINE } from './materials'
import { faceted, geo } from './geometry'

export type Vec3 = [number, number, number]

/** Props every toon primitive accepts. */
export interface ToonMeshProps {
  position?: Vec3
  rotation?: Vec3
  scale?: number | Vec3
  color: ColorRepresentation
  /** Draw a thin dark outline around the shape (characters, buildings, big props). */
  outline?: boolean
  /** Override the outline thickness (world units). */
  outlineThickness?: number
  castShadow?: boolean
  receiveShadow?: boolean
  opacity?: number
  emissive?: ColorRepresentation
  emissiveIntensity?: number
  /** Faceted low-poly shading instead of smooth. */
  flat?: boolean
  children?: ReactNode
}

function ToonMesh({
  geometry,
  position,
  rotation,
  scale,
  color,
  outline,
  outlineThickness,
  castShadow = true,
  receiveShadow = false,
  opacity,
  emissive,
  emissiveIntensity,
  flat,
  children,
}: ToonMeshProps & { geometry: BufferGeometry }) {
  return (
    <mesh
      geometry={flat ? faceted(geometry) : geometry}
      material={toonMaterial(color, { opacity, emissive, emissiveIntensity })}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      {outline && (opacity ?? 1) >= 0.5 && (
        <Outlines thickness={outlineThickness ?? OUTLINE.thickness} color={OUTLINE.color} />
      )}
      {children}
    </mesh>
  )
}

/** Rounded box. `size` = [w, h, d]; `radius` = corner rounding (default: soft). */
export function TBox({ size, radius, ...p }: ToonMeshProps & { size: Vec3; radius?: number }) {
  const [w, h, d] = size
  const r = radius ?? Math.min(w, h, d) * 0.22
  return <ToonMesh geometry={geo.box(w, h, d, r)} {...p} />
}

/**
 * Low-poly blob (icosphere) of radius 1 — scale it into foliage, clouds, bodies,
 * heads. `detail` 1 = chunky low-poly, 2 = rounder. Faceted by default.
 */
export function TBlob({ detail = 1, flat = true, ...p }: ToonMeshProps & { detail?: number }) {
  return <ToonMesh geometry={geo.blob(detail)} flat={flat} {...p} />
}

/** Smooth sphere of radius 1 (scale it). Good for eyes, noses, pom-poms. */
export function TSphere({ segments = 12, ...p }: ToonMeshProps & { segments?: number }) {
  return <ToonMesh geometry={geo.sphere(segments)} {...p} />
}

/** Cylinder / frustum centered on its middle. */
export function TCyl({
  radiusTop = 0.5,
  radiusBottom,
  height = 1,
  segments = 10,
  ...p
}: ToonMeshProps & { radiusTop?: number; radiusBottom?: number; height?: number; segments?: number }) {
  return <ToonMesh geometry={geo.cyl(radiusTop, radiusBottom ?? radiusTop, height, segments)} {...p} />
}

/** Cone pointing +y, centered on its middle. */
export function TCone({ radius = 0.5, height = 1, segments = 8, ...p }: ToonMeshProps & { radius?: number; height?: number; segments?: number }) {
  return <ToonMesh geometry={geo.cone(radius, height, segments)} {...p} />
}

/** Capsule along +y: `length` is the straight middle part. */
export function TCapsule({ radius = 0.25, length = 0.5, segments = 10, ...p }: ToonMeshProps & { radius?: number; length?: number; segments?: number }) {
  return <ToonMesh geometry={geo.capsule(radius, length, segments)} {...p} />
}

/** Torus (ring) lying in the XY plane — rotate [π/2,0,0] to lay it flat. */
export function TTorus({ radius = 0.5, tube = 0.12, segments = 20, ...p }: ToonMeshProps & { radius?: number; tube?: number; segments?: number }) {
  return <ToonMesh geometry={geo.torus(radius, tube, segments)} {...p} />
}

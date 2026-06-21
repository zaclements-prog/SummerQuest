import { useMemo } from 'react'
import { BufferGeometry, Float32BufferAttribute, DoubleSide, type ColorRepresentation } from 'three'
import { rng } from './fields'

type Vec3 = [number, number, number]

/**
 * A flat, gently-irregular disc (a soft organic blob) in the XZ plane, centered
 * at the origin. Low-frequency radius wobble keeps the outline smooth + rounded
 * (never spiky), so it reads as a natural patch of ground rather than a circle.
 */
function blobGeometry(radius: number, seed: number, segments = 40): BufferGeometry {
  const r = rng(seed)
  const wob: number[] = []
  let v = 0.86 + r() * 0.18
  for (let i = 0; i < segments; i++) {
    const target = 0.8 + r() * 0.28
    v = v * 0.62 + target * 0.38 // smooth the outline
    wob.push(v)
  }
  const pos: number[] = [0, 0, 0] // center
  for (let i = 0; i <= segments; i++) {
    const ang = (i / segments) * Math.PI * 2
    const rad = radius * wob[i % segments]
    pos.push(Math.cos(ang) * rad, 0, Math.sin(ang) * rad)
  }
  const idx: number[] = []
  for (let i = 1; i <= segments; i++) idx.push(0, i, i + 1)
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

export interface GroundPatchProps {
  position?: Vec3
  radius?: number
  color: ColorRepresentation
  /** Optional inner tone for subtle depth (a smaller blob layered on top). */
  color2?: ColorRepresentation
  seed?: number
  /** Flush height above the grass; keep tiny to avoid z-fighting. */
  y?: number
  roughness?: number
}

/**
 * A cohesive, soft-edged flat GROUND PATCH (sandy clearing, gravel court, dirt,
 * beach…), flush with the grass. ONE organic blob mesh — the clean replacement
 * for sloppy scattered ground tiles. Optional `color2` lays a smaller inner blob
 * for gentle two-tone depth.
 */
export function GroundPatch({
  position = [0, 0, 0],
  radius = 4,
  color,
  color2,
  seed = 7,
  y = 0.02,
  roughness = 1,
}: GroundPatchProps) {
  const base = useMemo(() => blobGeometry(radius, seed), [radius, seed])
  const inner = useMemo(
    () => (color2 != null ? blobGeometry(radius * 0.62, seed + 17) : null),
    [radius, seed, color2],
  )
  return (
    <group position={position}>
      <mesh geometry={base} position={[0, y, 0]} receiveShadow>
        <meshStandardMaterial color={color} roughness={roughness} side={DoubleSide} />
      </mesh>
      {inner && (
        <mesh geometry={inner} position={[0, y + 0.012, 0]} receiveShadow>
          <meshStandardMaterial color={color2} roughness={roughness} side={DoubleSide} />
        </mesh>
      )}
    </group>
  )
}

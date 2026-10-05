import type { BufferGeometry, ColorRepresentation } from 'three'
import { toonMaterial } from '../../../toon/materials'
import { TOON } from '../../../toon/palette'
import { TSphere, type Vec3 } from '../../../toon/shapes'
import { pieSlice } from './shapes'

/**
 * Small shared components for the Math West + South areas: flat ground decals, a
 * disc cut into equal pie slices, and the chibi face used by every guide.
 */

/** A flat ground decal (sand, puddles, pools). Keep `y` between 0.005 and 0.03. */
export function Decal({
  geometry,
  color,
  position,
  rotation = 0,
  scale,
}: {
  geometry: BufferGeometry
  color: ColorRepresentation
  position: Vec3
  rotation?: number
  scale?: number | Vec3
}) {
  return <mesh geometry={geometry} material={toonMaterial(color)} position={position} rotation={[0, rotation, 0]} scale={scale} receiveShadow />
}

/**
 * A disc cut into `parts` equal slices, each nudged out from the centre by `gap`
 * so the cuts show. Lies flat (rotate [π/2,0,0] to face +z). One mesh per slice.
 */
export function PieDisc({
  parts,
  radius,
  height,
  gap = 0.04,
  colors,
  position,
  rotation,
  turn = Math.PI / 2,
  castShadow = false,
  receiveShadow = false,
}: {
  parts: number
  radius: number
  height: number
  gap?: number
  colors: ColorRepresentation[]
  position?: Vec3
  rotation?: Vec3
  /** Angle where the first slice starts. */
  turn?: number
  castShadow?: boolean
  receiveShadow?: boolean
}) {
  const len = (Math.PI * 2) / parts
  return (
    <group position={position} rotation={rotation}>
      {Array.from({ length: parts }, (_, i) => {
        const a0 = turn + i * len
        const mid = a0 + len / 2
        const g = parts > 1 ? gap : 0
        return (
          <mesh
            key={i}
            geometry={pieSlice(radius, height, a0, len)}
            material={toonMaterial(colors[i % colors.length])}
            position={[Math.cos(mid) * g, 0, -Math.sin(mid) * g]}
            castShadow={castShadow}
            receiveShadow={receiveShadow}
          />
        )
      })}
    </group>
  )
}

/**
 * The chibi face: two dark eyes with tiny glowing catch-lights, plus blush cheeks.
 * Positions are in the character's local space (it faces +z).
 */
export function ChibiFace({
  eyeY,
  eyeX,
  eyeZ,
  eyeR = 0.05,
  blushY,
  blushX,
  blushZ,
  blushR = 0.06,
}: {
  eyeY: number
  eyeX: number
  eyeZ: number
  eyeR?: number
  blushY: number
  blushX: number
  blushZ: number
  blushR?: number
}) {
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s}>
          <TSphere position={[s * eyeX, eyeY, eyeZ]} scale={[eyeR, eyeR * 1.15, eyeR * 0.8]} color={TOON.eye} castShadow={false} segments={10} />
          <TSphere
            position={[s * eyeX + eyeR * 0.35, eyeY + eyeR * 0.45, eyeZ + eyeR * 0.6]}
            scale={eyeR * 0.36}
            color={TOON.white}
            emissive={TOON.white}
            emissiveIntensity={1}
            castShadow={false}
            segments={6}
          />
          <TSphere position={[s * blushX, blushY, blushZ]} scale={[blushR, blushR * 0.55, blushR * 0.35]} color={TOON.blush} castShadow={false} segments={8} />
        </group>
      ))}
    </group>
  )
}

import { useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Outlines } from '@react-three/drei'
import { OctahedronGeometry } from 'three'
import type { Group, Vector3 } from 'three'
import Npc from '../Npc'
import { areaById, npcPosition } from '../worldLayout'
import { TOON } from '../../toon/palette'
import { OUTLINE, toonMaterial } from '../../toon/materials'
import { TBlob, TBox, TCone, TCyl, TSphere, TTorus, type Vec3 } from '../../toon/shapes'
import { Lamp, Signpost } from '../../toon/props'
import Hedgehog from './geometry-grove/Hedgehog'
import { GROVE, type GroveShape } from './colliders/geometry-grove'

/** Octahedron (built once; non-indexed, so it's already faceted). */
const octaGeo = new OctahedronGeometry(1, 0)

function Octa({ position, scale, color, emissive, emissiveIntensity }: { position?: Vec3; scale?: number | Vec3; color: string; emissive?: string; emissiveIntensity?: number }) {
  return (
    <mesh geometry={octaGeo} material={toonMaterial(color, { emissive, emissiveIntensity })} position={position} scale={scale} castShadow>
      <Outlines thickness={OUTLINE.thickness} color={OUTLINE.color} />
    </mesh>
  )
}

/** A tree whose canopy is a perfect solid, in candy colors. */
function ShapeTree({ at, shape, color, trunk }: { at: [number, number]; shape: GroveShape; color: string; trunk: number }) {
  const h = trunk
  return (
    <group position={[at[0], 0, at[1]]}>
      <TCyl radiusTop={0.12} radiusBottom={0.18} height={h + 0.2} position={[0, (h + 0.2) / 2, 0]} color={TOON.bark} segments={8} />
      {shape === 'sphere' && <TSphere position={[0, h + 0.72, 0]} scale={0.82} color={color} outline segments={18} />}
      {shape === 'cube' && <TBox size={[1.25, 1.25, 1.25]} radius={0.1} position={[0, h + 0.6, 0]} rotation={[0, 0.55, 0]} color={color} outline />}
      {shape === 'cone' && <TCone radius={0.8} height={1.95} position={[0, h + 0.9, 0]} color={color} outline segments={20} />}
      {shape === 'pyramid' && <TCone radius={1.05} height={1.6} position={[0, h + 0.72, 0]} rotation={[0, 0.25, 0]} color={color} outline segments={4} flat />}
      {shape === 'cylinder' && <TCyl radiusTop={0.68} height={1.25} position={[0, h + 0.62, 0]} color={color} outline segments={20} />}
      {shape === 'octahedron' && <Octa position={[0, h + 0.85, 0]} scale={0.95} color={color} />}
      {shape === 'icosahedron' && <TBlob detail={0} position={[0, h + 0.72, 0]} scale={0.88} color={color} outline />}
    </group>
  )
}

/** A big floating crystal that slowly spins, with little solids orbiting it. */
function Crystal({ at }: { at: [number, number] }) {
  const gem = useRef<Group>(null)
  const ring = useRef<Group>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (gem.current) {
      gem.current.rotation.y = t * 0.6
      gem.current.position.y = 2.35 + Math.sin(t * 1.3) * 0.12
    }
    if (ring.current) ring.current.rotation.y = -t * 0.45
  })
  return (
    <group position={[at[0], 0, at[1]]}>
      {/* hexagonal pedestal */}
      <TCyl radiusTop={0.7} radiusBottom={0.85} height={0.5} position={[0, 0.25, 0]} color={TOON.stone} segments={6} flat outline receiveShadow />
      <TCyl radiusTop={0.58} radiusBottom={0.62} height={0.12} position={[0, 0.55, 0]} color={TOON.lilac} segments={6} flat castShadow={false} />
      <TCyl radiusTop={0.3} height={0.04} position={[0, 0.63, 0]} color={TOON.glow} emissive={TOON.lilac} emissiveIntensity={0.8} segments={6} castShadow={false} />
      <group ref={gem} position={[0, 2.35, 0]}>
        <Octa scale={[0.62, 1.05, 0.62]} color="#e2c6ff" emissive="#b98cff" emissiveIntensity={0.45} />
      </group>
      <group ref={ring} position={[0, 2.35, 0]}>
        <TBox size={[0.26, 0.26, 0.26]} radius={0.05} position={[1.05, 0.2, 0]} rotation={[0.5, 0.5, 0]} color={TOON.mint} castShadow={false} />
        <TCone radius={0.18} height={0.3} position={[-0.52, -0.15, 0.9]} segments={4} flat color={TOON.flowerYellow} castShadow={false} />
        <TSphere position={[-0.52, 0.05, -0.9]} scale={0.15} color={TOON.flowerPink} castShadow={false} segments={12} />
        <TTorus radius={1.05} tube={0.025} rotation={[Math.PI / 2, 0, 0]} color={TOON.white} emissive={TOON.lilac} emissiveIntensity={0.5} opacity={0.7} castShadow={false} segments={32} />
      </group>
    </group>
  )
}

/** Shape stepping stones: a little trail from the stage that rings the crystal. */
const STONES: { at: [number, number]; sides: number; color: string; rot: number }[] = (() => {
  const [cx, cz] = GROVE.crystal.at
  const ring = [
    { deg: 120, sides: 4, color: TOON.mint },
    { deg: 168, sides: 5, color: TOON.flowerPink },
    { deg: 216, sides: 6, color: TOON.sky },
    { deg: 264, sides: 24, color: TOON.lilac },
    { deg: 312, sides: 3, color: TOON.flowerYellow },
    { deg: 0, sides: 4, color: TOON.coral },
    { deg: 52, sides: 6, color: TOON.mint },
  ]
  return [
    { at: [12.4, -23.8] as [number, number], sides: 3, color: TOON.flowerYellow, rot: 0.3 },
    ...ring.map((s, i) => {
      const a = (s.deg * Math.PI) / 180
      return { at: [cx + Math.cos(a) * 1.65, cz + Math.sin(a) * 1.65] as [number, number], sides: s.sides, color: s.color, rot: i * 0.7 }
    }),
  ]
})()

/** Clipped geometric topiary dotted round the grove edge (walk-through). */
const TOPIARY: { at: Vec3; kind: 'cube' | 'ball' | 'pyr'; s: number }[] = [
  { at: [10.6, 0, -26.1], kind: 'cube', s: 0.5 },
  { at: [15.6, 0, -24.0], kind: 'ball', s: 0.4 },
  { at: [15.3, 0, -30.4], kind: 'pyr', s: 0.6 },
  { at: [8.4, 0, -27.4], kind: 'ball', s: 0.45 },
  { at: [19.0, 0, -27.4], kind: 'cube', s: 0.5 },
]

/**
 * Geometry Grove: a candy-colored orchard on the north bank where every tree is
 * a perfect solid (sphere, cube, cone, pyramid, cylinder, octahedron,
 * icosahedron), a ring of shape stepping stones, and a big floating crystal
 * spinning over a hexagonal pedestal. Hex the hedgehog holds a protractor.
 */
export default function GeometryGrove({ posRef }: { posRef: RefObject<Vector3> }) {
  const a = areaById('geometry-grove')!
  const npc = npcPosition(a)!
  return (
    <group>
      {GROVE.trees.map((t) => (
        <ShapeTree key={t.shape} {...t} />
      ))}
      <Crystal at={GROVE.crystal.at} />

      {STONES.map((s, i) => (
        <TCyl
          key={i}
          radiusTop={s.sides === 3 ? 0.42 : 0.36}
          radiusBottom={s.sides === 3 ? 0.45 : 0.39}
          height={0.09}
          segments={s.sides}
          position={[s.at[0], 0.045, s.at[1]]}
          rotation={[0, s.rot, 0]}
          color={s.color}
          flat
          castShadow={false}
          receiveShadow
        />
      ))}

      {TOPIARY.map((b, i) => (
        <group key={i} position={b.at}>
          {b.kind === 'cube' && <TBox size={[b.s * 1.6, b.s * 1.6, b.s * 1.6]} radius={0.08} position={[0, b.s * 0.8, 0]} rotation={[0, i, 0]} color={TOON.leaf} />}
          {b.kind === 'ball' && <TSphere scale={b.s} position={[0, b.s, 0]} color={TOON.leafLight} segments={12} />}
          {b.kind === 'pyr' && <TCone radius={b.s * 1.2} height={b.s * 2} position={[0, b.s, 0]} rotation={[0, i, 0]} segments={4} flat color={TOON.leafDark} />}
        </group>
      ))}

      <Signpost position={[GROVE.sign[0], 0, GROVE.sign[1]]} rotation={Math.PI / 4} color={TOON.lilac} />
      <Lamp position={[GROVE.lamp[0], 0, GROVE.lamp[1]]} />

      <Npc areaId={a.id} zoneId={a.zoneId} hub={a.hub} label={a.label} position={[npc[0], 0, npc[1]]} posRef={posRef} facing={0.25}>
        <Hedgehog />
      </Npc>
    </group>
  )
}

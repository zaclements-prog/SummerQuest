import { useMemo } from 'react'
import { TOON } from '../toon/palette'
import { geo } from '../toon/geometry'
import { toonMaterial } from '../toon/materials'
import { TBlob, TBox, TCapsule, TCone, TCyl, TSphere } from '../toon/shapes'
import { Tree } from '../toon/props'
import { ScatterBlobs, ToonInstances, type InstanceSpec } from '../toon/Scatter'
import { Decal } from '../world/areas/fraction-falls/kit'
import { blobDisc, stripedCone } from '../world/areas/fraction-falls/shapes'
import { TERRACOTTA, TERRACOTTA_TOP } from '../world/areas/multiplication-mesa/colors'
import { CAVE, PLAY } from './DivisionArena.layout'
import { LANE } from '../lib/arena/divisionCore'

/**
 * The Crystal Golems set, in the arena's local frame: a sandy hollow in
 * Division Dunes. A crystal cave in a terracotta cliff at the top of the
 * screen, a roped lane running down to the camel pen, dunes, palms, saguaros
 * and the trader's striped tent around it — the World's dunes kit, framed big.
 * Static: built once, no per-frame work.
 */

const DUNE = '#efcf92'
const DUNE_LIGHT = '#f9e6bb'
const CACTUS = '#6cbf7a'

function Dune({ x, z, sx, sz, h, rot = 0 }: { x: number; z: number; sx: number; sz: number; h: number; rot?: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <TSphere scale={[sx, h, sz]} position={[0, -h * 0.15, 0]} color={DUNE} segments={18} receiveShadow castShadow={false} />
      <TSphere scale={[sx * 0.6, h * 0.55, sz * 0.5]} position={[-sx * 0.18, h * 0.38, -sz * 0.2]} color={DUNE_LIGHT} segments={14} castShadow={false} />
    </group>
  )
}

function Saguaro({ x, z, h, rot = 0 }: { x: number; z: number; h: number; rot?: number }) {
  const r = 0.2
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <TCapsule radius={r} length={h - r * 2} position={[0, h / 2, 0]} color={CACTUS} outline flat segments={8} />
      <TCapsule radius={0.12} length={0.22} position={[0.27, h * 0.42, 0]} rotation={[0, 0, Math.PI / 2]} color={CACTUS} flat segments={8} />
      <TCapsule radius={0.12} length={0.3} position={[0.42, h * 0.42 + 0.2, 0]} color={CACTUS} flat segments={8} />
      <TCapsule radius={0.11} length={0.18} position={[-0.25, h * 0.6, 0]} rotation={[0, 0, Math.PI / 2]} color={CACTUS} flat segments={8} />
      <TCapsule radius={0.11} length={0.22} position={[-0.38, h * 0.6 + 0.15, 0]} color={CACTUS} flat segments={8} />
      <TSphere position={[0, h + 0.02, 0]} scale={[0.1, 0.07, 0.1]} color={TOON.flowerPink} castShadow={false} segments={8} />
    </group>
  )
}

/** Layered terracotta butte (the Mesa's bands) for the skyline. */
function Butte({ x, z, r, h, rot = 0 }: { x: number; z: number; r: number; h: number; rot?: number }) {
  const bands = TERRACOTTA.length
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      {TERRACOTTA.map((c, i) => (
        <TCyl
          key={i}
          radiusTop={r * (1 - (i + 1) * 0.06)}
          radiusBottom={r * (1 - i * 0.06)}
          height={h / bands}
          position={[0, (h / bands) * (i + 0.5), 0]}
          color={c}
          segments={9}
          flat
          castShadow={false}
        />
      ))}
      <TCyl radiusTop={r * 0.7} radiusBottom={r * (1 - bands * 0.06)} height={0.12} position={[0, h + 0.06, 0]} color={TERRACOTTA_TOP} segments={9} flat castShadow={false} />
    </group>
  )
}

/** The cave the golems march out of: a rock arch studded with crystals, in a cliff. */
function CrystalCave() {
  const crystals: { p: [number, number, number]; r: [number, number, number]; s: number; c: string }[] = [
    { p: [-1.7, 2.6, 0.2], r: [0.2, 0, 0.5], s: 1.1, c: '#c3a8f5' },
    { p: [-2.1, 1.3, 0.5], r: [0.3, 0, 0.9], s: 0.8, c: '#8fd0ff' },
    { p: [1.8, 2.4, 0.3], r: [0.2, 0, -0.6], s: 1.2, c: '#8ee6c0' },
    { p: [2.2, 1.0, 0.6], r: [0.4, 0, -1.0], s: 0.7, c: '#f7a1c4' },
    { p: [0.2, 3.65, 0.1], r: [0.1, 0, 0.15], s: 0.9, c: '#ffd36b' },
    { p: [-0.6, 3.5, 0.3], r: [0.3, 0, 0.6], s: 0.6, c: '#9fb6ff' },
  ]
  return (
    <group position={[CAVE.x, 0, CAVE.z]}>
      {/* the cliff behind */}
      <Butte x={0} z={-3.6} r={4.4} h={3.9} rot={0.4} />
      <Butte x={-7.5} z={-3.4} r={3.0} h={3.0} rot={1.1} />
      <Butte x={7.4} z={-4.2} r={3.4} h={3.5} rot={2.2} />
      {/* dark mouth */}
      <TSphere scale={[1.55, 2.25, 1.0]} position={[0, 0, -0.55]} color={'#4a3550'} segments={16} castShadow={false} />
      {/* the arch: two rock pillars and a lintel */}
      <TBlob scale={[1.05, 1.9, 1.05]} position={[-1.75, 1.2, 0]} color={TOON.cliff} outline />
      <TBlob scale={[1.1, 2.0, 1.0]} position={[1.75, 1.25, 0]} color={TOON.cliffDark} outline />
      <TBlob scale={[2.6, 0.85, 1.05]} position={[0, 3.05, -0.1]} color={TOON.cliff} outline />
      <TBlob scale={[0.8, 0.6, 0.7]} position={[-2.6, 0.45, 0.6]} color={TOON.cliffDark} />
      <TBlob scale={[0.7, 0.5, 0.6]} position={[2.65, 0.4, 0.7]} color={TOON.cliff} />
      {crystals.map((k, i) => (
        <group key={i} position={k.p} rotation={k.r} scale={k.s}>
          <TCone radius={0.24} height={0.85} segments={6} position={[0, 0.3, 0]} color={k.c} outline flat emissive={k.c} emissiveIntensity={0.25} castShadow={false} />
          <TCone radius={0.15} height={0.5} segments={6} position={[0.22, 0.12, 0.05]} rotation={[0, 0, -0.5]} color={k.c} flat emissive={k.c} emissiveIntensity={0.25} castShadow={false} />
        </group>
      ))}
    </group>
  )
}

/** The trader's striped tent and a stack of goods, off to one side. */
function TraderTent({ x, z, rot }: { x: number; z: number; rot: number }) {
  const [roofA, roofB] = stripedCone(0, 1.45, 1.25, 12, 2)
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <TCyl radiusTop={1.05} radiusBottom={1.1} height={1.2} position={[0, 0.6, 0]} color={TOON.wallCream} outline segments={16} />
      <TBox size={[0.6, 0.86, 0.12]} radius={0.06} position={[0, 0.43, 1.03]} color={'#8a4f3c'} castShadow={false} />
      <mesh geometry={roofA} material={toonMaterial(TOON.coral)} position={[0, 1.2 + 0.625, 0]} castShadow />
      <mesh geometry={roofB} material={toonMaterial(TOON.wallCream)} position={[0, 1.2 + 0.625, 0]} castShadow />
      <TSphere position={[0, 2.5, 0]} scale={0.12} color={TOON.gold} castShadow={false} />
      <TBox size={[0.6, 0.5, 0.6]} position={[1.4, 0.25, 0.6]} color={TOON.woodLight} outline />
      <TBox size={[0.46, 0.4, 0.46]} position={[1.45, 0.7, 0.55]} rotation={[0, 0.4, 0]} color={TOON.wood} />
      <TCyl radiusTop={0.26} height={0.66} position={[-1.35, 0.33, 0.75]} color={TOON.wood} segments={10} />
    </group>
  )
}

export function ArenaSet() {
  // lane-edge stakes (instanced) and rope rails
  const stakes = useMemo<InstanceSpec[]>(() => {
    const out: InstanceSpec[] = []
    for (let z = LANE.start + 0.6; z <= LANE.end - 0.2; z += 1.15) {
      for (const x of [-1.4, 1.4]) out.push({ x, y: 0.28, z, s: [0.07, 0.56, 0.07] })
    }
    return out
  }, [])
  const ropeLen = LANE.end - 0.2 - (LANE.start + 0.6)
  const ropeZ = (LANE.end - 0.2 + LANE.start + 0.6) / 2

  const rocks = useMemo<InstanceSpec[]>(() => {
    const spots: [number, number, number][] = [
      [-6.1, -5.6, 0.55], [5.8, -5.2, 0.6], [-6.8, 1.9, 0.45], [6.9, 2.4, 0.5], [-4.7, 5.6, 0.4], [4.4, 6.1, 0.45],
      [-7.4, -2.2, 0.5], [7.3, -1.4, 0.4], [-3.8, -7.3, 0.6], [3.9, -7.6, 0.55], [0.9, 6.6, 0.35], [-1.5, 6.9, 0.3],
    ]
    return spots.map(([x, z, s], i) => ({ x, y: s * 0.35, z, s: [s * 1.2, s * 0.65, s], rot: i * 1.3, color: i % 2 ? TOON.rock : TOON.rockLight }))
  }, [])
  const barrels = useMemo<InstanceSpec[]>(
    () => [
      [-5.0, -4.3], [5.2, 3.7], [-5.6, 3.9], [6.0, -3.4], [-2.8, 6.2], [3.2, 5.6],
    ].map(([x, z], i) => ({ x, y: 0.22, z, s: [0.28, 0.3, 0.28], rot: i, color: i % 2 ? CACTUS : '#5fae6c' })),
    [],
  )

  return (
    <group>
      {/* sand to the horizon, the arena hollow and the lane */}
      <Decal geometry={blobDisc(90, 0.05, 41, 64)} color={TOON.sand} position={[0, -0.01, 0]} />
      <Decal geometry={blobDisc(PLAY.r + 0.9, 0.12, 42, 48)} color={DUNE_LIGHT} position={[PLAY.x, 0.002, PLAY.z]} />
      <Decal geometry={blobDisc(1.15, 0.06, 43, 32)} color={TOON.sandWet} position={[0, 0.006, (LANE.start + LANE.end) / 2 - 0.2]} scale={[1, 1, 3.9]} />
      <ToonInstances geometry={geo.cyl(1, 1, 1, 6)} color={TOON.woodDark} items={stakes} castShadow={false} />
      {[-1.4, 1.4].map((x) => (
        <TBox key={x} size={[0.04, 0.04, ropeLen]} position={[x, 0.46, ropeZ]} color={'#e8d2a6'} castShadow={false} />
      ))}

      <CrystalCave />

      {/* dunes all around */}
      <Dune x={-9.5} z={-4.5} sx={3.4} sz={2.2} h={1.5} rot={0.6} />
      <Dune x={9.8} z={-3.6} sx={3.6} sz={2.3} h={1.6} rot={-0.5} />
      <Dune x={-10.2} z={3.8} sx={3.0} sz={2.0} h={1.2} rot={-0.3} />
      <Dune x={10.4} z={4.6} sx={3.2} sz={2.1} h={1.3} rot={0.4} />
      <Dune x={-15} z={-10} sx={5} sz={3} h={2.4} rot={0.2} />
      <Dune x={15} z={-11} sx={5.5} sz={3.2} h={2.6} rot={-0.3} />
      <Dune x={0} z={11.5} sx={6} sz={2.2} h={1.0} />

      {/* oasis on the left, palms */}
      <Decal geometry={blobDisc(2.0, 0.14, 44)} color={TOON.grassLight} position={[-8.6, 0.004, -0.2]} />
      <Decal geometry={blobDisc(1.35, 0.1, 45)} color={TOON.water} position={[-8.6, 0.01, -0.2]} />
      <Tree variant="palm" position={[-7.4, 0, -1.6]} scale={1.25} seed={41} outline />
      <Tree variant="palm" position={[-9.6, 0, 1.4]} scale={1.05} seed={42} />
      <Tree variant="palm" position={[7.6, 0, -6.4]} scale={1.15} seed={43} />
      <Tree variant="palm" position={[-6.0, 0, 6.4]} scale={0.95} seed={44} />

      <Saguaro x={5.6} z={-2.6} h={2.0} rot={0.5} />
      <Saguaro x={-5.4} z={-5.8} h={1.6} rot={-0.3} />
      <Saguaro x={6.4} z={5.4} h={1.5} rot={2.1} />
      <Saguaro x={-7.0} z={4.4} h={1.3} rot={1.4} />

      <TraderTent x={6.9} z={1.2} rot={-1.2} />

      <ScatterBlobs items={rocks} />
      <ScatterBlobs items={barrels} faceted={false} />
    </group>
  )
}

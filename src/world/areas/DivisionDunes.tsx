import { useMemo } from 'react'
import type { RefObject } from 'react'
import type { Vector3 } from 'three'
import Npc from '../Npc'
import { areaById, npcPosition } from '../worldLayout'
import { TOON } from '../../toon/palette'
import { toonMaterial } from '../../toon/materials'
import { geo } from '../../toon/geometry'
import { TBox, TCapsule, TCone, TCyl, TSphere, TTorus } from '../../toon/shapes'
import { Lamp, Signpost, Tree } from '../../toon/props'
import { ToonInstances, type InstanceSpec } from '../../toon/Scatter'
import Camel from './division-dunes/Camel'
import { BARRELS, DUNES, LAMP, MARKET, OASIS, PALMS, SAGUAROS, SAND, SIGN } from './division-dunes/layout'
import { Decal } from './fraction-falls/kit'
import { arcStrokes, blobDisc, stripedCone } from './fraction-falls/shapes'

const DUNE = '#efcf92'
const DUNE_LIGHT = '#f9e6bb'
const CACTUS = '#6cbf7a'
const ORANGE = '#ffa63d'
const RUG = TOON.roofTeal
const TENT_A = TOON.coral
const TENT_B = TOON.wallCream
/** Wind ripples drawn on the sand: pairs of gentle arcs bulging east (world x, z of each pair). */
const RIPPLE_SPOTS: [number, number][] = [
  [-23.2, 0.0],
  [-27.9, 0.9],
  [-28.3, -3.6],
  [-24.6, 5.5],
  [-26.3, 5.2],
  [-21.9, 3.6],
  [-29.7, 0.5],
  [-30.6, -4.6],
]
const RIPPLE_R = 2.4
const RIPPLES = arcStrokes(
  'division-dunes',
  RIPPLE_SPOTS.flatMap(([x, z]) =>
    [0, 0.24].map((dx): [number, number, number, number, number, number] => [x + dx - RIPPLE_R, z, RIPPLE_R, 0.09, -0.24, 0.48]),
  ),
)

/** The three baskets' x positions along the rug (market frame). */
const BASKETS = [-1.05, 0, 1.05]

/** A rounded saguaro with two raised arms and a pink flower on top. */
function Saguaro({ x, z, h, rot }: { x: number; z: number; h: number; rot: number }) {
  const r = 0.18
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <TCapsule radius={r} length={h - r * 2} position={[0, h / 2, 0]} color={CACTUS} outline flat segments={8} />
      <TCapsule radius={0.11} length={0.2} position={[0.25, h * 0.42, 0]} rotation={[0, 0, Math.PI / 2]} color={CACTUS} flat segments={8} />
      <TCapsule radius={0.11} length={0.28} position={[0.38, h * 0.42 + 0.19, 0]} color={CACTUS} flat segments={8} />
      {h > 1.3 && (
        <>
          <TCapsule radius={0.1} length={0.16} position={[-0.23, h * 0.6, 0]} rotation={[0, 0, Math.PI / 2]} color={CACTUS} flat segments={8} />
          <TCapsule radius={0.1} length={0.2} position={[-0.35, h * 0.6 + 0.14, 0]} color={CACTUS} flat segments={8} />
        </>
      )}
      <TSphere position={[0, h + 0.02, 0]} scale={[0.09, 0.06, 0.09]} color={TOON.flowerPink} castShadow={false} segments={8} />
    </group>
  )
}

/** A soft sand dune: a broad mound with a lighter crest. */
function Dune({ x, z, sx, sz, h, rot }: { x: number; z: number; sx: number; sz: number; h: number; rot: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <TSphere scale={[sx, h, sz]} position={[0, -h * 0.15, 0]} color={DUNE} segments={20} receiveShadow />
      <TSphere scale={[sx * 0.62, h * 0.55, sz * 0.5]} position={[-sx * 0.18, h * 0.38, -sz * 0.2]} color={DUNE_LIGHT} segments={16} receiveShadow />
    </group>
  )
}

/** The oasis: grass ring, wet sand, a deep-blue middle, reeds and palms. */
function Oasis() {
  const reeds = useMemo(() => {
    const out: InstanceSpec[] = []
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + (i % 3) * 0.15
      const rr = OASIS.r + 0.15 + (i % 2) * 0.2
      out.push({ x: OASIS.x + Math.cos(a) * rr, y: 0.18, z: OASIS.z + Math.sin(a) * rr, s: [0.06, 0.36 + (i % 3) * 0.08, 0.06], rot: i, color: i % 2 ? TOON.grassDark : TOON.leafDark })
    }
    return out
  }, [])
  return (
    <group>
      <Decal geometry={blobDisc(OASIS.r + 1.05, 0.14, 21)} color={TOON.grassLight} position={[OASIS.x, 0.009, OASIS.z]} />
      <Decal geometry={blobDisc(OASIS.r + 0.4, 0.1, 22)} color={TOON.sandWet} position={[OASIS.x, 0.012, OASIS.z]} />
      <Decal geometry={blobDisc(OASIS.r, 0.08, 23)} color={TOON.water} position={[OASIS.x, 0.02, OASIS.z]} />
      <Decal geometry={blobDisc(OASIS.r * 0.5, 0.15, 24)} color={TOON.waterDeep} position={[OASIS.x - 0.15, 0.022, OASIS.z - 0.1]} />
      <TCyl radiusTop={0.26} height={0.03} position={[OASIS.x + 0.6, 0.035, OASIS.z + 0.55]} color={TOON.leafDark} castShadow={false} segments={10} />
      <TSphere position={[OASIS.x + 0.6, 0.09, OASIS.z + 0.55]} scale={[0.09, 0.06, 0.09]} color={TOON.flowerWhite} castShadow={false} segments={8} />
      <ToonInstances geometry={geo.cone(1, 1, 4)} color={TOON.white} items={reeds} castShadow={false} />
      {PALMS.map((p, i) => (
        <Tree key={i} variant="palm" position={[p.x, 0, p.z]} rotation={p.rot} scale={p.s} seed={40 + i} outline={i === 0} />
      ))}
    </group>
  )
}

/**
 * The fruit market (local frame: +x across the view, +z toward the camera): a
 * candy-striped tent, and in front of it a rug with 3 baskets of 4 oranges each —
 * twelve oranges shared out equally — plus a chalk easel showing the same split.
 */
function Market() {
  const [roofA, roofB] = stripedCone(0, 1.35, 1.15, 12, 2)
  const { fruit, leaves, scallops, dots } = useMemo(() => {
    const fruit: InstanceSpec[] = []
    const leaves: InstanceSpec[] = []
    for (const bx of BASKETS) {
      for (const [dx, dz] of [
        [-0.14, -0.14],
        [0.14, -0.14],
        [-0.14, 0.14],
        [0.14, 0.14],
      ]) {
        const x = bx + dx
        const z = 0.3 + dz
        fruit.push({ x, y: 0.44, z, s: 0.13 })
        leaves.push({ x: x + 0.03, y: 0.58, z, s: [0.06, 0.022, 0.035], rot: x * 3 + z })
      }
    }
    const scallops: InstanceSpec[] = []
    for (let i = 0; i < 12; i++) {
      const a = ((i + 0.5) / 12) * Math.PI * 2
      scallops.push({ x: Math.sin(a) * 1.3, y: 1.16, z: -1.35 + Math.cos(a) * 1.3, s: [0.15, 0.12, 0.15], color: i % 2 ? TENT_A : TENT_B })
    }
    // the easel's chalk dots: 3 groups of 4
    const dots: InstanceSpec[] = []
    for (const gx of [-0.22, 0, 0.22]) {
      for (const [dx, dy] of [
        [-0.04, 0.04],
        [0.04, 0.04],
        [-0.04, -0.04],
        [0.04, -0.04],
      ]) {
        dots.push({ x: gx + dx, y: dy, z: 0, s: 0.026 })
      }
    }
    return { fruit, leaves, scallops, dots }
  }, [])

  return (
    <group position={[MARKET.x, 0, MARKET.z]} rotation={[0, MARKET.yaw, 0]}>
      {/* tent */}
      <group position={[0, 0, -1.35]}>
        <TCyl radiusTop={0.98} radiusBottom={1.02} height={1.15} position={[0, 0.575, 0]} color={TENT_B} outline segments={16} />
        <TBox size={[0.56, 0.82, 0.12]} radius={0.06} position={[0, 0.41, 0.95]} color={'#8a4f3c'} castShadow={false} />
        <TBox size={[0.7, 0.1, 0.14]} radius={0.04} position={[0, 0.86, 0.96]} color={TENT_A} castShadow={false} />
        <mesh geometry={roofA} material={toonMaterial(TENT_A)} position={[0, 1.15 + 0.575, 0]} castShadow />
        <mesh geometry={roofB} material={toonMaterial(TENT_B)} position={[0, 1.15 + 0.575, 0]} castShadow />
        <TCyl radiusTop={0.03} height={0.5} position={[0, 2.5, 0]} color={TOON.woodDark} castShadow={false} />
        <TSphere position={[0, 2.32, 0]} scale={0.09} color={TOON.gold} castShadow={false} />
        <TCone radius={0.16} height={0.4} segments={3} position={[0.2, 2.62, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[1, 1, 0.15]} color={TOON.roofTeal} castShadow={false} />
      </group>
      <ToonInstances geometry={geo.sphere(8)} color={TOON.white} items={scallops} castShadow={false} />

      {/* rug */}
      <TBox size={[3.5, 0.04, 1.25]} radius={0.02} position={[0, 0.02, 0.3]} color={RUG} receiveShadow castShadow={false} />
      <TBox size={[3.52, 0.045, 0.1]} radius={0.02} position={[0, 0.022, -0.17]} color={TOON.flowerYellow} castShadow={false} />
      <TBox size={[3.52, 0.045, 0.1]} radius={0.02} position={[0, 0.022, 0.77]} color={TOON.flowerYellow} castShadow={false} />

      {/* 3 baskets × 4 oranges */}
      {BASKETS.map((x) => (
        <group key={x} position={[x, 0.04, 0.3]}>
          <TCyl radiusTop={0.37} radiusBottom={0.28} height={0.34} position={[0, 0.17, 0]} color={TOON.woodLight} outline segments={12} />
          <TCyl radiusTop={0.345} radiusBottom={0.32} height={0.08} position={[0, 0.17, 0]} color={TOON.wood} castShadow={false} segments={12} />
          <TTorus radius={0.36} tube={0.04} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.34, 0]} color={TOON.woodDark} castShadow={false} segments={16} />
        </group>
      ))}
      <ToonInstances geometry={geo.sphere(10)} color={ORANGE} items={fruit} />
      <ToonInstances geometry={geo.blob(0)} color={TOON.leaf} items={leaves} castShadow={false} />

      {/* chalk easel: the same 12 dots in 3 equal groups */}
      <group position={[2.25, 0, 0.05]} rotation={[0, -0.35, 0]}>
        <TCyl radiusTop={0.03} height={1.05} position={[-0.25, 0.5, 0.06]} rotation={[-0.12, 0, 0.1]} color={TOON.woodDark} castShadow={false} />
        <TCyl radiusTop={0.03} height={1.05} position={[0.25, 0.5, 0.06]} rotation={[-0.12, 0, -0.1]} color={TOON.woodDark} castShadow={false} />
        <TCyl radiusTop={0.03} height={1.0} position={[0, 0.48, -0.2]} rotation={[0.3, 0, 0]} color={TOON.woodDark} castShadow={false} />
        <group position={[0, 0.78, 0.07]} rotation={[-0.12, 0, 0]}>
          <TBox size={[0.82, 0.48, 0.06]} radius={0.03} color={TOON.wood} outline />
          <TBox size={[0.72, 0.38, 0.04]} radius={0.015} position={[0, 0, 0.02]} color={'#3f6b5a'} castShadow={false} />
          <group position={[0, 0, 0.045]}>
            <ToonInstances geometry={geo.sphere(6)} color={TOON.flowerWhite} items={dots} castShadow={false} />
            {[-0.22, 0, 0.22].map((gx) => (
              <TTorus key={gx} radius={0.085} tube={0.012} position={[gx, 0, 0]} color={TOON.flowerYellow} castShadow={false} segments={16} />
            ))}
          </group>
        </group>
      </group>
    </group>
  )
}

/** Division Dunes: soft dunes, cacti and a palm oasis, with a fruit market that shares 12 oranges into 3 equal baskets. */
export default function DivisionDunes({ posRef }: { posRef: RefObject<Vector3> }) {
  const a = areaById('division-dunes')!
  const npc = npcPosition(a)!
  return (
    <group>
      <Decal geometry={blobDisc(SAND.r + 0.45, 0.12, 11)} color={TOON.sandWet} position={[SAND.x, 0.006, SAND.z]} />
      <Decal geometry={blobDisc(SAND.r, 0.12, 11)} color={TOON.sand} position={[SAND.x, 0.007, SAND.z]} />
      <Decal geometry={RIPPLES} color={'#e6c88f'} position={[0, 0.0085, 0]} />

      {DUNES.map((d, i) => (
        <Dune key={i} {...d} />
      ))}
      <Oasis />
      <Market />
      {SAGUAROS.map((c, i) => (
        <Saguaro key={i} {...c} />
      ))}
      {BARRELS.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]}>
          <TSphere scale={[b.s, b.s * 0.9, b.s]} position={[0, b.s * 0.75, 0]} color={CACTUS} flat segments={10} />
          <TSphere position={[0, b.s * 1.6, 0]} scale={[0.07, 0.05, 0.07]} color={i % 2 ? TOON.flowerYellow : TOON.flowerPink} castShadow={false} segments={8} />
        </group>
      ))}

      <group position={[SIGN.x, 0, SIGN.z]} rotation={[0, 0.9, 0]}>
        <Signpost color={TOON.sand} />
      </group>
      <Lamp position={[LAMP.x, 0, LAMP.z]} />

      <Npc areaId={a.id} zoneId={a.zoneId} hub={a.hub} label={a.label} position={[npc[0], 0, npc[1]]} posRef={posRef} facing={1.75}>
        <Camel headTurn={-0.85} />
      </Npc>
    </group>
  )
}

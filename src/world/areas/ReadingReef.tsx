import { useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { CircleGeometry } from 'three'
import type { Group, Vector3 } from 'three'
import Npc from '../Npc'
import { areaById, npcPosition } from '../worldLayout'
import { seededRng } from '../../lib/random'
import { TOON } from '../../toon/palette'
import { geo } from '../../toon/geometry'
import { toonMaterial } from '../../toon/materials'
import { TBox, TCone, TCyl, TSphere, TTorus } from '../../toon/shapes'
import { Parts } from './word-problem-woods/storyKit'
import type { Part } from './word-problem-woods/instancing'
import { starfishGeometry } from './word-problem-woods/storyGeometry'
import Beach from './reading-reef/Beach'
import BookHut from './reading-reef/BookHut'
import Lighthouse from './reading-reef/Lighthouse'
import TurtleReader from './reading-reef/TurtleReader'
import { coralCluster } from './reading-reef/coral'
import { BALL, PALMS, POOL, TOWEL, UMBRELLA } from './reading-reef/layout'

// ── Palms (all five in a handful of draw calls) ─────────────────────────────

function buildPalms() {
  const trunk: Part[] = []
  const fronds: Part[] = []
  const nuts: Part[] = []
  const FROND_COLORS = [TOON.leaf, TOON.leafDark, TOON.leafLight]
  PALMS.forEach((pm, n) => {
    const r = seededRng(`reef-palm:${n}`)
    const s = pm.s
    const H = 3.1 * s
    const lx = Math.sin(pm.yaw)
    const lz = Math.cos(pm.yaw)
    const bend = (t: number) => pm.lean * H * 0.75 * t * t
    const SEG = 6
    for (let k = 0; k < SEG; k++) {
      const t = (k + 0.5) / SEG
      const tilt = Math.atan(pm.lean * 0.75 * 2 * t)
      trunk.push({
        p: [pm.x + lx * bend(t), H * t, pm.z + lz * bend(t)],
        r: [0, pm.yaw - Math.PI / 2, -tilt],
        s: [0.19 * s * (1 - k * 0.07), ((H / SEG) * 1.06) / Math.cos(tilt), 0.19 * s * (1 - k * 0.07)],
        c: k % 2 ? TOON.bark : TOON.woodDark,
      })
    }
    const tx = pm.x + lx * bend(1)
    const tz = pm.z + lz * bend(1)
    fronds.push({ p: [tx, H + 0.02 * s, tz], s: 0.24 * s, c: TOON.leafDark })
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + r() * 0.4
      const c = FROND_COLORS[k % 3]
      fronds.push({ p: [tx + Math.cos(a) * 0.5 * s, H + 0.04 * s, tz + Math.sin(a) * 0.5 * s], r: [0, -a, -0.22], s: [0.56 * s, 0.09 * s, 0.2 * s], c })
      fronds.push({ p: [tx + Math.cos(a) * 1.05 * s, H - 0.24 * s, tz + Math.sin(a) * 1.05 * s], r: [0, -a, -0.7], s: [0.48 * s, 0.08 * s, 0.17 * s], c })
    }
    for (let k = 0; k < 3; k++) {
      const b = (k / 3) * Math.PI * 2 + 0.5
      nuts.push({ p: [tx + Math.cos(b) * 0.17 * s, H - 0.14 * s, tz + Math.sin(b) * 0.17 * s], s: 0.11 * s })
    }
  })
  return { trunk, fronds, nuts }
}
const PALM_PARTS = buildPalms()

// ── Shells & starfish on the sand ───────────────────────────────────────────

const STAR_SPOTS: [number, number, string][] = [
  [23.1, 7.5, TOON.coral], [26.7, 11.9, TOON.flowerYellow], [30.0, 13.4, TOON.flowerPink], [27.4, 4.4, TOON.lilac],
  [31.2, 9.0, TOON.flowerYellow], [25.3, 6.1, TOON.flowerPink], [33.1, 12.9, TOON.coral], [35.0, 6.2, TOON.lilac],
]
const STARFISH: Part[] = STAR_SPOTS.map(([x, z, c], i) => ({ p: [x, 0.05, z], r: [0, i * 1.3, 0], s: 0.36 + (i % 3) * 0.05, c }))
const SHELL_SPOTS: [number, number][] = [
  [22.5, 8.8], [24.1, 12.0], [27.0, 11.2], [29.0, 12.0], [31.5, 14.4], [27.7, 9.0], [23.2, 4.7], [21.9, 11.0], [33.5, 8.0], [34.6, 12.0],
]
const SHELL_COLORS = [TOON.blossomLight, TOON.flowerWhite, '#ffd9c4', TOON.lilac]
const SHELL_CONES: Part[] = SHELL_SPOTS.map(([x, z], i) => ({ p: [x, 0.08, z], r: [Math.PI / 2 - 0.25, i * 1.7, 0], s: [0.085, 0.2, 0.085], c: SHELL_COLORS[i % SHELL_COLORS.length] }))
const SHELL_LIPS: Part[] = SHELL_SPOTS.map(([x, z], i) => {
  const a = i * 1.7
  return { p: [x - Math.sin(a) * 0.1, 0.07, z - Math.cos(a) * 0.1], s: [0.08, 0.06, 0.08], c: SHELL_COLORS[(i + 1) % SHELL_COLORS.length] }
})

// ── Tide pool: rock rim, water, coral and two little fish ───────────────────

const POOL_ROCKS: Part[] = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2 + (i % 2) * 0.15
  const s = 0.32 + ((i * 7) % 5) * 0.04
  return { p: [POOL.x + Math.cos(a) * POOL.r, s * 0.4, POOL.z + Math.sin(a) * POOL.r], r: [0, i, 0], s: [s * 1.2, s * 0.8, s], c: i % 3 ? TOON.rock : TOON.rockLight }
})
const POOL_CORAL = (() => {
  const fingers: Part[] = []
  const blobs: Part[] = []
  coralCluster(POOL.x - 0.45, 0.02, POOL.z - 0.3, 0.75, 'pool-coral:0', fingers, blobs)
  coralCluster(POOL.x + 0.5, 0.02, POOL.z + 0.35, 0.7, 'pool-coral:1', fingers, blobs)
  coralCluster(POOL.x + 0.15, 0.02, POOL.z - 0.75, 0.55, 'pool-coral:2', fingers, blobs)
  return { fingers, blobs }
})()

function Fish({ radius, speed, phase, color }: { radius: number; speed: number; phase: number; color: string }) {
  const ref = useRef<Group>(null)
  useFrame(({ clock }) => {
    const g = ref.current
    if (!g) return
    const t = clock.elapsedTime * speed + phase
    g.position.set(POOL.x + Math.cos(t) * radius, 0.07, POOL.z + Math.sin(t) * radius)
    g.rotation.y = -t + (speed > 0 ? 0 : Math.PI) + Math.sin(clock.elapsedTime * 8) * 0.15
  })
  return (
    <group ref={ref}>
      <TSphere scale={[0.07, 0.06, 0.13]} color={color} castShadow={false} segments={8} />
      <TCone radius={0.07} height={0.1} position={[0, 0, -0.15]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1, 0.35]} color={color} castShadow={false} segments={4} />
    </group>
  )
}

function TidePool() {
  const geos = useMemo(() => {
    const water = new CircleGeometry(POOL.r - 0.05, 24)
    water.rotateX(-Math.PI / 2)
    const deep = new CircleGeometry(POOL.r * 0.55, 20)
    deep.rotateX(-Math.PI / 2)
    return { water, deep }
  }, [])
  return (
    <group>
      <mesh geometry={geos.water} position={[POOL.x, 0.025, POOL.z]} material={toonMaterial(TOON.waterShallow)} receiveShadow />
      <mesh geometry={geos.deep} position={[POOL.x + 0.1, 0.029, POOL.z + 0.05]} material={toonMaterial(TOON.water)} receiveShadow />
      <Parts geometry={geo.blob(1)} items={POOL_ROCKS} flat />
      <Parts geometry={geo.capsule(0.5, 1, 6)} items={POOL_CORAL.fingers} castShadow={false} />
      <Parts geometry={geo.blob(1)} items={POOL_CORAL.blobs} flat castShadow={false} />
      <Fish radius={0.75} speed={0.9} phase={0} color={TOON.roofOrange} />
      <Fish radius={0.5} speed={-1.2} phase={2} color={TOON.flowerYellow} />
    </group>
  )
}

// ── Umbrella, towel with a book, beach ball ─────────────────────────────────

function BeachSpot() {
  const stripes: Part[] = useMemo(
    () => [-0.33, -0.11, 0.11, 0.33].map((x, i) => ({ p: [x, 0.012, 0], s: [0.225, 0.02, 1.7], c: i % 2 ? TOON.flowerWhite : TOON.flowerBlue })),
    [],
  )
  return (
    <group>
      {/* striped umbrella: two offset cones make the stripes */}
      <group position={[UMBRELLA.x, 0, UMBRELLA.z]} rotation={[0.1, 0, -0.12]}>
        <TCyl radiusTop={0.04} height={2.35} position={[0, 1.17, 0]} color={TOON.flowerWhite} />
        <TCone radius={1.25} height={0.5} position={[0, 2.18, 0]} color={TOON.flowerRed} outline segments={8} />
        <TCone radius={1.25} height={0.5} position={[0, 2.18, 0]} rotation={[0, Math.PI / 8, 0]} color={TOON.flowerWhite} segments={8} />
        <TSphere position={[0, 2.47, 0]} scale={0.07} color={TOON.flowerRed} castShadow={false} />
      </group>
      {/* towel with an open book left face-down, and sunglasses */}
      <group position={[TOWEL.x, 0, TOWEL.z]} rotation={[0, TOWEL.yaw, 0]}>
        <Parts geometry={geo.box(1, 1, 1, 0.2)} items={stripes} castShadow={false} receiveShadow />
        <TBox size={[0.3, 0.025, 0.4]} radius={0.01} position={[-0.12, 0.09, 0.35]} rotation={[0, 0, 0.55]} color={TOON.roofTeal} castShadow={false} />
        <TBox size={[0.3, 0.025, 0.4]} radius={0.01} position={[0.12, 0.09, 0.35]} rotation={[0, 0, -0.55]} color={TOON.roofTeal} castShadow={false} />
        <TSphere position={[-0.08, 0.04, -0.45]} scale={[0.07, 0.025, 0.06]} color={TOON.eye} castShadow={false} segments={8} />
        <TSphere position={[0.08, 0.04, -0.45]} scale={[0.07, 0.025, 0.06]} color={TOON.eye} castShadow={false} segments={8} />
        <TBox size={[0.06, 0.02, 0.02]} radius={0.008} position={[0, 0.05, -0.45]} color={TOON.eye} castShadow={false} />
      </group>
      {/* beach ball */}
      <group position={[BALL.x, BALL.r, BALL.z]} rotation={[0.3, 0.6, 0.2]}>
        <TSphere scale={BALL.r} color={TOON.flowerWhite} outline segments={14} />
        <TTorus radius={BALL.r * 0.98} tube={0.075} color={TOON.flowerRed} castShadow={false} segments={20} />
        <TTorus radius={BALL.r * 0.98} tube={0.075} rotation={[0, Math.PI / 2, 0]} color={TOON.flowerBlue} castShadow={false} segments={20} />
      </group>
    </group>
  )
}

/**
 * Reading Reef — a sunny beach on the east coast: sand sweeping from the path
 * down a slope into a pale lagoon with candy coral along the waterline, a jetty
 * with a rowboat, palms, a striped umbrella and towel (with a book left on it),
 * a book-swap beach hut, a tide pool with fish, shells and starfish, and a
 * lighthouse on the point. The sea-turtle professor reads by the path's end.
 */
export default function ReadingReef({ posRef }: { posRef: RefObject<Vector3> }) {
  const a = areaById('reading-reef')!
  const npc = npcPosition(a)!
  return (
    <group>
      <Beach />
      <BookHut />
      <Lighthouse />
      <TidePool />
      <BeachSpot />

      <Parts geometry={geo.cyl(0.85, 1, 1, 7)} items={PALM_PARTS.trunk} />
      <Parts geometry={geo.blob(1)} items={PALM_PARTS.fronds} flat outline />
      <Parts geometry={geo.sphere(8)} items={PALM_PARTS.nuts} color={TOON.woodDark} castShadow={false} />

      <Parts geometry={starfishGeometry()} items={STARFISH} castShadow={false} />
      <Parts geometry={geo.cone(1, 1, 7)} items={SHELL_CONES} flat castShadow={false} />
      <Parts geometry={geo.sphere(8)} items={SHELL_LIPS} castShadow={false} />

      <Npc areaId={a.id} zoneId={a.zoneId} hub={a.hub} label={a.label} position={[npc[0], 0, npc[1]]} posRef={posRef}>
        <TurtleReader />
      </Npc>
    </group>
  )
}

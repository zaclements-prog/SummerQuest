import { useMemo } from 'react'
import { BufferAttribute, BufferGeometry } from 'three'
import { TOON } from '../../../toon/palette'
import { geo } from '../../../toon/geometry'
import { toonMaterial } from '../../../toon/materials'
import { TBox, TCyl, TTorus } from '../../../toon/shapes'
import { coastRadius, OCEAN_Y } from '../../worldLayout'
import { Parts } from '../word-problem-woods/storyKit'
import type { Part } from '../word-problem-woods/instancing'
import { flatPolygon } from '../word-problem-woods/storyGeometry'
import { BEACH, JETTY_THETA, SAND_EDGE } from './layout'
import { coralCluster } from './coral'

const { thetaFrom: T0, thetaTo: T1 } = BEACH

/** How far the beach slope reaches out at angle θ (1 mid-beach, tapering to 0 at both ends). */
function reach(theta: number): number {
  const u = (theta - T0) / (T1 - T0)
  return Math.pow(Math.max(0, Math.sin(Math.PI * u)), 0.7)
}
const at = (theta: number, r: number): [number, number] => [Math.cos(theta) * r, Math.sin(theta) * r]

/**
 * The slope from the grass top down into the sea: (offset beyond the coast, height).
 * Offsets past the rim scale with `reach`, so the slope narrows into the cliff at
 * both ends of the beach. It stays just above the island's rounded rim.
 */
const PROFILE: [number, number][] = [
  [-0.4, 0.017], [0, 0.017], [0.45, -0.03], [1.4, -0.42], [2.8, -1.25], [4.4, -2.2], [5.9, -2.95], [7.0, -3.5],
]
const WATERLINE = 6.35 // where the slope dips under the sea (offset at reach = 1)

/** A strip of the slope between profile rows j0..j1, one column per θ step. */
function slope(j0: number, j1: number): BufferGeometry {
  const N = 48
  const pos: number[] = []
  const idx: number[] = []
  const rows = j1 - j0 + 1
  for (let i = 0; i <= N; i++) {
    const theta = T0 + ((T1 - T0) * i) / N
    const rc = coastRadius(theta)
    const f = reach(theta)
    for (let j = j0; j <= j1; j++) {
      const [d, h] = PROFILE[j]
      const off = d <= 0 ? d : Math.max(d * f, d * 0.06)
      const [x, z] = at(theta, rc + off)
      pos.push(x, h, z)
    }
    if (i < N) {
      for (let j = 0; j < rows - 1; j++) {
        const a = i * rows + j
        const b = a + rows
        idx.push(a, b, a + 1, a + 1, b, b + 1)
      }
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** A flat band following the beach at height y between offsets inner(θ)..outer(θ) from the coast. */
function band(inner: (f: number) => number, outer: (f: number) => number, y: number, from = T0, to = T1): BufferGeometry {
  const N = 48
  const outerPts: [number, number][] = []
  const innerPts: [number, number][] = []
  for (let i = 0; i <= N; i++) {
    const theta = from + ((to - from) * i) / N
    const rc = coastRadius(theta)
    const f = reach(theta)
    outerPts.push(at(theta, rc + outer(f)))
    innerPts.push(at(theta, rc + inner(f)))
  }
  return flatPolygon([...outerPts, ...innerPts.reverse()], y)
}

/** The sand: from SAND_EDGE (by the NPC) out to the coastline. */
function sandPoints(): [number, number][] {
  const coast: [number, number][] = []
  for (let i = 0; i <= 40; i++) {
    const theta = T1 - ((T1 - T0) * i) / 40
    coast.push(at(theta, coastRadius(theta) - 0.08))
  }
  return [...SAND_EDGE, ...coast]
}

// ── Candy coral along the waterline ─────────────────────────────────────────

/** Coral clusters along the waterline in front of the beach (kept off the jetty). */
function buildReef() {
  const fingers: Part[] = []
  const blobs: Part[] = []
  const spots: [number, number][] = [
    [0.11, 7.0], [0.14, 8.8], [0.17, 6.9], [0.2, 8.0], [0.23, 9.6], [0.25, 7.0], [0.33, 7.0], [0.35, 9.0],
    [0.38, 7.2], [0.41, 8.4], [0.44, 7.0], [0.47, 8.6], [0.26, 11.0], [0.32, 11.6], [0.18, 10.8], [0.4, 10.6],
  ]
  spots.forEach(([theta, off], i) => {
    if (Math.abs(theta - JETTY_THETA) < 0.025) return
    const f = Math.max(reach(theta), 0.35)
    const [x, z] = at(theta, coastRadius(theta) + off * f)
    coralCluster(x, OCEAN_Y - 0.15, z, 1.35, `reef-coral:${i}`, fingers, blobs)
  })
  return { fingers, blobs }
}
const REEF = buildReef()

// ── Jetty + rowboat (in the jetty's frame: local +z runs out to sea) ─────────

const JETTY_START = 5.4 // offset beyond the coast
const JETTY_LEN = 4.6
const DECK_Y = OCEAN_Y + 0.36
const PLANKS: Part[] = Array.from({ length: 10 }, (_, i) => ({
  p: [0, DECK_Y - 0.05, 0.25 + i * (JETTY_LEN / 10)],
  r: [0, (i % 3 - 1) * 0.02, 0],
  s: [1.25, 0.1, JETTY_LEN / 10 - 0.05],
  c: i % 2 ? TOON.wood : TOON.woodLight,
}))
const POSTS: Part[] = [0.35, 2.35, 4.4].flatMap((z) => [-0.68, 0.68].map((x): Part => ({ p: [x, DECK_Y - 0.25, z], s: [1, 1, 1] })))

function Rowboat() {
  return (
    <group position={[1.45, OCEAN_Y, 3.3]} rotation={[0, 0.12, 0]}>
      <TCyl radiusTop={0.95} radiusBottom={0.7} height={0.42} position={[0, 0.1, 0]} scale={[0.5, 1, 1]} color={TOON.roofBlue} outline segments={16} />
      <TCyl radiusTop={0.86} radiusBottom={0.86} height={0.03} position={[0, 0.3, 0]} scale={[0.43, 1, 0.93]} color={TOON.woodLight} castShadow={false} segments={16} />
      <TTorus radius={0.93} tube={0.05} position={[0, 0.32, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.5, 1, 1]} color={TOON.flowerWhite} castShadow={false} segments={24} />
      <TBox size={[0.8, 0.06, 0.18]} radius={0.02} position={[0, 0.36, 0.3]} color={TOON.wood} castShadow={false} />
      <TBox size={[0.8, 0.06, 0.18]} radius={0.02} position={[0, 0.36, -0.35]} color={TOON.wood} castShadow={false} />
      {/* oars resting across the boat */}
      <TCyl radiusTop={0.025} height={1.7} position={[0.05, 0.42, 0]} rotation={[Math.PI / 2, 0, 0.25]} color={TOON.woodDark} castShadow={false} segments={5} />
      <TBox size={[0.16, 0.03, 0.34]} radius={0.01} position={[0.23, 0.42, 0.78]} rotation={[0, 0.25, 0]} color={TOON.woodDark} castShadow={false} />
      {/* mooring rope to the jetty */}
      <TCyl radiusTop={0.02} height={0.9} position={[-0.55, 0.42, 0.55]} rotation={[0, 0, Math.PI / 2 - 0.25]} color={TOON.woodLight} castShadow={false} segments={4} />
    </group>
  )
}

/**
 * The beach itself: sand from the NPC to the coast, then the slope (wet sand
 * at its foot) down into a pale lagoon with a foam line, candy coral along the
 * waterline, and a little jetty with a rowboat tied up.
 */
export default function Beach() {
  const geos = useMemo(
    () => ({
      sand: flatPolygon(sandPoints(), 0.016),
      slopeDry: slope(0, 3),
      slopeWet: slope(3, 7),
      lagoon: band((f) => Math.max(WATERLINE * f - 0.2, 0.9), (f) => Math.max((WATERLINE + 4.5) * f, 1.4), OCEAN_Y + 0.05),
      foam: band((f) => Math.max(WATERLINE * f - 0.12, 0.15), (f) => Math.max(WATERLINE * f + 0.42, 0.9), OCEAN_Y + 0.07),
    }),
    [],
  )
  const jetty = useMemo(() => {
    const rc = coastRadius(JETTY_THETA)
    const [x, z] = at(JETTY_THETA, rc + JETTY_START)
    // local +z → the jetty's outward direction (cos θ, sin θ)
    return { x, z, yaw: Math.atan2(Math.cos(JETTY_THETA), Math.sin(JETTY_THETA)) }
  }, [])

  return (
    <group>
      <mesh geometry={geos.sand} material={toonMaterial(TOON.sand)} receiveShadow />
      <mesh geometry={geos.slopeDry} material={toonMaterial(TOON.sand)} receiveShadow />
      <mesh geometry={geos.slopeWet} material={toonMaterial(TOON.sandWet)} receiveShadow />
      <mesh geometry={geos.lagoon} material={toonMaterial(TOON.waterShallow)} receiveShadow />
      <mesh geometry={geos.foam} material={toonMaterial(TOON.foam)} />

      <Parts geometry={geo.capsule(0.5, 1, 6)} items={REEF.fingers} castShadow={false} />
      <Parts geometry={geo.blob(1)} items={REEF.blobs} flat castShadow={false} />

      <group position={[jetty.x, 0, jetty.z]} rotation={[0, jetty.yaw, 0]}>
        <Parts geometry={geo.box(1, 1, 1, 0.12)} items={PLANKS} outline receiveShadow />
        <Parts geometry={geo.cyl(0.11, 0.13, 1.0, 7)} items={POSTS} color={TOON.woodDark} />
        <Rowboat />
      </group>
    </group>
  )
}

import { useLayoutEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Outlines } from '@react-three/drei'
import type { InstancedMesh, Vector3 } from 'three'
import Npc from '../Npc'
import { areaById, npcPosition } from '../worldLayout'
import { seededRng } from '../../lib/random'
import { TOON } from '../../toon/palette'
import { geo } from '../../toon/geometry'
import { OUTLINE, toonMaterial } from '../../toon/materials'
import { TBox, TCyl } from '../../toon/shapes'
import { Log } from '../../toon/props'
import { Parts } from './word-problem-woods/storyKit'
import { setInstance, writeParts, type Part } from './word-problem-woods/instancing'
import { flatPolygon, questionMarkGeometry } from './word-problem-woods/storyGeometry'
import StorybookTree from './word-problem-woods/StorybookTree'
import RaccoonDetective from './word-problem-woods/RaccoonDetective'
import {
  LANTERN_POSTS, LOGS, MUSHROOM_RING_R, RING_TREES, SIGNPOSTS, STUMP, TOADSTOOLS, type WoodsTreeKind,
} from './word-problem-woods/layout'

// ── Layout-derived batches (built once at module load; all deterministic) ────

const CLEARING = { x: 2.3, z: 24.6 }

const TREE_COLORS: Record<WoodsTreeKind, string[]> = {
  leaf: [TOON.leaf, TOON.leafLight, TOON.leafDark],
  autumn: [TOON.autumn, TOON.flowerYellow, TOON.coral],
  blossom: [TOON.blossom, TOON.blossomLight, TOON.flowerPink],
}

/** Big chunky ring trees: unit trunks + four faceted canopy puffs each. */
function buildTrees() {
  const trunks: Part[] = []
  const canopy: Part[] = []
  RING_TREES.forEach((t, i) => {
    const r = seededRng(`woods-tree:${i}`)
    const s = t.s
    const h = (1.0 + r() * 0.3) * s
    trunks.push({ p: [t.x, h / 2, t.z], s: [0.22 * s, h, 0.22 * s] })
    const cols = TREE_COLORS[t.kind]
    canopy.push({ p: [t.x, h + 0.6 * s, t.z], s: 0.8 * s, r: [0, r() * 6, 0], c: cols[0] })
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + r() * 1.5
      canopy.push({
        p: [t.x + Math.cos(a) * 0.5 * s, h + (0.25 + r() * 0.35) * s, t.z + Math.sin(a) * 0.5 * s],
        s: (0.52 + r() * 0.14) * s,
        r: [r(), r() * 6, 0],
        c: cols[(k + 1) % 3],
      })
    }
  })
  return { trunks, canopy }
}
const TREES = buildTrees()

const BUSH_SPOTS: [number, number][] = [
  [-3.9, 19.6], [-4.5, 23.3], [-4.3, 27.7], [-3.0, 29.6], [0.6, 30.1], [4.3, 30.6],
  [7.0, 27.7], [7.9, 23.4], [5.5, 19.9], [-2.0, 18.6], [3.9, 28.9],
]
const BUSHES: Part[] = BUSH_SPOTS.flatMap(([x, z], i) => {
  const s = 0.42 + (i % 3) * 0.08
  return [
    { p: [x, s * 0.7, z], s: [s * 1.25, s, s * 1.1], r: [0, i, 0], c: i % 2 ? TOON.leafDark : TOON.leaf },
    { p: [x + 0.38, s * 0.55, z + 0.2], s: s * 0.75, r: [0, i * 2, 0], c: TOON.leafLight },
  ]
})

/** Flowers and grass tufts in a band round the clearing (kept off the path). */
function buildGroundCover() {
  const r = seededRng('woods-cover')
  const flowers: Part[] = []
  const tufts: Part[] = []
  const colors = [TOON.flowerPink, TOON.flowerYellow, TOON.flowerWhite, TOON.lilac, TOON.flowerBlue]
  let guard = 0
  while ((flowers.length < 44 || tufts.length < 22) && guard++ < 400) {
    const a = r() * Math.PI * 2
    const d = 2.4 + r() * 3.6
    const x = CLEARING.x + Math.cos(a) * d
    const z = CLEARING.z + Math.sin(a) * d
    if (z < 21.5 && Math.abs(x - 0.8) < 2.2) continue // the path + NPC approach
    if (Math.hypot(x - STUMP.x, z - STUMP.z) < MUSHROOM_RING_R + 0.5) continue
    if (r() < 0.62 && flowers.length < 44) {
      const c = colors[Math.floor(r() * colors.length)]
      for (let k = 0; k < 4 && flowers.length < 44; k++) {
        flowers.push({ p: [x + (r() - 0.5) * 0.8, 0.13 + r() * 0.06, z + (r() - 0.5) * 0.8], s: 0.075, c })
      }
    } else if (tufts.length < 22) {
      tufts.push({ p: [x, 0.13, z], s: [0.08, 0.28, 0.08], r: [0, r() * 6, 0], c: r() < 0.5 ? TOON.grassDark : TOON.leafDark })
    }
  }
  return { flowers, tufts }
}
const COVER = buildGroundCover()

/** The fairy ring: 12 little mushrooms round the riddle stump. */
function buildMushroomRing() {
  const r = seededRng('woods-ring')
  const stems: Part[] = []
  const caps: Part[] = []
  const spots: Part[] = []
  const colors = [TOON.flowerRed, TOON.flowerPink, TOON.lilac, TOON.coral]
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + (r() - 0.5) * 0.25
    const k = 1 + r() * 0.6
    const x = STUMP.x + Math.cos(a) * MUSHROOM_RING_R
    const z = STUMP.z + Math.sin(a) * MUSHROOM_RING_R
    stems.push({ p: [x, 0.1 * k, z], s: [0.055 * k, 0.2 * k, 0.055 * k] })
    caps.push({ p: [x, 0.21 * k, z], s: [0.15 * k, 0.1 * k, 0.15 * k], c: colors[i % colors.length] })
    spots.push({ p: [x + 0.05 * k, 0.29 * k, z + 0.04 * k], s: 0.025 * k })
    spots.push({ p: [x - 0.06 * k, 0.28 * k, z - 0.03 * k], s: 0.022 * k })
  }
  return { stems, caps, spots }
}
const RING = buildMushroomRing()

/** Giant toadstools: cream stems, outlined caps, white spots. */
const TOAD_COLORS = [TOON.flowerPurple, TOON.flowerRed, TOON.lilac]
const TOAD_STEMS: Part[] = TOADSTOOLS.map((t) => ({ p: [t.x, 0.5 * t.s, t.z], s: [0.2 * t.s, 1.0 * t.s, 0.2 * t.s] }))
const TOAD_CAPS: Part[] = TOADSTOOLS.map((t, i) => ({ p: [t.x, 1.05 * t.s, t.z], s: [0.62 * t.s, 0.4 * t.s, 0.62 * t.s], c: TOAD_COLORS[i % 3] }))
const TOAD_SPOTS: Part[] = TOADSTOOLS.flatMap((t) =>
  [0.4, 1.9, 3.3, 4.9].map((a, k) => ({
    p: [t.x + Math.cos(a) * 0.36 * t.s, (1.3 - (k % 2) * 0.06) * t.s, t.z + Math.sin(a) * 0.36 * t.s] as [number, number, number],
    s: 0.075 * t.s,
  })),
)

/** The "?" signposts: posts, arrow boards, arrow tips and a "?" on every board, batched. */
const rot = (lx: number, lz: number, yaw: number): [number, number] => [lx * Math.cos(yaw) + lz * Math.sin(yaw), -lx * Math.sin(yaw) + lz * Math.cos(yaw)]
const SIGN_POSTS: Part[] = SIGNPOSTS.map((p) => ({ p: [p.x, p.h / 2, p.z], s: [1, p.h, 1] }))
const SIGN_BOARDS: Part[] = []
const SIGN_TIPS: Part[] = []
const SIGN_GLYPHS: Part[] = []
for (const post of SIGNPOSTS) {
  for (const b of post.boards) {
    const at = (lx: number, lz: number): [number, number, number] => {
      const [dx, dz] = rot(lx, lz, b.yaw)
      return [post.x + dx, b.y, post.z + dz]
    }
    SIGN_BOARDS.push({ p: at(b.tip * 0.34, 0.06), r: [0, b.yaw, 0], s: [0.92, 0.3, 0.08], c: b.c })
    SIGN_TIPS.push({ p: at(b.tip * 0.88, 0.06), r: [0, b.yaw, (-b.tip * Math.PI) / 2], s: [0.24, 0.2, 0.06], c: b.c })
    SIGN_GLYPHS.push({ p: at(b.tip * 0.38, 0.12), r: [0, b.yaw, 0], s: 0.21 })
  }
}

/** Shepherd's-crook lantern posts flanking the path into the woods. */
const CROOK_POSTS: Part[] = LANTERN_POSTS.map((p) => ({ p: [p.x, 1.15, p.z], s: [1, 2.3, 1] }))
const CROOK_ARMS: Part[] = LANTERN_POSTS.map((p) => ({ p: [p.x + p.side * 0.32, 2.28, p.z], s: [0.72, 0.1, 0.1] }))
const CROOK_CURLS: Part[] = LANTERN_POSTS.map((p) => ({ p: [p.x + p.side * 0.68, 2.22, p.z], s: 0.09 }))
const CROOK_LANTERNS: Part[] = LANTERN_POSTS.map((p) => ({ p: [p.x + p.side * 0.62, 1.82, p.z], s: [0.24, 0.3, 0.24] }))
const CROOK_CAPS: Part[] = LANTERN_POSTS.map((p) => ({ p: [p.x + p.side * 0.62, 2.04, p.z], r: [0, Math.PI / 4, 0], s: [0.2, 0.16, 0.2] }))

// ── Animated bits ────────────────────────────────────────────────────────────

const FIREFLIES = (() => {
  const r = seededRng('woods-fireflies')
  return Array.from({ length: 18 }, () => ({
    x: -3.5 + r() * 10,
    z: 20.5 + r() * 9,
    y: 0.7 + r() * 2.2,
    ax: 0.4 + r() * 0.6,
    az: 0.4 + r() * 0.6,
    sp: 0.4 + r() * 0.5,
    ph: r() * 10,
  }))
})()

/** Fireflies drifting and twinkling over the clearing (one instanced draw call). */
function Fireflies() {
  const ref = useRef<InstancedMesh>(null)
  useFrame(({ clock }) => {
    const m = ref.current
    if (!m) return
    const t = clock.elapsedTime
    for (let i = 0; i < FIREFLIES.length; i++) {
      const f = FIREFLIES[i]
      const s = 0.055 + 0.035 * Math.max(0, Math.sin(t * 2.4 + f.ph * 3))
      setInstance(
        m, i,
        f.x + Math.sin(t * f.sp + f.ph) * f.ax,
        f.y + Math.sin(t * f.sp * 1.7 + f.ph) * 0.3,
        f.z + Math.cos(t * f.sp * 0.8 + f.ph) * f.az,
        0, 0, 0, s, s, s,
      )
    }
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh
      ref={ref}
      args={[geo.sphere(6), toonMaterial(TOON.glow, { emissive: TOON.lantern, emissiveIntensity: 1.3 }), FIREFLIES.length]}
      frustumCulled={false}
    />
  )
}

const GLYPHS: { x: number; y: number; z: number; s: number; c: string; ph: number }[] = [
  { x: STUMP.x, y: 1.95, z: STUMP.z, s: 0.85, c: TOON.gold, ph: 0 },
  { x: 0.3, y: 3.4, z: 23.4, s: 0.66, c: TOON.lilac, ph: 2.1 },
  { x: 5.6, y: 2.9, z: 26.4, s: 0.66, c: TOON.flowerPink, ph: 4.2 },
]
const GLYPH_COLORS: Part[] = GLYPHS.map((g) => ({ p: [g.x, g.y, g.z], s: g.s, c: g.c }))

/** Glowing question marks bobbing and turning over the clearing (one outlined instanced mesh). */
function FloatingQuestions() {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    if (ref.current) writeParts(ref.current, GLYPH_COLORS)
  }, [])
  useFrame(({ clock }) => {
    const m = ref.current
    if (!m) return
    const t = clock.elapsedTime
    for (let i = 0; i < GLYPHS.length; i++) {
      const g = GLYPHS[i]
      setInstance(m, i, g.x, g.y + Math.sin(t * 1.6 + g.ph) * 0.15, g.z, 0, t * 0.9 + g.ph, Math.sin(t * 1.1 + g.ph) * 0.12, g.s, g.s, g.s)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh
      ref={ref}
      args={[questionMarkGeometry(), toonMaterial(TOON.white, { emissive: '#fff3c4', emissiveIntensity: 0.55 }), GLYPHS.length]}
      frustumCulled={false}
    >
      <Outlines thickness={OUTLINE.thickness} color={OUTLINE.color} />
    </instancedMesh>
  )
}

// ── The area ────────────────────────────────────────────────────────────────

/** Forest floor: a darker horseshoe round the clearing, open to the north where the path comes in. */
function forestFloorPoints(): [number, number][] {
  const cx = 2.0
  const cz = 24.9
  const outer: [number, number][] = []
  const inner: [number, number][] = []
  const a0 = (-55 * Math.PI) / 180
  const a1 = (235 * Math.PI) / 180
  const n = 30
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    const wo = 7.0 + Math.sin(a * 4 + 1) * 0.45 + Math.sin(a * 7) * 0.25
    const wi = 3.5 + Math.sin(a * 5 + 2) * 0.25
    outer.push([cx + Math.cos(a) * wo, cz + Math.sin(a) * wo])
    inner.push([cx + Math.cos(a) * wi, cz + Math.sin(a) * wi])
  }
  return [...outer, ...inner.reverse()]
}

function Ground() {
  const geos = useMemo(() => {
    const clearing: [number, number][] = []
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2
      const w = 3.3 + Math.sin(a * 3 + 0.5) * 0.25 + Math.sin(a * 5) * 0.12
      clearing.push([CLEARING.x + Math.cos(a) * w, CLEARING.z + Math.sin(a) * w])
    }
    return { floor: flatPolygon(forestFloorPoints(), 0.006), clearing: flatPolygon(clearing, 0.016) }
  }, [])
  return (
    <group>
      <mesh geometry={geos.floor} material={toonMaterial(TOON.grassDark)} receiveShadow />
      <mesh geometry={geos.clearing} material={toonMaterial(TOON.meadow)} receiveShadow />
    </group>
  )
}

/**
 * Word Problem Woods — an enchanted clearing in the south woods: a huge hollow
 * storybook tree, a ring of big chunky trees, a fairy ring of mushrooms round a
 * riddle stump with a glowing book, giant toadstools, a "?" signpost, lantern
 * crooks, fireflies and floating question marks. The detective raccoon waits at
 * the end of the path with a magnifying glass.
 */
export default function WordProblemWoods({ posRef }: { posRef: RefObject<Vector3> }) {
  const a = areaById('word-problem-woods')!
  const npc = npcPosition(a)!
  return (
    <group>
      <Ground />

      {/* trees + undergrowth */}
      <StorybookTree />
      <Parts geometry={geo.cyl(0.75, 1, 1, 7)} items={TREES.trunks} color={TOON.bark} />
      <Parts geometry={geo.blob(1)} items={TREES.canopy} flat outline />
      <Parts geometry={geo.blob(1)} items={BUSHES} flat />
      <Parts geometry={geo.sphere(6)} items={COVER.flowers} castShadow={false} />
      <Parts geometry={geo.cone(1, 1, 4)} items={COVER.tufts} castShadow={false} />

      {/* fairy ring round the riddle stump */}
      <Parts geometry={geo.cyl(0.8, 1, 1, 6)} items={RING.stems} color={TOON.flowerWhite} castShadow={false} />
      <Parts geometry={geo.sphere(10)} items={RING.caps} />
      <Parts geometry={geo.sphere(6)} items={RING.spots} color={TOON.white} castShadow={false} />
      <group position={[STUMP.x, 0, STUMP.z]}>
        <TCyl radiusTop={0.46} radiusBottom={0.56} height={0.55} position={[0, 0.275, 0]} color={TOON.bark} outline segments={10} />
        <TCyl radiusTop={0.4} height={0.03} position={[0, 0.56, 0]} color={TOON.woodLight} castShadow={false} segments={10} />
        {/* the glowing riddle book */}
        <group position={[0, 0.6, 0]} rotation={[0, 0.75, 0]}>
          <TBox size={[0.7, 0.05, 0.5]} radius={0.02} color={TOON.roofPlum} castShadow={false} />
          <TBox size={[0.32, 0.06, 0.44]} radius={0.02} position={[-0.17, 0.05, 0]} rotation={[0, 0, 0.12]} color={TOON.flowerWhite} emissive={TOON.glow} emissiveIntensity={0.5} castShadow={false} />
          <TBox size={[0.32, 0.06, 0.44]} radius={0.02} position={[0.17, 0.05, 0]} rotation={[0, 0, -0.12]} color={TOON.flowerWhite} emissive={TOON.glow} emissiveIntensity={0.5} castShadow={false} />
        </group>
      </group>

      {/* giant toadstools */}
      <Parts geometry={geo.cyl(0.85, 1, 1, 8)} items={TOAD_STEMS} color={TOON.flowerWhite} />
      <Parts geometry={geo.sphere(12)} items={TOAD_CAPS} outline />
      <Parts geometry={geo.sphere(6)} items={TOAD_SPOTS} color={TOON.white} castShadow={false} />

      {/* log seats */}
      {LOGS.map((l) => (
        <Log key={`${l.x},${l.z}`} position={[l.x, 0, l.z]} rotation={l.along === 'x' ? 0 : Math.PI / 2} length={l.len} outline />
      ))}

      {/* "?" signpost */}
      <Parts geometry={geo.cyl(0.07, 0.09, 1, 6)} items={SIGN_POSTS} color={TOON.woodDark} />
      <Parts geometry={geo.box(1, 1, 1, 0.2)} items={SIGN_BOARDS} outline />
      <Parts geometry={geo.cone(1, 1, 4)} items={SIGN_TIPS} castShadow={false} />
      <Parts geometry={questionMarkGeometry()} items={SIGN_GLYPHS} color={TOON.eye} castShadow={false} />

      {/* lantern crooks */}
      <Parts geometry={geo.cyl(0.07, 0.09, 1, 6)} items={CROOK_POSTS} color={TOON.woodDark} />
      <Parts geometry={geo.box(1, 1, 1, 0.3)} items={CROOK_ARMS} color={TOON.woodDark} castShadow={false} />
      <Parts geometry={geo.sphere(8)} items={CROOK_CURLS} color={TOON.woodDark} castShadow={false} />
      <Parts geometry={geo.box(1, 1, 1, 0.25)} items={CROOK_LANTERNS} color={TOON.lantern} emissive={TOON.lantern} emissiveIntensity={0.9} castShadow={false} />
      <Parts geometry={geo.cone(1, 1, 4)} items={CROOK_CAPS} color={TOON.woodDark} castShadow={false} />

      <Fireflies />
      <FloatingQuestions />

      <Npc areaId={a.id} zoneId={a.zoneId} hub={a.hub} label={a.label} position={[npc[0], 0, npc[1]]} posRef={posRef}>
        <RaccoonDetective />
      </Npc>
    </group>
  )
}

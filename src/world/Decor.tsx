/**
 * Decor.tsx — open-field richness layer for the Cozy Voxel Isle.
 *
 * Landscape character design:
 *   WILD GROVES  — 7 dense clusters of trees/undergrowth at the island's outer
 *                  edge (radius 22–32), placed in the gaps between area destinations.
 *                  Each grove has a centre, inner-dense radius, and falloff radius.
 *   DEVELOPED    — central zone (r≈12) is kept OPEN and TIDY with:
 *                    · Orchard:  neat 4×2 grid of VoxTree 'fruit' near (-9,6)
 *                    · Hedgerow: straight line of Bush + Fence bordering the N path
 *                    · Garden:   tidy rows of FlowerPatch inside a small fenced plot
 *   TRANSITION   — a handful of sparse lone trees/bushes in the mid-zone (r 12–20)
 *
 * All items pass through clear() which enforces:
 *   onIsland (≥2.5u inside coast) && !inKeepOut (area gateways) && !onPath (dirt paths)
 *
 * Keep-out zones:
 *   House            (0,   0)  r≈7.5
 *   Workshop         (0, -14)  r≈5.2
 *   Words Woods    (-12,  -8)  r≈5.5
 *   Fraction Falls  (12,  -8)  r≈6.5
 *   Mult Mesa      (-14,  12)  r≈5.5
 *   Division Dunes  (14,  12)  r≈5.5
 *   Reading Reef     (0,  18)  r≈5.5
 *   Data Delta      (24,  -2)  r≈5.5
 *   Science Summit  (20, -18)  r≈5.5
 *   Measure Marsh  (-24,  -2)  r≈5.5
 *   Geometry Grove (-20, -18)  r≈5.5
 *   Place Value     (-8, -26)  r≈5.5
 *   Tower BF        (10, -26)  r≈5.5
 */

import { useMemo } from 'react'
import { Sparkles, Float } from '@react-three/drei'
import { Vox } from './voxel/Vox'
import {
  VoxTree,
  Bush,
  Fern,
  FlowerPatch,
  Mushroom,
  Rock,
  Log,
  Lantern,
  LilyPad,
  Cattail,
  Fence,
} from './voxel/props'
import { rng } from './voxel/fields'
import { PALETTE } from './voxel/palette'

// ─── Re-export helpers from WorldGround (duplicated here to stay module-scope) ─

/** Lobed coastline radius at angle of (x,z). Mirrors WorldGround.islandEdge exactly. */
function islandEdge(cx: number, cz: number): number {
  const ang = Math.atan2(cz, cx)
  return (
    36 + // keep in sync with WorldGround.ISLAND.baseRadius
    Math.sin(ang * 3) * 1.3 +
    Math.sin(ang * 5 + 1.7) * 0.7 +
    Math.cos(ang * 2 - 0.6) * 0.8
  )
}

/** True if world position (x,z) is safely on the island (≥2.5u inside coast). */
function onIsland(x: number, z: number): boolean {
  return Math.hypot(x, z) < islandEdge(x, z) - 2.5
}

// ─── Keep-out zones ─────────────────────────────────────────────────────────

type Zone = { cx: number; cz: number; r: number }

const KEEP_OUT: Zone[] = [
  { cx: 0, cz: 0, r: 7.5 },      // House
  { cx: 0, cz: -14, r: 5.2 },    // Writing Workshop
  { cx: -12, cz: -8, r: 5.5 },   // Word Problem Woods
  { cx: 12, cz: -8, r: 6.5 },    // Fraction Falls
  // Expanded World zones
  { cx: -14, cz: 12, r: 5.5 },   // Multiplication Mesa
  { cx: 14, cz: 12, r: 5.5 },    // Division Dunes
  { cx: 0, cz: 18, r: 5.5 },     // Reading Reef
  { cx: 24, cz: -2, r: 5.5 },    // Data Delta
  { cx: 20, cz: -18, r: 5.5 },   // Science Summit
  { cx: -24, cz: -2, r: 5.5 },   // Measurement Marsh
  { cx: -20, cz: -18, r: 5.5 },  // Geometry Grove
  { cx: -8, cz: -26, r: 5.5 },   // Place Value Plateau
  { cx: 10, cz: -26, r: 5.5 },   // Tower Battlefront
  { cx: 12, cz: 1.5, r: 5.0 },   // Schoolhouse (hub)
  { cx: 8, cz: 21.5, r: 5.0 },   // Library (hub)
]

/** True if (x,z) is inside any keep-out zone. */
function inKeepOut(x: number, z: number): boolean {
  return KEEP_OUT.some((z0) => Math.hypot(x - z0.cx, z - z0.cz) < z0.r)
}

// ─── Path exclusion ──────────────────────────────────────────────────────────

type Seg = { ax: number; az: number; bx: number; bz: number }

const PATH_HALF_WIDTH = 2.2  // clear corridor around each dirt path

const PATHS: Seg[] = [
  { ax: 0, az: 4.5, bx: -12, bz: -8 },   // house → Woods (NW)
  { ax: 0, az: 4.5, bx: 12, bz: -8 },    // house → Falls (E)
  { ax: 0, az: 4.5, bx: 0, bz: -10.5 },  // house → Workshop (S)
  { ax: 0.8, az: 5.8, bx: 11.2, bz: 4.8 }, // house door → Schoolhouse door (E)
]

/** Squared distance from point (px,pz) to segment (ax,az)–(bx,bz). */
function distToSegSq(px: number, pz: number, s: Seg): number {
  const dx = s.bx - s.ax
  const dz = s.bz - s.az
  const lenSq = dx * dx + dz * dz
  if (lenSq === 0) return (px - s.ax) ** 2 + (pz - s.az) ** 2
  const t = Math.max(0, Math.min(1, ((px - s.ax) * dx + (pz - s.az) * dz) / lenSq))
  const nx = s.ax + t * dx
  const nz = s.az + t * dz
  return (px - nx) ** 2 + (pz - nz) ** 2
}

/** True if (x,z) is too close to any path. */
function onPath(x: number, z: number): boolean {
  const minDistSq = PATH_HALF_WIDTH * PATH_HALF_WIDTH
  return PATHS.some((seg) => distToSegSq(x, z, seg) < minDistSq)
}

/** True if a position is clear to place decor. */
function clear(x: number, z: number): boolean {
  return onIsland(x, z) && !inKeepOut(x, z) && !onPath(x, z)
}

// ─── Landmark keep-out (so normal decor doesn't crowd landmarks) ─────────────

const LANDMARK_ZONES: Zone[] = [
  { cx: 8, cz: 10, r: 3.5 },     // NE pond
  { cx: -8, cz: 10, r: 3.0 },    // NW picnic spot
  { cx: 6, cz: -4, r: 2.5 },     // SE flower meadow
]

function nearLandmark(x: number, z: number): boolean {
  return LANDMARK_ZONES.some((z0) => Math.hypot(x - z0.cx, z - z0.cz) < z0.r)
}

function clearNoLandmark(x: number, z: number): boolean {
  return clear(x, z) && !nearLandmark(x, z)
}

// ─── Grove definitions ────────────────────────────────────────────────────────
//
//  7 grove centres placed in the gaps between area keep-out zones, at radii
//  22–30 from origin.  Each has an inner dense radius (r_inner) and an outer
//  falloff radius (r_outer) beyond which props thin rapidly.
//
//  Layout (clockwise from N):
//   A  (-4, 26)   — N outer gap, between Reading Reef (0,18) and Mult Mesa (-14,12)
//   B  (18, 20)   — NE gap, between Reading Reef and Division Dunes (14,12)
//   C  (28, 7)    — E outer gap, between Division Dunes and Data Delta (24,-2)
//   D  (22, -26)  — SE gap, between Data Delta and Science Summit (20,-18)
//   E  (-4, -32)  — S outer gap, between Place Value (-8,-26) and Tower (10,-26)
//   F  (-26, -12) — SW gap, between Geometry Grove (-20,-18) and Measurement Marsh (-24,-2)
//   G  (-28, 8)   — W outer gap, between Measurement Marsh and Mult Mesa (-14,12)

type Grove = { cx: number; cz: number; rInner: number; rOuter: number }

const GROVES: Grove[] = [
  { cx: -4,  cz:  26, rInner: 3.5, rOuter: 6.5 }, // A — N outer
  { cx:  18, cz:  20, rInner: 3.5, rOuter: 6.0 }, // B — NE
  { cx:  28, cz:   7, rInner: 3.0, rOuter: 6.0 }, // C — E outer
  { cx:  22, cz: -26, rInner: 3.0, rOuter: 5.5 }, // D — SE outer
  { cx:  -4, cz: -32, rInner: 3.0, rOuter: 5.5 }, // E — S outer (deep)
  { cx: -26, cz: -12, rInner: 3.5, rOuter: 6.0 }, // F — SW
  { cx: -28, cz:   8, rInner: 3.0, rOuter: 5.5 }, // G — W outer
]

// ─── Grove population builder (deterministic, seed-based) ────────────────────

interface TreeEntry { x: number; z: number; variant: 'round' | 'pine'; seed: number }
interface UndergrowthEntry { x: number; z: number; kind: 'bush' | 'fern' | 'mushroom' | 'log'; seed: number }

function buildGrove(
  grove: Grove,
  baseSeed: number,
): { trees: TreeEntry[]; undergrowth: UndergrowthEntry[] } {
  const r = rng(baseSeed)
  const trees: TreeEntry[] = []
  const undergrowth: UndergrowthEntry[] = []

  // Dense inner core — attempt many tree slots
  const treeAttempts = 40
  let tSeed = baseSeed + 1000
  for (let i = 0; i < treeAttempts; i++) {
    // Gaussian-ish: use two r() calls averaged → central bias
    const rr = (r() + r()) / 2 * grove.rOuter
    const angle = r() * Math.PI * 2
    const x = grove.cx + Math.cos(angle) * rr
    const z = grove.cz + Math.sin(angle) * rr
    if (!clearNoLandmark(x, z)) continue
    // Density falloff: items in the inner ring almost always placed;
    // items in the outer annulus thin to ~40%
    const distFromCentre = Math.hypot(x - grove.cx, z - grove.cz)
    const keepProb = distFromCentre < grove.rInner ? 0.88 : 0.45
    if (r() > keepProb) continue
    const variant: 'round' | 'pine' = r() < 0.55 ? 'round' : 'pine'
    trees.push({ x, z, variant, seed: tSeed++ })
  }

  // Undergrowth: bush / fern / mushroom / occasional log
  const ugAttempts = 50
  let uSeed = baseSeed + 3000
  for (let i = 0; i < ugAttempts; i++) {
    const rr = r() * grove.rOuter
    const angle = r() * Math.PI * 2
    const x = grove.cx + Math.cos(angle) * rr
    const z = grove.cz + Math.sin(angle) * rr
    if (!clearNoLandmark(x, z)) continue
    const distFromCentre = Math.hypot(x - grove.cx, z - grove.cz)
    const keepProb = distFromCentre < grove.rInner ? 0.78 : 0.38
    if (r() > keepProb) continue
    const roll = r()
    const kind: 'bush' | 'fern' | 'mushroom' | 'log' =
      roll < 0.38 ? 'bush' : roll < 0.68 ? 'fern' : roll < 0.88 ? 'mushroom' : 'log'
    undergrowth.push({ x, z, kind, seed: uSeed++ })
  }

  return { trees, undergrowth }
}

// ─── Transition scatter (mid-zone, sparse) ───────────────────────────────────

/** Scatter a few lone trees/bushes in the mid-zone ring (r 12–21). */
function buildTransitionProps(baseSeed: number): {
  trees: TreeEntry[]
  bushes: Array<{ x: number; z: number; seed: number }>
} {
  const r = rng(baseSeed)
  const trees: TreeEntry[] = []
  const bushes: Array<{ x: number; z: number; seed: number }> = []
  let tSeed = baseSeed + 500
  let bSeed = baseSeed + 800

  for (let i = 0; i < 120; i++) {
    const angle = r() * Math.PI * 2
    const dist = 12 + r() * 9      // ring 12–21
    const x = Math.cos(angle) * dist
    const z = Math.sin(angle) * dist
    if (!clearNoLandmark(x, z)) continue
    // Very sparse — only ~15% of candidates placed
    if (r() > 0.15) continue
    if (r() < 0.6) {
      const variant: 'round' | 'pine' = r() < 0.5 ? 'round' : 'pine'
      trees.push({ x, z, variant, seed: tSeed++ })
    } else {
      bushes.push({ x, z, seed: bSeed++ })
    }
  }
  return { trees, bushes }
}

// ─── Orchard (developed zone, organized) ─────────────────────────────────────
//
//  4×2 grid of fruit trees near (-9, 6), spacing 2.2u.
//  Stays outside the house keep-out (r>7.5) — closest corner is
//  ~(-9 – 1.5*2.2, 6 – 0.5*2.2) = (-12.3, 4.9) at distance ≈13.2u ✓
//  and away from landmark zones and paths.

const ORCHARD_ORIGIN: [number, number] = [-9, 6]
const ORCHARD_COLS = 4
const ORCHARD_ROWS = 2
const ORCHARD_SPACING = 2.2

function buildOrchardPositions(): Array<[number, number, number]> {
  const out: Array<[number, number, number]> = []
  for (let col = 0; col < ORCHARD_COLS; col++) {
    for (let row = 0; row < ORCHARD_ROWS; row++) {
      const x = ORCHARD_ORIGIN[0] + (col - (ORCHARD_COLS - 1) / 2) * ORCHARD_SPACING
      const z = ORCHARD_ORIGIN[1] + (row - (ORCHARD_ROWS - 1) / 2) * ORCHARD_SPACING
      if (clear(x, z)) out.push([x, 0, z])
    }
  }
  return out
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Decor() {
  // ── Grove data — computed once ────────────────────────────────────────────
  const groveData = useMemo(
    () => GROVES.map((g, i) => buildGrove(g, 30000 + i * 2000)),
    [],
  )

  // ── Transition (mid-zone sparse scatter) ────────────────────────────────
  const transData = useMemo(() => buildTransitionProps(50000), [])

  // ── Orchard positions ────────────────────────────────────────────────────
  const orchardPos = useMemo(() => buildOrchardPositions(), [])

  return (
    <group>
      {/* ═══════════════════════════════════════════════════════════════════
          WILD GROVES — dense natural clusters at the island's outer edge
          ═══════════════════════════════════════════════════════════════════ */}
      {groveData.map((grove, gi) =>
        grove.trees.map((t, ti) => (
          <VoxTree
            key={`g${gi}t${ti}`}
            position={[t.x, 0, t.z]}
            variant={t.variant}
            seed={t.seed}
          />
        )),
      )}
      {groveData.map((grove, gi) =>
        grove.undergrowth.map((u, ui) => {
          const key = `g${gi}u${ui}`
          const pos: [number, number, number] = [u.x, 0, u.z]
          if (u.kind === 'bush')     return <Bush key={key} position={pos} seed={u.seed} />
          if (u.kind === 'fern')     return <Fern key={key} position={pos} seed={u.seed} />
          if (u.kind === 'mushroom') return <Mushroom key={key} position={pos} seed={u.seed} />
          // log
          return <Log key={key} position={pos} seed={u.seed} length={1.3 + (u.seed % 3) * 0.25} />
        }),
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          TRANSITION — sparse lone trees / bushes in the mid-zone ring
          ═══════════════════════════════════════════════════════════════════ */}
      {transData.trees.map((t, i) => (
        <VoxTree
          key={`tr${i}`}
          position={[t.x, 0, t.z]}
          variant={t.variant}
          seed={t.seed}
        />
      ))}
      {transData.bushes.map((b, i) => (
        <Bush key={`tb${i}`} position={[b.x, 0, b.z]} seed={b.seed} />
      ))}

      {/* ═══════════════════════════════════════════════════════════════════
          DEVELOPED ZONE — organised features signalling human settlement
          ═══════════════════════════════════════════════════════════════════ */}

      {/* ── Orchard: 4×2 grid of fruit trees near (-9, 6) ────────────────── */}
      {orchardPos.map((pos, i) => (
        <VoxTree key={`orch${i}`} position={pos} variant="fruit" seed={40000 + i * 17} />
      ))}

      {/* ── Hedgerow: straight line of Bush + Fence run along x=-3 .. x=3 at z=8
              (north side of the developed central area, keeps clear of the house) */}
      {/* Fence run behind the hedgerow bushes */}
      <Fence position={[0, 0, 8.6]} length={7.5} posts={5} />
      {/* Evenly-spaced bushes in front of the fence */}
      <Bush position={[-3.0, 0, 8.0]} seed={41001} />
      <Bush position={[-1.5, 0, 8.0]} seed={41002} />
      <Bush position={[ 0.0, 0, 8.0]} seed={41003} />
      <Bush position={[ 1.5, 0, 8.0]} seed={41004} />
      <Bush position={[ 3.0, 0, 8.0]} seed={41005} />

      {/* ── Garden plot: tidy rows of FlowerPatch, fenced on two sides ─────── */}
      {/*    Centred near (4, 8) — NE of house, clear of pond landmark (8,10) */}
      {/* Garden fence surround (two sides for an open-plot feel) */}
      <Fence position={[4.0, 0,  6.5]} length={3.5} posts={3} />
      <Fence position={[4.0, 0,  9.4]} length={3.5} posts={3} />
      {/* Two tidy rows of flowers inside the fenced garden */}
      <FlowerPatch position={[2.8, 0, 7.4]} seed={42001} count={5} />
      <FlowerPatch position={[4.2, 0, 7.4]} seed={42002} count={5} />
      <FlowerPatch position={[5.5, 0, 7.4]} seed={42003} count={5} />
      <FlowerPatch position={[2.8, 0, 8.6]} seed={42004} count={5} />
      <FlowerPatch position={[4.2, 0, 8.6]} seed={42005} count={5} />
      <FlowerPatch position={[5.5, 0, 8.6]} seed={42006} count={5} />
      {/* A couple of neatly-placed ferns at the garden corners */}
      <Fern position={[2.3, 0, 7.0]} seed={42100} />
      <Fern position={[5.9, 0, 9.0]} seed={42101} />

      {/* ═══════════════════════════════════════════════════════════════════
          LANDMARKS — three charming pockets to reward exploration
          ═══════════════════════════════════════════════════════════════════ */}

      {/* ── Landmark 1: NE Secret Pond (8, 0, 10) ──────────────────────── */}
      <PondLandmark />

      {/* ── Landmark 2: NW Picnic Spot (-8, 0, 10) ──────────────────────── */}
      <PicnicSpot />

      {/* ── Landmark 3: SE Flower Meadow (6, 0, -4) ─────────────────────── */}
      <FlowerMeadow />

      {/* ── Ambient life: a few drifting Sparkles (butterflies / pollen) ──── */}
      <Sparkles
        count={18}
        scale={[28, 3, 28]}
        position={[0, 1.2, 0]}
        size={0.5}
        speed={0.15}
        color={PALETTE.flowerYellow}
        opacity={0.55}
      />

      {/* ── Two ambient birds (simple Vox, drifting via Float) ───────────── */}
      <Bird position={[5, 3.5, 8]} seed={99001} floatSpeed={0.4} floatIntensity={0.6} />
      <Bird position={[-7, 4.5, 3]} seed={99002} floatSpeed={0.35} floatIntensity={0.5} />
    </group>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Small NE pond: water disc, lily pads, cattails, rocks. */
function PondLandmark() {
  const cx = 8
  const cz = 10
  return (
    <group position={[cx, 0, cz]}>
      {/* Recessed water disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.28, 0]}>
        <circleGeometry args={[2.4, 28]} />
        <meshStandardMaterial color={PALETTE.water} roughness={0.15} metalness={0.1} />
      </mesh>
      {/* Sandy rim */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <ringGeometry args={[2.0, 2.9, 28]} />
        <meshStandardMaterial color={PALETTE.sand} roughness={0.9} />
      </mesh>
      {/* Shallow basin wall */}
      <mesh position={[0, -0.14, 0]}>
        <cylinderGeometry args={[2.0, 2.0, 0.28, 28, 1, true]} />
        <meshStandardMaterial color={PALETTE.sandWet} roughness={0.9} side={2} />
      </mesh>

      {/* Lily pads */}
      <LilyPad position={[-0.7, -0.24, 0.5]} seed={20001} />
      <LilyPad position={[0.6, -0.24, -0.8]} seed={20002} />
      <LilyPad position={[0.2, -0.24, 0.9]} seed={20003} />
      <LilyPad position={[-1.0, -0.24, -0.3]} seed={20004} />

      {/* Cattails at pond edge */}
      <Cattail position={[1.6, 0, 1.0]} seed={20010} />
      <Cattail position={[-1.5, 0, 0.8]} seed={20011} />
      <Cattail position={[0.4, 0, -1.7]} seed={20012} />

      {/* Rocks around pond */}
      <Rock position={[2.0, 0, 0.3]} seed={20020} />
      <Rock position={[-1.8, 0, -1.1]} seed={20021} />
      <Rock position={[1.1, 0, 1.9]} seed={20022} />

      {/* Pond-side trees for framing */}
      <VoxTree position={[2.8, 0, -1.5]} variant="round" seed={20030} />
      <VoxTree position={[-2.5, 0, 1.8]} variant="round" seed={20031} />

      {/* Mist sparkles over the water */}
      <Sparkles
        count={10}
        scale={[4.5, 0.8, 4.5]}
        position={[0, 0.3, 0]}
        size={0.28}
        speed={0.08}
        color={PALETTE.foam}
        opacity={0.5}
      />
    </group>
  )
}

/** NW Picnic Spot: log bench, lantern, flower patch, a rock. */
function PicnicSpot() {
  const cx = -8
  const cz = 10
  return (
    <group position={[cx, 0, cz]}>
      {/* Log seat */}
      <Log position={[0, 0, 0]} seed={21001} length={1.8} />
      {/* Small rock to sit on / rest objects */}
      <Rock position={[0.9, 0, 0.7]} seed={21010} />
      {/* Lantern on a stump */}
      <Vox position={[-0.6, 0.22, -0.3]} size={[0.38, 0.44, 0.38]} color={PALETTE.bark} radius={0.14} />
      <Lantern position={[-0.6, 0.44, -0.3]} height={0.7} />
      {/* Flower patches around the spot */}
      <FlowerPatch position={[1.2, 0, -0.5]} seed={21020} count={7} />
      <FlowerPatch position={[-1.0, 0, 0.9]} seed={21021} count={5} />
      {/* Framing bushes */}
      <Bush position={[1.6, 0, 0.6]} seed={21030} />
      <Bush position={[-1.8, 0, -0.4]} seed={21031} />
      {/* A couple of trees to frame the nook */}
      <VoxTree position={[2.2, 0, -1.2]} variant="fruit" seed={21040} />
      <VoxTree position={[-2.5, 0, 0.8]} variant="round" seed={21041} />
    </group>
  )
}

/** SE Flower Meadow: a dense cluster of colored flowers + ferns + a signpost. */
function FlowerMeadow() {
  const cx = 6
  const cz = -4
  const r = useMemo(() => rng(22000), [])

  // Generate a small dense meadow of flower patches
  const patches = useMemo(() => {
    const out: Array<[number, number, number]> = []
    for (let i = 0; i < 9; i++) {
      out.push([(r() - 0.5) * 4, 0, (r() - 0.5) * 4])
    }
    return out
  }, [r])

  return (
    <group position={[cx, 0, cz]}>
      {/* Dense flower patches */}
      {patches.map((p, i) => (
        <FlowerPatch key={i} position={p} seed={22001 + i * 13} count={6 + (i % 4)} />
      ))}
      {/* Ferns woven between flowers */}
      <Fern position={[-1.4, 0, 0.8]} seed={22100} />
      <Fern position={[1.6, 0, -0.6]} seed={22101} />
      <Fern position={[0.4, 0, 1.8]} seed={22102} />
      {/* Scatter pebbles */}
      <Rock position={[-1.8, 0, -1.0]} seed={22110} />
      <Rock position={[2.2, 0, 0.5]} seed={22111} />
      {/* A small signpost pointing at the meadow — purely decorative */}
      <Vox position={[-2.2, 0.22, 0]} size={[0.14, 0.44, 0.14]} color={PALETTE.woodDark} radius={0.05} />
      <Vox position={[-2.1, 0.62, 0]} size={[0.6, 0.26, 0.08]} color={PALETTE.wood} radius={0.04} />
      {/* Mushrooms at the meadow edge */}
      <Mushroom position={[2.0, 0, 1.4]} seed={22120} />
      <Mushroom position={[-0.5, 0, -1.9]} seed={22121} />
      {/* Framing trees */}
      <VoxTree position={[3.0, 0, 1.5]} variant="round" seed={22130} />
      <VoxTree position={[-2.8, 0, -1.8]} variant="pine" seed={22131} />
    </group>
  )
}

/** A tiny two-voxel bird that drifts gently via Float. */
function Bird({
  position,
  seed,
  floatSpeed,
  floatIntensity,
}: {
  position: [number, number, number]
  seed: number
  floatSpeed?: number
  floatIntensity?: number
}) {
  const r = useMemo(() => rng(seed), [seed])
  const yaw = r() * Math.PI * 2
  return (
    <Float speed={floatSpeed ?? 0.4} floatIntensity={floatIntensity ?? 0.5} rotationIntensity={0.1}>
      <group position={position} rotation={[0, yaw, 0]}>
        {/* body */}
        <Vox position={[0, 0, 0]} size={[0.22, 0.12, 0.32]} color={PALETTE.barkDark} radius={0.06} castShadow={false} />
        {/* head */}
        <Vox position={[0, 0.1, 0.16]} size={0.13} color={PALETTE.bark} radius={0.06} castShadow={false} />
        {/* left wing */}
        <Vox position={[-0.2, 0.02, -0.05]} size={[0.18, 0.05, 0.22]} color={PALETTE.rockDark} radius={0.04} castShadow={false} rotation={[0.1, 0, 0.25]} />
        {/* right wing */}
        <Vox position={[0.2, 0.02, -0.05]} size={[0.18, 0.05, 0.22]} color={PALETTE.rockDark} radius={0.04} castShadow={false} rotation={[0.1, 0, -0.25]} />
      </group>
    </Float>
  )
}

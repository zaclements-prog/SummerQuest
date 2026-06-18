/**
 * Decor.tsx — open-field richness layer for the Cozy Voxel Isle.
 *
 * Fills the grass between the four area locations with clustered trees, shrubs,
 * boulders, flowers, mushrooms, logs, and grass tufts, plus three small charming
 * landmarks and ambient Sparkles.  Purely decorative — zero colliders, zero
 * behavior changes.
 *
 * Keep-out zones (nothing placed inside):
 *   House        (0,  0)  r≈7
 *   Workshop     (0,-14)  r≈4.5
 *   Woods      (-12, -8)  r≈5
 *   Falls       (12, -8)  r≈6
 * Paths also excluded via distToSeg helper.
 * All items clipped with onIsland (stays ≥2.5u inside coastline).
 */

import { useMemo } from 'react'
import { Sparkles, Float } from '@react-three/drei'
import { Scatter } from './voxel/Vox'
import { Vox } from './voxel/Vox'
import {
  VoxTree,
  Bush,
  Fern,
  FlowerPatch,
  GrassTuft,
  Mushroom,
  Rock,
  Boulder,
  Log,
  Lantern,
  LilyPad,
  Cattail,
} from './voxel/props'
import { rng, field } from './voxel/fields'
import { PALETTE } from './voxel/palette'

// ─── Re-export helpers from WorldGround (duplicated here to stay module-scope) ─

/** Lobed coastline radius at angle of (x,z). Mirrors WorldGround.islandEdge exactly. */
function islandEdge(cx: number, cz: number): number {
  const ang = Math.atan2(cz, cx)
  return (
    25 +
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

// ─── Scatter helpers ─────────────────────────────────────────────────────────

/** Scatter positions filtered by the clear() test. */
function clearField(
  center: [number, number],
  halfW: number,
  halfD: number,
  count: number,
  seed: number,
  opts?: { y?: number; minScale?: number; maxScale?: number },
) {
  return field(center, halfW, halfD, count, seed, opts).filter((it) =>
    clear(it.position[0], it.position[2]),
  )
}

// ─── Prop position list builders (deterministic, seed-based) ─────────────────

/** Generate candidate positions for individual props across the whole island. */
function scatterPositions(
  count: number,
  seed: number,
  extraClearFn?: (x: number, z: number) => boolean,
): Array<[number, number, number]> {
  const r = rng(seed)
  const out: Array<[number, number, number]> = []
  const BOUNDS = 22
  let attempts = 0
  while (out.length < count && attempts < count * 15) {
    attempts++
    const x = (r() - 0.5) * 2 * BOUNDS
    const z = (r() - 0.5) * 2 * BOUNDS
    if (clear(x, z) && (!extraClearFn || extraClearFn(x, z))) {
      out.push([x, 0, z])
    }
  }
  return out
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function Decor() {
  // ── Dense instanced scatter (one draw-call each) ──────────────────────────

  // Tall grass tufts — large count, instanced via Scatter
  const tallGrass = useMemo(
    () => clearField([0, 0], 22, 22, 340, 11001, { y: 0.17, minScale: 0.7, maxScale: 1.4 }),
    [],
  )

  // Short flowering ground-cover
  const groundFlowers = useMemo(
    () => clearField([0, 0], 22, 22, 260, 11002, { y: 0.09, minScale: 0.6, maxScale: 1.1 }),
    [],
  )

  // Pebble scatter (small dark rocks)
  const pebbles = useMemo(
    () => clearField([0, 0], 22, 22, 180, 11003, { y: 0.05, minScale: 0.4, maxScale: 0.9 }),
    [],
  )

  // ── Individual props — positions computed once, memo'd ────────────────────

  // Trees: round
  const roundTreePos = useMemo(() => scatterPositions(22, 12001, clearNoLandmark), [])
  // Trees: pine
  const pineTreePos = useMemo(() => scatterPositions(14, 12002, clearNoLandmark), [])
  // Trees: fruit
  const fruitTreePos = useMemo(() => scatterPositions(8, 12003, clearNoLandmark), [])
  // Bushes
  const bushPos = useMemo(() => scatterPositions(28, 12010, clearNoLandmark), [])
  // Ferns
  const fernPos = useMemo(() => scatterPositions(22, 12020, clearNoLandmark), [])
  // Boulders
  const boulderPos = useMemo(() => scatterPositions(9, 12030, clearNoLandmark), [])
  // Rocks
  const rockPos = useMemo(() => scatterPositions(18, 12040, clearNoLandmark), [])
  // Flower patches
  const flowerPos = useMemo(() => scatterPositions(20, 12050, clearNoLandmark), [])
  // Mushrooms
  const mushroomPos = useMemo(() => scatterPositions(16, 12060, clearNoLandmark), [])
  // Logs
  const logPos = useMemo(() => scatterPositions(8, 12070, clearNoLandmark), [])
  // Grass tufts (individual, slightly bigger than Scatter tufts)
  const grassTuftPos = useMemo(() => scatterPositions(30, 12080, clearNoLandmark), [])

  return (
    <group>
      {/* ── Instanced scatter layers ───────────────────────────────────────── */}

      {/* Tall grass tufts */}
      <Scatter
        items={tallGrass}
        color={PALETTE.foliage}
        jitterAmount={0.12}
        size={[0.09, 0.32, 0.09]}
        castShadow={false}
        receiveShadow={false}
      />

      {/* Ground flower dots */}
      <Scatter
        items={groundFlowers}
        color={PALETTE.flowerYellow}
        jitterAmount={0.18}
        size={[0.12, 0.12, 0.12]}
        castShadow={false}
        receiveShadow={false}
      />

      {/* Pebbles */}
      <Scatter
        items={pebbles}
        color={PALETTE.pebble}
        jitterAmount={0.1}
        size={[0.14, 0.1, 0.14]}
        castShadow={false}
        receiveShadow={false}
      />

      {/* ── Individual props — trees ──────────────────────────────────────── */}
      {roundTreePos.map((pos, i) => (
        <VoxTree key={`rt${i}`} position={pos} variant="round" seed={13001 + i * 7} />
      ))}
      {pineTreePos.map((pos, i) => (
        <VoxTree key={`pt${i}`} position={pos} variant="pine" seed={13100 + i * 11} />
      ))}
      {fruitTreePos.map((pos, i) => (
        <VoxTree key={`ft${i}`} position={pos} variant="fruit" seed={13200 + i * 13} />
      ))}

      {/* ── Shrubs / undergrowth ─────────────────────────────────────────── */}
      {bushPos.map((pos, i) => (
        <Bush key={`bush${i}`} position={pos} seed={14001 + i * 7} />
      ))}
      {fernPos.map((pos, i) => (
        <Fern key={`fern${i}`} position={pos} seed={14100 + i * 9} />
      ))}
      {grassTuftPos.map((pos, i) => (
        <GrassTuft key={`gt${i}`} position={pos} seed={14200 + i * 5} />
      ))}

      {/* ── Rocks / boulders ─────────────────────────────────────────────── */}
      {boulderPos.map((pos, i) => (
        <Boulder key={`bld${i}`} position={pos} seed={15001 + i * 11} />
      ))}
      {rockPos.map((pos, i) => (
        <Rock key={`rock${i}`} position={pos} seed={15100 + i * 7} />
      ))}

      {/* ── Flowers / mushrooms ──────────────────────────────────────────── */}
      {flowerPos.map((pos, i) => (
        <FlowerPatch
          key={`fp${i}`}
          position={pos}
          seed={16001 + i * 13}
          count={4 + (i % 3)}
        />
      ))}
      {mushroomPos.map((pos, i) => (
        <Mushroom key={`mush${i}`} position={pos} seed={16100 + i * 7} />
      ))}

      {/* ── Logs ─────────────────────────────────────────────────────────── */}
      {logPos.map((pos, i) => (
        <Log key={`log${i}`} position={pos} seed={17001 + i * 11} length={1.4 + (i % 3) * 0.3} />
      ))}

      {/* ═══════════════════════════════════════════════════════════════════
          LANDMARKS — three charming pockets to reward exploration
          ═══════════════════════════════════════════════════════════════════ */}

      {/* ── Landmark 1: NE Secret Pond (8, 0, 10) ──────────────────────── */}
      <PondLandmark />

      {/* ── Landmark 2: NW Picnic Spot (-8, 0, 10) ──────────────────────── */}
      <PicnicSpot />

      {/* ── Landmark 3: SE Flower Meadow (6, 0, -4) ─────────────────────── */}
      <FlowerMeadow />

      {/* ── Ambient life: Sparkles (butterflies / pollen) ────────────────── */}
      <Sparkles
        count={35}
        scale={[28, 3, 28]}
        position={[0, 1.2, 0]}
        size={0.5}
        speed={0.15}
        color={PALETTE.flowerYellow}
        opacity={0.55}
      />
      <Sparkles
        count={20}
        scale={[20, 2, 20]}
        position={[0, 0.9, 0]}
        size={0.35}
        speed={0.1}
        color={PALETTE.flowerPink}
        opacity={0.4}
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
        count={18}
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

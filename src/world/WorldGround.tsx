import { useMemo } from 'react'
import { BoxGeometry, Matrix4, type BufferGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Scatter } from './voxel/Vox'
import { field } from './voxel/fields'
import { PALETTE } from './voxel/palette'

/* ─────────────────────────────── TUNABLES ───────────────────────────────────
 * The floating voxel island. The WALKABLE TOP STAYS FLAT AT y=0 — all voxel
 * depth lives in the underside, coastline, and strata below. Tune the silhouette
 * and strata depths here.
 * ───────────────────────────────────────────────────────────────────────────*/

const ISLAND = {
  cell: 2, // coarse voxel cell size (world units) — bigger = fewer blocks = faster
  reach: 24, // half-extent of the grid scanned for the island footprint
  baseRadius: 21, // nominal coastline radius (play area ≈ ±22)
  edgeNoise: 2.6, // amplitude of the irregular/rounded coastline wobble
  topThickness: 0.9, // grass band depth (top sits at y=0)
  dirtBottom: -2.5, // dirt layer descends to here
  rockBottom: -6.0, // rock layer descends to here (then steps in for silhouette)
}

const PATH = {
  width: 1.6,
  y: 0.02, // flush, just above grass to avoid z-fighting
  color: PALETTE.dirtDark,
}

// Sandy shore basin near Fraction Falls (the area file owns the actual water).
const BASIN = {
  center: [12, -8] as [number, number],
  radius: 4.6,
  rimColor: PALETTE.sand,
  floorColor: PALETTE.sandWet,
  floorY: -0.35,
}

type Cell = { cx: number; cz: number; r: number; floor: number }

/** Deterministic [0,1) hash for the coastline wobble. */
function noise2(ix: number, iz: number): number {
  let h = Math.imul(ix | 0, 0x27d4eb2d) ^ Math.imul(iz | 0, 0x165667b1)
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d)
  h ^= h >>> 13
  return (h >>> 0) / 4294967296
}

/**
 * Scan a coarse grid and keep cells inside an irregular radial coastline. Each
 * kept cell becomes a stack of merged boxes (grass → dirt → rock), with the
 * rock floor stepping deeper toward the island center so the underside reads as
 * a real chunky silhouette from the iso camera.
 */
function buildIsland(): Cell[] {
  const cells: Cell[] = []
  const { cell, reach, baseRadius, edgeNoise } = ISLAND
  for (let gx = -reach; gx <= reach; gx += cell) {
    for (let gz = -reach; gz <= reach; gz += cell) {
      const cx = gx
      const cz = gz
      const dist = Math.hypot(cx, cz)
      // Irregular coastline: wobble the effective radius per cell, deterministically.
      const wob =
        (noise2(Math.round(cx / cell), Math.round(cz / cell)) - 0.5) * 2 * edgeNoise +
        Math.sin(cx * 0.35) * 0.8 +
        Math.cos(cz * 0.4) * 0.8
      const edge = baseRadius + wob
      if (dist > edge) continue
      // Deeper toward the middle (stepped underside), shallower at the rim.
      const t = Math.min(1, dist / edge) // 0 center → 1 rim
      const floor = ISLAND.rockBottom + (1 - t) * -3.2 // center reaches ~ -9.2
      cells.push({ cx, cz, r: edge - dist, floor })
    }
  }
  return cells
}

/** Merge a per-cell box stack into one geometry per material layer. */
function mergedLayer(
  cells: Cell[],
  top: number,
  bottomOf: (c: Cell) => number,
  inset = 0,
): BufferGeometry {
  const { cell } = ISLAND
  const geos: BufferGeometry[] = []
  const m = new Matrix4()
  for (const c of cells) {
    const bottom = bottomOf(c)
    const h = top - bottom
    if (h <= 0) continue
    const w = cell - inset
    const box = new BoxGeometry(w, h, w)
    m.makeTranslation(c.cx, bottom + h / 2, c.cz)
    box.applyMatrix4(m)
    geos.push(box)
  }
  const merged = mergeGeometries(geos, false)
  geos.forEach((g) => g.dispose())
  return merged ?? new BoxGeometry(0, 0, 0)
}

export default function WorldGround() {
  const cells = useMemo(() => buildIsland(), [])

  // Three merged strata: grass band (top flat at 0), dirt, rock. One draw call each.
  const grassGeo = useMemo(
    () => mergedLayer(cells, 0, () => -ISLAND.topThickness),
    [cells],
  )
  const dirtGeo = useMemo(
    () => mergedLayer(cells, -ISLAND.topThickness, () => ISLAND.dirtBottom, 0.04),
    [cells],
  )
  const rockGeo = useMemo(
    () => mergedLayer(cells, ISLAND.dirtBottom, (c) => c.floor, 0.06),
    [cells],
  )

  // Instanced grass-tone tufts scattered on the flat top for living variation.
  const tufts = useMemo(() => field([0, 0], 20, 20, 420, 9001, { y: 0.04, minScale: 0.5, maxScale: 1.1 }), [])
  const tuftsDark = useMemo(() => field([0, 0], 20, 20, 240, 9002, { y: 0.03, minScale: 0.4, maxScale: 0.9 }), [])

  // Inset voxel paths from the house (0,0) to each area. Built as thin merged strips.
  const pathGeo = useMemo(() => buildPaths(), [])

  // Sandy basin near Fraction Falls.
  return (
    <group>
      {/* Grass band / walkable top (flat at y=0) */}
      <mesh geometry={grassGeo} receiveShadow castShadow>
        <meshStandardMaterial color={PALETTE.grass} roughness={0.95} />
      </mesh>
      {/* Dirt stratum */}
      <mesh geometry={dirtGeo} receiveShadow castShadow>
        <meshStandardMaterial color={PALETTE.dirt} roughness={0.95} />
      </mesh>
      {/* Rock stratum (stepped underside silhouette) */}
      <mesh geometry={rockGeo} receiveShadow castShadow>
        <meshStandardMaterial color={PALETTE.rock} roughness={0.95} />
      </mesh>

      {/* Scattered grass tone variation on the flat top */}
      <Scatter items={tufts} color={PALETTE.grassLight} jitterAmount={0.07} size={[0.55, 0.16, 0.55]} radius={0.05} castShadow={false} />
      <Scatter items={tuftsDark} color={PALETTE.grassDark} jitterAmount={0.08} size={[0.5, 0.14, 0.5]} radius={0.05} castShadow={false} />

      {/* Inset paths */}
      <mesh geometry={pathGeo} position={[0, PATH.y, 0]} receiveShadow>
        <meshStandardMaterial color={PATH.color} roughness={1} />
      </mesh>

      {/* Sandy shore basin near Fraction Falls (water is owned by the area file) */}
      <group position={[BASIN.center[0], 0, BASIN.center[1]]}>
        {/* sandy rim ring (flush) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
          <ringGeometry args={[BASIN.radius - 1.4, BASIN.radius, 36]} />
          <meshStandardMaterial color={BASIN.rimColor} roughness={1} />
        </mesh>
        {/* recessed sandy floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, BASIN.floorY, 0]} receiveShadow>
          <circleGeometry args={[BASIN.radius - 1.2, 32]} />
          <meshStandardMaterial color={BASIN.floorColor} roughness={1} />
        </mesh>
        {/* shallow basin wall (thin ring band so the recess reads with depth) */}
        <mesh position={[0, BASIN.floorY / 2, 0]}>
          <cylinderGeometry args={[BASIN.radius - 1.2, BASIN.radius - 1.2, -BASIN.floorY, 32, 1, true]} />
          <meshStandardMaterial color={BASIN.floorColor} roughness={1} side={2} />
        </mesh>
      </group>
    </group>
  )
}

/** Build inset path strips from the house to each area, merged into one geometry. */
function buildPaths(): BufferGeometry {
  const segs: { from: [number, number]; to: [number, number] }[] = [
    { from: [0, 4.5], to: [-12, -8] }, // Word Problem Woods (NW)
    { from: [0, 4.5], to: [12, -8] }, // Fraction Falls (E)
    { from: [0, 4.5], to: [0, -10.5] }, // Writing Workshop (S)
  ]
  const geos: BufferGeometry[] = []
  const m = new Matrix4()
  for (const s of segs) {
    const dx = s.to[0] - s.from[0]
    const dz = s.to[1] - s.from[1]
    const len = Math.hypot(dx, dz)
    const angle = Math.atan2(dx, dz) // rotate around Y; strip runs along +z then rotates
    const cx = (s.from[0] + s.to[0]) / 2
    const cz = (s.from[1] + s.to[1]) / 2
    const strip = new BoxGeometry(PATH.width, 0.08, len)
    m.makeRotationY(angle)
    m.setPosition(cx, 0, cz)
    strip.applyMatrix4(m)
    geos.push(strip)
  }
  const merged = mergeGeometries(geos, false)
  geos.forEach((g) => g.dispose())
  return merged ?? new BoxGeometry(0, 0, 0)
}

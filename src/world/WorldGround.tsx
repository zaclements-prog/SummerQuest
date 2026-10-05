import { useMemo } from 'react'
import { BoxGeometry, Matrix4, type BufferGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { PALETTE } from './voxel/palette'
import Decor from './Decor'

/* ─────────────────────────────── TUNABLES ───────────────────────────────────
 * The floating voxel island. The WALKABLE TOP STAYS FLAT AT y=0 — all voxel
 * depth lives in the underside, coastline, and strata below. Tune the silhouette
 * and strata depths here.
 * ───────────────────────────────────────────────────────────────────────────*/

const ISLAND = {
  cell: 2, // coarse voxel cell size (world units) — bigger = fewer blocks = faster
  reach: 40, // half-extent of the grid scanned for the island footprint
  baseRadius: 36, // nominal coastline radius (covers the expanded play area + a rim)
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

/**
 * Scan a coarse grid and keep cells inside an irregular radial coastline. Each
 * kept cell becomes a stack of merged boxes (grass → dirt → rock), with the
 * rock floor stepping deeper toward the island center so the underside reads as
 * a real chunky silhouette from the iso camera.
 */
/** Radius of the lobed coastline at the angle of (cx,cz). Connected + chunky. */
function islandEdge(cx: number, cz: number): number {
  const ang = Math.atan2(cz, cx)
  return (
    ISLAND.baseRadius +
    Math.sin(ang * 3) * 1.3 +
    Math.sin(ang * 5 + 1.7) * 0.7 +
    Math.cos(ang * 2 - 0.6) * 0.8
  )
}

function buildIsland(): Cell[] {
  const cells: Cell[] = []
  const { cell, reach } = ISLAND
  for (let gx = -reach; gx <= reach; gx += cell) {
    for (let gz = -reach; gz <= reach; gz += cell) {
      const cx = gx
      const cz = gz
      const dist = Math.hypot(cx, cz)
      const edge = islandEdge(cx, cz)
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

      {/* Inset paths */}
      <mesh geometry={pathGeo} position={[0, PATH.y, 0]} receiveShadow>
        <meshStandardMaterial color={PATH.color} roughness={1} />
      </mesh>

      {/* Open-field richness decor layer (purely decorative, no colliders) */}
      <Decor />

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
    // Schoolhouse: from just outside the house door, passing south of the garden fence (z 6.5)
    { from: [0.8, 5.8], to: [11.2, 4.8] }, // Schoolhouse door (E)
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

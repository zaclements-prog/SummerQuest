import fractionFalls from './areas/colliders/fraction-falls'
import divisionDunes from './areas/colliders/division-dunes'
import multiplicationMesa from './areas/colliders/multiplication-mesa'
import towerBattlefront from './areas/colliders/tower-battlefront'
import wordProblemWoods from './areas/colliders/word-problem-woods'
import writingWorkshop from './areas/colliders/writing-workshop'
import readingReef from './areas/colliders/reading-reef'
import measurementMarsh from './areas/colliders/measurement-marsh'
import dataDelta from './areas/colliders/data-delta'
import geometryGrove from './areas/colliders/geometry-grove'
import scienceSummit from './areas/colliders/science-summit'
import placeValuePlateau from './areas/colliders/place-value-plateau'
import town from './areas/colliders/town'

/**
 * The toon island's layout (see docs/superpowers/specs/2026-10-05-toon-world-rebuild-design.md).
 * x → right, z → toward the camera (the iso camera sits at +x,+z looking at −x,−z).
 * The walkable ground is a flat disc of radius WALK_RADIUS at y = 0; everything
 * here is data shared by the renderer, the scatter, the colliders and the tests.
 */

export type Collider =
  | { kind: 'box'; cx: number; cz: number; w: number; d: number }
  | { kind: 'circle'; cx: number; cz: number; r: number }
  /** Keeps you INSIDE a circle (the island's walkable edge). */
  | { kind: 'bounds'; cx: number; cz: number; r: number }

export type AreaKind = 'open' | 'building'

/** Hub buildings: their NPC opens a hub panel instead of (or as well as) a zone's stages. */
export type HubKind = 'schoolhouse' | 'library'

export interface WorldArea {
  id: string
  zoneId?: string // the zone its NPC opens (must resolve via getZone()); hubs may omit it
  hub?: HubKind
  label: string
  worldPos: [number, number] // x,z center
  kind: AreaKind
  theme: string // visual theme key (the area component decides the look)
  npc?: { offset: [number, number]; emoji: string } // NPC position relative to worldPos
  colliders: Collider[]
  door?: { pos: [number, number]; width: number } // buildings only (on the +z wall)
  size?: number // building footprint size in world units (default 5)
}

export const WALK_RADIUS = 31.5
export const ISLAND_RADIUS = 36 // nominal coastline radius (lobed ± ~2.5)
/** Sea level (the island's grass top is y = 0). */
export const OCEAN_Y = -3.2

/** Lobed coastline radius at angle θ (always > WALK_RADIUS + 1). */
export function coastRadius(theta: number): number {
  return (
    ISLAND_RADIUS +
    1.6 * Math.sin(theta * 3 + 0.4) +
    1.0 * Math.sin(theta * 5 + 1.7) +
    0.7 * Math.cos(theta * 2 - 0.6)
  )
}

export const SPAWN: [number, number] = [0, -3.5]
export const PLAZA = { cx: 0, cz: 2, r: 6 }
export const FOUNTAIN = { cx: 0, cz: 2.5, r: 1.6 }

/** River centerline (x,z) and width — from Fraction Falls' pool to the east coast. */
export const RIVER = {
  width: 3,
  points: [
    [-21, -15], [-13, -18], [-5, -19], [5, -19], [13, -18], [21, -15], [30.5, -15],
  ] as [number, number][],
}

/** Flat plank bridges across the river (deck along z). */
export const BRIDGES = [
  { cx: -7, cz: -18.75, length: 5, width: 2.2 },
  { cx: 7, cz: -18.75, length: 5, width: 2.2 },
]

/** Footpaths (polylines, width ~2.2): plaza → every NPC / door. */
export const PATH_WIDTH = 2.2
export const WORLD_PATHS: { to: string; points: [number, number][] }[] = [
  { to: 'house', points: [[0, -3.4], [0, -3.9]] },
  { to: 'schoolhouse', points: [[-5.6, 0.2], [-10.8, -1.4]] },
  { to: 'library+measurement-marsh', points: [[5.6, 0.2], [14, -1], [20.3, -2.8]] },
  { to: 'data-delta', points: [[14, -1], [17.5, -2.5], [18.5, -7.3]] },
  { to: 'division-dunes', points: [[-5.8, 2.8], [-14, 1.5], [-20.3, 0.2]] },
  { to: 'fraction-falls', points: [[-14, 1.5], [-18, -4], [-19.4, -7.9]] },
  { to: 'multiplication-mesa', points: [[-5.2, 4.8], [-12, 7.5], [-16.8, 9.2]] },
  { to: 'tower-battlefront', points: [[-3.3, 7.2], [-7, 12.5], [-9.4, 16.8]] },
  { to: 'word-problem-woods', points: [[0.3, 8], [0.9, 19.2]] },
  { to: 'writing-workshop', points: [[3.5, 7.1], [9, 14], [10.4, 22.2], [13.8, 24.4]] },
  { to: 'reading-reef', points: [[5.8, 3.8], [14, 5], [19.8, 5.8]] },
  { to: 'north-west', points: [[-4.3, -2.2], [-7, -4.5], [-7, -22], [-10.8, -22.5]] },
  { to: 'north-east', points: [[4.3, -2.2], [7, -4.5], [7, -22], [10.8, -22.5]] },
  { to: 'science-summit', points: [[-7, -22], [-1.2, -23.4]] },
  { to: 'science-summit-east', points: [[7, -22], [1.2, -23.4]] },
]

/** Square building shell walls (Building.tsx): 3 solid walls + the +z wall split around the door. */
export function buildingWalls(cx: number, cz: number, size = 5, doorWidth = 1.6): Collider[] {
  const half = size / 2
  const seg = half - doorWidth / 2
  const segC = (half + doorWidth / 2) / 2
  return [
    { kind: 'box', cx: cx - half, cz, w: 0.3, d: size },
    { kind: 'box', cx: cx + half, cz, w: 0.3, d: size },
    { kind: 'box', cx, cz: cz - half, w: size, d: 0.3 },
    { kind: 'box', cx: cx - segC, cz: cz + half, w: seg, d: 0.3 },
    { kind: 'box', cx: cx + segC, cz: cz + half, w: seg, d: 0.3 },
  ]
}

const building = (id: string, cx: number, cz: number, size: number, extra: Partial<WorldArea> = {}): WorldArea => ({
  id,
  label: id,
  worldPos: [cx, cz],
  kind: 'building',
  theme: id,
  size,
  door: { pos: [cx, cz + size / 2], width: 1.6 },
  colliders: buildingWalls(cx, cz, size),
  ...extra,
})

const open = (
  id: string,
  label: string,
  theme: string,
  cx: number,
  cz: number,
  npc: [number, number],
  emoji: string,
  colliders: Collider[],
): WorldArea => ({
  id,
  zoneId: id,
  label,
  worldPos: [cx, cz],
  kind: 'open',
  theme,
  npc: { offset: [npc[0] - cx, npc[1] - cz], emoji },
  colliders,
})

export const WORLD_AREAS: WorldArea[] = [
  // ── Town ──────────────────────────────────────────────────────────────────
  building('house', 0, -10, 10, { label: 'Your House', theme: 'house' }),
  building('schoolhouse', -12, -6, 6, {
    hub: 'schoolhouse', label: 'Schoolhouse', npc: { offset: [0, 4.2], emoji: '🦉' },
  }),
  building('library', 12, -6, 6, {
    hub: 'library', zoneId: 'reading-reef', label: 'Library', npc: { offset: [0, 4.2], emoji: '📚' },
  }),

  // ── Math West ─────────────────────────────────────────────────────────────
  open('fraction-falls', 'Fraction Falls', 'falls', -24, -12, [-20, -9], '💧', fractionFalls),
  open('division-dunes', 'Division Dunes', 'dunes', -26, 0, [-21.5, 0], '🐪', divisionDunes),
  open('multiplication-mesa', 'Multiplication Mesa', 'mesa', -22, 12, [-18, 9.5], '🏜️', multiplicationMesa),

  // ── South / Story ─────────────────────────────────────────────────────────
  open('tower-battlefront', 'Tower Battlefront', 'battlefront', -12, 22, [-10, 18], '🏰', towerBattlefront),
  open('word-problem-woods', 'Word Problem Woods', 'woods', 2, 25, [1, 20.5], '🌲', wordProblemWoods),
  {
    ...building('writing-workshop', 15, 20, 6, { label: 'Writing Workshop', theme: 'workshop' }),
    zoneId: 'writing-workshop',
    npc: { offset: [0, 4.2], emoji: '✍️' },
    colliders: [...buildingWalls(15, 20, 6), ...writingWorkshop],
  },
  open('reading-reef', 'Reading Reef', 'reef', 25, 8, [21, 6], '🐠', readingReef),

  // ── East / Science ────────────────────────────────────────────────────────
  open('measurement-marsh', 'Measurement Marsh', 'marsh', 26, -4, [21.5, -3], '📐', measurementMarsh),
  open('data-delta', 'Data Delta', 'delta', 22, -11, [19, -8.5], '📊', dataDelta),

  // ── North (across the river) ──────────────────────────────────────────────
  open('geometry-grove', 'Geometry Grove', 'grove', 13, -26, [12, -22.5], '🔷', geometryGrove),
  open('science-summit', 'Science Summit', 'summit', 0, -28, [0, -23.5], '🔬', scienceSummit),
  open('place-value-plateau', 'Place Value Plateau', 'plateau', -13, -26, [-12, -22.5], '🏔️', placeValuePlateau),
]

/** Where an area's NPC stands (buildings: on the doorstep, 1.2 in front of the door). */
export function npcPosition(a: WorldArea): [number, number] | null {
  if (!a.npc) return null
  return [a.worldPos[0] + a.npc.offset[0], a.worldPos[1] + a.npc.offset[1]]
}

// ── River colliders: circles along the centerline, open where a bridge crosses ──
function riverColliders(): Collider[] {
  const out: Collider[] = []
  const half = RIVER.width / 2
  const pts = RIVER.points
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i]
    const [bx, bz] = pts[i + 1]
    const len = Math.hypot(bx - ax, bz - az)
    const n = Math.ceil(len / 0.7)
    for (let k = 0; k < n; k++) {
      const t = k / n
      const x = ax + (bx - ax) * t
      const z = az + (bz - az) * t
      const onBridge = BRIDGES.some((b) => Math.abs(x - b.cx) < b.width / 2 + 0.45)
      if (!onBridge) out.push({ kind: 'circle', cx: x, cz: z, r: half })
    }
  }
  // bridge railings keep you on the deck
  for (const b of BRIDGES) {
    out.push({ kind: 'box', cx: b.cx - b.width / 2 - 0.1, cz: b.cz, w: 0.2, d: b.length })
    out.push({ kind: 'box', cx: b.cx + b.width / 2 + 0.1, cz: b.cz, w: 0.2, d: b.length })
  }
  return out
}

// Town furniture on the plaza (see terrain/Ground.tsx): fountain, lamp posts, benches.
const TOWN: Collider[] = [
  { kind: 'circle', cx: FOUNTAIN.cx, cz: FOUNTAIN.cz, r: FOUNTAIN.r },
  ...([[-4.2, -3.2], [4.2, -3.2], [-4.6, 3.4], [4.6, 3.4]] as const).map(
    ([x, z]): Collider => ({ kind: 'circle', cx: PLAZA.cx + x, cz: PLAZA.cz + z, r: 0.15 }),
  ),
  { kind: 'box', cx: PLAZA.cx - 3.6, cz: PLAZA.cz + 1.4, w: 0.4, d: 1.2 },
  { kind: 'box', cx: PLAZA.cx + 3.6, cz: PLAZA.cz + 1.4, w: 0.4, d: 1.2 },
  ...town,
]
const BOUNDS: Collider[] = [{ kind: 'bounds', cx: 0, cz: 0, r: WALK_RADIUS }]

export function areaById(id: string): WorldArea | undefined {
  return WORLD_AREAS.find((a) => a.id === id)
}

let collidersCache: Collider[] | null = null
export function worldColliders(): Collider[] {
  if (!collidersCache) {
    collidersCache = [...WORLD_AREAS.flatMap((a) => a.colliders), ...TOWN, ...riverColliders(), ...BOUNDS]
  }
  return collidersCache
}

// ── Scatter keep-outs (trees/bushes/rocks stay off these) ───────────────────
export interface KeepOut { cx: number; cz: number; r: number }
export const KEEP_OUTS: KeepOut[] = [
  { cx: 0, cz: -3, r: 17 }, // town (house, hubs, plaza)
  ...WORLD_AREAS.filter((a) => a.kind === 'open').map((a) => ({ cx: a.worldPos[0], cz: a.worldPos[1], r: 6.5 })),
  { cx: 15, cz: 21, r: 6 }, // writing workshop + its garden
]

/** Squared distance from (px,pz) to segment a–b. */
export function distToSegSq(px: number, pz: number, a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const l2 = dx * dx + dz * dz
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / l2))
  const x = a[0] + t * dx
  const z = a[1] + t * dz
  return (px - x) ** 2 + (pz - z) ** 2
}

/** Distance from (x,z) to the nearest point of a polyline. */
export function distToPolyline(x: number, z: number, pts: [number, number][]): number {
  let best = Infinity
  for (let i = 0; i < pts.length - 1; i++) best = Math.min(best, distToSegSq(x, z, pts[i], pts[i + 1]))
  return Math.sqrt(best)
}

/** Coastal sectors kept as open beach (angle range from +x toward +z, and the radius they start at). */
const BEACHES = [
  { from: 0.07, to: 0.5, r: 28 }, // Reading Reef
]

/** True if decor may be scattered at (x,z): on land, off paths/river/bridges/areas/town/beaches. */
export function scatterClear(x: number, z: number, margin = 0): boolean {
  const dist = Math.hypot(x, z)
  if (dist > ISLAND_RADIUS - 2.5) return false
  const angle = Math.atan2(z, x)
  if (BEACHES.some((b) => angle > b.from && angle < b.to && dist > b.r - margin)) return false
  if (KEEP_OUTS.some((k) => Math.hypot(x - k.cx, z - k.cz) < k.r + margin)) return false
  if (distToPolyline(x, z, RIVER.points) < RIVER.width / 2 + 1.6 + margin) return false
  if (WORLD_PATHS.some((p) => distToPolyline(x, z, p.points) < PATH_WIDTH / 2 + 1.0 + margin)) return false
  return true
}

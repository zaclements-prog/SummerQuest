/**
 * Data + geometry for the illustrated 2D island map (the Map screen).
 *
 * The picture mirrors the 3D World's island (docs/superpowers/specs/
 * 2026-10-05-toon-world-rebuild-design.md): the same lobed coastline formula, the
 * river along the north of town with its two bridges, the plaza and the three
 * town buildings, and every subject area in its district. Coordinates are world
 * units (x → right, z → down the page); a few spots are nudged so labels never
 * collide. It is deliberately a copy of the numbers, not an import, so the map
 * never pulls World code into the main bundle.
 *
 * The map's viewBox is exactly 100 units wide, so inside the map container
 * (which is a CSS size container) 1cqw === 1 world unit.
 */

export const VIEW = { x: -50, y: -45, w: 100, h: 90 } as const
export const VIEW_ASPECT = VIEW.w / VIEW.h

/** Where each zone's marker sits (world units). */
export const ZONE_SPOTS: Record<string, [number, number]> = {
  'fraction-falls': [-24, -13],
  'division-dunes': [-27.5, -0.5],
  'multiplication-mesa': [-23, 11.5],
  'tower-battlefront': [-13, 23],
  'word-problem-woods': [1, 26.5],
  'writing-workshop': [14.5, 22.5],
  'reading-reef': [26.5, 10],
  'measurement-marsh': [27.5, -2.5],
  'data-delta': [24.5, -14.5],
  'geometry-grove': [15, -26],
  'science-summit': [0, -30.5],
  'place-value-plateau': [-15, -26],
}

/** Percent position of a world point inside the map box. */
export function toPct([x, z]: [number, number]) {
  return { left: `${((x - VIEW.x) / VIEW.w) * 100}%`, top: `${((z - VIEW.y) / VIEW.h) * 100}%` }
}

/** The World's lobed coastline radius at angle θ = atan2(z, x). */
export function coastR(theta: number): number {
  return (
    36 +
    1.6 * Math.sin(theta * 3 + 0.4) +
    1.0 * Math.sin(theta * 5 + 1.7) +
    0.7 * Math.cos(theta * 2 - 0.6)
  )
}

/** Reading Reef's beach: the grass pulls back on the east shore. */
function beachBite(theta: number): number {
  const mid = 0.28
  const d = Math.atan2(Math.sin(theta - mid), Math.cos(theta - mid))
  return 5.5 * Math.exp(-(d * d) / (2 * 0.2 * 0.2))
}

/** Closed smooth SVG path (Catmull-Rom → cubic Bézier) through points. */
export function smoothClosed(pts: [number, number][]): string {
  const n = pts.length
  const f = (v: number) => v.toFixed(2)
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2[0])} ${f(p2[1])}`
  }
  return d + 'Z'
}

/** Open smooth path through points. */
export function smoothOpen(pts: [number, number][]): string {
  const f = (v: number) => v.toFixed(2)
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`
  }
  return d
}

function ring(radius: (theta: number) => number, dy = 0, steps = 96): string {
  const pts: [number, number][] = []
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const r = radius(t)
    pts.push([Math.cos(t) * r, Math.sin(t) * r + dy])
  }
  return smoothClosed(pts)
}

export const ISLAND = {
  shallows: ring((t) => coastR(t) + 4.2),
  foam: ring((t) => coastR(t) + 1.5),
  cliff: ring((t) => coastR(t), 1.6),
  sand: ring((t) => coastR(t)),
  grass: ring((t) => coastR(t) - 2.3 - beachBite(t)),
  grassInner: ring((t) => coastR(t) - 3.4 - beachBite(t)),
}

/** River centerline: Fraction Falls' pool → north of town → over the east cliff. */
export const RIVER: [number, number][] = [
  [-21.5, -15.5], [-13, -18], [-5, -19], [5, -19], [13, -18], [21, -15.5], [30.5, -15], [40, -15.2],
]
export const RIVER_WIDTH = 3

export const BRIDGES: { cx: number; cz: number }[] = [
  { cx: -7, cz: -18.75 },
  { cx: 7, cz: -18.75 },
]

export const PLAZA = { cx: 0, cz: 2, r: 6 }

/** Town buildings, drawn as little front-facing cottages (center + width). */
export const BUILDINGS = [
  { id: 'house', cx: 0, cz: -10.5, w: 9, wall: '#fbefd6', roof: '#e86f5a' },
  { id: 'school', cx: -12.5, cz: -6.5, w: 6.5, wall: '#f3d9b1', roof: '#4fb3a6' },
  { id: 'library', cx: 12.5, cz: -6.5, w: 6.5, wall: '#d6e9f7', roof: '#5f9fd6' },
] as const

const spot = (id: string) => ZONE_SPOTS[id]

/** Sandy footpaths from the plaza to every area (the north ones over the bridges). */
export const PATHS: [number, number][][] = [
  [[-5.6, 0.4], [-12, -1.5], [-12.5, -4]],
  [[5.6, 0.4], [12, -1.5], [12.5, -4]],
  [[0, -4], [0, -7]],
  [[5.6, 0.2], [14, -1], [21, -2.4], spot('measurement-marsh')],
  [[14, -1], [19, -5], [22.5, -10.5], spot('data-delta')],
  [[-5.8, 2.8], [-14, 1.5], spot('division-dunes')],
  [[-14, 1.5], [-19, -5], spot('fraction-falls')],
  [[-5.2, 4.8], [-13, 8], spot('multiplication-mesa')],
  [[-3.3, 7.2], [-8, 13.5], spot('tower-battlefront')],
  [[0.3, 8], spot('word-problem-woods')],
  [[3.5, 7.1], [9, 14], spot('writing-workshop')],
  [[5.8, 3.8], [15, 5.5], spot('reading-reef')],
  [[-4.3, -2.6], [-7, -6], [-7, -22], spot('place-value-plateau')],
  [[4.3, -2.6], [7, -6], [7, -22], spot('geometry-grove')],
  [[-7, -22], [-2.5, -25.5], spot('science-summit')],
  [[7, -22], [2.5, -25.5], spot('science-summit')],
]

// ── Deterministic scatter ─────────────────────────────────────────────────────

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function distToSeg(px: number, pz: number, a: [number, number], b: [number, number]) {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const len = dx * dx + dz * dz
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / len))
  return Math.hypot(px - (a[0] + t * dx), pz - (a[1] + t * dz))
}

function distToLine(px: number, pz: number, pts: [number, number][]) {
  let d = Infinity
  for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, distToSeg(px, pz, pts[i], pts[i + 1]))
  return d
}

export type TreeKind = 'round' | 'pine' | 'blossom' | 'autumn' | 'palm'
export interface MapTree {
  x: number
  z: number
  r: number
  kind: TreeKind
}

function clearForDecor(x: number, z: number): boolean {
  const theta = Math.atan2(z, x)
  if (Math.hypot(x, z) > coastR(theta) - 4.4 - beachBite(theta)) return false
  for (const [sx, sz] of Object.values(ZONE_SPOTS)) {
    // the medallion, plus the label hanging under it
    if (Math.hypot(x - sx, z - sz) < 6.8) return false
    if (Math.abs(x - sx) < 9 && z > sz && z < sz + 9) return false
  }
  if (Math.hypot(x - PLAZA.cx, z - PLAZA.cz) < PLAZA.r + 2.4) return false
  for (const b of BUILDINGS) {
    if (Math.abs(x - b.cx) < b.w / 2 + 2 && z > b.cz - b.w * 0.75 - 2 && z < b.cz + b.w * 0.4 + 2.2) return false
  }
  if (distToLine(x, z, RIVER) < RIVER_WIDTH / 2 + 2) return false
  for (const p of PATHS) if (distToLine(x, z, p) < 2.3) return false
  return true
}

function scatterTrees(): MapTree[] {
  const rnd = mulberry32(20261005)
  const out: MapTree[] = []
  const step = 3.4
  for (let gz = -38; gz <= 38; gz += step) {
    for (let gx = -38; gx <= 38; gx += step) {
      const x = gx + (rnd() - 0.5) * step * 0.9
      const z = gz + (rnd() - 0.5) * step * 0.9
      const roll = rnd()
      if (!clearForDecor(x, z)) continue
      if (roll < 0.22) continue // leave some meadow
      const coastal = Math.hypot(x, z) > 25
      const north = z < -20
      const k = rnd()
      const kind: TreeKind = north
        ? k < 0.6 ? 'pine' : 'round'
        : coastal && x > 10 && z > -6
          ? k < 0.55 ? 'palm' : 'round'
          : k < 0.5 ? 'round' : k < 0.7 ? 'blossom' : k < 0.85 ? 'autumn' : 'pine'
      out.push({ x, z, r: 1.35 + rnd() * 0.7, kind })
    }
  }
  return out.sort((a, b) => a.z - b.z)
}

export const TREES = scatterTrees()

/** Flower dots on the meadows. */
export const FLOWERS = (() => {
  const rnd = mulberry32(77)
  const colors = ['#f2766b', '#ffd75e', '#f7a1c4', '#fbf7ee', '#b79af0']
  const out: { x: number; z: number; c: string }[] = []
  for (let i = 0; i < 260 && out.length < 70; i++) {
    const x = (rnd() - 0.5) * 66
    const z = (rnd() - 0.5) * 66
    if (!clearForDecor(x, z)) continue
    out.push({ x, z, c: colors[Math.floor(rnd() * colors.length)] })
  }
  return out
})()

/** Little foam wave marks on the open ocean. */
export const WAVES = (() => {
  const rnd = mulberry32(9)
  const out: { x: number; z: number; s: number }[] = []
  for (let i = 0; i < 200 && out.length < 26; i++) {
    const x = VIEW.x + 3 + rnd() * (VIEW.w - 6)
    const z = VIEW.y + 3 + rnd() * (VIEW.h - 6)
    const theta = Math.atan2(z, x)
    if (Math.hypot(x, z) < coastR(theta) + 6) continue
    out.push({ x, z, s: 0.8 + rnd() * 0.6 })
  }
  return out
})()

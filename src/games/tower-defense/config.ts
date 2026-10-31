import type { ContentBand } from '../../lib/gradeBand'
import type { FieldLayout, Slot, Tuning, Vec2 } from './types'

/**
 * Puddle Patrol's field and pace. The field is about square (it fits a
 * tablet held either way): the mud pit at the back left, a path that runs
 * right along the back, turns, comes back along the middle and drops into
 * the island pond at the front left. Sprinkler slots stand beside it; the
 * two in the middle reach BOTH rows (a Pudding passes them twice), the turn
 * slot reaches the bend, the rest one row each, so where a tower goes
 * matters as much as which tower it is.
 */

/** The path's control points (a smooth curve through them, see `buildLayout`). */
const PATH_POINTS: Vec2[] = [
  { x: -7.4, z: -5.2 },
  { x: -5.6, z: -3.4 },
  { x: -1.5, z: -3.6 },
  { x: 2.6, z: -3.4 },
  { x: 5.2, z: -2.6 },
  { x: 6.0, z: -0.6 },
  { x: 4.8, z: 1.3 },
  { x: 1.5, z: 1.7 },
  { x: -2.2, z: 1.5 },
  { x: -4.6, z: 2.4 },
  { x: -5.4, z: 4.4 },
  { x: -4.8, z: 5.9 },
]

/** Slot spots: back row, the middle island (reaches both rows), the bend, the front. */
const SLOT_SPOTS: Record<'k1' | 'all', Vec2[]> = {
  // kindergarten and 1st grade: four big spots, all in easy reach of the path
  k1: [
    { x: -3.4, z: -1.0 },
    { x: 1.6, z: -0.9 },
    { x: 7.9, z: -1.0 },
    { x: -1.6, z: 3.9 },
  ],
  all: [
    { x: -3.0, z: -5.9 },
    { x: 1.8, z: -5.9 },
    { x: -3.4, z: -1.0 },
    { x: 1.6, z: -0.9 },
    { x: 7.9, z: -1.0 },
    { x: -1.6, z: 3.9 },
  ],
}

export const POND: Vec2 = { x: -4.4, z: 7.2 }
export const PIT: Vec2 = { x: -7.6, z: -5.6 }

/** A band's pace and economy (tuned with the bots: src/games/tower-defense/bots.ts). */
export const TUNING: Record<ContentBand, Tuning> = {
  k1: { speed: 1.4, reload: 2.4, flight: 0.45, startDrops: 6, cost: 3, washReward: 1, maxTowers: 2, superCost: 4 },
  g1: { speed: 1.45, reload: 2.4, flight: 0.45, startDrops: 6, cost: 3, washReward: 1, maxTowers: 2, superCost: 4 },
  g24: { speed: 2.3, reload: 3.6, flight: 0.35, startDrops: 8, cost: 4, washReward: 1, maxTowers: 3, superCost: 7 },
  g5: { speed: 2.1, reload: 2.6, flight: 0.35, startDrops: 8, cost: 4, washReward: 1, maxTowers: 3, superCost: 7 },
}

export const SPRAY_RANGE: Record<'k1' | 'all', number> = { k1: 3.3, all: 3.0 }

/** Simulation tick (seconds): fixed, so a run is the same on any device and in the tests. */
export const TICK = 1 / 30

function catmull(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const t2 = t * t
  const t3 = t2 * t
  const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
  return { x: f(p0.x, p1.x, p2.x, p3.x), z: f(p0.z, p1.z, p2.z, p3.z) }
}

/** The smooth path through the control points, sampled every ~0.1 units. */
function samplePath(points: Vec2[]): Vec2[] {
  const out: Vec2[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]
    const steps = Math.max(4, Math.ceil(Math.hypot(p2.x - p1.x, p2.z - p1.z) / 0.1))
    for (let k = 0; k < steps; k++) out.push(catmull(p0, p1, p2, p3, k / steps))
  }
  out.push(points[points.length - 1])
  return out
}

/** The stretches of path (distance ranges) within `range` of a spot. */
function reachOf(pos: Vec2, path: Vec2[], dist: number[], range: number): [number, number][] {
  const out: [number, number][] = []
  let from = -1
  for (let i = 0; i < path.length; i++) {
    const inside = Math.hypot(path[i].x - pos.x, path[i].z - pos.z) <= range
    if (inside && from < 0) from = dist[i]
    if (!inside && from >= 0) {
      out.push([from, dist[i - 1]])
      from = -1
    }
  }
  if (from >= 0) out.push([from, dist[dist.length - 1]])
  return out
}

/** The field for a band (kindergarten and 1st grade: four big slots; grades 2–5: six). */
export function buildLayout(band: ContentBand): FieldLayout {
  const path = samplePath(PATH_POINTS)
  const dist = [0]
  for (let i = 1; i < path.length; i++) dist.push(dist[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z))
  const young = band === 'k1' || band === 'g1'
  const range = SPRAY_RANGE[young ? 'k1' : 'all']
  const slots: Slot[] = SLOT_SPOTS[young ? 'k1' : 'all'].map((pos, id) => ({ id, pos, reach: reachOf(pos, path, dist, range) }))
  return { path, dist, length: dist[dist.length - 1], slots, range, pond: POND, pit: PIT }
}

/** Where a Pudding `s` units along the path stands (written into `out`: no allocation in the frame loop). */
export function pointAt(layout: FieldLayout, s: number, out: Vec2 = { x: 0, z: 0 }): Vec2 {
  const { path, dist } = layout
  if (s <= 0) {
    out.x = path[0].x
    out.z = path[0].z
    return out
  }
  if (s >= layout.length) {
    out.x = path[path.length - 1].x
    out.z = path[path.length - 1].z
    return out
  }
  // binary search the sample
  let lo = 0
  let hi = dist.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (dist[mid] <= s) lo = mid
    else hi = mid
  }
  const seg = dist[hi] - dist[lo] || 1
  const k = (s - dist[lo]) / seg
  out.x = path[lo].x + (path[hi].x - path[lo].x) * k
  out.z = path[lo].z + (path[hi].z - path[lo].z) * k
  return out
}

/** The path's direction at `s` (radians about y, 0 = +z). */
export function headingAt(layout: FieldLayout, s: number): number {
  const a = pointAt(layout, s - 0.15)
  const b = pointAt(layout, s + 0.15)
  return Math.atan2(b.x - a.x, b.z - a.z)
}

/** Is distance `s` within a slot's reach? */
export function inReach(slot: Slot, s: number): boolean {
  for (const [a, b] of slot.reach) if (s >= a && s <= b) return true
  return false
}

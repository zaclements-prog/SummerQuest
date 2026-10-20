import type { Picture } from '../../lib/problem'

/**
 * The straight-sided flat shapes as points in the 100 × 100 picture box, so a
 * shape can be turned (K.G.2: a triangle is a triangle any way up) and its
 * sides counted one by one (K.G.4), each lighting up as its number is said.
 */

export type ShapeName = Extract<Picture, { kind: 'shape' }>['shape']
export type Point = readonly [x: number, y: number]

const CX = 50
const CY = 50

/** Corners, clockwise on screen, before any turn. */
const BASE: Partial<Record<ShapeName, readonly Point[]>> = {
  triangle: [
    [50, 12],
    [90, 84],
    [10, 84],
  ],
  square: [
    [16, 16],
    [84, 16],
    [84, 84],
    [16, 84],
  ],
  rectangle: [
    [8, 27],
    [92, 27],
    [92, 73],
    [8, 73],
  ],
  // flat top: the corners at -120°, -60°, 0°, 60°, 120° and 180°
  hexagon: [-120, -60, 0, 60, 120, 180].map((deg): Point => {
    const a = (deg * Math.PI) / 180
    return [round(CX + Math.cos(a) * 39), round(CY + Math.sin(a) * 39)]
  }),
}

function round(v: number): number {
  return Math.round(v * 10) / 10
}

/** How many straight sides a shape has, or null (a circle, a solid, a star's points aren't counted). */
export function shapeSides(shape: ShapeName): number | null {
  return BASE[shape]?.length ?? null
}

/** Solid (3D) shapes, as opposed to flat ones. */
export function isSolidShape(shape: ShapeName): boolean {
  return shape === 'cube' || shape === 'sphere' || shape === 'cone' || shape === 'cylinder'
}

/** Turn a point clockwise (on screen) about the box's centre. */
export function turnPoint([x, y]: Point, deg: number): Point {
  if (!deg) return [x, y]
  const a = (deg * Math.PI) / 180
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [round(CX + (x - CX) * c - (y - CY) * s), round(CY + (x - CX) * s + (y - CY) * c)]
}

/**
 * A straight-sided shape's corners after the turn, re-ordered so that side 0
 * (corner 0 → corner 1) is the top one and the count goes round clockwise:
 * counting always starts at the top, however the shape is turned. Null for
 * shapes without straight sides.
 */
export function shapeCorners(shape: ShapeName, turn = 0): Point[] | null {
  const base = BASE[shape]
  if (!base) return null
  const pts = base.map((p) => turnPoint(p, turn))
  const n = pts.length
  let start = 0
  let best = Infinity
  for (let i = 0; i < n; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % n]
    const my = (a[1] + b[1]) / 2
    const mx = (a[0] + b[0]) / 2
    // highest side midpoint; a tie (a turned square's corner on top) goes to the left one
    const score = my * 1000 + mx
    if (score < best - 1e-6) {
      best = score
      start = i
    }
  }
  return [...pts.slice(start), ...pts.slice(0, start)]
}

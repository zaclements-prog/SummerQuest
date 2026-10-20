/**
 * Tracing geometry (Writing Workshop, K): a stroke is a short list of moves in
 * a 100 × 100 box (y down), sampled to evenly spaced points. The faint guide a
 * child traces over, the green start dot, the arrows and the check all come
 * from the same samples, so what is drawn and what is checked always agree.
 *
 * Moves, as authored in ./glyphs:
 *   M(x, y)                        start here (a stroke that begins with a line)
 *   L(x, y, x, y, …)               straight lines through these points
 *   A(cx, cy, rx, ry, from, to)    an arc of the ellipse around (cx, cy), from
 *                                  angle `from` to `to` in degrees: 0 is three
 *                                  o'clock, 90 is twelve o'clock, so a growing
 *                                  angle goes counter-clockwise on screen. An
 *                                  arc that doesn't begin where the stroke is
 *                                  gets a line to its start first.
 *
 * Pure (no DOM), so the activity, the lesson scenes and the tests share it.
 */

export interface Pt {
  x: number
  y: number
}

export type Move =
  | { m: 'M'; p: Pt }
  | { m: 'L'; pts: Pt[] }
  | { m: 'A'; cx: number; cy: number; rx: number; ry: number; from: number; to: number }

export const M = (x: number, y: number): Move => ({ m: 'M', p: { x, y } })
export function L(...xy: number[]): Move {
  const pts: Pt[] = []
  for (let i = 0; i + 1 < xy.length; i += 2) pts.push({ x: xy[i], y: xy[i + 1] })
  return { m: 'L', pts }
}
export const A = (cx: number, cy: number, rx: number, ry: number, from: number, to: number): Move => ({ m: 'A', cx, cy, rx, ry, from, to })

const rad = (deg: number) => (deg * Math.PI) / 180
/** A point on an arc move at angle `deg`. */
export function arcPoint(a: Extract<Move, { m: 'A' }>, deg: number): Pt {
  return { x: a.cx + a.rx * Math.cos(rad(deg)), y: a.cy - a.ry * Math.sin(rad(deg)) }
}

export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)

/**
 * The stroke as a dense polyline (every ~0.5 unit along arcs), plus the
 * points where it turns a corner (a line's inner points, or a sharp join).
 */
function rawPolyline(moves: readonly Move[]): { pts: Pt[]; corners: number[] } {
  const pts: Pt[] = []
  const corners: number[] = []
  const add = (p: Pt) => {
    const last = pts[pts.length - 1]
    if (!last || dist(last, p) > 1e-6) pts.push(p)
  }
  for (const mv of moves) {
    if (mv.m === 'M') {
      add(mv.p)
    } else if (mv.m === 'L') {
      // (the first point of a stroke that starts with a line is its start)
      for (const p of mv.pts) {
        if (pts.length >= 2) corners.push(pts.length - 1)
        add(p)
      }
    } else {
      const start = arcPoint(mv, mv.from)
      if (pts.length && dist(pts[pts.length - 1], start) > 0.01) {
        corners.push(pts.length - 1)
        add(start)
      }
      if (pts.length) corners.push(pts.length - 1)
      // about half a unit per step along the larger radius
      const steps = Math.max(2, Math.ceil((Math.abs(mv.to - mv.from) / 360) * 2 * Math.PI * Math.max(mv.rx, mv.ry) * 2))
      for (let i = 0; i <= steps; i++) add(arcPoint(mv, mv.from + ((mv.to - mv.from) * i) / steps))
    }
  }
  return { pts, corners }
}

export interface SampledStroke {
  /** Evenly spaced points from the start to the end (the first is the start, the last the end). */
  pts: Pt[]
  /** Arc length at each point. */
  at: number[]
  length: number
  /** Arc lengths of the corners where the stroke turns sharply (an arrow goes just after each). */
  corners: number[]
}

/**
 * The stroke's points about every `spacing` units along it. A sharp corner
 * (the bottom of a V) is always a sample itself, so the samples never cut it.
 */
export function sampleMoves(moves: readonly Move[], spacing = 2): SampledStroke {
  const { pts: raw, corners: rawCorners } = rawPolyline(moves)
  const cum: number[] = [0]
  for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + dist(raw[i - 1], raw[i]))
  const length = cum[cum.length - 1] ?? 0
  // a corner counts when the way the stroke goes turns by more than ~50°
  const corners = rawCorners
    .filter((i) => i > 0 && i < raw.length - 1)
    .filter((i) => {
      const back = raw[i - 1]
      const fwd = raw[i + 1]
      const a1 = Math.atan2(raw[i].y - back.y, raw[i].x - back.x)
      const a2 = Math.atan2(fwd.y - raw[i].y, fwd.x - raw[i].x)
      let d = Math.abs(a2 - a1)
      if (d > Math.PI) d = 2 * Math.PI - d
      return d > rad(50)
    })
    .map((i) => cum[i])
  // even steps between the corners
  const breaks = [0, ...corners, length]
  const at: number[] = [0]
  for (let k = 0; k + 1 < breaks.length; k++) {
    const len = breaks[k + 1] - breaks[k]
    if (len <= 1e-9) continue
    const n = Math.max(1, Math.round(len / spacing))
    for (let i = 1; i <= n; i++) at.push(breaks[k] + (len * i) / n)
  }
  const pts: Pt[] = []
  let j = 0
  for (const s of at) {
    while (j < raw.length - 2 && cum[j + 1] < s) j++
    const seg = cum[j + 1] - cum[j] || 1
    const k = Math.min(1, Math.max(0, (s - cum[j]) / seg))
    const a = raw[j]
    const b = raw[Math.min(j + 1, raw.length - 1)]
    pts.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k })
  }
  return { pts, at, length, corners }
}

/** The point `s` units along a sampled stroke, and the way it goes there (a unit vector). */
export function pointAlong(st: SampledStroke, s: number): { p: Pt; dir: Pt } {
  const { pts, at } = st
  if (pts.length < 2) return { p: pts[0] ?? { x: 0, y: 0 }, dir: { x: 0, y: 1 } }
  const c = Math.min(st.length, Math.max(0, s))
  let i = 0
  while (i < at.length - 2 && at[i + 1] < c) i++
  const a = pts[i]
  const b = pts[i + 1]
  const seg = at[i + 1] - at[i] || 1
  const k = Math.min(1, Math.max(0, (c - at[i]) / seg))
  const len = dist(a, b) || 1
  return { p: { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }, dir: { x: (b.x - a.x) / len, y: (b.y - a.y) / len } }
}

const f = (n: number) => String(Math.round(n * 100) / 100)

/**
 * The stroke as an SVG path (exact arcs, split into quarter turns), for the
 * faint guide: the same geometry the samples come from.
 */
export function movesPath(moves: readonly Move[]): string {
  let d = ''
  let cur: Pt | null = null
  const lineTo = (p: Pt) => {
    d += cur ? ` L ${f(p.x)} ${f(p.y)}` : `M ${f(p.x)} ${f(p.y)}`
    cur = p
  }
  for (const mv of moves) {
    if (mv.m === 'M') {
      d += `${d ? ' ' : ''}M ${f(mv.p.x)} ${f(mv.p.y)}`
      cur = mv.p
    } else if (mv.m === 'L') {
      for (const p of mv.pts) {
        if (!cur) {
          d += `M ${f(p.x)} ${f(p.y)}`
          cur = p
        } else lineTo(p)
      }
    } else {
      const start = arcPoint(mv, mv.from)
      if (!cur) {
        d += `M ${f(start.x)} ${f(start.y)}`
        cur = start
      } else if (dist(cur, start) > 0.01) lineTo(start)
      const span = mv.to - mv.from
      const pieces = Math.max(1, Math.ceil(Math.abs(span) / 90))
      // a growing angle runs counter-clockwise on screen: SVG's sweep flag 0
      const sweep = span > 0 ? 0 : 1
      for (let i = 1; i <= pieces; i++) {
        const p = arcPoint(mv, mv.from + (span * i) / pieces)
        d += ` A ${f(mv.rx)} ${f(mv.ry)} 0 0 ${sweep} ${f(p.x)} ${f(p.y)}`
        cur = p
      }
    }
  }
  return d
}

/** A polyline as an SVG path ("M x y L x y …"). */
export function polylinePath(pts: readonly Pt[]): string {
  if (!pts.length) return ''
  let d = `M ${f(pts[0].x)} ${f(pts[0].y)}`
  for (let i = 1; i < pts.length; i++) d += ` L ${f(pts[i].x)} ${f(pts[i].y)}`
  // a single point still shows as a dot (round caps)
  if (pts.length === 1) d += ` L ${f(pts[0].x + 0.01)} ${f(pts[0].y)}`
  return d
}

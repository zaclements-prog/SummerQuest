/* eslint-disable react-refresh/only-export-components -- a helper module of scene primitives + geometry math, not an HMR boundary */
import type { ReactNode } from 'react'
import { clamp, ease, progress, spring } from '../anim'
import { Pop, Title } from '../kit'
import { M } from '../palette'

/**
 * Shared shapes and geometry math for the Geometry / Measurement / Data scenes
 * (builder 2). Everything is a pure function of `t`, like the engine kit.
 */

export type Pt = readonly [number, number]

export const lerp = (a: number, b: number, k: number) => a + (b - a) * k
export const lerpPt = (a: Pt, b: Pt, k: number): Pt => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]
export const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1])
export const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
export const deg = (d: number) => (d * Math.PI) / 180

/** SVG path through `pts` (closed by default). */
export const polyD = (pts: readonly Pt[], closed = true) =>
  pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ') + (closed ? ' Z' : '')

/** Regular n-gon around (cx, cy); first vertex at `rot` radians from 12 o'clock, clockwise. */
export function ngon(n: number, cx: number, cy: number, r: number, rot = 0): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = rot + (i / n) * Math.PI * 2
    return [cx + r * Math.sin(a), cy - r * Math.cos(a)] as Pt
  })
}

/** Outward unit normal of edge a→b for a polygon whose centre is `c`. */
export function outward(a: Pt, b: Pt, c: Pt): Pt {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const l = Math.hypot(dx, dy) || 1
  let nx = -dy / l
  let ny = dx / l
  const m = mid(a, b)
  if ((m[0] - c[0]) * nx + (m[1] - c[1]) * ny < 0) {
    nx = -nx
    ny = -ny
  }
  return [nx, ny]
}

export const centroid = (pts: readonly Pt[]): Pt => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length]

/**
 * The first `k` (0..1) of the polyline `pts` by length (closed adds the
 * closing edge): the drawn-so-far points, the tip, and the heading there.
 */
export function trace(pts: readonly Pt[], k: number, closed = true): { pts: Pt[]; tip: Pt; ang: number; seg: number } {
  const path = closed ? [...pts, pts[0]] : [...pts]
  const lens = path.slice(1).map((p, i) => dist(path[i], p))
  const total = lens.reduce((a, b) => a + b, 0)
  let left = clamp(k) * total
  const out: Pt[] = [path[0]]
  for (let i = 0; i < lens.length; i++) {
    const a = path[i]
    const b = path[i + 1]
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0])
    if (left <= lens[i] || i === lens.length - 1) {
      const tip = lerpPt(a, b, lens[i] ? Math.min(1, left / lens[i]) : 1)
      out.push(tip)
      return { pts: out, tip, ang, seg: i }
    }
    left -= lens[i]
    out.push(b)
  }
  return { pts: out, tip: path[path.length - 1], ang: 0, seg: lens.length - 1 }
}

/**
 * A morph from polygon `a` (n points) to `b` (n+1 points): `a` gets a new
 * vertex at the middle of one edge (so it looks unchanged), and the edge and
 * rotation are chosen to make the motion as small as possible.
 * Returns `a` re-sampled to n+1 points, index-matched to `b`.
 */
export function growMatch(a: readonly Pt[], b: readonly Pt[]): Pt[] {
  const n = a.length
  let best: Pt[] = []
  let bestCost = Infinity
  for (let e = 0; e < n; e++) {
    const a2: Pt[] = [...a.slice(0, e + 1), mid(a[e], a[(e + 1) % n]), ...a.slice(e + 1)]
    for (let s = 0; s <= n; s++) {
      const rot = a2.map((_, i) => a2[(i + s) % (n + 1)])
      const cost = rot.reduce((sum, p, i) => sum + (p[0] - b[i][0]) ** 2 + (p[1] - b[i][1]) ** 2, 0)
      if (cost < bestCost) {
        bestCost = cost
        best = rot
      }
    }
  }
  return best
}

/** Ease-in ramp for idle loops once the narration is done (0 when reduced). */
export const idleRamp = (t: number, from: number, reduced: boolean) => (reduced ? 0 : ease.inOutSine(progress(t, from, 1)))

/** A numbered (or lettered) round badge that pops in. */
export function Badge({ t, at, x, y, label, color = M.white, ink = M.ink, r = 22, size, out }: { t: number; at: number; x: number; y: number; label: ReactNode; color?: string; ink?: string; r?: number; size?: number; out?: number }) {
  return (
    <Pop t={t} at={at} x={x} y={y} out={out}>
      <circle cx={x} cy={y + 3} r={r} fill={M.ink} opacity={0.18} />
      <circle cx={x} cy={y} r={r} fill={color} stroke={M.ink} strokeWidth={3} />
      <Title x={x} y={y + 1} size={size ?? r * 1.2} color={ink}>
        {label}
      </Title>
    </Pop>
  )
}

/** Right-angle box at vertex `v` between unit directions `u1` and `u2`. `k` scales it in. */
export function RightMark({ v, u1, u2, size = 30, k = 1, color = M.gold, width = 4 }: { v: Pt; u1: Pt; u2: Pt; size?: number; k?: number; color?: string; width?: number }) {
  if (k <= 0.001) return null
  const s = size * k
  const a: Pt = [v[0] + u1[0] * s, v[1] + u1[1] * s]
  const b: Pt = [v[0] + (u1[0] + u2[0]) * s, v[1] + (u1[1] + u2[1]) * s]
  const c: Pt = [v[0] + u2[0] * s, v[1] + u2[1] * s]
  return (
    <>
      <path d={polyD([v, a, b, c])} fill={color} opacity={0.85} />
      <path d={`M ${a[0]} ${a[1]} L ${b[0]} ${b[1]} L ${c[0]} ${c[1]}`} fill="none" stroke={M.ink} strokeWidth={width} strokeLinejoin="round" strokeLinecap="round" />
    </>
  )
}

/**
 * An angle wedge at `v` from screen angle `a0` to `a1` (radians, from +x,
 * y-down; a1 < a0 opens "upward" counter-clockwise on screen).
 */
export function wedgePath(v: Pt, r: number, a0: number, a1: number): string {
  const p0: Pt = [v[0] + r * Math.cos(a0), v[1] + r * Math.sin(a0)]
  const p1: Pt = [v[0] + r * Math.cos(a1), v[1] + r * Math.sin(a1)]
  const sweep = a1 > a0 ? 1 : 0
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0
  return `M ${v[0]} ${v[1]} L ${p0[0].toFixed(2)} ${p0[1].toFixed(2)} A ${r} ${r} 0 ${large} ${sweep} ${p1[0].toFixed(2)} ${p1[1].toFixed(2)} Z`
}

export function arcPath(v: Pt, r: number, a0: number, a1: number): string {
  const p0: Pt = [v[0] + r * Math.cos(a0), v[1] + r * Math.sin(a0)]
  const p1: Pt = [v[0] + r * Math.cos(a1), v[1] + r * Math.sin(a1)]
  const sweep = a1 > a0 ? 1 : 0
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0
  return `M ${p0[0].toFixed(2)} ${p0[1].toFixed(2)} A ${r} ${r} 0 ${large} ${sweep} ${p1[0].toFixed(2)} ${p1[1].toFixed(2)}`
}

/** "Equal length" tick(s) across the middle of segment a→b. */
export function Hash({ a, b, k = 1, n = 1, len = 22, color = M.ink }: { a: Pt; b: Pt; k?: number; n?: number; len?: number; color?: string }) {
  if (k <= 0.001) return null
  const m = mid(a, b)
  const dx = (b[0] - a[0]) / dist(a, b)
  const dy = (b[1] - a[1]) / dist(a, b)
  const h = (len / 2) * k
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const o = (i - (n - 1) / 2) * 10
        const cx = m[0] + dx * o
        const cy = m[1] + dy * o
        return <line key={i} x1={cx - dy * h} y1={cy + dx * h} x2={cx + dy * h} y2={cy - dx * h} stroke={color} strokeWidth={5} strokeLinecap="round" />
      })}
    </>
  )
}

/** A chunky flat pencil whose graphite tip sits at (x, y). */
export function Pencil({ x, y, rot = -38, s = 1, opacity = 1 }: { x: number; y: number; rot?: number; s?: number; opacity?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} opacity={opacity} filter="url(#sq-shadow)">
      <path d="M 0 0 L 16 -6 L 16 6 Z" fill={M.ink} />
      <path d="M 16 -6 L 36 -12 L 36 12 L 16 6 Z" fill="#f6d9a8" stroke={M.ink} strokeWidth={2.5} strokeLinejoin="round" />
      <rect x={36} y={-12} width={96} height={24} fill={M.gold} stroke={M.ink} strokeWidth={2.5} />
      <rect x={36} y={-4} width={96} height={8} fill="#f3b72e" />
      <rect x={132} y={-13} width={13} height={26} rx={2} fill="#c9ced8" stroke={M.ink} strokeWidth={2.5} />
      <rect x={145} y={-12} width={16} height={24} rx={7} fill={M.pink} stroke={M.ink} strokeWidth={2.5} />
    </g>
  )
}

/** A soft travelling shine (for idle loops on bars, coins, tiles). 0..1 position along a sweep. */
export const shine = (t: number, period = 3.2, offset = 0) => (((t + offset) % period) + period) % period / period

/** Springy 0→1 (no overshoot past ~1.1) for scale-ins that should not look elastic. */
export const soft = (t: number, at: number) => spring(t, at, { stiffness: 140, damping: 18 })

/** A curly brace from a to b (bulging toward `side` = +1 right/down of the a→b direction, -1 the other way). */
export function bracePath(a: Pt, b: Pt, depth = 18, side = 1): string {
  const l = dist(a, b)
  const ux = (b[0] - a[0]) / l
  const uy = (b[1] - a[1]) / l
  const nx = -uy * side
  const ny = ux * side
  const P = (s: number, d: number): string => `${(a[0] + ux * s + nx * d).toFixed(1)} ${(a[1] + uy * s + ny * d).toFixed(1)}`
  const h = l / 2
  return `M ${P(0, 0)} Q ${P(0, depth * 0.5)} ${P(depth * 0.6, depth * 0.5)} L ${P(h - depth * 0.6, depth * 0.5)} Q ${P(h, depth * 0.5)} ${P(h, depth)} Q ${P(h, depth * 0.5)} ${P(h + depth * 0.6, depth * 0.5)} L ${P(l - depth * 0.6, depth * 0.5)} Q ${P(l, depth * 0.5)} ${P(l, 0)}`
}

/** A big soft disc behind the focal object (depth + a sense of "stage"), breathing slowly. */
export function Backdrop({ t, at = 0, x, y, r, color = M.sky, opacity = 0.75, reduced = false }: { t: number; at?: number; x: number; y: number; r: number; color?: string; opacity?: number; reduced?: boolean }) {
  const s = spring(t, at, { stiffness: 80, damping: 13 })
  if (s <= 0.001) return null
  const breathe = reduced ? 0 : Math.sin(t * 0.9) * 0.012
  return (
    <g opacity={opacity}>
      <circle cx={x} cy={y} r={r * (s + breathe)} fill={color} />
      <circle cx={x} cy={y} r={r * (s + breathe) * 0.78} fill={M.white} opacity={0.35} />
    </g>
  )
}

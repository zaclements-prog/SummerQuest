/* eslint-disable react-refresh/only-export-components -- a registry of drawings (data) plus their drawing; not an HMR boundary */
import type { ReactNode } from 'react'
import { M } from '../../tutoring/motion/palette'

/**
 * Shape Grove's 1st-grade drawings (1.G.1): flat shapes that keep or break
 * what makes a shape that shape. Closed shapes with straight sides are drawn
 * as thick sticker-coloured outlines over a pale fill; any colour, big or
 * small, turned any way (what does NOT change the shape). An OPEN shape has a
 * gap in one side (no fill: it has no inside); a CURVED one has one side
 * bulging out. Plus a box (a rectangular solid) beside the kit's cube,
 * sphere, cone and cylinder. 100 × 100 box, nothing to read.
 *
 * Every drawing is in the `art` registry by name (`shapeArtName`).
 */

const INK = M.ink
const FILLS = ['#f2766b', '#ffcf4d', '#74d3bd', '#8ab8ff', '#b79af0', '#f7a1c4', '#8edb7c', '#ff9f80'] as const

export type Pt = readonly [number, number]

/** The flat shapes 1st grade sorts by their sides and corners. */
export type G1Flat = 'triangle' | 'rightTriangle' | 'thinTriangle' | 'square' | 'rectangle' | 'trapezoid' | 'pentagon' | 'hexagon' | 'circle' | 'oval'
export const G1_FLATS: readonly G1Flat[] = ['triangle', 'rightTriangle', 'thinTriangle', 'square', 'rectangle', 'trapezoid', 'pentagon', 'hexagon', 'circle', 'oval']

/** What a flat shape is called (the three triangles are all triangles). */
export const FLAT_NAME: Record<G1Flat, 'triangle' | 'square' | 'rectangle' | 'trapezoid' | 'pentagon' | 'hexagon' | 'circle' | 'oval'> = {
  triangle: 'triangle',
  rightTriangle: 'triangle',
  thinTriangle: 'triangle',
  square: 'square',
  rectangle: 'rectangle',
  trapezoid: 'trapezoid',
  pentagon: 'pentagon',
  hexagon: 'hexagon',
  circle: 'circle',
  oval: 'oval',
}

const regular = (n: number, r: number, start: number): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = ((start + (360 * i) / n) * Math.PI) / 180
    return [Math.round((50 + Math.cos(a) * r) * 10) / 10, Math.round((52 + Math.sin(a) * r) * 10) / 10] as const
  })

/** Corners, clockwise, before any turn (null: a round shape). */
export const FLAT_CORNERS: Record<G1Flat, Pt[] | null> = {
  triangle: [
    [50, 12],
    [90, 82],
    [10, 82],
  ],
  rightTriangle: [
    [18, 14],
    [84, 84],
    [18, 84],
  ],
  thinTriangle: [
    [64, 26],
    [94, 74],
    [6, 74],
  ],
  square: [
    [17, 17],
    [83, 17],
    [83, 83],
    [17, 83],
  ],
  rectangle: [
    [6, 30],
    [94, 30],
    [94, 70],
    [6, 70],
  ],
  trapezoid: [
    [30, 26],
    [70, 26],
    [94, 74],
    [6, 74],
  ],
  pentagon: regular(5, 41, -90),
  hexagon: regular(6, 41, 0),
  circle: null,
  oval: null,
}

/** Straight sides (and corners) of a closed flat shape: 0 for a round one. */
export const flatSides = (s: G1Flat) => FLAT_CORNERS[s]?.length ?? 0

/** What breaks a shape: an opening in a side, or one side curved. */
export type ShapeFlaw = 'open' | 'curved'
/** The shapes drawn open or curved (the ones "Which one is still a …?" asks about). */
export const FLAWED: Record<ShapeFlaw, readonly G1Flat[]> = {
  open: ['triangle', 'rightTriangle', 'square', 'rectangle', 'circle'],
  curved: ['triangle', 'rightTriangle', 'square', 'rectangle'],
}

/** A flat-shape drawing: the shape, maybe broken, its colour, its turn, big or small. */
export interface ShapeArt {
  shape: G1Flat
  flaw?: ShapeFlaw
  /** Sticker colour (0–7). */
  color: number
  /** Turned this many degrees clockwise. */
  turn: number
  small?: boolean
}

/** The turns a drawing can have (never 45°: a square turned half way reads as a "diamond"). */
export const SHAPE_TURNS = [0, 20, -25, 90, 160, 210] as const

export function shapeArtName(a: ShapeArt): string {
  return `g1shape-${a.shape}-${a.flaw ?? 'ok'}-c${a.color}-t${a.turn}-${a.small ? 's' : 'b'}`
}

const NAME = /^g1shape-([a-zA-Z]+)-(ok|open|curved)-c([0-7])-t(-?\d+)-(s|b)$/

export function parseShapeArt(name: string): ShapeArt | null {
  const m = NAME.exec(name)
  if (!m || !(G1_FLATS as readonly string[]).includes(m[1])) return null
  return { shape: m[1] as G1Flat, ...(m[2] === 'ok' ? {} : { flaw: m[2] as ShapeFlaw }), color: Number(m[3]), turn: Number(m[4]), ...(m[5] === 's' ? { small: true } : {}) }
}

/** The path of a closed shape (corners joined), with side `bulge` curved outward. */
function closedPath(corners: Pt[], bulge = -1): string {
  const n = corners.length
  const cx = corners.reduce((s, p) => s + p[0], 0) / n
  const cy = corners.reduce((s, p) => s + p[1], 0) / n
  let d = `M ${corners[0][0]} ${corners[0][1]}`
  for (let i = 0; i < n; i++) {
    const a = corners[i]
    const b = corners[(i + 1) % n]
    if (i === bulge) {
      const mx = (a[0] + b[0]) / 2
      const my = (a[1] + b[1]) / 2
      const len = Math.hypot(b[0] - a[0], b[1] - a[1])
      const dl = Math.hypot(mx - cx, my - cy) || 1
      const k = len * 0.42
      d += ` Q ${(mx + ((mx - cx) / dl) * k).toFixed(1)} ${(my + ((my - cy) / dl) * k).toFixed(1)} ${b[0]} ${b[1]}`
    } else {
      d += ` L ${b[0]} ${b[1]}`
    }
  }
  return `${d} Z`
}

/** An open outline: the shape's sides with a gap in the middle of the last one. */
function openPath(corners: Pt[]): string {
  const n = corners.length
  const a = corners[n - 1]
  const b = corners[0]
  // the gap: the middle of the side from the last corner back to the first, wide enough to see on a small card
  const g1: Pt = [a[0] + (b[0] - a[0]) * 0.3, a[1] + (b[1] - a[1]) * 0.3]
  const g2: Pt = [a[0] + (b[0] - a[0]) * 0.7, a[1] + (b[1] - a[1]) * 0.7]
  return `M ${g2[0].toFixed(1)} ${g2[1].toFixed(1)} L ${corners.map((p) => `${p[0]} ${p[1]}`).join(' L ')} L ${g1[0].toFixed(1)} ${g1[1].toFixed(1)}`
}

/** A flat shape (closed, open or with a curved side), filling the 100 × 100 box. */
export function FlatShape({ shape, flaw, color, turn, small }: ShapeArt) {
  const fill = FILLS[((color % 8) + 8) % 8]
  const corners = FLAT_CORNERS[shape]
  const outer = { fill: 'none', stroke: INK, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
  const inner = { fill: 'none', stroke: fill, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
  let d: string
  let closed = flaw !== 'open'
  if (corners) {
    d = flaw === 'open' ? openPath(corners) : closedPath(corners, flaw === 'curved' ? corners.length - 1 : -1)
  } else if (shape === 'circle') {
    // an open circle is a "C": an arc with a gap on the right
    d = flaw === 'open' ? 'M 81.2 34 A 36 36 0 1 0 81.2 70' : 'M 14 52 A 36 36 0 1 0 86 52 A 36 36 0 1 0 14 52 Z'
  } else {
    d = 'M 8 52 A 42 25 0 1 0 92 52 A 42 25 0 1 0 8 52 Z'
    closed = true
  }
  const scale = small ? 0.6 : 0.92
  return (
    <g transform={`translate(50 52) scale(${scale}) rotate(${turn}) translate(-50 -52)`} data-shape={shape} data-flaw={flaw ?? 'ok'}>
      {closed && <path d={d} fill={fill} opacity={0.32} />}
      <path d={d} {...outer} strokeWidth={10 / Math.sqrt(scale)} />
      <path d={d} {...inner} strokeWidth={5 / Math.sqrt(scale)} />
    </g>
  )
}

// ── a box (a rectangular solid), in the kit's solid style ────────────────────

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16)
  const mix = (c: number) => Math.round(f >= 0 ? c + (255 - c) * f : c * (1 + f))
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(mix)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

/** A box: a long block with flat faces (it stacks, it can't roll). */
export function BoxSolid({ color }: { color: number }) {
  const fill = FILLS[((color % 8) + 8) % 8]
  const stroke = { stroke: INK, strokeWidth: 4, strokeLinejoin: 'round' as const }
  return (
    <g data-solid="box">
      <polygon points="10,44 26,30 90,30 74,44" fill={shade(fill, 0.55)} {...stroke} />
      <polygon points="74,44 90,30 90,62 74,76" fill={shade(fill, -0.3)} {...stroke} />
      <rect x={10} y={44} width={64} height={32} fill={fill} {...stroke} />
    </g>
  )
}

export const boxArtName = (color: number) => `g1solid-box-c${color}`

// ── the registry ─────────────────────────────────────────────────────────────

/** Every drawing a 1st-grade shape question can show. */
export function allShapeArt(): ShapeArt[] {
  const out: ShapeArt[] = []
  for (const shape of G1_FLATS) {
    const flaws: (ShapeFlaw | undefined)[] = [undefined, ...(['open', 'curved'] as const).filter((f) => FLAWED[f].includes(shape))]
    for (const flaw of flaws) for (let color = 0; color < 8; color++) for (const turn of SHAPE_TURNS) for (const small of [false, true]) out.push({ shape, ...(flaw ? { flaw } : {}), color, turn, ...(small ? { small } : {}) })
  }
  return out
}

/** Shape Grove's 1st-grade drawings, by name, for the `art` registry (src/games/listenPlay/drawings.tsx). */
export const G1_SHAPE_DRAWINGS: Record<string, () => ReactNode> = {
  ...Object.fromEntries(allShapeArt().map((a) => [shapeArtName(a), () => <FlatShape {...a} />])),
  ...Object.fromEntries(Array.from({ length: 8 }, (_, c) => [boxArtName(c), () => <BoxSolid color={c} />])),
}

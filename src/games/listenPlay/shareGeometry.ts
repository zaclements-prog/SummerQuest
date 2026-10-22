/**
 * Fair Share Falls' shapes cut into shares (1st grade, 1.G.3), as plain
 * geometry: no React, so the provider, the drawings and the tests share it.
 *
 * A thing (a pizza, a sandwich, a cake…) is a circle, a square or a long
 * rectangle in the 100 × 100 picture box. A CUT splits it into shares, each a
 * convex polygon: the thing's outline clipped by straight lines. Equal cuts
 * are exact (halves through the middle, fourths by two middle lines or four
 * even strips); unequal ones are plainly unequal (a line a third of the way
 * across, a cross well off the middle, uneven strips), never "nearly equal".
 * `mix` is a half and two fourths: one half cut in half again.
 */

export type Point = readonly [number, number]
export type ShareBase = 'circle' | 'square' | 'rect'
export type ShareThing = 'pizza' | 'pie' | 'sandwich' | 'cake' | 'garden'

/** Each thing's outline. */
export const THING_BASE: Record<ShareThing, ShareBase> = { pizza: 'circle', pie: 'circle', sandwich: 'square', cake: 'rect', garden: 'rect' }
export const SHARE_THINGS: readonly ShareThing[] = ['pizza', 'pie', 'sandwich', 'cake', 'garden']

/**
 * The cuts:
 * - `h2` halves by a middle line, up and down (`h2h` across, `h2d` corner to
 *   corner on a square, or slanted on a circle);
 * - `q4` fourths by two middle lines (`q4x`: corner to corner on a square,
 *   slanted on a circle; `q4s`: four even strips on a square or a rectangle);
 * - `u2` / `u2h` two unequal shares (a line a third of the way across);
 * - `u4` four unequal shares (a cross well off the middle); `u4s` four
 *   uneven strips;
 * - `mix` a half and two fourths (the half first).
 */
export type ShareCut = 'h2' | 'h2h' | 'h2d' | 'q4' | 'q4x' | 'q4s' | 'u2' | 'u2h' | 'u4' | 'u4s' | 'mix'
export const SHARE_CUTS: readonly ShareCut[] = ['h2', 'h2h', 'h2d', 'q4', 'q4x', 'q4s', 'u2', 'u2h', 'u4', 'u4s', 'mix']

/** How many shares a cut makes, and whether they are equal. */
export const CUT_INFO: Record<ShareCut, { parts: number; equal: boolean }> = {
  h2: { parts: 2, equal: true },
  h2h: { parts: 2, equal: true },
  h2d: { parts: 2, equal: true },
  q4: { parts: 4, equal: true },
  q4x: { parts: 4, equal: true },
  q4s: { parts: 4, equal: true },
  u2: { parts: 2, equal: false },
  u2h: { parts: 2, equal: false },
  u4: { parts: 4, equal: false },
  u4s: { parts: 4, equal: false },
  mix: { parts: 3, equal: false },
}

/** The cuts a thing's outline can take (strips need straight sides; a diagonal halves a square, not a long cake). */
export function cutsFor(base: ShareBase): ShareCut[] {
  if (base === 'circle') return ['h2', 'h2h', 'h2d', 'q4', 'q4x', 'u2', 'u2h', 'u4', 'mix']
  if (base === 'square') return ['h2', 'h2h', 'h2d', 'q4', 'q4x', 'q4s', 'u2', 'u2h', 'u4', 'u4s', 'mix']
  return ['h2', 'h2h', 'q4', 'q4s', 'u2', 'u2h', 'u4', 'u4s', 'mix']
}

const CX = 50
const CY = 50
const R = 40
/** The outline's box: the square sandwich, the long cake and garden. */
export const BOX: Record<Exclude<ShareBase, 'circle'>, { x0: number; y0: number; x1: number; y1: number }> = {
  square: { x0: 14, y0: 14, x1: 86, y1: 86 },
  rect: { x0: 6, y0: 22, x1: 94, y1: 78 },
}

/** The outline as a polygon (a circle as a fine 120-gon). */
export function outline(base: ShareBase, r = R): Point[] {
  if (base === 'circle') return Array.from({ length: 120 }, (_, i) => [CX + Math.cos((i / 120) * Math.PI * 2) * r, CY + Math.sin((i / 120) * Math.PI * 2) * r] as const)
  const b = BOX[base]
  return [
    [b.x0, b.y0],
    [b.x1, b.y0],
    [b.x1, b.y1],
    [b.x0, b.y1],
  ]
}

/** A half-plane: the points X with (X − p) · n ≤ 0. */
interface Half {
  p: Point
  n: Point
}

/** Clip a convex polygon to a half-plane (Sutherland–Hodgman, one edge). */
function clip(poly: Point[], h: Half): Point[] {
  const side = (q: Point) => (q[0] - h.p[0]) * h.n[0] + (q[1] - h.p[1]) * h.n[1]
  const out: Point[] = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const sa = side(a)
    const sb = side(b)
    if (sa <= 0) out.push(a)
    if ((sa < 0 && sb > 0) || (sa > 0 && sb < 0)) {
      const t = sa / (sa - sb)
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
    }
  }
  return out
}

const vline = (x: number, keep: 'left' | 'right'): Half => ({ p: [x, 0], n: keep === 'left' ? [1, 0] : [-1, 0] })
const hline = (y: number, keep: 'top' | 'bottom'): Half => ({ p: [0, y], n: keep === 'top' ? [0, 1] : [0, -1] })
/** The line through p at `deg` (0: up and down); keep the side its normal points away from (`sign` flips it). */
function line(p: Point, deg: number, sign: 1 | -1): Half {
  const a = (deg * Math.PI) / 180
  // direction (sin a, -cos a); normal (cos a, sin a)
  return { p, n: [Math.cos(a) * sign, Math.sin(a) * sign] }
}

/** The middle and the box of an outline. */
function frame(base: ShareBase) {
  if (base === 'circle') return { cx: CX, cy: CY, x0: CX - R, y0: CY - R, x1: CX + R, y1: CY + R }
  const b = BOX[base]
  return { cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2, ...b }
}

/** Each share's half-planes, before any turn. */
function shareCuts(base: ShareBase, cut: ShareCut): Half[][] {
  const f = frame(base)
  const w = f.x1 - f.x0
  const h = f.y1 - f.y0
  const mid: Point = [f.cx, f.cy]
  switch (cut) {
    case 'h2':
      return [[vline(f.cx, 'left')], [vline(f.cx, 'right')]]
    case 'h2h':
      return [[hline(f.cy, 'top')], [hline(f.cy, 'bottom')]]
    case 'h2d': {
      // corner to corner on a square (both halves the same triangle, turned); slanted through the middle on a circle
      const deg = base === 'circle' ? 45 : -(Math.atan2(w, h) * 180) / Math.PI
      return [[line(mid, deg, 1)], [line(mid, deg, -1)]]
    }
    case 'q4':
      return [
        [vline(f.cx, 'left'), hline(f.cy, 'top')],
        [vline(f.cx, 'right'), hline(f.cy, 'top')],
        [vline(f.cx, 'right'), hline(f.cy, 'bottom')],
        [vline(f.cx, 'left'), hline(f.cy, 'bottom')],
      ]
    case 'q4x': {
      // two slanted lines through the middle (a square's diagonals): four shares, one each side of both
      const d1 = base === 'circle' ? 45 : -(Math.atan2(w, h) * 180) / Math.PI
      const d2 = -d1
      return [
        [line(mid, d1, 1), line(mid, d2, 1)],
        [line(mid, d1, -1), line(mid, d2, 1)],
        [line(mid, d1, -1), line(mid, d2, -1)],
        [line(mid, d1, 1), line(mid, d2, -1)],
      ]
    }
    case 'q4s':
      return [0, 1, 2, 3].map((k) => [vline(f.x0 + (w * k) / 4, 'right'), vline(f.x0 + (w * (k + 1)) / 4, 'left')])
    case 'u2': {
      const x = base === 'circle' ? f.cx - R * 0.45 : f.x0 + w * 0.3
      return [[vline(x, 'left')], [vline(x, 'right')]]
    }
    case 'u2h': {
      const y = base === 'circle' ? f.cy - R * 0.45 : f.y0 + h * 0.3
      return [[hline(y, 'top')], [hline(y, 'bottom')]]
    }
    case 'u4': {
      const x = base === 'circle' ? f.cx + R * 0.42 : f.x0 + w * 0.3
      const y = base === 'circle' ? f.cy + R * 0.38 : f.y0 + h * 0.68
      return [
        [vline(x, 'left'), hline(y, 'top')],
        [vline(x, 'right'), hline(y, 'top')],
        [vline(x, 'right'), hline(y, 'bottom')],
        [vline(x, 'left'), hline(y, 'bottom')],
      ]
    }
    case 'u4s': {
      const cuts = [0, 0.12, 0.32, 0.62, 1].map((k) => f.x0 + w * k)
      return [0, 1, 2, 3].map((k) => [vline(cuts[k], 'right'), vline(cuts[k + 1], 'left')])
    }
    case 'mix':
      // the left half, then the right half cut across: its top fourth and its bottom fourth
      return [
        [vline(f.cx, 'left')],
        [vline(f.cx, 'right'), hline(f.cy, 'top')],
        [vline(f.cx, 'right'), hline(f.cy, 'bottom')],
      ]
  }
}

/** Turn a point about the box's middle (clockwise, on screen). */
export function turnPoint([x, y]: Point, deg: number): Point {
  if (!deg) return [x, y]
  const a = (deg * Math.PI) / 180
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [CX + (x - CX) * c - (y - CY) * s, CY + (x - CX) * s + (y - CY) * c]
}

/**
 * The shares of a thing cut this way, as polygons. `turn` (0, 90, 180, 270)
 * turns the cut, on a circle or a square only (a turned long cake would no
 * longer fit its box).
 */
export function shares(base: ShareBase, cut: ShareCut, turn = 0): Point[][] {
  const t = base === 'rect' ? 0 : turn
  const o = outline(base)
  return shareCuts(base, cut).map((hs) => hs.reduce((poly, h) => clip(poly, h), o).map((p) => turnPoint(p, t)))
}

/** A polygon's area (shoelace). */
export function area(poly: readonly Point[]): number {
  let s = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    s += a[0] * b[1] - b[0] * a[1]
  }
  return Math.abs(s) / 2
}

/** A polygon's middle (the mean of its corners: fine for the convex shares here). */
export function centroid(poly: readonly Point[]): Point {
  const n = poly.length || 1
  return [poly.reduce((s, p) => s + p[0], 0) / n, poly.reduce((s, p) => s + p[1], 0) / n]
}

/** An SVG path for a polygon. */
export function polyPath(poly: readonly Point[]): string {
  return poly.length ? `M ${poly.map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' L ')} Z` : ''
}

/** A `mix` share's name: the half, or a fourth. */
export const mixRole = (i: number): 'half' | 'fourth' => (i === 0 ? 'half' : 'fourth')

// ── the drawings' names (the `art` picture kind) ─────────────────────────────

/** A share drawing: a thing, cut this way, maybe one share coloured in. */
export interface ShareArt {
  thing: ShareThing
  cut: ShareCut
  /** The coloured share (an index into `shares`), if any. */
  colored?: number
  /** A circle or a square cut turned (0, 90, 180, 270). */
  turn?: number
}

/** The drawing's name in the `art` registry: `share-pizza-q4-c1-t90` (no colour: `c-`). */
export function shareArtName(a: ShareArt): string {
  return `share-${a.thing}-${a.cut}-c${a.colored ?? '-'}-t${a.turn ?? 0}`
}

const NAME = /^share-(pizza|pie|sandwich|cake|garden)-(h2|h2h|h2d|q4|q4x|q4s|u2|u2h|u4|u4s|mix)-c(-|\d)-t(0|90|180|270)$/

/** A drawing name back to what it shows (null: not a share drawing). */
export function parseShareArt(name: string): ShareArt | null {
  const m = NAME.exec(name)
  if (!m) return null
  return { thing: m[1] as ShareThing, cut: m[2] as ShareCut, ...(m[3] === '-' ? {} : { colored: Number(m[3]) }), turn: Number(m[4]) }
}

/** Every share drawing the registry holds: each thing, each cut it takes, plain or with one share coloured, each way round it turns. */
export function allShareArt(): ShareArt[] {
  const out: ShareArt[] = []
  for (const thing of SHARE_THINGS) {
    const base = THING_BASE[thing]
    for (const cut of cutsFor(base)) {
      const turns = base === 'rect' ? [0] : [0, 90, 180, 270]
      for (const turn of turns) {
        out.push({ thing, cut, turn })
        for (let c = 0; c < CUT_INFO[cut].parts; c++) out.push({ thing, cut, colored: c, turn })
      }
    }
  }
  return out
}

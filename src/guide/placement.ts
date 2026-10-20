/**
 * Pure geometry for the guide overlay (no DOM writes, testable): where the
 * spotlight hole, the ring and the pointing hand go for a target's rectangle.
 * All in viewport (client) pixels.
 */

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export function boxOf(r: { left: number; top: number; width: number; height: number }): Box {
  return { x: r.left, y: r.top, w: r.width, h: r.height }
}

/** The smallest box around all of `boxes` (null when there are none). */
export function unionBox(boxes: Box[]): Box | null {
  if (!boxes.length) return null
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const b of boxes) {
    x0 = Math.min(x0, b.x)
    y0 = Math.min(y0, b.y)
    x1 = Math.max(x1, b.x + b.w)
    y1 = Math.max(y1, b.y + b.h)
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/** A box grown by `pad` on every side, with a corner radius that suits its size. */
export function spotBox(b: Box, pad: number): Box & { r: number } {
  const w = b.w + pad * 2
  const h = b.h + pad * 2
  // small things get a round hole, big panels a soft rounded rectangle
  const r = Math.min(Math.min(w, h) / 2, 28 + pad)
  return { x: b.x - pad, y: b.y - pad, w, h, r }
}

export interface HandPlace {
  /** Top-left of the hand glyph box. */
  x: number
  y: number
  /** Pointing down from above (no room below the target). */
  flip: boolean
  /** Half the side-to-side travel for a sweeping hand (0 = taps in place). */
  sweep: number
}

/**
 * The fingertip of the 👆 glyph, as a fraction of its box (index finger, top,
 * a little left of centre). Emoji fonts differ by a few percent; close enough.
 */
const TIP_X = 0.42
const TIP_Y = 0.05

/**
 * Where the pointing hand sits for a target: below it, fingertip resting just
 * inside the target's lower part; flipped above it when there's no room below.
 * A big target (a panel, a bowl) gets the fingertip well inside it instead, so
 * the hand never hides at the screen's edge.
 * `sweep` hands (a row of answer cards) travel side to side along the row
 * instead of tapping one card, so the hand never hints at an answer.
 * `drag` hands rest on the target's middle (the drag animation starts from
 * elsewhere and ends there).
 */
export function handPlace(b: Box, size: number, vw: number, vh: number, mode: 'tap' | 'sweep' | 'drag'): HandPlace {
  const margin = 6
  const cx = b.x + b.w / 2
  // fingertip a little inside the target, so the hand reads as touching it
  const inset = Math.min(b.h * 0.22, 36)
  let flip = false
  let tipY = b.y + b.h - inset
  if (mode === 'drag') {
    tipY = b.y + b.h * 0.55
  } else if (b.h > vh * 0.42) {
    tipY = b.y + b.h * 0.62
  } else if (tipY - TIP_Y * size + size > vh - margin) {
    flip = true
    tipY = b.y + inset
  }
  // a flipped glyph is rotated 180°: its fingertip is at (1 - TIP_X, 1 - TIP_Y)
  const tx = flip ? 1 - TIP_X : TIP_X
  const ty = flip ? 1 - TIP_Y : TIP_Y
  let x = cx - tx * size
  let y = tipY - ty * size
  const sweep = mode === 'sweep' ? Math.max(0, Math.min(b.w / 2 - size * 0.55, 240)) : 0
  x = Math.min(Math.max(x, margin + sweep), vw - size - margin - sweep)
  y = Math.min(Math.max(y, margin), vh - size - margin)
  return { x, y, flip, sweep }
}

/** Two boxes the same to the pixel (what the overlay re-draws on). */
export function sameBox(a: Box | null, b: Box | null): boolean {
  if (!a || !b) return a === b
  return Math.round(a.x) === Math.round(b.x) && Math.round(a.y) === Math.round(b.y) && Math.round(a.w) === Math.round(b.w) && Math.round(a.h) === Math.round(b.h)
}

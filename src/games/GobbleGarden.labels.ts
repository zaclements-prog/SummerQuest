import { dotCells, toNumber } from '../lib/numbers'
import type { GobbleSetId, NumberShown } from '../lib/gobble'

/**
 * Gobble Garden's canvas labels: every snack's number lives in one cell of a
 * shared atlas (one texture, one instanced draw for all the labels), and the
 * cloud's number on its own small texture. Kindergarten's snacks are dot
 * groups with a small numeral; fractions are written stacked; long
 * expressions shrink to fit. With `pictures` on (the scaffold) the snack also
 * shows its picture: tens and ones, a fraction bar, a 0–1 bar.
 *
 * The two never look alike (playtests: on a phone-sized screen children
 * couldn't tell the cloud's number from a snack's): a snack's is a small
 * cream tag, only as wide as what it says, pointing down at its snack; the
 * cloud's sits in a big gold cloud shape.
 */

export const FONT = "'Fredoka', 'Comic Sans MS', system-ui, sans-serif"
export const INK = '#3a2c38'

/** The atlas: 3 × 6 cells of 256 × 128 px (one per snack slot). A tag is the cell's width at most; its pointer takes the bottom. */
export const ATLAS = { cols: 3, rows: 6, cw: 256, ch: 128 } as const

/** Re-draw every label once the display font has loaded (the first draw may use a fallback). */
let fontWait: Promise<unknown> | null = null
export function whenFontReady(fn: () => void): void {
  if (typeof document === 'undefined' || !document.fonts?.load) return
  fontWait ??= Promise.all([document.fonts.load(`700 80px Fredoka`), document.fonts.load(`600 40px Fredoka`)]).catch(() => null)
  void fontWait.then(fn)
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Bold text, shrunk to fit `maxW`. Returns the size used. */
function fitText(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, size: number, maxW: number, fill = INK): number {
  ctx.font = `700 ${size}px ${FONT}`
  const w = ctx.measureText(text).width
  const s = w > maxW ? Math.max(18, Math.floor((size * maxW) / w)) : size
  ctx.font = `700 ${s}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = fill
  ctx.fillText(text, cx, cy + s * 0.04)
  return s
}

/** Ten-frame dots (rows of 5): `n` reads as "5 and 2" at a glance. */
export function drawDots(ctx: CanvasRenderingContext2D, n: number, cx: number, cy: number, r: number, fill: string) {
  const rows = Math.max(1, Math.ceil(n / 5))
  const cols = Math.min(5, n)
  const step = r * 2.45
  const x0 = cx - ((cols - 1) * step) / 2
  const y0 = cy - ((rows - 1) * step) / 2
  for (const [c, row] of dotCells(n)) {
    ctx.beginPath()
    ctx.arc(x0 + c * step, y0 + row * step, r, 0, Math.PI * 2)
    ctx.fillStyle = fill
    ctx.fill()
    ctx.lineWidth = r * 0.32
    ctx.strokeStyle = INK
    ctx.stroke()
  }
}

/** A stacked fraction (n over a bar over d). */
function drawFraction(ctx: CanvasRenderingContext2D, n: number, d: number, cx: number, cy: number, size: number) {
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = INK
  ctx.font = `700 ${size}px ${FONT}`
  ctx.fillText(String(n), cx, cy - size * 0.52)
  ctx.fillText(String(d), cx, cy + size * 0.6)
  const w = Math.max(ctx.measureText(String(n)).width, ctx.measureText(String(d)).width) + size * 0.3
  ctx.fillRect(cx - w / 2, cy - size * 0.07, w, size * 0.13)
}

/** Base-ten blocks: tall rods for the tens, little cubes for the ones. */
export function drawBlocks(ctx: CanvasRenderingContext2D, tens: number, ones: number, cx: number, cy: number, h: number) {
  const rodW = h * 0.16
  const gap = h * 0.06
  const cube = rodW
  const onesCols = Math.ceil(ones / 5)
  const width = tens * (rodW + gap) + (ones ? gap * 2 + onesCols * (cube + gap) : 0)
  let x = cx - width / 2
  ctx.lineWidth = Math.max(1.5, h * 0.025)
  ctx.strokeStyle = INK
  for (let i = 0; i < tens; i++) {
    ctx.fillStyle = '#8ab8ff'
    ctx.fillRect(x, cy - h / 2, rodW, h)
    ctx.strokeRect(x, cy - h / 2, rodW, h)
    x += rodW + gap
  }
  x += gap * 2
  for (let i = 0; i < ones; i++) {
    const col = Math.floor(i / 5)
    const row = i % 5
    const y = cy + h / 2 - (row + 1) * (cube + gap * 0.4)
    ctx.fillStyle = '#ffd75e'
    ctx.fillRect(x + col * (cube + gap), y, cube, cube)
    ctx.strokeRect(x + col * (cube + gap), y, cube, cube)
  }
}

/** A bar filled to `frac` of a whole (more than one whole shows the overflow in a second colour). */
function drawBar(ctx: CanvasRenderingContext2D, frac: number, parts: number, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = '#fffaf0'
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = '#f2766b'
  ctx.fillRect(x, y, w * Math.min(1, frac), h)
  ctx.lineWidth = 2
  ctx.strokeStyle = INK
  if (parts > 1 && parts <= 12) {
    for (let i = 1; i < parts; i++) {
      ctx.beginPath()
      ctx.moveTo(x + (w * i) / parts, y)
      ctx.lineTo(x + (w * i) / parts, y + h)
      ctx.stroke()
    }
  }
  ctx.strokeRect(x, y, w, h)
}

/** The tag's height (the rest of the cell, below it, is the pointer). */
const TAG_H = 92
const TAG_TOP = 5

/** A cream tag `w` wide, centred in the cell at (x, y), with a little pointer down at its snack. Returns its width. */
function drawTag(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): number {
  const { cw, ch } = ATLAS
  const tw = Math.max(TAG_H, Math.min(cw - 10, w))
  const left = x + (cw - tw) / 2
  const cx = x + cw / 2
  const bottom = y + TAG_TOP + TAG_H
  ctx.lineJoin = 'round'
  ctx.lineWidth = 6
  ctx.strokeStyle = INK
  ctx.fillStyle = '#fffaf0'
  // the pointer first (its top hides under the tag)
  ctx.beginPath()
  ctx.moveTo(cx - 15, bottom - 8)
  ctx.lineTo(cx, y + ch - 8)
  ctx.lineTo(cx + 15, bottom - 8)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  roundRect(ctx, left, y + TAG_TOP, tw, TAG_H, 30)
  ctx.fill()
  ctx.stroke()
  // (the seam where the pointer meets the tag)
  ctx.fillRect(cx - 11, bottom - 6, 22, 7)
  return tw
}

/** The width `text` takes at `size` (bold display font). */
function textWidth(ctx: CanvasRenderingContext2D, text: string, size: number): number {
  ctx.font = `700 ${size}px ${FONT}`
  return ctx.measureText(text).width
}

/** Dots (rows of five) and the numeral beside them, centred on (cx, cy): kindergarten's value. */
function drawDotsAndNumeral(ctx: CanvasRenderingContext2D, v: NumberShown, cx: number, cy: number, r: number, numSize: number, fill: string): number {
  const n = toNumber(v.value)
  const span = (Math.min(5, n) - 1) * r * 2.45 + r * 2
  const numW = textWidth(ctx, v.text, numSize)
  const gap = r
  const left = cx - (span + gap + numW) / 2
  drawDots(ctx, n, left + span / 2, cy, r, fill)
  fitText(ctx, v.text, left + span + gap + numW / 2, cy, numSize, numW + 2)
  return span + gap + numW
}

/**
 * One snack label in the cell at (x, y): a cream tag only as wide as its
 * value (fewer overlaps), the value as its band writes it. Returns the tag's
 * width in px (the scene keeps edge tags on the screen with it).
 */
export function drawSnackLabel(ctx: CanvasRenderingContext2D, x: number, y: number, v: NumberShown, set: GobbleSetId, pictures: boolean): number {
  const { cw, ch } = ATLAS
  ctx.clearRect(x, y, cw, ch)
  const cx = x + cw / 2
  const cy = y + TAG_TOP + TAG_H / 2
  const n = toNumber(v.value)
  const full = cw
  if (set === 'k') {
    // dots first, the numeral small beside them (measured, then drawn on the tag)
    const r = 12
    const w = (Math.min(5, n) - 1) * r * 2.45 + r * 2 + r + textWidth(ctx, v.text, 40) + 36
    const tw = drawTag(ctx, x, y, w)
    drawDotsAndNumeral(ctx, v, cx, cy, r, 40, '#f2766b')
    return tw
  }
  if (v.form === 'fraction' && v.frac) {
    if (pictures) {
      const tw = drawTag(ctx, x, y, full)
      drawFraction(ctx, v.frac.n, v.frac.d, x + 62, cy, 34)
      drawBar(ctx, n, v.frac.d, x + 104, cy - 15, 120, 30)
      return tw
    }
    const tw = drawTag(ctx, x, y, 116)
    drawFraction(ctx, v.frac.n, v.frac.d, cx, cy, 36)
    return tw
  }
  if (pictures && set === 'g1') {
    const tw = drawTag(ctx, x, y, full)
    fitText(ctx, v.text, x + 64, cy, 56, 92)
    drawBlocks(ctx, Math.floor(n / 10), n % 10, x + 170, cy, 70)
    return tw
  }
  if (pictures && v.form === 'decimal') {
    const tw = drawTag(ctx, x, y, full)
    fitText(ctx, v.text, cx, cy - 15, 44, cw - 48)
    drawBar(ctx, n, 10, x + 36, cy + 16, cw - 72, 18)
    return tw
  }
  if (v.form === 'expr' && v.text.length > 7) {
    // a long expression on two lines ("4,000" over "+ 780"), so it stays big
    const i = v.text.search(/ [+−×] /)
    if (i > 0) {
      const a = v.text.slice(0, i)
      const b = v.text.slice(i + 1)
      const tw = drawTag(ctx, x, y, Math.max(textWidth(ctx, a, 40), textWidth(ctx, b, 40)) + 44)
      fitText(ctx, a, cx, cy - 20, 40, cw - 44)
      fitText(ctx, b, cx, cy + 20, 40, cw - 44)
      return tw
    }
  }
  const size = v.form === 'expr' ? 54 : 64
  const tw = drawTag(ctx, x, y, textWidth(ctx, v.text, size) + 48)
  fitText(ctx, v.text, cx, cy, size, cw - 44)
  return tw
}

/** A cloud shape (bumps on top, a rounded bottom) in a w × h box, `grow` px bigger all round (for the outline). */
function cloudShape(ctx: CanvasRenderingContext2D, w: number, h: number, grow: number) {
  const bumps: [number, number, number][] = [
    [0.18, 0.58, 0.25],
    [0.38, 0.36, 0.3],
    [0.62, 0.33, 0.31],
    [0.82, 0.57, 0.25],
  ]
  ctx.beginPath()
  for (const [bx, by, br] of bumps) {
    ctx.moveTo(bx * w + br * h + grow, by * h)
    ctx.arc(bx * w, by * h, br * h + grow, 0, Math.PI * 2)
  }
  ctx.fill()
  roundRect(ctx, 0.08 * w - grow, 0.4 * h - grow, 0.84 * w + grow * 2, 0.56 * h + grow * 2, 0.24 * h + grow)
  ctx.fill()
}

/** The cloud badge's canvas size; the scene's plane keeps its aspect. */
export const CLOUD_BADGE = { w: 320, h: 200 } as const

/** The cloud's number (its own canvas): in a big gold cloud shape, so it never reads as a snack's tag. */
export function drawCloudBadge(ctx: CanvasRenderingContext2D, v: NumberShown, set: GobbleSetId) {
  const w = ctx.canvas.width
  const h = ctx.canvas.height
  ctx.clearRect(0, 0, w, h)
  // (inset, so the outline stays on the canvas)
  ctx.save()
  ctx.translate(w * 0.03, h * 0.03)
  ctx.fillStyle = INK
  cloudShape(ctx, w * 0.94, h * 0.94, 8)
  ctx.fillStyle = '#ffd84a'
  cloudShape(ctx, w * 0.94, h * 0.94, 0)
  ctx.restore()
  const cy = h * 0.63
  if (set === 'k') drawDotsAndNumeral(ctx, v, w / 2, cy, 15, 66, '#ffffff')
  else if (v.form === 'fraction' && v.frac) drawFraction(ctx, v.frac.n, v.frac.d, w / 2, cy + 2, 46)
  else fitText(ctx, v.text, w / 2, cy, 84, w * 0.72)
}

import { dotCells, toNumber } from '../lib/numbers'
import type { GobbleSetId, NumberShown } from '../lib/gobble'

/**
 * Gobble Garden's canvas labels: every snack's number lives in one cell of a
 * shared atlas (one texture, one instanced draw for all the labels), and the
 * cloud's number on its own small texture. Kindergarten's snacks are dot
 * groups with a small numeral; fractions are written stacked; long
 * expressions shrink to fit. With `pictures` on (the scaffold) the snack also
 * shows its picture: tens and ones, a fraction bar, a 0–1 bar.
 */

export const FONT = "'Fredoka', 'Comic Sans MS', system-ui, sans-serif"
export const INK = '#3a2c38'

/** The atlas: 3 × 6 cells of 256 × 128 px (one per snack slot). */
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

/**
 * One snack label in the cell at (x, y). A cream badge with the warm outline;
 * the value as its band writes it.
 */
export function drawSnackLabel(ctx: CanvasRenderingContext2D, x: number, y: number, v: NumberShown, set: GobbleSetId, pictures: boolean) {
  const { cw, ch } = ATLAS
  ctx.clearRect(x, y, cw, ch)
  const pad = 6
  roundRect(ctx, x + pad, y + pad, cw - pad * 2, ch - pad * 2, 34)
  ctx.fillStyle = '#fffaf0'
  ctx.fill()
  ctx.lineWidth = 7
  ctx.strokeStyle = INK
  ctx.stroke()
  const cx = x + cw / 2
  const cy = y + ch / 2
  const n = toNumber(v.value)
  if (set === 'k') {
    // dots first, the numeral small beside them
    drawDots(ctx, n, cx - 30, cy, n > 5 ? 12 : 14, '#f2766b')
    fitText(ctx, v.text, x + cw - 36, cy, 44, 44)
    return
  }
  if (v.form === 'fraction' && v.frac) {
    if (pictures) {
      drawFraction(ctx, v.frac.n, v.frac.d, x + 70, cy, 42)
      drawBar(ctx, n, v.frac.d, x + 118, cy - 18, 112, 36)
    } else drawFraction(ctx, v.frac.n, v.frac.d, cx, cy, 46)
    return
  }
  if (pictures && set === 'g1') {
    fitText(ctx, v.text, x + 64, cy, 64, 100)
    drawBlocks(ctx, Math.floor(n / 10), n % 10, x + 172, cy, 84)
    return
  }
  if (pictures && v.form === 'decimal') {
    fitText(ctx, v.text, cx, cy - 18, 52, cw - 40)
    drawBar(ctx, n, 10, x + 34, cy + 22, cw - 68, 22)
    return
  }
  if (v.form === 'expr' && v.text.length > 7) {
    // a long expression on two lines ("4,000" over "+ 780"), so it stays big
    const i = v.text.search(/ [+−×] /)
    if (i > 0) {
      fitText(ctx, v.text.slice(0, i), cx, cy - 25, 50, cw - 40)
      fitText(ctx, v.text.slice(i + 1), cx, cy + 25, 50, cw - 40)
      return
    }
  }
  fitText(ctx, v.text, cx, cy, v.form === 'expr' ? 64 : 80, cw - 36)
}

/** The cloud's number badge (its own canvas, 256 × 160): bigger, gold-rimmed. */
export function drawCloudBadge(ctx: CanvasRenderingContext2D, v: NumberShown, set: GobbleSetId) {
  const w = ctx.canvas.width
  const h = ctx.canvas.height
  ctx.clearRect(0, 0, w, h)
  roundRect(ctx, 8, 8, w - 16, h - 16, 44)
  ctx.fillStyle = '#ffe58a'
  ctx.fill()
  ctx.lineWidth = 9
  ctx.strokeStyle = INK
  ctx.stroke()
  const n = toNumber(v.value)
  if (set === 'k') {
    drawDots(ctx, n, w / 2 - 34, h / 2, 16, '#ffffff')
    fitText(ctx, v.text, w - 52, h / 2, 64, 70)
  } else if (v.form === 'fraction' && v.frac) drawFraction(ctx, v.frac.n, v.frac.d, w / 2, h / 2, 54)
  else fitText(ctx, v.text, w / 2, h / 2, 92, w - 44)
}

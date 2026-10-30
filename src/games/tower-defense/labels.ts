import { CanvasTexture, LinearMipmapLinearFilter, SRGBColorSpace } from 'three'
import { dotCells } from '../../lib/numbers'
import { rule, valueKey, valueText, type PuddleValue, type RuleId } from '../../lib/puddle'
import { registerSharedGpuCache } from '../../platform/gl/release'

/**
 * Canvas-drawn labels for the 3D field: the value on a Pudding's tummy (dots
 * for kindergarten, "3 + 2" for 1st grade, a stacked fraction or a decimal
 * for grade 5) and each sprinkler's rule badge. One texture per distinct
 * label, cached for the whole game (a stage has a few dozen at most) and
 * released with the canvas.
 */

const FONT = "'Fredoka', 'Comic Sans MS', system-ui, sans-serif"
const INK = '#3a2c38'

const cache = new Map<string, CanvasTexture>()
registerSharedGpuCache(() => cache.values())

/** Redraw every cached label once the display font has loaded (the first draw may use a fallback). */
let fontWait: Promise<unknown> | null = null
const drawers = new Map<string, (c: HTMLCanvasElement) => void>()
function whenFont() {
  if (fontWait || typeof document === 'undefined' || !document.fonts?.load) return
  fontWait = Promise.all([document.fonts.load('700 80px Fredoka'), document.fonts.load('600 40px Fredoka')])
    .catch(() => null)
    .then(() => {
      for (const [key, draw] of drawers) {
        const t = cache.get(key)
        if (!t) continue
        draw(t.image as HTMLCanvasElement)
        t.needsUpdate = true
      }
    })
}

function texture(key: string, w: number, h: number, draw: (c: HTMLCanvasElement) => void): CanvasTexture {
  let t = cache.get(key)
  if (t) return t
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c)
  t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.minFilter = LinearMipmapLinearFilter
  t.anisotropy = 4
  cache.set(key, t)
  drawers.set(key, draw)
  whenFont()
  return t
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

/** Text that fits `maxW`, with a thick paper-white outline (reads on any background). */
function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, maxW: number, fill = INK) {
  let s = size
  ctx.font = `700 ${s}px ${FONT}`
  while (ctx.measureText(text).width > maxW && s > 14) {
    s -= 4
    ctx.font = `700 ${s}px ${FONT}`
  }
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = fill
  ctx.fillText(text, x, y)
}

/** Dots in rows of five (5 and 2 reads as seven at a glance). */
function drawDots(ctx: CanvasRenderingContext2D, n: number, cx: number, cy: number, r: number, color: string) {
  const cells = dotCells(n)
  const rows = Math.max(1, Math.ceil(n / 5))
  const cols = Math.min(5, n)
  const gap = r * 2.5
  for (const [col, row] of cells) {
    const inRow = row === rows - 1 ? n - row * 5 : 5
    const x = cx + (col - (Math.min(cols, inRow) - 1) / 2) * gap
    const y = cy + (row - (rows - 1) / 2) * gap
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.lineWidth = r * 0.28
    ctx.strokeStyle = INK
    ctx.stroke()
  }
}

/** The tummy label a Pudding carries (a round cream badge). */
export function puddingLabel(v: PuddleValue): CanvasTexture {
  return texture(`p|${valueKey(v)}`, 256, 256, (c) => {
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, 256, 256)
    roundRect(ctx, 10, 34, 236, 188, 64)
    ctx.fillStyle = '#fffaf0'
    ctx.fill()
    ctx.lineWidth = 10
    ctx.strokeStyle = INK
    ctx.stroke()
    if (v.kind === 'dots') {
      drawDots(ctx, v.n, 128, 128, v.n > 5 ? 17 : 21, '#7a4a2a')
    } else if (v.kind === 'frac') {
      // stacked: numerator, bar, denominator
      ctx.fillStyle = INK
      ctx.fillRect(70, 124, 116, 9)
      fitText(ctx, String(v.n), 128, 84, 70, 200)
      fitText(ctx, String(v.d), 128, 176, 70, 200)
    } else {
      fitText(ctx, valueText(v), 128, 130, v.kind === 'sum' ? 84 : 104, 214)
    }
  })
}

/** A sprinkler's rule badge (a signboard in the rule's colour). */
export function ruleBadge(id: RuleId): CanvasTexture {
  const r = rule(id)
  return texture(`r|${id}`, 256, 192, (c) => {
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, 256, 192)
    roundRect(ctx, 8, 8, 240, 176, 40)
    ctx.fillStyle = r.color
    ctx.fill()
    ctx.lineWidth = 10
    ctx.strokeStyle = INK
    ctx.stroke()
    roundRect(ctx, 24, 24, 208, 144, 28)
    ctx.fillStyle = '#fffaf0'
    ctx.fill()
    if (r.badgeDots) {
      const { n, arrow } = r.badgeDots
      drawDots(ctx, n, arrow ? 108 : 128, 96, n > 4 ? 15 : 20, r.color)
      if (arrow) {
        // ▲ more / ▼ fewer, beside the five
        ctx.beginPath()
        const x = 206
        if (arrow === 'up') {
          ctx.moveTo(x, 62)
          ctx.lineTo(x + 20, 104)
          ctx.lineTo(x - 20, 104)
        } else {
          ctx.moveTo(x, 130)
          ctx.lineTo(x + 20, 88)
          ctx.lineTo(x - 20, 88)
        }
        ctx.closePath()
        ctx.fillStyle = INK
        ctx.fill()
      }
      return
    }
    if (r.badge.small) {
      ctx.font = `600 30px ${FONT}`
      fitText(ctx, r.badge.small, 128, 54, 30, 190, '#6b5a66')
      fitText(ctx, r.badge.big, 128, 116, 76, 196)
    } else {
      fitText(ctx, r.badge.big, 128, 98, 74, 196)
    }
  })
}

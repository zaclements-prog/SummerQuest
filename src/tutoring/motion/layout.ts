import { mixColor } from './anim'
import { M } from './palette'

/**
 * Plain helpers for laying out and colouring scene graphics (kept out of the
 * .tsx component modules so Fast Refresh stays happy).
 */

/** Fredoka 700 advance widths (em), so type can be laid out without measuring. */
const GLYPH: Record<string, number> = {
  '0': 0.57, '1': 0.38, '2': 0.57, '3': 0.57, '4': 0.55, '5': 0.49, '6': 0.52, '7': 0.52, '8': 0.54, '9': 0.52,
  '+': 0.49, '−': 0.54, '-': 0.4, '×': 0.49, '÷': 0.47, '=': 0.45, '<': 0.58, '>': 0.58, '/': 0.49, ',': 0.22, '.': 0.22,
  '?': 0.48, '!': 0.25, ':': 0.22, '→': 1, ' ': 0.24, i: 0.25, j: 0.23, l: 0.31, f: 0.42, t: 0.43, r: 0.43, s: 0.46,
  m: 0.79, w: 0.74, I: 0.24, M: 0.81, W: 0.95,
}

/** Approximate rendered width of `text` in Fredoka bold at `size`. */
export function textWidth(text: string, size: number): number {
  let em = 0
  for (const ch of text) em += GLYPH[ch] ?? (ch >= 'A' && ch <= 'Z' ? 0.66 : 0.55)
  return em * size
}

/** Centre x of each token when `texts` are laid out on one line (for morphs between equations). */
export function tokenXs(texts: string[], x: number, size: number, gap = 0.22, anchor: 'start' | 'middle' | 'end' = 'middle'): number[] {
  const ws = texts.map((s) => textWidth(s, size))
  const total = ws.reduce((a, b) => a + b, 0) + gap * size * Math.max(0, texts.length - 1)
  let cx = anchor === 'middle' ? x - total / 2 : anchor === 'end' ? x - total : x
  return ws.map((w) => {
    const c = cx + w / 2
    cx += w + gap * size
    return c
  })
}

/** x-position of value `v` on a number line spanning [min, max] → [x0, x1]. */
export const lineX = (v: number, min: number, max: number, x0: number, x1: number) => x0 + ((v - min) / (max - min)) * (x1 - x0)

/** A four-point sparkle star path centred on (0, 0). */
export const sparklePath = (r: number) => `M 0 ${-r} Q ${r * 0.18} ${-r * 0.18} ${r} 0 Q ${r * 0.18} ${r * 0.18} 0 ${r} Q ${-r * 0.18} ${r * 0.18} ${-r} 0 Q ${-r * 0.18} ${-r * 0.18} 0 ${-r} Z`

/** A five-point star path centred on (0, 0). */
export function starPath(r: number, inner = 0.48): string {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2
    const rr = i % 2 === 0 ? r : r * inner
    pts.push(`${(Math.cos(a) * rr).toFixed(2)} ${(Math.sin(a) * rr).toFixed(2)}`)
  }
  return `M ${pts.join(' L ')} Z`
}

/** Darker / lighter versions of a palette colour (flat 3-D faces, shadows). */
export const shade = (c: string, k = 0.22) => mixColor(c, M.ink, k)
export const tint = (c: string, k = 0.45) => mixColor(c, '#ffffff', k)

/** Place-value block colours (consistent across the Place Value lesson). */
export const PV = {
  ones: M.gold,
  tens: M.mint,
  hundreds: '#7cc4f2',
  thousands: M.lilac,
} as const

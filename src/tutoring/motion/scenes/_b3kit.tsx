/* eslint-disable react-refresh/only-export-components -- helper module for scene files (shapes + pure layout math), not an HMR boundary */
import type { ReactNode } from 'react'
import { clamp, ease, progress, spring } from '../anim'
import { Draw } from '../kit'
import { M } from '../palette'

/**
 * Builder-3 scene helpers (word problems, reading, writing, science): text that
 * can be measured and laid out word by word (so single words can be highlighted,
 * circled, or flown out of a sentence), plus marker sweeps, hand-drawn loops,
 * sparkles and sentence-frame puzzle pieces. Everything is a pure function of t.
 */

// ── text metrics ─────────────────────────────────────────────────────────────
// Advance widths of Fredoka (the app font) for ASCII 32..126, in 1/1000 em,
// measured in Chromium. Words are laid out from these so scenes can place
// highlights and arrows exactly under/around individual words.
const ADV: Record<600 | 700, number[]> = {
  600: [236, 242, 378, 730, 450, 794, 702, 189, 364, 364, 477, 506, 224, 411, 217, 498, 572, 383, 577, 572, 549, 501, 526, 533, 547, 526, 225, 218, 560, 452, 560, 481, 839, 709, 619, 643, 667, 610, 619, 715, 662, 232, 536, 595, 565, 814, 683, 725, 597, 792, 611, 546, 648, 688, 727, 953, 691, 638, 590, 330, 500, 330, 496, 783, 410, 563, 563, 505, 565, 537, 405, 552, 554, 242, 236, 504, 301, 803, 563, 559, 552, 551, 423, 458, 411, 560, 564, 746, 523, 559, 540, 361, 206, 361, 555],
  700: [235, 248, 399, 697, 442, 779, 696, 193, 357, 357, 468, 490, 223, 403, 220, 489, 565, 379, 566, 565, 551, 493, 521, 522, 541, 521, 221, 220, 583, 445, 583, 476, 844, 711, 609, 631, 655, 603, 613, 719, 650, 239, 531, 597, 569, 809, 670, 721, 595, 782, 604, 542, 640, 675, 728, 947, 689, 638, 598, 324, 491, 324, 489, 768, 448, 557, 554, 503, 554, 535, 419, 546, 563, 251, 234, 512, 311, 791, 566, 558, 541, 543, 432, 457, 429, 568, 577, 737, 538, 576, 545, 354, 202, 354, 556],
}
const EXTRA: Record<string, number> = { '’': 210, '‘': 210, '“': 430, '”': 430, '×': 485, '÷': 468, '−': 545, '…': 780, '→': 838, '—': 670, '₂': 380 }
/** Kerning makes real words ~1.5% narrower than the sum of their glyphs. */
const KERN = 0.985

export type Weight = 600 | 700

/** Width (stage units) of `s` set in Fredoka at `size`. */
export function textW(s: string, size: number, weight: Weight = 700): number {
  const tbl = ADV[weight]
  let sum = 0
  for (const ch of s) {
    const c = ch.charCodeAt(0)
    sum += c >= 32 && c < 127 ? tbl[c - 32] : (EXTRA[ch] ?? 560)
  }
  return (sum / 1000) * size * KERN
}

/** One laid-out word: left edge `x`, vertical middle `y`, width `w`. */
export interface WBox {
  text: string
  x: number
  y: number
  w: number
  cx: number
  /** index in the whole text, and line number */
  i: number
  line: number
}

/**
 * Lay `text` out word by word (wrapping at `maxW`; "\n" forces a break).
 * `align: 'center'` centers each line on `x`.
 */
export function layoutText(
  text: string,
  { x, y, size, maxW = 1e9, lh = 1.32, weight = 700, align = 'left' }: { x: number; y: number; size: number; maxW?: number; lh?: number; weight?: Weight; align?: 'left' | 'center' },
): WBox[] {
  const space = (textW(' ', size, weight) / KERN) * 1.15 // a touch roomier than the font, for young readers
  const lines: { text: string; w: number }[][] = []
  for (const para of text.split('\n')) {
    let cur: { text: string; w: number }[] = []
    let curW = 0
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const w = textW(word, size, weight)
      const add = cur.length ? space + w : w
      if (cur.length && curW + add > maxW) {
        lines.push(cur)
        cur = []
        curW = 0
      }
      cur.push({ text: word, w })
      curW += cur.length > 1 ? space + w : w
    }
    lines.push(cur)
  }
  const out: WBox[] = []
  let i = 0
  lines.forEach((ln, li) => {
    const total = ln.reduce((a, b) => a + b.w, 0) + space * Math.max(0, ln.length - 1)
    let cx = align === 'center' ? x - total / 2 : x
    const ly = y + li * size * lh
    for (const wd of ln) {
      out.push({ text: wd.text, x: cx, y: ly, w: wd.w, cx: cx + wd.w / 2, i: i++, line: li })
      cx += wd.w + space
    }
  })
  return out
}

/** Bounding box spanning words `a..b` (inclusive) of a layout (same line). */
export function span(boxes: WBox[], a: number, b = a) {
  const x0 = boxes[a].x
  const x1 = boxes[b].x + boxes[b].w
  return { x: x0, w: x1 - x0, cx: (x0 + x1) / 2, y: boxes[a].y }
}

/** Per-line runs (x, w, y) covering words `a..b` of a layout. */
export function runs(boxes: WBox[], a: number, b: number) {
  const out: { x: number; w: number; y: number; line: number }[] = []
  for (let i = a; i <= b; i++) {
    const bx = boxes[i]
    const last = out[out.length - 1]
    if (last && last.line === bx.line) last.w = bx.x + bx.w - last.x
    else out.push({ x: bx.x, w: bx.w, y: bx.y, line: bx.line })
  }
  return out
}

/** A marker sweep over words `a..b`, line by line, at one steady pen speed. */
export function MarkerRuns({ t, at, boxes, a, b, dur = 0.5, h = 40, color = M.gold, opacity = 0.55, out }: { t: number; at: number; boxes: WBox[]; a: number; b: number; dur?: number; h?: number; color?: string; opacity?: number; out?: number }) {
  const rs = runs(boxes, a, b)
  const total = rs.reduce((s, r) => s + r.w, 0)
  // each line starts when the pen finishes the one before
  const starts = rs.map((_, i) => at + (dur * rs.slice(0, i).reduce((s, r) => s + r.w, 0)) / total)
  return (
    <g>
      {rs.map((r, i) => (
        <Marker key={i} t={t} at={starts[i]} dur={(dur * r.w) / total} x={r.x} y={r.y + 2} w={r.w} h={h} color={color} opacity={opacity} out={out} />
      ))}
    </g>
  )
}

/** Plain text (no outline) in the app font; `y` is the vertical middle. */
export function Txt({ x, y, size, weight = 700, color = M.ink, anchor = 'start', opacity, stroke, children }: { x: number; y: number; size: number; weight?: Weight | 500; color?: string; anchor?: 'start' | 'middle' | 'end'; opacity?: number; stroke?: string; children: ReactNode }) {
  return (
    <text
      x={x}
      y={y}
      fontFamily={M.font}
      fontWeight={weight}
      fontSize={size}
      textAnchor={anchor}
      dominantBaseline="central"
      fill={color}
      opacity={opacity}
      stroke={stroke}
      strokeWidth={stroke ? size / 7 : undefined}
      strokeLinejoin="round"
      paintOrder="stroke fill"
    >
      {children}
    </text>
  )
}

// ── timing helpers ───────────────────────────────────────────────────────────
/** Eased 0→1 progress (outCubic by default). */
export const ep = (t: number, at: number, dur = 0.5, e: (x: number) => number = ease.outCubic) => e(progress(t, at, dur))
/** Fade-in multiplied by an optional fade-out. */
export const fadeIO = (t: number, at: number, out?: number, dur = 0.4) => ep(t, at, dur, ease.outQuad) * (out === undefined ? 1 : 1 - ep(t, out, dur, ease.inOutQuad))
/** Spring pop scale (overshoots a little). */
export const popS = (t: number, at: number, bounce = 13) => spring(t, at, { stiffness: 220, damping: bounce })
/** Scale `children` by `s` about (x, y). */
export function Scale({ s, x, y, children, rot = 0, opacity }: { s: number; x: number; y: number; children: ReactNode; rot?: number; opacity?: number }) {
  if (s <= 0.001) return null
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s}) translate(${-x} ${-y})`} opacity={opacity}>
      {children}
    </g>
  )
}

/** Point `k` (0..1) along a quadratic arc from `a` to `b` that bulges `lift` above the higher end. */
export function arc(k: number, a: [number, number], b: [number, number], lift = 80): [number, number] {
  const cx = (a[0] + b[0]) / 2
  const cy = Math.min(a[1], b[1]) - lift
  const u = 1 - k
  return [u * u * a[0] + 2 * u * k * cx + k * k * b[0], u * u * a[1] + 2 * u * k * cy + k * k * b[1]]
}

/** Deterministic pseudo-random in [0, 1) from an integer seed. */
export const rand = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

// ── marks on text ────────────────────────────────────────────────────────────
/** A highlighter-marker sweep (left → right) behind a word or phrase. */
export function Marker({ t, at, dur = 0.45, x, y, w, h = 44, color = M.gold, opacity = 0.55, out }: { t: number; at: number; dur?: number; x: number; y: number; w: number; h?: number; color?: string; opacity?: number; out?: number }) {
  const k = ep(t, at, dur, ease.inOutCubic)
  if (k <= 0) return null
  const o = opacity * (out === undefined ? 1 : 1 - ep(t, out, 0.35))
  if (o <= 0.001) return null
  const x0 = x - 8
  const x1 = x0 + (w + 16) * k
  const top = y - h / 2
  const bot = y + h / 2
  // slightly slanted, chisel-tip ends like a real marker stroke
  const d = `M ${x0 + 3} ${top + 3} L ${x1} ${top} L ${x1 + 5 * k} ${bot - 3} L ${x0} ${bot + 2} Z`
  return <path d={d} fill={color} stroke={color} strokeWidth={6} strokeLinejoin="round" opacity={o} />
}

/** SVG path of a hand-drawn loop around an ellipse (a little more than one turn). */
export function loopPath(cx: number, cy: number, rx: number, ry: number, seed = 1, turns = 1.13): string {
  const N = 72
  const start = -2.4 + seed * 0.3
  const pts: string[] = []
  for (let i = 0; i <= N; i++) {
    const f = i / N
    const a = start + turns * Math.PI * 2 * f
    const r = 1 + 0.035 * Math.sin(a * 2 + seed) + 0.07 * f
    pts.push(`${(cx + Math.cos(a) * rx * r).toFixed(1)} ${(cy + Math.sin(a) * ry * r).toFixed(1)}`)
  }
  return `M ${pts.join(' L ')}`
}

/** A marker loop that draws itself around (cx, cy). */
export function Loop({ t, at, dur = 0.6, cx, cy, rx, ry, color = M.coral, width = 5, seed = 1 }: { t: number; at: number; dur?: number; cx: number; cy: number; rx: number; ry: number; color?: string; width?: number; seed?: number }) {
  return <Draw t={t} at={at} dur={dur} d={loopPath(cx, cy, rx, ry, seed)} stroke={color} width={width} easing={ease.inOutSine} />
}

/** A hand-drawn underline (gentle wave) that draws on. */
export function Underline({ t, at, dur = 0.4, x, y, w, color = M.coral, width = 5, wave = 3 }: { t: number; at: number; dur?: number; x: number; y: number; w: number; color?: string; width?: number; wave?: number }) {
  const n = Math.max(2, Math.round(w / 26))
  let d = `M ${x - 4} ${y}`
  for (let i = 0; i < n; i++) {
    const x0 = x - 4 + ((w + 8) * i) / n
    const x1 = x - 4 + ((w + 8) * (i + 1)) / n
    d += ` Q ${(x0 + x1) / 2} ${y + (i % 2 ? wave : -wave)} ${x1} ${y}`
  }
  return <Draw t={t} at={at} dur={dur} d={d} stroke={color} width={width} />
}

// ── sparkles ─────────────────────────────────────────────────────────────────
/** A four-point "twinkle" star centred on (x, y). */
export function Star4({ x, y, r, color = M.gold, rot = 0, opacity }: { x: number; y: number; r: number; color?: string; rot?: number; opacity?: number }) {
  if (r <= 0.2) return null
  const k = r * 0.16
  const d = `M 0 ${-r} C ${k} ${-k} ${k} ${-k} ${r} 0 C ${k} ${k} ${k} ${k} 0 ${r} C ${-k} ${k} ${-k} ${k} ${-r} 0 C ${-k} ${-k} ${-k} ${-k} 0 ${-r} Z`
  return <path d={d} transform={`translate(${x} ${y}) rotate(${rot})`} fill={color} stroke={M.ink} strokeWidth={Math.min(2.5, r * 0.14)} strokeLinejoin="round" opacity={opacity} />
}

/** A little shower of twinkle stars bursting out of (x, y) at `at`. */
export function Sparkles({ t, at, x, y, r = 54, n = 6, size = 13, colors = [M.gold, M.white, M.pink], seed = 0, life = 0.85 }: { t: number; at: number; x: number; y: number; r?: number; n?: number; size?: number; colors?: string[]; seed?: number; life?: number }) {
  if (t < at || t > at + life + 0.3) return null
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const delay = rand(seed * 31 + i) * 0.18
        const k = progress(t, at + delay, life)
        if (k <= 0 || k >= 1) return null
        const a = seed + (i / n) * Math.PI * 2 + (rand(seed * 7 + i) - 0.5) * 0.7
        const dist = r * (0.35 + 0.75 * ease.outCubic(k)) * (0.75 + rand(i + seed) * 0.4)
        const s = size * (0.7 + rand(i * 3 + seed) * 0.6) * Math.sin(Math.PI * Math.min(1, k * 1.25))
        return <Star4 key={i} x={x + Math.cos(a) * dist} y={y + Math.sin(a) * dist} r={Math.max(0, s)} rot={k * 120} color={colors[i % colors.length]} />
      })}
    </g>
  )
}

/** An idle twinkle that pulses on and off forever after `at` (hero frames). */
export function Twinkle({ t, at, x, y, r = 10, period = 2.2, phase = 0, color = M.gold }: { t: number; at: number; x: number; y: number; r?: number; period?: number; phase?: number; color?: string }) {
  if (t < at) return null
  const p = (((t - at) / period + phase) % 1 + 1) % 1
  const s = p < 0.35 ? Math.sin((p / 0.35) * Math.PI) : 0
  return <Star4 x={x} y={y} r={r * s * clamp((t - at) * 2)} rot={p * 90} color={color} />
}

/**
 * A copy of a word that lifts out of a sentence and flies along an arc to `to`,
 * growing/shrinking from `fromSize` to `toSize`; on landing a pill pops in
 * behind it so it becomes a label. Before `at` it renders nothing.
 */
export function FlyTag({ t, at, dur = 0.6, text, from, to, fromSize, toSize, color = M.gold, ink = M.ink, lift = 70, pill = true }: { t: number; at: number; dur?: number; text: string; from: [number, number]; to: [number, number]; fromSize: number; toSize: number; color?: string; ink?: string; lift?: number; pill?: boolean }) {
  const k = progress(t, at, dur)
  if (k <= 0) return null
  const e = ease.inOutCubic(k)
  const [x, y] = arc(e, from, to, lift)
  const size = fromSize + (toSize - fromSize) * e
  const rot = Math.sin(e * Math.PI) * -9
  const p = pill ? clamp(spring(t, at + dur - 0.08, { stiffness: 240, damping: 12 }), 0, 1.2) : 0
  const w = textW(text, size) + size * 1.3
  const h = size * 1.55
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      {p > 0 && (
        <g transform={`scale(${p})`}>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={color} stroke={M.ink} strokeWidth={3} />
        </g>
      )}
      <Txt x={0} y={1} size={size} anchor="middle" color={ink} stroke={p > 0 ? undefined : M.white}>
        {text}
      </Txt>
    </g>
  )
}

/** A wobbly hand-drawn rectangle path (pencil-sketch look). */
export function sketchRect(x: number, y: number, w: number, h: number, seed = 1): string {
  const j = (n: number) => (rand(seed * 13 + n) - 0.5) * 6
  return `M ${x - 6 + j(1)} ${y + j(2)} L ${x + w + 8 + j(3)} ${y + j(4)} M ${x + w + j(5)} ${y - 6 + j(6)} L ${x + w + j(7)} ${y + h + 7 + j(8)} M ${x + w + 7 + j(9)} ${y + h + j(10)} L ${x - 7 + j(11)} ${y + h + j(12)} M ${x + j(13)} ${y + h + 6 + j(14)} L ${x + j(15)} ${y - 7 + j(16)}`
}

// ── sentence-frame puzzle pieces ─────────────────────────────────────────────
/**
 * A rounded puzzle piece: optional knob sticking out on the right (`tab`) and
 * matching socket cut into the left (`socket`). Knob is centred vertically.
 */
export function puzzlePath(x: number, y: number, w: number, h: number, { tab = false, socket = false, r = 16 }: { tab?: boolean; socket?: boolean; r?: number } = {}): string {
  const cy = y + h / 2
  const k = Math.min(20, h * 0.24) // knob radius
  const n = k * 0.55 // neck half-height
  let d = `M ${x + r} ${y} L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r}`
  if (tab) {
    d += ` L ${x + w} ${cy - n} C ${x + w + k * 0.3} ${cy - n} ${x + w + k * 0.2} ${cy - k * 1.25} ${x + w + k * 1.05} ${cy - k * 1.1}`
    d += ` C ${x + w + k * 1.9} ${cy - k * 0.95} ${x + w + k * 1.9} ${cy + k * 0.95} ${x + w + k * 1.05} ${cy + k * 1.1}`
    d += ` C ${x + w + k * 0.2} ${cy + k * 1.25} ${x + w + k * 0.3} ${cy + n} ${x + w} ${cy + n}`
  }
  d += ` L ${x + w} ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} L ${x + r} ${y + h} Q ${x} ${y + h} ${x} ${y + h - r}`
  if (socket) {
    d += ` L ${x} ${cy + n} C ${x + k * 0.3} ${cy + n} ${x + k * 0.2} ${cy + k * 1.25} ${x + k * 1.05} ${cy + k * 1.1}`
    d += ` C ${x + k * 1.9} ${cy + k * 0.95} ${x + k * 1.9} ${cy - k * 0.95} ${x + k * 1.05} ${cy - k * 1.1}`
    d += ` C ${x + k * 0.2} ${cy - k * 1.25} ${x + k * 0.3} ${cy - n} ${x} ${cy - n}`
  }
  d += ` L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Z`
  return d
}

/** How far a knob sticks out for a piece of height `h` (for snapping layouts). */
export const knobOut = (h: number) => Math.min(20, h * 0.24) * 1.75

// ── shared shapes ────────────────────────────────────────────────────────────
/** A thought bubble (cloud) centred on (cx, cy), with trailing dots toward `tail`. */
export function ThoughtBubble({ cx, cy, w, h, tail, dots: dotList, grow = 1, fill = M.white }: { cx: number; cy: number; w: number; h: number; tail?: [number, number]; dots?: [number, number, number][]; grow?: number; fill?: string }) {
  if (grow <= 0.001) return null
  const bumps = 9
  const circles: [number, number, number][] = []
  for (let i = 0; i < bumps; i++) {
    const a = (i / bumps) * Math.PI * 2 + 0.2
    const r = Math.min(w, h) * (0.2 + 0.05 * Math.sin(i * 2.3))
    circles.push([cx + Math.cos(a) * (w / 2 - r * 0.7), cy + Math.sin(a) * (h / 2 - r * 0.7), r])
  }
  const dots: [number, number, number][] = dotList ? [...dotList] : []
  if (tail && !dotList) {
    for (let i = 0; i < 3; i++) {
      const f = 0.25 + i * 0.25
      dots.push([tail[0] + (cx - tail[0]) * (1 - f) * 0.62 + 0, tail[1] + (cy - tail[1]) * (1 - f) * 0.62, 7 + i * 5])
    }
    dots.reverse()
  }
  const s = grow
  const body = (stroke: boolean) => (
    <>
      <ellipse cx={cx} cy={cy} rx={w / 2 - 10} ry={h / 2 - 10} fill={fill} stroke={stroke ? M.ink : 'none'} strokeWidth={stroke ? 9 : 0} />
      {circles.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={fill} stroke={stroke ? M.ink : 'none'} strokeWidth={stroke ? 9 : 0} />
      ))}
    </>
  )
  return (
    <g>
      {dots.map(([x, y, r], i) => {
        const ds = clamp(s * 3 - i * 0.6)
        return ds > 0 ? <circle key={i} cx={x} cy={y} r={r * ds} fill={fill} stroke={M.ink} strokeWidth={4} /> : null
      })}
      <g transform={`translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`} filter="url(#sq-shadow)">
        {body(true)}
        {body(false)}
      </g>
    </g>
  )
}

/** A rounded "sticky" label: coloured pill with text, centred on (x, y). */
export function Tag({ x, y, text, size = 24, color = M.gold, ink = M.ink, pad = 0.75 }: { x: number; y: number; text: string; size?: number; color?: string; ink?: string; pad?: number }) {
  const w = textW(text, size) + size * pad * 2
  const h = size * 1.6
  return (
    <g>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={h / 2} fill={color} stroke={M.ink} strokeWidth={3} />
      <Txt x={x} y={y + 1} size={size} anchor="middle" color={ink}>
        {text}
      </Txt>
    </g>
  )
}

/** A big check mark that draws on. */
export function Tick({ t, at, x, y, s = 1, color = M.leaf, width = 8 }: { t: number; at: number; x: number; y: number; s?: number; color?: string; width?: number }) {
  return <Draw t={t} at={at} dur={0.35} d={`M ${x - 14 * s} ${y} L ${x - 4 * s} ${y + 11 * s} L ${x + 17 * s} ${y - 13 * s}`} stroke={color} width={width} easing={ease.outCubic} />
}

/** A red "nope" cross that draws on. */
export function Cross({ t, at, x, y, s = 1, color = M.coral, width = 8 }: { t: number; at: number; x: number; y: number; s?: number; color?: string; width?: number }) {
  return (
    <g>
      <Draw t={t} at={at} dur={0.22} d={`M ${x - 16 * s} ${y - 16 * s} L ${x + 16 * s} ${y + 16 * s}`} stroke={color} width={width} />
      <Draw t={t} at={at + 0.18} dur={0.22} d={`M ${x + 16 * s} ${y - 16 * s} L ${x - 16 * s} ${y + 16 * s}`} stroke={color} width={width} />
    </g>
  )
}

/** An arrowhead at (x, y) pointing along angle `ang` (radians). */
export function Head({ x, y, ang, size = 16, color = M.ink, width = 5 }: { x: number; y: number; ang: number; size?: number; color?: string; width?: number }) {
  return (
    <path
      d={`M ${x - size * Math.cos(ang - 0.5)} ${y - size * Math.sin(ang - 0.5)} L ${x} ${y} L ${x - size * Math.cos(ang + 0.5)} ${y - size * Math.sin(ang + 0.5)}`}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

/**
 * A path that draws on, with an arrowhead that rides the tip. `pts` is a
 * polyline/curve given as an SVG path; `end` + `endAng` place the final head.
 */
export function FlowArrow({ t, at, dur = 0.7, d, end, endAng, color = M.ink, width = 5, dash }: { t: number; at: number; dur?: number; d: string; end: [number, number]; endAng: number; color?: string; width?: number; dash?: string }) {
  const k = progress(t, at, dur)
  if (k <= 0) return null
  return (
    <g>
      {dash ? (
        <g opacity={clamp(k * 3)}>
          <mask id={`fa-${Math.round(end[0])}-${Math.round(end[1])}`}>
            <path d={d} pathLength={1} fill="none" stroke="#fff" strokeWidth={width + 6} strokeDasharray="1 1" strokeDashoffset={1 - ease.inOutCubic(k)} />
          </mask>
          <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={dash} mask={`url(#fa-${Math.round(end[0])}-${Math.round(end[1])})`} />
        </g>
      ) : (
        <Draw t={t} at={at} dur={dur} d={d} stroke={color} width={width} />
      )}
      {k >= 0.98 && <Head x={end[0]} y={end[1]} ang={endAng} color={color} width={width} size={width * 3.2} />}
    </g>
  )
}

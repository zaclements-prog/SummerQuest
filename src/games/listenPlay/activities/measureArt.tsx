/* eslint-disable react-refresh/only-export-components -- shared art (components and their palette) for the measure activity and the kMeasure scenes; not an HMR boundary */
import { M } from '../../../tutoring/motion/palette'
import { shade, tint } from '../../../tutoring/motion/layout'
import type { HeightThing, LengthThing } from '../../../lib/providers/kMeasure'

/**
 * Drawings for Measure Marsh (the `measure` activity and the kMeasure lesson
 * scenes): things drawn to an exact length or height, so "longer" and
 * "taller" are fair to see. Flat, ink-outlined, no words; every one drawn
 * from its start (x = 0, or the ground at y = 0), so lining them up is just
 * putting their starts in the same place.
 */

/** The sticker colours (the picture cards' palette): a pair of things gets two of them. */
export const MEASURE_PALETTE = ['#f2766b', '#ffcf4d', '#74d3bd', '#8ab8ff', '#b79af0', '#f7a1c4', '#8edb7c', '#ff9f80'] as const
export const paletteColor = (i: number) => MEASURE_PALETTE[((i % MEASURE_PALETTE.length) + MEASURE_PALETTE.length) % MEASURE_PALETTE.length]

/** The start line and the ground: a fresh green. */
export const START_GREEN = '#36c35a'
const EMOJI_FONT = "'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif"
const INK = M.ink

/** An outline that suits the drawing's size. */
const outline = (t: number) => Math.max(2.5, Math.min(4.5, t * 0.07))

/**
 * A thing lying from x = 0 (where it starts) to x = `len` (where it ends),
 * centred on y = 0 and about `thick` tall. `unit` is one tenth of the
 * stage's length (a train has one car per unit).
 */
export function LengthThingArt({ thing, len, thick, unit, color }: { thing: LengthThing; len: number; thick: number; unit: number; color: string }) {
  const t = thick
  const sw = outline(t)
  switch (thing) {
    case 'pencil': {
      const tip = Math.min(t * 1.1, len * 0.4)
      const er = Math.min(t * 0.55, len * 0.15)
      const fe = Math.min(t * 0.3, len * 0.1)
      return (
        <g strokeLinejoin="round">
          <rect x={0} y={-t / 2} width={er + t * 0.2} height={t} rx={t * 0.24} fill="#f7a1c4" stroke={INK} strokeWidth={sw} />
          <rect x={er} y={-t / 2} width={fe} height={t} fill="#cfd0dc" stroke={INK} strokeWidth={sw} />
          <rect x={er + fe} y={-t / 2} width={Math.max(2, len - tip - er - fe)} height={t} fill={color} stroke={INK} strokeWidth={sw} />
          <path d={`M ${er + fe} ${-t / 6} H ${len - tip} M ${er + fe} ${t / 6} H ${len - tip}`} stroke={shade(color, 0.22)} strokeWidth={sw * 0.8} />
          <path d={`M ${len - tip} ${-t / 2} L ${len} 0 L ${len - tip} ${t / 2} Z`} fill="#f6d2ad" stroke={INK} strokeWidth={sw} />
          <path d={`M ${len - tip * 0.34} ${-t * 0.17} L ${len} 0 L ${len - tip * 0.34} ${t * 0.17} Z`} fill={INK} stroke={INK} strokeWidth={sw * 0.6} />
        </g>
      )
    }
    case 'ribbon': {
      const notch = Math.min(t * 0.45, len * 0.2)
      const n = Math.max(1, Math.round(len / (t * 1.5)))
      const step = (len - notch) / n
      const a = t * 0.12
      let top = `M 0 ${-t / 2}`
      for (let i = 0; i < n; i++) top += ` Q ${(i + 0.5) * step} ${-t / 2 + (i % 2 ? a : -a)} ${(i + 1) * step} ${-t / 2}`
      let bot = ''
      for (let i = n - 1; i >= 0; i--) bot += ` Q ${(i + 0.5) * step} ${t / 2 + (i % 2 ? a : -a)} ${i * step} ${t / 2}`
      const d = `${top} L ${len} ${-t / 2} L ${len - notch} 0 L ${len} ${t / 2} L ${(n * step).toFixed(2)} ${t / 2}${bot} Z`
      return (
        <g strokeLinejoin="round">
          <path d={d} fill={color} stroke={INK} strokeWidth={sw} />
          <path d={`M ${t * 0.3} ${-t * 0.12} H ${Math.max(t * 0.3, len - notch - t * 0.3)}`} stroke={tint(color, 0.45)} strokeWidth={t * 0.14} strokeLinecap="round" />
        </g>
      )
    }
    case 'snake': {
      const head = Math.min(t * 0.5, len * 0.3)
      const body = t * 0.6
      const x0 = body / 2
      const x1 = len - head * 1.2
      const n = Math.max(1, Math.round((x1 - x0) / (t * 1.4)))
      const step = (x1 - x0) / n
      const a = t * 0.16
      let d = `M ${x0} 0`
      for (let i = 0; i < n; i++) d += ` Q ${x0 + (i + 0.5) * step} ${i % 2 ? a : -a} ${x0 + (i + 1) * step} 0`
      const spots = Math.max(0, Math.floor((x1 - x0) / (t * 0.8)))
      return (
        <g strokeLinejoin="round" strokeLinecap="round">
          <path d={d} fill="none" stroke={INK} strokeWidth={body + sw * 2} />
          <path d={d} fill="none" stroke={color} strokeWidth={body} />
          {Array.from({ length: spots }, (_, i) => {
            const x = x0 + (i + 0.5) * (t * 0.8)
            return <circle key={i} cx={x} cy={0} r={t * 0.09} fill={shade(color, 0.25)} />
          })}
          <ellipse cx={len - head} cy={0} rx={head} ry={head * 0.82} fill={color} stroke={INK} strokeWidth={sw} />
          <circle cx={len - head * 0.62} cy={-head * 0.3} r={head * 0.2} fill={M.white} stroke={INK} strokeWidth={sw * 0.6} />
          <circle cx={len - head * 0.56} cy={-head * 0.3} r={head * 0.09} fill={INK} />
          <path d={`M ${len - head * 0.5} ${head * 0.32} Q ${len - head * 0.25} ${head * 0.42} ${len - head * 0.08} ${head * 0.22}`} fill="none" stroke={INK} strokeWidth={sw * 0.7} />
        </g>
      )
    }
    case 'train': {
      const cars = Math.max(1, Math.round(len / unit))
      const cw = len / cars
      const gap = Math.min(6, cw * 0.08)
      const h = t * 0.62
      const y0 = -t * 0.42
      const wr = t * 0.15
      return (
        <g strokeLinejoin="round">
          <path d={`M ${cw * 0.4} ${y0 + h * 0.55} H ${len - cw * 0.4}`} stroke={INK} strokeWidth={sw * 1.2} />
          {Array.from({ length: cars }, (_, i) => {
            const x = i * cw + gap / 2
            const w = cw - gap
            const engine = i === cars - 1
            const fill = engine ? shade(color, 0.12) : i % 2 ? tint(color, 0.35) : color
            return (
              <g key={i}>
                {engine ? (
                  <>
                    <rect x={x} y={y0 - h * 0.35} width={w * 0.5} height={h * 1.35} rx={4} fill={fill} stroke={INK} strokeWidth={sw} />
                    <rect x={x + w * 0.1} y={y0 - h * 0.2} width={w * 0.3} height={h * 0.38} rx={3} fill={tint(M.sea, 0.45)} stroke={INK} strokeWidth={sw * 0.7} />
                    <rect x={x + w * 0.45} y={y0 + h * 0.15} width={w * 0.55} height={h * 0.85} rx={4} fill={fill} stroke={INK} strokeWidth={sw} />
                    <rect x={x + w * 0.72} y={y0 - h * 0.15} width={w * 0.14} height={h * 0.32} fill={INK} />
                  </>
                ) : (
                  <rect x={x} y={y0} width={w} height={h} rx={5} fill={fill} stroke={INK} strokeWidth={sw} />
                )}
                <circle cx={x + w * 0.27} cy={y0 + h + wr * 0.6} r={wr} fill="#4a3c48" stroke={INK} strokeWidth={sw * 0.7} />
                <circle cx={x + w * 0.73} cy={y0 + h + wr * 0.6} r={wr} fill="#4a3c48" stroke={INK} strokeWidth={sw * 0.7} />
              </g>
            )
          })}
        </g>
      )
    }
    case 'worm': {
      const hr = Math.min(t * 0.46, len * 0.25)
      const r = t * 0.34
      const x1 = len - hr
      const n = Math.max(1, Math.round((x1 - r) / (r * 1.25)))
      const step = (x1 - r) / n
      return (
        <g>
          {Array.from({ length: n }, (_, i) => (
            <circle key={i} cx={r + i * step} cy={(i % 2 ? 1 : -1) * t * 0.06} r={r} fill={i % 2 ? tint(color, 0.3) : color} stroke={INK} strokeWidth={sw} />
          ))}
          <circle cx={x1} cy={0} r={hr} fill={color} stroke={INK} strokeWidth={sw} />
          <circle cx={x1 + hr * 0.3} cy={-hr * 0.25} r={hr * 0.16} fill={INK} />
          <path d={`M ${x1 - hr * 0.05} ${hr * 0.25} Q ${x1 + hr * 0.3} ${hr * 0.5} ${x1 + hr * 0.6} ${hr * 0.2}`} fill="none" stroke={INK} strokeWidth={sw * 0.7} strokeLinecap="round" />
          <path d={`M ${x1 - hr * 0.2} ${-hr * 0.9} Q ${x1 - hr * 0.05} ${-hr * 1.35} ${x1 + hr * 0.25} ${-hr * 1.25}`} fill="none" stroke={INK} strokeWidth={sw * 0.8} strokeLinecap="round" />
        </g>
      )
    }
  }
}

/**
 * A thing standing on the ground (y = 0) and reaching up to y = −`h` (its top),
 * centred on x = 0 and about `w` wide. A tower has one block per `unit`.
 */
export function HeightThingArt({ thing, h, w, unit, color }: { thing: HeightThing; h: number; w: number; unit: number; color: string }) {
  const sw = outline(w * 0.6)
  switch (thing) {
    case 'tower': {
      const n = Math.max(1, Math.round(h / unit))
      const bh = h / n
      const bw = Math.min(w, Math.max(bh * 1.1, w * 0.7))
      return (
        <g strokeLinejoin="round">
          {Array.from({ length: n }, (_, i) => {
            const y = -(i + 1) * bh
            return (
              <g key={i}>
                <rect x={-bw / 2} y={y + 1} width={bw} height={bh - 2} rx={Math.min(6, bh * 0.12)} fill={i % 2 ? tint(color, 0.35) : color} stroke={INK} strokeWidth={sw} />
                <rect x={-bw * 0.3} y={y + bh * 0.3} width={bw * 0.6} height={bh * 0.4} rx={3} fill="none" stroke={shade(color, 0.2)} strokeWidth={sw * 0.7} />
              </g>
            )
          })}
        </g>
      )
    }
    case 'tree': {
      const ry = Math.min(w * 0.55, h * 0.36)
      const rx = w * 0.5
      const tw = Math.max(8, w * 0.2)
      const cy = -(h - ry)
      return (
        <g strokeLinejoin="round">
          <rect x={-tw / 2} y={cy} width={tw} height={-cy} rx={3} fill="#b07a4f" stroke={INK} strokeWidth={sw} />
          <ellipse cx={0} cy={cy} rx={rx} ry={ry} fill="#8edb7c" stroke={INK} strokeWidth={sw} />
          <ellipse cx={-rx * 0.3} cy={cy - ry * 0.3} rx={rx * 0.25} ry={ry * 0.18} fill={tint('#8edb7c', 0.45)} />
          {[
            [-0.35, 0.15],
            [0.3, -0.2],
            [0.1, 0.4],
          ].map(([dx, dy], i) => (
            <circle key={i} cx={dx * rx} cy={cy + dy * ry} r={Math.max(4, Math.min(rx, ry) * 0.17)} fill={color} stroke={INK} strokeWidth={sw * 0.7} />
          ))}
        </g>
      )
    }
    case 'flower': {
      const br = Math.min(w * 0.4, h * 0.24)
      const cy = -(h - br)
      const pr = br * 0.42
      const stem = Math.max(5, w * 0.07)
      return (
        <g strokeLinejoin="round">
          <path d={`M 0 0 V ${cy}`} stroke={INK} strokeWidth={stem + sw * 2} strokeLinecap="round" />
          <path d={`M 0 0 V ${cy}`} stroke="#5fbf5a" strokeWidth={stem} strokeLinecap="round" />
          {h > br * 3 && (
            <>
              <ellipse cx={-w * 0.16} cy={cy * 0.35} rx={w * 0.17} ry={w * 0.07} transform={`rotate(-25 ${-w * 0.16} ${cy * 0.35})`} fill="#8edb7c" stroke={INK} strokeWidth={sw * 0.8} />
              <ellipse cx={w * 0.16} cy={cy * 0.55} rx={w * 0.17} ry={w * 0.07} transform={`rotate(25 ${w * 0.16} ${cy * 0.55})`} fill="#8edb7c" stroke={INK} strokeWidth={sw * 0.8} />
            </>
          )}
          {Array.from({ length: 6 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2
            return <circle key={i} cx={Math.cos(a) * (br - pr)} cy={cy + Math.sin(a) * (br - pr)} r={pr} fill={color} stroke={INK} strokeWidth={sw * 0.8} />
          })}
          <circle cx={0} cy={cy} r={br * 0.36} fill="#ffcf4d" stroke={INK} strokeWidth={sw * 0.8} />
        </g>
      )
    }
    case 'candle': {
      const fh = Math.min(w * 0.55, h * 0.3)
      const cw = Math.max(14, w * 0.42)
      const top = -(h - fh)
      return (
        <g strokeLinejoin="round">
          <rect x={-cw / 2} y={top} width={cw} height={-top} rx={4} fill={color} stroke={INK} strokeWidth={sw} />
          <path d={`M ${-cw / 2} ${top + 6} q ${cw * 0.18} ${cw * 0.5} ${cw * 0.3} 0`} fill={tint(color, 0.45)} stroke="none" />
          <path d={`M 0 ${top} V ${top - fh * 0.2}`} stroke={INK} strokeWidth={sw} />
          <path d={`M 0 ${-h} C ${fh * 0.38} ${-h + fh * 0.45} ${fh * 0.3} ${top - fh * 0.08} 0 ${top - fh * 0.08} C ${-fh * 0.3} ${top - fh * 0.08} ${-fh * 0.38} ${-h + fh * 0.45} 0 ${-h} Z`} fill="#ffb347" stroke={INK} strokeWidth={sw * 0.8} />
          <path d={`M 0 ${-h + fh * 0.35} C ${fh * 0.16} ${-h + fh * 0.6} ${fh * 0.1} ${top - fh * 0.15} 0 ${top - fh * 0.15} C ${-fh * 0.1} ${top - fh * 0.15} ${-fh * 0.16} ${-h + fh * 0.6} 0 ${-h + fh * 0.35} Z`} fill="#fff1a8" />
        </g>
      )
    }
    case 'rocket': {
      const bw = Math.max(16, w * 0.42)
      const nh = Math.min(bw * 1.05, h * 0.32)
      const fin = Math.min(h * 0.28, bw * 0.9)
      const top = -(h - nh)
      return (
        <g strokeLinejoin="round">
          <path d={`M ${-bw / 2} ${-fin} L ${-w * 0.45} 0 L ${-bw / 2} 0 Z`} fill={shade(color, 0.15)} stroke={INK} strokeWidth={sw} />
          <path d={`M ${bw / 2} ${-fin} L ${w * 0.45} 0 L ${bw / 2} 0 Z`} fill={shade(color, 0.15)} stroke={INK} strokeWidth={sw} />
          <rect x={-bw / 2} y={top} width={bw} height={-top} fill={M.white} stroke={INK} strokeWidth={sw} />
          <path d={`M ${-bw / 2} ${top} Q ${-bw / 2} ${-h + nh * 0.25} 0 ${-h} Q ${bw / 2} ${-h + nh * 0.25} ${bw / 2} ${top} Z`} fill={color} stroke={INK} strokeWidth={sw} />
          {-top > bw * 1.6 && <circle cx={0} cy={top + bw * 0.7} r={bw * 0.24} fill={tint(M.sea, 0.45)} stroke={INK} strokeWidth={sw * 0.8} />}
          <rect x={-bw / 2} y={-Math.min(fin * 0.6, -top * 0.3)} width={bw} height={Math.min(fin * 0.6, -top * 0.3)} fill={color} stroke={INK} strokeWidth={sw} />
        </g>
      )
    }
  }
}

/** A wooden crate from the ground (y = 0) up to −`h`, `w` wide: what a thing stands on when it isn't on the ground. */
export function Crate({ w, h }: { w: number; h: number }) {
  const sw = outline(w * 0.5)
  return (
    <g strokeLinejoin="round">
      <rect x={-w / 2} y={-h} width={w} height={h} rx={4} fill="#e2b47c" stroke={INK} strokeWidth={sw} />
      <path d={`M ${-w / 2} ${-h} L ${w / 2} 0 M ${w / 2} ${-h} L ${-w / 2} 0`} stroke={shade('#e2b47c', 0.3)} strokeWidth={sw} />
      <rect x={-w / 2} y={-h} width={w} height={h} rx={4} fill="none" stroke={INK} strokeWidth={sw} />
    </g>
  )
}

/** A grey rock, centred, radius about `r` (there is no old rock emoji). */
export function Rock({ r }: { r: number }) {
  return (
    <g strokeLinejoin="round">
      <path
        d={`M ${-r} ${r * 0.55} C ${-r * 1.05} ${-r * 0.2} ${-r * 0.55} ${-r * 0.85} ${r * 0.05} ${-r * 0.8} C ${r * 0.75} ${-r * 0.78} ${r * 1.08} ${-r * 0.1} ${r} ${r * 0.55} Z`}
        fill="#a3a7b0"
        stroke={INK}
        strokeWidth={outline(r)}
      />
      <ellipse cx={-r * 0.3} cy={-r * 0.35} rx={r * 0.22} ry={r * 0.1} fill="#c9ccd3" />
      <circle cx={r * 0.35} cy={r * 0.15} r={r * 0.09} fill="#7e838c" />
      <circle cx={-r * 0.1} cy={r * 0.3} r={r * 0.06} fill="#7e838c" />
    </g>
  )
}

/** Something on a pan, its bottom at y = 0, centred, `s` px across: an emoji, or the drawn rock. */
export function WeightPic({ pic, s }: { pic: string; s: number }) {
  if (pic === 'rock') {
    return (
      <g transform={`translate(0 ${-s * 0.32})`}>
        <Rock r={s * 0.5} />
      </g>
    )
  }
  return (
    <text x={0} y={-s * 0.46} fontSize={s * 0.92} fontFamily={EMOJI_FONT} textAnchor="middle" dominantBaseline="central">
      {pic}
    </text>
  )
}

/** A balance-scale pan, its rim at y = 0, `w` wide (hangs from its strings, drawn by the scale). */
export function Pan({ w, color = '#ffcf4d' }: { w: number; color?: string }) {
  const sw = outline(w * 0.4)
  return (
    <g strokeLinejoin="round">
      <path d={`M ${-w / 2} 0 Q 0 ${w * 0.32} ${w / 2} 0 Z`} fill={color} stroke={INK} strokeWidth={sw} />
      <path d={`M ${-w / 2} 0 H ${w / 2}`} stroke={INK} strokeWidth={sw} strokeLinecap="round" />
    </g>
  )
}

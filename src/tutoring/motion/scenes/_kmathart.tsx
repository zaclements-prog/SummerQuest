/* eslint-disable react-refresh/only-export-components -- scene art helpers, not an HMR boundary */
import { M } from '../palette'
import { shade, tint } from '../layout'

/**
 * Art for the kindergarten add-and-take and story lessons (kAddTake,
 * kStoryMath): big, flat, ink-outlined animals and things, drawn centred on
 * (0, 0) so a scene moves them with a transform (<T>). No text but numerals.
 */

const OUT = 4

/** A duck floating on the water, facing left (body length ~ 2.4 r). `flap` 0…1 lifts the wing. */
export function Duck({ r = 40, flap = 0 }: { r?: number; flap?: number }) {
  const body = '#ffd65a'
  return (
    <g>
      <ellipse cx={r * 0.2} cy={r * 0.25} rx={r * 1.15} ry={r * 0.62} fill={body} stroke={M.ink} strokeWidth={OUT} />
      <path d={`M ${r * 1.1} ${r * 0.05} L ${r * 1.55} ${-r * 0.3} L ${r * 1.3} ${r * 0.35} Z`} fill={body} stroke={M.ink} strokeWidth={3.5} strokeLinejoin="round" />
      <path d={`M ${-r * 0.05} ${r * 0.15} Q ${r * 0.45} ${-r * (0.25 + flap * 0.35)} ${r * 0.85} ${r * 0.15} Q ${r * 0.45} ${r * 0.45} ${-r * 0.05} ${r * 0.15} Z`} fill={shade(body, 0.12)} stroke={M.ink} strokeWidth={3} strokeLinejoin="round" />
      <circle cx={-r * 0.62} cy={-r * 0.45} r={r * 0.48} fill={body} stroke={M.ink} strokeWidth={OUT} />
      <path d={`M ${-r * 1.0} ${-r * 0.42} L ${-r * 1.42} ${-r * 0.3} L ${-r * 1.0} ${-r * 0.2} Z`} fill="#ff9f40" stroke={M.ink} strokeWidth={3} strokeLinejoin="round" />
      <circle cx={-r * 0.7} cy={-r * 0.56} r={r * 0.08} fill={M.ink} />
      <circle cx={-r * 0.48} cy={-r * 0.36} r={r * 0.1} fill={M.pink} opacity={0.6} />
    </g>
  )
}

/** A little round bird facing left; `flap` 0…1 raises the wing (flying). */
export function Bird({ r = 30, color = '#8ab8ff', flap = 0 }: { r?: number; color?: string; flap?: number }) {
  return (
    <g>
      <path d={`M ${r * 0.75} ${-r * 0.05} L ${r * 1.35} ${-r * 0.35} L ${r * 1.3} ${r * 0.25} Z`} fill={shade(color, 0.15)} stroke={M.ink} strokeWidth={3} strokeLinejoin="round" />
      <circle r={r} fill={color} stroke={M.ink} strokeWidth={OUT} />
      <ellipse cx={-r * 0.05} cy={r * 0.35} rx={r * 0.55} ry={r * 0.42} fill={tint(color, 0.55)} />
      <path d={`M ${-r * 0.1} ${-r * 0.05} Q ${r * 0.45} ${-r * (0.3 + flap * 0.9)} ${r * 0.85} ${-r * 0.1 - flap * r * 0.5} Q ${r * 0.45} ${r * 0.35} ${-r * 0.1} ${-r * 0.05} Z`} fill={shade(color, 0.18)} stroke={M.ink} strokeWidth={3} strokeLinejoin="round" />
      <path d={`M ${-r * 0.92} ${-r * 0.15} L ${-r * 1.35} ${-r * 0.02} L ${-r * 0.92} ${r * 0.12} Z`} fill="#ffb84d" stroke={M.ink} strokeWidth={2.5} strokeLinejoin="round" />
      <circle cx={-r * 0.45} cy={-r * 0.3} r={r * 0.12} fill={M.ink} />
    </g>
  )
}

/** A wise owl sitting (height ~ 2.4 r). */
export function Owl({ r = 50 }: { r?: number }) {
  const fur = '#b98a5e'
  return (
    <g>
      <path d={`M ${-r * 0.75} ${-r * 0.9} L ${-r * 0.55} ${-r * 1.35} L ${-r * 0.25} ${-r * 0.95} Z M ${r * 0.75} ${-r * 0.9} L ${r * 0.55} ${-r * 1.35} L ${r * 0.25} ${-r * 0.95} Z`} fill={fur} stroke={M.ink} strokeWidth={3.5} strokeLinejoin="round" />
      <ellipse cx={0} cy={0} rx={r * 0.9} ry={r * 1.15} fill={fur} stroke={M.ink} strokeWidth={OUT} />
      <ellipse cx={0} cy={r * 0.35} rx={r * 0.55} ry={r * 0.62} fill="#f1d9a6" />
      {[-1, 1].map((sg) => (
        <g key={sg}>
          <circle cx={sg * r * 0.36} cy={-r * 0.45} r={r * 0.32} fill="#ffffff" stroke={M.ink} strokeWidth={3} />
          <circle cx={sg * r * 0.33} cy={-r * 0.43} r={r * 0.14} fill={M.ink} />
        </g>
      ))}
      <path d={`M ${-r * 0.1} ${-r * 0.2} L 0 ${-r * 0.02} L ${r * 0.1} ${-r * 0.2} Z`} fill="#ffb84d" stroke={M.ink} strokeWidth={2.5} strokeLinejoin="round" />
      <path d={`M ${-r * 0.3} ${r * 1.12} l 0 ${r * 0.18} M ${r * 0.3} ${r * 1.12} l 0 ${r * 0.18}`} stroke="#ffb84d" strokeWidth={6} strokeLinecap="round" />
    </g>
  )
}

/** A friendly fox face (radius r). */
export function FoxFace({ r = 60 }: { r?: number }) {
  const fur = '#f2955a'
  return (
    <g strokeLinejoin="round">
      <path d={`M ${-r * 0.9} ${-r * 0.35} L ${-r * 0.75} ${-r * 1.2} L ${-r * 0.2} ${-r * 0.75} Z M ${r * 0.9} ${-r * 0.35} L ${r * 0.75} ${-r * 1.2} L ${r * 0.2} ${-r * 0.75} Z`} fill={fur} stroke={M.ink} strokeWidth={OUT} />
      <path d={`M ${-r} ${-r * 0.3} Q ${-r} ${-r * 0.9} 0 ${-r * 0.9} Q ${r} ${-r * 0.9} ${r} ${-r * 0.3} Q ${r * 0.85} ${r * 0.55} 0 ${r * 0.85} Q ${-r * 0.85} ${r * 0.55} ${-r} ${-r * 0.3} Z`} fill={fur} stroke={M.ink} strokeWidth={OUT} />
      <path d={`M ${-r * 0.75} ${r * 0.05} Q ${-r * 0.3} ${r * 0.05} 0 ${r * 0.85} Q ${r * 0.3} ${r * 0.05} ${r * 0.75} ${r * 0.05} Q ${r * 0.6} ${r * 0.6} 0 ${r * 0.85} Q ${-r * 0.6} ${r * 0.6} ${-r * 0.75} ${r * 0.05} Z`} fill="#fff4e6" />
      <circle cx={-r * 0.36} cy={-r * 0.18} r={r * 0.1} fill={M.ink} />
      <circle cx={r * 0.36} cy={-r * 0.18} r={r * 0.1} fill={M.ink} />
      <ellipse cx={0} cy={r * 0.62} rx={r * 0.13} ry={r * 0.09} fill={M.ink} />
    </g>
  )
}

/** A bunny face with tall ears (radius r). */
export function BunnyFace({ r = 60 }: { r?: number }) {
  const fur = '#f4eee8'
  return (
    <g strokeLinejoin="round">
      {[-1, 1].map((sg) => (
        <g key={sg} transform={`rotate(${sg * 10} ${sg * r * 0.35} ${-r * 0.8})`}>
          <ellipse cx={sg * r * 0.35} cy={-r * 1.45} rx={r * 0.24} ry={r * 0.7} fill={fur} stroke={M.ink} strokeWidth={OUT} />
          <ellipse cx={sg * r * 0.35} cy={-r * 1.45} rx={r * 0.11} ry={r * 0.5} fill={M.pink} opacity={0.7} />
        </g>
      ))}
      <circle r={r} fill={fur} stroke={M.ink} strokeWidth={OUT} />
      <circle cx={-r * 0.36} cy={-r * 0.12} r={r * 0.1} fill={M.ink} />
      <circle cx={r * 0.36} cy={-r * 0.12} r={r * 0.1} fill={M.ink} />
      <ellipse cx={0} cy={r * 0.18} rx={r * 0.12} ry={r * 0.08} fill={M.pink} stroke={M.ink} strokeWidth={2} />
      <path d={`M 0 ${r * 0.26} q ${-r * 0.12} ${r * 0.16} ${-r * 0.24} ${r * 0.06} M 0 ${r * 0.26} q ${r * 0.12} ${r * 0.16} ${r * 0.24} ${r * 0.06}`} fill="none" stroke={M.ink} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={-r * 0.6} cy={r * 0.22} r={r * 0.13} fill={M.pink} opacity={0.55} />
      <circle cx={r * 0.6} cy={r * 0.22} r={r * 0.13} fill={M.pink} opacity={0.55} />
    </g>
  )
}

/** A pear (height ~ 2.3 r). */
export function Pear({ r = 30 }: { r?: number }) {
  const c = '#b8d65a'
  return (
    <g>
      <path d={`M 0 ${-r * 1.05} Q ${r * 0.05} ${-r * 1.35} ${r * 0.2} ${-r * 1.45}`} stroke={M.wood} strokeWidth={r * 0.14} strokeLinecap="round" fill="none" />
      <path d={`M 0 ${-r * 1.05} C ${r * 0.45} ${-r * 1.05} ${r * 0.4} ${-r * 0.35} ${r * 0.75} ${r * 0.1} C ${r * 1.1} ${r * 0.6} ${r * 0.7} ${r * 1.05} 0 ${r * 1.05} C ${-r * 0.7} ${r * 1.05} ${-r * 1.1} ${r * 0.6} ${-r * 0.75} ${r * 0.1} C ${-r * 0.4} ${-r * 0.35} ${-r * 0.45} ${-r * 1.05} 0 ${-r * 1.05} Z`} fill={c} stroke={M.ink} strokeWidth={3.5} strokeLinejoin="round" />
      <ellipse cx={-r * 0.35} cy={r * 0.15} rx={r * 0.13} ry={r * 0.26} fill="#fff" opacity={0.5} />
    </g>
  )
}

/** A peach (radius r). */
export function Peach({ r = 30 }: { r?: number }) {
  return (
    <g>
      <ellipse cx={r * 0.35} cy={-r * 0.95} rx={r * 0.32} ry={r * 0.15} fill={M.leaf} stroke={M.ink} strokeWidth={2} transform={`rotate(-20 ${r * 0.35} ${-r * 0.95})`} />
      <circle r={r} fill="#ffb38a" stroke={M.ink} strokeWidth={3.5} />
      <path d={`M 0 ${-r * 0.95} Q ${-r * 0.35} 0 0 ${r * 0.95}`} fill="none" stroke="#f28c6b" strokeWidth={3} />
      <ellipse cx={-r * 0.45} cy={-r * 0.3} rx={r * 0.14} ry={r * 0.24} fill="#fff" opacity={0.45} />
    </g>
  )
}

/** A woven basket seen from the front (width w), its opening at y = 0. */
export function Basket({ w = 300 }: { w?: number }) {
  const h = w * 0.42
  return (
    <g strokeLinejoin="round">
      <path d={`M ${-w / 2} 0 L ${w / 2} 0 L ${w * 0.4} ${h} L ${-w * 0.4} ${h} Z`} fill="#e3b77e" stroke={M.ink} strokeWidth={OUT} />
      {[0.33, 0.66].map((f) => (
        <path key={f} d={`M ${-w / 2 + w * 0.1 * f} ${h * f} L ${w / 2 - w * 0.1 * f} ${h * f}`} stroke="#c99a5e" strokeWidth={3.5} />
      ))}
      <rect x={-w / 2 - 8} y={-10} width={w + 16} height={20} rx={10} fill="#d29a5c" stroke={M.ink} strokeWidth={OUT} />
    </g>
  )
}

/** A log lying across (length w), its top at y = 0. */
export function Log({ w = 600 }: { w?: number }) {
  const h = 46
  return (
    <g>
      <rect x={-w / 2} y={0} width={w} height={h} rx={h / 2} fill="#c48b5a" stroke={M.ink} strokeWidth={OUT} />
      <path d={`M ${-w * 0.3} ${h * 0.45} L ${-w * 0.12} ${h * 0.45} M ${w * 0.05} ${h * 0.6} L ${w * 0.25} ${h * 0.6}`} stroke={shade('#c48b5a', 0.25)} strokeWidth={3} strokeLinecap="round" />
      <ellipse cx={w / 2 - h * 0.3} cy={h / 2} rx={h * 0.3} ry={h * 0.42} fill="#e6bf8d" stroke={M.ink} strokeWidth={3} />
    </g>
  )
}

/** A branch reaching in from the left (length w), its top at y = 0. */
export function Branch({ w = 700 }: { w?: number }) {
  return (
    <g>
      <path d={`M ${-w / 2} 6 Q 0 22 ${w / 2} -4`} fill="none" stroke="#8a5d3b" strokeWidth={28} strokeLinecap="round" />
      <path d={`M ${-w / 2} 6 Q 0 22 ${w / 2} -4`} fill="none" stroke={M.ink} strokeWidth={3} strokeLinecap="round" opacity={0.35} />
      {[-0.3, 0.15, 0.42].map((f) => (
        <ellipse key={f} cx={w * f} cy={-18} rx={26} ry={12} fill={M.leaf} stroke={M.ink} strokeWidth={2.5} transform={`rotate(-25 ${w * f} -18)`} />
      ))}
    </g>
  )
}

/** The ten-frame: two rows of five cells (`cell` px), centred on (0, 0). The centre of cell i. */
export const frameCell = (i: number, cell: number): [number, number] => [(i % 5 - 2) * cell, (Math.floor(i / 5) - 0.5) * cell]

export function TenFrame({ cell = 100 }: { cell?: number }) {
  const w = cell * 5
  const h = cell * 2
  return (
    <g>
      <rect x={-w / 2 - 8} y={-h / 2 - 8} width={w + 16} height={h + 16} rx={18} fill="#fffaf0" stroke={M.ink} strokeWidth={OUT + 1} />
      {[1, 2, 3, 4].map((k) => (
        <line key={k} x1={-w / 2 + k * cell} y1={-h / 2} x2={-w / 2 + k * cell} y2={h / 2} stroke={M.ink} strokeWidth={3} />
      ))}
      <line x1={-w / 2} y1={0} x2={w / 2} y2={0} stroke={M.ink} strokeWidth={3} />
    </g>
  )
}

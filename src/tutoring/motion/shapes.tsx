import { PV, shade, tint } from './layout'
import { M } from './palette'

/**
 * Flat-vector props for lesson scenes: bold shapes, one warm ink outline, two
 * or three flat tones each. All draw centred on (x, y) at a given size, so a
 * scene can move / scale them freely (wrap in <T> or <Pop>).
 */

const OUT = 3.5

/** A chocolate-chip cookie (radius r). */
export function Cookie({ x, y, r = 22, rot = 0 }: { x: number; y: number; r?: number; rot?: number }) {
  const chips: [number, number, number][] = [
    [-0.38, -0.3, 0.16],
    [0.32, -0.36, 0.13],
    [0.05, 0.08, 0.15],
    [-0.3, 0.4, 0.13],
    [0.42, 0.28, 0.14],
  ]
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <circle r={r} fill="#e9b46a" stroke={M.ink} strokeWidth={OUT} />
      <circle r={r * 0.78} fill="#f2c47e" />
      {chips.map(([cx, cy, cr], i) => (
        <ellipse key={i} cx={cx * r} cy={cy * r} rx={cr * r} ry={cr * r * 0.8} fill="#6b4226" transform={`rotate(${i * 40} ${cx * r} ${cy * r})`} />
      ))}
    </g>
  )
}

/** A shiny apple (radius r). */
export function Apple({ x, y, r = 22, color = M.coral }: { x: number; y: number; r?: number; color?: string }) {
  const body = `M 0 ${-0.62 * r} C ${0.5 * r} ${-1.05 * r} ${1.12 * r} ${-0.6 * r} ${1.02 * r} ${0.12 * r} C ${0.94 * r} ${0.74 * r} ${0.42 * r} ${1.02 * r} 0 ${0.86 * r} C ${-0.42 * r} ${1.02 * r} ${-0.94 * r} ${0.74 * r} ${-1.02 * r} ${0.12 * r} C ${-1.12 * r} ${-0.6 * r} ${-0.5 * r} ${-1.05 * r} 0 ${-0.62 * r} Z`
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={`M 0 ${-0.6 * r} Q ${0.02 * r} ${-0.9 * r} ${0.16 * r} ${-1.08 * r}`} stroke={M.wood} strokeWidth={r * 0.16} strokeLinecap="round" fill="none" />
      <ellipse cx={0.42 * r} cy={-0.98 * r} rx={0.3 * r} ry={0.15 * r} fill={M.leaf} stroke={M.ink} strokeWidth={2} transform={`rotate(-25 ${0.42 * r} ${-0.98 * r})`} />
      <path d={body} fill={color} stroke={M.ink} strokeWidth={OUT} strokeLinejoin="round" />
      <ellipse cx={-0.45 * r} cy={-0.22 * r} rx={0.16 * r} ry={0.28 * r} fill="#fff" opacity={0.55} transform={`rotate(20 ${-0.45 * r} ${-0.22 * r})`} />
    </g>
  )
}

/** A round counter / token (radius r) with a soft highlight. */
export function Dot({ x, y, r = 18, color = M.sea }: { x: number; y: number; r?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill={color} stroke={M.ink} strokeWidth={OUT} />
      <ellipse cx={-r * 0.32} cy={-r * 0.34} rx={r * 0.28} ry={r * 0.18} fill="#fff" opacity={0.6} transform={`rotate(-30 ${-r * 0.32} ${-r * 0.34})`} />
    </g>
  )
}

const SKIN = ['#f6d2ad', '#c88f62', '#e9b48a', '#8f5c3d']
const HAIR = ['#3a2c38', '#6b3d22', '#f1c35a', '#2b2023']

/**
 * A friendly kid (head radius r) whose shirt is `color`. (x, y) = centre of
 * the head. `look` turns the eyes (−1…1); `smile` 0…1 widens the grin.
 */
export function Friend({ x, y, r = 34, color = M.sea, skin = 0, look = 0, smile = 0.6, blink = false }: { x: number; y: number; r?: number; color?: string; skin?: number; look?: number; smile?: number; blink?: boolean }) {
  const s = SKIN[skin % SKIN.length]
  const h = HAIR[skin % HAIR.length]
  const ex = look * r * 0.12
  return (
    <g transform={`translate(${x} ${y})`}>
      {/* body */}
      <path d={`M ${-r * 1.05} ${r * 2.05} Q ${-r * 1.05} ${r * 0.75} 0 ${r * 0.75} Q ${r * 1.05} ${r * 0.75} ${r * 1.05} ${r * 2.05} Z`} fill={color} stroke={M.ink} strokeWidth={OUT} strokeLinejoin="round" />
      {/* head */}
      <circle r={r} fill={s} stroke={M.ink} strokeWidth={OUT} />
      {/* hair cap */}
      <path d={`M ${-r * 0.98} ${-r * 0.12} Q ${-r * 1.02} ${-r * 1.08} ${r * 0.05} ${-r * 1.02} Q ${r * 0.98} ${-r * 0.98} ${r * 0.98} ${-r * 0.18} Q ${r * 0.5} ${-r * 0.62} ${-r * 0.1} ${-r * 0.5} Q ${-r * 0.6} ${-r * 0.42} ${-r * 0.98} ${-r * 0.12} Z`} fill={h} stroke={M.ink} strokeWidth={OUT} strokeLinejoin="round" />
      {/* eyes */}
      {blink ? (
        <>
          <path d={`M ${-r * 0.48 + ex} ${r * 0.08} q ${r * 0.13} ${r * 0.08} ${r * 0.26} 0`} stroke={M.ink} strokeWidth={3} fill="none" strokeLinecap="round" />
          <path d={`M ${r * 0.22 + ex} ${r * 0.08} q ${r * 0.13} ${r * 0.08} ${r * 0.26} 0`} stroke={M.ink} strokeWidth={3} fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx={-r * 0.35 + ex} cy={r * 0.06} rx={r * 0.1} ry={r * 0.13} fill={M.ink} />
          <ellipse cx={r * 0.35 + ex} cy={r * 0.06} rx={r * 0.1} ry={r * 0.13} fill={M.ink} />
        </>
      )}
      {/* cheeks + smile */}
      <circle cx={-r * 0.58} cy={r * 0.36} r={r * 0.14} fill={M.pink} opacity={0.6} />
      <circle cx={r * 0.58} cy={r * 0.36} r={r * 0.14} fill={M.pink} opacity={0.6} />
      <path d={`M ${-r * 0.26} ${r * 0.38} Q 0 ${r * (0.42 + 0.3 * smile)} ${r * 0.26} ${r * 0.38}`} stroke={M.ink} strokeWidth={3.5} fill={smile > 0.7 ? '#fff' : 'none'} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  )
}

/** A plate seen from the side (width w). */
export function Plate({ x, y, w = 150, color = M.white, rim = M.sky }: { x: number; y: number; w?: number; color?: string; rim?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={0} cy={4} rx={w / 2} ry={w * 0.16} fill={shade(rim, 0.25)} stroke={M.ink} strokeWidth={OUT} />
      <ellipse cx={0} cy={0} rx={w / 2} ry={w * 0.16} fill={color} stroke={M.ink} strokeWidth={OUT} />
      <ellipse cx={0} cy={0} rx={w * 0.34} ry={w * 0.1} fill="none" stroke={rim} strokeWidth={3} />
    </g>
  )
}

/** A frog (body width ≈ 2.2 r) for hopping along number lines. `squash` > 0 squashes on landing. */
export function Frog({ x, y, r = 26, squash = 0, color = M.leaf }: { x: number; y: number; r?: number; squash?: number; color?: string }) {
  const sx = 1 + squash * 0.25
  const sy = 1 - squash * 0.25
  return (
    <g transform={`translate(${x} ${y}) scale(${sx} ${sy})`}>
      {/* (x, y) = where its feet touch */}
      <ellipse cx={-r * 0.75} cy={-r * 0.12} rx={r * 0.42} ry={r * 0.2} fill={shade(color, 0.15)} stroke={M.ink} strokeWidth={3} />
      <ellipse cx={r * 0.75} cy={-r * 0.12} rx={r * 0.42} ry={r * 0.2} fill={shade(color, 0.15)} stroke={M.ink} strokeWidth={3} />
      <ellipse cx={0} cy={-r * 0.85} rx={r * 1.1} ry={r * 0.85} fill={color} stroke={M.ink} strokeWidth={OUT} />
      <ellipse cx={0} cy={-r * 0.62} rx={r * 0.65} ry={r * 0.48} fill={tint(color, 0.55)} />
      {[-1, 1].map((sg) => (
        <g key={sg}>
          <circle cx={sg * r * 0.5} cy={-r * 1.6} r={r * 0.36} fill={color} stroke={M.ink} strokeWidth={3} />
          <circle cx={sg * r * 0.5} cy={-r * 1.62} r={r * 0.22} fill="#fff" />
          <circle cx={sg * r * 0.5 + r * 0.05} cy={-r * 1.6} r={r * 0.11} fill={M.ink} />
        </g>
      ))}
      <path d={`M ${-r * 0.42} ${-r * 1.0} Q 0 ${-r * 0.72} ${r * 0.42} ${-r * 1.0}`} stroke={M.ink} strokeWidth={3} fill="none" strokeLinecap="round" />
      <circle cx={-r * 0.72} cy={-r * 0.95} r={r * 0.12} fill={M.pink} opacity={0.7} />
      <circle cx={r * 0.72} cy={-r * 0.95} r={r * 0.12} fill={M.pink} opacity={0.7} />
    </g>
  )
}

/** A crown (width ≈ 2 r). */
export function Crown({ x, y, r = 26 }: { x: number; y: number; r?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={`M ${-r} ${r * 0.55} L ${-r} ${-r * 0.35} L ${-r * 0.5} ${r * 0.1} L 0 ${-r * 0.7} L ${r * 0.5} ${r * 0.1} L ${r} ${-r * 0.35} L ${r} ${r * 0.55} Z`} fill={M.gold} stroke={M.ink} strokeWidth={OUT} strokeLinejoin="round" />
      <circle cx={0} cy={-r * 0.78} r={r * 0.14} fill={M.coral} stroke={M.ink} strokeWidth={2.5} />
      <circle cx={-r} cy={-r * 0.45} r={r * 0.12} fill={M.mint} stroke={M.ink} strokeWidth={2.5} />
      <circle cx={r} cy={-r * 0.45} r={r * 0.12} fill={M.mint} stroke={M.ink} strokeWidth={2.5} />
      <rect x={-r} y={r * 0.25} width={r * 2} height={r * 0.3} fill={shade(M.gold, 0.12)} />
    </g>
  )
}

// ── base-ten blocks ──────────────────────────────────────────────────────────
// Front face at (x, y) (top-left), cell size `s`, with a shallow 3-D top and side.
// Colours: PV in ./layout.

function Box({ x, y, w, h, d, color, gridX = 0, gridY = 0, gridTop = 0, gridSide = 0 }: { x: number; y: number; w: number; h: number; d: number; color: string; gridX?: number; gridY?: number; gridTop?: number; gridSide?: number }) {
  const top = tint(color, 0.35)
  const side = shade(color, 0.18)
  const line = shade(color, 0.42)
  return (
    <g strokeLinejoin="round">
      <path d={`M ${x} ${y} L ${x + d} ${y - d} L ${x + w + d} ${y - d} L ${x + w} ${y} Z`} fill={top} stroke={M.ink} strokeWidth={2.5} />
      <path d={`M ${x + w} ${y} L ${x + w + d} ${y - d} L ${x + w + d} ${y + h - d} L ${x + w} ${y + h} Z`} fill={side} stroke={M.ink} strokeWidth={2.5} />
      <rect x={x} y={y} width={w} height={h} fill={color} stroke={M.ink} strokeWidth={2.5} />
      {Array.from({ length: Math.max(0, gridX - 1) }, (_, i) => (
        <line key={`gx${i}`} x1={x + ((i + 1) * w) / gridX} y1={y + 1.5} x2={x + ((i + 1) * w) / gridX} y2={y + h - 1.5} stroke={line} strokeWidth={1.5} />
      ))}
      {Array.from({ length: Math.max(0, gridY - 1) }, (_, i) => (
        <line key={`gy${i}`} x1={x + 1.5} y1={y + ((i + 1) * h) / gridY} x2={x + w - 1.5} y2={y + ((i + 1) * h) / gridY} stroke={line} strokeWidth={1.5} />
      ))}
      {Array.from({ length: Math.max(0, gridTop - 1) }, (_, i) => {
        const k = (i + 1) / gridTop
        return <line key={`gt${i}`} x1={x + w * k} y1={y} x2={x + w * k + d} y2={y - d} stroke={line} strokeWidth={1.2} />
      })}
      {Array.from({ length: Math.max(0, gridSide - 1) }, (_, i) => {
        const k = (i + 1) / gridSide
        return <line key={`gs${i}`} x1={x + w} y1={y + h * k} x2={x + w + d} y2={y + h * k - d} stroke={line} strokeWidth={1.2} />
      })}
    </g>
  )
}

/** One unit cube ("a one"), top-left of its front face at (x, y). */
export function UnitCube({ x, y, s = 22, color = PV.ones }: { x: number; y: number; s?: number; color?: string }) {
  return <Box x={x} y={y} w={s} h={s} d={s * 0.35} color={color} />
}

/** A rod of ten cubes standing up ("a ten"). */
export function Rod({ x, y, s = 22, color = PV.tens }: { x: number; y: number; s?: number; color?: string }) {
  return <Box x={x} y={y} w={s} h={s * 10} d={s * 0.35} color={color} gridY={10} gridSide={10} />
}

/** A flat of 10 × 10 cubes ("a hundred"). */
export function Flat({ x, y, s = 12, color = PV.hundreds }: { x: number; y: number; s?: number; color?: string }) {
  return <Box x={x} y={y} w={s * 10} h={s * 10} d={s * 0.6} color={color} gridX={10} gridY={10} gridTop={10} gridSide={10} />
}

/** A big cube of 10 × 10 × 10 ("a thousand"). */
export function BigCube({ x, y, s = 9, color = PV.thousands }: { x: number; y: number; s?: number; color?: string }) {
  return <Box x={x} y={y} w={s * 10} h={s * 10} d={s * 4.2} color={color} gridX={10} gridY={10} gridTop={10} gridSide={10} />
}

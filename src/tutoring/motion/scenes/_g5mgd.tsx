/* eslint-disable react-refresh/only-export-components -- a helper module of scene primitives + geometry math, not an HMR boundary */
import type { ReactNode } from 'react'
import { clamp, ease, progress } from '../anim'
import { Title } from '../kit'
import { M } from '../palette'

/**
 * Shared drawing for the 5th-grade Measurement Marsh, Geometry Grove and Data
 * Delta lessons (g5Volume, g5Coordinates, g5LinePlots): isometric unit cubes
 * and boxes, a first-quadrant grid, and a fraction number line. Pure in `t`.
 */

const C30 = Math.cos(Math.PI / 6)

/** An isometric view: (x, y, z) in units → stage px, x running right-down, y left-down, z up. */
export function isoView(ox: number, oy: number, u: number) {
  return (x: number, y: number, z: number): [number, number] => [ox + (x - y) * C30 * u, oy + (x + y) * 0.5 * u - z * u]
}
export type Iso = ReturnType<typeof isoView>

export const CUBE_TONES = {
  gold: { top: '#ffe69a', left: '#f5c24a', right: '#e8a93a' },
  blue: { top: '#c6e8ff', left: '#8cc4f2', right: '#6aa9e0' },
  mint: { top: '#cff5e2', left: '#8fdcb8', right: '#6cc59c' },
} as const
export type Tone = (typeof CUBE_TONES)[keyof typeof CUBE_TONES]

const pts = (ps: [number, number][]) => ps.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')

/** One unit cube at (x, y, z), lifted `lift` units (falling in), drawn with its three visible faces. */
export function Cube({ P, x, y, z, tone = CUBE_TONES.gold, lift = 0, o = 1 }: { P: Iso; x: number; y: number; z: number; tone?: Tone; lift?: number; o?: number }) {
  if (o <= 0.001) return null
  const zz = z + lift
  return (
    <g opacity={o < 1 ? o : undefined} stroke={M.ink} strokeWidth={2.5} strokeLinejoin="round">
      <polygon points={pts([P(x, y, zz + 1), P(x + 1, y, zz + 1), P(x + 1, y + 1, zz + 1), P(x, y + 1, zz + 1)])} fill={tone.top} />
      <polygon points={pts([P(x, y + 1, zz), P(x + 1, y + 1, zz), P(x + 1, y + 1, zz + 1), P(x, y + 1, zz + 1)])} fill={tone.left} />
      <polygon points={pts([P(x + 1, y, zz), P(x + 1, y + 1, zz), P(x + 1, y + 1, zz + 1), P(x + 1, y, zz + 1)])} fill={tone.right} />
    </g>
  )
}

/** A plain box from (x0, 0, 0) to (x0 + l, w, h). */
export function Box({ P, x0 = 0, l, w, h, tone = CUBE_TONES.gold, o = 1, dx = 0 }: { P: Iso; x0?: number; l: number; w: number; h: number; tone?: Tone; o?: number; dx?: number }) {
  if (o <= 0.001) return null
  const a = x0 + dx
  const b = a + l
  return (
    <g opacity={o < 1 ? o : undefined} stroke={M.ink} strokeWidth={4} strokeLinejoin="round">
      <polygon points={pts([P(a, 0, h), P(b, 0, h), P(b, w, h), P(a, w, h)])} fill={tone.top} />
      <polygon points={pts([P(a, w, 0), P(b, w, 0), P(b, w, h), P(a, w, h)])} fill={tone.left} />
      <polygon points={pts([P(b, 0, 0), P(b, w, 0), P(b, w, h), P(b, 0, h)])} fill={tone.right} />
    </g>
  )
}

/** Cubes that drop into place one by one from `at` (`gap` s apart), back to front. */
export function CubeBuild({ t, P, cells, at, gap = 0.1, tone }: { t: number; P: Iso; cells: [number, number, number][]; at: number; gap?: number; tone?: Tone }) {
  const order = cells.map((c, i) => ({ c, i })).sort((a, b) => a.c[0] + a.c[1] + a.c[2] - (b.c[0] + b.c[1] + b.c[2]))
  return (
    <>
      {order.map(({ c, i }) => {
        const k = ease.outCubic(progress(t, at + i * gap, 0.4))
        return <Cube key={c.join('.')} P={P} x={c[0]} y={c[1]} z={c[2]} tone={tone} lift={(1 - k) * 2.5} o={clamp(k * 2.5)} />
      })}
    </>
  )
}

/** Every cell of an l × w × h box (layer by layer, bottom first). */
export const boxCells = (l: number, w: number, h: number, z0 = 0): [number, number, number][] => {
  const out: [number, number, number][] = []
  for (let z = z0; z < z0 + h; z++) for (let y = 0; y < w; y++) for (let x = 0; x < l; x++) out.push([x, y, z])
  return out
}

// ── a first-quadrant grid ────────────────────────────────────────────────────

export interface Grid {
  ox: number
  oy: number
  u: number
  n: number
}
export const gx = (g: Grid, x: number) => g.ox + x * g.u
export const gy = (g: Grid, y: number) => g.oy - y * g.u

/** Grid lines, then the axes drawing on (x from `xAt`, y from `yAt`), numbers popping in along them. */
export function Plane({ t, g, xAt, yAt, numbers = true, step = 1 }: { t: number; g: Grid; xAt: number; yAt: number; numbers?: boolean; step?: number }) {
  const span = g.n * g.u
  const kx = ease.inOutCubic(progress(t, xAt, 0.7))
  const ky = ease.inOutCubic(progress(t, yAt, 0.7))
  const lines: ReactNode[] = []
  for (let i = 0; i <= g.n; i++) {
    lines.push(<line key={`v${i}`} x1={gx(g, i)} y1={g.oy} x2={gx(g, i)} y2={g.oy - span} stroke={M.sea} strokeOpacity={0.25 * Math.max(kx, ky)} strokeWidth={2} />)
    lines.push(<line key={`h${i}`} x1={g.ox} y1={gy(g, i)} x2={g.ox + span} y2={gy(g, i)} stroke={M.sea} strokeOpacity={0.25 * Math.max(kx, ky)} strokeWidth={2} />)
  }
  return (
    <g>
      <rect x={g.ox} y={g.oy - span} width={span} height={span} fill={M.white} opacity={0.75 * Math.max(kx, ky)} />
      {lines}
      {kx > 0 && <line x1={g.ox} y1={g.oy} x2={g.ox + (span + 26) * kx} y2={g.oy} stroke={M.ink} strokeWidth={5} strokeLinecap="round" />}
      {ky > 0 && <line x1={g.ox} y1={g.oy} x2={g.ox} y2={g.oy - (span + 26) * ky} stroke={M.ink} strokeWidth={5} strokeLinecap="round" />}
      {numbers &&
        Array.from({ length: g.n + 1 }, (_, i) => i).map((i) =>
          i % step === 0 ? (
            <g key={i}>
              {progress(t, xAt + 0.3 + i * 0.04, 0.2) > 0 && (
                <Title x={gx(g, i)} y={g.oy + 22} size={19} weight={600} color={M.inkSoft}>
                  {i}
                </Title>
              )}
              {i > 0 && progress(t, yAt + 0.3 + i * 0.04, 0.2) > 0 && (
                <Title x={g.ox - 18} y={gy(g, i)} size={19} weight={600} color={M.inkSoft}>
                  {i}
                </Title>
              )}
            </g>
          ) : null,
        )}
    </g>
  )
}

/** A dot on the grid with an optional label up and to the right. */
export function Dot({ g, x, y, color = M.coral, label, s = 1 }: { g: Grid; x: number; y: number; color?: string; label?: string; s?: number }) {
  if (s <= 0.001) return null
  const cx = gx(g, x)
  const cy = gy(g, y)
  return (
    <g transform={`translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`}>
      <circle cx={cx} cy={cy} r={11} fill={color} stroke={M.ink} strokeWidth={3.5} />
      {label && (
        <Title x={cx + 16} y={cy - 18} size={26} anchor="start" stroke={M.white}>
          {label}
        </Title>
      )}
    </g>
  )
}

// ── a fraction number line ───────────────────────────────────────────────────

/** "3/8" as a stacked fraction at (x, y). */
export function Frac({ x, y, n, d, size = 22, color = M.ink, whole }: { x: number; y: number; n: number; d: number; size?: number; color?: string; whole?: number }) {
  const fx = whole ? x + size * 0.45 : x
  return (
    <g>
      {whole ? (
        <Title x={x - size * 0.45} y={y} size={size * 1.15} color={color} stroke={M.paper}>
          {whole}
        </Title>
      ) : null}
      <Title x={fx} y={y - size * 0.62} size={size} color={color} stroke={M.paper}>
        {n}
      </Title>
      <line x1={fx - size * 0.42} y1={y} x2={fx + size * 0.42} y2={y} stroke={color} strokeWidth={3} strokeLinecap="round" />
      <Title x={fx} y={y + size * 0.66} size={size} color={color} stroke={M.paper}>
        {d}
      </Title>
    </g>
  )
}

/** An X mark (one measurement on a line plot). */
export function XMark({ x, y, r = 13, color = M.seaDeep, s = 1 }: { x: number; y: number; r?: number; color?: string; s?: number }) {
  if (s <= 0.001) return null
  const rr = r * s
  return <path d={`M ${x - rr} ${y - rr} L ${x + rr} ${y + rr} M ${x + rr} ${y - rr} L ${x - rr} ${y + rr}`} stroke={color} strokeWidth={6} strokeLinecap="round" />
}

/**
 * A line of words, each in its own colour (`colors[i]` for word i), laid out by
 * the browser's own text spacing and popping in as one from `at`.
 */
export function ColorWords({ t, at, text, x, y, size = 40, colors = [], gap: _gap, anchor = 'middle' }: { t: number; at: number; text: string; x: number; y: number; size?: number; colors?: (string | undefined)[]; gap?: number; anchor?: 'start' | 'middle' | 'end' }) {
  void _gap
  const s = ease.outBack(progress(t, at, 0.45))
  if (s <= 0.001) return null
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})`} opacity={clamp(s * 2)}>
      <text x={x} y={y} fontFamily={M.font} fontWeight={700} fontSize={size} textAnchor={anchor} dominantBaseline="middle" stroke={M.white} strokeWidth={size / 8} paintOrder="stroke fill" strokeLinejoin="round">
        {text.split(' ').map((w, i, all) => (
          <tspan key={i} fill={colors[i] ?? M.ink}>
            {w + (i < all.length - 1 ? ' ' : '')}
          </tspan>
        ))}
      </text>
    </g>
  )
}

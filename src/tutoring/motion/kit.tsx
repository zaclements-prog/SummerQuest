import type { ReactNode } from 'react'
import { clamp, ease, interpolate, progress, spring, type Easing } from './anim'
import { H, M, W } from './palette'

/**
 * Motion-graphics primitives for lesson scenes. Every primitive is a pure
 * function of `t` (seconds) and an `at` start time (usually from `cue(...)`),
 * so scenes stay declarative: "the 4 pops in when 'the bottom number' is said".
 */

/** Shared filters/gradients. Render once per stage (MotionStage does). */
export function Defs() {
  return (
    <defs>
      <filter id="sq-shadow" x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor={M.ink} floodOpacity="0.18" />
      </filter>
      <filter id="sq-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="8" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <pattern id="sq-dots" width="28" height="28" patternUnits="userSpaceOnUse">
        <circle cx="14" cy="14" r="1.6" fill={M.ink} opacity="0.07" />
      </pattern>
      <radialGradient id="sq-vignette" cx="50%" cy="45%" r="75%">
        <stop offset="60%" stopColor={M.paper} stopOpacity="0" />
        <stop offset="100%" stopColor={M.paperDeep} stopOpacity="0.9" />
      </radialGradient>
    </defs>
  )
}

/** Warm paper background with a dot grid and soft vignette. */
export function Paper({ color = M.paper }: { color?: string }) {
  return (
    <g>
      <rect width={W} height={H} fill={color} />
      <rect width={W} height={H} fill="url(#sq-dots)" />
      <rect width={W} height={H} fill="url(#sq-vignette)" />
    </g>
  )
}

/** Scale-pop in (with overshoot) around (x, y); optional pop-out at `out`. */
export function Pop({ t, at, x = 0, y = 0, out, bounce = 12, children }: { t: number; at: number; x?: number; y?: number; out?: number; bounce?: number; children: ReactNode }) {
  let s = spring(t, at, { stiffness: 210, damping: bounce })
  if (out !== undefined) s *= 1 - ease.inOutCubic(progress(t, out, 0.3))
  if (s <= 0.001) return null
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})`} opacity={clamp(s * 2)}>
      {children}
    </g>
  )
}

/** Fade in at `at` (and out at `out`). */
export function Fade({ t, at, dur = 0.45, out, children }: { t: number; at: number; dur?: number; out?: number; children: ReactNode }) {
  let o = ease.outQuad(progress(t, at, dur))
  if (out !== undefined) o *= 1 - progress(t, out, dur)
  if (o <= 0.001) return null
  return <g opacity={o}>{children}</g>
}

/** Translate from `from` to `to` between `at` and `at+dur`. */
export function Move({ t, at, dur = 0.8, from, to, easing = ease.inOutCubic, children }: { t: number; at: number; dur?: number; from: [number, number]; to: [number, number]; easing?: Easing; children: ReactNode }) {
  const k = easing(progress(t, at, dur))
  return <g transform={`translate(${from[0] + (to[0] - from[0]) * k} ${from[1] + (to[1] - from[1]) * k})`}>{children}</g>
}

/** A path that draws itself on (stroke reveal). */
export function Draw({ t, at, dur = 0.8, d, stroke = M.ink, width = 6, fill = 'none', easing = ease.inOutCubic, dash }: { t: number; at: number; dur?: number; d: string; stroke?: string; width?: number; fill?: string; easing?: Easing; dash?: string }) {
  const k = easing(progress(t, at, dur))
  if (k <= 0) return null
  return (
    <path
      d={d}
      pathLength={dash ? undefined : 1}
      fill={fill}
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dash ?? '1 1'}
      strokeDashoffset={dash ? undefined : 1 - k}
      opacity={dash ? k : 1}
    />
  )
}

/** Outlined, chunky display text (the "kinetic type" look). */
export function Title({ x, y, size = 56, color = M.ink, stroke, anchor = 'middle', weight = 700, children }: { x: number; y: number; size?: number; color?: string; stroke?: string; anchor?: 'start' | 'middle' | 'end'; weight?: number; children: ReactNode }) {
  return (
    <text
      x={x}
      y={y}
      fontFamily={M.font}
      fontWeight={weight}
      fontSize={size}
      textAnchor={anchor}
      dominantBaseline="middle"
      fill={color}
      stroke={stroke}
      strokeWidth={stroke ? size / 9 : undefined}
      paintOrder="stroke fill"
      strokeLinejoin="round"
    >
      {children}
    </text>
  )
}

/**
 * Kinetic typography: the words of `text` spring in one by one from `at`
 * (`gap` seconds apart), each rising a little. Great for key phrases.
 */
export function Kinetic({ t, at, text, x, y, size = 44, color = M.ink, stroke = M.white, gap = 0.09, anchor = 'middle' }: { t: number; at: number; text: string; x: number; y: number; size?: number; color?: string; stroke?: string; gap?: number; anchor?: 'start' | 'middle' | 'end' }) {
  const words = text.split(' ')
  return (
    <text x={x} y={y} fontFamily={M.font} fontWeight={700} fontSize={size} textAnchor={anchor} dominantBaseline="middle" fill={color} stroke={stroke} strokeWidth={size / 8} paintOrder="stroke fill" strokeLinejoin="round">
      {words.map((w, i) => {
        const s = spring(t, at + i * gap, { stiffness: 260, damping: 15 })
        return (
          <tspan key={i} opacity={clamp(s * 1.6)} dy={i === 0 ? 0 : undefined} style={{ fontSize: size * (0.6 + 0.4 * clamp(s, 0, 1.2)) }}>
            {w + (i < words.length - 1 ? ' ' : '')}
          </tspan>
        )
      })}
    </text>
  )
}

/** A number that counts up from `from` to `to`. */
export function Count({ t, at, dur = 0.8, from = 0, to, x, y, size = 64, color = M.ink, stroke = M.white }: { t: number; at: number; dur?: number; from?: number; to: number; x: number; y: number; size?: number; color?: string; stroke?: string }) {
  const v = Math.round(interpolate(t, [at, at + dur], [from, to], ease.outCubic))
  if (t < at) return null
  return (
    <Title x={x} y={y} size={size} color={color} stroke={stroke}>
      {v}
    </Title>
  )
}

/** A rounded label chip that pops in. */
export function Chip({ t, at, x, y, text, color = M.gold, ink = M.ink, size = 26, out }: { t: number; at: number; x: number; y: number; text: string; color?: string; ink?: string; size?: number; out?: number }) {
  const w = text.length * size * 0.56 + size * 1.4
  const h = size * 1.7
  return (
    <Pop t={t} at={at} x={x} y={y} out={out}>
      <g filter="url(#sq-shadow)">
        <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={h / 2} fill={color} stroke={M.ink} strokeWidth={3} />
        <Title x={x} y={y + 1} size={size} color={ink}>
          {text}
        </Title>
      </g>
    </Pop>
  )
}

/** A sparkle burst (rays + dots) that flashes at `at`. */
export function Burst({ t, at, x, y, color = M.gold, r = 60, rays = 10 }: { t: number; at: number; x: number; y: number; color?: string; r?: number; rays?: number }) {
  const k = progress(t, at, 0.6)
  if (k <= 0 || k >= 1) return null
  const e = ease.outCubic(k)
  return (
    <g opacity={1 - k}>
      {Array.from({ length: rays }, (_, i) => {
        const a = (i / rays) * Math.PI * 2
        const r0 = r * 0.35 + r * 0.4 * e
        const r1 = r * 0.55 + r * 0.6 * e
        return <line key={i} x1={x + Math.cos(a) * r0} y1={y + Math.sin(a) * r0} x2={x + Math.cos(a) * r1} y2={y + Math.sin(a) * r1} stroke={color} strokeWidth={6 * (1 - k) + 2} strokeLinecap="round" />
      })}
      <circle cx={x} cy={y} r={r * 0.3 * (1 - e)} fill={color} />
    </g>
  )
}

/** A pulsing ring that draws attention to a spot. */
export function Ring({ t, at, x, y, r = 50, color = M.coral, out }: { t: number; at: number; x: number; y: number; r?: number; color?: string; out?: number }) {
  if (t < at || (out !== undefined && t > out)) return null
  const p = ((t - at) % 1.2) / 1.2
  const appear = ease.outBack(progress(t, at, 0.4))
  return (
    <g>
      <circle cx={x} cy={y} r={r * appear} fill="none" stroke={color} strokeWidth={5} />
      <circle cx={x} cy={y} r={r * (1 + p * 0.5)} fill="none" stroke={color} strokeWidth={4 * (1 - p)} opacity={1 - p} />
    </g>
  )
}

/** A hand-drawn curved arrow from a to b that draws on. */
export function Arrow({ t, at, from, to, bend = 0.25, color = M.ink, width = 5, dur = 0.6 }: { t: number; at: number; from: [number, number]; to: [number, number]; bend?: number; color?: string; width?: number; dur?: number }) {
  const [x0, y0] = from
  const [x1, y1] = to
  const mx = (x0 + x1) / 2 - (y1 - y0) * bend
  const my = (y0 + y1) / 2 + (x1 - x0) * bend
  const d = `M ${x0} ${y0} Q ${mx} ${my} ${x1} ${y1}`
  const k = progress(t, at, dur)
  const ang = Math.atan2(y1 - my, x1 - mx)
  const head = 16
  return (
    <g>
      <Draw t={t} at={at} dur={dur} d={d} stroke={color} width={width} />
      {k >= 1 && (
        <path
          d={`M ${x1 - head * Math.cos(ang - 0.5)} ${y1 - head * Math.sin(ang - 0.5)} L ${x1} ${y1} L ${x1 - head * Math.cos(ang + 0.5)} ${y1 - head * Math.sin(ang + 0.5)}`}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </g>
  )
}

/**
 * A virtual camera: pans/zooms the whole scene between keyframes
 * (`{ at, x, y, zoom }` = look at (x, y) with that zoom from time `at`).
 */
export function Camera({ t, keys, children }: { t: number; keys: { at: number; x: number; y: number; zoom: number }[]; children: ReactNode }) {
  let x = keys[0].x
  let y = keys[0].y
  let z = keys[0].zoom
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1]
    const b = keys[i]
    if (t >= b.at) {
      x = b.x
      y = b.y
      z = b.zoom
      continue
    }
    const p = ease.inOutCubic(progress(t, b.at - 0.9, 0.9))
    x = a.x + (b.x - a.x) * p
    y = a.y + (b.y - a.y) * p
    z = a.zoom + (b.zoom - a.zoom) * p
    break
  }
  return <g transform={`translate(${W / 2} ${H / 2}) scale(${z}) translate(${-x} ${-y})`}>{children}</g>
}

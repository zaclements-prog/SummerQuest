import type { ReactNode } from 'react'
import { clamp, ease, interpolate, progress, rand, spring, type Easing } from './anim'
import { lineX, sparklePath, tokenXs } from './layout'
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

// ── extended kit (additive) ──────────────────────────────────────────────────
// Layout helpers (textWidth, tokenXs, lineX, sparklePath…) live in ./layout.

/**
 * A transform group: move to (x, y), then rotate `r` degrees and scale `s`
 * about that point. Children draw around (0, 0). `o` = opacity.
 */
export function T({ x = 0, y = 0, s = 1, sx, sy, r = 0, o = 1, children }: { x?: number; y?: number; s?: number; sx?: number; sy?: number; r?: number; o?: number; children: ReactNode }) {
  if (o <= 0.001 || s <= 0.0005) return null
  const scale = sx !== undefined || sy !== undefined ? `scale(${(sx ?? 1) * s} ${(sy ?? 1) * s})` : s !== 1 ? `scale(${s})` : ''
  return (
    <g transform={`translate(${x} ${y})${r ? ` rotate(${r})` : ''}${scale ? ` ${scale}` : ''}`} opacity={o < 1 ? o : undefined}>
      {children}
    </g>
  )
}

/** One token of an `Equation`. `at` = when it pops in (default: immediately). */
export interface Tok {
  text: string
  color?: string
  at?: number
  out?: number
  /** Extra offset / scale / opacity a scene can drive per token (morphs, nudges). */
  dx?: number
  dy?: number
  s?: number
  o?: number
}

/**
 * A line of maths whose tokens pop in one by one on cue, e.g.
 *   <Equation t={t} x={480} y={460} tokens={[{ text: '3', at: a }, { text: '×', at: b }, …]} />
 * Layout is fixed from the start (tokens don't shove each other as they land).
 */
export function Equation({ t, x, y, size = 64, tokens, gap = 0.22, stroke = M.white, anchor = 'middle', color = M.ink }: { t: number; x: number; y: number; size?: number; tokens: Tok[]; gap?: number; stroke?: string; anchor?: 'start' | 'middle' | 'end'; color?: string }) {
  const xs = tokenXs(
    tokens.map((k) => k.text),
    x,
    size,
    gap,
    anchor,
  )
  return (
    <g>
      {tokens.map((k, i) => {
        const at = k.at ?? -1
        let s = spring(t, at, { stiffness: 260, damping: 14 })
        if (k.out !== undefined) s *= 1 - ease.inOutCubic(progress(t, k.out, 0.3))
        s *= k.s ?? 1
        const o = clamp(s * 2) * (k.o ?? 1)
        if (s <= 0.001 || o <= 0.001) return null
        const cx = xs[i] + (k.dx ?? 0)
        const cy = y + (k.dy ?? 0) + (1 - clamp(s)) * size * 0.25
        return (
          <g key={i} transform={`translate(${cx} ${cy}) scale(${s})`} opacity={o}>
            <Title x={0} y={0} size={size} color={k.color ?? color} stroke={stroke}>
              {k.text}
            </Title>
          </g>
        )
      })}
    </g>
  )
}

/**
 * Kinetic words with a fixed layout: each word springs up into place from
 * `at` (`gap` s apart). `colors` tints words by index.
 */
export function Words({ t, at, text, x, y, size = 44, color = M.ink, stroke = M.white, gap = 0.08, anchor = 'middle', colors, out }: { t: number; at: number; text: string; x: number; y: number; size?: number; color?: string; stroke?: string; gap?: number; anchor?: 'start' | 'middle' | 'end'; colors?: (string | undefined)[]; out?: number }) {
  const words = text.split(' ')
  const xs = tokenXs(words, x, size, 0.28, anchor)
  const fade = out !== undefined ? 1 - ease.inOutCubic(progress(t, out, 0.35)) : 1
  if (fade <= 0.001) return null
  return (
    <g opacity={fade < 1 ? fade : undefined}>
      {words.map((w, i) => {
        const s = spring(t, at + i * gap, { stiffness: 240, damping: 15 })
        if (s <= 0.001) return null
        return (
          <g key={i} transform={`translate(${xs[i]} ${y + (1 - clamp(s)) * size * 0.5}) scale(${0.5 + 0.5 * s})`} opacity={clamp(s * 1.8)}>
            <Title x={0} y={0} size={size} color={colors?.[i] ?? color} stroke={stroke}>
              {w}
            </Title>
          </g>
        )
      })}
    </g>
  )
}

/** A marker swipe that grows left→right behind a span (x, y = left edge, vertical centre). */
export function Highlight({ t, at, x, y, w, h = 40, color = M.gold, out, dur = 0.35, opacity = 0.55 }: { t: number; at: number; x: number; y: number; w: number; h?: number; color?: string; out?: number; dur?: number; opacity?: number }) {
  const k = ease.outCubic(progress(t, at, dur))
  const o = out !== undefined ? 1 - progress(t, out, 0.3) : 1
  if (k <= 0 || o <= 0) return null
  return <rect x={x} y={y - h / 2} width={w * k} height={h} rx={h * 0.35} fill={color} opacity={opacity * o} transform={`rotate(-1.2 ${x} ${y})`} />
}

/** A white number disc that pops in (counting things off). */
export function Badge({ t, at, x, y, text, r = 22, fill = M.white, ink = M.ink, ring = M.ink, out, size }: { t: number; at: number; x: number; y: number; text: string | number; r?: number; fill?: string; ink?: string; ring?: string; out?: number; size?: number }) {
  return (
    <Pop t={t} at={at} x={x} y={y} out={out}>
      <circle cx={x} cy={y} r={r} fill={fill} stroke={ring} strokeWidth={3} />
      <Title x={x} y={y + 1} size={size ?? r * 1.2} color={ink}>
        {text}
      </Title>
    </Pop>
  )
}

/**
 * A curly brace drawn on along a horizontal span x0…x1 at height y. `dir`
 * = which way its tip points ('down' | 'up'); `label` sits beyond the tip.
 */
export function Brace({ t, at, x0, x1, y, dir = 'down', depth = 22, color = M.ink, width = 4, label, labelColor, labelSize = 28, out }: { t: number; at: number; x0: number; x1: number; y: number; dir?: 'down' | 'up'; depth?: number; color?: string; width?: number; label?: string; labelColor?: string; labelSize?: number; out?: number }) {
  const sg = dir === 'down' ? 1 : -1
  const m = (x0 + x1) / 2
  const h = depth / 2
  const r = Math.min(14, (x1 - x0) / 6)
  const d = `M ${x0} ${y} Q ${x0} ${y + sg * h} ${x0 + r} ${y + sg * h} L ${m - r} ${y + sg * h} Q ${m} ${y + sg * h} ${m} ${y + sg * depth} Q ${m} ${y + sg * h} ${m + r} ${y + sg * h} L ${x1 - r} ${y + sg * h} Q ${x1} ${y + sg * h} ${x1} ${y}`
  const o = out !== undefined ? 1 - progress(t, out, 0.3) : 1
  if (o <= 0 || t < at) return null
  const ly = y + sg * (depth + labelSize * 0.8)
  return (
    <g opacity={o < 1 ? o : undefined}>
      <Draw t={t} at={at} dur={0.5} d={d} stroke={color} width={width} />
      {label && (
        <Pop t={t} at={at + 0.3} x={m} y={ly}>
          <Title x={m} y={ly} size={labelSize} color={labelColor ?? color} stroke={M.white}>
            {label}
          </Title>
        </Pop>
      )}
    </g>
  )
}

/** Brace for a vertical span y0…y1 at x; tip points 'left' or 'right'. */
export function VBrace({ t, at, y0, y1, x, dir = 'left', depth = 22, color = M.ink, width = 4, label, labelColor, labelSize = 28, out }: { t: number; at: number; y0: number; y1: number; x: number; dir?: 'left' | 'right'; depth?: number; color?: string; width?: number; label?: string; labelColor?: string; labelSize?: number; out?: number }) {
  const sg = dir === 'right' ? 1 : -1
  const m = (y0 + y1) / 2
  const h = depth / 2
  const r = Math.min(14, (y1 - y0) / 6)
  const d = `M ${x} ${y0} Q ${x + sg * h} ${y0} ${x + sg * h} ${y0 + r} L ${x + sg * h} ${m - r} Q ${x + sg * h} ${m} ${x + sg * depth} ${m} Q ${x + sg * h} ${m} ${x + sg * h} ${m + r} L ${x + sg * h} ${y1 - r} Q ${x + sg * h} ${y1} ${x} ${y1}`
  const o = out !== undefined ? 1 - progress(t, out, 0.3) : 1
  if (o <= 0 || t < at) return null
  const lx = x + sg * (depth + 10)
  return (
    <g opacity={o < 1 ? o : undefined}>
      <Draw t={t} at={at} dur={0.5} d={d} stroke={color} width={width} />
      {label && (
        <Pop t={t} at={at + 0.3} x={lx} y={m}>
          <Title x={lx} y={m} size={labelSize} color={labelColor ?? color} stroke={M.white} anchor={dir === 'right' ? 'start' : 'end'}>
            {label}
          </Title>
        </Pop>
      )}
    </g>
  )
}

/** Paper confetti that bursts up from (x, y) at `at`, tumbles and falls (pure in t). */
export function Confetti({ t, at, x, y, n = 34, spread = 340, colors = M.set, dur = 2.4, seed = 1 }: { t: number; at: number; x: number; y: number; n?: number; spread?: number; colors?: readonly string[]; dur?: number; seed?: number }) {
  const tau = t - at
  if (tau <= 0 || tau >= dur) return null
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const r1 = rand(seed * 97 + i)
        const r2 = rand(seed * 131 + i * 7)
        const r3 = rand(seed * 17 + i * 13)
        const a = -Math.PI / 2 + (r1 - 0.5) * Math.PI * 1.3
        const v = spread * (0.75 + 0.9 * r2)
        // drag so pieces flutter instead of dropping like stones
        const k = (1 - Math.exp(-1.6 * tau)) / 1.6
        const px = x + Math.cos(a) * v * k
        const py = y + Math.sin(a) * v * k + 200 * tau * tau
        const rot = (r3 - 0.5) * 900 * tau
        const o = 1 - clamp((tau - dur * 0.6) / (dur * 0.4))
        const c = colors[i % colors.length]
        const flip = Math.abs(Math.cos(tau * (4 + r3 * 6)))
        return (
          <g key={i} transform={`translate(${px} ${py}) rotate(${rot}) scale(1 ${0.25 + 0.75 * flip})`} opacity={o}>
            {i % 3 === 0 ? <circle r={5} fill={c} /> : <rect x={-7} y={-4} width={14} height={8} rx={2} fill={c} />}
          </g>
        )
      })}
    </g>
  )
}

/** Idle twinkles around a point (hero frames): little sparkles that blink in turn. */
export function Twinkle({ t, at, x, y, r = 90, n = 5, color = M.gold, size = 12 }: { t: number; at: number; x: number; y: number; r?: number; n?: number; color?: string; size?: number }) {
  if (t < at) return null
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + rand(i + 3) * 0.8
        const rr = r * (0.75 + 0.35 * rand(i + 11))
        const phase = ((t - at) * 0.7 + i / n) % 1
        const k = Math.sin(phase * Math.PI)
        if (k <= 0.02) return null
        return (
          <g key={i} transform={`translate(${x + Math.cos(a) * rr} ${y + Math.sin(a) * rr}) scale(${k}) rotate(${phase * 90})`}>
            <path d={sparklePath(size)} fill={color} />
          </g>
        )
      })}
    </g>
  )
}

/**
 * A curved hop from `from` to `to` (the trail draws on behind it), with an
 * optional label over its peak ("+7"). Matches `arc()` from anim.ts.
 */
export function Hop({ t, at, from, to, lift = 70, color = M.ink, dur = 0.55, label, labelColor, width = 4, labelSize = 30 }: { t: number; at: number; from: [number, number]; to: [number, number]; lift?: number; color?: string; dur?: number; label?: string; labelColor?: string; width?: number; labelSize?: number }) {
  if (t < at) return null
  const cx = (from[0] + to[0]) / 2
  const cy = Math.min(from[1], to[1]) - lift
  const d = `M ${from[0]} ${from[1]} Q ${cx} ${cy} ${to[0]} ${to[1]}`
  const k = ease.inOutCubic(progress(t, at, dur))
  const peakY = (from[1] + 2 * cy + to[1]) / 4
  return (
    <g>
      <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={`${k} 1`} />
      {label && (
        <Pop t={t} at={at + dur * 0.5} x={cx} y={peakY - 24}>
          <Title x={cx} y={peakY - 24} size={labelSize} color={labelColor ?? color} stroke={M.white}>
            {label}
          </Title>
        </Pop>
      )}
    </g>
  )
}

/**
 * A number line: the base line draws on from `at`, then ticks and labels pop
 * in left→right. `labels` picks which values get a number (default: all);
 * `major` values get taller ticks and bigger numbers.
 */
export function NumberLine({ t, at, x0, x1, y, min, max, step = 1, labels, major = [], color = M.ink, size = 26, tickGap = 0.04 }: { t: number; at: number; x0: number; x1: number; y: number; min: number; max: number; step?: number; labels?: number[]; major?: number[]; color?: string; size?: number; tickGap?: number }) {
  const vals: number[] = []
  for (let v = min; v <= max + 1e-9; v += step) vals.push(Math.round(v * 1000) / 1000)
  const show = new Set(labels ?? vals)
  const big = new Set(major)
  return (
    <g>
      <Draw t={t} at={at} dur={0.6} d={`M ${x0 - 22} ${y} L ${x1 + 22} ${y}`} stroke={color} width={5} />
      {vals.map((v, i) => {
        const x = lineX(v, min, max, x0, x1)
        const k = spring(t, at + 0.3 + i * tickGap, { stiffness: 300, damping: 16 })
        if (k <= 0.001) return null
        const h = big.has(v) ? 17 : 10
        return (
          <g key={v} opacity={clamp(k * 2)}>
            <line x1={x} y1={y - h * k} x2={x} y2={y + h * k} stroke={color} strokeWidth={big.has(v) ? 5 : 3.5} strokeLinecap="round" />
            {show.has(v) && (
              <Title x={x} y={y + 24 + size * 0.5 + (1 - clamp(k)) * 10} size={big.has(v) ? size * 1.2 : size} color={color} stroke={M.paper}>
                {v}
              </Title>
            )}
          </g>
        )
      })}
    </g>
  )
}

/**
 * Text that flips (like a split-flap sign) from `from` to `to` at `at`:
 * squashes to nothing, swaps, springs back. Great for 2/5 → 4/10 style morphs.
 */
export function Flip({ t, at, x, y, from, to, size = 56, color = M.ink, toColor, stroke = M.white, dur = 0.42 }: { t: number; at: number; x: number; y: number; from: string; to: string; size?: number; color?: string; toColor?: string; stroke?: string; dur?: number }) {
  const k = progress(t, at, dur)
  const first = k < 0.5
  const sy = first ? 1 - ease.inQuad(k * 2) : spring(t, at + dur / 2, { stiffness: 320, damping: 14 })
  return (
    <g transform={`translate(${x} ${y}) scale(1 ${Math.max(0.001, sy)})`}>
      <Title x={0} y={0} size={size} color={first ? color : toColor ?? color} stroke={stroke}>
        {first ? from : to}
      </Title>
    </g>
  )
}

/** A soft glowing disc behind a focal object (draws the eye, breathes gently). */
export function Glow({ t, at, x, y, r = 80, color = M.gold, out, breathe = true }: { t: number; at: number; x: number; y: number; r?: number; color?: string; out?: number; breathe?: boolean }) {
  let k = ease.outCubic(progress(t, at, 0.5))
  if (out !== undefined) k *= 1 - progress(t, out, 0.4)
  if (k <= 0.001) return null
  const b = breathe ? 1 + 0.05 * Math.sin((t - at) * 2.4) : 1
  // A soft-edged gradient disc, not a blur filter: a blur on something that breathes is
  // re-blurred every frame, the costliest thing on a tablet's lesson stage.
  const id = `sq-glow-${color.replace(/[^a-z0-9]/gi, '')}`
  return (
    <>
      <defs>
        <radialGradient id={id}>
          <stop offset="0.7" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* (+8: the old blur's soft edge reached about this far past the disc) */}
      <circle cx={x} cy={y} r={r * k * b + 8} fill={`url(#${id})`} opacity={0.35 * k} />
    </>
  )
}

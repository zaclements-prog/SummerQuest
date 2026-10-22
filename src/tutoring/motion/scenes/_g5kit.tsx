import type { ReactNode } from 'react'
import { ease, progress, spring } from '../anim'
import { Title } from '../kit'
import { M } from '../palette'

/**
 * Small pieces shared by the grade-5 scenes (g5Reading, g5Writing,
 * g5Science): a card that springs in, a line of text that slides in, a tick.
 * 5th graders read, so these scenes carry short labels and sentences.
 */

/** A rounded card that springs in at `at` (and out at `out`). */
export function Panel({ t, at, x, y, w, h, fill = M.white, stroke = M.ink, out, children }: { t: number; at: number; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; out?: number; children?: ReactNode }) {
  let s = spring(t, at, { stiffness: 200, damping: 14 })
  if (out !== undefined) s *= 1 - ease.inOutCubic(progress(t, out, 0.3))
  if (s <= 0.001) return null
  const cx = x + w / 2
  const cy = y + h / 2
  return (
    <g transform={`translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`} opacity={Math.min(1, s * 2)}>
      <rect x={x} y={y} width={w} height={h} rx={22} fill={fill} stroke={stroke} strokeWidth={4} />
      {children}
    </g>
  )
}

/** A line of text that slides in from the left at `at`. */
export function Line({ t, at, x, y, text, size = 28, color = M.ink, anchor = 'start', weight = 700 }: { t: number; at: number; x: number; y: number; text: string; size?: number; color?: string; anchor?: 'start' | 'middle' | 'end'; weight?: number }) {
  const k = ease.outCubic(progress(t, at, 0.45))
  if (k <= 0) return null
  return (
    <g opacity={k} transform={`translate(${(1 - k) * -24} 0)`}>
      <Title x={x} y={y} size={size} color={color} anchor={anchor} weight={weight} stroke={M.white}>
        {text}
      </Title>
    </g>
  )
}

/** A green tick that draws on at `at`. */
export function TickMark({ t, at, x, y, s = 1 }: { t: number; at: number; x: number; y: number; s?: number }) {
  const k = ease.outCubic(progress(t, at, 0.35))
  if (k <= 0) return null
  return (
    <path
      d={`M ${x - 14 * s} ${y} L ${x - 3 * s} ${y + 12 * s} L ${x + 18 * s} ${y - 14 * s}`}
      fill="none"
      stroke={M.leaf}
      strokeWidth={8 * s}
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={1}
      strokeDasharray="1 1"
      strokeDashoffset={1 - k}
    />
  )
}

/** A soft highlighter swipe behind a line of text. */
export function Swipe({ t, at, x, y, w, h = 40, color = M.gold }: { t: number; at: number; x: number; y: number; w: number; h?: number; color?: string }) {
  const k = ease.outCubic(progress(t, at, 0.4))
  if (k <= 0) return null
  return <rect x={x} y={y - h / 2} width={w * k} height={h} rx={10} fill={color} opacity={0.5} />
}

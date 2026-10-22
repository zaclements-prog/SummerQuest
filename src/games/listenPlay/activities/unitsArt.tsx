import { M } from '../../../tutoring/motion/palette'
import type { UnitKind } from '../../../lib/providers/g1Measure'

/**
 * A unit to measure with (the `units` activity and the g1Measure lesson): a
 * paper clip or a connecting cube, lying from x to x + u, centred on y.
 */

const UNIT_COLORS = ['#f2766b', '#ffcf4d', '#74d3bd', '#8ab8ff', '#b79af0', '#8edb7c', '#ff9f80', '#f7a1c4']

export function UnitArt({ unit, x, y, u, i }: { unit: UnitKind; x: number; y: number; u: number; i: number }) {
  if (unit === 'cube') {
    const s = u - 2
    return (
      <g>
        <rect x={x + u * 0.33} y={y - s / 2 - u * 0.16} width={u * 0.34} height={u * 0.2} rx={3} fill={UNIT_COLORS[i % UNIT_COLORS.length]} stroke={M.ink} strokeWidth={2.5} />
        <rect x={x + 1} y={y - s / 2} width={s} height={s} rx={u * 0.12} fill={UNIT_COLORS[i % UNIT_COLORS.length]} stroke={M.ink} strokeWidth={3} />
      </g>
    )
  }
  const h = u * 0.42
  const r1 = h / 2
  const r2 = h / 2 - h * 0.2
  const d = `M ${x + u - u * 0.14} ${y - r1 + h * 0.12} H ${x + r1} A ${r1} ${r1} 0 0 0 ${x + r1} ${y + r1} H ${x + u - r2 - u * 0.06} A ${r2} ${r2} 0 0 0 ${x + u - r2 - u * 0.06} ${y - r1 + h * 0.4} H ${x + r1 + u * 0.14}`
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={M.ink} strokeWidth={Math.max(5, u * 0.12)} />
      <path d={d} stroke="#a9bddd" strokeWidth={Math.max(2.4, u * 0.055)} />
    </g>
  )
}

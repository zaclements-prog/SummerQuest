/**
 * Shared bar chart. Used BOTH by the Data & Graphing zone (kids read a graph to
 * answer a question) and by the Progress screen (kids/parents read graphs of
 * their OWN performance) — same visual language for learning and self-review.
 *
 * Deliberately plain SVG with NO Framer entrance animation, so the chart is
 * always visible (no rAF-gated fade in background/headless tabs).
 */

const PALETTE = ['#f7c102', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#2dd4bf', '#fb923c']

export interface Bar {
  label: string
  value: number
  color?: string
  /** Optional emoji shown under the label (e.g. a subject icon). */
  emoji?: string
}

export default function BarChart({
  bars,
  title,
  caption,
  height = 190,
  maxValue,
  formatValue,
}: {
  bars: Bar[]
  title?: string
  caption?: string
  height?: number
  maxValue?: number
  formatValue?: (v: number) => string
}) {
  const max = Math.max(maxValue ?? 0, ...bars.map((b) => b.value), 1)
  const W = 340
  const padX = 14
  const padTop = 22
  const padBottom = bars.some((b) => b.emoji) ? 50 : 38
  const chartH = height - padTop - padBottom
  const baseline = padTop + chartH
  const n = Math.max(bars.length, 1)
  const slot = (W - padX * 2) / n
  const barW = Math.min(46, slot * 0.62)

  return (
    <div className="bg-white text-ocean-900 rounded-3xl p-4 w-full">
      {title && <div className="kid-text text-lg mb-1 text-center">{title}</div>}
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" role="img" aria-label={title ?? 'bar chart'}>
        <line x1={padX} y1={baseline} x2={W - padX} y2={baseline} stroke="#cbd5e1" strokeWidth="2" />
        {bars.map((b, i) => {
          const h = max > 0 ? (b.value / max) * chartH : 0
          const x = padX + slot * i + (slot - barW) / 2
          const y = baseline - h
          const color = b.color ?? PALETTE[i % PALETTE.length]
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={Math.max(h, 1)} rx="4" fill={color} />
              <text
                x={x + barW / 2}
                y={y - 4}
                textAnchor="middle"
                fontSize="13"
                className="kid-text"
                fill="#1e3a8a"
              >
                {formatValue ? formatValue(b.value) : b.value}
              </text>
              <text x={x + barW / 2} y={baseline + 15} textAnchor="middle" fontSize="10.5" fill="#475569">
                {b.label}
              </text>
              {b.emoji && (
                <text x={x + barW / 2} y={baseline + 32} textAnchor="middle" fontSize="16">
                  {b.emoji}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      {caption && <div className="text-xs text-gray-500 text-center mt-1">{caption}</div>}
    </div>
  )
}

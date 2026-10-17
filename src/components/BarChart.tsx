/**
 * Shared bar chart. Used BOTH by the Data & Graphing zone (kids read a graph to
 * answer a question) and by the Progress screen (kids/parents read graphs of
 * their OWN performance) — same visual language for learning and self-review.
 *
 * Deliberately plain SVG with NO Framer entrance animation, so the chart is
 * always visible (no rAF-gated fade in background/headless tabs). Drawn in the
 * toon palette: pastel bars with the warm outline, on its own cream surface so
 * it reads the same wherever it is placed.
 */

import { TOON } from '../toon/palette'

const PALETTE = [TOON.gold, TOON.water, TOON.leafLight, TOON.flowerPurple, TOON.flowerRed, TOON.roofTeal, TOON.roofOrange]

// A bar labeled with a color name is painted that color (a "Blue" bar must look blue).
const NAMED: Record<string, string> = {
  blue: TOON.flowerBlue,
  red: TOON.flowerRed,
  green: TOON.leafLight,
  yellow: TOON.flowerYellow,
  purple: TOON.flowerPurple,
  orange: TOON.roofOrange,
  pink: TOON.flowerPink,
}

const INK = TOON.outline

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
  const padTop = 26
  const padBottom = bars.some((b) => b.emoji) ? 56 : 40
  const chartH = height - padTop - padBottom
  const baseline = padTop + chartH
  const n = Math.max(bars.length, 1)
  const slot = (W - padX * 2) / n
  const barW = Math.min(46, slot * 0.62)

  return (
    <div className="bg-cream-50 text-ink-900 rounded-[1.25rem] border-2 border-line/15 p-3 sm:p-4 w-full">
      {title && <div className="kid-text font-bold text-lg mb-1 text-center">{title}</div>}
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" role="img" aria-label={title ?? 'bar chart'}>
        {/* soft guide lines */}
        {[0.5, 1].map((f) => (
          <line
            key={f}
            x1={padX}
            y1={baseline - chartH * f}
            x2={W - padX}
            y2={baseline - chartH * f}
            stroke={INK}
            strokeOpacity={0.1}
            strokeWidth="1.5"
            strokeDasharray="4 5"
          />
        ))}
        {bars.map((b, i) => {
          const h = max > 0 ? (b.value / max) * chartH : 0
          const x = padX + slot * i + (slot - barW) / 2
          const y = baseline - h
          const color = b.color ?? NAMED[b.label.trim().toLowerCase()] ?? PALETTE[i % PALETTE.length]
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, 2)}
                rx="6"
                fill={color}
                stroke={INK}
                strokeWidth="2"
              />
              {h > 14 && (
                <rect x={x + 5} y={y + 4} width={Math.max(barW - 10, 2)} height={3} rx={1.5} fill="#fff" opacity={0.5} />
              )}
              <text
                x={x + barW / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize="16"
                fontWeight={700}
                fontFamily="Fredoka, system-ui, sans-serif"
                fill={INK}
              >
                {formatValue ? formatValue(b.value) : b.value}
              </text>
              <text
                x={x + barW / 2}
                y={baseline + 17}
                textAnchor="middle"
                fontSize="14"
                fontWeight={600}
                fontFamily="Fredoka, system-ui, sans-serif"
                fill="#5b4a57"
              >
                {b.label}
              </text>
              {b.emoji && (
                <text x={x + barW / 2} y={baseline + 38} textAnchor="middle" fontSize="17">
                  {b.emoji}
                </text>
              )}
            </g>
          )
        })}
        <line x1={padX} y1={baseline} x2={W - padX} y2={baseline} stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {caption && <div className="text-sm text-ink-700 text-center mt-1">{caption}</div>}
    </div>
  )
}

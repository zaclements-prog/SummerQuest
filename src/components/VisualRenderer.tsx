import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import type { ProblemVisual } from '../lib/problem'
import { TOON } from '../toon/palette'
import BarChart from './BarChart'

/**
 * Renders the topic-specific visualization that accompanies a problem.
 * Adding a new visual kind: handle it in the switch below; everything else stays the same.
 *
 * Every visual sits on its own cream, outlined toon surface and draws with the
 * warm ink, so it reads the same on the sky, inside a card or on a dark frame.
 */

const INK = TOON.outline
const SHADE = TOON.gold
const EMPTY = TOON.wallWarm

function Surface({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`bg-paper text-ink-900 rounded-[1.5rem] border-[3px] border-line shadow-card p-4 [text-shadow:none] ${className}`}
    >
      {children}
    </div>
  )
}
export default function VisualRenderer({
  visual,
  size = 'md',
}: {
  visual?: ProblemVisual
  size?: 'sm' | 'md' | 'lg'
}) {
  if (!visual || visual.kind === 'none') return null

  switch (visual.kind) {
    case 'array':
      return <ArrayVisual visual={visual} size={size} />
    case 'fraction':
      return <FractionVisual visual={visual} size={size} />
    case 'fractionCompare':
      return <FractionCompareVisual visual={visual} size={size} />
    case 'placeValueBlocks':
      return <PlaceValueBlocksVisual visual={visual} />
    case 'numberLine':
      return <NumberLineVisual visual={visual} />
    case 'wordProblem':
      return <WordProblemVisual visual={visual} />
    case 'passage':
      return <PassageVisual visual={visual} />
    case 'shape':
      return <ShapeVisual visual={visual} />
    case 'clock':
      return <ClockVisual visual={visual} />
    case 'money':
      return <MoneyVisual visual={visual} />
    case 'barGraph':
      return <BarGraphVisual visual={visual} />
    case 'fractionArea':
      return <FractionAreaVisual visual={visual} size={size} />
  }
}

/**
 * Grade 5's area model (5.NF.4): `a` shades columns (blue), `b` shades rows
 * (gold); the cells in both are the product, drawn darker and outlined.
 */
function FractionAreaVisual({
  visual,
  size,
}: {
  visual: Extract<ProblemVisual, { kind: 'fractionArea' }>
  size: 'sm' | 'md' | 'lg'
}) {
  const px = size === 'sm' ? 120 : size === 'md' ? 170 : 210
  const { a, b } = visual
  const cw = px / a.denominator
  const rh = px / b.denominator
  const cells = []
  for (let c = 0; c < a.denominator; c++) {
    for (let r = 0; r < b.denominator; r++) {
      const inA = c < a.numerator
      const inB = r < b.numerator
      cells.push(
        <rect
          key={`${c}-${r}`}
          x={2 + c * cw}
          y={2 + r * rh}
          width={cw}
          height={rh}
          fill={inA && inB ? TOON.flowerPurple : inA ? TOON.sky : inB ? SHADE : EMPTY}
          stroke={INK}
          strokeWidth={inA && inB ? 2.5 : 1.5}
        />,
      )
    }
  }
  return (
    <Surface className="inline-flex flex-col items-center">
      <svg width={px + 4} height={px + 4} role="img" aria-label={`${a.numerator}/${a.denominator} of the columns and ${b.numerator}/${b.denominator} of the rows`}>
        {cells}
        <rect x={2} y={2} width={px} height={px} fill="none" stroke={INK} strokeWidth={3.5} />
      </svg>
      <div className="kid-text font-bold text-xl mt-2 text-ink-900">
        {a.numerator}/{a.denominator} × {b.numerator}/{b.denominator}
      </div>
    </Surface>
  )
}

function BarGraphVisual({
  visual,
}: {
  visual: Extract<ProblemVisual, { kind: 'barGraph' }>
}) {
  return (
    <Surface className="w-full max-w-md !p-2.5">
      <BarChart
        title={visual.title}
        caption={visual.unit}
        bars={visual.bars}
      />
    </Surface>
  )
}

function ArrayVisual({
  visual,
  size,
}: {
  visual: Extract<ProblemVisual, { kind: 'array' }>
  size: 'sm' | 'md' | 'lg'
}) {
  const itemSize = size === 'sm' ? 18 : size === 'md' ? 28 : 36
  const fruit = visual.itemEmoji ?? '🍎'
  // Default caption names the array ("3 × 4"); providers can override it (e.g. division,
  // where "rows × cols" would print the quotient) or pass '' to hide it.
  const caption = visual.label ?? `${visual.rows} × ${visual.cols}`
  return (
    <Surface className="inline-block">
      {caption && <div className="text-center kid-text text-base mb-2 text-ink-700">{caption}</div>}
      <div className="flex flex-col gap-1 items-center">
        {Array.from({ length: visual.rows }).map((_, r) => (
          <div key={r} className="flex gap-1">
            {Array.from({ length: visual.cols }).map((_, c) => (
              <motion.div
                key={c}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: (r * visual.cols + c) * 0.03 }}
                style={{ fontSize: itemSize }}
              >
                {fruit}
              </motion.div>
            ))}
          </div>
        ))}
      </div>
    </Surface>
  )
}

function FractionVisual({
  visual,
  size,
}: {
  visual: Extract<ProblemVisual, { kind: 'fraction' }>
  size: 'sm' | 'md' | 'lg'
}) {
  const px = size === 'sm' ? 90 : size === 'md' ? 140 : 180
  const shape = visual.shape ?? 'circle'
  return (
    <Surface className="inline-flex flex-col items-center">
      <FractionShape
        numerator={visual.numerator}
        denominator={visual.denominator}
        size={px}
        shape={shape}
      />
      <div className="kid-text font-bold text-2xl mt-2 text-ink-900">
        {visual.numerator}/{visual.denominator}
      </div>
    </Surface>
  )
}

function FractionCompareVisual({
  visual,
  size,
}: {
  visual: Extract<ProblemVisual, { kind: 'fractionCompare' }>
  size: 'sm' | 'md' | 'lg'
}) {
  const px = size === 'sm' ? 80 : 120
  return (
    <Surface className="flex gap-6 items-center">
      <div className="flex flex-col items-center">
        <FractionShape
          numerator={visual.a.numerator}
          denominator={visual.a.denominator}
          size={px}
          shape="rect"
        />
        <div className="kid-text font-bold text-xl mt-1 text-ink-900">
          {visual.a.numerator}/{visual.a.denominator}
        </div>
      </div>
      <div className="kid-text font-bold text-3xl text-ink-700">?</div>
      <div className="flex flex-col items-center">
        <FractionShape
          numerator={visual.b.numerator}
          denominator={visual.b.denominator}
          size={px}
          shape="rect"
        />
        <div className="kid-text font-bold text-xl mt-1 text-ink-900">
          {visual.b.numerator}/{visual.b.denominator}
        </div>
      </div>
    </Surface>
  )
}

function FractionShape({
  numerator,
  denominator,
  size,
  shape,
}: {
  numerator: number
  denominator: number
  size: number
  shape: 'circle' | 'rect' | 'bar'
}) {
  if (shape === 'circle') {
    const r = size / 2 - 2
    const cx = size / 2
    const cy = size / 2
    return (
      <svg width={size} height={size}>
        {Array.from({ length: denominator }).map((_, i) => {
          const startAngle = (i / denominator) * 2 * Math.PI - Math.PI / 2
          const endAngle = ((i + 1) / denominator) * 2 * Math.PI - Math.PI / 2
          const x1 = cx + r * Math.cos(startAngle)
          const y1 = cy + r * Math.sin(startAngle)
          const x2 = cx + r * Math.cos(endAngle)
          const y2 = cy + r * Math.sin(endAngle)
          const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
          const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
          return (
            <path
              key={i}
              d={d}
              fill={i < numerator ? SHADE : EMPTY}
              stroke={INK}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          )
        })}
      </svg>
    )
  }
  // rect: the whole is always the same size (size × size), cut into `denominator`
  // equal horizontal strips — so 1/2 and 2/4 shade exactly the same area.
  const w = size
  const total = size
  const h = total / denominator
  return (
    <svg width={w} height={total}>
      {Array.from({ length: denominator }).map((_, i) => (
        <rect
          key={i}
          x="1"
          y={i * h + 1}
          width={w - 2}
          height={Math.max(1, h - 2)}
          rx="3"
          fill={i < numerator ? SHADE : EMPTY}
          stroke={INK}
          strokeWidth="2.5"
        />
      ))}
    </svg>
  )
}

function PlaceValueBlocksVisual({
  visual,
}: {
  visual: Extract<ProblemVisual, { kind: 'placeValueBlocks' }>
}) {
  // each "place" stack of unit cubes
  return (
    <Surface className="flex gap-5 items-end">
      {visual.thousands > 0 && (
        <BlockStack count={visual.thousands} unit="1000" color={TOON.flowerPurple} />
      )}
      {visual.hundreds > 0 && (
        <BlockStack count={visual.hundreds} unit="100" color={TOON.water} />
      )}
      {visual.tens > 0 && <BlockStack count={visual.tens} unit="10" color={TOON.leafLight} />}
      {visual.ones > 0 && <BlockStack count={visual.ones} unit="1" color={TOON.roofOrange} />}
    </Surface>
  )
}

function BlockStack({
  count,
  unit,
  color,
}: {
  count: number
  unit: string
  color: string
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="grid grid-cols-2 gap-0.5">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-[4px] border-2 border-line"
            style={{ background: color }}
          />
        ))}
      </div>
      <div className="kid-text text-sm text-ink-700 mt-1">×{unit}</div>
    </div>
  )
}

function NumberLineVisual({
  visual,
}: {
  visual: Extract<ProblemVisual, { kind: 'numberLine' }>
}) {
  const w = 320
  const h = 60
  const range = visual.max - visual.min
  return (
    <Surface className="inline-block !p-3">
    <svg width={w} height={h}>
      <line x1="10" y1={h - 20} x2={w - 10} y2={h - 20} stroke={INK} strokeWidth="3" strokeLinecap="round" />
      {visual.markers.map((m) => {
        const x = 10 + ((m - visual.min) / range) * (w - 20)
        return (
          <g key={m}>
            <line x1={x} y1={h - 26} x2={x} y2={h - 14} stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
            <text
              x={x}
              y={h - 2}
              textAnchor="middle"
              fontSize="13"
              fontWeight={600}
              fill={INK}
              className="kid-text"
            >
              {m}
            </text>
          </g>
        )
      })}
      {visual.target !== undefined && (
        <circle
          cx={10 + ((visual.target - visual.min) / range) * (w - 20)}
          cy={h - 20}
          r="7"
          fill={SHADE}
          stroke={INK}
          strokeWidth="2.5"
        />
      )}
    </svg>
    </Surface>
  )
}

function WordProblemVisual({
  visual,
}: {
  visual: Extract<ProblemVisual, { kind: 'wordProblem' }>
}) {
  return (
    <Surface className="max-w-xl !p-5">
      <div className="kid-text text-sm uppercase tracking-wide text-ink-700 mb-1">
        Word Problem
      </div>
      <p className="text-lg leading-relaxed whitespace-pre-line">{visual.text}</p>
    </Surface>
  )
}

function PassageVisual({
  visual,
}: {
  visual: Extract<ProblemVisual, { kind: 'passage' }>
}) {
  return (
    <Surface className="max-w-2xl !p-5 sm:!p-6">
      <div className="kid-text font-bold text-2xl mb-2 text-ocean-800">{visual.passageTitle}</div>
      <p className="text-lg leading-relaxed mb-3">{visual.passageText}</p>
      <div className="border-t-2 border-line/15 pt-3 kid-text text-xl text-ink-900">{visual.question}</div>
    </Surface>
  )
}

function ShapeVisual({
  visual,
}: {
  visual: Extract<ProblemVisual, { kind: 'shape' }>
}) {
  const scale = Math.min(20, 200 / Math.max(visual.width, visual.height))
  const w = visual.width * scale
  const h = visual.height * scale
  return (
    <Surface className="inline-flex flex-col items-center">
      <svg width={Math.max(w + 60, 120)} height={Math.max(h + 60, 120)}>
        <rect
          x="30"
          y="30"
          width={w}
          height={h}
          rx="3"
          fill={SHADE}
          stroke={INK}
          strokeWidth="2.5"
        />
        <text
          x={30 + w / 2}
          y={20}
          textAnchor="middle"
          fontSize="14"
          fontWeight={600}
          fill={INK}
          className="kid-text"
        >
          {visual.width} {visual.unit ?? 'units'}
        </text>
        <text
          x={15}
          y={30 + h / 2}
          textAnchor="middle"
          fontSize="14"
          fontWeight={600}
          fill={INK}
          className="kid-text"
          transform={`rotate(-90 15 ${30 + h / 2})`}
        >
          {visual.height} {visual.unit ?? 'units'}
        </text>
      </svg>
    </Surface>
  )
}

function ClockVisual({
  visual,
}: {
  visual: Extract<ProblemVisual, { kind: 'clock' }>
}) {
  const cx = 60
  const cy = 60
  const r = 50
  const hourAngle = ((visual.hour % 12) + visual.minute / 60) * 30 - 90
  const minuteAngle = visual.minute * 6 - 90
  const rad = (deg: number) => (deg * Math.PI) / 180
  return (
    <div className="inline-block bg-paper rounded-full p-2 border-[3px] border-line shadow-card">
      <svg width={120} height={120}>
        <circle cx={cx} cy={cy} r={r} fill={TOON.flowerWhite} stroke={INK} strokeWidth="3" />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = i * 30 - 90
          return (
            <text
              key={i}
              x={cx + (r - 12) * Math.cos(rad(a))}
              y={cy + (r - 12) * Math.sin(rad(a)) + 5}
              textAnchor="middle"
              fontSize="12"
              fontWeight={600}
              fill={INK}
              className="kid-text"
            >
              {i === 0 ? 12 : i}
            </text>
          )
        })}
        <line
          x1={cx}
          y1={cy}
          x2={cx + (r - 22) * Math.cos(rad(hourAngle))}
          y2={cy + (r - 22) * Math.sin(rad(hourAngle))}
          stroke={INK}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <line
          x1={cx}
          y1={cy}
          x2={cx + (r - 8) * Math.cos(rad(minuteAngle))}
          y2={cy + (r - 8) * Math.sin(rad(minuteAngle))}
          stroke={TOON.flowerRed}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="3.5" fill={INK} />
      </svg>
    </div>
  )
}

function MoneyVisual({
  visual,
}: {
  visual: Extract<ProblemVisual, { kind: 'money' }>
}) {
  const dollars = Math.floor(visual.cents / 100)
  const cents = visual.cents % 100
  return (
    <Surface className="kid-text font-bold text-3xl">
      💰 ${dollars}.{String(cents).padStart(2, '0')}
    </Surface>
  )
}

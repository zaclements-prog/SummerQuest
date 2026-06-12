import { motion } from 'framer-motion'
import type { ProblemVisual } from '../lib/problem'
import BarChart from './BarChart'

/**
 * Renders the topic-specific visualization that accompanies a problem.
 * Adding a new visual kind: handle it in the switch below; everything else stays the same.
 */
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
  }
}

function BarGraphVisual({
  visual,
}: {
  visual: Extract<ProblemVisual, { kind: 'barGraph' }>
}) {
  return (
    <div className="w-full max-w-md">
      <BarChart
        title={visual.title}
        caption={visual.unit}
        bars={visual.bars}
      />
    </div>
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
  return (
    <div className="bg-white/15 rounded-3xl p-4 inline-block">
      <div className="text-center kid-text text-sm mb-2 opacity-80">
        {visual.rows} × {visual.cols}
      </div>
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
    </div>
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
    <div className="inline-flex flex-col items-center bg-white/15 rounded-3xl p-4">
      <FractionShape
        numerator={visual.numerator}
        denominator={visual.denominator}
        size={px}
        shape={shape}
      />
      <div className="kid-text text-2xl mt-2 text-white">
        {visual.numerator}/{visual.denominator}
      </div>
    </div>
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
    <div className="flex gap-6 items-center bg-white/15 rounded-3xl p-4">
      <div className="flex flex-col items-center">
        <FractionShape
          numerator={visual.a.numerator}
          denominator={visual.a.denominator}
          size={px}
          shape="rect"
        />
        <div className="kid-text text-xl mt-1 text-white">
          {visual.a.numerator}/{visual.a.denominator}
        </div>
      </div>
      <div className="kid-text text-3xl text-white">?</div>
      <div className="flex flex-col items-center">
        <FractionShape
          numerator={visual.b.numerator}
          denominator={visual.b.denominator}
          size={px}
          shape="rect"
        />
        <div className="kid-text text-xl mt-1 text-white">
          {visual.b.numerator}/{visual.b.denominator}
        </div>
      </div>
    </div>
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
              fill={i < numerator ? '#fbbf24' : 'rgba(255,255,255,0.25)'}
              stroke="white"
              strokeWidth="2"
            />
          )
        })}
      </svg>
    )
  }
  // rect: horizontal stacked bars
  const w = size
  const h = Math.max(20, size / Math.max(denominator, 4))
  return (
    <svg width={w} height={h * denominator}>
      {Array.from({ length: denominator }).map((_, i) => (
        <rect
          key={i}
          x="0"
          y={i * h}
          width={w}
          height={h - 2}
          fill={i < numerator ? '#fbbf24' : 'rgba(255,255,255,0.25)'}
          stroke="white"
          strokeWidth="2"
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
    <div className="flex gap-4 items-end bg-white/15 rounded-3xl p-4">
      {visual.thousands > 0 && (
        <BlockStack count={visual.thousands} unit="1000" color="#8b5cf6" />
      )}
      {visual.hundreds > 0 && (
        <BlockStack count={visual.hundreds} unit="100" color="#3b82f6" />
      )}
      {visual.tens > 0 && <BlockStack count={visual.tens} unit="10" color="#10b981" />}
      {visual.ones > 0 && <BlockStack count={visual.ones} unit="1" color="#f97316" />}
    </div>
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
            className="w-4 h-4 rounded"
            style={{ background: color, opacity: 0.85 }}
          />
        ))}
      </div>
      <div className="kid-text text-xs text-white mt-1">×{unit}</div>
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
    <svg width={w} height={h} className="bg-white/15 rounded-2xl p-2">
      <line x1="10" y1={h - 20} x2={w - 10} y2={h - 20} stroke="white" strokeWidth="3" />
      {visual.markers.map((m) => {
        const x = 10 + ((m - visual.min) / range) * (w - 20)
        return (
          <g key={m}>
            <line x1={x} y1={h - 26} x2={x} y2={h - 14} stroke="white" strokeWidth="2" />
            <text
              x={x}
              y={h - 2}
              textAnchor="middle"
              fontSize="12"
              fill="white"
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
          r="6"
          fill="#fbbf24"
          stroke="white"
          strokeWidth="2"
        />
      )}
    </svg>
  )
}

function WordProblemVisual({
  visual,
}: {
  visual: Extract<ProblemVisual, { kind: 'wordProblem' }>
}) {
  return (
    <div className="bg-white text-ocean-900 rounded-3xl p-5 max-w-xl">
      <div className="kid-text text-sm uppercase tracking-wide text-gray-500 mb-1">
        Word Problem
      </div>
      <p className="text-lg leading-relaxed whitespace-pre-line">{visual.text}</p>
    </div>
  )
}

function PassageVisual({
  visual,
}: {
  visual: Extract<ProblemVisual, { kind: 'passage' }>
}) {
  return (
    <div className="bg-white text-ocean-900 rounded-3xl p-5 max-w-2xl">
      <div className="kid-text text-2xl mb-2 text-ocean-700">{visual.passageTitle}</div>
      <p className="text-base leading-relaxed mb-3">{visual.passageText}</p>
      <div className="border-t pt-3 kid-text text-lg text-ocean-900">{visual.question}</div>
    </div>
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
    <div className="inline-flex flex-col items-center bg-white/15 rounded-3xl p-4">
      <svg width={Math.max(w + 60, 120)} height={Math.max(h + 60, 120)}>
        <rect
          x="30"
          y="30"
          width={w}
          height={h}
          fill="#fbbf24"
          stroke="white"
          strokeWidth="2"
        />
        <text
          x={30 + w / 2}
          y={20}
          textAnchor="middle"
          fontSize="14"
          fill="white"
          className="kid-text"
        >
          {visual.width} {visual.unit ?? 'units'}
        </text>
        <text
          x={15}
          y={30 + h / 2}
          textAnchor="middle"
          fontSize="14"
          fill="white"
          className="kid-text"
          transform={`rotate(-90 15 ${30 + h / 2})`}
        >
          {visual.height} {visual.unit ?? 'units'}
        </text>
      </svg>
    </div>
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
    <div className="inline-block bg-white rounded-full p-2">
      <svg width={120} height={120}>
        <circle cx={cx} cy={cy} r={r} fill="white" stroke="#1e3a8a" strokeWidth="3" />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = i * 30 - 90
          return (
            <text
              key={i}
              x={cx + (r - 12) * Math.cos(rad(a))}
              y={cy + (r - 12) * Math.sin(rad(a)) + 5}
              textAnchor="middle"
              fontSize="12"
              fill="#1e3a8a"
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
          stroke="#1e3a8a"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <line
          x1={cx}
          y1={cy}
          x2={cx + (r - 8) * Math.cos(rad(minuteAngle))}
          y2={cy + (r - 8) * Math.sin(rad(minuteAngle))}
          stroke="#dc2626"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="3" fill="#1e3a8a" />
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
    <div className="bg-white/15 rounded-3xl p-4 kid-text text-3xl text-white">
      💰 ${dollars}.{String(cents).padStart(2, '0')}
    </div>
  )
}

import type { ReactNode } from 'react'
import { M } from '../../motion/palette'

/**
 * Lesson-picker posters for 5th grade's Measurement Marsh, Geometry Grove and
 * Data Delta lessons (the `{ bg, motif }` shape of LessonPoster's POSTERS, on
 * its 320 × 150 card).
 */

const C = Math.cos(Math.PI / 6)
const iso = (x: number, y: number, z: number, u = 22, ox = 150, oy = 64): [number, number] => [ox + (x - y) * C * u, oy + (x + y) * 0.5 * u - z * u]
const pts = (ps: [number, number][]) => ps.map((p) => p.join(',')).join(' ')

function cube(x: number, y: number, z: number) {
  return (
    <g key={`${x}${y}${z}`} stroke={M.ink} strokeWidth={2.5} strokeLinejoin="round">
      <polygon points={pts([iso(x, y, z + 1), iso(x + 1, y, z + 1), iso(x + 1, y + 1, z + 1), iso(x, y + 1, z + 1)])} fill="#ffe69a" />
      <polygon points={pts([iso(x, y + 1, z), iso(x + 1, y + 1, z), iso(x + 1, y + 1, z + 1), iso(x, y + 1, z + 1)])} fill="#f5c24a" />
      <polygon points={pts([iso(x + 1, y, z), iso(x + 1, y + 1, z), iso(x + 1, y + 1, z + 1), iso(x + 1, y, z + 1)])} fill="#e8a93a" />
    </g>
  )
}

export const G5_MGD_POSTERS: Record<string, { bg: string; motif: () => ReactNode }> = {
  g5Volume: {
    bg: '#fff1c7',
    motif: () => {
      // a 3 × 2 × 2 stack of unit cubes, back to front
      const cells: [number, number, number][] = []
      for (let z = 0; z < 2; z++) for (let y = 0; y < 2; y++) for (let x = 0; x < 3; x++) cells.push([x, y, z])
      cells.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]))
      return (
        <g>
          {cells.map(([x, y, z]) => cube(x, y, z))}
          <text x={258} y={92} fontFamily={M.font} fontWeight={700} fontSize={30} textAnchor="middle" fill="#c98a00">
            12
          </text>
        </g>
      )
    },
  },
  g5Coordinates: {
    bg: '#e3f6ea',
    motif: () => (
      <g>
        <rect x={96} y={22} width={120} height={110} fill="#ffffff" />
        {Array.from({ length: 7 }, (_, i) => (
          <g key={i}>
            <line x1={96 + i * 20} y1={22} x2={96 + i * 20} y2={132} stroke={M.sea} strokeOpacity={0.35} strokeWidth={1.5} />
            <line x1={96} y1={132 - i * 18.3} x2={216} y2={132 - i * 18.3} stroke={M.sea} strokeOpacity={0.35} strokeWidth={1.5} />
          </g>
        ))}
        <path d="M 96 136 L 96 14 M 92 132 L 226 132" stroke={M.ink} strokeWidth={4} strokeLinecap="round" />
        <path d="M 96 132 L 156 132 L 156 59" fill="none" stroke={M.coral} strokeWidth={3.5} strokeDasharray="7 6" strokeLinecap="round" />
        <circle cx={156} cy={59} r={8} fill={M.coral} stroke={M.ink} strokeWidth={3} />
        <text x={250} y={70} fontFamily={M.font} fontWeight={700} fontSize={24} textAnchor="middle" fill="#2a86b8">
          (3, 4)
        </text>
      </g>
    ),
  },
  g5LinePlots: {
    bg: '#efe6ff',
    motif: () => (
      <g>
        <line x1={56} y1={112} x2={264} y2={112} stroke={M.ink} strokeWidth={4} strokeLinecap="round" />
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} x1={70 + i * 45} y1={104} x2={70 + i * 45} y2={120} stroke={M.ink} strokeWidth={3} strokeLinecap="round" />
        ))}
        {[1, 3, 2, 1].map((n, i) =>
          Array.from({ length: n }, (_, k) => {
            const x = 115 + i * 45
            const y = 92 - k * 22
            return <path key={`${i}${k}`} d={`M ${x - 8} ${y - 8} L ${x + 8} ${y + 8} M ${x + 8} ${y - 8} L ${x - 8} ${y + 8}`} stroke="#8559cf" strokeWidth={4.5} strokeLinecap="round" />
          }),
        )}
        <text x={70} y={140} fontFamily={M.font} fontWeight={700} fontSize={16} textAnchor="middle" fill={M.ink}>
          0
        </text>
        <text x={250} y={140} fontFamily={M.font} fontWeight={700} fontSize={16} textAnchor="middle" fill={M.ink}>
          1
        </text>
      </g>
    ),
  },
}

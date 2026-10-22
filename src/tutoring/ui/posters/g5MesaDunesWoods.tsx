/* eslint-disable react-refresh/only-export-components -- a poster registry (data), like LessonPoster's POSTERS; not an HMR boundary */
import type { ReactNode } from 'react'
import { M } from '../../motion/palette'

/**
 * Lesson posters for 5th grade's Multiplication Mesa, Division Dunes and Word
 * Problem Woods lessons, the same `{ bg, motif }` shape as LessonPoster's
 * POSTERS (spread into it there). Drawn in the poster's 320 × 150 box.
 */

const T = ({ x, y, size, fill = M.ink, children }: { x: number; y: number; size: number; fill?: string; children: ReactNode }) => (
  <text x={x} y={y} fontFamily={M.font} fontWeight={700} fontSize={size} textAnchor="middle" fill={fill}>
    {children}
  </text>
)

export const G5_MESA_DUNES_WOODS_POSTERS: Record<string, { bg: string; motif: () => ReactNode }> = {
  g5Multiplication: {
    bg: '#ffe9c8',
    motif: () => (
      <g strokeLinejoin="round">
        {/* the 23 × 14 area model */}
        <rect x={110} y={34} width={110} height={70} rx={8} fill="#ffe3a6" stroke={M.ink} strokeWidth={3} />
        <rect x={220} y={34} width={56} height={70} rx={8} fill="#ffe3a6" stroke={M.ink} strokeWidth={3} />
        <rect x={110} y={104} width={110} height={36} rx={8} fill="#cdeccf" stroke={M.ink} strokeWidth={3} />
        <rect x={220} y={104} width={56} height={36} rx={8} fill="#cdeccf" stroke={M.ink} strokeWidth={3} />
        <T x={165} y={78} size={24}>200</T>
        <T x={248} y={78} size={20}>80</T>
        <T x={165} y={130} size={20}>30</T>
        <T x={248} y={130} size={18}>12</T>
        <T x={92} y={78} size={20} fill="#e0564a">20</T>
        <T x={96} y={130} size={20} fill="#e0564a">3</T>
        <T x={165} y={26} size={20} fill="#3f6fd1">10</T>
        <T x={248} y={26} size={20} fill="#3f6fd1">4</T>
        <T x={50} y={92} size={24}>23×14</T>
      </g>
    ),
  },
  g5Division: {
    bg: '#dff0ff',
    motif: () => (
      <g>
        {/* long division: 672 ÷ 28 = 24 */}
        <T x={178} y={44} size={30}>24</T>
        <path d="M 130 116 Q 144 84 130 54 H 212" fill="none" stroke={M.ink} strokeWidth={5} strokeLinecap="round" />
        <T x={102} y={92} size={30} fill="#3f6fd1">28</T>
        <T x={172} y={92} size={30}>672</T>
        <T x={164} y={126} size={22} fill="#e0564a">−56</T>
        <rect x={232} y={66} width={62} height={38} rx={10} fill="#ffd36b" stroke={M.ink} strokeWidth={3} />
        <circle cx={246} cy={108} r={7} fill={M.ink} />
        <circle cx={280} cy={108} r={7} fill={M.ink} />
        <T x={263} y={92} size={18}>R 13</T>
      </g>
    ),
  },
  g5Expressions: {
    bg: '#e3f4dc',
    motif: () => (
      <g>
        <T x={160} y={70} size={40}>
          <tspan fill="#8559cf">[</tspan>2 × <tspan fill="#8559cf">(</tspan>8 + 7<tspan fill="#8559cf">)</tspan>
          <tspan fill="#8559cf">]</tspan>
        </T>
        {[0, 3, 6, 9].map((v, i) => (
          <g key={i}>
            <circle cx={88 + i * 48} cy={112} r={16} fill="#ffe3dc" stroke="#e0564a" strokeWidth={3} />
            <T x={88 + i * 48} y={119} size={18}>{v}</T>
          </g>
        ))}
        <T x={286} y={120} size={22} fill="#3c9446">×2</T>
      </g>
    ),
  },
}

import type { ReactNode } from 'react'
import { M } from '../../motion/palette'

/**
 * Lesson posters for the grade-5 Reading Reef, Writing Workshop and Science
 * Summit lessons (same `{ bg, motif }` shape as LessonPoster's POSTERS, spread
 * into it): a magnifier over a page, a speech bubble with a pencil, and the
 * four spheres.
 */
export const G5_REEF_WORKSHOP_SUMMIT_POSTERS: Record<string, { bg: string; motif: () => ReactNode }> = {
  g5Reading: {
    bg: '#d6f0fb',
    motif: () => (
      <g>
        <rect x={86} y={30} width={150} height={100} rx={8} fill="#ffffff" stroke={M.ink} strokeWidth={3.5} />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={102} y={46 + i * 16} width={i === 4 ? 70 : 118} height={7} rx={3.5} fill={i === 2 ? M.gold : '#c7d3dc'} />
        ))}
        <circle cx={226} cy={82} r={32} fill="#ffffff" fillOpacity={0.5} stroke={M.ink} strokeWidth={6} />
        <path d="M 249 105 L 276 132" stroke={M.wood} strokeWidth={12} strokeLinecap="round" />
      </g>
    ),
  },
  g5Writing: {
    bg: '#e4f0ff',
    motif: () => (
      <g>
        <path d="M 74 34 H 226 Q 244 34 244 52 V 92 Q 244 110 226 110 H 124 L 98 130 L 104 110 H 74 Q 56 110 56 92 V 52 Q 56 34 74 34 Z" fill="#ffffff" stroke={M.ink} strokeWidth={3.5} />
        <text x={150} y={72} fontFamily={M.font} fontWeight={700} fontSize={30} textAnchor="middle" dominantBaseline="middle" fill={M.ink}>
          “Hello,”
        </text>
        <g transform="rotate(-35 262 84)">
          <rect x={248} y={30} width={26} height={98} rx={4} fill="#ffcf4d" stroke={M.ink} strokeWidth={3} />
          <path d="M 248 128 L 261 150 L 274 128 Z" fill="#f6d7b0" stroke={M.ink} strokeWidth={3} />
        </g>
      </g>
    ),
  },
  g5Science: {
    bg: '#e8f6e0',
    motif: () => (
      <g>
        {[
          { x: 70, c: '#f2d6a8', e: '⛰️' },
          { x: 130, c: '#cfeaff', e: '🌊' },
          { x: 190, c: '#ffffff', e: '☁️' },
          { x: 250, c: '#d9f2c9', e: '🌳' },
        ].map((s) => (
          <g key={s.x}>
            <circle cx={s.x} cy={80} r={28} fill={s.c} stroke={M.ink} strokeWidth={3} />
            <text x={s.x} y={82} fontSize={30} textAnchor="middle" dominantBaseline="central">
              {s.e}
            </text>
          </g>
        ))}
      </g>
    ),
  },
}

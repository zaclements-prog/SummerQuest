import type { ReactNode } from 'react'
import { M } from '../../motion/palette'

/**
 * Lesson-picker posters for 5th grade's Fraction Falls (g5Fractions) and Place
 * Value Plateau (g5Decimals): the same { bg, motif } shape as LessonPoster's
 * POSTERS, drawn on its 320 × 150 card.
 */
export const G5_FALLS_PLATEAU_POSTERS: Record<string, { bg: string; motif: () => ReactNode }> = {
  g5Fractions: {
    bg: '#dff3ea',
    motif: () => (
      <g>
        {/* the area model: 3/4 of the columns (mint) × 2/3 of the rows (coral), the overlap lilac */}
        {Array.from({ length: 4 }, (_, c) =>
          Array.from({ length: 3 }, (_, r) => {
            const a = c < 3
            const b = r < 2
            return (
              <rect
                key={`${c}${r}`}
                x={70 + c * 26}
                y={30 + r * 30}
                width={26}
                height={30}
                fill={a && b ? M.lilac : a ? M.mint : b ? '#ffc2b8' : M.white}
                stroke={M.ink}
                strokeWidth={2}
              />
            )
          }),
        )}
        <rect x={70} y={30} width={104} height={90} fill="none" stroke={M.ink} strokeWidth={3.5} />
        {/* 1/2 + 1/3 as bars cut into sixths */}
        <rect x={196} y={36} width={84} height={22} rx={5} fill={M.white} stroke={M.ink} strokeWidth={2.5} />
        <rect x={198} y={38} width={40} height={18} rx={4} fill={M.mint} />
        <rect x={196} y={66} width={84} height={22} rx={5} fill={M.white} stroke={M.ink} strokeWidth={2.5} />
        <rect x={198} y={68} width={26} height={18} rx={4} fill={M.coral} />
        <rect x={196} y={96} width={84} height={22} rx={5} fill={M.white} stroke={M.ink} strokeWidth={2.5} />
        {Array.from({ length: 5 }, (_, i) => (
          <rect key={i} x={198 + i * 14} y={98} width={12} height={18} rx={3} fill={i < 3 ? M.mint : M.coral} />
        ))}
      </g>
    ),
  },
  g5Decimals: {
    bg: '#e9e4ff',
    motif: () => (
      <g>
        {[
          ['3', '#3f6fd1'],
          ['4', '#2a9b75'],
          ['7', '#c98a00'],
          ['2', '#8559cf'],
        ].map(([d, c], i) => (
          <g key={i}>
            <rect x={62 + i * 52 + (i > 0 ? 18 : 0)} y={36} width={46} height={80} rx={10} fill={['#d6e6ff', '#d7f5e8', '#fff0c2', '#ebe2ff'][i]} />
            <text x={85 + i * 52 + (i > 0 ? 18 : 0)} y={96} fontFamily={M.font} fontWeight={700} fontSize={54} textAnchor="middle" fill={c} stroke={M.white} strokeWidth={3} paintOrder="stroke">
              {d}
            </text>
          </g>
        ))}
        <circle cx={120} cy={96} r={7} fill={M.coral} stroke={M.ink} strokeWidth={2} />
        <text x={292} y={84} fontFamily={M.font} fontWeight={700} fontSize={30} textAnchor="middle" fill="#8559cf">
          ×10
        </text>
      </g>
    ),
  },
}

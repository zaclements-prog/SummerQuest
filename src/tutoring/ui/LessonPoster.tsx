import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { slicePath } from '../motion/anim'
import { PV, starPath } from '../motion/layout'
import { M } from '../motion/palette'
import { Apple, Cookie, Flat, Rod, UnitCube } from '../motion/shapes'

const PW = 320
const PH = 150

/** Poster background + motif per lesson (flat vector, the lesson stage's look). */
const POSTERS: Record<string, { bg: string; motif: () => ReactNode }> = {
  fractions: {
    bg: '#ffe7c2',
    motif: () => (
      <g>
        {[0, 1, 2, 3].map((i) => {
          const a0 = (i / 4) * Math.PI * 2
          const a1 = ((i + 1) / 4) * Math.PI * 2
          const lift = i === 0 ? 14 : 0
          return (
            <g key={i} transform={`translate(${lift} ${-lift})`}>
              <path d={slicePath(160, 80, 54, a0, a1)} fill="#f2b866" stroke={M.ink} strokeWidth={3.5} strokeLinejoin="round" />
              <path d={slicePath(160, 80, 46, a0, a1)} fill={i === 0 ? '#ffe9a8' : '#ffd96a'} />
            </g>
          )
        })}
        {[
          [182, 52],
          [140, 64],
          [176, 104],
          [134, 100],
        ].map(([x, y], i) => (
          <circle key={i} cx={x + (i === 0 ? 14 : 0)} cy={y - (i === 0 ? 14 : 0)} r={6} fill={M.coral} stroke={M.ink} strokeWidth={2} />
        ))}
        <text x={262} y={70} fontFamily={M.font} fontWeight={700} fontSize={34} textAnchor="middle" fill="#c98a00">
          1
        </text>
        <rect x={246} y={80} width={32} height={5} rx={2.5} fill={M.ink} />
        <text x={262} y={112} fontFamily={M.font} fontWeight={700} fontSize={34} textAnchor="middle" fill={M.ink}>
          4
        </text>
      </g>
    ),
  },
  multiplication: {
    bg: '#ffe0dc',
    motif: () => (
      <g>
        {[0, 1, 2].map((r) =>
          [0, 1, 2, 3].map((c) => <Apple key={`${r}${c}`} x={98 + c * 42} y={40 + r * 38} r={14} color={['#f2766b', '#ffcf4d', '#7fd36b'][r]} />),
        )}
        <text x={276} y={92} fontFamily={M.font} fontWeight={700} fontSize={52} textAnchor="middle" fill="#d4558f">
          ×
        </text>
      </g>
    ),
  },
  division: {
    bg: '#dff0ff',
    motif: () => (
      <g>
        {[70, 160, 250].map((x, f) => (
          <g key={x}>
            <ellipse cx={x} cy={112} rx={38} ry={11} fill="#fff" stroke={M.ink} strokeWidth={3} />
            {[0, 1].map((k) => (
              <Cookie key={k} x={x - 12 + k * 24} y={100 - (k % 2) * 4} r={12} rot={f * 60 + k * 90} />
            ))}
          </g>
        ))}
        <text x={160} y={58} fontFamily={M.font} fontWeight={700} fontSize={50} textAnchor="middle" fill="#3f6fd1">
          ÷
        </text>
      </g>
    ),
  },
  placeValue: {
    bg: '#e8f3ff',
    motif: () => (
      <g>
        <Flat x={70} y={44} s={8} color={PV.hundreds} />
        <Rod x={180} y={44} s={8} color={PV.tens} />
        <Rod x={196} y={44} s={8} color={PV.tens} />
        <UnitCube x={236} y={108} s={14} color={PV.ones} />
        <UnitCube x={256} y={108} s={14} color={PV.ones} />
        <UnitCube x={246} y={88} s={14} color={PV.ones} />
      </g>
    ),
  },
  measurement: {
    bg: '#fff1c7',
    motif: () => (
      <g transform="rotate(-8 160 80)">
        <rect x={50} y={60} width={220} height={44} rx={8} fill={M.gold} stroke={M.ink} strokeWidth={3.5} />
        {Array.from({ length: 11 }, (_, i) => (
          <line key={i} x1={66 + i * 19} y1={60} x2={66 + i * 19} y2={i % 5 === 0 ? 84 : 74} stroke={M.ink} strokeWidth={2.5} />
        ))}
      </g>
    ),
  },
  geometry: {
    bg: '#e3f6ea',
    motif: () => (
      <g strokeLinejoin="round">
        <path d="M 70 116 L 110 40 L 150 116 Z" fill={M.coral} stroke={M.ink} strokeWidth={3.5} />
        <rect x={168} y={56} width={58} height={58} rx={6} fill="#8ab8ff" stroke={M.ink} strokeWidth={3.5} />
        <circle cx={268} cy={86} r={30} fill={M.gold} stroke={M.ink} strokeWidth={3.5} />
      </g>
    ),
  },
  dataGraph: {
    bg: '#efe6ff',
    motif: () => (
      <g>
        <line x1={70} y1={124} x2={260} y2={124} stroke={M.ink} strokeWidth={4} strokeLinecap="round" />
        {[46, 78, 32, 64].map((h, i) => (
          <rect key={i} x={86 + i * 44} y={124 - h} width={30} height={h} rx={5} fill={M.set[i]} stroke={M.ink} strokeWidth={3} />
        ))}
      </g>
    ),
  },
  wordProblem: {
    bg: '#e1f5d9',
    motif: () => (
      <g>
        <path d="M 80 34 h 160 a 18 18 0 0 1 18 18 v 44 a 18 18 0 0 1 -18 18 h -110 l -24 20 l 4 -20 h -30 a 18 18 0 0 1 -18 -18 v -44 a 18 18 0 0 1 18 -18 Z" fill="#fff" stroke={M.ink} strokeWidth={3.5} strokeLinejoin="round" />
        <text x={160} y={84} fontFamily={M.font} fontWeight={700} fontSize={34} textAnchor="middle" fill={M.ink}>
          3 + ? = 7
        </text>
      </g>
    ),
  },
  reading: {
    bg: '#dff3f8',
    motif: () => (
      <g strokeLinejoin="round">
        <path d="M 160 52 Q 120 36 76 44 L 76 120 Q 120 112 160 128 Z" fill="#fff" stroke={M.ink} strokeWidth={3.5} />
        <path d="M 160 52 Q 200 36 244 44 L 244 120 Q 200 112 160 128 Z" fill="#fff" stroke={M.ink} strokeWidth={3.5} />
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <line x1={92} y1={64 + i * 16} x2={146} y2={70 + i * 16} stroke="#9fd3ff" strokeWidth={4} strokeLinecap="round" />
            <line x1={174} y1={70 + i * 16} x2={228} y2={64 + i * 16} stroke="#9fd3ff" strokeWidth={4} strokeLinecap="round" />
          </g>
        ))}
      </g>
    ),
  },
  writing: {
    bg: '#fde4ef',
    motif: () => (
      <g>
        {[0, 1, 2].map((i) => (
          <line key={i} x1={70} y1={62 + i * 24} x2={250} y2={62 + i * 24} stroke="#f7a1c4" strokeWidth={3} strokeLinecap="round" />
        ))}
        <path d="M 90 60 q 20 -18 40 0 t 40 0" fill="none" stroke={M.ink} strokeWidth={4} strokeLinecap="round" />
        <g transform="rotate(35 230 70)">
          <rect x={222} y={20} width={20} height={84} rx={4} fill={M.gold} stroke={M.ink} strokeWidth={3} />
          <path d="M 222 104 L 232 124 L 242 104 Z" fill="#f2c47e" stroke={M.ink} strokeWidth={3} strokeLinejoin="round" />
        </g>
      </g>
    ),
  },
  science: {
    bg: '#e3f6ea',
    motif: () => (
      <g strokeLinejoin="round">
        <circle cx={250} cy={50} r={22} fill={M.gold} stroke={M.ink} strokeWidth={3.5} />
        <path d="M 120 36 h 40 v 30 l 30 52 a 8 8 0 0 1 -7 12 h -86 a 8 8 0 0 1 -7 -12 l 30 -52 Z" fill="#fff" stroke={M.ink} strokeWidth={3.5} />
        <path d="M 106 96 h 68 l 9 16 a 6 6 0 0 1 -5 9 h -76 a 6 6 0 0 1 -5 -9 Z" fill={M.mint} />
        <circle cx={130} cy={104} r={5} fill="#fff" />
        <circle cx={150} cy={110} r={4} fill="#fff" />
      </g>
    ),
  },
  // ── kindergarten (band k1): pictures and numerals / letters only ──
  kCounting: {
    bg: '#ffe0dc',
    motif: () => (
      <g>
        {[0, 1, 2, 3].map((i) => (
          <Apple key={i} x={78 + i * 50} y={92} r={20} color="#f2766b" />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <g key={`n${i}`}>
            <circle cx={78 + i * 50} cy={130} r={11} fill={M.gold} stroke={M.ink} strokeWidth={2.5} />
            <text x={78 + i * 50} y={131} fontFamily={M.font} fontWeight={700} fontSize={14} textAnchor="middle" dominantBaseline="middle" fill={M.ink}>
              {i + 1}
            </text>
          </g>
        ))}
        <circle cx={272} cy={58} r={30} fill={M.gold} stroke={M.ink} strokeWidth={3.5} />
        <text x={272} y={60} fontFamily={M.font} fontWeight={700} fontSize={38} textAnchor="middle" dominantBaseline="middle" fill={M.ink}>
          4
        </text>
      </g>
    ),
  },
  kShapes: {
    bg: '#efe6ff',
    motif: () => (
      <g strokeLinejoin="round">
        <path d="M 52 120 L 92 44 L 132 120 Z" fill="#ffcf4d" stroke={M.ink} strokeWidth={3.5} />
        <rect x={146} y={62} width={58} height={58} rx={3} fill="#8ab8ff" stroke={M.ink} strokeWidth={3.5} />
        <circle cx={248} cy={92} r={29} fill="#f2766b" stroke={M.ink} strokeWidth={3.5} />
        {[
          [92, 44],
          [132, 120],
          [52, 120],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={6} fill={M.coral} stroke={M.ink} strokeWidth={2.5} />
        ))}
      </g>
    ),
  },
  kLetters: {
    bg: '#dff3f8',
    motif: () => (
      <g>
        {[
          { ch: 'A', x: 98, s: 70, c: '#f2766b' },
          { ch: 'B', x: 182, s: 70, c: '#ffcf4d' },
          { ch: 'b', x: 254, s: 50, c: '#ffcf4d' },
        ].map((l) => (
          <g key={l.ch} transform={`translate(${l.x} ${128 - l.s / 2})`}>
            <rect x={-l.s / 2} y={-l.s / 2 + 4} width={l.s} height={l.s} rx={l.s * 0.22} fill="#ecc28f" stroke={M.ink} strokeWidth={3} />
            <rect x={-l.s / 2} y={-l.s / 2} width={l.s} height={l.s * 0.97} rx={l.s * 0.22} fill="#fdf3dc" stroke={M.ink} strokeWidth={3} />
            <text y={-1} fontFamily={M.font} fontWeight={700} fontSize={l.s * 0.7} textAnchor="middle" dominantBaseline="central" fill={l.c} stroke={M.ink} strokeWidth={l.s * 0.035} paintOrder="stroke fill">
              {l.ch}
            </text>
          </g>
        ))}
      </g>
    ),
  },
}

/**
 * A lesson's poster for the lesson picker: a little flat-vector scene in the
 * stage's style (the motif floats gently unless motion is reduced).
 */
export default function LessonPoster({ id, emoji, reduced, done }: { id: string; emoji: string; reduced: boolean; done?: boolean }) {
  const p = POSTERS[id]
  return (
    <svg viewBox={`0 0 ${PW} ${PH}`} className="block w-full" aria-hidden="true">
      <defs>
        <pattern id={`dots-${id}`} width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="9" cy="9" r="1.4" fill={M.ink} opacity="0.08" />
        </pattern>
      </defs>
      <rect width={PW} height={PH} fill={p?.bg ?? '#fff1d6'} />
      <rect width={PW} height={PH} fill={`url(#dots-${id})`} />
      {/* soft sun-burst behind the motif */}
      <circle cx={160} cy={80} r={70} fill="#ffffff" opacity={0.45} />
      <motion.g animate={reduced ? undefined : { y: [0, -4, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}>
        {p ? (
          p.motif()
        ) : (
          <text x={160} y={92} fontSize={64} textAnchor="middle">
            {emoji}
          </text>
        )}
      </motion.g>
      {done && (
        <g transform="translate(290 28)">
          <path d={starPath(18)} fill={M.gold} stroke={M.ink} strokeWidth={3} strokeLinejoin="round" />
        </g>
      )}
    </svg>
  )
}

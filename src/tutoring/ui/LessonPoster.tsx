import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { slicePath } from '../motion/anim'
import { PV, starPath } from '../motion/layout'
import { M } from '../motion/palette'
import { Apple, Cookie, Flat, Rod, UnitCube } from '../motion/shapes'
import { DRAWINGS } from '../../games/listenPlay/drawings'
// 1st grade (phase 2b): Fair Share Falls' pizza drawings
import { shareArtName } from '../../games/listenPlay/shareGeometry'

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
            <text y={-1} fontFamily={M.letters} fontWeight={700} fontSize={l.s * 0.7} textAnchor="middle" dominantBaseline="central" fill={l.c} stroke={M.ink} strokeWidth={l.s * 0.025} paintOrder="stroke fill">
              {l.ch}
            </text>
          </g>
        ))}
      </g>
    ),
  },
  kTracing: {
    bg: '#e4f1ff',
    motif: () => (
      <g strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* an L on handwriting lines, half traced in crayon, its green dot and an arrow */}
        <line x1={70} x2={250} y1={40} y2={40} stroke="#a9cdea" strokeWidth={2.5} />
        <line x1={70} x2={250} y1={82} y2={82} stroke="#a9cdea" strokeWidth={2.5} strokeDasharray="8 6" />
        <line x1={70} x2={250} y1={124} y2={124} stroke="#7fb0da" strokeWidth={3} />
        <path d="M 130 40 L 130 124 L 190 124" stroke="#dccbb0" strokeWidth={22} />
        <path d="M 130 40 L 130 124 L 190 124" stroke="#f5ecdd" strokeWidth={17} />
        <path d="M 130 40 L 130 112" stroke="#3f6fd1" strokeWidth={12} />
        <circle cx={130} cy={40} r={8} fill="#36c35a" stroke={M.ink} strokeWidth={2.5} />
        <path d="M 154 64 L 154 92 M 145 82 L 154 94 L 163 82" stroke="#ff8a3d" strokeWidth={6} />
        <circle cx={226} cy={70} r={17} fill="none" stroke="#dccbb0" strokeWidth={10} />
      </g>
    ),
  },
  // ── K complete (phase 2a) ──
  kAddTake: {
    bg: '#dcf3fb',
    motif: () => (
      <g>
        {/* a ten-frame: seven coral counters and three mint ones hopping in */}
        <rect x={70} y={44} width={180} height={76} rx={10} fill="#fffaf0" stroke={M.ink} strokeWidth={3.5} />
        {[1, 2, 3, 4].map((k) => (
          <line key={k} x1={70 + k * 36} y1={44} x2={70 + k * 36} y2={120} stroke={M.ink} strokeWidth={2.5} />
        ))}
        <line x1={70} y1={82} x2={250} y2={82} stroke={M.ink} strokeWidth={2.5} />
        {Array.from({ length: 10 }, (_, i) => (
          <circle key={i} cx={88 + (i % 5) * 36} cy={63 + Math.floor(i / 5) * 38 - (i >= 7 ? 4 : 0)} r={12} fill={i < 7 ? '#f2766b' : '#74d3bd'} stroke={M.ink} strokeWidth={2.5} />
        ))}
        <circle cx={278} cy={50} r={22} fill={M.gold} stroke={M.ink} strokeWidth={3} />
        <text x={278} y={52} fontFamily={M.font} fontWeight={700} fontSize={22} textAnchor="middle" dominantBaseline="middle" fill={M.ink}>
          10
        </text>
      </g>
    ),
  },
  kCompare: {
    bg: '#fdecc8',
    motif: () => (
      <g strokeLinecap="round" strokeLinejoin="round">
        {/* four over three, joined one to one; the last one left over (gold) */}
        {[0, 1, 2, 3].map((i) => (
          <circle key={`t${i}`} cx={84 + i * 52} cy={50} r={16} fill={i === 3 ? M.gold : '#8ab8ff'} stroke={M.ink} strokeWidth={3} />
        ))}
        {[0, 1, 2].map((i) => (
          <g key={`b${i}`}>
            <line x1={84 + i * 52} y1={68} x2={84 + i * 52} y2={96} stroke={M.coral} strokeWidth={5} />
            <circle cx={84 + i * 52} cy={112} r={14} fill="#e9b46a" stroke={M.ink} strokeWidth={3} />
          </g>
        ))}
        <circle cx={240} cy={112} r={14} fill="none" stroke={M.ink} strokeOpacity={0.4} strokeWidth={3} strokeDasharray="6 5" />
        {/* the level balance: the same */}
        <path d="M 270 128 L 302 128 L 292 120 L 280 120 Z" fill={M.wood} stroke={M.ink} strokeWidth={2.5} />
        <line x1={286} y1={120} x2={286} y2={70} stroke={M.ink} strokeWidth={4} />
        <line x1={262} y1={70} x2={310} y2={70} stroke={M.ink} strokeWidth={4} />
        <path d="M 252 86 Q 262 98 272 86 Z M 300 86 Q 310 98 320 86 Z" fill={M.gold} stroke={M.ink} strokeWidth={2.5} />
      </g>
    ),
  },
  kTeens: {
    bg: '#e9e2ff',
    motif: () => (
      <g>
        {/* a full ten over three more, and the 13 they make */}
        {[0, 1].map((f) => (
          <g key={f}>
            <rect x={70} y={28 + f * 54} width={140} height={48} rx={5} fill="#fffaf0" stroke={M.ink} strokeWidth={3} />
            <path d={`M 70 ${52 + f * 54} H 210 M 98 ${28 + f * 54} V ${76 + f * 54} M 126 ${28 + f * 54} V ${76 + f * 54} M 154 ${28 + f * 54} V ${76 + f * 54} M 182 ${28 + f * 54} V ${76 + f * 54}`} stroke={M.ink} strokeWidth={2} />
            {Array.from({ length: f === 0 ? 10 : 3 }, (_, k) => (
              <circle key={k} cx={84 + (k % 5) * 28} cy={40 + f * 54 + Math.floor(k / 5) * 24} r={8.5} fill="#f2766b" stroke={M.ink} strokeWidth={2} />
            ))}
          </g>
        ))}
        <text x={262} y={92} fontFamily={M.font} fontWeight={700} fontSize={58} textAnchor="middle" dominantBaseline="middle" fill="#8ab8ff" stroke={M.ink} strokeWidth={4} paintOrder="stroke fill">
          13
        </text>
      </g>
    ),
  },
  kStoryMath: {
    bg: '#e1f5d9',
    motif: () => (
      <g strokeLinejoin="round">
        {/* Bear and a basket of apples */}
        <circle cx={70} cy={58} r={14} fill="#c7955f" stroke={M.ink} strokeWidth={3} />
        <circle cx={112} cy={58} r={14} fill="#c7955f" stroke={M.ink} strokeWidth={3} />
        <circle cx={91} cy={86} r={36} fill="#c7955f" stroke={M.ink} strokeWidth={3.5} />
        <ellipse cx={91} cy={98} rx={15} ry={11} fill="#f1d9a6" stroke={M.ink} strokeWidth={2.5} />
        <circle cx={79} cy={80} r={4} fill={M.ink} />
        <circle cx={103} cy={80} r={4} fill={M.ink} />
        <ellipse cx={91} cy={94} rx={5} ry={4} fill={M.ink} />
        {[0, 1, 2].map((i) => (
          <Apple key={i} x={170 + i * 36} y={86} r={15} color="#f2766b" />
        ))}
        <path d="M 150 98 L 262 98 L 252 132 L 160 132 Z" fill="#e3b77e" stroke={M.ink} strokeWidth={3.5} />
        <rect x={146} y={92} width={120} height={10} rx={5} fill="#d29a5c" stroke={M.ink} strokeWidth={3} />
      </g>
    ),
  },
  // K complete (phase 2a)
  kMeasure: {
    bg: '#e3f6dc',
    motif: () => (
      <g strokeLinejoin="round">
        {/* two ribbons lined up at a green start line; a dashed line where the short one stops */}
        <path d="M 66 30 V 128" stroke="#36c35a" strokeWidth={6} strokeLinecap="round" />
        <path d="M 66 30 L 86 37 L 66 44 Z" fill="#36c35a" stroke={M.ink} strokeWidth={2.5} />
        <path d="M 66 52 H 252 L 238 66 L 252 80 H 66 Z" fill="#8ab8ff" stroke={M.ink} strokeWidth={3} />
        <path d="M 66 92 H 172 L 158 106 L 172 120 H 66 Z" fill="#f2766b" stroke={M.ink} strokeWidth={3} />
        <rect x={172} y={50} width={80} height={32} rx={8} fill="#ffe594" opacity={0.6} />
        <path d="M 172 44 V 128" stroke={M.ink} strokeWidth={3} strokeDasharray="7 6" strokeLinecap="round" />
      </g>
    ),
  },
  kSorting: {
    bg: '#ffe9dc',
    motif: () => (
      <g strokeLinejoin="round">
        {/* two boxes, a red group and a blue group */}
        <rect x={56} y={58} width={96} height={72} rx={14} fill="#ffe0dc" stroke={M.ink} strokeWidth={3} />
        <rect x={168} y={58} width={96} height={72} rx={14} fill="#dcebff" stroke={M.ink} strokeWidth={3} />
        {[
          [80, 82],
          [104, 82],
          [128, 82],
          [92, 106],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={10} fill="#ef4b3f" stroke={M.ink} strokeWidth={2.5} />
        ))}
        {[
          [204, 92],
          [228, 92],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={10} fill="#3d8bf2" stroke={M.ink} strokeWidth={2.5} />
        ))}
        <circle cx={160} cy={34} r={12} fill="#ef4b3f" stroke={M.ink} strokeWidth={2.5} />
        <path d="M 160 48 Q 132 52 118 62" fill="none" stroke={M.ink} strokeWidth={3} strokeDasharray="6 6" strokeLinecap="round" />
      </g>
    ),
  },
  // ── kindergarten, phase 2a ──
  kScience: {
    bg: '#e2f3ff',
    motif: () => (
      <g>
        {/* the Nature Summit cards' own drawings: a sunny day, a rainy one, an umbrella */}
        <g transform="translate(46 34) scale(0.86)">{DRAWINGS.sunny()}</g>
        <g transform="translate(130 34) scale(0.86)">{DRAWINGS.rainy()}</g>
        <g transform="translate(214 34) scale(0.86)">{DRAWINGS.umbrella()}</g>
      </g>
    ),
  },
  kTowers: {
    bg: '#dff3d2',
    motif: () => (
      <g strokeLinejoin="round" strokeLinecap="round">
        {/* the path, two critters on it, a tower beside it */}
        <path d="M 20 118 C 90 118 110 70 170 76 S 250 110 300 96" fill="none" stroke={M.ink} strokeWidth={26} />
        <path d="M 20 118 C 90 118 110 70 170 76 S 250 110 300 96" fill="none" stroke="#f1d9a6" strokeWidth={19} />
        {[
          [196, 80],
          [244, 98],
        ].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y - 6})`}>
            <path d="M -5 -12 L -8 -20 M 5 -12 L 8 -20" stroke={M.ink} strokeWidth={2.5} />
            <circle r={14} fill="#b79af0" stroke={M.ink} strokeWidth={3} />
            <circle cx={-5} cy={-2} r={3.5} fill="#fff" stroke={M.ink} strokeWidth={1.8} />
            <circle cx={5} cy={-2} r={3.5} fill="#fff" stroke={M.ink} strokeWidth={1.8} />
          </g>
        ))}
        <g transform="translate(96 136)">
          <path d="M -3 -84 L -3 -104 L 15 -97 L -3 -91" fill="#f2766b" stroke={M.ink} strokeWidth={2.5} />
          <path d="M -22 0 L -20 -60 L 20 -60 L 22 0 Z" fill="#c3cede" stroke={M.ink} strokeWidth={3} />
          <path d="M -25 -60 L -25 -76 L -16 -76 L -16 -69 L -4 -69 L -4 -76 L 4 -76 L 4 -69 L 16 -69 L 16 -76 L 25 -76 L 25 -60 Z" fill="#d7dee8" stroke={M.ink} strokeWidth={3} />
          <path d="M -8 0 L -8 -15 Q 0 -24 8 -15 L 8 0 Z" fill="#9a6a46" stroke={M.ink} strokeWidth={2.5} />
        </g>
      </g>
    ),
  },
  // ── 1st grade (phase 2b) ──
  g1Reading: {
    bg: '#dcf3f6',
    motif: () => (
      <g>
        {/* c a t on letter tiles, the a lit marker yellow, and a ship (Word Reef's word to read) */}
        {['c', 'a', 't'].map((ch, i) => {
          const x = 70 + i * 62
          return (
            <g key={ch} transform={`translate(${x} 82)`}>
              {i === 1 && <rect x={-32} y={-32} width={64} height={64} rx={14} fill="#ffe066" />}
              <rect x={-26} y={-22} width={52} height={52} rx={11} fill="#ecc28f" stroke={M.ink} strokeWidth={3} />
              <rect x={-26} y={-26} width={52} height={51} rx={11} fill="#fdf3dc" stroke={M.ink} strokeWidth={3} />
              <text y={-1} fontFamily={M.letters} fontWeight={700} fontSize={38} textAnchor="middle" dominantBaseline="central" fill={i === 1 ? '#f2766b' : '#3f6fd1'}>
                {ch}
              </text>
            </g>
          )
        })}
        <text x={262} y={86} fontSize={58} textAnchor="middle" dominantBaseline="central" fontFamily="'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif">
          🚢
        </text>
      </g>
    ),
  },
  g1Writing: {
    bg: '#e4f1ff',
    motif: () => (
      <g strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* a little a on four writing lines, its bowl traced in crayon, and a period dot */}
        <line x1={60} x2={260} y1={34} y2={34} stroke="#a9cdea" strokeWidth={2.5} />
        <line x1={60} x2={260} y1={70} y2={70} stroke="#a9cdea" strokeWidth={2.5} strokeDasharray="8 6" />
        <line x1={60} x2={260} y1={106} y2={106} stroke="#7fb0da" strokeWidth={3} />
        <line x1={60} x2={260} y1={142} y2={142} stroke="#a9cdea" strokeWidth={2.5} />
        <ellipse cx={140} cy={88} rx={17} ry={18} stroke="#dccbb0" strokeWidth={15} />
        <ellipse cx={140} cy={88} rx={17} ry={18} stroke="#f5ecdd" strokeWidth={11} />
        <path d="M 157 70 L 157 106" stroke="#dccbb0" strokeWidth={15} />
        <path d="M 157 70 L 157 106" stroke="#f5ecdd" strokeWidth={11} />
        <path d="M 152 76 A 17 18 0 1 0 157 88" stroke="#3f6fd1" strokeWidth={8} />
        <circle cx={152} cy={76} r={6} fill="#36c35a" stroke={M.ink} strokeWidth={2} />
        <circle cx={218} cy={100} r={9} fill={M.ink} stroke="none" />
      </g>
    ),
  },
  // ── 1st grade (phase 2b): Tens Plateau, Fair Share Falls, Shape Grove ──
  g1Tens: {
    bg: '#e3f6ee',
    motif: () => (
      <g>
        {/* three rods and six cubes, and the 36 they make (the 3 in the rods' mint, the 6 in the cubes' gold) */}
        {[0, 1, 2].map((k) => (
          <Rod key={k} x={64 + k * 20} y={26} s={10} />
        ))}
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <UnitCube key={k} x={130 + Math.floor(k / 3) * 15} y={110 - (k % 3) * 15} s={10} />
        ))}
        <text x={232} y={84} fontFamily={M.font} fontWeight={700} fontSize={64} textAnchor="middle" dominantBaseline="middle" stroke={M.ink} strokeWidth={4} paintOrder="stroke fill">
          <tspan fill="#74d3bd">3</tspan>
          <tspan fill="#ffcf4d">6</tspan>
        </text>
      </g>
    ),
  },
  g1Shares: {
    bg: '#ffe9dc',
    motif: () => (
      <g>
        {/* a pizza cut in half and one cut in fourths, one share of each coloured in */}
        <g transform="translate(58 30) scale(0.95)">{DRAWINGS[shareArtName({ thing: 'pizza', cut: 'h2', colored: 0 })]?.()}</g>
        <g transform="translate(166 30) scale(0.95)">{DRAWINGS[shareArtName({ thing: 'pizza', cut: 'q4', colored: 1 })]?.()}</g>
      </g>
    ),
  },
  g1Shapes: {
    bg: '#ece4ff',
    motif: () => (
      <g strokeLinejoin="round">
        {/* two triangles snapped into a square, and a triangle turned and painted */}
        <path d="M 70 40 L 140 40 L 140 110 Z" fill="#f2766b" stroke={M.ink} strokeWidth={3.5} />
        <path d="M 70 40 L 140 110 L 70 110 Z" fill="#74d3bd" stroke={M.ink} strokeWidth={3.5} />
        <g transform="translate(222 78) rotate(160)">
          <path d="M 0 -40 L 40 30 L -40 30 Z" fill="#c9dcff" stroke={M.ink} strokeWidth={7} />
          <path d="M 0 -40 L 40 30 L -40 30 Z" fill="none" stroke="#8ab8ff" strokeWidth={3.5} />
        </g>
      </g>
    ),
  },
  // ── 1st grade, phase 2b ──
  g1Measure: {
    bg: '#e3f6dc',
    motif: () => (
      <g strokeLinejoin="round" strokeLinecap="round">
        {/* a clock at half past three, beside a pencil with paper clips under it */}
        <circle cx={92} cy={76} r={52} fill="#fffaf0" stroke={M.ink} strokeWidth={4} />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2
          return <line key={i} x1={92 + Math.sin(a) * 42} y1={76 - Math.cos(a) * 42} x2={92 + Math.sin(a) * 48} y2={76 - Math.cos(a) * 48} stroke={M.ink} strokeWidth={i % 3 ? 2 : 3.5} />
        })}
        <line x1={92} y1={76} x2={92 + Math.sin((105 * Math.PI) / 180) * 20} y2={76 - Math.cos((105 * Math.PI) / 180) * 20} stroke={M.ink} strokeWidth={7} />
        <line x1={92} y1={76} x2={92} y2={108} stroke="#f2766b" strokeWidth={5} />
        <circle cx={92} cy={76} r={5} fill="#ffcf4d" stroke={M.ink} strokeWidth={2.5} />
        <path d="M 168 40 V 128" stroke="#36c35a" strokeWidth={5} />
        <rect x={168} y={50} width={100} height={20} rx={4} fill="#ffcf4d" stroke={M.ink} strokeWidth={3} />
        <path d="M 268 50 L 290 60 L 268 70 Z" fill="#f6d2ad" stroke={M.ink} strokeWidth={3} />
        {[0, 1, 2, 3, 4].map((k) => (
          <rect key={k} x={170 + k * 24} y={86} width={22} height={11} rx={5.5} fill="none" stroke={M.ink} strokeWidth={3} />
        ))}
      </g>
    ),
  },
  g1Graphs: {
    bg: '#ffe9dc',
    motif: () => (
      <g strokeLinejoin="round">
        {/* a picture graph: four red, two yellow, three purple, each row marked at its start */}
        <rect x={60} y={20} width={200} height={112} rx={14} fill="#fffaf0" stroke={M.ink} strokeWidth={3} />
        {[
          { y: 40, n: 4, c: '#ef4b3f' },
          { y: 76, n: 2, c: '#ffd23f' },
          { y: 112, n: 3, c: '#9b6ad6' },
        ].map(({ y, n, c }, r) => (
          <g key={r}>
            <rect x={70} y={y - 13} width={26} height={26} rx={6} fill="#ffffff" stroke={M.ink} strokeWidth={2.5} />
            <circle cx={83} cy={y} r={7} fill={c} stroke={M.ink} strokeWidth={2} />
            {Array.from({ length: n }, (_, k) => (
              <circle key={k} cx={118 + k * 32} cy={y} r={11} fill={c} stroke={M.ink} strokeWidth={2.5} />
            ))}
          </g>
        ))}
      </g>
    ),
  },
  g1Science: {
    bg: '#dff1fb',
    motif: () => (
      <g>
        {/* the Sky Summit cards' own drawings: a ringing bell, the night sky, a bird feeding its chicks */}
        <g transform="translate(46 34) scale(0.86)">{DRAWINGS.bellRing()}</g>
        <g transform="translate(130 34) scale(0.86)">{DRAWINGS.nightSky()}</g>
        <g transform="translate(214 34) scale(0.86)">{DRAWINGS.birdFeeds()}</g>
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

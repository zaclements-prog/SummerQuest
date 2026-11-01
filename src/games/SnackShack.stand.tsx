import { motion, useReducedMotion } from 'framer-motion'
import { TOON } from '../toon/palette'
import { UI } from './_runkit/uiTokens'

/**
 * The Snack Shack itself: a flat, ink-outlined beach stand in the toon
 * palette (the Listen & Play look), drawn in one SVG so it stays crisp and
 * cheap on a Fire tablet. It gets fancier as the shift goes: a decoration
 * the child picks at each upgrade, and a flower pot on the sand for every
 * customer served. The customer critter stands at the counter.
 */

import type { DecorId } from './SnackShack.decor'

const INK = UI.line
const ink = { stroke: INK, strokeWidth: 3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }

export function StandArt({
  decor,
  served = 0,
  critter,
  mood = 'wait',
  animate = true,
  className = '',
}: {
  decor: readonly DecorId[]
  /** Customers served so far: one flower pot each on the sand. */
  served?: number
  critter?: string | null
  mood?: 'wait' | 'happy' | 'think'
  /** Twinkle, bob and wave (off for reduced motion, low graphics and previews). */
  animate?: boolean
  className?: string
}) {
  const reduced = useReducedMotion() ?? false
  const live = animate && !reduced
  const has = (d: DecorId) => decor.includes(d)
  return (
    <svg viewBox="0 0 400 260" className={className} role="img" aria-label="The Snack Shack">
      {/* sea and sand */}
      <rect x={0} y={150} width={400} height={40} fill={TOON.water} />
      <path d="M0 160 Q 25 154 50 160 T 100 160 T 150 160 T 200 160 T 250 160 T 300 160 T 350 160 T 400 160" fill="none" stroke={TOON.foam} strokeWidth={3} opacity={0.8} />
      <path d="M0 186 Q 100 176 200 184 T 400 182 L 400 260 L 0 260 Z" fill={TOON.sand} />
      <path d="M0 186 Q 100 176 200 184 T 400 182" fill="none" stroke={TOON.sandWet} strokeWidth={4} />

      {has('umbrella') && <Umbrella />}
      {/* posts */}
      <rect x={66} y={58} width={14} height={160} rx={3} fill={TOON.woodDark} {...ink} />
      <rect x={320} y={58} width={14} height={160} rx={3} fill={TOON.woodDark} {...ink} />
      {/* back wall */}
      <rect x={80} y={78} width={240} height={80} fill={TOON.wallCream} {...ink} strokeWidth={2.5} />
      <Shelf />

      {/* the awning */}
      <Awning palms={has('palms')} />
      {has('lights') && <Lights live={live} />}
      {has('flags') && <Flags />}
      {has('sign') ? <BigSign live={live} /> : <PlankSign />}

      {/* the counter */}
      <rect x={52} y={146} width={296} height={12} rx={4} fill={TOON.woodLight} {...ink} />
      <rect x={60} y={158} width={280} height={60} fill={TOON.wood} {...ink} />
      {[100, 140, 180, 220, 260, 300].map((x) => (
        <line key={x} x1={x} y1={160} x2={x} y2={216} stroke={TOON.woodDark} strokeWidth={2} />
      ))}
      <Register />
      {has('radio') && <Radio live={live} />}
      {has('surfboard') && <Surfboard />}
      {has('parrot') && <Parrot live={live} />}
      <Pots n={served} />

      {critter && <Critter emoji={critter} mood={mood} live={live} />}
    </svg>
  )
}

function Awning({ palms }: { palms: boolean }) {
  const stripes = Array.from({ length: 10 }, (_, i) => i)
  return (
    <g>
      {stripes.map((i) => (
        <rect key={i} x={48 + i * 30.4} y={50} width={30.4} height={26} fill={i % 2 ? TOON.flowerWhite : TOON.coral} />
      ))}
      {/* scallops */}
      {stripes.map((i) => (
        <path key={`s${i}`} d={`M ${48 + i * 30.4} 76 q 15.2 16 30.4 0`} fill={i % 2 ? TOON.flowerWhite : TOON.coral} {...ink} strokeWidth={2.5} />
      ))}
      <rect x={48} y={50} width={304} height={26} fill="none" {...ink} />
      {palms && (
        <g>
          {Array.from({ length: 13 }, (_, i) => (
            <path key={i} d={`M ${44 + i * 24} 54 q 10 -26 26 -22 q -4 14 -16 26 z`} fill={i % 2 ? TOON.leaf : TOON.leafDark} {...ink} strokeWidth={2.2} />
          ))}
        </g>
      )}
    </g>
  )
}

function Shelf() {
  const jars = [
    { x: 104, c: TOON.flowerPink },
    { x: 140, c: TOON.flowerYellow },
    { x: 176, c: TOON.mint },
    { x: 224, c: TOON.lilac },
    { x: 260, c: TOON.autumn },
  ]
  return (
    <g>
      <rect x={90} y={118} width={220} height={6} fill={TOON.woodDark} {...ink} strokeWidth={2} />
      {jars.map((j) => (
        <g key={j.x}>
          <rect x={j.x} y={98} width={24} height={20} rx={5} fill={j.c} {...ink} strokeWidth={2} />
          <rect x={j.x + 3} y={94} width={18} height={5} rx={2} fill={TOON.woodDark} {...ink} strokeWidth={1.8} />
        </g>
      ))}
    </g>
  )
}

function PlankSign() {
  return (
    <g>
      <rect x={140} y={18} width={120} height={30} rx={6} fill={TOON.woodLight} {...ink} />
      <text x={200} y={40} textAnchor="middle" fontSize={20} fontWeight={800} fill={INK} className="kid-text">
        SNACKS
      </text>
    </g>
  )
}

function BigSign({ live }: { live: boolean }) {
  return (
    <g>
      <rect x={108} y={8} width={184} height={42} rx={12} fill={TOON.roofPlum} {...ink} />
      {Array.from({ length: 12 }, (_, i) => (
        <circle key={i} cx={120 + i * 14.5} cy={14} r={3.2} fill={TOON.lantern} stroke={INK} strokeWidth={1.2} className={live ? 'shack-twinkle' : ''} style={{ animationDelay: `${(i % 4) * 0.25}s` }} />
      ))}
      <text x={200} y={42} textAnchor="middle" fontSize={21} fontWeight={800} fill={TOON.gold} stroke={INK} strokeWidth={1.2} className="kid-text">
        SNACK SHACK
      </text>
    </g>
  )
}

function Lights({ live }: { live: boolean }) {
  const colors = [TOON.flowerRed, TOON.flowerYellow, TOON.flowerBlue, TOON.mint, TOON.flowerPink]
  return (
    <g>
      <path d="M 70 92 Q 200 122 330 92" fill="none" stroke={INK} strokeWidth={2} />
      {Array.from({ length: 11 }, (_, i) => {
        const t = (i + 0.5) / 11
        const x = 70 + 260 * t
        const y = 92 + 4 * 30 * t * (1 - t) * 1
        return <ellipse key={i} cx={x} cy={y + 6} rx={4.5} ry={6} fill={colors[i % colors.length]} stroke={INK} strokeWidth={1.8} className={live ? 'shack-twinkle' : ''} style={{ animationDelay: `${(i % 3) * 0.4}s` }} />
      })}
    </g>
  )
}

function Flags() {
  const colors = [TOON.flowerRed, TOON.flowerYellow, TOON.waterDeep, TOON.leaf, TOON.flowerPurple]
  return (
    <g>
      <path d="M 70 88 Q 200 112 330 88" fill="none" stroke={INK} strokeWidth={2} />
      {Array.from({ length: 10 }, (_, i) => {
        const t = (i + 0.5) / 10
        const x = 70 + 260 * t
        const y = 88 + 96 * t * (1 - t)
        return <path key={i} d={`M ${x - 9} ${y} L ${x + 9} ${y} L ${x} ${y + 16} Z`} fill={colors[i % colors.length]} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
      })}
    </g>
  )
}

function Umbrella() {
  return (
    <g>
      <line x1={30} y1={84} x2={36} y2={210} stroke={INK} strokeWidth={5} strokeLinecap="round" />
      <line x1={30} y1={84} x2={36} y2={210} stroke={TOON.flowerWhite} strokeWidth={2} strokeLinecap="round" />
      <path d="M -6 92 Q 28 38 66 84 Z" fill={TOON.flowerYellow} {...ink} />
      <path d="M 14 88 Q 28 50 40 86 Z" fill={TOON.flowerRed} {...ink} strokeWidth={2} />
    </g>
  )
}

function Surfboard() {
  return (
    <g transform="rotate(-10 368 150)">
      <ellipse cx={368} cy={150} rx={17} ry={66} fill={TOON.sky} {...ink} />
      <rect x={362} y={88} width={12} height={124} fill={TOON.coral} opacity={0.85} />
      <ellipse cx={368} cy={150} rx={17} ry={66} fill="none" {...ink} />
    </g>
  )
}

function Parrot({ live }: { live: boolean }) {
  return (
    <g className={live ? 'shack-bob' : ''} style={{ transformOrigin: '73px 60px' }}>
      <ellipse cx={73} cy={44} rx={12} ry={16} fill={TOON.flowerRed} {...ink} strokeWidth={2.4} />
      <circle cx={75} cy={30} r={9} fill={TOON.flowerRed} {...ink} strokeWidth={2.4} />
      <path d="M 82 29 l 8 3 l -7 4 z" fill={TOON.gold} {...ink} strokeWidth={1.8} />
      <circle cx={77} cy={28} r={2} fill={INK} />
      <path d="M 64 42 q -8 10 0 18 q 8 -4 6 -16 z" fill={TOON.waterDeep} {...ink} strokeWidth={2} />
      <path d="M 70 58 l -4 12 M 76 58 l 2 12" stroke={INK} strokeWidth={2.4} />
    </g>
  )
}

function Radio({ live }: { live: boolean }) {
  return (
    <g>
      <rect x={74} y={124} width={42} height={24} rx={5} fill={TOON.roofTeal} {...ink} strokeWidth={2.4} />
      <circle cx={86} cy={136} r={7} fill={TOON.flowerWhite} {...ink} strokeWidth={2} />
      <rect x={98} y={130} width={12} height={4} rx={1} fill={TOON.flowerWhite} stroke={INK} strokeWidth={1.4} />
      <line x1={110} y1={124} x2={118} y2={110} stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
      <text x={122} y={112} fontSize={16} fill={INK} className={live ? 'shack-note' : ''}>♪</text>
      <text x={134} y={102} fontSize={14} fill={INK} className={live ? 'shack-note' : ''} style={{ animationDelay: '0.6s' }}>♫</text>
    </g>
  )
}

function Register() {
  return (
    <g>
      <rect x={276} y={116} width={52} height={32} rx={5} fill={TOON.flowerPurple} {...ink} strokeWidth={2.6} />
      <rect x={282} y={108} width={40} height={12} rx={3} fill="#2d3a3a" {...ink} strokeWidth={2} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={284 + i * 13} y={126} width={9} height={7} rx={2} fill={TOON.flowerWhite} stroke={INK} strokeWidth={1.4} />
      ))}
    </g>
  )
}

function Pots({ n }: { n: number }) {
  const colors = [TOON.flowerPink, TOON.flowerYellow, TOON.flowerPurple, TOON.flowerRed, TOON.flowerBlue, TOON.coral, TOON.mint, TOON.flowerWhite]
  const xs = [24, 376, 52, 352, 10, 392, 82, 318]
  return (
    <g>
      {xs.slice(0, Math.min(n, xs.length)).map((x, i) => (
        <g key={i}>
          <line x1={x} y1={234} x2={x} y2={220} stroke={TOON.leafDark} strokeWidth={3} />
          <circle cx={x} cy={216} r={7} fill={colors[i]} {...ink} strokeWidth={2} />
          <circle cx={x} cy={216} r={2.5} fill={TOON.gold} />
          <path d={`M ${x - 10} 232 L ${x + 10} 232 L ${x + 7} 248 L ${x - 7} 248 Z`} fill={TOON.brick} {...ink} strokeWidth={2.2} />
        </g>
      ))}
    </g>
  )
}

function Critter({ emoji, mood, live }: { emoji: string; mood: 'wait' | 'happy' | 'think'; live: boolean }) {
  return (
    <motion.g
      key={emoji}
      initial={live ? { x: 260, opacity: 0 } : false}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 120, damping: 16 }}
    >
      <ellipse cx={200} cy={246} rx={40} ry={7} fill={INK} opacity={0.18} />
      <g className={live ? (mood === 'happy' ? 'shack-hop' : 'shack-sway') : ''} style={{ transformOrigin: '200px 246px' }}>
        <text x={200} y={242} textAnchor="middle" fontSize={92} data-critter="">
          {emoji}
        </text>
      </g>
      {mood === 'happy' && (
        <g>
          <text x={150} y={150} fontSize={26} className={live ? 'shack-float' : ''}>💖</text>
          <text x={238} y={140} fontSize={22} className={live ? 'shack-float' : ''} style={{ animationDelay: '0.3s' }}>💛</text>
        </g>
      )}
      {mood === 'think' && <text x={244} y={152} fontSize={26}>💭</text>}
    </motion.g>
  )
}

/** The happy meter: hearts fill as the order comes together (never empties, never fails). */
export function HappyMeter({ filled, of }: { filled: number; of: number }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`Happy meter ${filled} of ${of}`}>
      {Array.from({ length: of }, (_, i) => (
        <span key={i} className="text-lg leading-none" style={{ filter: i < filled ? 'none' : 'grayscale(1) opacity(.35)' }}>
          💖
        </span>
      ))}
    </span>
  )
}

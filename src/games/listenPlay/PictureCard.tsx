import { useId } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import type { Picture } from '../../lib/problem'
import { M } from '../../tutoring/motion/palette'
import { groupLayout } from './groupLayout'
import { pictureLabel } from './pictureLabel'
import './listenPlay.css'

/**
 * Pictures for the voice-first grades: every `Picture` kind drawn as inline
 * SVG (no image files, nothing to download), so it stays crisp at any size,
 * from a 64 px chip to a whole-screen panel.
 *
 *   <PictureArt picture={{ kind: 'group', count: 7, emoji: '🍎' }} />
 *   <PictureCard picture={{ kind: 'numeral', n: 7 }} label="7" onPick={…} />
 */

const INK = M.ink
const FONT = M.font
/** Sticker colours for numerals, letters and shapes (pastel fill, ink outline). */
const FILLS = ['#f2766b', '#ffcf4d', '#74d3bd', '#8ab8ff', '#b79af0', '#f7a1c4', '#8edb7c', '#ff9f80'] as const
const fillFor = (n: number) => FILLS[((n % FILLS.length) + FILLS.length) % FILLS.length]

/** Which objects of a group are counted, and the number each got ("3" under the third one). */
export type GroupMarks = Readonly<Record<number, number>>

export interface PictureArtProps {
  picture: Picture
  /** Group pictures: counted objects (each keeps its number badge). */
  marks?: GroupMarks
  /** Group pictures: each object becomes a tap target (tap-to-count). */
  onObjectTap?: (index: number) => void
  /** The box's width ÷ height, so a group picks rows that draw it biggest (default 4:3). */
  aspect?: number
  /** Group pictures: a number badge on each counted object (default on; small cards show one count instead). */
  badges?: boolean
  className?: string
}

/** The drawing alone, filling its box (aspect kept, centred). */
export function PictureArt({ picture, marks, onObjectTap, aspect = 4 / 3, badges = true, className = '' }: PictureArtProps) {
  const cls = `block w-full h-full ${className}`
  switch (picture.kind) {
    case 'numeral':
      return <NumeralArt n={picture.n} className={cls} />
    case 'group':
      return <GroupArt count={picture.count} emoji={picture.emoji ?? '🍎'} marks={marks} onObjectTap={onObjectTap} aspect={aspect} badges={badges} className={cls} />
    case 'tenFrame':
      return <TenFrameArt count={picture.count} className={cls} />
    case 'shape':
      return <ShapeArt shape={picture.shape} className={cls} />
    case 'letter':
      return <LetterArt ch={picture.ch} className={cls} />
    case 'word':
      return <WordArt text={picture.text} className={cls} />
    case 'emoji':
      return (
        <svg viewBox="0 0 100 100" className={cls} aria-hidden="true">
          <text x={50} y={53} fontSize={74} textAnchor="middle" dominantBaseline="central">
            {picture.emoji}
          </text>
        </svg>
      )
    case 'clock':
      return <ClockArt hour={picture.hour} minute={picture.minute} className={cls} />
  }
}

// ── the card ──────────────────────────────────────────────────────────────────

export type CardState = 'idle' | 'chosen' | 'right' | 'look' | 'tried' | 'dim'

/** Card backgrounds, one per position, so three cards read as three things. */
const TINTS = ['bg-quest-100', 'bg-ocean-100', 'bg-monster-100', 'bg-island-100'] as const

/**
 * A big tappable picture card (the Listen & Play answer). Square, at least
 * 96 px (the layout makes it much bigger), toon-outlined with a ledge. States:
 * `chosen` (pressed, being said), `right` (pops, turns green, ✓), `look` (a
 * gentle wobble: let's look again), `tried` (rests aside, faded: no ✗, never a
 * red "wrong"), `dim` (the others, once the answer is found).
 */
export function PictureCard({
  picture,
  label,
  onPick,
  state = 'idle',
  tint = 0,
  guideId,
  marks,
  disabled = false,
  className = '',
  children,
}: {
  picture: Picture
  /** Accessible name ("7", "seven apples"). */
  label?: string
  onPick?: () => void
  state?: CardState
  /** Background tint by position. */
  tint?: number
  /** `data-guide` id, so the guide can point at this card. */
  guideId?: string
  marks?: GroupMarks
  disabled?: boolean
  className?: string
  /** Extra overlay (a dev marker, a badge). */
  children?: ReactNode
}) {
  const inactive = disabled || state === 'tried' || state === 'dim'
  const counted = marks ? Object.keys(marks).length : 0
  return (
    <button
      type="button"
      data-guide={guideId}
      data-state={state}
      aria-label={label ?? pictureLabel(picture)}
      aria-disabled={inactive || undefined}
      onClick={() => {
        if (!inactive) onPick?.()
      }}
      className={[
        'lp-card relative block min-w-24 min-h-24 aspect-square rounded-[1.75rem]',
        'border-[3px] border-line shadow-ledge',
        'outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70 focus-visible:ring-offset-2',
        state === 'right' ? 'bg-correct-200' : TINTS[tint % TINTS.length],
        inactive ? 'cursor-default' : 'cursor-pointer',
        className,
      ].join(' ')}
    >
      <span className="lp-card-art absolute inset-[9%] pointer-events-none">
        <PictureArt picture={picture} marks={marks} aspect={1} badges={false} />
      </span>
      {counted > 0 && (
        // the running count, big enough to read whatever the group's size
        <span key={counted} className="lp-count-bubble absolute -top-4 -left-4 grid place-items-center w-14 h-14 rounded-full bg-quest-400 border-[3px] border-line shadow-ledge-sm kid-text font-bold text-3xl text-ink-900" aria-hidden="true">
          {counted}
        </span>
      )}
      {state === 'right' && (
        <span className="lp-check absolute -top-3 -right-3 grid place-items-center w-11 h-11 rounded-full bg-correct-500 border-[3px] border-line text-2xl text-ink-900" aria-hidden="true">
          ✓
        </span>
      )}
      {state === 'right' && <Sparkles />}
      {children}
    </button>
  )
}

/** A little burst of stars from the card's middle (CSS-only, runs once). */
function Sparkles() {
  return (
    <span className="lp-sparkles pointer-events-none absolute inset-0" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} className="lp-spark" style={{ ['--a' as string]: `${i * 45 + 20}deg`, ['--d' as string]: `${i % 2 ? 0.08 : 0}s` }}>
          {i % 3 === 0 ? '⭐' : '✨'}
        </span>
      ))}
    </span>
  )
}

// ── the drawings ──────────────────────────────────────────────────────────────

function NumeralArt({ n, className }: { n: number; className: string }) {
  const s = String(n)
  const size = s.length > 2 ? 46 : s.length > 1 ? 66 : 84
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <text
        x={50}
        y={53}
        fontFamily={FONT}
        fontWeight={700}
        fontSize={size}
        textAnchor="middle"
        dominantBaseline="central"
        fill={fillFor(n)}
        stroke={INK}
        strokeWidth={size / 17}
        strokeLinejoin="round"
        paintOrder="stroke fill"
      >
        {s}
      </text>
    </svg>
  )
}

const CELL = 100

function GroupArt({ count, emoji, marks, onObjectTap, aspect, badges, className }: { count: number; emoji: string; marks?: GroupMarks; onObjectTap?: (i: number) => void; aspect: number; badges: boolean; className: string }) {
  const L = groupLayout(count, aspect)
  const pad = 4
  const w = L.cols * CELL + pad * 2
  const h = L.rows * CELL + pad * 2
  const tap = (i: number) => onObjectTap?.(i)
  const key = (e: KeyboardEvent, i: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      tap(i)
    }
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden={onObjectTap ? undefined : true} role={onObjectTap ? 'group' : undefined}>
      {L.cells.map((c, i) => {
        const n = marks?.[i]
        return (
          <g key={i} transform={`translate(${pad + c.x * CELL} ${pad + c.y * CELL})`}>
            <g
              className="lp-obj"
              data-obj={i}
              data-marked={n !== undefined ? '' : undefined}
              role={onObjectTap ? 'button' : undefined}
              tabIndex={onObjectTap ? 0 : undefined}
              aria-label={onObjectTap ? (n !== undefined ? String(n) : 'count') : undefined}
              onClick={onObjectTap ? () => tap(i) : undefined}
              onKeyDown={onObjectTap ? (e) => key(e, i) : undefined}
              style={onObjectTap ? { cursor: 'pointer' } : undefined}
            >
              {/* the whole cell is the tap target (≥ 64 px on the question picture) */}
              <rect x={-CELL / 2} y={-CELL / 2} width={CELL} height={CELL} fill="transparent" />
              <circle className="lp-obj-halo" r={46} />
              <g className="lp-obj-body">
                <text y={5} fontSize={80} textAnchor="middle" dominantBaseline="central">
                  {emoji}
                </text>
              </g>
              {n !== undefined && badges && (
                <g transform="translate(30 32)">
                  <g className="lp-badge">
                    <circle r={17} fill="#ffcf4d" stroke={INK} strokeWidth={4} />
                    <text y={1.5} fontFamily={FONT} fontWeight={700} fontSize={n > 9 ? 18 : 23} textAnchor="middle" dominantBaseline="central" fill={INK}>
                      {n}
                    </text>
                  </g>
                </g>
              )}
            </g>
          </g>
        )
      })}
    </svg>
  )
}

function TenFrameArt({ count, className }: { count: number; className: string }) {
  const frames = Math.max(1, Math.ceil(Math.min(Math.max(count, 0), 20) / 10))
  const cs = 38
  const fw = cs * 5
  const fh = cs * 2
  const gap = 14
  const pad = 6
  const h = frames * fh + (frames - 1) * gap + pad * 2
  return (
    <svg viewBox={`0 0 ${fw + pad * 2} ${h}`} className={className} aria-hidden="true">
      {Array.from({ length: frames }, (_, f) => {
        const y0 = pad + f * (fh + gap)
        return (
          <g key={f}>
            <rect x={pad} y={y0} width={fw} height={fh} rx={6} fill="#fffaf0" stroke={INK} strokeWidth={3.5} />
            {[1, 2, 3, 4].map((k) => (
              <line key={k} x1={pad + k * cs} y1={y0} x2={pad + k * cs} y2={y0 + fh} stroke={INK} strokeWidth={2.5} />
            ))}
            <line x1={pad} y1={y0 + cs} x2={pad + fw} y2={y0 + cs} stroke={INK} strokeWidth={2.5} />
            {Array.from({ length: 10 }, (_, i) => {
              const k = f * 10 + i
              if (k >= count) return null
              return <circle key={i} cx={pad + (i % 5) * cs + cs / 2} cy={y0 + Math.floor(i / 5) * cs + cs / 2} r={cs * 0.34} fill={FILLS[0]} stroke={INK} strokeWidth={3} />
            })}
          </g>
        )
      })}
    </svg>
  )
}

function ShapeArt({ shape, className }: { shape: Extract<Picture, { kind: 'shape' }>['shape']; className: string }) {
  const gid = useId().replace(/:/g, '')
  const stroke = { stroke: INK, strokeWidth: 4, strokeLinejoin: 'round' as const }
  let body: ReactNode
  switch (shape) {
    case 'circle':
      body = <circle cx={50} cy={50} r={36} fill={FILLS[0]} {...stroke} />
      break
    case 'square':
      body = <rect x={16} y={16} width={68} height={68} rx={5} fill={FILLS[3]} {...stroke} />
      break
    case 'triangle':
      body = <polygon points="50,12 90,84 10,84" fill={FILLS[1]} {...stroke} />
      break
    case 'rectangle':
      body = <rect x={8} y={27} width={84} height={46} rx={5} fill={FILLS[2]} {...stroke} />
      break
    case 'hexagon':
      body = <polygon points={poly(6, 39, -Math.PI / 2 + Math.PI / 6)} fill={FILLS[4]} {...stroke} />
      break
    case 'oval':
      body = <ellipse cx={50} cy={50} rx={40} ry={26} fill={FILLS[7]} {...stroke} />
      break
    case 'star':
      body = <polygon points={starPoints(40, 17)} fill={FILLS[1]} {...stroke} />
      break
    case 'cube':
      body = (
        <>
          <polygon points="20,36 36,20 82,20 66,36" fill="#c9e0ff" {...stroke} />
          <polygon points="66,36 82,20 82,66 66,82" fill="#5f8fd9" {...stroke} />
          <rect x={20} y={36} width={46} height={46} fill={FILLS[3]} {...stroke} />
        </>
      )
      break
    case 'sphere':
      body = (
        <>
          <defs>
            <radialGradient id={`${gid}-s`} cx="38%" cy="34%" r="70%">
              <stop offset="0" stopColor="#ffd2c7" />
              <stop offset="0.55" stopColor={FILLS[0]} />
              <stop offset="1" stopColor="#c94c42" />
            </radialGradient>
          </defs>
          <circle cx={50} cy={50} r={36} fill={`url(#${gid}-s)`} {...stroke} />
          <ellipse cx={39} cy={36} rx={9} ry={6} fill="#fff" opacity={0.7} />
        </>
      )
      break
    case 'cone':
      body = (
        <>
          <ellipse cx={50} cy={78} rx={30} ry={9} fill="#d8901f" {...stroke} />
          <path d="M20 78 L50 12 L80 78 A30 9 0 0 1 20 78 Z" fill={FILLS[1]} {...stroke} />
          <path d="M44 30 L34 62" stroke="#fff6cf" strokeWidth={5} strokeLinecap="round" opacity={0.8} />
        </>
      )
      break
    case 'cylinder':
      body = (
        <>
          <path d="M22 24 L22 76 A28 9 0 0 0 78 76 L78 24" fill={FILLS[2]} {...stroke} />
          <ellipse cx={50} cy={24} rx={28} ry={9} fill="#c6f1e4" {...stroke} />
          <path d="M31 38 L31 70" stroke="#fffaf0" strokeWidth={5} strokeLinecap="round" opacity={0.7} />
        </>
      )
      break
  }
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      {body}
    </svg>
  )
}

function poly(n: number, r: number, a0: number, cx = 50, cy = 50): string {
  return Array.from({ length: n }, (_, i) => {
    const a = a0 + (i / n) * Math.PI * 2
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`
  }).join(' ')
}

function starPoints(ro: number, ri: number, cx = 50, cy = 53): string {
  return Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? ri : ro
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`
  }).join(' ')
}

function LetterArt({ ch, className }: { ch: string; className: string }) {
  const code = ch.toLowerCase().charCodeAt(0) - 97
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <rect x={9} y={11} width={82} height={82} rx={18} fill="#ecc28f" stroke={INK} strokeWidth={4} />
      <rect x={9} y={7} width={82} height={80} rx={18} fill="#fdf3dc" stroke={INK} strokeWidth={4} />
      <text
        x={50}
        y={49}
        fontFamily={FONT}
        fontWeight={700}
        fontSize={ch.length > 1 ? 44 : 62}
        textAnchor="middle"
        dominantBaseline="central"
        fill={fillFor(code)}
        stroke={INK}
        strokeWidth={5}
        strokeLinejoin="round"
        paintOrder="stroke fill"
      >
        {ch}
      </text>
    </svg>
  )
}

function WordArt({ text, className }: { text: string; className: string }) {
  const size = Math.min(52, 150 / Math.max(1, text.length) + 12)
  return (
    <svg viewBox="0 0 140 100" className={className} aria-hidden="true">
      <text x={70} y={52} fontFamily={FONT} fontWeight={700} fontSize={size} textAnchor="middle" dominantBaseline="central" fill={INK}>
        {text}
      </text>
    </svg>
  )
}

function ClockArt({ hour, minute, className }: { hour: number; minute: number; className: string }) {
  const mA = (minute / 60) * 360
  const hA = (((hour % 12) + minute / 60) / 12) * 360
  const hand = (deg: number, len: number) => {
    const a = ((deg - 90) * Math.PI) / 180
    return { x2: 50 + Math.cos(a) * len, y2: 50 + Math.sin(a) * len }
  }
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <circle cx={50} cy={50} r={45} fill="#fffaf0" stroke={INK} strokeWidth={4.5} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2
        const big = i % 3 === 0
        const r0 = big ? 35 : 37.5
        return <line key={i} x1={50 + Math.sin(a) * r0} y1={50 - Math.cos(a) * r0} x2={50 + Math.sin(a) * 41} y2={50 - Math.cos(a) * 41} stroke={INK} strokeWidth={big ? 3.5 : 2} strokeLinecap="round" />
      })}
      {[12, 3, 6, 9].map((n) => {
        const a = ((n % 12) / 12) * Math.PI * 2
        return (
          <text key={n} x={50 + Math.sin(a) * 26} y={51 - Math.cos(a) * 26} fontFamily={FONT} fontWeight={700} fontSize={12} textAnchor="middle" dominantBaseline="central" fill={INK}>
            {n}
          </text>
        )
      })}
      <line x1={50} y1={50} {...hand(hA, 20)} stroke={INK} strokeWidth={6.5} strokeLinecap="round" />
      <line x1={50} y1={50} {...hand(mA, 32)} stroke={FILLS[0]} strokeWidth={4.5} strokeLinecap="round" />
      <circle cx={50} cy={50} r={5} fill="#ffcf4d" stroke={INK} strokeWidth={2.5} />
    </svg>
  )
}

/* eslint-disable react-refresh/only-export-components -- shared pieces of the number activities (art, a card, hooks, guide steps); not an HMR boundary */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import type { GuideStep } from '../../../guide/store'
import { guide } from '../../../guide/store'
import { sfx } from '../../../lib/sound'
import { M } from '../../../tutoring/motion/palette'
import type { VoiceRef } from '../../../voice/types'
import type { ListenPhase } from '../types'
import { countLine, tenAndMoreLines } from './numberSpecs'
import '../listenPlay.css'
import './numbers.css'

/**
 * Shared pieces of the number activities (Number Dunes, Ten Frame Plateau):
 * ten-frames that light up dot by dot as they are counted, the big answer
 * card (the Listen & Play card's look), a hook that runs the cards (say the
 * card, judge, the tried card rests aside), and the guide steps for the
 * "a full ten and some more" help. Nothing here has words on it.
 */

const INK = M.ink
const FONT = M.font
const EMOJI_FONT = "'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif"
/** The kit's sticker colours (PictureCard's). */
export const STICKER = ['#f2766b', '#ffcf4d', '#74d3bd', '#8ab8ff', '#b79af0', '#f7a1c4', '#8edb7c', '#ff9f80'] as const
const DOT = STICKER[0]
const FRESH = STICKER[3]

// ── ten-frames ───────────────────────────────────────────────────────────────

const CS = 40
const FW = CS * 5
const FH = CS * 2
const GAP = 16
const PAD = 14

/** Counted things: their number badge (by cell index, 0–19: the first frame's are 0–9). */
export type CellMarks = Readonly<Record<number, number>>

export interface TenFramesProps {
  /** How many counters are in (they fill the first frame first, row by row). */
  count: number
  /** The cell the counters start from: 10 leaves the first frame empty (the ones alone, no ten). */
  start?: 0 | 10
  /** How many frames to draw (default: enough for `count`, at least 1). */
  frames?: 1 | 2
  /** Counted cells: a halo, a pop and a number badge. */
  marks?: CellMarks
  /** A frame lit up as "a full ten!" (its index). */
  glow?: number | null
  /** A counter that just dropped in (drawn in another colour, popping in). */
  fresh?: number | null
  /** A counter hopping away (fading up and out). */
  gone?: number | null
  /** Things instead of dots (an emoji). */
  emoji?: string
  /** Dashed rings where counters should go (the build help, after two misses). */
  ghosts?: number
  /** Each cell a tap target (the build activity). */
  onCellTap?: (cell: number) => void
  className?: string
}

/** One or two ten-frames, one above the other: the full ten on top, the ones below. */
export function TenFrames({ count, start = 0, frames, marks, glow = null, fresh = null, gone = null, emoji, ghosts = 0, onCellTap, className = '' }: TenFramesProps) {
  const n = Math.max(0, Math.min(20 - start, Math.floor(count)))
  const nf = frames ?? (start + n > 10 ? 2 : 1)
  const w = FW + PAD * 2
  const h = nf * FH + (nf - 1) * GAP + PAD * 2
  const key = (e: KeyboardEvent, i: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onCellTap?.(i)
    }
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`block w-full h-full ${className}`} aria-hidden={onCellTap ? undefined : true} role={onCellTap ? 'group' : undefined} data-frames={nf} data-count={n}>
      {Array.from({ length: nf }, (_, f) => {
        const y0 = PAD + f * (FH + GAP)
        return (
          <g key={f} data-frame={f}>
            <rect className="nk-frame-glow" data-on={glow === f ? '' : undefined} x={PAD - 6} y={y0 - 6} width={FW + 12} height={FH + 12} rx={12} fill="#ffe594" stroke="#ffcf4d" strokeWidth={4} />
            <rect x={PAD} y={y0} width={FW} height={FH} rx={7} fill="#fffaf0" stroke={INK} strokeWidth={3.5} />
            {[1, 2, 3, 4].map((k) => (
              <line key={k} x1={PAD + k * CS} y1={y0} x2={PAD + k * CS} y2={y0 + FH} stroke={INK} strokeWidth={2.5} />
            ))}
            <line x1={PAD} y1={y0 + CS} x2={PAD + FW} y2={y0 + CS} stroke={INK} strokeWidth={2.5} />
            {Array.from({ length: 10 }, (_, c) => {
              const i = f * 10 + c
              const cx = PAD + (c % 5) * CS + CS / 2
              const cy = y0 + Math.floor(c / 5) * CS + CS / 2
              const filled = i >= start && i < start + n
              const m = marks?.[i]
              const tap = onCellTap ? () => onCellTap(i) : undefined
              return (
                <g
                  key={c}
                  transform={`translate(${cx} ${cy})`}
                  className="lp-obj"
                  data-cell={i}
                  data-filled={filled ? '' : undefined}
                  data-marked={m !== undefined ? '' : undefined}
                  role={tap ? 'button' : undefined}
                  tabIndex={tap ? 0 : undefined}
                  aria-label={tap ? (filled ? 'take out' : 'put in') : undefined}
                  onClick={tap}
                  onKeyDown={tap ? (e) => key(e, i) : undefined}
                  style={tap ? { cursor: 'pointer' } : undefined}
                >
                  {tap && <rect x={-CS / 2} y={-CS / 2} width={CS} height={CS} fill="transparent" />}
                  {!filled && i >= start && i < start + n + ghosts && <circle data-ghost="" r={CS * 0.3} fill="none" stroke={INK} strokeOpacity={0.35} strokeWidth={2.5} strokeDasharray="5 4" />}
                  {filled && (
                    <>
                      <circle className="lp-obj-halo" r={CS * 0.47} />
                      <g className={`lp-obj-body ${i === fresh ? 'nk-fresh' : ''} ${i === gone ? 'nk-gone' : ''}`}>
                        {emoji ? (
                          <text y={2} fontSize={CS * 0.74} fontFamily={EMOJI_FONT} textAnchor="middle" dominantBaseline="central">
                            {emoji}
                          </text>
                        ) : (
                          <circle r={CS * 0.33} fill={i === fresh ? FRESH : DOT} stroke={INK} strokeWidth={3} />
                        )}
                      </g>
                      {m !== undefined && (
                        <g transform={`translate(${CS * 0.3} ${-CS * 0.3})`}>
                          <g className="lp-badge">
                            <circle r={CS * 0.24} fill="#ffcf4d" stroke={INK} strokeWidth={2.2} />
                            <text y={0.8} fontFamily={FONT} fontWeight={700} fontSize={m > 9 ? CS * 0.25 : CS * 0.3} textAnchor="middle" dominantBaseline="central" fill={INK}>
                              {m}
                            </text>
                          </g>
                        </g>
                      )}
                    </>
                  )}
                </g>
              )
            })}
            {glow === f && (
              // "a full ten": a big 10 on the frame's corner
              <g transform={`translate(${PAD + FW - 4} ${y0 + 4})`}>
                <g className="lp-badge">
                  <circle r={16} fill="#ffcf4d" stroke={INK} strokeWidth={3} />
                  <text y={1} fontFamily={FONT} fontWeight={700} fontSize={17} textAnchor="middle" dominantBaseline="central" fill={INK}>
                    10
                  </text>
                </g>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/** A big numeral (the kit's numeral sticker: pastel fill, ink outline). */
export function Numeral({ n, className = '' }: { n: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`block w-full h-full ${className}`} aria-hidden="true">
      <NumeralGlyph n={n} />
    </svg>
  )
}

/** The numeral alone, for a 100 × 100 box inside another drawing. */
export function NumeralGlyph({ n }: { n: number }) {
  const s = String(n)
  const size = s.length > 1 ? 66 : 84
  return (
    <text x={50} y={53} fontFamily={FONT} fontWeight={700} fontSize={size} textAnchor="middle" dominantBaseline="central" fill={STICKER[((n % 8) + 8) % 8]} stroke={INK} strokeWidth={size / 17} strokeLinejoin="round" paintOrder="stroke fill">
      {s}
    </text>
  )
}

/** An emoji picture, centred. */
export function EmojiArt({ emoji, className = '' }: { emoji: string; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`block w-full h-full ${className}`} aria-hidden="true">
      <text x={50} y={53} fontSize={74} fontFamily={EMOJI_FONT} textAnchor="middle" dominantBaseline="central">
        {emoji}
      </text>
    </svg>
  )
}

// ── the answer card ──────────────────────────────────────────────────────────

export type CardState = 'idle' | 'chosen' | 'right' | 'look' | 'tried' | 'dim'
const TINTS = ['bg-quest-100', 'bg-ocean-100', 'bg-monster-100', 'bg-island-100'] as const

/**
 * A big tappable answer card, the Listen & Play card's look and states
 * (`lp-card`): chosen, right (a pop and ✓), look (a gentle wobble), tried
 * (rests aside, faded), dim. Its art fills it. In dev builds the right one
 * carries the `[data-correct]` marker the playthrough bot answers from.
 */
export function NumberCard({
  guideId,
  label,
  state,
  tint = 0,
  right,
  disabled,
  onPick,
  className = '',
  children,
}: {
  guideId: string
  label: string
  state: CardState
  tint?: number
  /** This card is the answer (the dev-only marker). */
  right: boolean
  disabled: boolean
  onPick: () => void
  className?: string
  children: ReactNode
}) {
  const inactive = disabled || state === 'tried' || state === 'dim'
  return (
    <button
      type="button"
      data-guide={guideId}
      data-state={state}
      aria-label={label}
      aria-disabled={inactive || undefined}
      onClick={() => {
        if (!inactive) onPick()
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
      <span className="absolute inset-[9%] pointer-events-none">{children}</span>
      {state === 'right' && (
        <span className="lp-check absolute -top-3 -right-3 grid place-items-center w-11 h-11 rounded-full bg-correct-500 border-[3px] border-line text-2xl text-ink-900" aria-hidden="true">
          ✓
        </span>
      )}
      {import.meta.env.DEV && right && <span data-correct="" hidden />}
    </button>
  )
}

// ── the cards, run ───────────────────────────────────────────────────────────

export interface ChoiceCard {
  value: string | number
  speech: VoiceRef
}

/**
 * Runs a row of answer cards inside an activity, the way the shell runs its
 * own: a tap says the card's name, then it is judged (right → `onAttempt(true)`;
 * not yet → it wobbles while we look again, then rests aside, and the child
 * tries the others). Taps wait while a card is being said.
 */
export function useChoice({
  cards,
  answer,
  active,
  phase,
  onAttempt,
}: {
  cards: readonly ChoiceCard[]
  answer: string | number
  active: boolean
  phase: ListenPhase
  onAttempt(correct: boolean): void
}) {
  const [tried, setTried] = useState<number[]>([])
  const [picked, setPicked] = useState<number | null>(null)
  const [right, setRight] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  // (a second tap before the first one's re-render must see it too)
  const busyNow = useRef(false)
  const live = useRef({ active, onAttempt })
  useLayoutEffect(() => {
    live.current = { active, onAttempt }
  })
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const pick = useCallback(
    async (i: number) => {
      if (!active || busyNow.current || right !== null || tried.includes(i) || !cards[i]) return
      busyNow.current = true
      setBusy(true)
      setPicked(i)
      sfx.pop()
      await guide.say(cards[i].speech)
      busyNow.current = false
      if (!mounted.current) return
      setBusy(false)
      // (a "Quit?" opened while it was said: as if it was never tapped)
      if (!live.current.active) {
        setPicked(null)
        return
      }
      if (cards[i].value === answer) {
        setRight(i)
        live.current.onAttempt(true)
      } else {
        setTried((t) => [...t, i])
        live.current.onAttempt(false)
      }
    },
    [active, right, tried, cards, answer],
  )

  const stateOf = (i: number): CardState => {
    if (right === i) return 'right'
    if (tried.includes(i)) return phase === 'oops' && picked === i ? 'look' : 'tried'
    if (busy && picked === i) return 'chosen'
    if (right !== null) return 'dim'
    return 'idle'
  }
  /** The cards still in play. */
  const open = cards.map((_, i) => i).filter((i) => !tried.includes(i))
  return { pick, stateOf, open, tried, picked, right, busy }
}

export const nkCard = (i: number) => `lp-card-${i}`

// ── guide steps ──────────────────────────────────────────────────────────────

/**
 * Point at the cards still in play, a hand gliding along them (never the
 * answer alone): after the question, as a quiet line of its own (`after`),
 * or on a phrase of the question (`cue`).
 */
export function sweepCards(open: readonly number[], at: { after: true } | { cue: string | number } = { after: true }): GuideStep {
  const step: GuideStep = { target: open.length === 1 ? nkCard(open[0]) : open.map(nkCard), hand: open.length === 1 ? 'tap' : 'sweep', pad: 12 }
  return 'cue' in at ? { ...step, cue: at.cue } : { voice: null, ...step }
}

/**
 * "A full ten!" (the ten's frame lit), then each one more counted on
 * ("Eleven! Twelve! Thirteen!", each lighting as it is said), then "Ten and
 * three more: thirteen." For 20: both tens, then "Two full tens: twenty!"
 * `onTen(frame)` and `onOne(cell, number)` light them up.
 */
export function tenAndMoreSteps(n: number, target: string, onTen: (frame: number) => void, onOne: (cell: number, number: number) => void): GuideStep[] {
  const lines = tenAndMoreLines(n)
  const last = lines.length - 1
  return lines.map((voice, i): GuideStep => {
    const step = { voice, target, hand: false as const, pad: 6 }
    if (i === last) return { ...step, pause: 0.4 }
    // the first full ten, and for twenty the second
    if (i === 0 || n >= 20) return { ...step, pause: 0.35, events: [{ char: 0, run: () => onTen(i) }] }
    // eleven, twelve, …: the ones, each lit as it is said
    const k = 10 + i
    return { ...step, pause: 0.12, events: [{ char: 0, run: () => onOne(k - 1, k) }] }
  })
}

export { countLine }

/** A promise that waits (the help's little pauses). */
export const nap = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

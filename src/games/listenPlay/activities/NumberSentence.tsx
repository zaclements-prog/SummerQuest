/* eslint-disable react-refresh/only-export-components -- an activity module exports its definition (component + askSteps) for the registry; not an HMR boundary */
import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import type { GuideStep } from '../../../guide/store'
import { guide } from '../../../guide/store'
import { sfx } from '../../../lib/sound'
import { M } from '../../../tutoring/motion/palette'
import { COUNT_MAX } from '../../../voice/packs/listen'
import type { VoiceRef } from '../../../voice/types'
import type { ListenActivityDef, ListenActivityProps, ListenProblem } from '../types'
import { NumberCard, Numeral, nkCard, useChoice, type ChoiceCard } from './numberKit'
import { NS_MODEL, NS_SENTENCE, actTaps, type FactModel, type HelpDo, type NumberSentenceSpec, type SentenceToken } from './numberSentenceSpec'
import './numberSentence.css'

/**
 * The `numberSentence` activity (1st grade: Adding Mesa and Take-Away Dunes,
 * 1.OA.3–8): a number sentence written big ("8 + 5 = ?"), a picture of a
 * strategy under it, and three numeral cards.
 *
 *   "What is 8 plus 3?" — the sentence lights up;
 *   "Start with the bigger number. Count on!" — the picture lights up: a box
 *   with 8 in it and three dots;
 *   "Tap each dot to count on!" — each tap says the next number ("nine!",
 *   "ten!", "eleven!") and writes it on the dot; then the cards open.
 *
 * The pictures (see ./numberSentenceSpec): count on, two rows (doubles, near
 * doubles, turn-around facts), make ten (two ten-frames: tap a counter to
 * move it into the first), take away (tap a counter to cross it out), count
 * back (tap the frog: it hops back a stone), the missing part (tap an empty
 * spot to fill it, counting up), and a fact-family house. A stage's first
 * questions are acted out before the cards open (`act`); later the picture
 * is there to tap if it helps.
 *
 * A right card writes its number into the sentence ("8 + 3 = 11"). A wrong
 * card wobbles ("let's look again"), gets its word ("Count on from the next
 * number…"), then the help: the strategy done slowly, line by line, the
 * picture doing what the voice says (the dots counted on, two counters
 * moving into the ten, the frog hopping back), ending on the fact ("Eight
 * and three make eleven."). The tried card rests aside; the question is
 * asked again. No timers, no failing out. The only words on screen are the
 * numbers and signs being taught.
 *
 * Guide ids: `ns-sentence`, `ns-model`, and the cards' `lp-card-<i>`.
 */

const INK = M.ink
const FONT = M.font
/** The kit's sticker colours: the counters we have, the ones that move or are added, the gold of "look here". */
const RED = '#f2766b'
const BLUE = '#8ab8ff'
const GOLD = '#ffcf4d'
const PAPER = '#fffaf0'

const say = (n: number): VoiceRef => ({ template: 'listen/number', slots: { n } })
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// ── the model's state ────────────────────────────────────────────────────────

type LitPart = Extract<HelpDo, { kind: 'light' }>['part']

interface ModelState {
  /** Things done on the model: dots counted on, counters moved into the ten, hops back, spots filled. */
  done: number
  /** Take away: the counters taken (by index), in the order taken. */
  taken: number[]
  /** Count-along badges: counter `i` (reading order) → its number. */
  marks: Record<number, number>
  /** Rows: swapped (a turn-around). */
  turned: boolean
  /** What the voice is talking about. */
  lit: LitPart | null
  /** The child may act the strategy out now (the cards wait). */
  acting: boolean
  /** The question is asked: the cards can be tapped (and the picture used). */
  open: boolean
  solved: boolean
  /** Bumps when the help starts the picture over (its pop-ins play again). */
  gen: number
}

type Action =
  | { type: 'reset' }
  | { type: 'act' }
  | { type: 'open' }
  | { type: 'solve' }
  | { type: 'step'; max: number }
  | { type: 'take'; i: number; max: number }
  | { type: 'mark'; i: number }
  | { type: 'help'; do: HelpDo; model: FactModel }
  | { type: 'unlight' }

const FRESH: ModelState = { done: 0, taken: [], marks: {}, turned: false, lit: null, acting: false, open: false, solved: false, gen: 0 }

function reducer(s: ModelState, a: Action): ModelState {
  switch (a.type) {
    case 'reset':
      return { ...s, done: 0, taken: [], marks: {}, turned: false, lit: null, gen: s.gen + 1 }
    case 'act':
      return s.open ? s : { ...s, acting: true }
    case 'open':
      return { ...s, open: true, acting: false }
    case 'solve':
      return { ...s, solved: true, lit: null }
    case 'step':
      return s.done >= a.max ? s : { ...s, done: s.done + 1 }
    case 'take':
      return s.taken.includes(a.i) || s.taken.length >= a.max ? s : { ...s, taken: [...s.taken, a.i] }
    case 'mark':
      return s.marks[a.i] !== undefined ? s : { ...s, marks: { ...s.marks, [a.i]: Object.keys(s.marks).length + 1 } }
    case 'unlight':
      return { ...s, lit: null }
    case 'help': {
      const d = a.do
      switch (d.kind) {
        case 'light':
          return { ...s, lit: d.part }
        case 'dot':
          return { ...s, done: Math.max(s.done, d.i + 1), lit: null }
        case 'count':
          return { ...s, marks: { ...(d.i === 0 ? {} : s.marks), [d.i]: d.n }, lit: null }
        case 'turn':
          return { ...s, turned: !s.turned, lit: 'model' }
        case 'move':
        case 'fill':
          return { ...s, done: d.n, lit: null }
        case 'take': {
          const whole = a.model.kind === 'takeAway' ? a.model.whole : 0
          return { ...s, taken: Array.from({ length: d.n }, (_, k) => whole - 1 - k), lit: null }
        }
        case 'hop': {
          const start = a.model.kind === 'countBack' ? a.model.start : 0
          return { ...s, done: start - d.to, lit: null }
        }
        case 'solve':
          return { ...s, solved: true }
      }
    }
  }
}

// ── how the question is put (askSteps: it only gets the problem) ─────────────

/** Where each question is up to: asked, acted out. */
const progress = new WeakMap<object, { told: boolean; acted: boolean }>()
/** The live component's hands on its picture, for the question's lines. */
interface Controls {
  act(): void
  open(): void
  openCards(): number[]
}
const controls = new WeakMap<object, Controls>()

function progressOf(p: ListenProblem) {
  let at = progress.get(p)
  if (!at) {
    at = { told: false, acted: false }
    progress.set(p, at)
  }
  return at
}

function openStep(p: ListenProblem, spec: NumberSentenceSpec): GuideStep {
  const open = controls.get(p)?.openCards() ?? spec.cards.map((_, i) => i)
  return {
    voice: null,
    target: open.length === 1 ? nkCard(open[0]) : open.map(nkCard),
    hand: open.length === 1 ? 'tap' : 'sweep',
    pad: 12,
    events: [{ char: 0, run: () => controls.get(p)?.open() }],
  }
}

function actStep(p: ListenProblem, spec: NumberSentenceSpec): GuideStep {
  return { voice: spec.act!, target: NS_MODEL, hand: 'tap', pad: 8, events: [{ char: 0, run: () => controls.get(p)?.act() }] }
}

function sentenceAskSteps(p: ListenProblem, spec: NumberSentenceSpec): GuideStep[] {
  const at = progress.get(p)
  const ask: GuideStep = { voice: spec.ask, target: NS_SENTENCE, hand: false, pad: 10 }
  if (!at?.told) {
    const hint: GuideStep[] = spec.hint ? [{ voice: spec.hint, target: NS_MODEL, hand: false, pad: 8 }] : []
    return [ask, ...hint, spec.act ? actStep(p, spec) : openStep(p, spec)]
  }
  if (spec.act && !at.acted) return [actStep(p, spec)]
  return [ask, openStep(p, spec)]
}

// ── layout (px in the picture's own box) ─────────────────────────────────────

interface Pt {
  x: number
  y: number
}

/** One or two ten-frames, side by side or one over the other (whichever draws the cells bigger), centred in `w` × `h`. */
function framesLayout(n: 1 | 2, w: number, h: number): { c: number; origins: Pt[] } {
  const m = 0.35
  if (n === 1) {
    const c = Math.min(w / (5 + 2 * m), h / (2 + 2 * m), 120)
    return { c, origins: [{ x: (w - 5 * c) / 2, y: (h - 2 * c) / 2 }] }
  }
  const gap = 0.7
  const side = Math.min(w / (10 + gap + 2 * m), h / (2 + 2 * m), 110)
  const stack = Math.min(w / (5 + 2 * m), h / (4 + gap + 2 * m), 110)
  if (side >= stack) {
    const c = side
    const x0 = (w - (10 + gap) * c) / 2
    const y0 = (h - 2 * c) / 2
    return { c, origins: [{ x: x0, y: y0 }, { x: x0 + (5 + gap) * c, y: y0 }] }
  }
  const c = stack
  const x0 = (w - 5 * c) / 2
  const y0 = (h - (4 + gap) * c) / 2
  return { c, origins: [{ x: x0, y: y0 }, { x: x0, y: y0 + (2 + gap) * c }] }
}

/** The centre of cell `k` (0–19: the first frame's are 0–9). */
function cellAt(L: { c: number; origins: Pt[] }, k: number): Pt {
  const f = Math.min(L.origins.length - 1, Math.floor(k / 10))
  const j = k % 10
  const o = L.origins[f]
  return { x: o.x + ((j % 5) + 0.5) * L.c, y: o.y + (Math.floor(j / 5) + 0.5) * L.c }
}

// ── drawing pieces ───────────────────────────────────────────────────────────

function FrameGrid({ o, c, glow }: { o: Pt; c: number; glow?: boolean }) {
  return (
    <g>
      <rect className="ns-lit" data-on={glow ? '' : undefined} x={o.x - c * 0.14} y={o.y - c * 0.14} width={c * 5.28} height={c * 2.28} rx={c * 0.24} fill="#ffe594" stroke={GOLD} strokeWidth={4} />
      <rect x={o.x} y={o.y} width={c * 5} height={c * 2} rx={c * 0.14} fill={PAPER} stroke={INK} strokeWidth={3.5} />
      {[1, 2, 3, 4].map((k) => (
        <line key={k} x1={o.x + k * c} y1={o.y} x2={o.x + k * c} y2={o.y + 2 * c} stroke={INK} strokeWidth={2.5} />
      ))}
      <line x1={o.x} y1={o.y + c} x2={o.x + 5 * c} y2={o.y + c} stroke={INK} strokeWidth={2.5} />
    </g>
  )
}

/** A counter (a sticker dot), with an optional number badge. */
function Counter({ at, c, fill, badge, pop, popKey }: { at: Pt; c: number; fill: string; badge?: number; pop?: boolean; popKey?: string }) {
  return (
    <g transform={`translate(${at.x} ${at.y})`}>
      <g key={popKey} className={pop ? 'ns-pop' : undefined}>
        <circle r={c * 0.34} fill={fill} stroke={INK} strokeWidth={3} />
      </g>
      {badge !== undefined && <Badge x={c * 0.28} y={-c * 0.28} r={c * 0.22} n={badge} />}
    </g>
  )
}

function Badge({ x, y, r, n }: { x: number; y: number; r: number; n: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="lp-badge">
        <circle r={r} fill={GOLD} stroke={INK} strokeWidth={2.4} />
        <text y={r * 0.06} fontFamily={FONT} fontWeight={700} fontSize={n > 9 ? r * 1.05 : r * 1.3} textAnchor="middle" dominantBaseline="central" fill={INK}>
          {n}
        </text>
      </g>
    </g>
  )
}

/** A big number in the kit's sticker style, centred at (x, y), `size` px tall. */
function Big({ x, y, size, n, fill = INK }: { x: number; y: number; size: number; n: number | string; fill?: string }) {
  return (
    <text x={x} y={y} fontFamily={FONT} fontWeight={700} fontSize={size} textAnchor="middle" dominantBaseline="central" fill={fill} stroke={INK} strokeWidth={fill === INK ? 0 : size / 18} strokeLinejoin="round" paintOrder="stroke fill">
      {n}
    </text>
  )
}

/** A tap target (an invisible square over a thing), keyboard-friendly. */
function Tap({ at, size, label, onTap, ring }: { at: Pt; size: number; label: string; onTap: () => void; ring?: boolean }) {
  const key = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onTap()
    }
  }
  return (
    <g className="ns-tap" data-ns-tap="" role="button" tabIndex={0} aria-label={label} onClick={onTap} onKeyDown={key}>
      {ring && <circle className="ns-ring" cx={at.x} cy={at.y} r={size * 0.46} fill="none" stroke={GOLD} strokeWidth={4} />}
      <rect x={at.x - size / 2} y={at.y - size / 2} width={size} height={size} fill="transparent" />
    </g>
  )
}

// ── the sentence ─────────────────────────────────────────────────────────────

const TOKEN_H = 140
const tokenW = (t: SentenceToken) => (t === '?' ? 120 : typeof t === 'number' ? 64 * String(t).length + 16 : 76)

/** A number sentence as SVG pieces from `x` (font 110 units): numbers, signs and the unknown's box. Returns its width. */
function sentencePieces(tokens: readonly SentenceToken[], x0: number, y: number, answer: number, solved: boolean, dim = false): { nodes: ReactNode[]; width: number } {
  const nodes: ReactNode[] = []
  let x = x0
  tokens.forEach((t, i) => {
    const w = tokenW(t)
    const cx = x + w / 2
    if (t === '?') {
      nodes.push(
        <g key={i} className="ns-box" data-solved={solved ? '' : undefined}>
          <rect x={x + 6} y={y - 58} width={w - 12} height={116} rx={18} fill={solved ? '#d6f5c9' : '#fff3c4'} stroke={INK} strokeWidth={5} strokeDasharray={solved ? undefined : '14 10'} />
          {solved ? (
            <g className="ns-answer">
              <Big x={cx} y={y + 4} size={answer > 9 ? 84 : 100} n={answer} fill="#74d3bd" />
            </g>
          ) : (
            <text x={cx} y={y + 4} fontFamily={FONT} fontWeight={700} fontSize={80} textAnchor="middle" dominantBaseline="central" fill={INK} opacity={0.45}>
              ?
            </text>
          )}
        </g>,
      )
    } else {
      nodes.push(
        <text key={i} x={cx} y={y + 4} fontFamily={FONT} fontWeight={700} fontSize={110} textAnchor="middle" dominantBaseline="central" fill={INK} opacity={dim ? 0.55 : 1}>
          {t}
        </text>,
      )
    }
    x += w
  })
  return { nodes, width: x - x0 }
}

function SentenceArt({ spec, solved }: { spec: NumberSentenceSpec; solved: boolean }) {
  const gap = 110
  const given = spec.given ? sentencePieces(spec.given, 0, TOKEN_H / 2, spec.answer, true, true) : null
  const asked = sentencePieces(spec.sentence, given ? given.width + gap : 0, TOKEN_H / 2, spec.answer, solved)
  const w = (given ? given.width + gap : 0) + asked.width
  return (
    <svg viewBox={`-10 0 ${w + 20} ${TOKEN_H}`} className="block w-full h-full" role="img" aria-label={[spec.given, spec.sentence].filter(Boolean).map((s) => s!.join(' ')).join(', ')}>
      {given && (
        <g>
          {given.nodes}
          {/* a little turn-around arrow between the two sentences */}
          <path d={`M ${given.width + 22} ${TOKEN_H / 2 + 26} Q ${given.width + gap / 2} ${TOKEN_H / 2 - 40} ${given.width + gap - 22} ${TOKEN_H / 2 + 26}`} fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" opacity={0.55} />
          <path d={`M ${given.width + gap - 38} ${TOKEN_H / 2 + 14} L ${given.width + gap - 20} ${TOKEN_H / 2 + 30} L ${given.width + gap - 14} ${TOKEN_H / 2 + 8}`} fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" opacity={0.55} />
        </g>
      )}
      {asked.nodes}
    </svg>
  )
}

// ── the pictures ─────────────────────────────────────────────────────────────

interface ArtProps {
  spec: NumberSentenceSpec
  st: ModelState
  w: number
  h: number
  /** A tap now does something (acting it out, or the picture as a help once the cards are open). */
  live: boolean
  /** Acting it out: the things to tap pulse. */
  acting: boolean
  onStep(): void
  onTake(i: number): void
  onMark(i: number): void
}

function CountOnArt({ spec, st, w, h, live, acting, onStep }: ArtProps) {
  const m = spec.model as Extract<FactModel, { kind: 'countOn' }>
  const units = 1.9 + 0.55 + m.on * 1.2 + 0.4
  const c = Math.min(w / units, h / 2.3, 130)
  const x0 = (w - (units - 0.4) * c) / 2
  const cy = h / 2 + c * 0.12
  const box = { x: x0, y: cy - c * 0.95, w: c * 1.9, h: c * 1.9 }
  const dotX = (i: number) => x0 + c * (1.9 + 0.55) + i * c * 1.2 + c * 0.5
  const next = st.done
  return (
    <g>
      {/* the start in its box */}
      <rect className="ns-lit" data-on={st.lit === 'start' || st.lit === 'model' ? '' : undefined} x={box.x - 10} y={box.y - 10} width={box.w + 20} height={box.h + 20} rx={c * 0.36} fill="#ffe594" stroke={GOLD} strokeWidth={4} />
      <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={c * 0.3} fill="#fde7c8" stroke={INK} strokeWidth={4} />
      <Big x={box.x + box.w / 2} y={box.y + box.h / 2 + 2} size={c * (m.start > 9 ? 1.05 : 1.25)} n={m.start} fill={RED} />
      {/* an arc from the box to the dots: count on from here */}
      <path d={`M ${box.x + box.w * 0.7} ${box.y - 4} Q ${box.x + box.w + c * 0.45} ${box.y - c * 0.6} ${dotX(0) - c * 0.1} ${cy - c * 0.52}`} fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" strokeDasharray="8 8" opacity={0.45} />
      {Array.from({ length: m.on }, (_, i) => {
        const at = { x: dotX(i), y: cy }
        const counted = i < st.done
        return (
          <g key={i} data-dot={i} data-counted={counted ? '' : undefined}>
            <g transform={`translate(${at.x} ${at.y})`}>
              <g key={`${st.gen}-${counted}`} className={counted ? 'ns-pop' : undefined}>
                <circle r={c * 0.42} fill={counted ? BLUE : '#dfeaff'} stroke={INK} strokeWidth={3.5} />
                {counted && <Big x={0} y={2} size={c * (m.start + i + 1 > 9 ? 0.46 : 0.56)} n={m.start + i + 1} />}
              </g>
            </g>
            {live && i === next && <Tap at={at} size={c * 1.05} label="count on" onTap={onStep} ring={acting} />}
          </g>
        )
      })}
    </g>
  )
}

function RowsArt({ spec, st, w, h, live, onMark }: ArtProps) {
  const m = spec.model as Extract<FactModel, { kind: 'rows' }>
  const most = Math.max(m.top, m.bottom)
  const c = Math.min(w / (most * 1.14 + 0.8), h / (2 * 1.35 + 0.7), 110)
  const step = c * 1.14
  const rowY = [h / 2 - c * 0.68, h / 2 + c * 0.68]
  const x0 = (w - most * step) / 2 + step / 2
  // turned: the rows swap places (the counters slide)
  const yOf = (row: 0 | 1) => rowY[st.turned ? 1 - row : row]
  const rows: { row: 0 | 1; n: number; fill: string }[] = [
    { row: 0, n: m.top, fill: RED },
    { row: 1, n: m.bottom, fill: BLUE },
  ]
  // reading order (top row first, as they are shown now)
  const order = st.turned ? [rows[1], rows[0]] : rows
  const indexOf = (row: 0 | 1, k: number) => (order[0].row === row ? k : order[0].n + k)
  const near = !m.turn && m.bottom === m.top + 1
  return (
    <g>
      <rect className="ns-lit" data-on={st.lit === 'model' ? '' : undefined} x={x0 - step / 2 - 8} y={rowY[0] - c * 0.62} width={most * step + 16} height={rowY[1] - rowY[0] + c * 1.24} rx={c * 0.3} fill="#ffe594" />
      {rows.map(({ row, n, fill }) => (
        <g key={row} className="ns-slide" style={{ transform: `translateY(${yOf(row)}px)` }}>
          <rect x={x0 - step / 2} y={-c * 0.52} width={n * step} height={c * 1.04} rx={c * 0.52} fill={fill} opacity={0.18} />
          {Array.from({ length: n }, (_, k) => {
            const at = { x: x0 + k * step, y: 0 }
            const i = indexOf(row, k)
            const extra = near && row === 1 && k === n - 1
            return (
              <g key={k} data-counter={i}>
                {extra && <circle className="ns-lit" data-on={st.lit === 'extra' ? '' : undefined} cx={at.x} cy={0} r={c * 0.56} fill="#ffe594" stroke={GOLD} strokeWidth={5} />}
                <Counter at={at} c={c} fill={fill} badge={st.marks[i]} />
                {live && <Tap at={at} size={step} label={st.marks[i] !== undefined ? String(st.marks[i]) : 'count'} onTap={() => onMark(i)} />}
              </g>
            )
          })}
        </g>
      ))}
    </g>
  )
}

function MakeTenArt({ spec, st, w, h, live, acting, onStep }: ArtProps) {
  const m = spec.model as Extract<FactModel, { kind: 'makeTen' }>
  const L = framesLayout(2, w, h)
  const moved = st.done
  const full = m.a + moved >= 10
  const restB = m.b - moved
  return (
    <g>
      <FrameGrid o={L.origins[0]} c={L.c} glow={full || st.lit === 'first' || st.lit === 'model'} />
      <FrameGrid o={L.origins[1]} c={L.c} glow={st.lit === 'model'} />
      {Array.from({ length: m.a + moved }, (_, k) => (
        <Counter key={`a${k}`} at={cellAt(L, k)} c={L.c} fill={k < m.a ? RED : BLUE} pop={k >= m.a} popKey={`${st.gen}`} />
      ))}
      {Array.from({ length: restB }, (_, k) => {
        const at = cellAt(L, 10 + k)
        return (
          <g key={`b${k}`}>
            <Counter at={at} c={L.c} fill={BLUE} />
            {live && !full && <Tap at={at} size={L.c} label="move into the ten" onTap={onStep} ring={acting} />}
          </g>
        )
      })}
      {full && <Badge x={L.origins[0].x + 5 * L.c} y={L.origins[0].y} r={L.c * 0.36} n={10} />}
    </g>
  )
}

function TakeAwayArt({ spec, st, w, h, live, acting, onTake }: ArtProps) {
  const m = spec.model as Extract<FactModel, { kind: 'takeAway' }>
  const L = framesLayout(m.whole > 10 ? 2 : 1, w, h)
  const left = Array.from({ length: m.whole }, (_, k) => k).filter((k) => !st.taken.includes(k))
  const canTake = live && st.taken.length < m.take
  return (
    <g>
      {L.origins.map((o, f) => (
        <FrameGrid key={f} o={o} c={L.c} glow={st.lit === 'model'} />
      ))}
      {Array.from({ length: m.whole }, (_, k) => {
        const at = cellAt(L, k)
        if (st.taken.includes(k)) {
          // taken: it lifts away, leaving a crossed-out ring
          const r = L.c * 0.3
          return (
            <g key={`${k}-gone-${st.gen}`} data-taken="">
              <g transform={`translate(${at.x} ${at.y})`}>
                <g className="ns-gone">
                  <circle r={L.c * 0.34} fill={RED} stroke={INK} strokeWidth={3} />
                </g>
                <circle r={r} fill="none" stroke={INK} strokeOpacity={0.4} strokeWidth={2.5} strokeDasharray="5 4" />
                <path d={`M ${-r * 0.6} ${-r * 0.6} L ${r * 0.6} ${r * 0.6} M ${r * 0.6} ${-r * 0.6} L ${-r * 0.6} ${r * 0.6}`} stroke={INK} strokeOpacity={0.55} strokeWidth={4} strokeLinecap="round" />
              </g>
            </g>
          )
        }
        const i = left.indexOf(k)
        return (
          <g key={k} data-counter={k}>
            <Counter at={at} c={L.c} fill={RED} badge={st.marks[i]} />
            {canTake && <Tap at={at} size={L.c} label="take away" onTap={() => onTake(k)} ring={acting} />}
          </g>
        )
      })}
    </g>
  )
}

function CountBackArt({ spec, st, w, h, live, acting, onStep }: ArtProps) {
  const m = spec.model as Extract<FactModel, { kind: 'countBack' }>
  const lo = Math.max(0, m.start - m.back - 1)
  const hi = Math.min(20, m.start + 1)
  const n = hi - lo + 1
  const c = Math.min(w / (n * 1.12 + 0.4), h / 2.5, 120)
  const step = c * 1.12
  const x0 = (w - n * step) / 2 + step / 2
  const stoneY = h / 2 + c * 0.55
  const xOf = (v: number) => x0 + (v - lo) * step
  const at = m.start - st.done
  const frog = { x: xOf(at), y: stoneY - c * 0.95 }
  const canHop = live && st.done < m.back
  return (
    <g>
      {Array.from({ length: n }, (_, k) => {
        const v = lo + k
        const passed = v < m.start && v >= at
        return (
          <g key={v} data-stone={v}>
            <rect className="ns-lit" data-on={(st.lit === 'start' && v === m.start) || (st.lit === 'model' && v <= m.start && v >= m.start - m.back) ? '' : undefined} x={xOf(v) - c * 0.56} y={stoneY - c * 0.46} width={c * 1.12} height={c * 0.92} rx={c * 0.3} fill="#ffe594" />
            <ellipse cx={xOf(v)} cy={stoneY} rx={c * 0.48} ry={c * 0.38} fill={v === m.start ? '#fde7c8' : passed ? '#dcebff' : '#e9e4dc'} stroke={INK} strokeWidth={3.5} />
            <Big x={xOf(v)} y={stoneY + 2} size={c * (v > 9 ? 0.42 : 0.5)} n={v} />
          </g>
        )
      })}
      {/* the hops so far: arcs from stone to stone */}
      {Array.from({ length: st.done }, (_, k) => {
        const from = xOf(m.start - k)
        const to = xOf(m.start - k - 1)
        return <path key={`hop${k}-${st.gen}`} className="ns-pop" d={`M ${from} ${stoneY - c * 0.42} Q ${(from + to) / 2} ${stoneY - c * 1.35} ${to} ${stoneY - c * 0.42}`} fill="none" stroke="#36c35a" strokeWidth={5} strokeLinecap="round" />
      })}
      <g className="ns-slide" style={{ transform: `translate(${frog.x}px, ${frog.y}px)` }}>
        <text y={c * 0.08} fontSize={c * 0.95} textAnchor="middle" dominantBaseline="central" fontFamily="'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif">
          🐸
        </text>
      </g>
      {canHop && <Tap at={frog} size={c * 1.1} label="hop back" onTap={onStep} ring={acting} />}
    </g>
  )
}

function PartsArt({ spec, st, w, h, live, acting, onStep }: ArtProps) {
  const m = spec.model as Extract<FactModel, { kind: 'parts' }>
  const L = framesLayout(m.whole > 10 ? 2 : 1, w, h)
  const filled = m.part + st.done
  const total = L.origins.length * 10
  return (
    <g>
      {L.origins.map((o, f) => (
        <FrameGrid key={f} o={o} c={L.c} glow={st.lit === 'model'} />
      ))}
      {Array.from({ length: total }, (_, k) => {
        const at = cellAt(L, k)
        if (k < m.part) {
          return <Counter key={k} at={at} c={L.c} fill={RED} />
        }
        if (k < filled) return <Counter key={k} at={at} c={L.c} fill={BLUE} badge={k + 1} pop popKey={`${st.gen}`} />
        if (k < m.whole) {
          // an empty spot up to the whole: dashed, waiting to be filled
          return (
            <g key={k} data-empty={k}>
              <circle cx={at.x} cy={at.y} r={L.c * 0.32} fill="#fff3c4" stroke={INK} strokeOpacity={0.55} strokeWidth={3} strokeDasharray="6 5" />
              {live && k === filled && <Tap at={at} size={L.c} label="fill" onTap={onStep} ring={acting} />}
            </g>
          )
        }
        // past the whole: not part of this sentence
        return <rect key={k} x={at.x - L.c / 2 + 3} y={at.y - L.c / 2 + 3} width={L.c - 6} height={L.c - 6} fill="#e9e4dc" opacity={0.7} />
      })}
      {/* the part we have, lit */}
      {Array.from({ length: m.part }, (_, k) => {
        const at = cellAt(L, k)
        return <circle key={`lit${k}`} className="ns-lit" data-on={st.lit === 'start' ? '' : undefined} cx={at.x} cy={at.y} r={L.c * 0.46} fill="none" stroke={GOLD} strokeWidth={5} />
      })}
    </g>
  )
}

function FamilyArt({ spec, st, w, h }: ArtProps) {
  const m = spec.model as Extract<FactModel, { kind: 'family' }>
  // the house in units: a roof over a body holding the four sentences (2 × 2 when wide, else 4 rows)
  const wide = w / h > 1.25
  const rowsN = wide ? 2 : 4
  const colsN = wide ? 2 : 1
  const sw = 640 // one sentence's width in sentence units (font 110)
  const bodyW = colsN * sw + (colsN - 1) * 80 + 80
  const bodyH = rowsN * TOKEN_H + (rowsN - 1) * 18 + 40
  const roofH = 210
  const W = bodyW + 60
  const H = roofH + bodyH + 20
  const s = Math.min(w / W, h / H)
  const ox = (w - W * s) / 2
  const oy = (h - H * s) / 2
  const left = 30
  const top = roofH
  return (
    <g transform={`translate(${ox} ${oy}) scale(${s})`}>
      {/* the roof: the whole on top, the two parts under it */}
      <rect className="ns-lit" data-on={st.lit === 'roof' ? '' : undefined} x={left - 26} y={-6} width={bodyW + 52} height={roofH + 12} rx={40} fill="#ffe594" />
      <path d={`M ${left - 20} ${top} L ${left + bodyW / 2} 8 L ${left + bodyW + 20} ${top} Z`} fill="#f2a65a" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
      <Big x={left + bodyW / 2} y={96} size={92} n={m.whole} fill="#fffaf0" />
      <Big x={left + bodyW * 0.3} y={top - 50} size={78} n={m.a} fill={RED} />
      <Big x={left + bodyW * 0.7} y={top - 50} size={78} n={m.b} fill={BLUE} />
      {/* the body */}
      <rect className="ns-lit" data-on={st.lit === 'house' ? '' : undefined} x={left - 14} y={top - 4} width={bodyW + 28} height={bodyH + 18} rx={26} fill="#ffe594" />
      <rect x={left} y={top} width={bodyW} height={bodyH} rx={18} fill={PAPER} stroke={INK} strokeWidth={6} />
      {m.sentences.map((sent, k) => {
        const col = colsN === 2 ? k % 2 : 0
        const row = colsN === 2 ? Math.floor(k / 2) : k
        const tokens = k === m.blank ? spec.sentence : sent
        const pieces = sentencePieces(tokens, 0, TOKEN_H / 2, spec.answer, st.solved)
        const x = left + 40 + col * (sw + 80) + (sw - pieces.width) / 2
        const y = top + 20 + row * (TOKEN_H + 18)
        return (
          <g key={k} transform={`translate(${x} ${y})`} data-guide={k === m.blank ? NS_SENTENCE : undefined} data-sentence={k}>
            {k === m.blank && <rect x={-16} y={4} width={pieces.width + 32} height={TOKEN_H - 8} rx={22} fill="#fff3c4" opacity={0.75} />}
            {pieces.nodes}
          </g>
        )
      })}
    </g>
  )
}

function ModelArt(props: ArtProps) {
  switch (props.spec.model.kind) {
    case 'countOn':
      return <CountOnArt {...props} />
    case 'rows':
      return <RowsArt {...props} />
    case 'makeTen':
      return <MakeTenArt {...props} />
    case 'takeAway':
      return <TakeAwayArt {...props} />
    case 'countBack':
      return <CountBackArt {...props} />
    case 'parts':
      return <PartsArt {...props} />
    case 'family':
      return <FamilyArt {...props} />
  }
}

// ── the activity ─────────────────────────────────────────────────────────────

function NumberSentence({ problem, spec, phase, active, onAttempt, registerHelp }: ListenActivityProps<NumberSentenceSpec>) {
  const [st, dispatch] = useReducer(reducer, FRESH)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const boxRef = useRef<HTMLDivElement>(null)
  const mounted = useRef(true)
  const m = spec.model
  const taps = actTaps(m)
  const family = m.kind === 'family'

  const cards: ChoiceCard[] = useMemo(() => spec.cards.map((n) => ({ value: n, speech: say(n) })), [spec])
  const choice = useChoice({
    cards,
    answer: spec.answer,
    active: active && st.open,
    phase,
    onAttempt: (correct) => {
      if (correct) {
        dispatch({ type: 'solve' })
        const at = progressOf(problem)
        at.told = true
        at.acted = true
      }
      onAttempt(correct)
    },
  })
  const live = useRef({ choice, st, active })
  useLayoutEffect(() => {
    live.current = { choice, st, active }
  })

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // the question's lines act on the picture
  useEffect(() => {
    const c: Controls = {
      act: () => {
        progressOf(problem).told = true
        if (mounted.current) dispatch({ type: 'act' })
      },
      open: () => {
        const at = progressOf(problem)
        at.told = true
        at.acted = true
        if (mounted.current) dispatch({ type: 'open' })
      },
      openCards: () => live.current.choice.open,
    }
    controls.set(problem, c)
    return () => {
      if (controls.get(problem) === c) controls.delete(problem)
    }
  })

  // the help after a wrong card: its word, then the strategy, slowly, the picture doing what is said
  useEffect(() => {
    registerHelp(async () => {
      const steps: GuideStep[] = []
      const picked = live.current.choice.picked
      const note = picked !== null ? problem.notes?.[picked] : null
      if (note && picked !== null) steps.push({ voice: note, target: nkCard(picked), hand: false, pad: 12, pause: 0.35 })
      spec.help.forEach((beat, k) => {
        const counting = beat.do?.kind === 'dot' || beat.do?.kind === 'count' || beat.do?.kind === 'move' || beat.do?.kind === 'take' || beat.do?.kind === 'hop' || beat.do?.kind === 'fill'
        const events = [
          ...(k === 0 ? [{ char: 0, run: () => mounted.current && dispatch({ type: 'reset' }) }] : []),
          ...(beat.do ? [{ char: 0, run: () => mounted.current && dispatch({ type: 'help', do: beat.do!, model: m }) }] : []),
        ]
        steps.push({ voice: beat.voice, target: beat.target === 'sentence' ? NS_SENTENCE : NS_MODEL, hand: false, pad: 8, pause: counting ? 0.12 : 0.35, events })
      })
      await guide.sequence(steps, { repeatable: false })
      if (mounted.current) dispatch({ type: 'unlight' })
      const at = progressOf(problem)
      at.told = true
      at.acted = true
    })
    return () => registerHelp(null)
  })

  // ── taps on the picture ──
  const acting = active && st.acting && !st.open
  const canUse = active && (acting || (st.open && !st.solved))
  const actedOut = useRef(false)

  /** After the child's tap: say what it counted; once the strategy is acted out, the cards open. */
  function after(n: number | null, doneNow: number) {
    sfx.pop()
    const said = n !== null && n >= 0 && n <= COUNT_MAX ? guide.say(say(n)) : Promise.resolve(true)
    if (!acting || doneNow < taps || actedOut.current) return
    actedOut.current = true
    const at = progressOf(problem)
    at.told = true
    at.acted = true
    const gen = st.gen
    void said.then(async () => {
      await wait(400)
      if (!mounted.current || live.current.st.gen !== gen) return
      if (live.current.active) void guide.sequence([openStep(problem, spec)])
    })
  }

  function onStep() {
    if (!canUse) return
    if (st.done >= taps) {
      sfx.tick()
      return
    }
    const d = st.done + 1
    dispatch({ type: 'step', max: taps })
    switch (m.kind) {
      case 'countOn':
        return after(m.start + d, d)
      case 'makeTen':
        return after(d, d)
      case 'countBack':
        return after(m.start - d, d)
      case 'parts':
        return after(m.part + d, d)
      default:
        return after(d, d)
    }
  }
  function onTake(i: number) {
    if (!canUse || m.kind !== 'takeAway' || st.taken.includes(i) || st.taken.length >= m.take) return
    const d = st.taken.length + 1
    dispatch({ type: 'take', i, max: m.take })
    after(d, d)
  }
  function onMark(i: number) {
    if (!canUse) return
    if (st.marks[i] !== undefined) {
      sfx.tick()
      return
    }
    dispatch({ type: 'mark', i })
    sfx.pop()
    const n = Object.keys(st.marks).length + 1
    if (n <= COUNT_MAX) void guide.say(say(n))
  }

  const W = size.w || 640
  const H = size.h || 300
  const artProps: ArtProps = { spec, st, w: W, h: H, live: canUse, acting, onStep, onTake, onMark }

  return (
    <div
      className="absolute inset-0 flex flex-col gap-3 short:gap-2"
      data-number-sentence={m.kind}
      data-ns-acting={acting ? '' : undefined}
      data-ns-open={st.open && active ? '' : undefined}
      data-ns-done={m.kind === 'takeAway' ? st.taken.length : st.done}
      data-ns-solved={st.solved ? '' : undefined}
    >
      {!family && (
        // the sentence, written big
        <div data-guide={NS_SENTENCE} className="shrink-0 h-[min(15vh,7.5rem)] short:h-[min(14vh,5rem)] px-2 rounded-[1.5rem] bg-paper/90 border-[3px] border-line shadow-card grid place-items-center">
          <div className="w-full h-full py-1.5">
            <SentenceArt spec={spec} solved={st.solved} />
          </div>
        </div>
      )}
      {/* the picture of the strategy */}
      <div ref={boxRef} data-guide={NS_MODEL} className="ns-model relative flex-1 min-h-0 min-w-0 rounded-[2rem] border-[3px] border-line shadow-card overflow-hidden bg-paper">
        <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${W} ${H}`} role="group" aria-label="picture">
          <ModelArt {...artProps} />
        </svg>
      </div>
      {/* the answers: numeral cards, said as they're tapped */}
      <div className="shrink-0 flex items-center justify-center gap-4 short:gap-3 roomy:gap-6" role="group" aria-label="answers">
        {spec.cards.map((n, i) => (
          <NumberCard
            key={`${problem.id}-${i}`}
            guideId={nkCard(i)}
            label={String(n)}
            state={choice.stateOf(i)}
            tint={i}
            right={n === spec.answer}
            disabled={!active || !st.open || st.solved || choice.busy}
            onPick={() => void choice.pick(i)}
            className="w-[min(20vh,26vw,10rem)] shrink-0"
          >
            <Numeral n={n} />
          </NumberCard>
        ))}
      </div>
    </div>
  )
}

export const numberSentenceActivity: ListenActivityDef<NumberSentenceSpec> = {
  Component: NumberSentence,
  askSteps: sentenceAskSteps,
}

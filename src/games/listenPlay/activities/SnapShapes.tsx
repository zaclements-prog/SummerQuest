/* eslint-disable react-refresh/only-export-components -- an activity module exports its definition (component + askSteps) for the registry; not an HMR boundary */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { GuideStep } from '../../../guide/store'
import { guide } from '../../../guide/store'
import { phraseIndex } from '../../../tutoring/motion/cues'
import { M } from '../../../tutoring/motion/palette'
import { voiceText } from '../../../voice/registry'
import type { VoiceRef } from '../../../voice/types'
import type { ListenActivityDef, ListenActivityProps, ListenProblem } from '../types'
import { FlatShape, type G1Flat } from '../g1ShapesArt'
import { NumberCard, nkCard, sweepCards, useChoice, type ChoiceCard } from './numberKit'
import { RECIPE, bbox, decoyPiece, ptsPath, sayShape, snapAnswer, snapHelpLine, type Pt, type SnapShape, type SnapSpec } from './snapSpec'
import './snap.css'

/**
 * The `snap` activity (Shape Grove, 1st grade, 1.G.2): putting shapes
 * together.
 *
 * - `fill`: "Which piece finishes the square?" — one triangle sits in place,
 *   a dashed gap beside it; three pieces to pick from (the gap's shape, and
 *   two that plainly aren't). The right one snaps into the gap. Help: the gap
 *   glows and the piece that fits shows in it, faintly: "Look at the gap:
 *   three sides and three corners. A triangle fits!"
 * - `makes`: "Two triangles snap together. What shape do they make?" — the
 *   two pieces slide together on "snap together"; shape cards. Help: the new
 *   shape's outline glows: "Four sides, all the same, and four square
 *   corners: a square!"
 *
 * Guide ids: `snap-picture`, `snap-gap`, `lp-card-<i>`.
 */

export const SNAP_PICTURE = 'snap-picture'
export const SNAP_GAP = 'snap-gap'

const PLACED = '#74d3bd'
const PIECE = '#f2766b'

/** The cards still open on each question, for `askSteps`. */
const openCards = new WeakMap<object, number[]>()
/** makes: the pieces slide together when the line says so (and at the latest in the help). */
const sliders = new WeakMap<object, () => void>()

function said(ref: VoiceRef | undefined): string {
  try {
    return ref ? voiceText(ref) : ''
  } catch {
    return ''
  }
}

/** A filled, ink-outlined polygon. */
function Piece({ pts, color, className, dashed = false }: { pts: readonly Pt[]; color: string; className?: string; dashed?: boolean }) {
  return <path d={ptsPath(pts)} fill={color} stroke={M.ink} strokeWidth={4} strokeLinejoin="round" strokeDasharray={dashed ? '9 7' : undefined} className={className} />
}

/** A piece to pick, drawn at the gap's scale, centred in its card. */
function PieceCard({ shape, recipe }: { shape: SnapShape; recipe: SnapSpec['recipe'] }) {
  const def = RECIPE[recipe]
  const pts = shape === def.gapShape ? def.gap : decoyPiece(shape)
  const W = 106
  if (!pts) {
    return (
      <svg viewBox={`0 0 ${W} ${W}`} className="block w-full h-full" aria-hidden="true">
        <circle cx={W / 2} cy={W / 2} r={30} fill={PIECE} stroke={M.ink} strokeWidth={4} />
      </svg>
    )
  }
  const b = bbox(pts)
  const cx = (b.x0 + b.x1) / 2
  const cy = (b.y0 + b.y1) / 2
  return (
    <svg viewBox={`${cx - W / 2} ${cy - W / 2} ${W} ${W}`} className="block w-full h-full" aria-hidden="true" data-piece={shape}>
      <Piece pts={pts} color={PIECE} />
    </svg>
  )
}

/** A shape card for "What shape do they make?". */
const CARD_FLAT: Record<SnapShape, G1Flat> = { triangle: 'triangle', square: 'square', rectangle: 'rectangle', trapezoid: 'trapezoid', hexagon: 'hexagon', circle: 'circle' }
function ShapeCardArt({ shape, color }: { shape: SnapShape; color: number }) {
  return (
    <svg viewBox="0 0 100 100" className="block w-full h-full" aria-hidden="true" data-card-shape={shape}>
      <FlatShape shape={CARD_FLAT[shape]} color={color} turn={0} />
    </svg>
  )
}

function SnapShapes({ problem, spec, phase, active, onAttempt, registerHelp }: ListenActivityProps<SnapSpec>) {
  const def = RECIPE[spec.recipe]
  const answer = snapAnswer(spec)
  const cards: ChoiceCard[] = useMemo(() => spec.cards.map((c) => ({ value: c, speech: sayShape(c) })), [spec])
  const choice = useChoice({ cards, answer, active, phase, onAttempt })
  const [hint, setHint] = useState(false)
  const [together, setTogether] = useState(spec.ask === 'fill')
  useEffect(() => {
    openCards.set(problem, choice.open)
  })

  const slidNow = useRef(false)
  useEffect(() => {
    if (spec.ask !== 'makes') return
    const slide = () => {
      if (slidNow.current) return
      slidNow.current = true
      setTogether(true)
    }
    sliders.set(problem, slide)
    return () => {
      if (sliders.get(problem) === slide) sliders.delete(problem)
    }
  }, [problem, spec])

  // the help after a miss: the gap (or the new shape) glows as the line says what it is
  useEffect(() => {
    const help = async () => {
      sliders.get(problem)?.()
      const steps: GuideStep[] = [{ voice: snapHelpLine(spec), target: spec.ask === 'fill' ? SNAP_GAP : SNAP_PICTURE, hand: false, pad: 8, pause: 0.5, events: [{ char: 0, run: () => setHint(true) }] }]
      await guide.sequence(steps, { repeatable: false })
      setHint(false)
    }
    registerHelp(help)
    return () => registerHelp(null)
  }, [registerHelp, spec, problem])

  const interactive = active && !choice.busy
  const filled = spec.ask === 'fill' && choice.right !== null
  const whole = [...def.placed, ...def.gap]
  const b = bbox(whole)
  // makes: the pieces start apart (each pushed away from the middle) and slide together
  const apart = (pts: readonly Pt[]) => {
    const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length
    const my = pts.reduce((s, p) => s + p[1], 0) / pts.length
    const dx = mx - (b.x0 + b.x1) / 2
    const dy = my - (b.y0 + b.y1) / 2
    const len = Math.hypot(dx, dy) || 1
    return together ? 'translate(0px, 0px)' : `translate(${((dx / len) * 26).toFixed(1)}px, ${((dy / len) * 26).toFixed(1)}px)`
  }

  let picture: ReactNode
  if (spec.ask === 'fill') {
    picture = (
      <svg viewBox="-6 -6 172 132" className="block w-full h-full" aria-hidden="true" data-snap="fill" data-filled={filled ? '' : undefined}>
        <Piece pts={def.placed} color={PLACED} />
        <g data-guide={SNAP_GAP}>
          {hint && <path d={ptsPath(def.gap)} fill="#ffe594" stroke="#ffcf4d" strokeWidth={10} strokeLinejoin="round" />}
          {filled ? <Piece pts={def.gap} color={PIECE} className="sn-snap" /> : <Piece pts={def.gap} color="#fffaf0" dashed />}
          {hint && !filled && <Piece pts={def.gap} color={PIECE} className="sn-ghost" />}
        </g>
      </svg>
    )
  } else {
    picture = (
      <svg viewBox="-30 -30 220 180" className="block w-full h-full" aria-hidden="true" data-snap="makes" data-together={together ? '' : undefined}>
        {hint && <path d={ptsPath(outlineOf(spec.recipe))} fill="#ffe594" stroke="#ffcf4d" strokeWidth={12} strokeLinejoin="round" />}
        <g className="sn-slide" style={{ transform: apart(def.placed) }}>
          <Piece pts={def.placed} color={PLACED} />
        </g>
        <g className="sn-slide" style={{ transform: apart(def.gap) }}>
          <Piece pts={def.gap} color={PIECE} />
        </g>
      </svg>
    )
  }

  const colors = useMemo(() => spec.cards.map((_, i) => [3, 1, 4, 6][i % 4]), [spec])
  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col justify-center gap-5 roomy:gap-7 landscape:grid landscape:grid-rows-1 landscape:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)] landscape:items-center landscape:gap-4 short:gap-3" data-snap-ask={spec.ask}>
      <div data-guide={SNAP_PICTURE} className="lp-picture-panel relative w-full h-[min(44vh,30rem)] landscape:h-full landscape:max-h-[34rem] min-h-40 shrink self-center bg-paper border-[3px] border-line rounded-[2rem] shadow-card overflow-hidden">
        <div className="absolute inset-[5%]">{picture}</div>
      </div>
      <div className="shrink-0 flex items-center justify-center gap-4 short:gap-3 roomy:gap-6 px-1 pb-1" role="group" aria-label="answers">
        {spec.cards.map((c, i) => (
          <NumberCard key={`${c}-${i}`} guideId={nkCard(i)} label={c} state={choice.stateOf(i)} tint={i} right={c === answer} disabled={!interactive} onPick={() => void choice.pick(i)} className="flex-1 max-w-52 roomy:max-w-60">
            {spec.ask === 'fill' ? <PieceCard shape={c} recipe={spec.recipe} /> : <ShapeCardArt shape={c} color={colors[i]} />}
          </NumberCard>
        ))}
      </div>
    </div>
  )
}

/** The outline of the shape two pieces make (for its glow): the hull of their corners. */
function outlineOf(recipe: SnapSpec['recipe']): Pt[] {
  const pts = [...RECIPE[recipe].placed, ...RECIPE[recipe].gap]
  // convex hull (monotone chain): the composite shapes are all convex
  const uniq = [...new Map(pts.map((p) => [`${p[0]},${p[1]}`, p])).values()].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: Pt[] = []
  for (const p of uniq) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: Pt[] = []
  for (const p of [...uniq].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)]
}

function askSteps(problem: ListenProblem, spec: SnapSpec): GuideStep[] {
  const open = openCards.get(problem) ?? spec.cards.map((_, i) => i)
  if (spec.ask === 'fill') {
    return [
      { voice: problem.speech ?? null, target: SNAP_PICTURE, hand: false, pad: 6 },
      { target: SNAP_GAP, cue: 'finishes', hand: false, pad: 8 },
      sweepCards(open),
    ]
  }
  const at = phraseIndex(said(problem.speech), 'snap together')
  return [
    { voice: problem.speech ?? null, target: SNAP_PICTURE, hand: false, pad: 6, events: at >= 0 ? [{ char: at, run: () => sliders.get(problem)?.() }] : [] },
    sweepCards(open, { cue: 'What shape' }),
  ]
}

export const snapActivity: ListenActivityDef<SnapSpec> = { Component: SnapShapes, askSteps }

/* eslint-disable react-refresh/only-export-components -- an activity module exports its definition (component + askSteps) for the registry; not an HMR boundary */
import { useEffect, useRef, useState } from 'react'
import type { GuideStep } from '../../../guide/store'
import { guide } from '../../../guide/store'
import { sfx } from '../../../lib/sound'
import { digital, sameTime, timeHow, timeName, timeSays, type ClockSpec, type ClockTime } from '../../../lib/providers/g1Measure'
import { M } from '../../../tutoring/motion/palette'
import { PictureArt, PictureCard, type CardState } from '../PictureCard'
import type { ListenActivityDef, ListenActivityProps, ListenProblem } from '../types'
import { boxStyle, useBoxSize, useMounted, type Rect } from './g1Kit'
import './g1.css'

/**
 * The `clockMatch` activity (1st-grade Measure Marsh, 1.MD.3): telling time
 * to the hour and half hour.
 *
 * - `read`: an analog clock, three digital cards. "What time is it? Tap it!"
 * - `show`: a digital clock, three analog cards. "Tap the clock that shows half past 3."
 * - `say`: the time is only said; three big analog cards.
 *
 * A card says its time as it is tapped ("Half past 3!"). A wrong one is a try
 * that wasn't right: the help says what that card shows ("That one says half
 * past 4."), then the method for the time asked, the clock's long hand and
 * then its short hand lit on their words ("The long hand points down to 6.
 * The short hand is just past 3, halfway to the next number. It is half past
 * 3!"). The analog clocks are the kit's `clock` pictures (PictureCard), whose
 * hour hand sits halfway between two numbers at half past.
 *
 * Guide ids: `clock-picture`, `clock-long`, `clock-short` (the picture's
 * hands, when it is an analog clock), `clock-cards`, `clock-card-<j>`.
 */

interface Progress {
  tried: number[]
}
const progress = new WeakMap<object, Progress>()
export const clockCard = (j: number) => `clock-card-${j}`

function clockAskSteps(problem: ListenProblem, spec: ClockSpec): GuideStep[] {
  const tried = progress.get(problem)?.tried ?? []
  const open = spec.cards.map((_, j) => j).filter((j) => !tried.includes(j))
  const cards = open.length === 1 ? clockCard(open[0]) : open.map(clockCard)
  const hand = open.length === 1 ? ('tap' as const) : ('sweep' as const)
  if (spec.mode === 'say') return [{ voice: problem.speech ?? null, target: cards, cue: 'Tap', hand, pad: 12 }]
  return [
    { voice: problem.speech ?? null, target: 'clock-picture', hand: false, pad: 6 },
    { target: cards, cue: spec.mode === 'read' ? 'Tap' : 0.55, hand, pad: 12 },
  ]
}

/** A digital clock: the time in lit digits on a dark screen. */
export function DigitalArt({ time, className = '' }: { time: ClockTime; className?: string }) {
  const text = digital(time)
  return (
    <svg viewBox="0 0 120 80" className={`block w-full h-full ${className}`} aria-hidden="true">
      <rect x={6} y={10} width={108} height={60} rx={14} fill="#8ab8ff" stroke={M.ink} strokeWidth={4} />
      <rect x={16} y={20} width={88} height={40} rx={8} fill="#22313f" stroke={M.ink} strokeWidth={3} />
      <rect x={30} y={70} width={14} height={6} rx={2} fill="#6f90c9" stroke={M.ink} strokeWidth={2.5} />
      <rect x={76} y={70} width={14} height={6} rx={2} fill="#6f90c9" stroke={M.ink} strokeWidth={2.5} />
      <text x={60} y={41} fontFamily={M.font} fontWeight={700} fontSize={text.length > 4 ? 27 : 30} textAnchor="middle" dominantBaseline="central" fill="#7cf0b4" letterSpacing={1}>
        {text}
      </text>
    </svg>
  )
}

/** The kit's clock picture for a time. */
const analog = (t: ClockTime) => ({ kind: 'clock' as const, hour: t.hour, minute: t.half ? 30 : 0 })

/**
 * Where the picture's hands are (the kit's ClockArt: a 100 × 100 face, the
 * hour hand 15 long and the minute hand 23, from the middle), as boxes in the
 * panel's own pixels, for the guide to light.
 */
function handBoxes(panel: { w: number; h: number }, t: ClockTime): { long: Rect; short: Rect } {
  const inset = 0.04
  const iw = panel.w * (1 - 2 * inset)
  const ih = panel.h * (1 - 2 * inset)
  const side = Math.min(iw, ih)
  const ox = panel.w * inset + (iw - side) / 2
  const oy = panel.h * inset + (ih - side) / 2
  const k = side / 100
  const cx = ox + 50 * k
  const cy = oy + 50 * k
  const box = (deg: number, len: number): Rect => {
    const a = (deg * Math.PI) / 180
    const tx = cx + Math.sin(a) * len * k
    const ty = cy - Math.cos(a) * len * k
    const pad = 7 * k
    return { x: Math.min(cx, tx) - pad, y: Math.min(cy, ty) - pad, w: Math.abs(tx - cx) + pad * 2, h: Math.abs(ty - cy) + pad * 2 }
  }
  const minute = t.half ? 30 : 0
  return { long: box((minute / 60) * 360, 23.5), short: box((((t.hour % 12) + minute / 60) / 12) * 360, 16) }
}

function ClockMatchActivity({ problem, spec, phase, active, onAttempt, registerHelp }: ListenActivityProps<ClockSpec>) {
  const [tried, setTried] = useState<number[]>(() => progress.get(problem)?.tried ?? [])
  const [picked, setPicked] = useState<number | null>(null)
  const [saying, setSaying] = useState<number | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const panel = useBoxSize(panelRef)
  const mounted = useMounted()
  const pickedRef = useRef<number | null>(null)
  const answerAt = spec.cards.findIndex((c) => sameTime(c, spec.time))

  // the help after a wrong card: what that card shows, then the method, its hands lit
  useEffect(() => {
    registerHelp(async () => {
      const j = pickedRef.current
      const steps: GuideStep[] = []
      if (j !== null) steps.push({ voice: timeSays(spec.cards[j]), target: clockCard(j), hand: false, pad: 12 })
      const open = spec.cards.map((_, k) => k).filter((k) => !(progress.get(problem)?.tried ?? []).includes(k))
      if (spec.mode === 'read') {
        steps.push(
          { voice: timeHow(spec.time), target: 'clock-picture', hand: false, pad: 6 },
          { target: 'clock-long', cue: 'long hand', hand: false, pad: 4 },
          { target: 'clock-short', cue: 'short hand', hand: false, pad: 4 },
          { target: 'clock-picture', cue: 'It is', hand: false, pad: 6 },
        )
      } else {
        steps.push({ voice: timeHow(spec.time), target: open.map(clockCard), hand: false, pad: 12 })
      }
      await guide.sequence(steps, { repeatable: false })
      if (mounted.current) setPicked(null)
    })
    return () => registerHelp(null)
  })

  function tap(j: number) {
    if (!active || tried.includes(j) || saying !== null) return
    sfx.pop()
    setSaying(j)
    void guide.say(timeName(spec.cards[j])).then(() => {
      if (!mounted.current) return
      setSaying(null)
      if (j === answerAt) {
        onAttempt(true)
        return
      }
      pickedRef.current = j
      setPicked(j)
      const next = [...tried, j]
      progress.set(problem, { tried: next })
      setTried(next)
      onAttempt(false)
    })
  }

  const won = phase === 'praise' || phase === 'done' || phase === 'loading'
  const stateOf = (j: number): CardState => (tried.includes(j) ? (picked === j && phase === 'oops' ? 'look' : 'tried') : saying === j ? 'chosen' : won ? (j === answerAt ? 'right' : 'dim') : 'idle')
  const hands = spec.mode === 'read' && panel.w > 0 ? handBoxes(panel, spec.time) : null
  const digitalCards = spec.mode === 'read'

  const cards = spec.cards.map((t, j) => (
    <PictureCard
      key={j}
      guideId={clockCard(j)}
      // (a digital card draws its own screen over an empty picture)
      picture={digitalCards ? { kind: 'emoji', emoji: '' } : analog(t)}
      label={digital(t)}
      tint={j}
      state={stateOf(j)}
      disabled={!active || saying !== null}
      onPick={() => tap(j)}
      className={spec.mode === 'say' ? 'basis-[46%] landscape:basis-0 landscape:flex-1 max-w-72 landscape:max-w-[min(18rem,62vh)] roomy:max-w-80' : 'flex-1 max-w-52 roomy:max-w-60'}
    >
      {digitalCards && (
        <span className="absolute inset-[8%] pointer-events-none grid place-items-center">
          <DigitalArt time={t} />
        </span>
      )}
      {import.meta.env.DEV && j === answerAt && <span data-correct="" hidden />}
    </PictureCard>
  ))

  if (spec.mode === 'say') {
    return (
      <div className="absolute inset-0 flex items-center justify-center" data-clock-mode={spec.mode}>
        <div data-guide="clock-cards" className="w-full flex flex-wrap landscape:flex-nowrap items-center justify-center gap-5 short:gap-4 roomy:gap-8 px-2 pb-2" role="group" aria-label="answers">
          {cards}
        </div>
      </div>
    )
  }

  return (
    <div
      className="absolute inset-0 flex flex-col justify-center gap-5 roomy:gap-7 landscape:grid landscape:grid-rows-1 landscape:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] landscape:items-center landscape:gap-4 short:gap-3 landscape:roomy:gap-6"
      data-clock-mode={spec.mode}
    >
      <div
        ref={panelRef}
        data-guide="clock-picture"
        className="lp-picture-panel relative w-full h-[min(44vh,30rem)] landscape:h-full landscape:max-h-[34rem] min-h-40 shrink self-center bg-paper border-[3px] border-line rounded-[2rem] shadow-card overflow-hidden"
      >
        <div className="absolute inset-[4%] grid place-items-center">
          {spec.mode === 'read' ? <PictureArt picture={analog(spec.time)} /> : <DigitalArt time={spec.time} />}
        </div>
        {hands && (
          <>
            <div data-guide="clock-long" className="absolute pointer-events-none" style={boxStyle(hands.long)} aria-hidden="true" />
            <div data-guide="clock-short" className="absolute pointer-events-none" style={boxStyle(hands.short)} aria-hidden="true" />
          </>
        )}
      </div>
      <div data-guide="clock-cards" className="shrink-0 flex items-center justify-center gap-4 short:gap-3 roomy:gap-6 px-1 pb-1" role="group" aria-label="answers">
        {cards}
      </div>
    </div>
  )
}

export const clockMatchActivity: ListenActivityDef<ClockSpec> = {
  Component: ClockMatchActivity,
  askSteps: clockAskSteps,
}

/* eslint-disable react-refresh/only-export-components -- an activity module exports its definition (component + askSteps) for the registry; not an HMR boundary */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { GuideStep } from '../../../guide/store'
import { guide } from '../../../guide/store'
import { sfx } from '../../../lib/sound'
import type { OrderSpec } from '../../../lib/providers/kStories'
import type { VoiceRef } from '../../../voice/types'
import { PictureCard, type CardState } from '../PictureCard'
import type { ListenActivityDef, ListenActivityProps, ListenProblem } from '../types'
import './activities.css'

/**
 * The `order` activity (Writing Workshop's Story order): the narrator tells a
 * three-picture story, one sentence per picture, each picture lighting up on
 * its sentence; then the pictures mix themselves up ("Now tap the pictures in
 * order: first, next, last!", each slot lit on its word), and the child taps
 * them into the three slots, marked 1, 2, 3 (no words).
 *
 * The right next picture flies to its slot ("Next!"); the last one in is the
 * try that was right. A wrong one wobbles and is the try that wasn't
 * (`onAttempt(false)`): the shell says "let's look again", the help tells the
 * story again lighting the pictures in order, and the child carries on from
 * where they were ("What comes next? Tap it!"). Never a timer, never failing
 * out.
 *
 * Guide ids: `story-tray` (the row of pictures), `story-pic-<step>` (a
 * picture, by its place in the story, wherever it is), `story-slot-<k>`.
 */

/** Where each problem is up to, for `askSteps` (which only gets the problem). */
const progress = new WeakMap<object, { mixed: boolean; placed: number }>()
/** The live component's "mix them up now", run by the question's line as it reaches "Now tap…". */
const mixers = new WeakMap<object, () => void>()

const SLOT_WORD: VoiceRef[] = [{ line: 'k-stories/slotFirst' }, { line: 'k-stories/slotNext' }, { line: 'k-stories/slotLast' }]
const WHAT: VoiceRef[] = [{ line: 'k-stories/whatFirst' }, { line: 'k-stories/whatNext' }, { line: 'k-stories/whatLast' }]

/** The story told, each picture lit on its sentence. */
function tellSteps(spec: OrderSpec): GuideStep[] {
  return spec.lines.map((line, i) => ({ voice: line, target: `story-pic-${i}`, hand: false, pad: 10, pause: 0.35 }))
}

function orderAskSteps(problem: ListenProblem, spec: OrderSpec): GuideStep[] {
  const at = progress.get(problem)
  if (at?.mixed) return [{ voice: WHAT[Math.min(2, at.placed)], target: 'story-tray', hand: 'sweep', pad: 10 }]
  return [
    { voice: problem.speech ?? { line: 'k-stories/listen' }, target: 'story-tray', hand: false, pad: 10 },
    ...tellSteps(spec),
    // mixed up as this line starts; each slot lit on its word
    { voice: { line: 'k-stories/tapInOrder' }, target: 'story-tray', hand: false, pad: 10, events: [{ char: 0, run: () => mixers.get(problem)?.() }] },
    { target: 'story-slot-0', cue: 'first', hand: false, pad: 8 },
    { target: 'story-slot-1', cue: 'next', hand: false, pad: 8 },
    { target: 'story-slot-2', cue: 'last', hand: false, pad: 8 },
    // and the hand glides over the pictures: the child's turn
    { voice: null, target: 'story-tray', hand: 'sweep', pad: 10 },
  ]
}

interface Layout {
  s: number
  tray: { x: number; y: number }[]
  slots: { x: number; y: number }[]
  /** The tray row's box (the guide's `story-tray`). */
  row: { x: number; y: number; w: number; h: number }
}

/** Two rows of three: the pictures on top, the slots under them, as big as the stage allows. */
function layoutFor(w: number, h: number): Layout {
  const gap = Math.max(12, Math.min(28, w * 0.03))
  const rowGap = Math.max(18, Math.min(44, h * 0.07))
  const s = Math.max(64, Math.floor(Math.min((w - 4 * gap) / 3, (h - rowGap - 24) / 2, 250)))
  const x0 = (w - 3 * s - 2 * gap) / 2
  const y0 = Math.max(4, (h - 2 * s - rowGap) / 2)
  const xs = [0, 1, 2].map((k) => x0 + k * (s + gap))
  return {
    s,
    tray: xs.map((x) => ({ x, y: y0 })),
    slots: xs.map((x) => ({ x, y: y0 + s + rowGap })),
    row: { x: x0, y: y0, w: 3 * s + 2 * gap, h: s },
  }
}

function StoryOrderActivity({ problem, spec, active, onAttempt, registerHelp }: ListenActivityProps<OrderSpec>) {
  const [mixed, setMixed] = useState(() => progress.get(problem)?.mixed ?? false)
  const [placed, setPlaced] = useState(() => progress.get(problem)?.placed ?? 0)
  const [look, setLook] = useState<number | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const boxRef = useRef<HTMLDivElement>(null)
  const mounted = useRef(true)
  const now = useRef({ active, onAttempt })
  useLayoutEffect(() => {
    now.current = { active, onAttempt }
  })
  const owed = useRef(false)

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

  // the question's line mixes the pictures up as it reaches "Now tap…"
  useEffect(() => {
    const mix = () => {
      if (!mounted.current) return
      const at = progress.get(problem)
      progress.set(problem, { mixed: true, placed: at?.placed ?? 0 })
      setMixed(true)
      sfx.whoosh()
    }
    mixers.set(problem, mix)
    return () => {
      if (mixers.get(problem) === mix) mixers.delete(problem)
    }
  }, [problem])

  // the help after a miss: the story again, each picture lit as its sentence is said
  useEffect(() => {
    registerHelp(async () => {
      await guide.sequence(tellSteps(spec), { repeatable: false })
      if (mounted.current) setLook(null)
    })
    return () => registerHelp(null)
  })

  function report() {
    if (!mounted.current) return
    if (now.current.active) {
      owed.current = false
      now.current.onAttempt(true)
    } else owed.current = true
  }
  useEffect(() => {
    if (active && placed >= 3 && owed.current) report()
  })

  async function tap(step: number) {
    if (!active || !mixed || placed >= 3 || step < placed) return
    if (step !== placed) {
      // not this one yet: it wobbles, and the shell says "let's look again"
      setLook(step)
      progress.set(problem, { mixed: true, placed })
      onAttempt(false)
      return
    }
    sfx.pop()
    const next = placed + 1
    setPlaced(next)
    setLook(null)
    progress.set(problem, { mixed: true, placed: next })
    const said = guide.say(SLOT_WORD[step])
    if (next >= 3) {
      await said
      report()
    }
  }

  // (before the first layout, or with none at all, a tablet-sized stage)
  const L = layoutFor(size.w || 640, size.h || 420)
  const placeOf = (step: number) => (mixed ? spec.mixed.indexOf(step) : step)
  const posOf = (step: number) => (step < placed ? L.slots[step] : L.tray[placeOf(step)])
  const stateOf = (step: number): CardState => (step < placed ? 'right' : look === step ? 'look' : 'idle')

  return (
    <div ref={boxRef} className="absolute inset-0" data-story={spec.story} data-story-mixed={mixed ? '' : undefined} data-story-placed={placed}>
      {/* the slots: 1, 2, 3, with arrows between them */}
      {L.slots.map((p, k) => (
        <div
          key={`slot${k}`}
          data-guide={`story-slot-${k}`}
          data-filled={k < placed ? '' : undefined}
          className="story-slot absolute rounded-[1.75rem] border-[3px] border-dashed border-line/45 bg-paper/70"
          style={{ left: p.x, top: p.y, width: L.s, height: L.s }}
          aria-hidden="true"
        >
          <span className="absolute inset-0 grid place-items-center kid-text font-bold text-ink-900/20" style={{ fontSize: L.s * 0.5 }}>
            {k + 1}
          </span>
        </div>
      ))}
      {/* each slot's number stays in sight over its picture (bottom left: a placed picture's ✓ is top right) */}
      {L.slots.map((p, k) => (
        <span
          key={`badge${k}`}
          className="absolute z-30 pointer-events-none grid place-items-center w-12 h-12 rounded-full bg-quest-300 border-[3px] border-line shadow-ledge-sm kid-text font-bold text-2xl text-ink-900"
          style={{ left: p.x - 16, top: p.y + L.s - 32 }}
          aria-hidden="true"
        >
          {k + 1}
        </span>
      ))}
      {[0, 1].map((k) => (
        <svg
          key={`arrow${k}`}
          className="absolute pointer-events-none"
          viewBox="0 0 40 40"
          style={{ left: L.slots[k].x + L.s, top: L.slots[k].y + L.s / 2 - 14, width: L.slots[k + 1].x - L.slots[k].x - L.s, height: 28 }}
          aria-hidden="true"
          preserveAspectRatio="xMidYMid meet"
        >
          <path d="M 6 20 H 30 M 22 11 L 32 20 L 22 29" fill="none" stroke="#6b5a66" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ))}
      <div data-guide="story-tray" className="absolute pointer-events-none" style={{ left: L.row.x, top: L.row.y, width: L.row.w, height: L.row.h }} aria-hidden="true" />
      {spec.pictures.map((emoji, step) => {
        const p = posOf(step)
        return (
          <div key={step} className="story-pic absolute z-20" data-state={step < placed ? 'placed' : look === step ? 'look' : 'idle'} style={{ left: 0, top: 0, width: L.s, height: L.s, transform: `translate(${p.x}px, ${p.y}px)` }}>
            <PictureCard
              picture={{ kind: 'emoji', emoji }}
              guideId={`story-pic-${step}`}
              label={emoji}
              // (one tint for all: a colour must never tell the order)
              tint={1}
              state={stateOf(step)}
              disabled={!active || !mixed || step < placed}
              onPick={() => void tap(step)}
              className="w-full h-full"
            />
          </div>
        )
      })}
    </div>
  )
}

export const storyOrderActivity: ListenActivityDef<OrderSpec> = {
  Component: StoryOrderActivity,
  askSteps: orderAskSteps,
}

/* eslint-disable react-refresh/only-export-components -- an activity module exports its definition (component + askSteps) for the registry; not an HMR boundary */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { GuideStep } from '../../../guide/store'
import { guide } from '../../../guide/store'
import { sfx } from '../../../lib/sound'
import type { ListenActivityDef, ListenActivityProps, ListenProblem } from '../types'
import { orderLines, sayNumber, type NumberOrderSpec } from './numberSpecs'
import { NumberCard, Numeral, type CardState } from './numberKit'

/**
 * The `numberOrder` activity, "Numbers in order" (Number Dunes, K.CC.4c): a
 * few numbers in a row (three to five, within 10), mixed up on top; slots
 * with arrows below. "Put the numbers in order! Tap the smallest number
 * first." The right next number flies to its slot and is said ("Four!"); the
 * last one in is the try that was right. A wrong one wobbles and is the try
 * that wasn't: the help counts them in order, each lighting as its number is
 * said, and the child carries on from where they were ("Which number comes
 * next? Tap it!"). Never a timer, never failing out.
 *
 * Guide ids: `num-tray` (the mixed-up row), `num-tile-<step>` (a number, by its
 * place in the order, wherever it is), `num-slot-<k>`.
 */

/** Where each problem is up to, for `askSteps`. */
const progress = new WeakMap<object, number>()

interface Layout {
  s: number
  tray: { x: number; y: number }[]
  slots: { x: number; y: number }[]
  row: { x: number; y: number; w: number; h: number }
}

/** Two rows: the numbers on top, the slots under them, as big as the stage allows. */
function layoutFor(w: number, h: number, n: number): Layout {
  const gap = Math.max(12, Math.min(26, w * 0.025))
  const rowGap = Math.max(18, Math.min(44, h * 0.07))
  const s = Math.max(60, Math.floor(Math.min((w - (n + 1) * gap) / n, (h - rowGap - 20) / 2, 210)))
  const x0 = (w - n * s - (n - 1) * gap) / 2
  const y0 = Math.max(4, (h - 2 * s - rowGap) / 2)
  const xs = Array.from({ length: n }, (_, k) => x0 + k * (s + gap))
  return {
    s,
    tray: xs.map((x) => ({ x, y: y0 })),
    slots: xs.map((x) => ({ x, y: y0 + s + rowGap })),
    row: { x: x0, y: y0, w: n * s + (n - 1) * gap, h: s },
  }
}

function NumberOrder({ problem, spec, active, onAttempt, registerHelp }: ListenActivityProps<NumberOrderSpec>) {
  const n = spec.numbers.length
  const [placed, setPlaced] = useState(() => progress.get(problem) ?? 0)
  const [look, setLook] = useState<number | null>(null)
  const [lit, setLit] = useState<number | null>(null)
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

  // the help after a miss: count them in order, each number lit as it is said
  useEffect(() => {
    registerHelp(async () => {
      // [what comes next (the re-ask), "Let's count them in order.", each number]
      const [, intro, ...each] = orderLines(spec)
      const steps: GuideStep[] = [
        { voice: intro, target: 'num-tray', hand: false, pad: 10, pause: 0.3 },
        ...each.map((voice, step): GuideStep => ({ voice, target: `num-tile-${step}`, hand: false, pad: 10, pause: 0.2, events: [{ char: 0, run: () => mounted.current && setLit(step) }] })),
      ]
      await guide.sequence(steps, { repeatable: false })
      if (mounted.current) {
        setLit(null)
        setLook(null)
      }
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
    if (active && placed >= n && owed.current) report()
  })

  async function tap(step: number) {
    if (!active || placed >= n || step < placed) return
    if (step !== placed) {
      // not this one yet: it wobbles, and the shell says "let's look again"
      setLook(step)
      progress.set(problem, placed)
      onAttempt(false)
      return
    }
    sfx.pop()
    const next = placed + 1
    setPlaced(next)
    setLook(null)
    progress.set(problem, next)
    const said = guide.say(sayNumber(spec.numbers[step]))
    if (next >= n) {
      await said
      report()
    }
  }

  // (before the first layout, or with none at all, a tablet-sized stage)
  const L = layoutFor(size.w || 640, size.h || 420, n)
  const posOf = (step: number) => (step < placed ? L.slots[step] : L.tray[spec.mixed.indexOf(step)])
  const stateOf = (step: number): CardState => (step < placed ? 'right' : look === step ? 'look' : 'idle')

  return (
    <div ref={boxRef} className="absolute inset-0" data-order={spec.numbers.join(' ')} data-order-placed={placed}>
      {/* the slots, with arrows between them (counting goes this way) */}
      {L.slots.map((p, k) => (
        <div
          key={`slot${k}`}
          data-guide={`num-slot-${k}`}
          data-filled={k < placed ? '' : undefined}
          className="nk-slot absolute rounded-[1.75rem] border-[3px] border-dashed border-line/45 bg-paper/70"
          style={{ left: p.x, top: p.y, width: L.s, height: L.s }}
          aria-hidden="true"
        />
      ))}
      {L.slots.slice(0, -1).map((p, k) => (
        <svg
          key={`arrow${k}`}
          className="absolute pointer-events-none"
          viewBox="0 0 40 40"
          style={{ left: p.x + L.s, top: p.y + L.s / 2 - 12, width: L.slots[k + 1].x - p.x - L.s, height: 24 }}
          aria-hidden="true"
          preserveAspectRatio="xMidYMid meet"
        >
          <path d="M 6 20 H 30 M 22 11 L 32 20 L 22 29" fill="none" stroke="#6b5a66" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ))}
      <div data-guide="num-tray" className="absolute pointer-events-none" style={{ left: L.row.x, top: L.row.y, width: L.row.w, height: L.row.h }} aria-hidden="true" />
      {spec.numbers.map((v, step) => {
        const p = posOf(step)
        return (
          <div key={step} className="nk-tile absolute z-20" style={{ left: 0, top: 0, width: L.s, height: L.s, transform: `translate(${p.x}px, ${p.y}px)` }}>
            <NumberCard
              guideId={`num-tile-${step}`}
              label={String(v)}
              state={stateOf(step)}
              // (one tint for all: a colour must never tell the order)
              tint={1}
              right={false}
              disabled={!active || step < placed}
              onPick={() => void tap(step)}
              className={`w-full h-full ${lit === step ? 'nk-lit' : ''}`}
            >
              <Numeral n={v} />
            </NumberCard>
          </div>
        )
      })}
    </div>
  )
}

/** The numbers lit as the question starts, the first slot on "smallest", then the hand over the numbers; after a miss, just "Which number comes next?" */
function askSteps(problem: ListenProblem): GuideStep[] {
  const placed = progress.get(problem) ?? 0
  if (placed > 0) return [{ voice: { line: 'k-compare/orderNext' }, target: 'num-tray', hand: 'sweep', pad: 10 }]
  return [
    { voice: problem.speech ?? null, target: 'num-tray', hand: false, pad: 10 },
    { target: 'num-slot-0', cue: 'smallest', hand: false, pad: 8 },
    // and the hand glides over the numbers: the child's turn
    { voice: null, target: 'num-tray', hand: 'sweep', pad: 10 },
  ]
}

export const numberOrderActivity: ListenActivityDef<NumberOrderSpec> = { Component: NumberOrder, askSteps }

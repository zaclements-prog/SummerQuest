/* eslint-disable react-refresh/only-export-components -- an activity module exports its definition (component + askSteps) for the registry; not an HMR boundary */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GuideStep } from '../../../guide/store'
import { guide } from '../../../guide/store'
import { sfx } from '../../../lib/sound'
import type { ListenActivityDef, ListenActivityProps, ListenProblem } from '../types'
import { sayNumber, type BuildSpec } from './numberSpecs'
import { Numeral, TenFrames, nap, tenAndMoreSteps, type CellMarks } from './numberKit'

/**
 * The `build` activity, "Fill the frames" (Ten Frame Plateau, K.NBT.1): the
 * number to make (a big numeral), two empty ten-frames, ✓. "Make fourteen: a
 * full ten and four more! Then tap the check." Each tap on the frames puts
 * the next counter in (the top frame first, row by row) and says the count;
 * a tap on a counter takes the last one out; ↩ takes one back, ⟲ starts
 * over; ✓ says "that's it" (no timers, nothing sent on its own).
 *
 * After a miss the help clears the frames, fills a full ten ("Let's fill a
 * full ten." … "A full ten!"), counts on the ones as they drop in ("Eleven!
 * Twelve!…"), and says "Ten and four more: fourteen." The next try starts
 * with the full ten in place; from the second miss, dashed rings show where
 * the ones go.
 *
 * Guide ids: `build-number` (the numeral), `build-frames`, `build-check`.
 */

export const BUILD_NUMBER = 'build-number'
export const BUILD_FRAMES = 'build-frames'
export const BUILD_CHECK = 'build-check'

function BuildTeen({ problem, spec, phase, active, misses, onAttempt, registerHelp }: ListenActivityProps<BuildSpec>) {
  // the counters of this try: a new try (misses + 1) starts with the full ten in place
  const round = useMemo(() => ({ problem, misses }), [problem, misses])
  const startCount = misses > 0 ? 10 : 0
  const [state, setState] = useState({ round, count: startCount })
  const count = state.round === round ? state.count : startCount
  const [glow, setGlow] = useState<number | null>(null)
  // the help's count-on: each one more gets its number (11, 12, …) until the next try
  const [marks, setMarks] = useState<{ round: typeof round; m: CellMarks }>({ round, m: {} })
  const [helping, setHelping] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  useEffect(() => () => clearInterval(timer.current), [])

  const set = useCallback((n: number) => setState({ round, count: Math.max(0, Math.min(20, n)) }), [round])

  // the help after a miss: a full ten, then the ones counted on as they drop in
  useEffect(() => {
    const help = async () => {
      setHelping(true)
      setGlow(null)
      setMarks({ round, m: {} })
      set(0)
      let filled = 0
      const fill = () => {
        clearInterval(timer.current)
        timer.current = setInterval(() => {
          filled = Math.min(10, filled + 1)
          set(filled)
          if (filled >= 10) clearInterval(timer.current)
        }, 110)
      }
      const steps: GuideStep[] = [
        { voice: { line: 'k-teens/fillTen' }, target: BUILD_FRAMES, hand: false, pad: 8, pause: 0.5, events: [{ char: 0, run: fill }] },
        ...tenAndMoreSteps(spec.n, BUILD_FRAMES, (frame) => {
          clearInterval(timer.current)
          set(frame === 0 ? 10 : 20)
          setGlow(frame)
        }, (cell, n) => {
          set(cell + 1)
          setMarks((x) => ({ round, m: { ...(x.round === round ? x.m : {}), [cell]: n } }))
        }),
      ]
      await guide.sequence(steps, { repeatable: false })
      await nap(200)
      clearInterval(timer.current)
      setGlow(null)
      setHelping(false)
    }
    registerHelp(help)
    return () => registerHelp(null)
  }, [registerHelp, spec, set, round])

  const can = active && !helping
  function tapCell(cell: number) {
    if (!can) return
    if (cell < count) {
      // a counter: take the last one out
      sfx.tick()
      set(count - 1)
      return
    }
    if (count >= 20) return
    sfx.pop()
    set(count + 1)
    void guide.say(sayNumber(count + 1))
  }
  function undo() {
    if (!can || !count) return
    sfx.tick()
    set(count - 1)
  }
  function reset() {
    if (!can || !count) return
    sfx.whoosh()
    set(0)
  }
  function done() {
    if (!can || !count) return
    sfx.pop()
    onAttempt(count === spec.n)
  }

  const right = phase === 'praise' || phase === 'done' || phase === 'loading'
  // from the second miss: dashed rings where the ones go
  const ghosts = misses >= 2 && !helping ? Math.max(0, spec.n - count) : 0
  return (
    <div
      className="flex-1 min-h-0 min-w-0 flex flex-col landscape:flex-row items-stretch justify-center gap-4 short:gap-3 roomy:gap-6"
      data-build={import.meta.env.DEV ? spec.n : undefined}
      data-build-count={count}
      data-state={right ? 'right' : phase === 'oops' ? 'look' : 'idle'}
    >
      {/* the number to make */}
      <div className="shrink-0 flex landscape:flex-col items-center justify-center">
        <div data-guide={BUILD_NUMBER} className="relative w-28 h-28 short:w-32 short:h-32 roomy:w-40 roomy:h-40 bg-paper border-[3px] border-line rounded-[1.75rem] shadow-card">
          <span className="absolute inset-[10%]">
            <Numeral n={spec.n} />
          </span>
        </div>
      </div>

      {/* the two ten-frames: tap to put a counter in */}
      <div data-guide={BUILD_FRAMES} className="nk-build-frames lp-picture-panel relative flex-1 min-h-0 min-w-0 bg-paper border-[3px] border-line rounded-[2rem] shadow-card overflow-hidden">
        <div className="absolute inset-[4%] grid place-items-center">
          <TenFrames count={count} frames={2} glow={glow} ghosts={ghosts} marks={marks.round === round ? marks.m : undefined} onCellTap={can ? tapCell : undefined} />
        </div>
      </div>

      {/* ✓ when they're all in; ↩ one back; ⟲ start over */}
      <div className="shrink-0 flex landscape:flex-col-reverse items-center justify-center gap-3 roomy:gap-4">
        <RoundButton icon="↩" label="Undo" onClick={undo} disabled={!can || !count} />
        <RoundButton icon="⟲" label="Start over" onClick={reset} disabled={!can || !count} />
        <RoundButton icon="✓" label="Done" onClick={done} disabled={!can || !count} guide={BUILD_CHECK} big />
      </div>
    </div>
  )
}

function RoundButton({ icon, label, onClick, disabled, guide: guideId, big = false }: { icon: string; label: string; onClick: () => void; disabled: boolean; guide?: string; big?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-guide={guideId}
      aria-disabled={disabled || undefined}
      onClick={onClick}
      className={[
        'grid place-items-center shrink-0 rounded-full leading-none select-none font-bold text-ink-900 [text-shadow:none]',
        'border-[3px] border-line shadow-ledge transition-[translate,box-shadow,opacity] duration-100',
        disabled ? 'opacity-45 cursor-default' : 'active:translate-y-[3px] active:shadow-ledge-sm cursor-pointer',
        'outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70 focus-visible:ring-offset-2',
        big ? 'bg-correct-400 w-24 h-24 text-5xl roomy:w-28 roomy:h-28' : 'bg-paper w-16 h-16 text-3xl roomy:w-[4.5rem] roomy:h-[4.5rem]',
      ].join(' ')}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  )
}

/** The number as the line starts, the frames a moment later, ✓ on "check". */
function askSteps(problem: ListenProblem): GuideStep[] {
  return [
    { voice: problem.speech ?? null, target: BUILD_NUMBER, hand: false, pad: 8 },
    { target: BUILD_FRAMES, cue: 0.3, hand: 'tap', pad: 8 },
    { target: BUILD_CHECK, cue: 'check', hand: 'tap', pad: 10 },
  ]
}

export const buildActivity: ListenActivityDef<BuildSpec> = { Component: BuildTeen, askSteps }

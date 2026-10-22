/* eslint-disable react-refresh/only-export-components -- an activity module exports its definition (component + askSteps) for the registry; not an HMR boundary */
import { useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { GuideStep } from '../../../guide/store'
import { guide } from '../../../guide/store'
import { M } from '../../../tutoring/motion/palette'
import type { ListenActivityDef, ListenActivityProps, ListenProblem } from '../types'
import { THING_BASE, centroid, mixRole, polyPath, shares } from '../shareGeometry'
import { ShareFigure } from '../sharesArt'
import { useChoice, type ChoiceCard } from './numberKit'
import { sayShare, shareTapHelp, type ShareTapSpec } from './shareTapSpec'
import './shares.css'

/**
 * The `shareTap` activity (Fair Share Falls, 1.G.3): one big pizza (or pie,
 * sandwich, cake, garden) cut into a half and two fourths. "Tap the half of
 * the pizza." / "Tap a fourth of the pizza." Each share is a tap target; a
 * tap says its name ("A half!"), then it is judged: right → it turns green;
 * not yet → it rests aside (faded) and the help runs: the two fourths light
 * up together ("Two fourths make one half."), then the half ("This share is
 * one half."), or the other way round when a fourth was asked.
 *
 * Guide ids: `share-picture` (the thing), `share-region-<i>` (0: the half,
 * 1 and 2: the fourths).
 */

export const SHARE_PICTURE = 'share-picture'
export const shareRegion = (i: number) => `share-region-${i}`

const ROLES = [0, 1, 2]

function ShareTap({ spec, phase, active, onAttempt, registerHelp }: ListenActivityProps<ShareTapSpec>) {
  const cards: ChoiceCard[] = useMemo(() => ROLES.map((i) => ({ value: mixRole(i), speech: sayShare(i) })), [])
  const choice = useChoice({ cards, answer: spec.ask, active, phase, onAttempt })
  const [glow, setGlow] = useState<'half' | 'fourths' | null>(null)

  // the help after a miss: the fourths together, then the half (or the other way round)
  useEffect(() => {
    const help = async () => {
      setGlow(null)
      const steps = shareTapHelp(spec).map(
        (h): GuideStep => ({ voice: h.voice, target: h.light === 'half' ? shareRegion(0) : [shareRegion(1), shareRegion(2)], hand: false, pad: 6, pause: 0.5, events: [{ char: 0, run: () => setGlow(h.light) }] }),
      )
      await guide.sequence(steps, { repeatable: false })
      setGlow(null)
    }
    registerHelp(help)
    return () => registerHelp(null)
  }, [registerHelp, spec])

  const interactive = active && !choice.busy
  const key = (i: number) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      void choice.pick(i)
    }
  }
  const lit = (i: number) => (glow === 'half' ? i === 0 : glow === 'fourths' ? i > 0 : false)

  return (
    <div className="flex-1 min-h-0 min-w-0 grid place-items-center" data-share-tap={spec.ask}>
      <div data-guide={SHARE_PICTURE} className="lp-picture-panel relative h-full max-h-[min(100%,36rem)] aspect-square max-w-full bg-paper border-[3px] border-line rounded-[2rem] shadow-card overflow-hidden">
        <svg viewBox="0 0 100 100" className="absolute inset-[4%] w-[92%] h-[92%] st-figure" role="group" aria-label="shares">
          <ShareFigure
            thing={spec.thing}
            cut="mix"
            turn={spec.turn}
            under={(i, poly) => {
              const state = choice.stateOf(i)
              return (
                <>
                  {lit(i) && <path d={polyPath(poly)} fill="#ffe594" opacity={0.85} />}
                  {state === 'right' && <path d={polyPath(poly)} fill="#8edb7c" opacity={0.85} />}
                  {(state === 'tried' || state === 'dim') && <path d={polyPath(poly)} fill="#ffffff" opacity={0.55} />}
                  {(state === 'chosen' || state === 'look') && <path className={state === 'look' ? 'st-look' : undefined} d={polyPath(poly)} fill="#ffcf4d" opacity={0.6} />}
                </>
              )
            }}
            regionProps={(i) => {
              const state = choice.stateOf(i)
              const open = interactive && state === 'idle'
              return {
                'data-guide': shareRegion(i),
                'data-share-region': i,
                'data-role': mixRole(i),
                'data-state': state,
                ...(import.meta.env.DEV && mixRole(i) === spec.ask ? { 'data-correct': '' } : {}),
                role: 'button',
                tabIndex: open ? 0 : -1,
                'aria-label': mixRole(i),
                'aria-disabled': open ? undefined : true,
                onClick: open ? () => void choice.pick(i) : undefined,
                onKeyDown: open ? key(i) : undefined,
                style: { cursor: open ? 'pointer' : 'default' },
                className: 'st-region',
              }
            }}
          />
          {/* the share that was right gets a ✓ */}
          {choice.right !== null && <ShareCheck at={centroid(regionPoly(spec, choice.right))} />}
        </svg>
      </div>
    </div>
  )
}

/** A share's polygon, as ShareFigure draws it. */
const regionPoly = (spec: ShareTapSpec, i: number) => shares(THING_BASE[spec.thing], 'mix', spec.turn)[i]

function ShareCheck({ at }: { at: readonly [number, number] }) {
  return (
    <g transform={`translate(${at[0]} ${at[1]})`} className="lp-badge">
      <circle r={8} fill="#36c35a" stroke={M.ink} strokeWidth={2} />
      <path d="M -3.6 0.2 L -1 3 L 4 -2.8" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  )
}

/** The thing as the line starts, then a hand over it on "Tap". */
function askSteps(problem: ListenProblem): GuideStep[] {
  return [
    { voice: problem.speech ?? null, target: SHARE_PICTURE, hand: false, pad: 6 },
    { target: SHARE_PICTURE, cue: 'Tap', hand: 'tap', pad: 6 },
  ]
}

export const shareTapActivity: ListenActivityDef<ShareTapSpec> = { Component: ShareTap, askSteps }

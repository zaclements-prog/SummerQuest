/* eslint-disable react-refresh/only-export-components -- an activity module exports its definition (the component and how it's asked); not an HMR boundary */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { GuideStep } from '../../../guide/store'
import { guide } from '../../../guide/store'
import { sfx } from '../../../lib/sound'
import { voiceText } from '../../../voice/registry'
import type { VoiceRef } from '../../../voice/types'
import { PictureArt } from '../PictureCard'
import type { ListenActivityDef, ListenActivityProps, ListenProblem } from '../types'
import { DRUM_MAX_TAPS, LP_DRUM, LP_DRUM_CHECK, LP_DRUM_WORD, partOffsets, type DrumSpec } from './drumSpec'
import './drum.css'

/**
 * The `drum` activity ("Clap the parts", RF.K.2b): the word's picture, a big
 * drum and a big ✓. Each tap on the drum makes a thump and adds a clap mark;
 * ↩ takes the last one back and ⟲ clears them all; ✓ says "that's all the
 * parts" (no timers, nothing sent on its own). After a miss the help taps the
 * drum once per part as the voice says them ("Tie… gur."), and from the
 * second miss on dashed rings show how many claps the word needs.
 *
 * Guide ids: `lp-drum-word` (the picture), `lp-drum` (the drum), `lp-drum-check` (✓).
 */

/** Which question, and which try at it, some claps belong to. */
interface Round {
  problem: ListenProblem
  misses: number
}

function said(ref: VoiceRef): string {
  try {
    return voiceText(ref)
  } catch {
    return ''
  }
}

function Drum({ problem, spec, phase, active, misses, onAttempt, registerHelp }: ListenActivityProps<DrumSpec>) {
  // the claps of this try: `round` is the question and the try they belong to, so a new try (misses + 1)
  // or the next question starts with none
  const round = useMemo(() => ({ problem, misses }), [problem, misses])
  const [taps, setTaps] = useState({ round, n: 0 })
  const n = taps.round === round ? taps.n : 0
  // bumps on every hit: restarts the drum's bounce and its ripple
  const [hit, setHit] = useState(0)

  const strike = useCallback((round: Round) => {
    sfx.thud()
    setHit((h) => h + 1)
    setTaps((t) => ({ round, n: Math.min(DRUM_MAX_TAPS, (t.round === round ? t.n : 0) + 1) }))
  }, [])

  // the help after a miss: the child's claps cleared, then the drum tapped once per part as the voice says them
  useEffect(() => {
    const help = async () => {
      setTaps({ round, n: 0 })
      const offsets = partOffsets(said(spec.partsLine))
      const steps: GuideStep[] = [
        { voice: { line: 'k-sounds/tapTogether' }, target: LP_DRUM, hand: false, pad: 10 },
        { voice: spec.partsLine, target: LP_DRUM, hand: 'tap', pad: 10, pause: 0.6, events: offsets.map((char) => ({ char, run: () => strike(round) })) },
      ]
      await guide.sequence(steps, { repeatable: false })
    }
    registerHelp(help)
    return () => registerHelp(null)
  }, [registerHelp, round, spec, strike])

  function tapDrum() {
    if (!active) return
    strike(round)
  }
  function undo() {
    if (!active || !n) return
    sfx.tick()
    setTaps({ round, n: n - 1 })
  }
  function reset() {
    if (!active || !n) return
    sfx.whoosh()
    setTaps({ round, n: 0 })
  }
  function done() {
    if (!active || !n) return
    sfx.pop()
    onAttempt(n === spec.parts)
  }

  const right = phase === 'praise' || phase === 'done' || phase === 'loading'
  const looking = phase === 'oops'
  // from the second miss: dashed rings show how many claps the word needs
  const rings = misses >= 2 ? spec.parts : 0
  const slots = Math.max(n, rings)

  return (
    <div className="lp-drum flex-1 min-h-0 min-w-0" data-parts={import.meta.env.DEV ? spec.parts : undefined} data-taps={n}>
      {/* the word's picture */}
      <div className="lp-drum-cell [grid-area:pic]">
        <div data-guide={LP_DRUM_WORD} className="lp-drum-square relative bg-paper border-[3px] border-line rounded-[2rem] shadow-card">
          <div className="absolute inset-[10%]">
            <PictureArt picture={{ kind: 'emoji', emoji: spec.emoji }} />
          </div>
        </div>
      </div>

      {/* the drum */}
      <div className="lp-drum-cell [grid-area:drum]">
        <button
          type="button"
          data-guide={LP_DRUM}
          aria-label="Drum"
          aria-disabled={!active || undefined}
          onClick={tapDrum}
          className={`lp-drum-square lp-drum-button relative outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70 rounded-full ${active ? 'cursor-pointer' : 'cursor-default'}`}
        >
          {hit > 0 && <span key={`r${hit}`} className="lp-drum-ripple" aria-hidden="true" />}
          <span key={hit} className={`absolute inset-0 ${hit ? 'lp-drum-bounce' : ''}`} aria-hidden="true">
            <DrumArt />
          </span>
        </button>
      </div>

      {/* the claps so far (and, after two misses, how many the word needs) */}
      <div
        className="[grid-area:marks] flex items-center justify-center gap-2 min-h-14 roomy:min-h-16 flex-wrap"
        role="status"
        aria-label={`${n} ${n === 1 ? 'tap' : 'taps'}`}
        data-state={right ? 'right' : looking ? 'look' : 'idle'}
      >
        {Array.from({ length: slots }, (_, i) =>
          i < n ? (
            <span key={`c${i}`} data-clap="" className={`lp-clap grid place-items-center w-14 h-14 roomy:w-16 roomy:h-16 rounded-full border-[3px] border-line text-3xl leading-none ${right ? 'bg-correct-300' : 'bg-quest-300'}`} aria-hidden="true">
              👏
            </span>
          ) : (
            <span key={`g${i}`} data-ring="" className="grid w-14 h-14 roomy:w-16 roomy:h-16 rounded-full border-[3px] border-dashed border-line/40 bg-paper/50" aria-hidden="true" />
          ),
        )}
      </div>

      {/* ✓ when every part is tapped; ↩ one back; ⟲ start over */}
      <div className="lp-drum-controls [grid-area:ctl] flex items-center justify-center gap-3 roomy:gap-4">
        <RoundButton icon="↩" label="Undo" onClick={undo} disabled={!active || !n} className="lp-drum-small" />
        <RoundButton icon="⟲" label="Start over" onClick={reset} disabled={!active || !n} className="lp-drum-small" />
        <RoundButton icon="✓" label="Done" onClick={done} disabled={!active || !n} guide={LP_DRUM_CHECK} tone="go" className="lp-drum-check" />
      </div>
    </div>
  )
}

function RoundButton({
  icon,
  label,
  onClick,
  disabled,
  guide: guideId,
  tone = 'paper',
  className = '',
}: {
  icon: string
  label: string
  onClick: () => void
  disabled: boolean
  guide?: string
  tone?: 'paper' | 'go'
  className?: string
}) {
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
        tone === 'go' ? 'bg-correct-400' : 'bg-paper',
        className,
      ].join(' ')}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  )
}

/** A toy drum: red shell, gold hoops, a cream skin on top. */
function DrumArt() {
  const ink = '#3a2c38'
  return (
    <svg viewBox="0 0 200 180" className="block w-full h-full" aria-hidden="true">
      <ellipse cx={100} cy={166} rx={78} ry={9} fill={ink} opacity={0.14} />
      {/* shell */}
      <path d="M18 62 L18 128 A82 26 0 0 0 182 128 L182 62 Z" fill="#f2766b" stroke={ink} strokeWidth={5} strokeLinejoin="round" />
      {/* ropes */}
      <path d="M18 78 L45 146 L72 82 L100 154 L128 82 L155 146 L182 78" fill="none" stroke="#fdf3dc" strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" />
      {/* bottom hoop */}
      <path d="M18 124 A82 26 0 0 0 182 124 L182 134 A82 26 0 0 1 18 134 Z" fill="#ffcf4d" stroke={ink} strokeWidth={4} strokeLinejoin="round" />
      {/* top hoop and skin */}
      <ellipse cx={100} cy={62} rx={82} ry={26} fill="#ffcf4d" stroke={ink} strokeWidth={5} />
      <ellipse className="lp-drum-skin" cx={100} cy={60} rx={70} ry={20} fill="#fffaf0" stroke={ink} strokeWidth={3} />
      <ellipse cx={78} cy={54} rx={18} ry={5} fill="#ffffff" opacity={0.8} />
    </svg>
  )
}

/** How the question is put: the picture as the word is said, the drum on "drum", the ✓ on "check". */
function askSteps(p: ListenProblem): GuideStep[] {
  return [
    { voice: p.speech ?? null, target: LP_DRUM_WORD, hand: false, pad: 8 },
    { target: LP_DRUM, cue: 'drum', hand: 'tap', pad: 10 },
    { target: LP_DRUM_CHECK, cue: 'check', hand: 'tap', pad: 10 },
  ]
}

export const drumActivity: ListenActivityDef<DrumSpec> = { Component: Drum, askSteps }

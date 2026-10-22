/* eslint-disable react-refresh/only-export-components -- an activity module exports its definition (component + askSteps) for the registry; not an HMR boundary */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { GuideStep } from '../../../guide/store'
import { guide } from '../../../guide/store'
import { countAlongOffsets, numberWord } from '../../../lib/numberWords'
import { M } from '../../../tutoring/motion/palette'
import { voiceText } from '../../../voice/registry'
import type { ListenActivityDef, ListenActivityProps, ListenProblem } from '../types'
import { frameCardLines, sayNumber, type TenFramesSpec } from './numberSpecs'
import { NumberCard, Numeral, NumeralGlyph, TenFrames, nkCard, sweepCards, tenAndMoreSteps, useChoice, type CellMarks, type ChoiceCard } from './numberKit'

/**
 * The `tenFrames` activity (Ten Frame Plateau, K.NBT.1 and K.CC.2): teen
 * numbers as a full ten and some more, answered with cards.
 *
 * - `howMany`: two ten-frames (the full ten on top, the ones below; dots, or
 *   things to count); numeral cards. Help: "A full ten!" (the top frame
 *   glows), the ones counted on ("Eleven! Twelve! Thirteen!", each lighting),
 *   then "Ten and three more: thirteen."
 * - `shows`: a big numeral; three ten-frame cards (the number, its ones
 *   alone with an empty top frame, one off). Help: the card that was tapped,
 *   counted the same way ("…Ten and five more: fifteen."), or for the ones
 *   alone "One, two, three, four. That's only four. There's no full ten!"
 * - `next`: three numbers counting up and a blank; numeral cards. Help: "Let's
 *   count on.", each number lit as it is said, then the blank as the next one
 *   is said.
 *
 * Guide ids: `teen-picture` (the frames, the numeral, the row of numbers),
 * `teen-tile-<k>` (a number in the row; 3 is the blank), `lp-card-<i>`.
 */

export const TEEN_PICTURE = 'teen-picture'

/** The cards still open on each question, for `askSteps`. */
const openCards = new WeakMap<object, number[]>()

/** A ten-frame card's dots: a teen number from the top frame, the ones alone in the bottom frame (no ten). */
const frameCard = (v: number) => (v >= 10 ? { count: v, start: 0 as const } : { count: v, start: 10 as const })

function TenFramesQuiz({ problem, spec, phase, active, onAttempt, registerHelp }: ListenActivityProps<TenFramesSpec>) {
  const cards: ChoiceCard[] = useMemo(() => spec.cards.map((n) => ({ value: n, speech: sayNumber(n) })), [spec])
  const choice = useChoice({ cards, answer: spec.n, active, phase, onAttempt })
  const [marks, setMarks] = useState<Record<string, CellMarks>>({})
  const [glow, setGlow] = useState<{ where: string; frame: number } | null>(null)
  const [lit, setLit] = useState<number | null>(null)
  const picked = useRef<number | null>(null)
  useEffect(() => {
    picked.current = choice.picked
    openCards.set(problem, choice.open)
  })

  // the help after a miss
  useEffect(() => {
    const mark = (where: string) => (cell: number, n: number) => setMarks((m) => ({ ...m, [where]: { ...m[where], [cell]: n } }))
    const help = async () => {
      setMarks({})
      setGlow(null)
      setLit(null)
      let steps: GuideStep[]
      if (spec.ask === 'howMany') {
        steps = tenAndMoreSteps(spec.n, TEEN_PICTURE, (frame) => setGlow({ where: 'picture', frame }), mark('picture'))
      } else if (spec.ask === 'shows') {
        const i = picked.current ?? 0
        const v = spec.cards[i]
        const where = `card${i}`
        if (v >= 10) {
          steps = tenAndMoreSteps(v, nkCard(i), (frame) => setGlow({ where, frame }), mark(where))
        } else {
          // "One, two, three, four." (the ones alone, in the bottom frame) "That's only four. There's no full ten!"
          const [line, only] = frameCardLines(v)
          steps = [
            { voice: line, target: nkCard(i), hand: false, pad: 12, pause: 0.4, events: countAlongOffsets(voiceText(line)).map((char, k) => ({ char, run: () => mark(where)(10 + k, k + 1) })) },
            { voice: only, target: nkCard(i), hand: false, pad: 12, pause: 0.4 },
          ]
        }
      } else {
        const run = [spec.n - 3, spec.n - 2, spec.n - 1, spec.n]
        steps = [
          { voice: { line: 'k-teens/countOn' }, target: TEEN_PICTURE, hand: false, pad: 6, pause: 0.25 },
          ...run.map((v, k): GuideStep => ({ voice: sayNumber(v), target: `teen-tile-${k}`, hand: false, pad: 8, pause: 0.2, events: [{ char: 0, run: () => setLit(k) }] })),
        ]
      }
      await guide.sequence(steps, { repeatable: false })
      setLit(null)
    }
    registerHelp(help)
    return () => registerHelp(null)
  }, [registerHelp, spec])

  const interactive = active && !choice.busy
  const glowAt = (where: string) => (glow?.where === where ? glow.frame : null)

  let picture: ReactNode
  if (spec.ask === 'howMany') {
    picture = <TenFrames count={spec.n} frames={2} emoji={spec.emoji} marks={marks.picture} glow={glowAt('picture')} />
  } else if (spec.ask === 'shows') {
    // (the drawing keeps its shape inside whatever box it gets)
    picture = <Numeral n={spec.n} />
  } else {
    const run = [spec.n - 3, spec.n - 2, spec.n - 1]
    // one drawing, so the four squares stay square on any screen
    picture = (
      <svg viewBox="0 0 470 116" className="block w-full h-full" aria-hidden="true">
        {[...run, null].map((v, k) => (
          <g key={k} data-guide={`teen-tile-${k}`} data-lit={lit === k ? '' : undefined} transform={`translate(${8 + k * 116} 8)`}>
            {lit === k && <rect x={-6} y={-6} width={112} height={112} rx={26} fill="#ffe594" stroke="#ffcf4d" strokeWidth={6} />}
            {v === null ? (
              <rect x={2} y={2} width={96} height={96} rx={22} fill="#fffaf0" stroke={M.ink} strokeOpacity={0.45} strokeWidth={4} strokeDasharray="10 8" />
            ) : (
              <>
                <rect x={2} y={6} width={96} height={96} rx={22} fill={M.ink} opacity={0.25} />
                <rect x={2} y={2} width={96} height={96} rx={22} fill="#dff1fb" stroke={M.ink} strokeWidth={4} />
              </>
            )}
            <svg x={10} y={10} width={80} height={80} viewBox="0 0 100 100">
              {v === null ? <Blank /> : <NumeralGlyph n={v} />}
            </svg>
          </g>
        ))}
      </svg>
    )
  }

  const cardEls = spec.cards.map((v, i) => (
    <NumberCard
      key={`${v}-${i}`}
      guideId={nkCard(i)}
      label={String(v)}
      state={choice.stateOf(i)}
      tint={i}
      right={v === spec.n}
      disabled={!interactive}
      onPick={() => void choice.pick(i)}
      className={spec.ask === 'next' ? 'flex-1 max-w-[min(12rem,30vh)] roomy:max-w-[min(14rem,30vh)]' : spec.ask === 'shows' ? 'flex-1 max-w-64 roomy:max-w-72' : 'flex-1 max-w-52 roomy:max-w-60'}
    >
      {spec.ask === 'shows' ? <TenFrames {...frameCard(v)} frames={2} marks={marks[`card${i}`]} glow={glowAt(`card${i}`)} /> : <Numeral n={v} />}
    </NumberCard>
  ))

  if (spec.ask === 'next') {
    // a wide row of numbers on top, the cards under it
    return (
      <div className="flex-1 min-h-0 min-w-0 flex flex-col justify-center gap-4 short:gap-3 roomy:gap-6" data-teen={spec.ask}>
        <div data-guide={TEEN_PICTURE} className="lp-picture-panel relative w-full flex-1 min-h-28 max-h-[16rem] bg-paper border-[3px] border-line rounded-[2rem] shadow-card overflow-hidden">
          <div className="absolute inset-[5%]">{picture}</div>
        </div>
        <div className="shrink-0 flex items-center justify-center gap-4 short:gap-3 roomy:gap-6 px-1 pb-1" role="group" aria-label="answers">
          {cardEls}
        </div>
      </div>
    )
  }
  return (
    // the picture over the cards (side by side on a landscape screen), as the kit lays out a card question
    <div
      className={[
        'flex-1 min-h-0 min-w-0 flex flex-col justify-center gap-5 roomy:gap-7 landscape:grid landscape:grid-rows-1 landscape:items-center landscape:gap-4 short:gap-3',
        // (ten-frame cards need the room: the numeral they show gets less)
        spec.ask === 'shows' ? 'landscape:grid-cols-[minmax(0,0.7fr)_minmax(0,1.6fr)]' : 'landscape:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]',
      ].join(' ')}
      data-teen={spec.ask}
    >
      <div data-guide={TEEN_PICTURE} className="lp-picture-panel relative w-full h-[min(44vh,30rem)] landscape:h-full landscape:max-h-[34rem] min-h-40 shrink self-center bg-paper border-[3px] border-line rounded-[2rem] shadow-card overflow-hidden">
        <div className="absolute inset-[5%] grid place-items-center">{picture}</div>
      </div>
      <div className="shrink-0 flex items-center justify-center gap-4 short:gap-3 roomy:gap-6 px-1 pb-1" role="group" aria-label="answers">
        {cardEls}
      </div>
    </div>
  )
}

/** The blank in "what comes next?": a question mark (a symbol, not a word). */
function Blank() {
  return (
    <text x={50} y={54} fontFamily={M.font} fontWeight={700} fontSize={70} textAnchor="middle" dominantBaseline="central" fill="#3a2c38" opacity={0.3}>
      ?
    </text>
  )
}

/** The picture as the line starts, then the cards on "Tap" or "How many" (or after "next?"), the hand gliding along them. */
function askSteps(problem: ListenProblem, spec: TenFramesSpec): GuideStep[] {
  const open = openCards.get(problem) ?? spec.cards.map((_, i) => i)
  if (spec.ask === 'next') {
    // each number lit as it is said, the blank on "next", then the cards
    return [
      { voice: problem.speech ?? null, target: 'teen-tile-0', hand: false, pad: 8 },
      { target: 'teen-tile-1', cue: numberWord(spec.n - 2), hand: false, pad: 8 },
      { target: 'teen-tile-2', cue: numberWord(spec.n - 1), hand: false, pad: 8 },
      { target: 'teen-tile-3', cue: 'What', hand: false, pad: 8 },
      sweepCards(open),
    ]
  }
  const text = problem.speech ? voiceText(problem.speech) : ''
  const cue = /Tap/.test(text) ? 'Tap' : /How many/.test(text) ? 'How many' : 0.5
  return [{ voice: problem.speech ?? null, target: TEEN_PICTURE, hand: false, pad: 6 }, sweepCards(open, { cue })]
}

export const tenFramesActivity: ListenActivityDef<TenFramesSpec> = { Component: TenFramesQuiz, askSteps }

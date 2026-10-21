/* eslint-disable react-refresh/only-export-components -- an activity module exports its definition (component + askSteps) for the registry; not an HMR boundary */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { GuideStep } from '../../../guide/store'
import { guide } from '../../../guide/store'
import { countAlongOffsets, numberWord } from '../../../lib/numberWords'
import { phraseIndex } from '../../../tutoring/motion/cues'
import { voiceText } from '../../../voice/registry'
import type { VoiceRef } from '../../../voice/types'
import type { ListenActivityDef, ListenActivityProps, ListenProblem } from '../types'
import { numbersAnswer, numbersHelpLines, sayNumber, type NumbersSpec } from './numberSpecs'
import { NumberCard, Numeral, TenFrames, nkCard, sweepCards, useChoice, type CellMarks, type ChoiceCard } from './numberKit'

/**
 * The `numbers` activity (Number Dunes, K.CC.7 and K.CC.4c), numeral cards:
 *
 * - "Which number is more, seven or four?" (or "…less…"): two big numeral
 *   cards, each lit as its number is said. After a miss each card shows its
 *   ten-frame under the numeral, the dots on each are counted ("One, two,
 *   three…", each dot lighting), and "Seven is more than four." The frames
 *   stay for the next try.
 * - "Here are six dots. One more comes! How many now?": a ten-frame; a dot
 *   drops in on "One more" (or hops away on "One hops away"); three numeral
 *   cards. After a miss the dots are counted, then "Six and one more is seven."
 *
 * Guide ids: `numbers-frame` (the one-more ten-frame), `lp-card-<i>`.
 */

export const NUMBERS_FRAME = 'numbers-frame'

/** The cards still open on each question, for `askSteps`. */
const openCards = new WeakMap<object, number[]>()
/** The one-more dot drop, run by the question's line as it reaches "One more" / "One hops away". */
const droppers = new WeakMap<object, () => void>()

const isPair = (s: NumbersSpec) => s.ask === 'more' || s.ask === 'less'

function said(ref: VoiceRef | undefined): string {
  try {
    return ref ? voiceText(ref) : ''
  } catch {
    return ''
  }
}

function CompareNumbers({ problem, spec, phase, active, onAttempt, registerHelp }: ListenActivityProps<NumbersSpec>) {
  const answer = numbersAnswer(spec)
  const cards: ChoiceCard[] = useMemo(() => spec.cards.map((n) => ({ value: n, speech: sayNumber(n) })), [spec])
  const choice = useChoice({ cards, answer, active, phase, onAttempt })
  // two numbers: their ten-frames, once the help shows them; the dots counted on each card
  const [revealed, setRevealed] = useState(false)
  const [marks, setMarks] = useState<Record<string, CellMarks>>({})
  // one more / one less: the dot that drops in or hops away, and how many are on the frame
  const [dropped, setDropped] = useState(false)
  const [count, setCount] = useState(spec.a)
  const [gone, setGone] = useState<number | null>(null)

  useEffect(() => {
    openCards.set(problem, choice.open)
  })

  const mark = (where: string, cell: number) => setMarks((m) => ({ ...m, [where]: { ...m[where], [cell]: cell + 1 } }))

  // the line drops the dot in (or sends it away) as it says so
  const droppedNow = useRef(false)
  useEffect(() => {
    if (isPair(spec)) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const drop = () => {
      if (droppedNow.current) return
      droppedNow.current = true
      setDropped(true)
      if (spec.ask === 'oneMore') setCount(spec.a + 1)
      else {
        setGone(spec.a - 1)
        timer = setTimeout(() => {
          setCount(spec.a - 1)
          setGone(null)
        }, 700)
      }
    }
    droppers.set(problem, drop)
    return () => {
      // (gone for good: the dot that was hopping away is off the frame)
      if (timer !== undefined) {
        clearTimeout(timer)
        setCount(spec.a - 1)
        setGone(null)
      }
      if (droppers.get(problem) === drop) droppers.delete(problem)
    }
  }, [problem, spec])

  // the help after a miss
  useEffect(() => {
    const help = async () => {
      setMarks({})
      // [intro, the count-along(s)…, what it shows]: "Let's count the dots on each one." … "Seven is more than four."
      const lines = numbersHelpLines(spec)
      const counts = lines.slice(1, -1)
      const counting = (voice: VoiceRef, target: string, where: string): GuideStep => ({
        voice,
        target,
        hand: false,
        pad: target === NUMBERS_FRAME ? 6 : 12,
        pause: 0.45,
        events: countAlongOffsets(voiceText(voice)).map((char, k) => ({ char, run: () => mark(where, k) })),
      })
      let steps: GuideStep[]
      if (isPair(spec)) {
        setRevealed(true)
        const both = [nkCard(0), nkCard(1)]
        steps = [{ voice: lines[0], target: both, hand: false, pad: 12, pause: 0.35 }, ...counts.map((v, i) => counting(v, nkCard(i), `card${i}`)), { voice: lines[lines.length - 1], target: both, hand: false, pad: 12, pause: 0.4 }]
      } else {
        // one more / one less: the dot moves now if it hasn't yet, then the dots are counted
        droppers.get(problem)?.()
        steps = [{ voice: lines[0], target: NUMBERS_FRAME, hand: false, pad: 6, pause: 0.2 }, ...counts.map((v) => counting(v, NUMBERS_FRAME, 'frame')), { voice: lines[lines.length - 1], target: NUMBERS_FRAME, hand: false, pad: 6, pause: 0.4 }]
      }
      await guide.sequence(steps, { repeatable: false })
    }
    registerHelp(help)
    return () => registerHelp(null)
  }, [registerHelp, spec, problem])

  const interactive = active && !choice.busy
  const card = (n: number, i: number, className: string) => (
    <NumberCard key={`${n}-${i}`} guideId={nkCard(i)} label={String(n)} state={choice.stateOf(i)} tint={i} right={n === answer} disabled={!interactive} onPick={() => void choice.pick(i)} className={className}>
      {revealed ? (
        <span className="absolute inset-0 flex flex-col items-center justify-between">
          <span className="block w-full h-[52%]">
            <Numeral n={n} />
          </span>
          <span className="block w-full h-[42%]">
            <TenFrames count={n} frames={1} marks={marks[`card${i}`]} />
          </span>
        </span>
      ) : (
        <Numeral n={n} />
      )}
    </NumberCard>
  )

  if (isPair(spec)) {
    return (
      // two numbers, nothing else: the cards take the stage, big
      <div className="flex-1 min-h-0 min-w-0 flex items-center justify-center" data-numbers={spec.ask} data-revealed={revealed ? '' : undefined}>
        <div className="w-full flex items-center justify-center gap-6 short:gap-5 roomy:gap-10 px-2 pb-2" role="group" aria-label="answers">
          {spec.cards.map((n, i) => card(n, i, 'flex-1 max-w-72 landscape:max-w-[min(18rem,62vh)] roomy:max-w-80 landscape:roomy:max-w-[min(20rem,58vh)]'))}
        </div>
      </div>
    )
  }
  return (
    // one more / one less: the ten-frame (a wide picture) over the cards
    <div className="flex-1 min-h-0 min-w-0 flex flex-col justify-center gap-4 short:gap-3 roomy:gap-6" data-numbers={spec.ask} data-dropped={dropped ? '' : undefined}>
      <div data-guide={NUMBERS_FRAME} className="lp-picture-panel relative w-full flex-1 min-h-32 max-h-[24rem] bg-paper border-[3px] border-line rounded-[2rem] shadow-card overflow-hidden">
        <div className="absolute inset-[6%] grid place-items-center">
          <TenFrames count={count} frames={1} marks={marks.frame} fresh={spec.ask === 'oneMore' && dropped ? spec.a : null} gone={gone} />
        </div>
      </div>
      <div className="shrink-0 flex items-center justify-center gap-4 short:gap-3 roomy:gap-6 px-1 pb-1" role="group" aria-label="answers">
        {spec.cards.map((n, i) => card(n, i, 'flex-1 max-w-[min(12rem,30vh)] roomy:max-w-[min(14rem,30vh)]'))}
      </div>
    </div>
  )
}

function askSteps(problem: ListenProblem, spec: NumbersSpec): GuideStep[] {
  const open = openCards.get(problem) ?? spec.cards.map((_, i) => i)
  const text = said(problem.speech)
  if (isPair(spec)) {
    return [
      { voice: problem.speech ?? null, target: open.map(nkCard), hand: false, pad: 12 },
      // each number lit as it is said
      ...open.map((i): GuideStep => ({ target: nkCard(i), cue: numberWord(spec.cards[i]), hand: 'tap', pad: 12 })),
      sweepCards(open),
    ]
  }
  // the frame as the line starts; the dot drops in (or hops away) on its words; the cards on "How many"
  const at = phraseIndex(text, spec.ask === 'oneMore' ? 'One more' : 'One hops')
  return [
    { voice: problem.speech ?? null, target: NUMBERS_FRAME, hand: false, pad: 6, events: at >= 0 ? [{ char: at, run: () => droppers.get(problem)?.() }] : [] },
    sweepCards(open, { cue: 'How many' }),
  ]
}

export const compareNumbersActivity: ListenActivityDef<NumbersSpec> = { Component: CompareNumbers, askSteps }

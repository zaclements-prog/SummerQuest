/* eslint-disable react-refresh/only-export-components -- an activity module exports its definition (component + askSteps) for the registry; not an HMR boundary */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { GuideStep } from '../../../guide/store'
import { guide } from '../../../guide/store'
import { countAlongOffsets, numberWord } from '../../../lib/numberWords'
import { phraseIndex } from '../../../tutoring/motion/cues'
import { M } from '../../../tutoring/motion/palette'
import { voiceText } from '../../../voice/registry'
import type { VoiceRef } from '../../../voice/types'
import type { ListenActivityDef, ListenActivityProps, ListenProblem } from '../types'
import { NumberCard, nkCard, sweepCards, useChoice, type ChoiceCard } from './numberKit'
import { BaseTen, BigNumeral, BigNumeralGlyph, Sign, SignGlyph, type BlockMarks } from './baseTen'
import { compareHelpLines, countBlocksLines, sayCard, sayTens, shownAfter, signFor, tensAnswer, tensOf, type TensSpec } from './tensSpecs'

/**
 * The `tens` activity (Tens Plateau, 1st grade: 1.NBT.1–3, 1.NBT.5), answered
 * with cards (see ./tensSpecs for each question and its help):
 *
 * - rods and cubes → how many (numeral cards);
 * - a numeral → which blocks show it (base-ten cards), or how many tens;
 * - ten more / ten less: a rod rolls in or away as the voice says so;
 * - two numbers → the bigger (or smaller) one, or the sign > < = that fits;
 * - three numbers counting up → what comes next (to 120).
 *
 * After a miss the blocks are counted as the voice counts them: each rod
 * lights on its ten ("Ten, twenty, thirty."), each cube on its one ("Thirty-
 * one!…"), then "Three tens and six ones: thirty-six."
 *
 * Guide ids: `tens-picture`, `tens-left` / `tens-right` / `tens-box` (a sign
 * question's two numbers and the box), `tens-tile-<k>` (the run of numbers;
 * 3 is the blank), `lp-card-<i>`.
 */

export const TENS_PICTURE = 'tens-picture'
export const TENS_LEFT = 'tens-left'
export const TENS_RIGHT = 'tens-right'
export const TENS_BOX = 'tens-box'
export const tensTile = (k: number) => `tens-tile-${k}`

/** The cards still open on each question, for `askSteps`. */
const openCards = new WeakMap<object, number[]>()
/** Ten more / ten less: the rod moves when the line says so (and at the latest in the help). */
const movers = new WeakMap<object, () => void>()

function said(ref: VoiceRef | undefined): string {
  try {
    return ref ? voiceText(ref) : ''
  } catch {
    return ''
  }
}

/**
 * Count a number's blocks in `where` aloud: the tens by tens (each rod lit on
 * its word), each cube counted on, then its tens and ones said.
 */
function countBlocksSteps(n: number, target: string, mark: (key: string, num: number) => void, pad = 8): GuideStep[] {
  const c = countBlocksLines(n)
  const t = tensOf(n)
  const steps: GuideStep[] = []
  if (c.tens) {
    const offs = countAlongOffsets(voiceText(c.tens))
    steps.push({ voice: c.tens, target, hand: false, pad, pause: 0.3, events: offs.map((char, k) => ({ char, run: () => mark(`r${k}`, (k + 1) * 10) })) })
  }
  c.ones.forEach((voice, k) => steps.push({ voice, target, hand: false, pad, pause: 0.1, events: [{ char: 0, run: () => mark(`o${k}`, t * 10 + k + 1) }] }))
  steps.push({ voice: c.is, target, hand: false, pad, pause: 0.45 })
  return steps
}

function TensQuiz({ problem, spec, phase, active, onAttempt, registerHelp }: ListenActivityProps<TensSpec>) {
  const answer = tensAnswer(spec)
  const cards: ChoiceCard[] = useMemo(() => spec.cards.map((c) => ({ value: c, speech: sayCard(c) })), [spec])
  const choice = useChoice({ cards, answer, active, phase, onAttempt })
  // counted blocks, per place ('picture', 'card0'…, 'left', 'right')
  const [marks, setMarks] = useState<Record<string, BlockMarks>>({})
  // blocks shown under the numbers (how many tens? comparing): from the start, or once the help shows them
  const [revealed, setRevealed] = useState(!!spec.scaffold)
  const [moved, setMoved] = useState(false)
  // the run of numbers: the one being said
  const [lit, setLit] = useState<number | null>(null)
  // comparing: the side being said
  const [side, setSide] = useState<'left' | 'right' | null>(null)
  const picked = useRef<number | null>(null)
  useEffect(() => {
    picked.current = choice.picked
    openCards.set(problem, choice.open)
  })

  // ten more / ten less: the rod rolls in or away on its words
  const movedNow = useRef(false)
  useEffect(() => {
    if (spec.ask !== 'tenMore' && spec.ask !== 'tenLess') return
    const move = () => {
      if (movedNow.current) return
      movedNow.current = true
      setMoved(true)
    }
    movers.set(problem, move)
    return () => {
      if (movers.get(problem) === move) movers.delete(problem)
    }
  }, [problem, spec])

  // the help after a miss
  useEffect(() => {
    const mark = (where: string) => (key: string, num: number) => setMarks((m) => ({ ...m, [where]: { ...m[where], [key]: num } }))
    const help = async () => {
      setMarks({})
      setLit(null)
      setSide(null)
      let steps: GuideStep[]
      switch (spec.ask) {
        case 'howMany':
          steps = countBlocksSteps(spec.n, TENS_PICTURE, mark('picture'))
          break
        case 'shows': {
          const i = picked.current ?? 0
          const v = Number(spec.cards[i])
          steps = countBlocksSteps(v, nkCard(i), mark(`card${i}`), 12)
          break
        }
        case 'tensIn':
          setRevealed(true)
          steps = countBlocksSteps(spec.n, TENS_PICTURE, mark('picture'))
          break
        case 'tenMore':
        case 'tenLess':
          movers.get(problem)?.()
          steps = [...countBlocksSteps(shownAfter(spec), TENS_PICTURE, mark('picture')), { voice: { line: 'g1-tens/onesStay' }, target: TENS_PICTURE, hand: false, pad: 8, pause: 0.4 }]
          break
        case 'bigger':
        case 'smaller':
        case 'sign': {
          setRevealed(true)
          const [first, a, b, decide, open] = compareHelpLines(spec)
          const left = spec.ask === 'sign' ? TENS_LEFT : nkCard(0)
          const right = spec.ask === 'sign' ? TENS_RIGHT : nkCard(1)
          const both = [left, right]
          steps = [
            { voice: first, target: both, hand: false, pad: 10, pause: 0.3 },
            { voice: a, target: left, hand: false, pad: 10, pause: 0.35, events: [{ char: 0, run: () => setSide('left') }] },
            { voice: b, target: right, hand: false, pad: 10, pause: 0.35, events: [{ char: 0, run: () => setSide('right') }] },
            { voice: decide, target: both, hand: false, pad: 10, pause: 0.4, events: [{ char: 0, run: () => setSide(null) }] },
            ...(open ? [{ voice: open, target: TENS_BOX, hand: false as const, pad: 10, pause: 0.4 }] : []),
          ]
          break
        }
        case 'next': {
          const run = [spec.n - 3, spec.n - 2, spec.n - 1, spec.n]
          steps = [
            { voice: { line: 'g1-tens/countOn' }, target: TENS_PICTURE, hand: false, pad: 6, pause: 0.25 },
            ...run.map((v, k): GuideStep => ({ voice: sayTens(v), target: tensTile(k), hand: false, pad: 8, pause: 0.2, events: [{ char: 0, run: () => setLit(k) }] })),
          ]
          break
        }
      }
      await guide.sequence(steps, { repeatable: false })
      setLit(null)
      setSide(null)
    }
    registerHelp(help)
    return () => registerHelp(null)
  }, [registerHelp, spec, problem])

  const interactive = active && !choice.busy
  const frameTens = Math.max(1, ...spec.cards.map((c) => (typeof c === 'number' ? tensOf(c) : 0)))

  const cardArt = (c: number | string, i: number): ReactNode => {
    if (typeof c !== 'number') return <Sign sign={c as '>' | '<' | '='} />
    if (spec.ask === 'shows') return <BaseTen n={c} frameTens={frameTens} marks={marks[`card${i}`]} badgeScale={1.35} />
    if ((spec.ask === 'bigger' || spec.ask === 'smaller') && revealed) {
      return (
        <span className="absolute inset-0 flex flex-col items-center justify-between">
          <span className="block w-full h-[46%]">
            <BigNumeral n={c} />
          </span>
          <span className="block w-full h-[50%]">
            <BaseTen n={c} frameTens={Math.max(tensOf(spec.n), tensOf(spec.m ?? spec.n))} marks={marks[`card${i}`]} badgeScale={1.3} />
          </span>
        </span>
      )
    }
    return <BigNumeral n={c} />
  }

  const cardEls = (className: string) =>
    spec.cards.map((c, i) => (
      <NumberCard
        key={`${c}-${i}`}
        guideId={nkCard(i)}
        label={String(c)}
        state={choice.stateOf(i)}
        tint={i}
        right={c === answer}
        disabled={!interactive}
        onPick={() => void choice.pick(i)}
        className={[className, side && i === (side === 'left' ? 0 : 1) && !(spec.ask === 'sign') ? 'tq-lit' : ''].join(' ')}
      >
        {cardArt(c, i)}
      </NumberCard>
    ))

  const panel = (child: ReactNode, cls = 'h-[min(44vh,30rem)] landscape:h-full landscape:max-h-[34rem] min-h-40') => (
    <div data-guide={TENS_PICTURE} className={`lp-picture-panel relative w-full ${cls} shrink self-center bg-paper border-[3px] border-line rounded-[2rem] shadow-card overflow-hidden`}>
      {child}
    </div>
  )
  const row = (els: ReactNode) => (
    <div className="shrink-0 flex items-center justify-center gap-4 short:gap-3 roomy:gap-6 px-1 pb-1" role="group" aria-label="answers">
      {els}
    </div>
  )
  const sideBySide = (pic: ReactNode, els: ReactNode, cols = 'landscape:grid-cols-[minmax(0,1.15fr)_minmax(0,1.25fr)]') => (
    <div className={`flex-1 min-h-0 min-w-0 flex flex-col justify-center gap-5 roomy:gap-7 landscape:grid landscape:grid-rows-1 landscape:items-center landscape:gap-4 short:gap-3 ${cols}`} data-tens={spec.ask} data-revealed={revealed ? '' : undefined}>
      {pic}
      {row(els)}
    </div>
  )

  switch (spec.ask) {
    case 'howMany':
      return sideBySide(panel(<div className="absolute inset-[5%] grid place-items-center"><BaseTen n={spec.n} marks={marks.picture} /></div>), cardEls('flex-1 max-w-52 roomy:max-w-60'))
    case 'tenMore':
    case 'tenLess': {
      const more = spec.ask === 'tenMore'
      const shown = moved ? shownAfter(spec) : spec.n
      return sideBySide(
        panel(
          <>
            <div className="absolute inset-x-[5%] top-[16%] bottom-[4%] grid place-items-center" data-moved={moved ? '' : undefined}>
              <BaseTen n={shown} frameTens={tensOf(Math.max(spec.n, shownAfter(spec)))} freshRod={more && moved} goneRod={!more && moved} marks={marks.picture} />
            </div>
            {/* where it started, and the ten that came or went: numerals and a sign, no words */}
            <div className="absolute top-[3%] left-[4%] h-[15%] flex items-center gap-[0.4em]" aria-hidden="true">
              <svg viewBox="0 0 100 100" className="h-full w-auto aspect-square">
                <BigNumeralGlyph n={spec.n} />
              </svg>
              {moved && (
                <svg viewBox="0 0 150 100" className="h-full w-auto tq-sign-in" style={{ aspectRatio: '1.5' }} data-change={more ? '+10' : '-10'}>
                  <text x={75} y={53} fontFamily={M.font} fontWeight={700} fontSize={62} textAnchor="middle" dominantBaseline="central" fill={more ? '#74d3bd' : '#f2766b'} stroke={M.ink} strokeWidth={4} paintOrder="stroke fill">
                    {more ? '+10' : '−10'}
                  </text>
                </svg>
              )}
            </div>
          </>,
        ),
        cardEls('flex-1 max-w-52 roomy:max-w-60'),
      )
    }
    case 'shows':
      return sideBySide(
        panel(<div className="absolute inset-[8%] grid place-items-center"><BigNumeral n={spec.n} /></div>),
        cardEls('flex-1 max-w-64 roomy:max-w-72'),
        'landscape:grid-cols-[minmax(0,0.6fr)_minmax(0,1.7fr)]',
      )
    case 'tensIn':
      return sideBySide(
        panel(
          revealed ? (
            <div className="absolute inset-[4%] flex flex-col items-center">
              <div className="w-full h-[42%]">
                <BigNumeral n={spec.n} />
              </div>
              <div className="w-full flex-1 min-h-0">
                <BaseTen n={spec.n} marks={marks.picture} />
              </div>
            </div>
          ) : (
            <div className="absolute inset-[8%] grid place-items-center">
              <BigNumeral n={spec.n} />
            </div>
          ),
        ),
        cardEls('flex-1 max-w-52 roomy:max-w-60'),
      )
    case 'bigger':
    case 'smaller':
      return (
        // two numbers, nothing else: the cards take the stage, big
        <div className="flex-1 min-h-0 min-w-0 flex items-center justify-center" data-tens={spec.ask} data-revealed={revealed ? '' : undefined}>
          <div className="w-full flex items-center justify-center gap-6 short:gap-5 roomy:gap-10 px-2 pb-2" role="group" aria-label="answers">
            {cardEls('flex-1 max-w-72 landscape:max-w-[min(18rem,62vh)] roomy:max-w-80 landscape:roomy:max-w-[min(20rem,58vh)]')}
          </div>
        </div>
      )
    case 'sign': {
      const m = spec.m ?? spec.n
      const placed = choice.right !== null ? signFor(spec.n, m) : null
      // the numbers and the box in one row (the same height, so the box sits between them), the blocks under each number
      const top = revealed ? 'h-[42%]' : 'h-[72%]'
      const number = (n: number, where: 'left' | 'right') => (
        <div data-guide={where === 'left' ? TENS_LEFT : TENS_RIGHT} data-lit={side === where ? '' : undefined} className={`relative h-full flex-1 min-w-0 flex flex-col items-center ${revealed ? 'justify-start' : 'justify-center'} rounded-[1.5rem] ${side === where ? 'bg-[#ffe594]' : ''}`}>
          <div className={`w-full ${top} shrink-0`}>
            <BigNumeral n={n} />
          </div>
          {revealed && (
            <div className="w-full flex-1 min-h-0">
              <BaseTen n={n} frameTens={Math.max(tensOf(spec.n), tensOf(m))} marks={marks[where]} />
            </div>
          )}
        </div>
      )
      return (
        <div className="flex-1 min-h-0 min-w-0 flex flex-col justify-center gap-4 short:gap-3 roomy:gap-6" data-tens="sign" data-revealed={revealed ? '' : undefined} data-placed={placed ?? undefined}>
          {panel(
            <div className="absolute inset-[4%] flex items-stretch gap-[2%]">
              {number(spec.n, 'left')}
              <div className={`shrink-0 h-full flex flex-col items-center ${revealed ? 'justify-start' : 'justify-center'}`}>
                <div className={`${top} flex items-center`}>
                  <div data-guide={TENS_BOX} className="relative h-[78%] max-h-36 aspect-square">
                    <svg viewBox="0 0 100 100" className="block w-full h-full" aria-hidden="true">
                      <rect x={6} y={6} width={88} height={88} rx={16} fill="#fffaf0" stroke={M.ink} strokeOpacity={placed ? 1 : 0.5} strokeWidth={5} strokeDasharray={placed ? undefined : '12 9'} />
                      {placed && (
                        <g className="tq-sign-in" style={{ transformOrigin: '50px 50px' }}>
                          <SignGlyph sign={placed} color="#74d3bd" />
                        </g>
                      )}
                    </svg>
                  </div>
                </div>
              </div>
              {number(m, 'right')}
            </div>,
            'flex-1 min-h-32 max-h-[26rem]',
          )}
          {row(cardEls('flex-1 max-w-[min(11rem,26vh)] roomy:max-w-[min(13rem,26vh)]'))}
        </div>
      )
    }
    case 'next': {
      const run = [spec.n - 3, spec.n - 2, spec.n - 1]
      return (
        <div className="flex-1 min-h-0 min-w-0 flex flex-col justify-center gap-4 short:gap-3 roomy:gap-6" data-tens="next">
          {panel(
            <div className="absolute inset-[5%]">
              {/* one drawing, so the four squares stay square on any screen */}
              <svg viewBox="0 0 470 116" className="block w-full h-full" aria-hidden="true">
                {[...run, null].map((v, k) => (
                  <g key={k} data-guide={tensTile(k)} data-lit={lit === k ? '' : undefined} transform={`translate(${8 + k * 116} 8)`}>
                    {lit === k && <rect x={-6} y={-6} width={112} height={112} rx={26} fill="#ffe594" stroke="#ffcf4d" strokeWidth={6} />}
                    {v === null ? (
                      <rect x={2} y={2} width={96} height={96} rx={22} fill="#fffaf0" stroke={M.ink} strokeOpacity={0.45} strokeWidth={4} strokeDasharray="10 8" />
                    ) : (
                      <>
                        <rect x={2} y={6} width={96} height={96} rx={22} fill={M.ink} opacity={0.25} />
                        <rect x={2} y={2} width={96} height={96} rx={22} fill="#dff1fb" stroke={M.ink} strokeWidth={4} />
                      </>
                    )}
                    <svg x={6} y={10} width={88} height={80} viewBox="0 0 100 100">
                      {v === null ? (
                        <text x={50} y={54} fontFamily={M.font} fontWeight={700} fontSize={70} textAnchor="middle" dominantBaseline="central" fill="#3a2c38" opacity={0.3}>
                          ?
                        </text>
                      ) : (
                        <BigNumeralGlyph n={v} />
                      )}
                    </svg>
                  </g>
                ))}
              </svg>
            </div>,
            'flex-1 min-h-28 max-h-[16rem]',
          )}
          {row(cardEls('flex-1 max-w-[min(12rem,30vh)] roomy:max-w-[min(14rem,30vh)]'))}
        </div>
      )
    }
  }
}

/** The cue in a line where the cards take over: "Tap" or "How many", else after the line. */
function cardsCue(text: string): { cue: string } | { after: true } {
  if (/How many now/.test(text)) return { cue: 'How many now' }
  if (/Tap/.test(text)) return { cue: 'Tap' }
  return { after: true }
}

function askSteps(problem: ListenProblem, spec: TensSpec): GuideStep[] {
  const open = openCards.get(problem) ?? spec.cards.map((_, i) => i)
  const text = said(problem.speech)
  switch (spec.ask) {
    case 'next':
      // each number lit as it is said, the blank on "What", then the cards
      return [
        { voice: problem.speech ?? null, target: tensTile(0), hand: false, pad: 8 },
        { target: tensTile(1), cue: numberWord(spec.n - 2), hand: false, pad: 8 },
        { target: tensTile(2), cue: numberWord(spec.n - 1), hand: false, pad: 8 },
        { target: tensTile(3), cue: 'What', hand: false, pad: 8 },
        sweepCards(open),
      ]
    case 'bigger':
    case 'smaller':
      // the line with both numbers lit, then each named as it lights
      return [
        { voice: problem.speech ?? null, target: open.map(nkCard), hand: false, pad: 12 },
        ...open.map((i): GuideStep => ({ voice: sayCard(spec.cards[i]), target: nkCard(i), hand: false, pad: 12, pause: 0.3 })),
        sweepCards(open),
      ]
    case 'sign':
      // the two numbers named, the box, then the signs
      return [
        { voice: problem.speech ?? null, target: TENS_PICTURE, hand: false, pad: 6 },
        { target: TENS_BOX, cue: 'box', hand: 'tap', pad: 10 },
        { voice: sayTens(spec.n), target: TENS_LEFT, hand: false, pad: 10, pause: 0.2 },
        { voice: sayTens(spec.m ?? spec.n), target: TENS_RIGHT, hand: false, pad: 10, pause: 0.3 },
        sweepCards(open),
      ]
    case 'tenMore':
    case 'tenLess': {
      // the blocks as the line starts; the rod rolls on its words; the cards on "How many now"
      const at = phraseIndex(text, spec.ask === 'tenMore' ? 'Ten more' : 'Ten goes')
      return [
        { voice: problem.speech ?? null, target: TENS_PICTURE, hand: false, pad: 6, events: at >= 0 ? [{ char: at, run: () => movers.get(problem)?.() }] : [] },
        sweepCards(open, cardsCue(text)),
      ]
    }
    default:
      return [{ voice: problem.speech ?? null, target: TENS_PICTURE, hand: false, pad: 6 }, sweepCards(open, cardsCue(text))]
  }
}

export const tensActivity: ListenActivityDef<TensSpec> = { Component: TensQuiz, askSteps }

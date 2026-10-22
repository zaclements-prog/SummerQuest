/* eslint-disable react-refresh/only-export-components -- an activity module exports its definition (component + askSteps) for the registry; not an HMR boundary */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { GuideStep } from '../../../guide/store'
import { guide } from '../../../guide/store'
import { countAlongOffsets } from '../../../lib/numberWords'
import { K_PAIRS } from '../../../voice/packs/k-compare'
import { voiceText } from '../../../voice/registry'
import type { ListenActivityDef, ListenActivityProps, ListenProblem } from '../types'
import { MATCH_CARDS, matchAnswer, matchCardLines, matchHelpLines, type MatchSpec } from './numberSpecs'
import { EmojiArt, NumberCard, nkCard, sweepCards, useChoice, type ChoiceCard } from './numberKit'

/**
 * The `match` activity, "Line them up" (Number Dunes, K.CC.6): two rows of
 * things that go together, bees over flowers. "Are there more bees or more
 * flowers? Or are they the same?" — the rows light up, then each card on its
 * word: the bee, the flower, ⚖️ the same.
 *
 * The first questions line the rows up in columns (the matching is there to
 * see); later ones spread each row out evenly, so a row that looks as long
 * may still have fewer. After a miss the help lines them up ("Let's line them
 * up!"), joins each pair as the pairs are counted, then shows what's left over
 * ("Some bees have no flower. There are more bees!") or "Every bee has a
 * flower. They are the same!" The rows stay lined up for the next try.
 *
 * Guide ids: `match-rows` (the two rows), `lp-card-0…2` (top thing, bottom thing, the same).
 */

export const MATCH_ROWS = 'match-rows'

/** The cards still open on each question, for `askSteps` (which only gets the problem). */
const openCards = new WeakMap<object, number[]>()

const ROW_H = 150
const ROW_GAP = 60
const TOP_Y = 12 + ROW_H / 2
const BOTTOM_Y = TOP_Y + ROW_H + ROW_GAP
/** The drawing's height; its width follows the panel's shape (a wide panel gets a wide drawing). */
const H = BOTTOM_Y + ROW_H / 2 + 12
const EMOJI_FONT = "'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif"

/**
 * Where each thing sits in a drawing `w` wide: lined up in columns (left-aligned,
 * so what's left over sticks out at the end), or each row spread out evenly
 * over the same length (a row that looks as long may still have fewer).
 */
function placesFor(w: number, top: number, bottom: number, lined: boolean) {
  const most = Math.max(top, bottom, 3)
  const step = Math.min((w - 40) / most, 170)
  const block = step * Math.max(top, bottom)
  const x0 = (w - block) / 2
  const row = (count: number) => Array.from({ length: count }, (_, i) => (lined ? x0 + (i + 0.5) * step : x0 + (i + 0.5) * (block / count)))
  return { top: row(top), bottom: row(bottom), size: Math.min(step * 0.84, ROW_H * 0.74), x0, block }
}

function Match({ problem, spec, phase, active, onAttempt, registerHelp }: ListenActivityProps<MatchSpec>) {
  const pair = K_PAIRS.find((p) => p.id === spec.pair) ?? K_PAIRS[0]
  const answer = matchAnswer(spec)
  const cards: ChoiceCard[] = useMemo(() => matchCardLines(spec).map((speech, i) => ({ value: MATCH_CARDS[i], speech })), [spec])
  const choice = useChoice({ cards, answer, active, phase, onAttempt })
  const [lined, setLined] = useState(spec.lined)
  const [joined, setJoined] = useState(0)
  const [leftLit, setLeftLit] = useState(false)

  useEffect(() => {
    openCards.set(problem, choice.open)
  })

  // the help after a miss: line them up, join each pair as it is counted, then what's left over
  useEffect(() => {
    const help = async () => {
      setJoined(0)
      setLeftLit(false)
      const { lineUp, count, after } = matchHelpLines(spec)
      const offsets = countAlongOffsets(voiceText(count))
      const steps: GuideStep[] = [
        { voice: lineUp, target: MATCH_ROWS, hand: false, pad: 6, pause: 0.7, events: [{ char: 0, run: () => setLined(true) }] },
        { voice: count, target: MATCH_ROWS, hand: false, pad: 6, pause: 0.5, events: offsets.map((char, i) => ({ char, run: () => setJoined(i + 1) })) },
        // "Every bee has a flower. They are the same!", or what's left over lights up: "Some bees have no flower." "There are more bees!"
        ...after.map((voice, i): GuideStep => ({ voice, target: MATCH_ROWS, hand: false, pad: 6, pause: 0.4, events: i === 0 && after.length > 1 ? [{ char: 0, run: () => setLeftLit(true) }] : [] })),
      ]
      await guide.sequence(steps, { repeatable: false })
    }
    registerHelp(help)
    return () => registerHelp(null)
  }, [registerHelp, spec])

  // the drawing is as wide as the panel's shape allows (the rows use all of it)
  const panelRef = useRef<HTMLDivElement>(null)
  const [aspect, setAspect] = useState(2.6)
  useLayoutEffect(() => {
    const el = panelRef.current
    if (!el) return
    const measure = () => {
      if (el.clientWidth > 0 && el.clientHeight > 0) setAspect(Math.min(5, Math.max(1.3, el.clientWidth / el.clientHeight)))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const W = Math.round(H * aspect)

  const at = placesFor(W, spec.top, spec.bottom, lined)
  const pairs = Math.min(spec.top, spec.bottom)
  const interactive = active && !choice.busy
  const band = { x: Math.max(8, at.x0 - 46), w: Math.min(W - 16, at.block + 92) }
  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col justify-center gap-4 short:gap-3 roomy:gap-6" data-match={spec.pair} data-lined={lined ? '' : undefined} data-joined={joined}>
      {/* the two rows */}
      <div ref={panelRef} data-guide={MATCH_ROWS} className="lp-picture-panel relative w-full flex-1 min-h-32 max-h-[30rem] bg-paper border-[3px] border-line rounded-[2rem] shadow-card overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-[3%] w-[94%] h-[94%]" aria-hidden="true">
          {[TOP_Y, BOTTOM_Y].map((y) => (
            <rect key={y} x={band.x} y={y - ROW_H / 2} width={band.w} height={ROW_H} rx={40} fill="#fffaf0" stroke="#3a2c38" strokeOpacity={0.18} strokeWidth={4} strokeDasharray="14 10" />
          ))}
          {/* the pairs, joined one to one as they are counted */}
          {lined &&
            Array.from({ length: Math.min(joined, pairs) }, (_, i) => (
              <g key={`p${i}`} className="nk-pairline">
                <line x1={at.top[i]} y1={TOP_Y + at.size * 0.42} x2={at.bottom[i]} y2={BOTTOM_Y - at.size * 0.42} stroke="#f2766b" strokeWidth={7} strokeLinecap="round" />
                <circle cx={at.top[i]} cy={TOP_Y + at.size * 0.42} r={7} fill="#3a2c38" />
                <circle cx={at.bottom[i]} cy={BOTTOM_Y - at.size * 0.42} r={7} fill="#3a2c38" />
              </g>
            ))}
          {(['top', 'bottom'] as const).map((side) => {
            const xs = at[side]
            const y = side === 'top' ? TOP_Y : BOTTOM_Y
            const emoji = pair[side].emoji
            return xs.map((x, i) => {
              const left = leftLit && i >= pairs
              return (
                <g key={`${side}${i}`} className="nk-thing" style={{ transform: `translate(${x}px, ${y}px)` }} data-thing={side}>
                  {left && <circle r={at.size * 0.6} fill="#ffe594" stroke="#ffcf4d" strokeWidth={5} />}
                  <g className={left ? 'nk-left' : undefined}>
                    <text y={at.size * 0.06} fontSize={at.size} fontFamily={EMOJI_FONT} textAnchor="middle" dominantBaseline="central">
                      {emoji}
                    </text>
                  </g>
                </g>
              )
            })
          })}
        </svg>
      </div>

      {/* the answers: the top thing, the bottom thing, the same */}
      <div className="shrink-0 flex items-center justify-center gap-4 short:gap-3 roomy:gap-6 px-1 pb-1" role="group" aria-label="answers">
        {MATCH_CARDS.map((value, i) => (
          <NumberCard
            key={value}
            guideId={nkCard(i)}
            label={value === 'same' ? 'the same' : pair[value].many}
            state={choice.stateOf(i)}
            tint={i}
            right={value === answer}
            disabled={!interactive}
            onPick={() => void choice.pick(i)}
            className="flex-1 max-w-[min(12rem,30vh)] roomy:max-w-[min(14rem,30vh)]"
          >
            <EmojiArt emoji={value === 'same' ? '⚖️' : pair[value].emoji} />
          </NumberCard>
        ))}
      </div>
    </div>
  )
}

/** The rows light up as the question starts; each card on its word; then the hand glides along the cards. */
function askSteps(problem: ListenProblem, spec: MatchSpec): GuideStep[] {
  const pair = K_PAIRS.find((p) => p.id === spec.pair) ?? K_PAIRS[0]
  const open = openCards.get(problem) ?? [0, 1, 2]
  const cues = [pair.top.many, pair.bottom.many, 'same']
  return [
    { voice: problem.speech ?? null, target: MATCH_ROWS, hand: false, pad: 6 },
    ...open.map((i): GuideStep => ({ target: nkCard(i), cue: cues[i], hand: 'tap', pad: 12 })),
    sweepCards(open),
  ]
}

export const matchActivity: ListenActivityDef<MatchSpec> = { Component: Match, askSteps }

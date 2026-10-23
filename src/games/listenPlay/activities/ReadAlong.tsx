/* eslint-disable react-refresh/only-export-components -- an activity module exports its definition (component + askSteps) for the registry; not an HMR boundary */
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { GuideEvent, GuideStep } from '../../../guide/store'
import { guide } from '../../../guide/store'
import { sfx } from '../../../lib/sound'
import { voiceText } from '../../../voice/registry'
import type { VoiceRef } from '../../../voice/types'
import { PictureArt, PictureCard, type CardState } from '../PictureCard'
import { pictureLabel } from '../pictureLabel'
import { lpCard } from '../script'
import type { ListenActivityDef, ListenActivityProps, ListenProblem } from '../types'
import { RA_GAP, RA_PICTURE, RA_TEXT, type ReadAlongSpec } from './readAlongSpec'
import './readTiles.css'

/**
 * The `readAlong` activity (Word Reef, 1st grade): print to read, in Andika,
 * and big cards to answer with (see ./readAlongSpec for the three layouts).
 *
 * - The printed pieces (a word's letters, a sentence's words) light up as the
 *   voice reaches them: a sentence as it is asked, a word only in the help.
 * - A card tapped says its name; right → ✓ (a gap fills with its letter, a
 *   word lights up whole); not yet → the try that wasn't right: the shell says
 *   "let's look again", the help sounds the word out (each letter lighting)
 *   or reads the sentence again (each word lighting, the one that answers
 *   staying lit), then "Now you try!", the tried card resting aside.
 *
 * Never a timer, never failing out. The only printed words are the ones being
 * read (the text budget's content: `data-ra-text`). Guide ids: `ra-text`,
 * `ra-gap`, `ra-picture`, and the cards' `lp-card-<i>`. Dev builds mark the
 * right card (`[data-correct]`), as the kit's cards do.
 */

// ── what is lit, shared with the question's line (askSteps only gets the problem) ──

type Lit = { at: number; all: boolean }
const NONE: Lit = { at: -1, all: false }
const lit = new WeakMap<object, Lit>()
const listeners = new Set<() => void>()
function setLit(problem: object, v: Lit) {
  lit.set(problem, v)
  for (const l of listeners) l()
}
function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** Per problem: the cards tried (for the sweep), and whether the help has read it again (a re-ask is short). */
const progress = new WeakMap<object, { tried: number[]; helped: boolean }>()

/** Events that light each piece as the line reaches it, everything from `whole`, and nothing once it is said. */
function lightEvents(problem: object, read: ReadAlongSpec['read'], text: string): GuideEvent[] {
  const evs: GuideEvent[] = read.at.flatMap((char, i) => (char >= 0 ? [{ char, run: () => setLit(problem, { at: i, all: false }) }] : []))
  if (read.whole !== undefined && read.whole >= 0) evs.push({ char: read.whole, run: () => setLit(problem, { at: -1, all: true }) })
  // (as the line ends: the last piece goes out)
  evs.push({ char: text.length, run: () => setLit(problem, read.whole !== undefined ? { at: -1, all: true } : NONE) })
  return evs
}

function said(ref: VoiceRef | undefined): string {
  if (!ref) return ''
  try {
    return voiceText(ref)
  } catch {
    return ''
  }
}

const openCards = (spec: ReadAlongSpec, problem: object) => {
  const tried = progress.get(problem)?.tried ?? []
  return spec.cards.map((_, i) => i).filter((i) => !tried.includes(i))
}
const sweepOf = (open: number[]) => (open.length === 1 ? lpCard(open[0]) : open.map(lpCard))

function readAlongAskSteps(problem: ListenProblem, spec: ReadAlongSpec): GuideStep[] {
  const open = openCards(spec, problem)
  const cards = sweepOf(open)
  const hand = open.length === 1 ? ('tap' as const) : ('sweep' as const)
  if (spec.layout === 'sentence') {
    const naming: GuideStep[] = spec.nameCards
      ? [
          ...open.filter((i) => spec.cards[i].speech).map((i): GuideStep => ({ voice: spec.cards[i].speech!, target: lpCard(i), hand: false, pad: 12, pause: 0.35 })),
          { voice: null, target: cards, hand, pad: 12 },
        ]
      : []
    const ask: GuideStep = { voice: spec.ask ?? null, target: cards, hand: spec.nameCards ? false : hand, pad: 12 }
    // after the help has read it again: just the question (and the cards still in play)
    if (progress.get(problem)?.helped) return [ask, ...naming]
    // the child reads it first: never read aloud before a miss (or 🔊, see replaySteps)
    return [{ voice: { line: 'g1-words/readFirst' }, target: RA_TEXT, hand: false, pad: 10, pause: 0.6 }, ask, ...naming]
  }
  if (spec.layout === 'gap') {
    return [
      { voice: problem.speech ?? null, target: RA_PICTURE, hand: false, pad: 8 },
      { target: RA_GAP, cue: 'middle', hand: false, pad: 8 },
      { target: cards, cue: 'Tap', hand, pad: 12 },
    ]
  }
  // a word to read: never said (the cards aren't named either: that would read it)
  return [
    { voice: problem.speech ?? null, target: RA_TEXT, hand: false, pad: 10 },
    { target: cards, cue: 'tap', hand, pad: 12 },
  ]
}

function ReadAlong({ problem, spec, phase, active, misses, onAttempt, registerHelp }: ListenActivityProps<ReadAlongSpec>) {
  const [tried, setTried] = useState<number[]>(() => progress.get(problem)?.tried ?? [])
  const [picked, setPicked] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [right, setRight] = useState(false)
  /** The help is on: a gap shows its letter faintly as its sound is said. */
  const [reveal, setReveal] = useState(false)
  /** After the help: the word that answers the question stays lit. */
  const [keyLit, setKeyLit] = useState(() => !!progress.get(problem)?.helped)
  const shown = useSyncExternalStore(
    subscribe,
    () => lit.get(problem) ?? NONE,
    () => NONE,
  )
  const mounted = useRef(true)
  const now = useRef({ active, onAttempt })
  useLayoutEffect(() => {
    now.current = { active, onAttempt }
  })
  /** A try finished while the shell wasn't listening (a pause): report it when it is. */
  const owed = useRef<boolean | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      setLit(problem, NONE)
    }
  }, [problem])

  function report(correct: boolean) {
    if (!mounted.current) return
    if (now.current.active) {
      owed.current = null
      now.current.onAttempt(correct)
    } else owed.current = correct
  }
  useEffect(() => {
    if (active && owed.current !== null) report(owed.current)
  })

  // the help after a miss: sound the word out, or read the sentence again
  useEffect(() => {
    registerHelp(async () => {
      if (!mounted.current) return
      setPicked(null)
      const text = said(spec.read.line)
      if (spec.layout === 'gap') setReveal(true)
      const steps: GuideStep[] = [
        ...(spec.helpIntro ? [{ voice: spec.helpIntro, target: RA_TEXT, hand: false as const, pad: 10 }] : []),
        { voice: spec.read.line, target: RA_TEXT, hand: false, pad: 10, pause: 0.5, events: lightEvents(problem, spec.read, text) },
      ]
      await guide.sequence(steps, { repeatable: false })
      if (!mounted.current) return
      setLit(problem, NONE)
      setReveal(false)
      const p = progress.get(problem) ?? { tried: [], helped: false }
      progress.set(problem, { ...p, helped: true })
      if (spec.layout === 'sentence') setKeyLit(true)
    })
    return () => registerHelp(null)
  })

  async function pick(i: number) {
    if (!active || busy || right || tried.includes(i)) return
    const card = spec.cards[i]
    if (!card) return
    sfx.pop()
    setPicked(i)
    setBusy(true)
    // (its name said; never waiting on it for long: the card must never stay stuck pressed)
    const pause = new Promise((r) => setTimeout(r, card.speech ? 4000 : 300))
    await (card.speech ? Promise.race([guide.say(card.speech), pause]) : pause)
    if (!mounted.current) return
    setBusy(false)
    const ok = card.value === problem.answer
    if (ok) {
      setRight(true)
      // the word read: it lights up whole
      if (spec.layout !== 'sentence') setLit(problem, { at: -1, all: true })
    } else {
      const t = [...tried, i]
      setTried(t)
      const p = progress.get(problem) ?? { tried: [], helped: false }
      progress.set(problem, { ...p, tried: t })
    }
    report(ok)
  }

  function cardState(i: number): CardState {
    if (picked === i) {
      if (right) return 'right'
      if (busy) return 'chosen'
      if (phase === 'oops') return 'look'
    }
    if (tried.includes(i)) return 'tried'
    if (right) return 'dim'
    return 'idle'
  }

  const layout = spec.layout
  const chars = spec.units.join(layout === 'sentence' ? ' ' : '').length
  // the print as big as its panel allows: a word on one line, a sentence on one or two
  const fontSize = layout === 'sentence' ? `min(34cqh, calc(175cqw / ${Math.max(8, chars)}))` : `min(66cqh, calc(165cqw / ${Math.max(3, chars + 1)}))`
  const interactive = active && !busy && !right

  return (
    <div className="ra flex-1 min-h-0 min-w-0 flex flex-col gap-3 short:gap-2 pb-1" data-layout={layout} data-misses={misses}>
      {/* what is read (and, for a gap, the word's picture) */}
      <div className={`ra-top min-h-0 flex items-stretch justify-center gap-3 short:gap-2 ${layout === 'sentence' ? 'flex-[1_1_40%]' : 'flex-[1_1_44%]'}`}>
        {layout === 'gap' && spec.picture && (
          <div className="ra-pic-cell min-h-0 grid place-items-center [container-type:size] aspect-square max-w-[40%]">
            <div data-guide={RA_PICTURE} className="ra-pic relative w-[min(100cqw,100cqh)] aspect-square bg-paper border-[3px] border-line rounded-[1.75rem] shadow-card">
              <div className="absolute inset-[10%]">
                <PictureArt picture={spec.picture} />
              </div>
            </div>
          </div>
        )}
        <div
          data-guide={RA_TEXT}
          data-ra-text=""
          className={`ra-panel relative min-w-0 min-h-0 bg-paper border-[3px] border-line rounded-[1.75rem] shadow-card [container-type:size] ${layout === 'gap' ? 'flex-1 max-w-[34rem]' : 'flex-1 max-w-[56rem]'}`}
        >
          <p className={`ra-print absolute inset-0 m-0 flex items-center justify-center text-center px-[4%] ${layout === 'sentence' ? 'flex-wrap content-center gap-x-[0.32em] leading-[1.35]' : 'leading-none'}`} style={{ fontSize }} lang="en">
            {spec.units.map((u, i) => {
              const isGap = layout === 'gap' && i === spec.gap
              const on = shown.all || shown.at === i
              return (
                <span
                  key={i}
                  data-unit={i}
                  data-lit={on ? '' : undefined}
                  data-key={keyLit && i === spec.key ? '' : undefined}
                  className={`ra-unit ${isGap ? 'ra-gap' : ''}`}
                  {...(isGap ? { 'data-guide': RA_GAP, 'data-filled': right ? '' : undefined } : {})}
                >
                  {isGap ? (right ? u : reveal ? <span className="ra-ghost">{u}</span> : <span className="ra-blank" aria-label="blank">{' '}</span>) : u}
                </span>
              )
            })}
          </p>
        </div>
      </div>

      {/* the answers */}
      <div className={`ra-cards min-h-0 grid gap-4 short:gap-3 roomy:gap-6 px-1 ${layout === 'sentence' ? 'flex-[1_1_52%]' : 'flex-[1_1_50%]'}`} style={{ gridTemplateColumns: `repeat(${spec.cards.length}, minmax(0, 1fr))` }} role="group" aria-label="answers">
        {spec.cards.map((c, i) => (
          <div key={i} className="grid min-h-0 min-w-0 place-items-center [container-type:size]">
            <PictureCard
              guideId={lpCard(i)}
              picture={c.picture}
              label={pictureLabel(c.picture)}
              tint={i}
              state={cardState(i)}
              disabled={!interactive}
              onPick={() => void pick(i)}
              className="w-[min(100cqw,100cqh,15rem)] !min-w-0 !min-h-0"
            >
              {import.meta.env.DEV && c.value === problem.answer && <span data-correct="" hidden />}
            </PictureCard>
          </div>
        ))}
      </div>
    </div>
  )
}

/** 🔊 on a sentence: it is read aloud, each word lighting, then the question (help, when the child asks for it). */
function readAlongReplaySteps(problem: ListenProblem, spec: ReadAlongSpec): GuideStep[] {
  if (spec.layout !== 'sentence') return []
  const open = openCards(spec, problem)
  const text = said(spec.read.line)
  return [
    { voice: spec.read.line, target: RA_TEXT, hand: false, pad: 10, pause: 0.45, events: lightEvents(problem, spec.read, text) },
    { voice: spec.ask ?? null, target: sweepOf(open), hand: open.length === 1 ? 'tap' : 'sweep', pad: 12 },
  ]
}

/** No touch for a while on a sentence: just the question again (still not read aloud). */
function readAlongRepromptSteps(problem: ListenProblem, spec: ReadAlongSpec): GuideStep[] {
  if (spec.layout !== 'sentence') return readAlongAskSteps(problem, spec)
  const open = openCards(spec, problem)
  return [
    { voice: spec.ask ?? null, target: RA_TEXT, hand: false, pad: 10 },
    { target: sweepOf(open), cue: 0.6, hand: open.length === 1 ? 'tap' : 'sweep', pad: 12 },
  ]
}

export const readAlongActivity: ListenActivityDef<ReadAlongSpec> = {
  Component: ReadAlong,
  askSteps: readAlongAskSteps,
  replaySteps: readAlongReplaySteps,
  repromptSteps: readAlongRepromptSteps,
}

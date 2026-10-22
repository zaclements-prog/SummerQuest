import { useEffect, useMemo, useReducer, useRef } from 'react'
import { nextProblem, type Picture, type ProblemProvider } from '../../lib/problem'
import { sfx } from '../../lib/sound'
import { useProgress } from '../../store/progress'
import { skillOf } from '../../tutoring/skills'
import { guide } from '../../guide/store'
import { SayAgainButton } from '../../guide/SayAgainButton'
import { useIdleReprompt } from '../../guide/useIdleReprompt'
import { COUNT_MAX } from '../../voice/packs/listen'
import { PictureArt, PictureCard, type CardState, type GroupMarks } from '../listenPlay/PictureCard'
import { pictureLabel } from '../listenPlay/pictureLabel'
import { sharedFrame } from '../listenPlay/groupLayout'
import {
  LP_PICTURE,
  cardsFor,
  countable,
  countUpSteps,
  hasPicturePanel,
  lpCard,
  questionPicture,
  questionSteps,
  walkthroughCounts,
  walkthroughSteps,
  type Where,
} from '../listenPlay/script'
import type { ListenProblem } from '../listenPlay/types'

/**
 * Counting Towers' question (K–1): one Listen & Play question in a big card
 * over the board, asked out loud. It opens when a kindergartner taps a build
 * spot or a tower, and the waves wait while it is open. The narrator asks
 * (the guide lights the picture, then sweeps the cards); tapping a card says
 * its label; right → a happy pop and the gate closes (the tower goes up);
 * not yet → "Hmm, let's look again", a count-along (the group, each group, or
 * up to the bigger number), "Now you try!", and the tried card rests aside.
 * Never a ✗, never failing out. 🔊 says it again; 8 s of quiet asks once more;
 * ↩ (or Escape) closes it without building.
 *
 * The Listen & Play kit's own script (../listenPlay/script) drives it, with the
 * kit's guide ids (`lp-picture`, `lp-card-<i>`).
 */

type Phase = 'loading' | 'ask' | 'judge' | 'solved' | 'oops'

interface State {
  problem: ListenProblem | null
  phase: Phase
  token: number
  picked: number | null
  tried: number[]
  /** The first pick of this question (null until it is made). */
  first: boolean | null
  marks: Readonly<Record<string, GroupMarks>>
}

type Action =
  | { type: 'load'; problem: ListenProblem }
  | { type: 'pick'; card: number; correct: boolean }
  | { type: 'judged'; correct: boolean }
  | { type: 'retry' }
  | { type: 'mark'; where: Where; obj: number; n: number }
  | { type: 'clearMarks' }

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'load':
      return { ...s, problem: a.problem, phase: 'ask', token: s.token + 1 }
    case 'pick':
      if (s.phase !== 'ask') return s
      return { ...s, phase: 'judge', token: s.token + 1, picked: a.card, first: s.first ?? a.correct }
    case 'judged':
      if (s.phase !== 'judge') return s
      return { ...s, phase: a.correct ? 'solved' : 'oops', token: s.token + 1 }
    case 'retry':
      if (s.phase !== 'oops' || s.picked === null) return s
      return { ...s, phase: 'ask', token: s.token + 1, tried: [...s.tried, s.picked], picked: null }
    case 'mark': {
      const key = String(a.where)
      const cur = s.marks[key] ?? {}
      if (cur[a.obj] !== undefined) return s
      return { ...s, marks: { ...s.marks, [key]: { ...cur, [a.obj]: a.n } } }
    }
    case 'clearMarks':
      return { ...s, marks: {} }
  }
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export interface ListenGateProps {
  provider: ProblemProvider
  /** Every pick: right or not, and whether it was the question's first (the first decides the stars). */
  onAnswer?: (correct: boolean, first: boolean) => void
  /** The right card was found: build the tower (the gate closes). */
  onSolved: () => void
  /** ↩ (or Escape): close without building. */
  onCancel: () => void
  /** A host dialog is open: hush, and take no picks. */
  paused?: boolean
  meta?: { zoneId: string; stageId: string }
}

export default function ListenGate({ provider, onAnswer, onSolved, onCancel, paused = false, meta }: ListenGateProps) {
  const [s, dispatch] = useReducer(reducer, { problem: null, phase: 'loading', token: 0, picked: null, tried: [], first: null, marks: {} })
  const recordAnswer = useProgress((st) => st.recordAnswer)
  const recordAttempt = useProgress((st) => st.recordAttempt)
  const solvedRef = useRef(onSolved)
  const cancelRef = useRef(onCancel)
  useEffect(() => {
    solvedRef.current = onSolved
    cancelRef.current = onCancel
  })

  // one question per opening
  useEffect(() => {
    let live = true
    Promise.resolve(nextProblem(provider)).then((p) => {
      if (live) dispatch({ type: 'load', problem: p as ListenProblem })
    })
    return () => {
      live = false
    }
  }, [provider])

  // Escape closes, like ↩
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const { problem, phase, token, picked, tried } = s
  const cards = useMemo(() => (problem ? cardsFor(problem) : []), [problem])
  const picture = problem ? questionPicture(problem) : null
  const panel = problem ? hasPicturePanel(problem) : false
  const groupCounts = (pics: readonly Picture[]) => (pics.every((p) => p.kind === 'group') ? pics.map((p) => (p.kind === 'group' ? p.count : 0)) : [])
  const cardFrame = sharedFrame(groupCounts(cards.map((c) => c.picture)), 1)

  // ── what the narrator does in each phase ──
  useEffect(() => {
    if (paused || !problem) return
    let live = true
    const run = async () => {
      const open = cards.map((_, i) => i).filter((i) => !tried.includes(i))
      switch (phase) {
        case 'ask':
          await guide.sequence(questionSteps(problem, open))
          return
        case 'judge': {
          const opt = picked !== null ? cards[picked] : undefined
          if (!opt) return
          if (opt.speech) await guide.say(opt.speech)
          else await wait(300)
          if (live) dispatch({ type: 'judged', correct: opt.value === problem.answer })
          return
        }
        case 'solved':
          sfx.correct()
          await wait(650)
          if (live) solvedRef.current()
          return
        case 'oops': {
          await guide.say({ line: 'ui/tryAgain' })
          if (!live || picked === null) return
          const note = problem.notes?.[picked]
          if (note) {
            await guide.show({ voice: note, target: lpCard(picked), hand: false, pad: 12 }, { repeatable: false })
            if (!live) return
          }
          const plan = walkthroughCounts(problem, cards, picked, open)
          const steps = plan.length
            ? walkthroughSteps(plan, (where, i) => {
                if (live) dispatch({ type: 'mark', where, obj: i, n: i + 1 })
              })
            : problem.walkthrough === 'countUp'
              ? countUpSteps(cards, open)
              : []
          if (steps.length) {
            dispatch({ type: 'clearMarks' })
            await guide.sequence(steps, { repeatable: false })
            if (!live) return
          }
          await guide.say({ line: 'listen/yourTurn' })
          if (live) dispatch({ type: 'retry' })
          return
        }
      }
    }
    void run()
    return () => {
      live = false
    }
  }, [phase, token, paused, problem, cards, picked, tried])

  useEffect(() => {
    if (paused) guide.clear()
  }, [paused])

  useIdleReprompt({ key: `${problem?.id}:${token}`, enabled: phase === 'ask' && !paused })

  const interactive = phase === 'ask' && !paused

  function pick(card: number) {
    if (!interactive || !problem) return
    const opt = cards[card]
    if (!opt || tried.includes(card)) return
    const correct = opt.value === problem.answer
    const first = s.first === null
    if (first) {
      recordAnswer(correct, problem)
      if (meta) {
        const sk = skillOf(problem)
        recordAttempt({ zoneId: meta.zoneId, topic: provider.topic, skillId: sk.id, skillLabel: sk.label, correct })
      }
    }
    onAnswer?.(correct, first)
    sfx.pop()
    dispatch({ type: 'pick', card, correct })
  }

  function countObject(where: Where, obj: number) {
    if (!interactive) return
    const cur = s.marks[String(where)] ?? {}
    if (cur[obj] !== undefined) {
      sfx.tick()
      return
    }
    const n = Object.keys(cur).length + 1
    sfx.pop()
    dispatch({ type: 'mark', where, obj, n })
    if (n <= COUNT_MAX) void guide.say({ template: 'listen/number', slots: { n } })
  }

  function cardState(i: number): CardState {
    if (tried.includes(i)) return 'tried'
    if (picked === i) {
      if (phase === 'judge') return 'chosen'
      if (phase === 'oops') return 'look'
      return 'right'
    }
    if (phase === 'solved' && picked !== null) return 'dim'
    return 'idle'
  }

  const marksAt = (where: Where) => s.marks[String(where)]

  const renderCard = (i: number, className: string) => {
    const c = cards[i]
    return (
      <PictureCard
        key={`${problem?.id}-${i}`}
        guideId={lpCard(i)}
        picture={c.picture}
        label={pictureLabel(c.picture)}
        tint={i}
        state={cardState(i)}
        marks={marksAt(i)}
        frame={cardFrame}
        disabled={!interactive}
        onPick={() => pick(i)}
        className={className}
      >
        {import.meta.env.DEV && c.value === problem?.answer && <span data-correct="" hidden />}
      </PictureCard>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-ink-900/45 backdrop-blur-[3px] flex items-center justify-center p-3 short:p-2 pt-[calc(0.75rem+var(--safe-top,env(safe-area-inset-top,0px)))] pb-[calc(0.75rem+var(--safe-bottom,env(safe-area-inset-bottom,0px)))]"
      role="dialog"
      aria-modal="true"
      aria-label="Answer to build"
      data-listen-gate=""
      data-phase={phase}
    >
      <div className="relative w-full max-w-4xl h-full max-h-[44rem] flex flex-col short:flex-row min-h-0 bg-cream-50 border-[3px] border-line rounded-[2rem] shadow-pop p-3 short:p-2 gap-2 short:gap-3">
        {/* 🔊 · (spacer) · ↩ — a column on a short landscape screen */}
        <div className="flex short:flex-col items-center justify-between gap-3">
          <SayAgainButton disabled={!interactive} />
          <button
            type="button"
            aria-label="Close"
            data-guide="gate-close"
            onClick={() => {
              sfx.click()
              onCancel()
            }}
            className="grid place-items-center shrink-0 w-16 h-16 roomy:w-[72px] roomy:h-[72px] rounded-full bg-paper border-[3px] border-line shadow-ledge active:translate-y-[3px] active:shadow-ledge-sm outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70 focus-visible:ring-offset-2"
          >
            <svg viewBox="0 0 48 48" className="w-[56%] h-[56%]" aria-hidden="true">
              <path d="M20 12 L9 23 L20 34" fill="none" stroke="#3a2c38" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 23 H30 a9 9 0 0 1 0 18 H24" fill="none" stroke="#3a2c38" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {problem && panel && (
          <div className="lp-stage flex-1 min-h-0 min-w-0 flex flex-col justify-center gap-4 roomy:gap-6 landscape:grid landscape:grid-rows-1 landscape:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] landscape:items-center landscape:gap-4 short:gap-3">
            <div
              key={`pic-${problem.id}`}
              data-guide={LP_PICTURE}
              className="lp-picture-panel relative w-full h-[min(36vh,26rem)] landscape:h-full landscape:max-h-[30rem] min-h-36 shrink self-center bg-paper border-[3px] border-line rounded-[2rem] shadow-card overflow-hidden"
            >
              <div className="absolute inset-[4%] grid place-items-center">
                {picture && (
                  <PictureArt
                    picture={picture}
                    marks={marksAt('picture')}
                    onObjectTap={interactive && countable(picture) ? (i) => countObject('picture', i) : undefined}
                  />
                )}
              </div>
            </div>
            <div className="shrink-0 flex items-center justify-center gap-4 short:gap-3 roomy:gap-6 px-1 pb-1" role="group" aria-label="answers">
              {cards.map((_, i) => renderCard(i, `flex-1 ${cards.length <= 2 ? 'max-w-56 roomy:max-w-64' : 'max-w-48 roomy:max-w-56'}`))}
            </div>
          </div>
        )}

        {problem && !panel && (
          <div className="lp-stage flex-1 min-h-0 min-w-0 flex items-center justify-center">
            <div className="w-full flex flex-wrap landscape:flex-nowrap items-center justify-center gap-5 short:gap-4 roomy:gap-8 px-2 pb-2" role="group" aria-label="answers">
              {cards.map((_, i) =>
                renderCard(i, 'basis-[44%] landscape:basis-0 landscape:flex-1 max-w-64 landscape:max-w-[min(16rem,56vh)] roomy:max-w-72'),
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

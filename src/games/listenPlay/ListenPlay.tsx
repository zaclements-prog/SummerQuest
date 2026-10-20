import { useEffect, useMemo, useReducer, useRef } from 'react'
import type { GameProps } from '../../screens/GameRunner'
import { nextProblem } from '../../lib/problem'
import { sfx } from '../../lib/sound'
import { useProgress } from '../../store/progress'
import { skillOf } from '../../tutoring/skills'
import VisualRenderer from '../../components/VisualRenderer'
import { guide } from '../../guide/store'
import { COUNT_MAX } from '../../voice/packs/listen'
import { SayAgainButton } from '../../guide/SayAgainButton'
import { useIdleReprompt } from '../../guide/useIdleReprompt'
import { ToonStar } from '../../components/ui'
import { PictureArt, PictureCard, type CardState } from './PictureCard'
import { pictureLabel } from './pictureLabel'
import { LP_PICTURE, PRAISE, cardsFor, countAlongSteps, listenStars, lpCard, questionPicture, questionSteps, walkthroughGroup } from './script'
import type { ListenProblem } from './types'
import './listenPlay.css'

/**
 * Listen & Play: the voice-first quiz shell for K–1 (K–5 plan §5). Consumes
 * any provider whose problems carry `speech` and `pictureOptions` (see
 * ./types for the optional extras). Per item:
 *
 *  1. the narrator asks the question (auto-played);
 *  2. the guide lights the picture, then the answer cards, on cue;
 *  3. tapping a card says its label ("seven!");
 *  4. right → a happy pop and "Great job!", on to the next;
 *  5. not yet → "Hmm, let's look again", a walkthrough (a group is counted
 *     aloud, each object lighting up as its number is said), then try again
 *     with the tried card resting aside.
 *
 * No timers, no failing out, 5 items (3–6 via `params.questionCount`), 2–3
 * big cards, no words on screen. 🔊 top-left says it again; 8 s with no touch
 * says it once more, gently. Group pictures can be tapped to count them.
 *
 * Stars count first-try answers and are never 0.
 */

type Phase = 'loading' | 'ask' | 'judge' | 'praise' | 'oops' | 'done'
type Where = 'picture' | number

interface State {
  idx: number
  problem: ListenProblem | null
  phase: Phase
  /** Bumps on every phase entry, so re-entering 'ask' re-runs its script. */
  token: number
  picked: number | null
  /** Cards tried (not right) on this item: they rest aside. */
  tried: number[]
  /** First pick of this item was right (null until the first pick). */
  firstTry: boolean | null
  firstTryCorrect: number
  /** Per item: answered right first time? (the progress dots) */
  results: (boolean | null)[]
  /** Counted objects: which group, and the number each got. */
  marks: { where: Where; marks: Record<number, number> } | null
}

type Action =
  | { type: 'load'; idx: number; problem: ListenProblem }
  | { type: 'pick'; card: number; correct: boolean }
  | { type: 'judged'; correct: boolean }
  | { type: 'retry' }
  | { type: 'next'; total: number }
  | { type: 'mark'; where: Where; obj: number; n: number }
  | { type: 'clearMarks' }

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'load':
      if (a.idx !== s.idx) return s
      return { ...s, problem: a.problem, phase: 'ask', token: s.token + 1, picked: null, tried: [], firstTry: null, marks: null }
    case 'pick': {
      if (s.phase !== 'ask') return s
      const first = s.firstTry === null
      const results = [...s.results]
      if (first) results[s.idx] = a.correct
      return {
        ...s,
        phase: 'judge',
        token: s.token + 1,
        picked: a.card,
        firstTry: first ? a.correct : s.firstTry,
        firstTryCorrect: s.firstTryCorrect + (first && a.correct ? 1 : 0),
        results,
      }
    }
    case 'judged':
      if (s.phase !== 'judge') return s
      return { ...s, phase: a.correct ? 'praise' : 'oops', token: s.token + 1 }
    case 'retry':
      if (s.phase !== 'oops' || s.picked === null) return s
      return { ...s, phase: 'ask', token: s.token + 1, tried: [...s.tried, s.picked], picked: null }
    case 'next':
      if (s.phase !== 'praise') return s
      if (s.idx + 1 >= a.total) return { ...s, phase: 'done', token: s.token + 1 }
      return { ...s, idx: s.idx + 1, phase: 'loading', token: s.token + 1 }
    case 'mark': {
      const cur = s.marks && s.marks.where === a.where ? s.marks.marks : {}
      if (cur[a.obj] !== undefined) return s
      return { ...s, marks: { where: a.where, marks: { ...cur, [a.obj]: a.n } } }
    }
    case 'clearMarks':
      return { ...s, marks: null }
  }
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export default function ListenPlay({ provider, params, onComplete, meta, paused = false }: GameProps) {
  const total = Math.min(6, Math.max(3, Math.round(Number(params?.questionCount) || 5)))
  const [s, dispatch] = useReducer(reducer, {
    idx: 0,
    problem: null,
    phase: 'loading',
    token: 0,
    picked: null,
    tried: [],
    firstTry: null,
    firstTryCorrect: 0,
    results: Array.from({ length: total }, () => null),
    marks: null,
  })
  const recordAnswer = useProgress((st) => st.recordAnswer)
  const recordAttempt = useProgress((st) => st.recordAttempt)
  const onCompleteRef = useRef(onComplete)
  useEffect(() => {
    onCompleteRef.current = onComplete
  })

  const problem = s.problem
  const cards = useMemo(() => (problem ? cardsFor(problem) : []), [problem])
  const picture = problem ? questionPicture(problem) : null

  // ── the next question ──
  useEffect(() => {
    let live = true
    Promise.resolve(nextProblem(provider)).then((p) => {
      if (live) dispatch({ type: 'load', idx: s.idx, problem: p as ListenProblem })
    })
    return () => {
      live = false
    }
  }, [s.idx, provider])

  // ── what the narrator does in each phase (re-runs from the top after a pause) ──
  const { phase, token, picked, tried, idx, firstTryCorrect } = s
  useEffect(() => {
    if (paused || !problem) return
    let live = true
    const run = async () => {
      switch (phase) {
        case 'ask': {
          const open = cards.map((_, i) => i).filter((i) => !tried.includes(i))
          await guide.sequence(questionSteps(problem, open))
          return
        }
        case 'judge': {
          const opt = picked !== null ? cards[picked] : undefined
          if (!opt) return
          if (opt.speech) await guide.say(opt.speech)
          else await wait(300)
          if (live) dispatch({ type: 'judged', correct: opt.value === problem.answer })
          return
        }
        case 'praise': {
          sfx.correct()
          await guide.say(PRAISE[idx % PRAISE.length])
          if (!live) return
          await wait(500)
          if (!live) return
          if (idx + 1 >= total) {
            onCompleteRef.current({ stars: listenStars(firstTryCorrect, total), score: firstTryCorrect * 10, correct: firstTryCorrect, total })
          }
          dispatch({ type: 'next', total })
          return
        }
        case 'oops': {
          await guide.say({ line: 'ui/tryAgain' })
          if (!live || picked === null) return
          const group = walkthroughGroup(problem, cards, picked)
          if (group) {
            dispatch({ type: 'clearMarks' })
            const where = group.where
            await guide.sequence(
              countAlongSteps(group.count, group.target, (i) => {
                if (live) dispatch({ type: 'mark', where, obj: i, n: i + 1 })
              }),
              { repeatable: false },
            )
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
  }, [phase, token, paused, problem, cards, picked, tried, idx, firstTryCorrect, total])

  // "Quit?" is open: hush (the phase starts over when it closes)
  useEffect(() => {
    if (paused) guide.clear()
  }, [paused])
  // leaving: stop talking, and 🔊 has nothing left to repeat
  useEffect(() => () => guide.clear({ forget: true }), [])

  useIdleReprompt({ key: `${idx}:${token}`, enabled: phase === 'ask' && !paused })

  function pick(card: number) {
    if (phase !== 'ask' || !problem || paused) return
    const opt = cards[card]
    if (!opt || tried.includes(card)) return
    const correct = opt.value === problem.answer
    if (s.firstTry === null) {
      recordAnswer(correct, problem)
      if (meta) {
        const sk = skillOf(problem)
        recordAttempt({ zoneId: meta.zoneId, topic: provider.topic, skillId: sk.id, skillLabel: sk.label, correct })
      }
    }
    sfx.pop()
    dispatch({ type: 'pick', card, correct })
  }

  function countObject(where: Where, obj: number) {
    if (phase !== 'ask' || paused) return
    const cur = s.marks && s.marks.where === where ? s.marks.marks : {}
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
    if ((phase === 'praise' || phase === 'done' || phase === 'loading') && picked !== null) return 'dim'
    return 'idle'
  }

  const interactive = phase === 'ask' && !paused
  const pictureMarks = s.marks?.where === 'picture' ? s.marks.marks : undefined

  return (
    // Nothing in here has a height of its own (pictures are placed absolutely), so
    // the stage always fits the screen it's given, from a Fire 7 sideways to a 10" tablet.
    <div className="game-surface flex-1 flex flex-col short:flex-row min-h-0 px-3 sm:px-5 pb-3 short:pb-2 short:pl-2 gap-x-3" data-listen-play="" data-phase={phase}>
      {/* 🔊 top-left · progress (a row on top; a column on a short landscape screen) · a balancing spacer */}
      <div className="flex short:flex-col items-center gap-3 short:gap-4 pt-1 pb-2 short:py-0">
        <SayAgainButton disabled={!interactive} />
        <ListenProgress results={s.results} current={idx} />
        <div className="w-[72px] roomy:w-20 shrink-0 short:hidden" aria-hidden="true" />
      </div>

      {problem && (
        // upright: picture over cards, centred; sideways: side by side
        <div className="lp-stage flex-1 min-h-0 min-w-0 flex flex-col justify-center gap-5 roomy:gap-7 landscape:grid landscape:grid-rows-1 landscape:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] landscape:items-center landscape:gap-4 short:gap-3 landscape:roomy:gap-6">
          {/* the question's picture */}
          <div
            key={`pic-${problem.id}`}
            data-guide={LP_PICTURE}
            className="lp-picture-panel relative w-full h-[min(44vh,30rem)] landscape:h-full landscape:max-h-[34rem] min-h-40 shrink self-center bg-paper border-[3px] border-line rounded-[2rem] shadow-card overflow-hidden"
          >
            <div className="absolute inset-[4%] grid place-items-center">
              {picture ? (
                <PictureArt
                  picture={picture}
                  marks={pictureMarks}
                  onObjectTap={picture.kind === 'group' && interactive ? (i) => countObject('picture', i) : undefined}
                />
              ) : problem.visual && problem.visual.kind !== 'none' ? (
                <VisualRenderer visual={problem.visual} size="md" />
              ) : (
                <span className="text-7xl" aria-hidden="true">
                  👂
                </span>
              )}
            </div>
          </div>

          {/* the answers */}
          <div className="shrink-0 flex items-center justify-center gap-4 short:gap-3 roomy:gap-6 px-1 pb-1" role="group" aria-label="answers">
            {cards.map((c, i) => (
              <PictureCard
                key={`${problem.id}-${i}`}
                guideId={lpCard(i)}
                picture={c.picture}
                label={pictureLabel(c.picture)}
                tint={i}
                state={cardState(i)}
                marks={s.marks?.where === i ? s.marks.marks : undefined}
                disabled={!interactive}
                onPick={() => pick(i)}
                className={`flex-1 ${cards.length <= 2 ? 'max-w-60 roomy:max-w-64' : 'max-w-52 roomy:max-w-60'}`}
              >
                {import.meta.env.DEV && c.value === problem.answer && <span data-correct="" hidden />}
              </PictureCard>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** Dots for the round: done ones become stars, the current one bobs. No numbers, no words. */
function ListenProgress({ results, current }: { results: (boolean | null)[]; current: number }) {
  return (
    <div
      className="flex-1 flex short:flex-none short:flex-col items-center justify-center gap-2 short:gap-1.5"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={results.length}
      aria-valuenow={current + 1}
      aria-label="questions"
    >
      {results.map((r, i) =>
        r !== null && i !== current ? (
          <span key={i} className="grid place-items-center w-9 h-9 short:w-8 short:h-8" aria-hidden="true">
            <ToonStar filled px={34} />
          </span>
        ) : (
          <span
            key={i}
            data-now={i === current ? '' : undefined}
            className={[
              'lp-progress-dot block rounded-full border-[3px] border-line',
              i === current ? 'w-6 h-6 bg-quest-300' : 'w-5 h-5 bg-paper/80',
            ].join(' ')}
            aria-hidden="true"
          />
        ),
      )}
    </div>
  )
}

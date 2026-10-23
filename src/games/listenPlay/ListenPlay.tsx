import { useEffect, useMemo, useReducer, useRef } from 'react'
import type { Picture } from '../../lib/problem'
import { useMediaQuery } from '../../components/useViewport'
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
import { PictureArt, PictureCard, type CardState, type GroupMarks } from './PictureCard'
import { pictureLabel } from './pictureLabel'
import { sharedFrame } from './groupLayout'
import { activityDef } from './activities'
import {
  LP_ACTIVITY,
  LP_PICTURE,
  activityAskSteps,
  cardsFor,
  countable,
  countUpSteps,
  hasPicturePanel,
  listenStars,
  lpCard,
  lpPair,
  praiseFor,
  questionPicture,
  questionSteps,
  reteachSteps,
  walkthroughCounts,
  walkthroughSteps,
  type Where,
} from './script'
import type { ListenPhase, ListenProblem } from './types'
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
 *  5. not yet → "Hmm, let's look again", a word about the tried card if the
 *     question has one ("Cat starts with C."), a walkthrough (a group, both
 *     groups or a shape's sides counted aloud, each lighting up as its number
 *     is said; numerals counted up to), then try again with the tried card
 *     resting aside.
 *
 * No timers, no failing out, 5 items (3–6 via `params.questionCount`), 2–3
 * big cards, no words on screen. 🔊 top-left says it again; 8 s with no touch
 * says it once more, gently. Group pictures (and a shape's sides) can be
 * tapped to count them. A question with no picture of its own gives the
 * cards the whole stage.
 *
 * Stars count first-try answers and are never 0.
 *
 * A question with an `activity` (trace a letter, tap a drum, put a story in
 * order) shows that activity instead of cards (see ./activities): it reports
 * each try, and after a miss its own help runs between "let's look again" and
 * "Your turn!".
 */

type Phase = ListenPhase
type Marks = Readonly<Record<string, GroupMarks>>

interface State {
  idx: number
  problem: ListenProblem | null
  phase: Phase
  /** Bumps on every phase entry, so re-entering 'ask' re-runs its script. */
  token: number
  picked: number | null
  /** Cards tried (not right) on this item: they rest aside. */
  tried: number[]
  /** Tries on this item that weren't right (cards or an activity). */
  misses: number
  /** First pick of this item was right (null until the first pick). */
  firstTry: boolean | null
  firstTryCorrect: number
  /** Per item: answered right first time? (the progress dots) */
  results: (boolean | null)[]
  /** Counted objects, per group (`String(where)`): the number each got. */
  marks: Marks
}

type Action =
  | { type: 'load'; idx: number; problem: ListenProblem }
  | { type: 'pick'; card: number; correct: boolean }
  | { type: 'attempt'; correct: boolean }
  | { type: 'judged'; correct: boolean }
  | { type: 'retry' }
  | { type: 'next'; total: number }
  | { type: 'mark'; where: Where; obj: number; n: number }
  | { type: 'clearMarks' }

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'load':
      if (a.idx !== s.idx) return s
      return { ...s, problem: a.problem, phase: 'ask', token: s.token + 1, picked: null, tried: [], misses: 0, firstTry: null, marks: {} }
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
    case 'attempt': {
      // an activity's try: judged by the activity itself, so straight to praise or "let's look again"
      if (s.phase !== 'ask') return s
      const first = s.firstTry === null
      const results = [...s.results]
      if (first) results[s.idx] = a.correct
      return {
        ...s,
        phase: a.correct ? 'praise' : 'oops',
        token: s.token + 1,
        firstTry: first ? a.correct : s.firstTry,
        firstTryCorrect: s.firstTryCorrect + (first && a.correct ? 1 : 0),
        results,
      }
    }
    case 'judged':
      if (s.phase !== 'judge') return s
      return { ...s, phase: a.correct ? 'praise' : 'oops', token: s.token + 1 }
    case 'retry':
      if (s.phase !== 'oops') return s
      if (s.picked === null) return s.problem?.activity ? { ...s, phase: 'ask', token: s.token + 1, misses: s.misses + 1 } : s
      return { ...s, phase: 'ask', token: s.token + 1, tried: [...s.tried, s.picked], misses: s.misses + 1, picked: null }
    case 'next':
      if (s.phase !== 'praise') return s
      if (s.idx + 1 >= a.total) return { ...s, phase: 'done', token: s.token + 1 }
      return { ...s, idx: s.idx + 1, phase: 'loading', token: s.token + 1 }
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

export default function ListenPlay({ provider, params, onComplete, meta, paused = false }: GameProps) {
  const total = Math.min(6, Math.max(3, Math.round(Number(params?.questionCount) || 5)))
  const [s, dispatch] = useReducer(reducer, {
    idx: 0,
    problem: null,
    phase: 'loading',
    token: 0,
    picked: null,
    tried: [],
    misses: 0,
    firstTry: null,
    firstTryCorrect: 0,
    results: Array.from({ length: total }, () => null),
    marks: {},
  })
  const recordAnswer = useProgress((st) => st.recordAnswer)
  const recordAttempt = useProgress((st) => st.recordAttempt)
  const onCompleteRef = useRef(onComplete)
  useEffect(() => {
    onCompleteRef.current = onComplete
  })

  const problem = s.problem
  const activity = problem ? activityDef(problem.activity) : null
  // the activity's help after a miss (it registers it; the 'oops' script runs it)
  const helpRef = useRef<(() => Promise<void>) | null>(null)
  const cards = useMemo(() => (problem && !problem.activity ? cardsFor(problem) : []), [problem])
  const picture = problem ? questionPicture(problem) : null
  const panel = problem ? hasPicturePanel(problem) : false
  // a pair stacks on a landscape screen (its panel is tall) and sits side by side upright
  const landscape = useMediaQuery('(orientation: landscape)')
  const pairAspect = landscape ? 1.8 : 0.7
  // groups shown together draw their objects the same size: the bigger group never looks smaller
  const groupCounts = (pics: readonly Picture[]) => (pics.every((p) => p.kind === 'group') ? pics.map((p) => (p.kind === 'group' ? p.count : 0)) : [])
  const cardFrame = sharedFrame(groupCounts(cards.map((c) => c.picture)), 1)
  const pairFrame = problem?.pair ? sharedFrame(groupCounts(problem.pair), pairAspect) : undefined

  // a round starts the provider afresh: a replay, and React's dev double mount, ask from the
  // first question again (a provider that counts its round, like Count with me's last trace)
  useEffect(() => {
    provider.reset?.()
  }, [provider])

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
  const { phase, token, picked, tried, idx, firstTryCorrect, misses } = s
  useEffect(() => {
    if (paused || !problem) return
    let live = true
    const run = async () => {
      switch (phase) {
        case 'ask': {
          if (problem.activity) {
            const def = activityDef(problem.activity)
            const steps = activityAskSteps(problem, def, misses)
            // 🔊 can say more than the question (Read along: it reads the sentence, as help)
            const replay = def?.replaySteps?.(problem, problem.activity)
            if (replay?.length) {
              guide.setReplay(replay)
              await guide.sequence(steps, { repeatable: false })
            } else await guide.sequence(steps)
            return
          }
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
          await guide.say(praiseFor(problem, idx))
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
          if (!live) return
          if (problem.activity) {
            const help = helpRef.current
            if (help) await help()
            if (!live) return
            await guide.say({ line: 'listen/yourTurn' })
            if (live) dispatch({ type: 'retry' })
            return
          }
          if (picked === null) return
          // a word about the card that was tapped ("Cat starts with C.")
          const note = problem.notes?.[picked]
          if (note) {
            await guide.show({ voice: note, target: lpCard(picked), hand: false, pad: 12 }, { repeatable: false })
            if (!live) return
          }
          // the answer lit up and named ("This is the letter A."): the next try isn't a guess.
          // Before counting the answer's sides; after counting the picked card's
          const reteach = reteachSteps(problem, cards)
          const teachFirst = problem.walkthrough === 'answer'
          if (reteach.length && teachFirst) {
            await guide.sequence(reteach, { repeatable: false })
            if (!live) return
          }
          const open = cards.map((_, i) => i).filter((i) => !tried.includes(i))
          const plan = walkthroughCounts(problem, cards, picked, open)
          const steps = plan.length
            ? walkthroughSteps(
                plan,
                (where, i) => {
                  if (live) dispatch({ type: 'mark', where, obj: i, n: i + 1 })
                },
                // (straight after "…Four sides, all the same.": just the count)
                !(teachFirst && reteach.length),
              )
            : problem.walkthrough === 'countUp'
              ? countUpSteps(cards, open)
              : []
          if (steps.length) {
            dispatch({ type: 'clearMarks' })
            await guide.sequence(steps, { repeatable: false })
            if (!live) return
          }
          if (reteach.length && !teachFirst) {
            await guide.sequence(reteach, { repeatable: false })
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
  }, [phase, token, paused, problem, cards, picked, tried, idx, firstTryCorrect, total, misses])

  // "Quit?" is open: hush (the phase starts over when it closes)
  useEffect(() => {
    if (paused) guide.clear()
  }, [paused])
  // leaving: stop talking, and 🔊 has nothing left to repeat
  useEffect(() => () => guide.clear({ forget: true }), [])

  // an activity with a long intro says just what to do now (Sorting Delta: "Put each one in its box!")
  const reprompt = problem?.activity && activity?.repromptSteps ? () => void guide.sequence(activity.repromptSteps!(problem, problem.activity!), { gentle: true, repeatable: false }) : undefined
  useIdleReprompt({ key: `${idx}:${token}`, enabled: phase === 'ask' && !paused, onIdle: reprompt })

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

  function attempt(correct: boolean) {
    if (phase !== 'ask' || !problem || paused) return
    if (s.firstTry === null) {
      recordAnswer(correct, problem)
      if (meta) {
        const sk = skillOf(problem)
        recordAttempt({ zoneId: meta.zoneId, topic: provider.topic, skillId: sk.id, skillLabel: sk.label, correct })
      }
    }
    dispatch({ type: 'attempt', correct })
  }

  function countObject(where: Where, obj: number) {
    if (phase !== 'ask' || paused) return
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
    if ((phase === 'praise' || phase === 'done' || phase === 'loading') && picked !== null) return 'dim'
    return 'idle'
  }

  const interactive = phase === 'ask' && !paused
  const marksAt = (where: Where): GroupMarks | undefined => s.marks[String(where)]
  /** A picture the child can count by tapping: a group's objects, a shape's sides. */
  const tapToCount = (pic: Picture, where: Where) => (interactive && countable(pic) ? (i: number) => countObject(where, i) : undefined)

  function renderCard(pic: Picture, right: boolean, i: number, className: string) {
    return (
      <PictureCard
        key={`${problem?.id}-${i}`}
        guideId={lpCard(i)}
        picture={pic}
        label={pictureLabel(pic)}
        tint={i}
        state={cardState(i)}
        marks={marksAt(i)}
        frame={cardFrame}
        disabled={!interactive}
        onPick={() => pick(i)}
        className={className}
      >
        {import.meta.env.DEV && right && <span data-correct="" hidden />}
      </PictureCard>
    )
  }

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

      {problem && activity && problem.activity && (
        // an activity takes the whole stage (trace, drum, story order)
        <div key={`act-${problem.id}`} data-guide={LP_ACTIVITY} data-activity={problem.activity.kind} className="lp-stage relative flex-1 min-h-0 min-w-0 flex">
          <activity.Component
            problem={problem}
            spec={problem.activity}
            phase={phase}
            active={interactive}
            misses={s.misses}
            onAttempt={attempt}
            registerHelp={(h) => {
              helpRef.current = h
            }}
          />
        </div>
      )}

      {problem && !problem.activity && panel && (
        // upright: picture over cards, centred; sideways: side by side
        <div className="lp-stage flex-1 min-h-0 min-w-0 flex flex-col justify-center gap-5 roomy:gap-7 landscape:grid landscape:grid-rows-1 landscape:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] landscape:items-center landscape:gap-4 short:gap-3 landscape:roomy:gap-6">
          {/* the question's picture */}
          <div
            key={`pic-${problem.id}`}
            data-guide={LP_PICTURE}
            className="lp-picture-panel relative w-full h-[min(44vh,30rem)] landscape:h-full landscape:max-h-[34rem] min-h-40 shrink self-center bg-paper border-[3px] border-line rounded-[2rem] shadow-card overflow-hidden"
          >
            {problem.pair ? (
              // two groups to compare: side by side upright, one above the other sideways
              <div className="absolute inset-[3%] flex flex-row landscape:flex-col gap-[3%]">
                {problem.pair.map((pic, k) => {
                  const where: Where = k === 0 ? 'pair0' : 'pair1'
                  const m = marksAt(where)
                  const counted = m ? Object.keys(m).length : 0
                  return (
                    <div key={k} data-guide={lpPair(k)} className="relative flex-1 min-w-0 min-h-0 rounded-[1.5rem] border-[3px] border-dashed border-line/25 bg-paper/60">
                      <div className="absolute inset-[5%] grid place-items-center">
                        <PictureArt picture={pic} marks={m} aspect={pairAspect} frame={pairFrame} onObjectTap={tapToCount(pic, where)} />
                      </div>
                      {counted > 0 && <CountBubble n={counted} />}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="absolute inset-[4%] grid place-items-center">
                {picture ? (
                  <PictureArt picture={picture} marks={marksAt('picture')} onObjectTap={tapToCount(picture, 'picture')} />
                ) : (
                  problem.visual && <VisualRenderer visual={problem.visual} size="md" />
                )}
              </div>
            )}
          </div>

          {/* the answers */}
          <div className="shrink-0 flex items-center justify-center gap-4 short:gap-3 roomy:gap-6 px-1 pb-1" role="group" aria-label="answers">
            {cards.map((c, i) => renderCard(c.picture, c.value === problem.answer, i, `flex-1 ${cards.length <= 2 ? 'max-w-60 roomy:max-w-64' : 'max-w-52 roomy:max-w-60'}`))}
          </div>
        </div>
      )}

      {problem && !problem.activity && !panel && (
        // nothing to show but the answers ("Tap the triangle."): they take the stage, big
        <div className="lp-stage flex-1 min-h-0 min-w-0 flex items-center justify-center">
          <div
            className="w-full flex flex-wrap landscape:flex-nowrap items-center justify-center gap-5 short:gap-4 roomy:gap-8 px-2 pb-2"
            role="group"
            aria-label="answers"
          >
            {cards.map((c, i) =>
              renderCard(
                c.picture,
                c.value === problem.answer,
                i,
                // upright: two to a row (a third below, centred); sideways: one row, as big as the height allows
                'basis-[46%] landscape:basis-0 landscape:flex-1 max-w-72 landscape:max-w-[min(18rem,62vh)] roomy:max-w-80 landscape:roomy:max-w-[min(20rem,58vh)]',
              ),
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** The running count of a group being counted, big enough to read whatever the group's size. */
function CountBubble({ n }: { n: number }) {
  return (
    <span key={n} className="lp-count-bubble absolute top-1 left-1 grid place-items-center w-12 h-12 rounded-full bg-quest-400 border-[3px] border-line shadow-ledge-sm kid-text font-bold text-2xl text-ink-900" aria-hidden="true">
      {n}
    </span>
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

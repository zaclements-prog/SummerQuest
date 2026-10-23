import { useEffect, useReducer, useRef } from 'react'
import { guide } from '../../guide/store'
import { useIdleReprompt } from '../../guide/useIdleReprompt'
import { PictureCard, type CardState } from '../../games/listenPlay/PictureCard'
import { pictureLabel } from '../../games/listenPlay/pictureLabel'
import { PRAISE, countAlongSteps } from '../../games/listenPlay/script'
import type { PictureOption } from '../../lib/problem'
import { sfx } from '../../lib/sound'
import type { LessonCheck } from '../types'
import { LESSON_NEXT, LESSON_STAGE, askSteps, explainAloud, lessonCard } from './listenScript'

type Phase = 'ask' | 'judge' | 'praise' | 'oops' | 'done'

interface State {
  phase: Phase
  /** Bumps on every phase entry, so going back to 'ask' asks again. */
  token: number
  picked: number | null
}

type Action = { type: 'pick'; card: number } | { type: 'judged'; correct: boolean } | { type: 'retry' } | { type: 'done' }

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'pick':
      return s.phase === 'ask' ? { phase: 'judge', token: s.token + 1, picked: a.card } : s
    case 'judged':
      return s.phase === 'judge' ? { ...s, phase: a.correct ? 'praise' : 'oops', token: s.token + 1 } : s
    case 'retry':
      return s.phase === 'oops' ? { phase: 'ask', token: s.token + 1, picked: null } : s
    case 'done':
      return s.phase === 'praise' ? { ...s, phase: 'done', token: s.token + 1 } : s
  }
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * A lesson step's "your turn" for the voice-first grades: big picture cards,
 * no words. The narrator asks the question (the guide lights the stage, the
 * cards as they are named, then sweeps a hand along them); tapping a card
 * says its name; right → a happy pop and praise, and the hand points at ▶;
 * not yet → "Hmm, let's look again", counting the stage aloud together when
 * there is something to count, "Now you try!", and the tried card rests
 * aside. Never a red ✗, never a dead end. 🔊 and 8 s of quiet ask again.
 *
 * `tried` and `solved` live with the lesson (they survive the check being
 * hidden while the step is watched again).
 */
export default function ListenCheck({
  check,
  cards,
  tried,
  solved,
  praise = 0,
  onTry,
  onSolve,
  layout,
}: {
  check: LessonCheck
  /** The answer cards, in the order shown. */
  cards: PictureOption[]
  tried: number[]
  solved: boolean
  /** Which praise line to say (take turns across steps). */
  praise?: number
  onTry: (card: number) => void
  onSolve: () => void
  /** A row under the stage (upright screens) or a column beside it (sideways). */
  layout: 'row' | 'column'
}) {
  const answerCard = cards.findIndex((c) => c.value === check.answer)
  const [s, dispatch] = useReducer(reducer, null, (): State => (solved ? { phase: 'done', token: 0, picked: answerCard } : { phase: 'ask', token: 0, picked: null }))
  const handlers = useRef({ onTry, onSolve })
  useEffect(() => {
    handlers.current = { onTry, onSolve }
  })

  const { phase, token, picked } = s
  useEffect(() => {
    let live = true
    const run = async () => {
      switch (phase) {
        case 'ask': {
          const open = cards.map((_, i) => i).filter((i) => !tried.includes(i))
          await guide.sequence(askSteps(check, cards, open))
          return
        }
        case 'judge': {
          const opt = picked !== null ? cards[picked] : undefined
          if (!opt) return
          if (opt.speech) await guide.say(opt.speech)
          else await wait(300)
          if (live) dispatch({ type: 'judged', correct: opt.value === check.answer })
          return
        }
        case 'praise': {
          sfx.correct()
          handlers.current.onSolve()
          await guide.say(PRAISE[praise % PRAISE.length])
          if (live) dispatch({ type: 'done' })
          return
        }
        case 'oops': {
          await guide.say({ line: 'ui/tryAgain' })
          if (!live) return
          // nothing to count: the rule, said with the answer lit up ("A triangle has three sides.")
          const explain = explainAloud(check)
          if (explain && answerCard >= 0) {
            await guide.show({ voice: explain, target: lessonCard(answerCard), hand: false, pad: 10 }, { repeatable: false })
            if (!live) return
          }
          if (check.countAlong) {
            await guide.sequence(countAlongSteps(check.countAlong, LESSON_STAGE, () => {}), { repeatable: false })
            if (!live) return
          }
          await guide.say({ line: 'listen/yourTurn' })
          if (!live || picked === null) return
          handlers.current.onTry(picked)
          dispatch({ type: 'retry' })
          return
        }
        case 'done':
          // the answer's found: the hand shows the way on (no words, no dimming)
          void guide.show({ voice: null, target: LESSON_NEXT, hand: 'tap', dim: false, pad: 10 }, { repeatable: false })
          return
      }
    }
    void run()
    return () => {
      live = false
    }
    // `tried` is read when asking; it only changes together with a retry
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, token, check, cards, picked, praise])

  // leaving (the next step, watching this one again): stop talking; 🔊 has nothing of ours to repeat
  useEffect(() => () => guide.clear({ forget: true }), [])

  useIdleReprompt({ key: token, enabled: phase === 'ask' })

  function pick(card: number) {
    if (phase !== 'ask' || tried.includes(card)) return
    sfx.pop()
    dispatch({ type: 'pick', card })
  }

  function cardState(i: number): CardState {
    if (tried.includes(i)) return 'tried'
    if (picked === i) return phase === 'judge' ? 'chosen' : phase === 'oops' ? 'look' : 'right'
    if (phase === 'praise' || phase === 'done') return 'dim'
    return 'idle'
  }

  return (
    <section aria-label="Your turn" className={layout === 'column' ? 'grid min-h-0 flex-1 grid-rows-3 gap-3 short:gap-2' : 'grid grid-cols-3 gap-3 sm:gap-4'} data-listen-check="" data-phase={phase}>
      <h2 className="sr-only">{check.question}</h2>
      {cards.map((c, i) => (
        <div key={i} className={layout === 'column' ? 'grid min-h-0 place-items-center [container-type:size]' : 'grid place-items-center'}>
          <PictureCard
            guideId={lessonCard(i)}
            picture={c.picture}
            label={pictureLabel(c.picture)}
            tint={i}
            state={cardState(i)}
            disabled={phase !== 'ask'}
            onPick={() => pick(i)}
            className={layout === 'column' ? 'w-[min(100cqw,100cqh)] !min-w-0 !min-h-0' : 'w-full max-w-52'}
          >
            {import.meta.env.DEV && c.value === check.answer && <span data-correct="" hidden />}
          </PictureCard>
        </div>
      ))}
    </section>
  )
}

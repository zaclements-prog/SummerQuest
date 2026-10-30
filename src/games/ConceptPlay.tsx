import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../screens/GameRunner'
import { nextProblem, type Problem } from '../lib/problem'
import { sfx } from '../lib/sound'
import { useProgress } from '../store/progress'
import VisualRenderer from '../components/VisualRenderer'
import { visualSize } from '../components/visualSize'
import { skillOf } from '../tutoring/skills'
import { Loading } from '../components/ui'
import { QuizProgress, QuestionPrompt, AnswerGrid, QuizSplit, MissNote } from './_shared/QuizUI'
import { SHORT_SCREEN, WIDE_SHORT, useMediaQuery } from '../components/useViewport'
import { ShowMeButton, ShowMePanel, ShowMeStrip } from './_shared/ShowMeHow'
import { useShowMe } from './_shared/useShowMe'

/**
 * Generic concept stage. Shows a problem with its visual representation, presents
 * multiple-choice options, no timer. Works for any topic via the provider.
 */
export default function ConceptPlay({ provider, params, onComplete, meta }: GameProps) {
  const questionCount = (params?.questionCount as number) ?? 6

  const [idx, setIdx] = useState(0)
  const [problem, setProblem] = useState<Problem | null>(null)
  const [answered, setAnswered] = useState<string | number | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  // Index of the question whose problem has arrived; anything else is still loading.
  const [loadedIdx, setLoadedIdx] = useState(-1)
  const loading = loadedIdx !== idx
  const advancedRef = useRef(-1)
  const recordAnswer = useProgress((s) => s.recordAnswer)
  const recordAttempt = useProgress((s) => s.recordAttempt)
  // Phone held sideways: smaller pictures, question beside the answers.
  const short = useMediaQuery(SHORT_SCREEN)
  const wide = useMediaQuery(WIDE_SHORT)
  // "💡 Show me how" (questions with a worked example): free to open, before or after answering
  const showMe = useShowMe(loadedIdx === idx ? problem : null)

  useEffect(() => {
    let cancel = false
    nextProblem(provider).then((p) => {
      if (!cancel) {
        setProblem(p)
        setAnswered(null)
        setLoadedIdx(idx)
      }
    })
    return () => {
      cancel = true
    }
  }, [idx, provider])

  function pick(opt: string | number) {
    if (!problem || answered !== null || showMe.open) return
    setAnswered(opt)
    const isCorrect = opt === problem.answer
    recordAnswer(isCorrect, problem)
    if (meta) {
      const sk = skillOf(problem)
      recordAttempt({
        zoneId: meta.zoneId,
        topic: provider.topic,
        skillId: sk.id,
        skillLabel: sk.label,
        correct: isCorrect,
        // watched "Show me how" first: still right (and still a star), but marked helped
        ...(showMe.helped ? { helped: true } : {}),
      })
    }
    if (isCorrect) {
      sfx.correct()
      setCorrectCount((c) => c + 1)
      // A right answer moves on by itself; a wrong one waits for "Got it →" (below).
      setTimeout(() => advance(correctCount + 1), 1100)
    } else {
      sfx.wrong()
    }
  }

  /** On to the next question, or the end of the stage. */
  function advance(finalCorrect: number) {
    // Once per question (a double tap on "Got it →" mustn't skip one).
    if (advancedRef.current === idx) return
    advancedRef.current = idx
    if (idx + 1 >= questionCount) {
      const stars =
        finalCorrect >= questionCount
          ? 3
          : finalCorrect >= questionCount - 1
            ? 2
            : finalCorrect >= Math.floor(questionCount * 0.6)
              ? 1
              : 0
      onComplete({
        stars,
        score: finalCorrect * 10,
        correct: finalCorrect,
        total: questionCount,
      })
    } else {
      setIdx((i) => i + 1)
    }
  }

  if (loading || !problem) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loading label="Loading your question…" />
      </div>
    )
  }

  // The 'wordProblem' visual merely re-prints the prompt the game already shows,
  // so we skip the visual entirely for it. Genuine visuals (arrays, fraction
  // bars, clocks, etc.) still render below.
  const hasGenuineVisual =
    !!problem.visual &&
    problem.visual.kind !== 'none' &&
    problem.visual.kind !== 'wordProblem'

  return (
    <div className="game-surface flex-1 flex flex-col items-center p-4 short:px-3 short:pt-1 overflow-y-auto">
      {/* On a tablet the quiz sits in the middle of the screen (margin-auto centring
          still scrolls from the top when a long passage doesn't fit). */}
      <div className="w-full flex flex-col items-center roomy:my-auto">
      <QuizProgress current={idx + 1} total={questionCount} />

      <QuizSplit
        key={problem.id}
        question={
          <>
            <QuestionPrompt>{problem.prompt}</QuestionPrompt>
            {showMe.available && answered === null && (
              showMe.finished
                ? <ShowMeStrip steps={problem.showMe!} onReplay={showMe.show} />
                : <ShowMeButton onClick={showMe.show} className="mt-3 short:mt-2" />
            )}
            {hasGenuineVisual && (
              <div className="my-5 max-sm:my-3.5 short:my-3 flex justify-center">
                <VisualRenderer visual={problem.visual} size={visualSize(problem.visual, short, wide)} />
              </div>
            )}
          </>
        }
        answers={
          <>
            <div className={hasGenuineVisual ? 'w-full flex justify-center' : 'mt-6 short:mt-0 w-full flex justify-center'}>
              <AnswerGrid
                options={problem.options}
                answer={problem.answer}
                picked={answered}
                onPick={pick}
                disabled={answered !== null}
              />
            </div>
            {answered !== null && answered !== problem.answer && (
              <MissNote
                answer={problem.answer}
                hint={problem.hint}
                onGotIt={() => advance(correctCount)}
                onShowMe={showMe.available ? showMe.show : undefined}
              />
            )}
          </>
        }
      />
      </div>
      <ShowMePanel open={showMe.open} steps={problem.showMe} afterAnswer={answered !== null} onClose={showMe.close} />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { GameProps } from '../screens/GameRunner'
import { nextProblem, type Problem } from '../lib/problem'
import { sfx } from '../lib/sound'
import { useProgress } from '../store/progress'
import VisualRenderer from '../components/VisualRenderer'
import { skillOf } from '../tutoring/skills'
import { Loading } from '../components/ui'
import { QuizProgress, QuestionPrompt, AnswerGrid } from './_shared/QuizUI'

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
  const recordAnswer = useProgress((s) => s.recordAnswer)
  const recordAttempt = useProgress((s) => s.recordAttempt)

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
    if (!problem || answered !== null) return
    setAnswered(opt)
    const isCorrect = opt === problem.answer
    recordAnswer(isCorrect, problem)
    if (meta) {
      const sk = skillOf(problem)
      recordAttempt({ zoneId: meta.zoneId, topic: provider.topic, skillId: sk.id, skillLabel: sk.label, correct: isCorrect })
    }
    if (isCorrect) {
      sfx.correct()
      setCorrectCount((c) => c + 1)
    } else {
      sfx.wrong()
    }
    setTimeout(() => {
      if (idx + 1 >= questionCount) {
        const finalCorrect = correctCount + (isCorrect ? 1 : 0)
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
    }, 1100)
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
    <div className="flex-1 flex flex-col items-center p-4 overflow-y-auto">
      <QuizProgress current={idx + 1} total={questionCount} />

      <div key={problem.id} className="w-full flex flex-col items-center">
        <QuestionPrompt>{problem.prompt}</QuestionPrompt>

        {hasGenuineVisual && (
          <div className="my-5 flex justify-center">
            <VisualRenderer visual={problem.visual} size="md" />
          </div>
        )}

        <div className={hasGenuineVisual ? 'w-full flex justify-center' : 'mt-6 w-full flex justify-center'}>
          <AnswerGrid
            options={problem.options}
            answer={problem.answer}
            picked={answered}
            onPick={pick}
            disabled={answered !== null}
          />
        </div>
      </div>

      {answered !== null && answered !== problem.answer && problem.hint && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 flex items-center gap-3 bg-quest-100 text-ink-900 pl-2 pr-4 py-2 rounded-[1.25rem] border-[3px] border-line shadow-ledge-sm kid-text text-lg max-w-md text-left"
        >
          <span
            className="grid place-items-center w-10 h-10 shrink-0 rounded-full bg-quest-300 border-2 border-line text-xl"
            aria-hidden="true"
          >
            💡
          </span>
          {problem.hint}
        </motion.div>
      )}
    </div>
  )
}

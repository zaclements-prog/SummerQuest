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
    recordAnswer(isCorrect)
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
          <div className="my-4 flex justify-center">
            <VisualRenderer visual={problem.visual} size="md" />
          </div>
        )}

        <div className={hasGenuineVisual ? '' : 'mt-4'}>
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
          className="mt-4 bg-quest-400/20 text-ink-900 px-4 py-3 rounded-2xl kid-text text-base max-w-md text-center"
        >
          <span className="mr-1" aria-hidden="true">💡</span>
          {problem.hint}
        </motion.div>
      )}
    </div>
  )
}

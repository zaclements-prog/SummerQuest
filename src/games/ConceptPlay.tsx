import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { GameProps } from '../screens/GameRunner'
import { nextProblem, type Problem } from '../lib/problem'
import { sfx } from '../lib/sound'
import { useProgress } from '../store/progress'
import VisualRenderer from '../components/VisualRenderer'
import { skillOf } from '../tutoring/skills'

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
  const [loading, setLoading] = useState(true)
  const recordAnswer = useProgress((s) => s.recordAnswer)
  const recordAttempt = useProgress((s) => s.recordAttempt)

  useEffect(() => {
    let cancel = false
    setLoading(true)
    nextProblem(provider).then((p) => {
      if (!cancel) {
        setProblem(p)
        setAnswered(null)
        setLoading(false)
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
      <div className="flex-1 flex items-center justify-center text-white kid-text text-2xl">
        Loading…
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center p-4 text-white overflow-y-auto">
      <div className="kid-text text-lg mb-2 text-white/80">
        Question {idx + 1} of {questionCount}
      </div>

      <motion.div
        key={problem.id}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="kid-text text-2xl md:text-3xl mb-3 bg-white/20 px-5 py-3 rounded-3xl max-w-2xl text-center"
      >
        {problem.prompt}
      </motion.div>

      <div className="mb-4">
        <VisualRenderer visual={problem.visual} size="md" />
      </div>

      <AnimatePresence>
        <motion.div
          key={problem.id + '-opts'}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="grid grid-cols-2 gap-3 w-full max-w-md"
        >
          {problem.options.map((opt) => {
            const isPicked = answered === opt
            const isAnswer = opt === problem.answer
            const showState = answered !== null
            return (
              <button
                key={String(opt)}
                onClick={() => pick(opt)}
                disabled={answered !== null}
                className={`kid-text text-3xl py-4 rounded-3xl shadow-lg transition border-4 ${
                  showState && isAnswer
                    ? 'bg-correct-500 border-correct-600 text-white'
                    : showState && isPicked
                      ? 'bg-wrong-500 border-wrong-600 text-white'
                      : 'bg-white text-ocean-900 border-white hover:bg-quest-100'
                }`}
              >
                {opt}
              </button>
            )
          })}
        </motion.div>
      </AnimatePresence>

      {answered !== null && answered !== problem.answer && problem.hint && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 bg-quest-200 text-quest-900 px-4 py-2 rounded-2xl kid-text max-w-md text-center"
        >
          💡 {problem.hint}
        </motion.div>
      )}
    </div>
  )
}

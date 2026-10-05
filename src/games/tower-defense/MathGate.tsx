import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { nextProblem, type Problem, type ProblemAnswer, type ProblemProvider } from '../../lib/problem'
import { sfx } from '../../lib/sound'
import { useProgress } from '../../store/progress'
import { skillOf } from '../../tutoring/skills'
import { Card, Button } from '../../components/ui'
import { QuestionPrompt, AnswerGrid } from '../_shared/QuizUI'

/** Mount it when a purchase needs confirming (unmount to close) — it starts fresh each time. */
interface Props {
  title: string
  provider: ProblemProvider
  /** Called for every answer (right or wrong). */
  onAnswer?: (correct: boolean) => void
  onCorrect: () => void
  onCancel: () => void
  meta?: { zoneId: string; stageId: string }
}

export default function MathGate({ title, provider, onAnswer, onCorrect, onCancel, meta }: Props) {
  const [problem, setProblem] = useState<Problem | null>(null)
  const [picked, setPicked] = useState<ProblemAnswer | null>(null)
  const [wrongCount, setWrongCount] = useState(0)
  const recordAnswer = useProgress((s) => s.recordAnswer)
  const recordAttempt = useProgress((s) => s.recordAttempt)
  const reduced = useReducedMotion()

  // first problem for this purchase
  useEffect(() => {
    let cancel = false
    nextProblem(provider).then((p) => {
      if (!cancel) setProblem(p)
    })
    return () => {
      cancel = true
    }
  }, [provider])

  function pick(opt: ProblemAnswer) {
    if (!problem || picked !== null) return
    setPicked(opt)
    const correct = opt === problem.answer
    recordAnswer(correct, problem)
    onAnswer?.(correct)
    if (meta) {
      const sk = skillOf(problem)
      recordAttempt({ zoneId: meta.zoneId, topic: provider.topic, skillId: sk.id, skillLabel: sk.label, correct })
    }
    if (correct) {
      sfx.correct()
      // brief beat so the ✓ reveal is visible before the gate closes
      setTimeout(() => onCorrect(), 450)
    } else {
      sfx.wrong()
      setWrongCount((c) => c + 1)
      // reveal the ✗, then load a fresh problem to retry
      setTimeout(() => {
        nextProblem(provider).then((p) => {
          setProblem(p)
          setPicked(null)
        })
      }, 650)
    }
  }

  if (!problem) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-ink-900/60 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={reduced ? { opacity: 0 } : { scale: 0.7, y: 30, opacity: 0 }}
        animate={reduced ? { opacity: 1 } : { scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 14 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md"
      >
        <Card tone="quest" accent className="p-6">
          <div className="text-center mb-4">
            <div className="kid-text text-xs uppercase tracking-wide text-ink-700">
              Answer correctly to confirm
            </div>
            <div className="kid-text text-lg text-ink-900 mt-0.5">{title}</div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <QuestionPrompt>{problem.prompt}</QuestionPrompt>

            <AnswerGrid
              options={problem.options}
              answer={problem.answer}
              picked={picked}
              onPick={pick}
              disabled={picked !== null}
            />
          </div>

          {wrongCount > 0 && (
            <div className="text-center text-wrong-600 kid-text text-sm mt-3" role="status">
              {wrongCount === 1
                ? 'Try again!'
                : `${wrongCount} tries — you've got this!`}
            </div>
          )}

          <div className="flex justify-center mt-4">
            <Button variant="ghost" size="md" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { nextProblem, type Problem, type ProblemProvider } from '../../lib/problem'
import { sfx } from '../../lib/sound'
import { useProgress } from '../../store/progress'
import { skillOf } from '../../tutoring/skills'

interface Props {
  open: boolean
  title: string
  provider: ProblemProvider
  onCorrect: () => void
  onCancel: () => void
  meta?: { zoneId: string; stageId: string }
}

export default function MathGate({ open, title, provider, onCorrect, onCancel, meta }: Props) {
  const [problem, setProblem] = useState<Problem | null>(null)
  const [shake, setShake] = useState(false)
  const [wrongCount, setWrongCount] = useState(0)
  const recordAnswer = useProgress((s) => s.recordAnswer)
  const recordAttempt = useProgress((s) => s.recordAttempt)

  // refresh problem every time the modal opens
  useEffect(() => {
    if (open) {
      nextProblem(provider).then(setProblem)
      setWrongCount(0)
      setShake(false)
    }
  }, [open, provider])

  function pick(opt: string | number) {
    if (!problem) return
    const correct = opt === problem.answer
    recordAnswer(correct)
    if (meta) {
      const sk = skillOf(problem)
      recordAttempt({ zoneId: meta.zoneId, topic: provider.topic, skillId: sk.id, skillLabel: sk.label, correct })
    }
    if (correct) {
      sfx.correct()
      onCorrect()
    } else {
      sfx.wrong()
      setShake(true)
      setWrongCount((c) => c + 1)
      setTimeout(() => setShake(false), 380)
      setTimeout(() => nextProblem(provider).then(setProblem), 450)
    }
  }

  if (!open || !problem) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.7, y: 30, opacity: 0 }}
        animate={{
          scale: 1,
          y: 0,
          opacity: 1,
          x: shake ? [-12, 12, -8, 8, 0] : 0,
        }}
        transition={{ type: 'spring', damping: 14 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white text-ocean-900 rounded-3xl p-6 max-w-md w-full shadow-2xl"
      >
        <div className="text-center mb-4">
          <div className="kid-text text-sm uppercase tracking-wide text-gray-500">
            Answer correctly to confirm
          </div>
          <div className="kid-text text-xl text-ocean-900">{title}</div>
        </div>

        <div className="kid-text text-4xl md:text-5xl text-center my-4 bg-quest-100 rounded-3xl py-4 px-3">
          {problem.prompt}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          {problem.options.map((opt) => (
            <button
              key={String(opt)}
              onClick={() => pick(opt)}
              className="kid-text text-2xl md:text-3xl py-3 rounded-2xl bg-ocean-500 text-white hover:bg-ocean-700 border-4 border-ocean-700 shadow"
            >
              {opt}
            </button>
          ))}
        </div>

        {wrongCount > 0 && (
          <div className="text-center text-wrong-600 kid-text text-sm">
            {wrongCount === 1
              ? 'Try again!'
              : `${wrongCount} tries — you've got this!`}
          </div>
        )}

        <button
          onClick={onCancel}
          className="w-full mt-2 text-gray-500 hover:text-gray-700 text-sm underline"
        >
          Cancel
        </button>
      </motion.div>
    </div>
  )
}

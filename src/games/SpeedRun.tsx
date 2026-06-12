import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { GameProps } from '../screens/GameRunner'
import { nextProblem, type Problem } from '../lib/problem'
import { sfx } from '../lib/sound'
import { useProgress } from '../store/progress'

export default function SpeedRun({ provider, params, onComplete }: GameProps) {
  const timeLimitSec = (params?.timeLimitSec as number) ?? 60
  const starThresholds = (params?.starThresholds as [number, number, number]) ?? [10, 15, 20]

  const [problem, setProblem] = useState<Problem | null>(null)
  const [timeLeft, setTimeLeft] = useState(timeLimitSec)
  const [correct, setCorrect] = useState(0)
  const [streak, setStreak] = useState(0)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [totalAnswered, setTotalAnswered] = useState(0)
  const startedAt = useRef(Date.now())
  const recordAnswer = useProgress((s) => s.recordAnswer)

  useEffect(() => {
    let cancel = false
    nextProblem(provider).then((p) => {
      if (!cancel) setProblem(p)
    })
    return () => {
      cancel = true
    }
  }, [provider])

  useEffect(() => {
    const tick = setInterval(() => {
      const elapsed = (Date.now() - startedAt.current) / 1000
      const remaining = Math.max(0, timeLimitSec - elapsed)
      setTimeLeft(remaining)
      if (remaining <= 0) clearInterval(tick)
    }, 100)
    return () => clearInterval(tick)
  }, [timeLimitSec])

  useEffect(() => {
    if (timeLeft <= 0) {
      const stars =
        correct >= starThresholds[2]
          ? 3
          : correct >= starThresholds[1]
            ? 2
            : correct >= starThresholds[0]
              ? 1
              : 0
      onComplete({ stars, score: correct, correct, total: totalAnswered })
    }
  }, [timeLeft, correct, totalAnswered, onComplete, starThresholds])

  function pick(opt: string | number) {
    if (!problem || feedback || timeLeft <= 0) return
    const isCorrect = opt === problem.answer
    recordAnswer(isCorrect)
    setTotalAnswered((n) => n + 1)
    if (isCorrect) {
      sfx.correct()
      setCorrect((c) => c + 1)
      setStreak((s) => s + 1)
      setFeedback('correct')
    } else {
      sfx.wrong()
      setStreak(0)
      setFeedback('wrong')
    }
    setTimeout(() => {
      setFeedback(null)
      nextProblem(provider).then((p) => setProblem(p))
    }, 350)
  }

  const pct = (timeLeft / timeLimitSec) * 100

  if (!problem) {
    return (
      <div className="flex-1 flex items-center justify-center text-white kid-text text-2xl">
        Loading…
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 text-white">
      <div className="w-full max-w-md mb-4">
        <div className="flex justify-between kid-text mb-1">
          <span>⏱ {Math.ceil(timeLeft)}s</span>
          <span>✓ {correct}</span>
          {streak >= 3 && <span className="text-quest-300">🔥 {streak} streak!</span>}
        </div>
        <div className="h-3 bg-ocean-900/40 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${
              pct < 25 ? 'bg-wrong-500' : pct < 50 ? 'bg-quest-400' : 'bg-correct-500'
            }`}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      </div>

      {/* Plain keyed motion.div (not AnimatePresence mode="wait") so the new
          question always mounts immediately — see BossBattle for the rationale. */}
      <motion.div
        key={problem.id}
        initial={{ x: 30, opacity: 0 }}
        animate={{
          x: 0,
          opacity: 1,
          scale: feedback === 'wrong' ? [1, 0.95, 1.02, 1] : 1,
        }}
        transition={{ duration: 0.25 }}
        className={`kid-text text-4xl md:text-6xl mb-6 px-6 py-3 rounded-3xl text-center ${
          feedback === 'correct'
            ? 'bg-correct-500'
            : feedback === 'wrong'
              ? 'bg-wrong-500'
              : 'bg-white/20'
        }`}
      >
        {problem.prompt}
      </motion.div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-md">
        {problem.options.map((opt) => (
          <button
            key={String(opt)}
            onClick={() => pick(opt)}
            disabled={feedback !== null}
            className="kid-text text-3xl py-4 rounded-3xl bg-white text-ocean-900 hover:bg-quest-100 shadow-lg border-4 border-white disabled:opacity-50"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

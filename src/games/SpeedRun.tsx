import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { GameProps } from '../screens/GameRunner'
import { nextProblem, type Problem, type ProblemAnswer } from '../lib/problem'
import { sfx } from '../lib/sound'
import { useProgress } from '../store/progress'
import { skillOf } from '../tutoring/skills'
import { ProgressBar, Pill, Loading } from '../components/ui'
import { QuestionPrompt, AnswerGrid } from './_shared/QuizUI'

const DEFAULT_STAR_THRESHOLDS: [number, number, number] = [10, 15, 20]

export default function SpeedRun({ provider, params, onComplete, meta, paused = false }: GameProps) {
  const timeLimitSec = (params?.timeLimitSec as number) ?? 60
  const starThresholds = (params?.starThresholds as [number, number, number] | undefined) ?? DEFAULT_STAR_THRESHOLDS

  const [problem, setProblem] = useState<Problem | null>(null)
  const [timeLeft, setTimeLeft] = useState(timeLimitSec)
  const [correct, setCorrect] = useState(0)
  const [streak, setStreak] = useState(0)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [picked, setPicked] = useState<ProblemAnswer | null>(null)
  const [totalAnswered, setTotalAnswered] = useState(0)
  // Seconds of play banked before the current running stretch (the clock stops
  // while the host's "Quit?" dialog is open).
  const elapsedBefore = useRef(0)
  const recordAnswer = useProgress((s) => s.recordAnswer)
  const recordAttempt = useProgress((s) => s.recordAttempt)
  const reduced = useReducedMotion()

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
    if (paused) return
    const start = Date.now()
    const tick = setInterval(() => {
      const elapsed = elapsedBefore.current + (Date.now() - start) / 1000
      const remaining = Math.max(0, timeLimitSec - elapsed)
      setTimeLeft(remaining)
      if (remaining <= 0) clearInterval(tick)
    }, 100)
    return () => {
      clearInterval(tick)
      elapsedBefore.current += (Date.now() - start) / 1000
    }
  }, [paused, timeLimitSec])

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
    if (!problem || feedback || timeLeft <= 0 || paused) return
    const isCorrect = opt === problem.answer
    recordAnswer(isCorrect)
    if (meta) {
      const sk = skillOf(problem)
      recordAttempt({ zoneId: meta.zoneId, topic: provider.topic, skillId: sk.id, skillLabel: sk.label, correct: isCorrect })
    }
    setTotalAnswered((n) => n + 1)
    setPicked(opt)
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
      setPicked(null)
      nextProblem(provider).then((p) => setProblem(p))
    }, 350)
  }

  const secondsLeft = Math.ceil(timeLeft)
  // Urgency window: last quarter of the clock (and always the final 10s).
  const low = timeLeft <= Math.min(10, timeLimitSec * 0.25)
  const timerTone = low ? 'wrong' : timeLeft <= timeLimitSec * 0.5 ? 'quest' : 'correct'

  if (!problem) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loading label="Get ready…" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      {/* ── Status bar: prominent timer + live score/streak ──────────────── */}
      <div className="w-full max-w-md mb-5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <motion.div
            // Pulse the seconds when time is running low (reduced-motion: static).
            animate={!reduced && low ? { scale: [1, 1.12, 1] } : { scale: 1 }}
            transition={
              !reduced && low
                ? { duration: 0.7, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.2 }
            }
          >
            <Pill tone={timerTone} icon="⏱" className="text-base px-4 py-1 tabular-nums">
              {secondsLeft}s
            </Pill>
          </motion.div>

          <div className="flex items-center gap-2">
            <Pill tone="ocean" icon="✓">
              {correct}
            </Pill>
            {streak >= 3 && (
              <motion.div
                key={streak}
                initial={reduced ? false : { scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 18 }}
              >
                <Pill tone="quest" icon="🔥">
                  {streak}
                </Pill>
              </motion.div>
            )}
          </div>
        </div>

        <ProgressBar
          value={Math.max(0, timeLeft)}
          max={timeLimitSec}
          tone={timerTone}
          className={!reduced && low ? 'animate-pulse' : ''}
        />
      </div>

      {/* Plain keyed wrapper (not AnimatePresence mode="wait") so the new
          question always mounts immediately — see BossBattle for the rationale. */}
      <div key={problem.id} className="w-full flex flex-col items-center gap-5">
        <QuestionPrompt>{problem.prompt}</QuestionPrompt>

        <AnswerGrid
          options={problem.options}
          answer={problem.answer}
          picked={picked}
          onPick={pick}
          disabled={feedback !== null}
        />
      </div>
    </div>
  )
}

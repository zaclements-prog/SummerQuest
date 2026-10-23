import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { nextProblem, type Problem, type ProblemAnswer, type ProblemProvider } from '../../lib/problem'
import { sfx } from '../../lib/sound'
import { useProgress } from '../../store/progress'
import { skillOf } from '../../tutoring/skills'
import { Card, Button } from '../../components/ui'
import { QuestionPrompt, AnswerGrid, QuizSplit } from '../_shared/QuizUI'
import { SHORT_SCREEN, WIDE_SHORT, useMediaQuery } from '../../components/useViewport'
import VisualRenderer from '../../components/VisualRenderer'
import { visualSize } from '../../components/visualSize'

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
  // Question beside the answers on wide, short screens: give the card room for both.
  const wide = useMediaQuery(WIDE_SHORT)
  const short = useMediaQuery(SHORT_SCREEN)
  // 2nd grade multiplies with arrays (2.OA.4), not memorized facts: its gate
  // shows the provider's array under "3 × 4 = ?". Older grades answer the fact.
  const grade = useProgress((s) => s.player?.grade)
  const showArray = grade !== undefined && grade <= 2

  // Escape cancels, like the Cancel button and a tap outside the card. (The host
  // re-renders every frame, so read the latest callback through a ref.)
  const cancelRef = useRef(onCancel)
  useEffect(() => {
    cancelRef.current = onCancel
  }, [onCancel])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
      className="fixed inset-0 z-50 bg-ink-900/45 backdrop-blur-[3px] flex items-center justify-center overflow-y-auto overscroll-contain p-4 pt-[calc(1rem+var(--safe-top,env(safe-area-inset-top,0px)))] pb-[calc(1rem+var(--safe-bottom,env(safe-area-inset-bottom,0px)))] short:pt-[calc(0.5rem+var(--safe-top,env(safe-area-inset-top,0px)))] short:pb-[calc(0.5rem+var(--safe-bottom,env(safe-area-inset-bottom,0px)))]"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <motion.div
        initial={reduced ? { opacity: 0 } : { scale: 0.7, y: 30, opacity: 0 }}
        animate={reduced ? { opacity: 1 } : { scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 14 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full my-auto ${wide ? 'max-w-3xl' : 'max-w-md'}`}
      >
        <Card tone="quest" accent className="p-6 short:p-4 !shadow-pop">
          <div className="text-center mb-4 short:mb-2">
            <div className="kid-text text-sm uppercase tracking-wide text-ink-700">
              Answer correctly to confirm
            </div>
            <div className="kid-text font-bold text-xl text-ink-900 mt-0.5">{title}</div>
          </div>

          <QuizSplit
            gap="gap-4"
            center
            question={
              showArray && problem.visual?.kind === 'array' ? (
                // beside the fact on a phone held sideways, so five rows still fit above the fold
                <div className="w-full flex flex-col short:flex-row items-center gap-3">
                  <div className="w-full short:flex-1 short:min-w-0">
                    <QuestionPrompt>{problem.prompt}</QuestionPrompt>
                  </div>
                  <VisualRenderer visual={{ ...problem.visual, label: '' }} size={visualSize(problem.visual, short, wide)} />
                </div>
              ) : (
                <QuestionPrompt>{problem.prompt}</QuestionPrompt>
              )
            }
            answers={
              <AnswerGrid
                options={problem.options}
                answer={problem.answer}
                picked={picked}
                onPick={pick}
                disabled={picked !== null}
              />
            }
          />

          {wrongCount > 0 && (
            <div className="text-center text-wrong-600 kid-text text-sm mt-3" role="status">
              {wrongCount === 1
                ? 'Try again!'
                : `${wrongCount} tries — you've got this!`}
            </div>
          )}

          <div className="flex justify-center mt-4 short:mt-2">
            <Button variant="ghost" size="md" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}

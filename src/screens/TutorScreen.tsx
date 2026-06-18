import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { ProblemAnswer } from '../lib/problem'
import { getLesson } from '../tutoring/lessons'
import VisualRenderer from '../components/VisualRenderer'
import { useNarration } from '../lib/narration'
import { sfx } from '../lib/sound'
import { Button, Card, BackButton, ProgressBar, Pill, ErrorState, Loading } from '../components/ui'

// ── Narration "Listen" control ────────────────────────────────────────────────
// Kid-sized (≥44px) pill button. Glows + animates while audio is playing.

function ListenButton({
  playing,
  onToggle,
  reduced,
}: {
  playing: boolean
  onToggle: () => void
  reduced: boolean | null
}) {
  return (
    <button
      onClick={onToggle}
      aria-label={playing ? 'Stop narration' : 'Listen to narration'}
      aria-pressed={playing}
      className={[
        'kid-text inline-flex items-center gap-2 flex-shrink-0',
        'min-h-[44px] px-4 rounded-full text-lg',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2',
        playing
          ? 'bg-quest-400 text-quest-900 focus-visible:ring-quest-500'
          : 'bg-ocean-600 text-paper hover:bg-ocean-500 focus-visible:ring-ocean-700',
        playing && !reduced ? 'animate-glow text-quest-500' : '',
      ].join(' ')}
    >
      <span aria-hidden="true" className={playing ? 'text-quest-900' : ''}>
        {playing ? '⏸️' : '🔊'}
      </span>
      <span className={playing ? 'text-quest-900' : ''}>
        {playing ? 'Playing…' : 'Listen'}
      </span>
    </button>
  )
}

// ── Answer choice button ──────────────────────────────────────────────────────
// Solid AA-safe fills. After a pick, the correct answer becomes the focal point
// (correct fill + pop), the wrong pick shakes, and all other options dim.

function ChoiceButton({
  opt,
  isAnswer,
  chosen,
  revealed,
  longLabels,
  reduced,
  onPick,
}: {
  opt: ProblemAnswer
  isAnswer: boolean
  chosen: boolean
  revealed: boolean
  longLabels: boolean
  reduced: boolean | null
  onPick: () => void
}) {
  let state: 'idle' | 'correct' | 'wrong' | 'dim' = 'idle'
  if (revealed) {
    if (isAnswer) state = 'correct'
    else if (chosen) state = 'wrong'
    else state = 'dim'
  }

  const stateClass: Record<typeof state, string> = {
    idle: 'bg-paper text-ink-900 border-ocean-300 hover:bg-ocean-300/30 hover:border-ocean-500',
    correct: 'bg-correct-600 text-white border-correct-700',
    wrong: 'bg-wrong-600 text-white border-wrong-700',
    dim: 'bg-paper/40 text-ink-700/50 border-ink-500/20',
  }

  const anim =
    !reduced && revealed && isAnswer
      ? 'animate-pop'
      : !reduced && revealed && chosen && !isAnswer
        ? 'animate-shake'
        : ''

  return (
    <button
      type="button"
      disabled={revealed}
      onClick={onPick}
      aria-label={isAnswer && revealed ? `${opt} — correct answer` : String(opt)}
      className={[
        'choice kid-text relative justify-center text-center',
        longLabels ? 'text-xl' : 'text-2xl',
        stateClass[state],
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ocean-400 focus-visible:ring-offset-2',
        revealed && state === 'dim' ? 'cursor-default' : '',
        anim,
      ].join(' ')}
    >
      <span>{opt}</span>
      {state === 'correct' && (
        <span className="absolute -top-2 -right-2 text-2xl" aria-hidden="true">
          🎉
        </span>
      )}
    </button>
  )
}

export default function TutorScreen() {
  const { lessonId = '' } = useParams()
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const lesson = getLesson(lessonId)
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<ProblemAnswer | null>(null)
  const step = lesson?.steps[i]
  // Hooks must run unconditionally, so call useNarration before any early return.
  const { playing, play, stop } = useNarration(lesson?.id ?? '', step?.id ?? '', step?.narration ?? '')

  // Lesson with no resolvable step yet → loading shimmer (id matched, content pending).
  if (lesson && !step) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loading label="Opening your lesson…" />
      </div>
    )
  }

  if (!lesson || !step) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <ErrorState
          emoji="🧭"
          title="Lesson not found"
          message="We couldn't find that lesson. Let's head back and pick another one."
          back={{ label: 'Back to Lessons', to: '/tutor' }}
        />
      </div>
    )
  }

  const last = i === lesson.steps.length - 1
  const revealed = picked !== null
  const correctPicked = revealed && step.check && picked === step.check.answer
  // Long option labels (e.g. word answers) read better stacked in one column.
  const longLabels =
    !!step.check &&
    step.check.options.some((o) => String(o).length > 8)

  const next = () => {
    stop()
    setPicked(null)
    if (last) navigate(`/play/${lesson.zoneId}/${lesson.practiceStageId}`)
    else setI(i + 1)
  }

  const goBack = () => {
    stop()
    setPicked(null)
    setI(Math.max(0, i - 1))
  }

  return (
    <div className="flex-1 flex flex-col p-4 text-sky">
      <div className="max-w-2xl w-full mx-auto flex flex-col gap-3">

        {/* ── Nav ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2">
          <BackButton to="/tutor" label="Lessons" onClick={stop} />
          <Pill tone="ocean" icon="📚">
            Step {i + 1} of {lesson.steps.length}
          </Pill>
        </div>

        {/* ── Lesson progress ──────────────────────────────────────────── */}
        <ProgressBar
          value={i + 1}
          max={lesson.steps.length}
          tone="ocean"
          label="Lesson progress"
        />

        {/* ── Title ────────────────────────────────────────────────────── */}
        <div className="text-center">
          <div className="text-5xl" aria-hidden="true">{lesson.emoji}</div>
          <h1 className="kid-text text-3xl sm:text-4xl text-sky drop-shadow-md">
            {lesson.title}
          </h1>
        </div>

        {/* ── Step card ────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -12 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          >
            <Card tone="ocean" className="p-5 sm:p-6">
              {/* narration row */}
              <div className="flex items-start gap-3">
                <ListenButton
                  playing={playing}
                  onToggle={() => (playing ? stop() : play())}
                  reduced={reduced}
                />
                <p className="kid-text text-xl leading-relaxed text-ink-900">
                  {step.narration}
                </p>
              </div>

              {step.visual && (
                <div className="flex justify-center my-4">
                  <VisualRenderer visual={step.visual} size="lg" />
                </div>
              )}

              {step.body && (
                <p className="text-ink-700 text-center text-lg mt-3">{step.body}</p>
              )}

              {/* check / quiz */}
              {step.check && (
                <div className="mt-5">
                  <div className="kid-text text-lg sm:text-xl mb-3 text-ink-900">
                    {step.check.question}
                  </div>
                  <div className={longLabels ? 'grid grid-cols-1 gap-2.5' : 'grid grid-cols-2 gap-2.5'}>
                    {step.check.options.map((opt) => (
                      <ChoiceButton
                        key={String(opt)}
                        opt={opt}
                        isAnswer={opt === step.check!.answer}
                        chosen={picked === opt}
                        revealed={revealed}
                        longLabels={longLabels}
                        reduced={reduced}
                        onPick={() => {
                          setPicked(opt)
                          if (opt === step.check!.answer) sfx.correct()
                          else sfx.wrong()
                        }}
                      />
                    ))}
                  </div>

                  {revealed && (
                    <motion.div
                      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={[
                        'mt-4 rounded-2xl px-4 py-3 kid-text text-base',
                        correctPicked
                          ? 'bg-correct-600/12 text-correct-700'
                          : 'bg-quest-400/20 text-ink-900',
                      ].join(' ')}
                    >
                      <span className="mr-1" aria-hidden="true">
                        {correctPicked ? '✅' : '💡'}
                      </span>
                      {step.check.explain}
                    </motion.div>
                  )}
                </div>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* ── Step nav ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="md"
            className="bg-paper/80"
            disabled={i === 0}
            onClick={goBack}
          >
            ← Back
          </Button>
          <Button
            variant={last ? 'primary' : 'success'}
            size="lg"
            onClick={next}
            disabled={!!step.check && picked === null}
          >
            {last ? '🚀 Now practice' : 'Next →'}
          </Button>
        </div>
      </div>
    </div>
  )
}

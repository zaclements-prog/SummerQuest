import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { ProblemAnswer } from '../lib/problem'
import { getLesson } from '../tutoring/lessons'
import VisualRenderer from '../components/VisualRenderer'
import { useNarration } from '../lib/narration'
import MotionStage from '../tutoring/motion/MotionStage'
import { sceneFor } from '../tutoring/motion/scenes'
import { M } from '../tutoring/motion/palette'
import Caption, { TimeBar } from '../tutoring/ui/Caption'
import CheckPanel from '../tutoring/ui/CheckPanel'
import { useNarrationDone } from '../tutoring/ui/useNarrationDone'
import LessonComplete from '../tutoring/ui/LessonComplete'
import { ArrowLeftIcon, ArrowRightIcon, PauseIcon, PlayIcon, ReplayIcon, SpeakerIcon } from '../tutoring/ui/icons'
import { seededShuffle } from '../lib/random'
import { playableStageId } from '../lib/stageLocks'
import { getZone } from '../curriculum'
import { useProgress } from '../store/progress'
import { useWorldUi } from '../world/useWorldUi'
import { sfx } from '../lib/sound'
import { BackButton, ErrorState, Loading } from '../components/ui'

const INK_RING = `0 0 0 3px ${M.ink}`

// ── Player controls ───────────────────────────────────────────────────────────

function RoundButton({ onClick, label, children, tone = '#ffffff', big = false }: { onClick: () => void; label: string; children: ReactNode; tone?: string; big?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={[
        'grid place-items-center flex-shrink-0 rounded-full',
        big ? 'h-14 w-14' : 'h-12 w-12',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ocean-500 focus-visible:ring-offset-2',
        'hover:-translate-y-0.5 transition-transform',
      ].join(' ')}
      style={{ background: tone, color: M.ink, boxShadow: `${INK_RING}, 0 4px 0 0 rgba(58,44,56,0.3)` }}
    >
      {children}
    </button>
  )
}

/** Step dots: done = mint, current = a wide gold pill, visited ones are clickable. */
function StepDots({ count, current, maxSeen, onJump }: { count: number; current: number; maxSeen: number; onJump: (i: number) => void }) {
  return (
    <div className="flex items-center gap-0.5 sm:gap-2" role="group" aria-label="Lesson steps">
      {Array.from({ length: count }, (_, k) => {
        const isCur = k === current
        const reachable = k <= maxSeen && !isCur
        return (
          <button
            key={k}
            type="button"
            disabled={!reachable}
            onClick={() => onJump(k)}
            aria-label={`Step ${k + 1}${isCur ? ' (current)' : ''}`}
            aria-current={isCur ? 'step' : undefined}
            className="grid h-8 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ocean-500 disabled:cursor-default"
            style={{ width: isCur ? 40 : 24 }}
          >
            <motion.span
              layout
              className="block h-3.5 rounded-full"
              style={{
                width: isCur ? 34 : 14,
                background: isCur ? M.gold : k < current || k <= maxSeen ? '#5fcf8f' : 'rgba(255,255,255,0.75)',
                boxShadow: `0 0 0 2.5px ${M.ink}`,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          </button>
        )
      })}
    </div>
  )
}

/** Stage stand-in for a step that has no motion graphic (yet). */
function StaticStage({ visual, emoji, title }: { visual?: Parameters<typeof VisualRenderer>[0]['visual']; emoji: string; title: string }) {
  if (visual) {
    // VisualRenderer draws on its own cream panel; centre it on the paper stage.
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center p-4" style={{ background: M.paper }}>
        <VisualRenderer visual={visual} size="lg" />
      </div>
    )
  }
  return (
    <div className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2" style={{ background: M.paper }}>
      <div className="text-7xl sm:text-8xl" aria-hidden="true">
        {emoji}
      </div>
      <div className="kid-text text-2xl sm:text-3xl" style={{ color: M.ink }}>
        {title}
      </div>
    </div>
  )
}

export default function TutorScreen() {
  const { lessonId = '' } = useParams()
  const navigate = useNavigate()
  const reduced = !!useReducedMotion()
  const lesson = getLesson(lessonId)
  const [i, setI] = useState(0)
  const [maxSeen, setMaxSeen] = useState(0)
  const [picked, setPicked] = useState<ProblemAnswer | null>(null)
  const [complete, setComplete] = useState(false)
  const step = lesson?.steps[i]
  const zoneProgress = useProgress((s) => (lesson ? s.zones[lesson.zoneId] : undefined))
  // Opened from the Schoolhouse / Library in the 3D World? "Back" returns there.
  const fromWorld = useWorldUi((s) => s.enteredFromWorld)
  // Hooks must run unconditionally, so call useNarration before any early return.
  const { playing, paused, play, pause, resume, stop, replay, clock } = useNarration(lesson?.id ?? '', step?.id ?? '', step?.narration ?? '')
  const scene = lesson && step ? sceneFor(lesson.id, step.id) : undefined
  const topRef = useRef<HTMLDivElement>(null)
  const played = useNarrationDone(clock, `${lesson?.id}/${step?.id}`)

  // New step → bring the stage back into view (the check may have scrolled it away).
  const shownStep = useRef(i)
  useEffect(() => {
    if (shownStep.current === i) return
    shownStep.current = i
    topRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  }, [i, reduced])

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
  // Lessons list the correct answer first; show the options in a stable shuffled
  // order (seeded by lesson + step) so the answer isn't always in the same spot.
  const checkOptions = step.check ? seededShuffle(step.check.options, `${lesson.id}/${step.id}`) : []

  const goTo = (k: number) => {
    stop()
    setPicked(null)
    setI(k)
    setMaxSeen((m) => Math.max(m, k))
  }

  const practice = () => {
    // Practice stage if unlocked; otherwise the first step the kid hasn't cleared.
    const zone = getZone(lesson.zoneId)
    const stageId = zone ? playableStageId(zone, lesson.practiceStageId, zoneProgress) : lesson.practiceStageId
    navigate(`/play/${lesson.zoneId}/${stageId}`)
  }

  const next = () => {
    if (last) {
      stop()
      setPicked(null)
      setComplete(true)
      sfx.fanfare()
    } else goTo(i + 1)
  }

  const goBack = () => goTo(Math.max(0, i - 1))

  const invite = played && !reduced && (!step.check || picked !== null)

  const toggle = () => {
    if (playing) pause()
    else if (paused) resume()
    else void play()
  }
  const toggleLabel = playing ? 'Pause' : paused ? 'Play' : 'Listen'

  return (
    <div className="flex-1 flex flex-col px-3 pb-6 pt-3 sm:px-4" ref={topRef}>
      <div className="mx-auto flex w-full flex-col gap-3" style={{ maxWidth: 'max(600px, min(1040px, calc((100vh - 340px) * 16 / 9)))' }}>
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <BackButton to={fromWorld ? '/world' : '/tutor'} label={fromWorld ? 'World' : 'Lessons'} onClick={stop} />
          <h1 className="kid-text flex min-w-0 flex-1 items-center justify-center gap-2 text-2xl sm:text-3xl text-sky">
            <span aria-hidden="true">{lesson.emoji}</span>
            <span className="truncate">{lesson.title}</span>
          </h1>
          <span className="kid-text flex-shrink-0 rounded-full px-3 py-1.5 text-sm sm:text-base" style={{ background: M.paper, color: M.ink, boxShadow: `0 0 0 2.5px ${M.ink}` }}>
            Step {i + 1} of {lesson.steps.length}
          </span>
        </div>

        {/* ── Player: stage + controls + caption ──────────────────────── */}
        <section aria-label="Lesson player" className="overflow-hidden rounded-[30px]" style={{ background: M.paper, boxShadow: `${INK_RING}, 0 8px 0 0 rgba(58,44,56,0.28), 0 18px 40px -12px rgba(30,40,90,0.45)` }}>
          <motion.div
            key={step.id}
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.035 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reduced ? 0.2 : 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            style={{ borderBottom: `3px solid ${M.ink}` }}
          >
            {scene ? (
              <MotionStage scene={scene} text={step.narration} clock={clock} reduced={reduced} framed={false} />
            ) : (
              <StaticStage visual={step.visual} emoji={lesson.emoji} title={lesson.title} />
            )}
          </motion.div>

          <div className="flex items-center gap-3 px-3 pt-3 sm:px-4">
            <RoundButton onClick={replay} label="Replay">
              <ReplayIcon size={24} />
            </RoundButton>
            <RoundButton onClick={toggle} label={toggleLabel} tone={playing ? M.gold : M.coral} big>
              {playing ? <PauseIcon size={26} /> : paused ? <PlayIcon size={26} /> : <SpeakerIcon size={26} />}
            </RoundButton>
            <TimeBar key={step.id} clock={clock} className="flex-1" />
          </div>

          <div className="px-4 pb-4 pt-3 sm:px-6 sm:pb-5">
            <Caption key={step.id} text={step.narration} clock={clock} className="text-xl sm:text-2xl" />
            {step.body && (
              <p className="kid-text mt-3 inline-block rounded-2xl px-3 py-1.5 text-base sm:text-lg font-medium" style={{ background: '#fdeec9', color: '#5a4a56', boxShadow: `0 0 0 2px rgba(58,44,56,0.18)` }}>
                {step.body}
              </p>
            )}
          </div>
        </section>

        {/* ── Check ─────────────────────────────────────────────────────── */}
        {step.check && (
          <CheckPanel
            key={step.id}
            question={step.check.question}
            options={checkOptions}
            answer={step.check.answer}
            explain={step.check.explain}
            picked={picked}
            reduced={reduced}
            seed={i}
            onPick={(opt) => {
              setPicked(opt)
              if (opt === step.check!.answer) sfx.correct()
              else sfx.wrong()
            }}
          />
        )}

        {/* ── Step nav ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={i === 0}
            onClick={goBack}
            className="kid-text inline-flex min-h-[52px] items-center gap-1.5 rounded-full px-3 sm:px-4 text-lg disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ocean-500"
            style={{ background: 'rgba(255,248,236,0.85)', color: M.ink, boxShadow: `0 0 0 2.5px ${M.ink}` }}
          >
            <ArrowLeftIcon size={20} /> Back
          </button>
          <StepDots count={lesson.steps.length} current={i} maxSeen={maxSeen} onJump={goTo} />
          <motion.button
            type="button"
            onClick={next}
            disabled={!!step.check && picked === null}
            // once the step has played (and any check is answered) the button gently beckons
            animate={invite ? { scale: [1, 1.07, 1] } : { scale: 1 }}
            transition={invite ? { duration: 1.3, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
            className="kid-text inline-flex min-h-[56px] items-center gap-2 rounded-full px-4 sm:px-6 text-lg sm:text-xl whitespace-nowrap transition-opacity disabled:opacity-45 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ocean-500"
            style={{ background: last ? M.coral : '#5fcf8f', color: M.ink, boxShadow: `${INK_RING}, 0 5px 0 0 rgba(58,44,56,0.3)` }}
          >
            {last ? '🚀 Now practice' : 'Next'}
            {!last && <ArrowRightIcon size={22} />}
          </motion.button>
        </div>
      </div>

      {complete && (
        <LessonComplete
          title={lesson.title}
          emoji={lesson.emoji}
          ideas={lesson.steps.length}
          reduced={reduced}
          onPractice={practice}
          onReplay={() => {
            setComplete(false)
            goTo(0)
          }}
        />
      )}
    </div>
  )
}

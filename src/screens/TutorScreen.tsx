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
import { usePetUi } from '../lib/pets/usePetUi'
import { sfx } from '../lib/sound'
import { BackButton, ErrorState, Loading } from '../components/ui'
import { SHORT_SCREEN, WIDE_SHORT, useMediaQuery } from '../components/useViewport'

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
    <div className="flex min-w-0 items-center sm:gap-1" role="group" aria-label="Lesson steps">
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
            // 48px tall and 44px wide where there's room (they shrink on a narrow phone);
            // side by side the dots' hit areas meet, so a finger can't miss
            className={[
              'grid h-12 shrink place-items-center rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ocean-500 disabled:cursor-default',
              isCur ? 'w-11' : 'w-9 sm:w-11',
            ].join(' ')}
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
  const grade = useProgress((s) => s.player?.grade)
  // Opened from the Schoolhouse / Library in the 3D World? "Back" returns there.
  const fromWorld = useWorldUi((s) => s.enteredFromWorld)
  const markLessonDone = useProgress((s) => s.markLessonDone)
  // The lesson-complete card is a calm moment: a pet that just hatched may celebrate over it.
  useEffect(() => {
    if (!complete) return
    usePetUi.getState().setLessonCompleteOpen(true)
    return () => usePetUi.getState().setLessonCompleteOpen(false)
  }, [complete])
  // Hooks must run unconditionally, so call useNarration before any early return.
  const { playing, paused, play, pause, resume, stop, replay, clock } = useNarration(lesson?.id ?? '', step?.id ?? '', step?.narration ?? '')
  const scene = lesson && step ? sceneFor(lesson.id, step.id) : undefined
  const topRef = useRef<HTMLDivElement>(null)
  const played = useNarrationDone(clock, `${lesson?.id}/${step?.id}`)

  // Wide, short screens (a phone held sideways, a wide tablet in landscape): the
  // stage takes the height and the caption sits beside it.
  const side = useMediaQuery(WIDE_SHORT)
  const short = useMediaQuery(SHORT_SCREEN)
  const checkRef = useRef<HTMLDivElement>(null)

  // New step → bring the stage back into view (the check may have scrolled it away).
  const shownStep = useRef(i)
  useEffect(() => {
    if (shownStep.current === i) return
    shownStep.current = i
    topRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  }, [i, reduced])

  // The step has played and its check is still waiting below the fold (phones,
  // tablets): bring the question to the top, so its options clear the nav dock too.
  const waitingCheck = played && !!step?.check && picked === null
  useEffect(() => {
    if (!waitingCheck) return
    checkRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  }, [waitingCheck, reduced])

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
    const stageId = zone ? playableStageId(zone, lesson.practiceStageId, zoneProgress, grade) : lesson.practiceStageId
    navigate(`/play/${lesson.zoneId}/${stageId}`)
  }

  const next = () => {
    if (last) {
      stop()
      setPicked(null)
      setComplete(true)
      // The lesson-complete card is showing: the lesson counts as done (it hatches its zone's pet).
      markLessonDone(lesson.id)
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

  const backTo = fromWorld ? '/world' : '/tutor'
  const backLabel = fromWorld ? 'World' : 'Lessons'
  const stepChip = (
    <span className="kid-text flex-shrink-0 rounded-full px-3 py-1.5 text-sm sm:text-base short:px-2.5 short:text-sm" style={{ background: M.paper, color: M.ink, boxShadow: `0 0 0 2.5px ${M.ink}` }}>
      Step {i + 1} of {lesson.steps.length}
    </span>
  )

  const stage = (
    <motion.div
      key={step.id}
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.035 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduced ? 0.2 : 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      style={side ? undefined : { borderBottom: `3px solid ${M.ink}` }}
    >
      {scene ? (
        <MotionStage scene={scene} text={step.narration} clock={clock} reduced={reduced} framed={false} />
      ) : (
        <StaticStage visual={step.visual} emoji={lesson.emoji} title={lesson.title} />
      )}
    </motion.div>
  )

  const controls = (
    <div className="flex items-center gap-3">
      <RoundButton onClick={replay} label="Replay">
        <ReplayIcon size={24} />
      </RoundButton>
      <RoundButton onClick={toggle} label={toggleLabel} tone={playing ? M.gold : M.coral} big>
        {playing ? <PauseIcon size={26} /> : paused ? <PlayIcon size={26} /> : <SpeakerIcon size={26} />}
      </RoundButton>
      <TimeBar key={step.id} clock={clock} className="flex-1" />
    </div>
  )

  const body = step.body && (
    <p className="kid-text mt-3 inline-block rounded-2xl px-3 py-1.5 text-base sm:text-lg short:mt-2 short:text-base font-medium" style={{ background: '#fdeec9', color: '#5a4a56', boxShadow: `0 0 0 2px rgba(58,44,56,0.18)` }}>
      {step.body}
    </p>
  )

  // ── Step nav: a dock that stays pinned to the bottom of the screen ─────────
  // (clear of the home indicator), so Back / the dots / Next are always in reach.
  const nav = (
    <div className="sticky bottom-[calc(0.5rem+var(--safe-bottom,env(safe-area-inset-bottom,0px)))] z-20 mt-auto pt-1">
      <div
        className="flex items-center justify-between gap-1.5 rounded-[1.75rem] px-1.5 py-1.5 sm:gap-3 sm:px-2"
        style={{ background: 'rgba(255,248,236,0.94)', boxShadow: `${INK_RING}, 0 6px 0 0 rgba(58,44,56,0.22), 0 14px 28px -12px rgba(30,40,90,0.4)`, backdropFilter: 'blur(6px)' }}
      >
        <button
          type="button"
          disabled={i === 0}
          onClick={goBack}
          aria-label="Back"
          className="kid-text inline-flex min-h-[52px] min-w-[52px] flex-shrink-0 items-center justify-center gap-1.5 rounded-full px-3 sm:px-4 text-lg disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ocean-500 short:min-h-12"
          style={{ background: '#ffffff', color: M.ink, boxShadow: `0 0 0 2.5px ${M.ink}` }}
        >
          <ArrowLeftIcon size={20} /> <span className="max-[400px]:sr-only">Back</span>
        </button>
        <StepDots count={lesson.steps.length} current={i} maxSeen={maxSeen} onJump={goTo} />
        <motion.button
          type="button"
          onClick={next}
          disabled={!!step.check && picked === null}
          // once the step has played (and any check is answered) the button gently beckons
          animate={invite ? { scale: [1, 1.07, 1] } : { scale: 1 }}
          transition={invite ? { duration: 1.3, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
          className="kid-text inline-flex min-h-[56px] flex-shrink-0 items-center gap-2 rounded-full px-4 sm:px-6 text-lg sm:text-xl whitespace-nowrap transition-opacity disabled:opacity-45 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ocean-500 short:min-h-12"
          style={{ background: last ? M.coral : '#5fcf8f', color: M.ink, boxShadow: `${INK_RING}, 0 5px 0 0 rgba(58,44,56,0.3)` }}
        >
          {last ? '🚀 Now practice' : 'Next'}
          {!last && <ArrowRightIcon size={22} />}
        </motion.button>
      </div>
    </div>
  )

  const check = step.check && (
    <div ref={checkRef} className="scroll-mt-4 scroll-mb-28">
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
    </div>
  )

  const playerFrame = { background: M.paper, boxShadow: `${INK_RING}, 0 8px 0 0 rgba(58,44,56,0.28), 0 18px 40px -12px rgba(30,40,90,0.45)` }

  return (
    <div className="flex-1 flex flex-col px-3 pb-2 pt-3 sm:px-4 short:pt-2" ref={topRef}>
      {side ? (
        // ── Wide & short: stage on the left at full height, the caption +
        //    controls beside it, the nav dock underneath. ─────────────────────
        <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-2">
          <h1 className="sr-only">{lesson.title}</h1>
          {/* (a tablet has height to spare under the 16:9 stage: the row sits in the middle) */}
          <div className="flex items-stretch gap-3 roomy:my-auto">
            <section
              aria-label="Lesson player"
              className="flex-shrink-0 overflow-hidden rounded-[24px]"
              // as tall as the screen allows (top bar + dock under it), never over 62% of the width
              style={{ ...playerFrame, width: 'min(62vw, calc((100dvh - 150px) * 16 / 9))' }}
            >
              {stage}
            </section>
            <div className="relative min-w-0 flex-1">
              <div className="absolute inset-0 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <BackButton to={backTo} label={backLabel} onClick={stop} />
                  {stepChip}
                </div>
                {controls}
                <div data-caption-scroll className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-2xl px-3 py-2" style={{ background: 'rgba(255,248,236,0.9)', boxShadow: `0 0 0 2.5px ${M.ink}` }}>
                  <Caption key={step.id} text={step.narration} clock={clock} follow className={short ? 'text-base' : 'text-lg sm:text-xl'} />
                  {body}
                </div>
              </div>
            </div>
          </div>
          {check}
          {nav}
        </div>
      ) : (
        <div
          className="mx-auto flex w-full flex-1 flex-col gap-3"
          // The stage (16:9) shrinks on shorter screens so the stage, its controls
          // and the first caption lines fit above the nav dock.
          style={{ maxWidth: 'min(1040px, max(min(100%, 560px), calc((100dvh - 430px) * 16 / 9)))' }}
        >
          {/* ── Header ───────────────────────────────────────────────────── */}
          <div className="flex items-center gap-2">
            <BackButton to={backTo} label={backLabel} onClick={stop} />
            <h1 className="kid-text flex min-w-0 flex-1 items-center justify-center gap-2 text-xl min-[400px]:text-2xl sm:text-3xl text-sky">
              <span aria-hidden="true">{lesson.emoji}</span>
              <span className="truncate">{lesson.title}</span>
            </h1>
            {stepChip}
          </div>

          {/* ── Player: stage + controls + caption ──────────────────────── */}
          <section aria-label="Lesson player" className="overflow-hidden rounded-[30px] roomy:my-auto" style={playerFrame}>
            {stage}
            <div className="px-3 pt-3 sm:px-4">{controls}</div>
            <div className="px-4 pb-4 pt-3 sm:px-6 sm:pb-5">
              <Caption key={step.id} text={step.narration} clock={clock} className="text-xl sm:text-2xl" />
              {body}
            </div>
          </section>

          {/* ── Check ─────────────────────────────────────────────────────── */}
          {check}

          {nav}
        </div>
      )}

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

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { guide } from '../../guide/store'
import { SayAgainButton } from '../../guide/SayAgainButton'
import { ToonStar } from '../../components/ui'
import { useMediaQuery } from '../../components/useViewport'
import { useNarration } from '../../lib/narration'
import { seededShuffle } from '../../lib/random'
import { sfx } from '../../lib/sound'
import { usePetUi } from '../../lib/pets/usePetUi'
import { useProgress } from '../../store/progress'
import { useWorldUi } from '../../world/useWorldUi'
import { narrationPace } from '../lessons'
import { practiceHref } from '../lessonLinks'
import MotionStage from '../motion/MotionStage'
import { M } from '../motion/palette'
import { sceneFor } from '../motion/scenes'
import type { Lesson } from '../types'
import Caption from './Caption'
import LessonComplete from './LessonComplete'
import ListenCheck from './ListenCheck'
import { LESSON_NEXT, LESSON_STAGE, checkCards } from './listenScript'
import { useNarrationDone } from './useNarrationDone'

/** Sideways enough for stage-beside-cards (a tablet held sideways, a laptop). */
const SIDEWAYS = '(min-aspect-ratio: 5/4)'
/** The grown-up's "show the words" choice (this device only). */
const CAPTIONS_KEY = 'sq-listen-captions'

function readCaptions(): boolean {
  try {
    return localStorage.getItem(CAPTIONS_KEY) === '1'
  } catch {
    return false
  }
}

function writeCaptions(on: boolean) {
  try {
    localStorage.setItem(CAPTIONS_KEY, on ? '1' : '0')
  } catch {
    // private window / blocked storage: the choice just isn't remembered
  }
}

const ROUND = [
  'grid place-items-center shrink-0 rounded-full border-[3px] border-line shadow-ledge',
  'transition-[translate,box-shadow,background-color,opacity] duration-100 active:translate-y-[3px] active:shadow-ledge-sm',
  'outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70 focus-visible:ring-offset-2',
  'disabled:opacity-45 disabled:active:translate-y-0 disabled:active:shadow-ledge',
].join(' ')

function RoundIcon({ label, onClick, className, guideId, children, disabled }: { label: string; onClick: () => void; className: string; guideId?: string; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-guide={guideId}
      disabled={disabled}
      onClick={() => {
        sfx.click()
        onClick()
      }}
      className={`${ROUND} ${className}`}
    >
      {children}
    </button>
  )
}

const PlayGlyph = () => (
  <svg viewBox="0 0 48 48" className="h-[56%] w-[56%] translate-x-[6%]" aria-hidden="true">
    <path d="M15 9.5v29a2 2 0 0 0 3 1.7l23-14.5a2 2 0 0 0 0-3.4L18 7.8a2 2 0 0 0-3 1.7z" fill="#fffaf0" stroke="#3a2c38" strokeWidth="3.5" strokeLinejoin="round" />
  </svg>
)

const ReplayGlyph = () => (
  <svg viewBox="0 0 48 48" className="h-[58%] w-[58%]" aria-hidden="true">
    <path d="M36 25a12 12 0 1 1-4.2-9.1" fill="none" stroke="#3a2c38" strokeWidth="5.5" strokeLinecap="round" />
    <path d="M30 8.5l3.2 8.6-8.8 1.7z" fill="#3a2c38" stroke="#3a2c38" strokeWidth="3" strokeLinejoin="round" />
  </svg>
)

const HomeGlyph = () => (
  <svg viewBox="0 0 48 48" className="h-[56%] w-[56%]" aria-hidden="true">
    <path d="M29 11 16 24l13 13" fill="none" stroke="#3a2c38" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** Speech-bubble lines: the grown-up's "show the words" switch. */
const WordsGlyph = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 48 48" className="h-[60%] w-[60%]" aria-hidden="true">
    <path d="M9 11h30a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H22l-8 7v-7H9a4 4 0 0 1-4-4V15a4 4 0 0 1 4-4z" fill={on ? '#fffaf0' : 'none'} stroke="#3a2c38" strokeWidth="3.4" strokeLinejoin="round" />
    <path d="M13 19h22M13 25h14" stroke="#3a2c38" strokeWidth="3.4" strokeLinecap="round" opacity={on ? 1 : 0.55} />
  </svg>
)

/** Step dots without numbers: done ones are stars, the current one a gold pill. */
function StepStars({ count, current, maxSeen, onJump, vertical }: { count: number; current: number; maxSeen: number; onJump: (i: number) => void; vertical: boolean }) {
  return (
    <div className={`flex items-center justify-center gap-1 ${vertical ? 'flex-col' : ''}`} role="group" aria-label="Lesson steps">
      {Array.from({ length: count }, (_, k) => {
        const isCur = k === current
        const reachable = k <= maxSeen && !isCur
        return (
          <button
            key={k}
            type="button"
            disabled={!reachable}
            onClick={() => onJump(k)}
            aria-label={`Step ${k + 1}${isCur ? ' (now)' : ''}`}
            aria-current={isCur ? 'step' : undefined}
            className="grid h-11 w-11 place-items-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70 disabled:cursor-default"
          >
            {k < current || (k <= maxSeen && !isCur) ? (
              <ToonStar filled px={30} />
            ) : (
              <span
                className={`block rounded-full border-[3px] border-line ${isCur ? 'lp-progress-dot h-6 w-6 bg-quest-300' : 'h-4 w-4 bg-paper/80'}`}
                data-now={isCur ? '' : undefined}
                aria-hidden="true"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

interface CheckState {
  tried: number[]
  solved: boolean
}

/**
 * The biggest 16:9 stage that fits the box it sits in (measured: the box is
 * sized by the layout, never by the stage). Null until measured (and where
 * there's no ResizeObserver): the stage then just takes the box's width.
 */
function useStageFit(): [(el: HTMLDivElement | null) => void, { w: number; h: number } | null] {
  const [box, setBox] = useState<HTMLDivElement | null>(null)
  const [fit, setFit] = useState<{ w: number; h: number } | null>(null)
  useEffect(() => {
    if (!box || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      const w = Math.floor(Math.max(160, Math.min(width, (height * 16) / 9)))
      setFit((f) => (f && f.w === w ? f : { w, h: Math.round((w * 9) / 16) }))
    })
    ro.observe(box)
    return () => ro.disconnect()
  }, [box])
  return [setBox, fit]
}

/**
 * The lesson player for the voice-first grades (K–1, or any `k1` lesson):
 * nothing to read. The stage tells the step in pictures while the narrator
 * speaks it; then, on a "your turn" step, picture cards slide in and the
 * narrator asks (ListenCheck). 🔊 says it again, ↺ watches the step again, the
 * big ▶ goes on (once the answer is found), and the end card has only stars,
 * ↺ and ▶. The words are there for a grown-up who wants them (the speech
 * bubble switch); grades 2–5 keep the reading player (TutorScreen).
 */
export default function ListenLesson({ lesson }: { lesson: Lesson }) {
  const navigate = useNavigate()
  const reduced = !!useReducedMotion()
  const sideways = useMediaQuery(SIDEWAYS)
  const [i, setI] = useState(0)
  const [maxSeen, setMaxSeen] = useState(0)
  const [checks, setChecks] = useState<Record<string, CheckState>>({})
  const [complete, setComplete] = useState(false)
  const [captions, setCaptions] = useState(readCaptions)
  const [fitRef, fit] = useStageFit()
  const step = lesson.steps[i]
  const grade = useProgress((s) => s.player?.grade)
  const zoneProgress = useProgress((s) => s.zones[lesson.zoneId])
  const markLessonDone = useProgress((s) => s.markLessonDone)
  const fromWorld = useWorldUi((s) => s.enteredFromWorld)

  // The lesson-complete card is a calm moment: a pet that just hatched may celebrate over it.
  useEffect(() => {
    if (!complete) return
    usePetUi.getState().setLessonCompleteOpen(true)
    return () => usePetUi.getState().setLessonCompleteOpen(false)
  }, [complete])

  const { playing, stop, replay, clock } = useNarration(lesson.id, step.id, step.narration, { pace: narrationPace(lesson) })
  const scene = sceneFor(lesson.id, step.id)
  const played = useNarrationDone(clock, `${lesson.id}/${step.id}`)
  const check = step.check
  const cs: CheckState = checks[step.id] ?? { tried: [], solved: false }
  // the check comes in once the step has been told (and stays once answered)
  const showCheck = !!check && (played || cs.solved)
  const canGoOn = !check || cs.solved
  // Lessons list the correct answer first: a stable shuffle (by lesson + step) moves it around.
  const cards = useMemo(() => (check ? seededShuffle(checkCards(check), `${lesson.id}/${step.id}`) : []), [check, lesson.id, step.id])

  // A step without a check, told: the hand shows the way on (silently, no dimming).
  useEffect(() => {
    if (!played || check || complete) return
    void guide.show({ voice: null, target: LESSON_NEXT, hand: 'tap', dim: false, pad: 10 }, { repeatable: false })
    return () => guide.clear()
  }, [played, check, complete])

  // leaving the lesson: stop talking and pointing
  useEffect(() => () => guide.clear({ forget: true }), [])

  const last = i === lesson.steps.length - 1
  const goTo = (k: number) => {
    stop()
    guide.clear({ forget: true })
    setI(k)
    setMaxSeen((m) => Math.max(m, k))
  }
  const next = () => {
    if (!canGoOn) return
    if (last) {
      stop()
      guide.clear({ forget: true })
      setComplete(true)
      // the lesson counts as done (it hatches its zone's pet)
      markLessonDone(lesson.id)
      sfx.fanfare()
    } else goTo(i + 1)
  }
  const watchAgain = () => {
    guide.clear({ forget: true })
    replay()
  }
  // 🔊: the question while it waits for an answer, otherwise the step's own words
  const sayAgain = () => {
    if (showCheck && !cs.solved) void guide.replay()
    else watchAgain()
  }
  const setCheck = (patch: (c: CheckState) => CheckState) => setChecks((all) => ({ ...all, [step.id]: patch(all[step.id] ?? { tried: [], solved: false }) }))
  const toggleCaptions = () => {
    setCaptions((on) => {
      writeCaptions(!on)
      return !on
    })
  }
  const exitTo = fromWorld ? '/world' : '/tutor'

  const invite = played && canGoOn && !reduced

  const stage = (
    <section
      aria-label="Lesson picture"
      data-guide={LESSON_STAGE}
      className="aspect-video w-full overflow-hidden rounded-[24px]"
      style={{ width: fit?.w, background: M.paper, boxShadow: `0 0 0 3px ${M.ink}, 0 7px 0 0 rgba(58,44,56,0.28), 0 16px 34px -14px rgba(30,40,90,0.45)` }}
    >
      <motion.div key={step.id} initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.035 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: reduced ? 0.2 : 0.5, ease: [0.2, 0.8, 0.2, 1] }}>
        {scene ? (
          <MotionStage scene={scene} text={step.narration} clock={clock} reduced={reduced} framed={false} />
        ) : (
          <div className="grid aspect-video w-full place-items-center text-8xl" aria-hidden="true">
            {lesson.emoji}
          </div>
        )}
      </motion.div>
    </section>
  )

  // (the stage sits on top of its box, so it can never size the box)
  const stageBox = (
    <div ref={fitRef} className="relative min-h-0 min-w-0 flex-1">
      <div className="absolute inset-0 grid place-items-center">{stage}</div>
    </div>
  )

  const caption = captions && (
    <div data-lesson-caption="" className="shrink-0 rounded-2xl bg-paper/90 px-4 py-2 border-[2.5px] border-line">
      <Caption key={step.id} text={step.narration} clock={clock} className="text-lg sm:text-xl" />
    </div>
  )

  const checkPanel = (layout: 'row' | 'column') =>
    check &&
    showCheck && (
      <motion.div
        key={`check-${step.id}`}
        // (sideways: stretched to the row's height, the cards share it in thirds)
        className={layout === 'column' ? 'flex w-[clamp(112px,17vw,200px)] shrink-0 flex-col' : 'shrink-0'}
        initial={reduced ? { opacity: 0 } : layout === 'column' ? { opacity: 0, x: 40 } : { opacity: 0, y: 30 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 24 }}
      >
        <ListenCheck
          check={check}
          cards={cards}
          tried={cs.tried}
          solved={cs.solved}
          praise={i}
          layout={layout}
          onTry={(card) => setCheck((c) => ({ ...c, tried: c.tried.includes(card) ? c.tried : [...c.tried, card] }))}
          onSolve={() => setCheck((c) => ({ ...c, solved: true }))}
        />
      </motion.div>
    )

  const exitBtn = (
    <RoundIcon
      label={fromWorld ? 'Back to the World' : 'Back to the lessons'}
      onClick={() => {
        stop()
        navigate(exitTo)
      }}
      className="h-14 w-14 bg-paper hover:bg-white short:h-12 short:w-12"
    >
      <HomeGlyph />
    </RoundIcon>
  )
  const wordsBtn = (
    <RoundIcon label={captions ? 'Hide the words' : 'Show the words'} onClick={toggleCaptions} className={`h-12 w-12 ${captions ? 'bg-quest-200' : 'bg-paper/80'} hover:bg-white`}>
      <WordsGlyph on={captions} />
    </RoundIcon>
  )
  const sayBtn = <SayAgainButton onPress={sayAgain} speaking={playing} />
  const replayBtn = (
    <RoundIcon label="Watch again" onClick={watchAgain} guideId="lesson-replay" className="h-20 w-20 bg-ocean-300 hover:bg-ocean-200 short:h-16 short:w-16">
      <ReplayGlyph />
    </RoundIcon>
  )
  const nextBtn = (
    <motion.div animate={invite ? { scale: [1, 1.08, 1] } : { scale: 1 }} transition={invite ? { duration: 1.3, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}>
      <RoundIcon label={last ? 'Finish' : 'Next'} onClick={next} disabled={!canGoOn} guideId={LESSON_NEXT} className="h-28 w-28 bg-correct-400 hover:bg-correct-300 short:h-24 short:w-24">
        <PlayGlyph />
      </RoundIcon>
    </motion.div>
  )
  const dots = <StepStars count={lesson.steps.length} current={i} maxSeen={maxSeen} onJump={goTo} vertical={sideways} />

  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2 sm:px-4" data-listen-lesson="">
      <h1 className="sr-only">{lesson.title}</h1>
      {sideways ? (
        // ── sideways: [exit · 🔊 · dots] [stage (+ words)] [cards] [↺ · ▶] ──
        <div className="flex min-h-0 flex-1 items-stretch gap-3 short:gap-2">
          <div className="flex shrink-0 flex-col items-center gap-3 short:gap-2">
            {exitBtn}
            {sayBtn}
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center">{dots}</div>
            {wordsBtn}
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
            {stageBox}
            {caption}
          </div>
          {checkPanel('column')}
          {/* (↺ up top: the guide's hand comes down onto ▶ from above) */}
          <div className="flex shrink-0 flex-col items-center justify-between gap-4 pb-1 pt-1 short:gap-3">
            {replayBtn}
            {nextBtn}
          </div>
        </div>
      ) : (
        // ── upright: [exit · 🔊 · dots · words] / stage / (words) / cards / [↺ … ▶] ──
        <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-3">
          <div className="flex shrink-0 items-center gap-3">
            {exitBtn}
            {sayBtn}
            <div className="min-w-0 flex-1">{dots}</div>
            {wordsBtn}
          </div>
          {stageBox}
          {caption}
          {checkPanel('row')}
          <div className="flex shrink-0 items-center justify-between px-1">
            {replayBtn}
            {nextBtn}
          </div>
        </div>
      )}

      {complete && (
        <LessonComplete
          listen
          title={lesson.title}
          emoji={lesson.emoji}
          ideas={lesson.steps.length}
          reduced={reduced}
          onPractice={() => navigate(practiceHref(lesson, zoneProgress, grade))}
          onReplay={() => {
            setComplete(false)
            setChecks({})
            goTo(0)
          }}
        />
      )}
    </div>
  )
}

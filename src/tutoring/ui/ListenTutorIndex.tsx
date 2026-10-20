import { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { guide } from '../../guide/store'
import { SayAgainButton } from '../../guide/SayAgainButton'
import { useIdleReprompt } from '../../guide/useIdleReprompt'
import { ToonStar } from '../../components/ui'
import { getStage } from '../../curriculum'
import { sfx } from '../../lib/sound'
import { useProgress } from '../../store/progress'
import { lessonsFor } from '../lessons'
import { kLine } from '../lessons/k1Voice'
import { M } from '../motion/palette'
import LessonPoster from './LessonPoster'

/** Guide id of lesson card i. */
const lessonPick = (i: number) => `lesson-pick-${i}`

/**
 * The lesson picker for the voice-first grades: one big picture per lesson,
 * its practice stars and a ▶, and not one word. The narrator says "Pick a
 * lesson to watch. Tap a picture!" while a hand glides over the pictures; 🔊
 * says it again.
 */
export default function ListenTutorIndex() {
  const navigate = useNavigate()
  const reduced = !!useReducedMotion()
  const grade = useProgress((s) => s.player?.grade)
  const zones = useProgress((s) => s.zones)
  const lessons = useMemo(() => lessonsFor(grade), [grade])

  useEffect(() => {
    const ids = lessons.map((_, i) => lessonPick(i))
    const t = setTimeout(() => void guide.show({ voice: kLine('pickLesson'), target: ids, cue: 'Tap', hand: 'sweep', pad: 10 }), 500)
    return () => {
      clearTimeout(t)
      guide.clear({ forget: true })
    }
  }, [lessons])
  useIdleReprompt({ key: 'pick-lesson' })

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-4 pt-2 sm:px-4" data-listen-index="">
      <h1 className="sr-only">Lessons</h1>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          aria-label="Back to the World"
          title="Back to the World"
          onClick={() => {
            sfx.click()
            navigate('/world')
          }}
          className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-[3px] border-line bg-paper shadow-ledge outline-none hover:bg-white focus-visible:ring-4 focus-visible:ring-ocean-600/70 active:translate-y-[3px] active:shadow-ledge-sm"
        >
          <svg viewBox="0 0 48 48" className="h-[56%] w-[56%]" aria-hidden="true">
            <path d="M29 11 16 24l13 13" fill="none" stroke="#3a2c38" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <SayAgainButton />
      </div>
      <div className="mx-auto grid w-full max-w-xs flex-1 content-center gap-4 landscape:max-w-5xl landscape:grid-cols-3 landscape:gap-5">
        {lessons.map((l, i) => {
          const stars = zones[l.zoneId]?.stages[l.practiceStageId]?.stars ?? 0
          const max = getStage(l.zoneId, l.practiceStageId, grade)?.starsToEarn ?? 3
          return (
            <motion.div
              key={l.id}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 240, damping: 20, delay: reduced ? 0 : 0.08 * i }}
              whileHover={reduced ? undefined : { y: -5 }}
              whileTap={{ scale: 0.96 }}
            >
              <Link
                to={`/tutor/${l.id}`}
                data-guide={lessonPick(i)}
                onClick={() => sfx.enter()}
                aria-label={`${l.title}: ${stars} of ${max} stars`}
                className="block overflow-hidden rounded-[28px] outline-none focus-visible:ring-4 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
                style={{ background: M.paper, boxShadow: `0 0 0 3px ${M.ink}, 0 7px 0 0 rgba(58,44,56,0.28)` }}
              >
                <div style={{ borderBottom: `3px solid ${M.ink}` }}>
                  <LessonPoster id={l.id} emoji={l.emoji} reduced={reduced} done={max > 0 && stars >= max} />
                </div>
                <div className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <span className="flex items-end gap-0.5" aria-hidden="true">
                    {Array.from({ length: max }, (_, k) => (
                      <ToonStar key={k} filled={k < stars} px={k === 1 ? 34 : 28} />
                    ))}
                  </span>
                  <span className="grid h-14 w-14 place-items-center rounded-full border-[3px] border-line bg-correct-400 shadow-ledge-sm" aria-hidden="true">
                    <svg viewBox="0 0 48 48" className="h-[56%] w-[56%] translate-x-[6%]">
                      <path d="M15 9.5v29a2 2 0 0 0 3 1.7l23-14.5a2 2 0 0 0 0-3.4L18 7.8a2 2 0 0 0-3 1.7z" fill="#fffaf0" stroke="#3a2c38" strokeWidth="3.5" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

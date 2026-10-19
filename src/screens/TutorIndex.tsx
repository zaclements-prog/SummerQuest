import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { allLessons } from '../tutoring/lessons'
import { useProgress } from '../store/progress'
import { weeklyFocus } from '../lib/analytics'
import { getStage, getZone } from '../curriculum'
import { sfx } from '../lib/sound'
import type { Subject } from '../lib/theme'
import { useEntrance } from '../lib/motion'
import { BackButton, StarRating, EmptyState } from '../components/ui'
import { M } from '../tutoring/motion/palette'
import { slicePath } from '../tutoring/motion/anim'
import { starPath } from '../tutoring/motion/layout'
import { Apple, UnitCube, Rod } from '../tutoring/motion/shapes'
import { DEFAULT_CHARS_PER_SEC } from '../tutoring/motion/cues'
import LessonPoster from '../tutoring/ui/LessonPoster'

// ── Per-lesson progress derivation ─────────────────────────────────────────────

interface LessonView {
  id: string
  title: string
  emoji: string
  intro: string
  zoneId: string
  zoneTitle: string
  subject: Subject
  recommended: boolean
  /** Stars earned on the lesson's practice stage (0–3). */
  stars: number
  /** Max stars the practice stage can award (usually 3). */
  maxStars: number
  /** Whether the learner has practiced this lesson at all. */
  started: boolean
  steps: number
  /** Rough watch time in minutes (narration at a kid-friendly pace). */
  minutes: number
}

/** Section a lesson is listed under on the Tutor index. */
const NON_MATH_AREAS: Record<string, string> = {
  'reading-reef': 'Reading & Writing',
  'writing-workshop': 'Reading & Writing',
  'science-summit': 'Science',
}
const areaOf = (zoneId: string) => NON_MATH_AREAS[zoneId] ?? 'Math'
const AREA_COLOR: Record<string, string> = { Math: M.coral, 'Reading & Writing': '#8ab8ff', Science: '#7fd36b' }

/** A lesson is "done" when it has earned its full star allotment. */
function isComplete(v: LessonView): boolean {
  return v.maxStars > 0 && v.stars >= v.maxStars
}

const INK = `0 0 0 3px ${M.ink}`

export default function TutorIndex() {
  const attempts = useProgress((s) => s.attempts)
  const sessions = useProgress((s) => s.sessions)
  // Subscribe to zones so progress badges re-render when stars are earned.
  const zonesProgress = useProgress((s) => s.zones)
  const grade = useProgress((s) => s.player?.grade)
  const reduced = !!useReducedMotion()

  const recommended = useMemo(
    () => new Set(weeklyFocus(attempts, sessions).map((f) => f.lessonId)),
    [attempts, sessions],
  )

  // Build a view-model per lesson, then group by subject area.
  const groups = useMemo(() => {
    const views: LessonView[] = allLessons.map((l) => {
      const zone = getZone(l.zoneId)
      const subject = (zone?.themeColor ?? 'quest') as Subject
      const zoneProg = zonesProgress[l.zoneId]
      const stageRec = zoneProg?.stages[l.practiceStageId]
      const stars = stageRec?.stars ?? 0
      // Total stars a lesson can show is its practice stage's allotment (fallback 3),
      // looked up in the zone's stage set for the child's grade.
      const maxStars = getStage(l.zoneId, l.practiceStageId, grade)?.starsToEarn ?? 3
      const started = (stageRec?.attempts ?? 0) > 0 || stars > 0
      const chars = l.steps.reduce((n, s) => n + s.narration.length, 0)
      return {
        id: l.id,
        title: l.title,
        emoji: l.emoji,
        intro: l.intro,
        zoneId: l.zoneId,
        zoneTitle: zone?.title ?? 'More to learn',
        subject,
        recommended: recommended.has(l.id),
        stars,
        maxStars,
        started,
        steps: l.steps.length,
        minutes: Math.max(1, Math.round(chars / DEFAULT_CHARS_PER_SEC / 60 + l.steps.length * 0.15)),
      }
    })

    // Group by subject area (Math / Reading & Writing / Science), preserving
    // first-seen order. (Grouping by island theme colour mixed subjects under the
    // wrong zone title, e.g. Division under "Multiplication Mesa".)
    const order: string[] = []
    const byArea = new Map<string, LessonView[]>()
    for (const v of views) {
      const area = areaOf(v.zoneId)
      if (!byArea.has(area)) {
        byArea.set(area, [])
        order.push(area)
      }
      byArea.get(area)!.push(v)
    }

    // Within each group, sort Recommended lessons to the top (stable otherwise).
    for (const list of byArea.values()) {
      list.sort((a, b) => Number(b.recommended) - Number(a.recommended))
    }

    return order.map((area) => ({
      area,
      lessons: byArea.get(area)!,
    }))
  }, [zonesProgress, recommended, grade])

  const totalLessons = allLessons.length
  const doneCount = useMemo(
    () =>
      groups.reduce(
        (n, g) => n + g.lessons.filter((l) => isComplete(l)).length,
        0,
      ),
    [groups],
  )

  const { container, item } = useEntrance()

  return (
    <div className="flex-1 flex flex-col px-3 pb-8 pt-3 sm:px-4">
      <div className="max-w-5xl w-full mx-auto flex flex-col gap-5">
        <div>
          <BackButton to="/world" label="World" />
        </div>

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <Hero doneCount={doneCount} total={totalLessons} reduced={reduced} />

        {/* ── Lesson groups ──────────────────────────────────────────────── */}
        {totalLessons === 0 ? (
          <EmptyState
            emoji="📚"
            title="No lessons yet"
            message="New tutor lessons are on their way — check back soon!"
            cta={{ label: 'Back to the World', to: '/world' }}
          />
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-7"
          >
            {groups.map((group) => (
              <motion.section
                key={group.area}
                variants={item}
                aria-label={group.area}
                className="flex flex-col gap-3"
              >
                {/* section header */}
                <div className="flex items-center gap-3">
                  <h2
                    className="kid-text rounded-full px-4 py-1 text-lg sm:text-xl"
                    style={{ background: M.paper, color: M.ink, boxShadow: `0 0 0 2.5px ${M.ink}, 0 4px 0 0 rgba(58,44,56,0.25)` }}
                  >
                    <span className="mr-2 inline-block h-3 w-3 rounded-full align-middle" style={{ background: AREA_COLOR[group.area] ?? M.gold, boxShadow: `0 0 0 2px ${M.ink}` }} aria-hidden="true" />
                    {group.area}
                  </h2>
                  <span className="kid-text text-sm text-sky">
                    {group.lessons.length} {group.lessons.length === 1 ? 'lesson' : 'lessons'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.lessons.map((l) => (
                    <LessonCard key={l.id} lesson={l} variant={item} reduced={reduced} />
                  ))}
                </div>
              </motion.section>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ── Hero banner ─────────────────────────────────────────────────────────────────

function Hero({ doneCount, total, reduced }: { doneCount: number; total: number; reduced: boolean }) {
  const float = (d: number, delay = 0) =>
    reduced ? undefined : { animate: { y: [0, -d, 0], rotate: [0, d / 3, 0] }, transition: { duration: 3 + delay, repeat: Infinity, ease: 'easeInOut' as const, delay } }
  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      className="relative overflow-hidden rounded-[30px]"
      style={{ background: M.paper, boxShadow: `${INK}, 0 8px 0 0 rgba(58,44,56,0.28), 0 18px 40px -14px rgba(30,40,90,0.45)` }}
    >
      <div className="relative z-10 flex flex-col gap-2 p-5 sm:p-7 sm:pr-[42%]">
        <h1 className="kid-text text-4xl sm:text-5xl leading-none" style={{ color: M.ink }}>
          <span aria-hidden="true">📚 </span>Tutor
        </h1>
        <p className="kid-text text-lg sm:text-xl font-medium" style={{ color: '#5a4a56' }}>
          Pick a topic to learn — listen and watch!
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="kid-text inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-base" style={{ background: '#dcf7e8', color: M.ink, boxShadow: `0 0 0 2.5px ${M.ink}` }}>
            <span aria-hidden="true">✅</span>
            {doneCount}/{total} lessons mastered
          </span>
        </div>
      </div>
      {/* floating maths friends */}
      <svg viewBox="0 0 400 220" className="pointer-events-none absolute right-0 top-0 hidden h-full sm:block" style={{ width: '44%' }} aria-hidden="true">
        <circle cx={250} cy={110} r={110} fill="#ffe7c2" />
        <circle cx={250} cy={110} r={70} fill="#fff3dc" />
        <motion.g {...float(8)}>
          <path d={slicePath(170, 88, 54, 0.2, 1.75)} fill="#f2b866" stroke={M.ink} strokeWidth={3.5} strokeLinejoin="round" />
          <path d={slicePath(170, 88, 46, 0.2, 1.75)} fill="#ffd96a" />
          <circle cx={196} cy={76} r={6} fill={M.coral} stroke={M.ink} strokeWidth={2} />
          <circle cx={186} cy={104} r={6} fill={M.coral} stroke={M.ink} strokeWidth={2} />
        </motion.g>
        <motion.g {...float(6, 0.6)}>
          <Apple x={300} y={70} r={26} color="#f2766b" />
        </motion.g>
        <motion.g {...float(7, 1.1)}>
          <Rod x={330} y={110} s={9} />
          <UnitCube x={352} y={182} s={16} />
        </motion.g>
        <motion.g {...float(5, 0.3)}>
          <g transform="translate(250 168)">
            <path d={starPath(24)} fill={M.gold} stroke={M.ink} strokeWidth={3.5} strokeLinejoin="round" />
          </g>
        </motion.g>
        <motion.g {...float(6, 0.9)}>
          <text x={110} y={176} fontFamily={M.font} fontWeight={700} fontSize={46} fill="#d4558f">
            ×
          </text>
          <text x={150} y={196} fontFamily={M.font} fontWeight={700} fontSize={40} fill="#3f6fd1">
            ÷
          </text>
        </motion.g>
      </svg>
    </motion.div>
  )
}

// ── Lesson card ────────────────────────────────────────────────────────────────

function LessonCard({
  lesson,
  variant,
  reduced,
}: {
  lesson: LessonView
  variant: Variants
  reduced: boolean
}) {
  const complete = isComplete(lesson)
  const status = lesson.recommended ? null : complete ? 'Mastered' : lesson.started ? 'In progress' : 'New'

  return (
    <motion.div variants={variant} whileHover={reduced ? undefined : { y: -5 }} whileTap={{ scale: 0.97 }} className="h-full">
      <Link
        to={`/tutor/${lesson.id}`}
        onClick={() => sfx.enter()}
        aria-label={`${lesson.title}: ${lesson.stars} of ${lesson.maxStars} stars${
          complete ? ', mastered' : ''
        }${lesson.recommended ? ', recommended' : ''}`}
        className="group flex h-full flex-col overflow-hidden rounded-[26px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
        style={{ background: M.paper, boxShadow: `${INK}, 0 6px 0 0 rgba(58,44,56,0.28)` }}
      >
        <div className="relative" style={{ borderBottom: `3px solid ${M.ink}` }}>
          <div className="transition-transform duration-300 group-hover:scale-[1.04]">
            <LessonPoster id={lesson.id} emoji={lesson.emoji} reduced={reduced} done={complete} />
          </div>
          {lesson.recommended && (
            <span
              className="kid-text absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm"
              style={{ background: M.gold, color: M.ink, boxShadow: `0 0 0 2.5px ${M.ink}` }}
            >
              <span aria-hidden="true">⭐</span> Recommended
            </span>
          )}
          <span
            className="kid-text absolute bottom-2 right-2.5 rounded-full px-2.5 py-0.5 text-xs"
            style={{ background: 'rgba(255,255,255,0.9)', color: M.ink, boxShadow: `0 0 0 2px ${M.ink}` }}
          >
            {lesson.steps} steps · {lesson.minutes} min
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-1 p-3.5">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">
              {lesson.emoji}
            </span>
            <h3 className="kid-text text-xl leading-tight" style={{ color: M.ink }}>
              {lesson.title}
            </h3>
            {complete && (
              <span className="kid-text text-lg leading-none text-correct-600" aria-hidden="true">
                ✓
              </span>
            )}
          </div>
          <p className="line-clamp-2 text-sm" style={{ color: '#5a4a56' }}>
            {lesson.intro}
          </p>
          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
            <StarRating earned={lesson.stars} total={lesson.maxStars} size="sm" />
            {status && (
              <span className="kid-text text-xs" style={{ color: status === 'Mastered' ? '#15803d' : status === 'In progress' ? '#957401' : '#5a4a56' }}>
                {status}
              </span>
            )}
            <span
              className="kid-text inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm transition-colors"
              style={{ background: M.coral, color: '#fff', boxShadow: `0 0 0 2px ${M.ink}`, textShadow: '0 1px 0 rgba(58,44,56,0.35)' }}
              aria-hidden="true"
            >
              ▶ Watch
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

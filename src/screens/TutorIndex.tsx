import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { allLessons } from '../tutoring/lessons'
import { useProgress } from '../store/progress'
import { weeklyFocus } from '../lib/analytics'
import { getZone } from '../curriculum'
import { sfx } from '../lib/sound'
import { subjectTheme, type Subject } from '../lib/theme'
import { useEntrance, hoverPop, tap } from '../lib/motion'
import { BackButton, Pill, StarRating, EmptyState } from '../components/ui'

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
}

/** Section a lesson is listed under on the Tutor index. */
const NON_MATH_AREAS: Record<string, string> = {
  'reading-reef': 'Reading & Writing',
  'writing-workshop': 'Reading & Writing',
  'science-summit': 'Science',
}
const areaOf = (zoneId: string) => NON_MATH_AREAS[zoneId] ?? 'Math'

/** A lesson is "done" when it has earned its full star allotment. */
function isComplete(v: LessonView): boolean {
  return v.maxStars > 0 && v.stars >= v.maxStars
}

export default function TutorIndex() {
  const attempts = useProgress((s) => s.attempts)
  const sessions = useProgress((s) => s.sessions)
  // Subscribe to zones so progress badges re-render when stars are earned.
  const zonesProgress = useProgress((s) => s.zones)

  const recommended = useMemo(
    () => new Set(weeklyFocus(attempts, sessions).map((f) => f.lessonId)),
    [attempts, sessions],
  )

  // Build a view-model per lesson, then group by subject (curriculum zone).
  const groups = useMemo(() => {
    const views: LessonView[] = allLessons.map((l) => {
      const zone = getZone(l.zoneId)
      const subject = (zone?.themeColor ?? 'quest') as Subject
      const zoneProg = zonesProgress[l.zoneId]
      const stageRec = zoneProg?.stages[l.practiceStageId]
      const stars = stageRec?.stars ?? 0
      // Total stars a lesson can show is its practice stage's allotment (fallback 3).
      const maxStars =
        getZone(l.zoneId)?.stages.find((s) => s.id === l.practiceStageId)
          ?.starsToEarn ?? 3
      const started = (stageRec?.attempts ?? 0) > 0 || stars > 0
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
      subject: byArea.get(area)![0].subject,
      lessons: byArea.get(area)!,
    }))
  }, [zonesProgress, recommended])

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
    <div className="flex-1 flex flex-col p-4">
      <div className="max-w-3xl w-full mx-auto flex flex-col gap-4">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <PageIntro back doneCount={doneCount} total={totalLessons} />

        {/* ── Lesson groups ──────────────────────────────────────────────── */}
        {totalLessons === 0 ? (
          <EmptyState
            emoji="📚"
            title="No lessons yet"
            message="New tutor lessons are on their way — check back soon!"
            cta={{ label: 'Back to map', to: '/map' }}
          />
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-6"
          >
            {groups.map((group) => {
              const theme = subjectTheme(group.subject)
              const title = group.area
              return (
                <motion.section
                  key={group.area}
                  variants={item}
                  aria-label={title}
                  className="flex flex-col gap-3"
                >
                  {/* section header */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${theme.bg}`}
                      aria-hidden="true"
                    />
                    <h2 className="kid-text text-lg sm:text-xl text-sky drop-shadow-sm">
                      {title}
                    </h2>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {group.lessons.map((l) => (
                      <LessonCard key={l.id} lesson={l} variant={item} />
                    ))}
                  </div>
                </motion.section>
              )
            })}
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ── Intro / header block ───────────────────────────────────────────────────────

function PageIntro({
  back,
  doneCount,
  total,
}: {
  back: boolean
  doneCount: number
  total: number
}) {
  return (
    <div className="flex flex-col gap-3">
      {back && <BackButton to="/map" label="Back to map" />}
      <div className="text-center">
        <h1 className="kid-text text-4xl sm:text-5xl text-sky drop-shadow-lg">
          📚 Tutor
        </h1>
        <p className="kid-text text-base sm:text-lg text-sky mt-1">
          Pick a topic to learn — listen and watch!
        </p>
        <div className="mt-2 flex justify-center">
          <Pill tone="ink" icon="✅">
            {doneCount}/{total} lessons mastered
          </Pill>
        </div>
      </div>
    </div>
  )
}

// ── Lesson card ────────────────────────────────────────────────────────────────

function LessonCard({
  lesson,
  variant,
}: {
  lesson: LessonView
  variant: Variants
}) {
  const theme = subjectTheme(lesson.subject)
  const complete = isComplete(lesson)

  return (
    <motion.div variants={variant} whileHover={hoverPop} whileTap={tap}>
      <Link
        to={`/tutor/${lesson.id}`}
        onClick={() => sfx.enter()}
        aria-label={`${lesson.title}: ${lesson.stars} of ${lesson.maxStars} stars${
          complete ? ', mastered' : ''
        }${lesson.recommended ? ', recommended' : ''}`}
        className={[
          'group block h-full rounded-3xl p-4',
          'bg-paper',
          'ring-2',
          theme.ring,
          'shadow-[0_6px_0_0_rgba(0,0,0,0.10),0_10px_22px_-6px_rgba(0,0,0,0.18)]',
          'transition-shadow duration-150',
          'hover:shadow-[0_8px_0_0_rgba(0,0,0,0.12),0_14px_28px_-6px_rgba(0,0,0,0.22)]',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2',
        ].join(' ')}
      >
        <div className="flex items-start gap-3">
          {/* subject-tinted emoji chip */}
          <div
            className={[
              'flex-shrink-0 grid place-items-center',
              'h-14 w-14 rounded-full text-3xl',
              'ring-2 ring-white shadow-md',
              theme.bg,
            ].join(' ')}
            aria-hidden="true"
          >
            {lesson.emoji}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`kid-text text-lg leading-tight ${theme.text}`}>
                {lesson.title}
              </h3>
              {complete && (
                <span
                  className="text-correct-600 text-lg leading-none"
                  aria-hidden="true"
                >
                  ✓
                </span>
              )}
            </div>
            <p className="text-ink-700 text-sm mt-0.5 line-clamp-2">
              {lesson.intro}
            </p>
          </div>
        </div>

        {/* footer: progress + badges */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <StarRating earned={lesson.stars} total={lesson.maxStars} size="sm" />
          {lesson.recommended ? (
            <Pill tone="quest" icon="⭐">
              Recommended
            </Pill>
          ) : lesson.started && !complete ? (
            <span className={`kid-text text-xs ${theme.accent}`}>
              In progress
            </span>
          ) : complete ? (
            <span className="kid-text text-xs text-correct-600">Mastered</span>
          ) : (
            <span className="kid-text text-xs text-ink-700">New</span>
          )}
        </div>
      </Link>
    </motion.div>
  )
}

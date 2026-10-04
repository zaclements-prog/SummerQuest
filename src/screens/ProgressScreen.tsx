import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useProgress } from '../store/progress'
import type { SessionRecord } from '../store/progress'
import { overall, byDay, bySubject, recentAccuracy } from '../lib/analytics'
import { totalStars } from '../lib/levels'
import BarChart from '../components/BarChart'
import { Card, Pill, BackButton, EmptyState } from '../components/ui'
import { accuracyColorClass, accuracyTone } from '../lib/theme'
import { useEntrance } from '../lib/motion'

export default function ProgressScreen() {
  const sessions = useProgress((s) => s.sessions)
  // Best stars per stage (what the map and badges count), not the sum over every replay.
  const zones = useProgress((s) => s.zones)
  const starsEarned = totalStars(zones)

  const o = overall(sessions)
  const recent = recentAccuracy(sessions, 8)
  const days = byDay(sessions, 7)
  const subjects = bySubject(sessions)
  const log = [...sessions].reverse().slice(0, 40)

  const { container, item } = useEntrance()

  // Personal best = the single quiz with the highest accuracy (min 1 question),
  // surfaced as a celebratory banner when the kid has a strong run on record.
  const best = sessions.reduce<{ pct: number; s: SessionRecord } | null>((acc, s) => {
    if (s.total <= 0) return acc
    const pct = Math.round((s.correct / s.total) * 100)
    if (!acc || pct > acc.pct) return { pct, s }
    return acc
  }, null)
  const showBest = best !== null && best.pct >= 80

  return (
    <div className="flex-1 flex flex-col p-4 overflow-y-auto">
      <div className="max-w-3xl w-full mx-auto flex flex-col gap-5">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <BackButton to="/map" label="Map" />
          <div className="flex-1">
            <h1 className="kid-text text-3xl sm:text-4xl text-sky drop-shadow-lg">
              📈 My Progress
            </h1>
            <p className="kid-text text-sky text-base sm:text-lg">
              See how you're doing — and how you grow over time
            </p>
          </div>
        </div>

        {sessions.length === 0 ? (
          <EmptyState
            emoji="🌱"
            title="Your progress will grow here!"
            message="Play a few quizzes and watch your stats, streaks, and charts bloom."
            cta={{ label: '▶ Start a quest', to: '/map' }}
          />
        ) : (
          <>
            {/* ── Personal-best banner ─────────────────────────────────────── */}
            {showBest && best && (
              <motion.div variants={item} initial="hidden" animate="show">
                <Card tone="quest" accent className="p-4 flex items-center gap-4">
                  <div className="text-4xl flex-shrink-0" aria-hidden="true">
                    🏆
                  </div>
                  <div className="min-w-0">
                    <div className="kid-text text-lg text-ink-900">
                      Personal best: {best.pct}% in {best.s.zoneTitle}!
                    </div>
                    <div className="text-ink-700 text-sm">
                      Your best quiz so far — {best.s.correct} of {best.s.total} correct.
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* ── Summary tiles ─────────────────────────────────────────────── */}
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 sm:grid-cols-4 gap-3"
            >
              <SummaryCard
                variants={item}
                tone="ocean"
                emoji="📝"
                label="Quizzes"
                value={o.sessions}
              />
              <SummaryCard
                variants={item}
                tone="island"
                emoji="❓"
                label="Questions"
                value={o.total}
              />
              <SummaryCard
                variants={item}
                tone={accuracyTone(o.accuracy)}
                emoji="🎯"
                label="Accuracy"
                value={o.accuracy}
                suffix="%"
                valueClass={accuracyColorClass(o.accuracy)}
              />
              <SummaryCard
                variants={item}
                tone="quest"
                emoji="⭐"
                label="Stars"
                value={starsEarned}
              />
            </motion.div>

            {/* ── Trend charts ──────────────────────────────────────────────── */}
            <section>
              <h2 className="kid-text text-2xl text-sky drop-shadow-md mb-3">
                📊 Trends
              </h2>
              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid sm:grid-cols-2 gap-4"
              >
                <ChartCard
                  variants={item}
                  title="Recent Quiz Accuracy"
                  subtitle="Your last few quizzes — are you climbing?"
                >
                  <BarChart
                    bars={recent.map((r) => ({ label: '', value: r.accuracy, emoji: r.emoji }))}
                    maxValue={100}
                    formatValue={(v) => `${v}%`}
                    caption="each bar = one quiz (newest on the right)"
                  />
                </ChartCard>

                <ChartCard
                  variants={item}
                  title="Questions Per Day"
                  subtitle="How much you practiced each day."
                >
                  <BarChart
                    bars={days.map((d) => ({ label: d.label, value: d.questions }))}
                    caption="last 7 active days"
                  />
                </ChartCard>

                {/* Constrained to a single column width (centered) so it matches the
                    other two cards instead of stretching full-width. */}
                <ChartCard
                  variants={item}
                  title="Accuracy by Subject"
                  subtitle="Where you're strongest — and what to practice."
                  className="sm:col-span-2 sm:max-w-[calc(50%-0.5rem)] sm:mx-auto"
                >
                  <BarChart
                    bars={subjects.map((s) => ({ label: '', value: s.accuracy, emoji: s.zoneEmoji }))}
                    maxValue={100}
                    formatValue={(v) => `${v}%`}
                    caption="percent correct in each zone you've played"
                  />
                </ChartCard>
              </motion.div>
            </section>

            {/* ── Per-session review ────────────────────────────────────────── */}
            <section>
              <h2 className="kid-text text-2xl text-sky drop-shadow-md mb-3">
                🗒️ Sessions
              </h2>
              <Card className="overflow-hidden">
                <motion.ul variants={container} initial="hidden" animate="show">
                  {log.map((s, i) => (
                    <SessionRow
                      key={s.id}
                      session={s}
                      striped={i % 2 === 1}
                      variants={item}
                    />
                  ))}
                </motion.ul>
              </Card>
              {sessions.length > log.length && (
                <p className="text-center text-sky text-sm kid-text mt-2">
                  Showing your {log.length} most recent quizzes.
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

// ── Animated count-up for the hero stats ──────────────────────────────────────

function useCountUp(target: number, durationMs = 700): number {
  const reduced = useReducedMotion()
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (reduced) return // no animation: the target is returned directly below
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      // easeOutCubic for a snappy settle
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(eased * target))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs, reduced])

  return reduced ? target : value
}

// ── Summary tile ──────────────────────────────────────────────────────────────

function SummaryCard({
  tone,
  emoji,
  label,
  value,
  suffix = '',
  valueClass,
  variants,
}: {
  tone: 'quest' | 'island' | 'ocean' | 'monster' | 'correct' | 'wrong'
  emoji: string
  label: string
  value: number
  suffix?: string
  valueClass?: string
  variants: import('framer-motion').Variants
}) {
  const count = useCountUp(value)
  return (
    <motion.div variants={variants}>
      <Card tone={tone} accent className="p-4 text-center h-full flex flex-col justify-center">
        <div className="text-2xl mb-1" aria-hidden="true">
          {emoji}
        </div>
        <div className={`kid-text text-3xl sm:text-4xl tabular-nums ${valueClass ?? 'text-ink-900'}`}>
          {count}
          {suffix}
        </div>
        <div className="text-ink-700 text-sm mt-0.5">{label}</div>
      </Card>
    </motion.div>
  )
}

// ── Titled chart card ─────────────────────────────────────────────────────────

function ChartCard({
  title,
  subtitle,
  className = '',
  variants,
  children,
}: {
  title: string
  subtitle: string
  className?: string
  variants: import('framer-motion').Variants
  children: React.ReactNode
}) {
  return (
    <motion.div variants={variants} className={className}>
      <Card tone="ocean" className="p-4 h-full flex flex-col">
        <h3 className="kid-text text-lg text-ink-900 text-center mb-2">{title}</h3>
        {children}
        <p className="text-ink-700 text-sm text-center mt-2">{subtitle}</p>
      </Card>
    </motion.div>
  )
}

// ── Per-session row ───────────────────────────────────────────────────────────

function SessionRow({
  session,
  striped,
  variants,
}: {
  session: SessionRecord
  striped: boolean
  variants: import('framer-motion').Variants
}) {
  const d = new Date(session.at)
  const when = `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString(
    [],
    { hour: 'numeric', minute: '2-digit' },
  )}`
  const accuracy = session.total > 0 ? Math.round((session.correct / session.total) * 100) : 0

  return (
    <motion.li
      variants={variants}
      className={`flex items-center gap-3 px-4 py-3 ${striped ? 'bg-ocean-50' : ''}`}
    >
      <div className="text-3xl flex-shrink-0" aria-hidden="true">
        {session.zoneEmoji}
      </div>

      <div className="min-w-0 flex-1">
        <div className="kid-text text-base text-ink-900 truncate">
          {session.zoneTitle}
          {session.kind === 'daily' && (
            <span className="ml-1 text-quest-600" aria-label="daily quiz" role="img">
              🌟
            </span>
          )}
        </div>
        <div className="text-sm text-ink-600">{when}</div>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <Pill tone={accuracyTone(accuracy)} icon="🎯">
          {session.correct}/{session.total} · {accuracy}%
        </Pill>
        <div className="flex items-center gap-2">
          <span className="text-sm" aria-label={`${session.stars} stars`} role="img">
            {'⭐'.repeat(session.stars) || '—'}
          </span>
          <Link
            to={`/zone/${session.zoneId}`}
            className="kid-text text-sm text-ocean-700 hover:underline inline-flex items-center min-h-[44px] px-1"
            aria-label={`Replay ${session.zoneTitle}`}
          >
            ↻ Replay
          </Link>
        </div>
      </div>
    </motion.li>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useProgress } from '../store/progress'
import type { SessionRecord } from '../store/progress'
import { overall, byDay, bySubject, recentAccuracy } from '../lib/analytics'
import { totalStars } from '../lib/levels'
import BarChart from '../components/BarChart'
import {
  Card,
  Pill,
  PageHeader,
  EmptyState,
  Page,
  SectionTitle,
  StatTile,
  Medallion,
  ToonStar,
  accuracyToneOf,
  type Tone,
} from '../components/ui'
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
    <Page width="lg">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <PageHeader title="📈 My Progress" back={{ to: '/map', label: 'Map' }} className="!mb-1" />
        <p className="kid-text text-ink-700 text-lg">
          See how you're doing — and how you grow over time
        </p>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          emoji="🌱"
          title="Your progress will grow here!"
          message="Play a few quizzes and watch your stats, streaks, and charts bloom."
          cta={{ label: '▶ Start a quest', to: '/world' }}
        />
      ) : (
        <>
          {/* ── Personal-best banner ─────────────────────────────────────── */}
          {showBest && best && (
            <motion.div variants={item} initial="hidden" animate="show">
              <Card tone="quest" accent className="relative overflow-hidden p-4 sm:p-5 flex items-center gap-4 !bg-quest-100">
                <div className="absolute -left-10 top-1/2 -translate-y-1/2 w-44 h-44 sunburst pointer-events-none" aria-hidden="true" />
                <Medallion tone="quest" size="lg" className="relative">
                  🏆
                </Medallion>
                <div className="relative min-w-0">
                  <div className="kid-text font-bold text-xl text-ink-900 leading-tight">
                    Personal best: {best.pct}% in {best.s.zoneTitle}!
                  </div>
                  <div className="text-ink-700 text-base">
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
              tone={accuracyToneOf(o.accuracy)}
              emoji="🎯"
              label="Accuracy"
              value={o.accuracy}
              suffix="%"
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
          <section className="flex flex-col gap-3">
            <SectionTitle icon="📊">Trends</SectionTitle>
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
          <section className="flex flex-col gap-3">
            <SectionTitle icon="🗒️">Sessions</SectionTitle>
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
              <p className="text-center text-ink-700 text-sm kid-text">
                Showing your {log.length} most recent quizzes.
              </p>
            )}
          </section>
        </>
      )}
    </Page>
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
  variants,
}: {
  tone: Tone
  emoji: string
  label: string
  value: number
  suffix?: string
  variants: import('framer-motion').Variants
}) {
  const count = useCountUp(value)
  return (
    <motion.div variants={variants}>
      <StatTile
        tone={tone}
        icon={emoji}
        label={label}
        value={
          <>
            {count}
            {suffix}
          </>
        }
      />
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
      <Card className="p-4 sm:p-5 h-full flex flex-col">
        <h3 className="kid-text font-bold text-xl text-ink-900 text-center mb-1">{title}</h3>
        <p className="text-ink-700 text-sm text-center mb-2">{subtitle}</p>
        <div className="mt-auto">{children}</div>
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
      className={`flex items-center gap-3 px-4 py-3 border-b-2 border-line/10 last:border-b-0 ${striped ? 'bg-cream-100' : ''}`}
    >
      <Medallion size="sm">{session.zoneEmoji}</Medallion>

      <div className="min-w-0 flex-1">
        <div className="kid-text text-lg text-ink-900 truncate">
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
        <Pill tone={accuracyToneOf(accuracy)} icon="🎯">
          {session.correct}/{session.total} · {accuracy}%
        </Pill>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center" aria-label={`${session.stars} stars`} role="img">
            {session.stars > 0
              ? Array.from({ length: session.stars }, (_, i) => <ToonStar key={i} filled px={18} />)
              : <span className="text-ink-500" aria-hidden="true">—</span>}
          </span>
          <Link
            to={`/zone/${session.zoneId}`}
            className="kid-text text-sm text-ink-900 inline-flex items-center min-h-[44px] px-3 rounded-full bg-paper border-2 border-line shadow-ledge-sm hover:bg-cream-100 active:translate-y-0.5 outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70"
            aria-label={`Replay ${session.zoneTitle}`}
          >
            ↻ Replay
          </Link>
        </div>
      </div>
    </motion.li>
  )
}

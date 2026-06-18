import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { curriculum } from '../curriculum'
import { useProgress, zoneStars } from '../store/progress'
import { sfx } from '../lib/sound'
import { computeBadges, type BadgeStatus } from '../lib/badges'
import { todayStr } from '../lib/daily'
import DailyGoalCard from '../components/DailyGoalCard'
import {
  Button,
  Pill,
  StarRating,
  Celebration,
} from '../components/ui'
import { subjectTheme } from '../lib/theme'
import { useEntrance, hoverPop, tap } from '../lib/motion'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the next stage that hasn't been fully starred yet (the "continue" target). */
function findNextTarget(): { zoneId: string; stageId?: string } | null {
  for (const zone of curriculum.zones) {
    if (!zone.available) continue
    const progress = useProgress.getState().zones[zone.id]
    for (const stage of zone.stages) {
      const earned = progress?.stages[stage.id]?.stars ?? 0
      if (earned < stage.starsToEarn) {
        return { zoneId: zone.id, stageId: stage.id }
      }
    }
  }
  return null
}

// ── Connector color maps for SVG ──────────────────────────────────────────────

const CONNECTOR_DONE = 'rgba(251,253,255,0.85)'   // bright for completed
const CONNECTOR_TODO = 'rgba(251,253,255,0.25)'    // faint for upcoming

export default function WorldMap() {
  const zones = useProgress((s) => s.zones)
  const stats = useProgress((s) => s.stats)
  const totalCoinsEarned = useProgress((s) => s.totalCoinsEarned)
  const seenBadges = useProgress((s) => s.seenBadges)
  const markBadgesSeen = useProgress((s) => s.markBadgesSeen)
  const dailyDone = useProgress((s) => s.dailyClaimedDate) === todayStr()

  const badges = useMemo(
    () => computeBadges({ zones, stats, totalCoinsEarned }),
    [zones, stats, totalCoinsEarned],
  )
  const earned = badges.filter((b) => b.earned)

  // Badges earned since the last time the map was opened (computed once, at mount).
  const [celebrating, setCelebrating] = useState<BadgeStatus[]>(() =>
    earned.filter((b) => !seenBadges.includes(b.id)),
  )
  useEffect(() => {
    if (celebrating.length > 0) {
      sfx.victory()
      markBadgesSeen(earned.map((b) => b.id))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Next-stage deep-link (computed after hooks)
  const nextTarget = useMemo(() => findNextTarget(), [zones])
  const continueHref = nextTarget
    ? nextTarget.stageId
      ? `/zone/${nextTarget.zoneId}`
      : `/zone/${nextTarget.zoneId}`
    : null

  // Motion variants (respects prefers-reduced-motion)
  const { container, item } = useEntrance()

  return (
    <div className="flex-1 flex flex-col p-4">
      <div className="max-w-5xl w-full mx-auto flex flex-col gap-4">

        {/* ── Title ─────────────────────────────────────────────────────── */}
        <div className="text-center">
          <h1 className="text-display text-sky drop-shadow-lg">
            {curriculum.title}
          </h1>
          <p className="kid-text text-lg text-sky mt-1">
            Tap an island to start your quest
          </p>
        </div>

        {/* ── Primary CTA + primary nav ─────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {continueHref && (
            <Button variant="primary" size="lg" to={continueHref}>
              ▶ Continue your quest
            </Button>
          )}
          <Button variant="secondary" size="md" to="/daily">
            🌟 Daily{dailyDone ? ' ✓' : ''}
          </Button>
          <Button variant="ghost" size="md" to="/tutor" className="bg-paper/80">
            📚 Tutor
          </Button>
          <Button variant="ghost" size="md" to="/home" className="bg-paper/80">
            🏠 Home
          </Button>
        </div>

        {/* ── Secondary / utility nav ───────────────────────────────────── */}
        <div className="flex flex-wrap justify-center gap-2">
          <Pill tone="ink" icon="🏅">
            <Link to="/badges" onClick={() => sfx.click()} className="hover:underline">
              Badges {earned.length}/{badges.length}
            </Link>
          </Pill>
          <Pill tone="ocean" icon="📈">
            <Link to="/progress" onClick={() => sfx.click()} className="hover:underline">
              Progress
            </Link>
          </Pill>
          <Pill tone="island" icon="🎯">
            <Link to="/focus" onClick={() => sfx.click()} className="hover:underline">
              This Week
            </Link>
          </Pill>
          <Pill tone="monster" icon="🌍">
            <Link to="/world" onClick={() => sfx.click()} className="hover:underline">
              World (beta)
            </Link>
          </Pill>
        </div>

        {/* ── Daily goal ─────────────────────────────────────────────────── */}
        <DailyGoalCard />

        {/* ── Island map ─────────────────────────────────────────────────── */}
        <div
          className="relative w-full rounded-3xl overflow-hidden shadow-2xl ring-4 ring-ocean-900/30"
          style={{
            aspectRatio: '16 / 10',
            background:
              'radial-gradient(ellipse at 30% 70%, #fde68a 0%, #34d399 35%, #1e3a8a 100%)',
          }}
        >
          {/* decorative ocean waves */}
          <svg
            className="absolute inset-0 w-full h-full opacity-20"
            preserveAspectRatio="none"
            viewBox="0 0 200 100"
            aria-hidden="true"
          >
            <path
              d="M0 80 Q 50 70, 100 80 T 200 80 L 200 100 L 0 100 Z"
              fill="white"
            />
            <path
              d="M0 88 Q 50 82, 100 88 T 200 88 L 200 100 L 0 100 Z"
              fill="white"
              opacity="0.5"
            />
          </svg>

          {/* connection paths — solid+glowing for completed, faint dashed for upcoming */}
          <svg
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {curriculum.zones.slice(0, -1).map((z, i) => {
              const next = curriculum.zones[i + 1]
              const thisZoneStars = zoneStars(z.id)
              const thisZoneMax = z.stages.reduce((s, st) => s + st.starsToEarn, 0)
              const isDone = thisZoneStars >= thisZoneMax && thisZoneMax > 0
              return (
                <line
                  key={`${z.id}-${next.id}`}
                  x1={`${z.position.x}%`}
                  y1={`${z.position.y}%`}
                  x2={`${next.position.x}%`}
                  y2={`${next.position.y}%`}
                  stroke={isDone ? CONNECTOR_DONE : CONNECTOR_TODO}
                  strokeWidth={isDone ? 4 : 2.5}
                  strokeDasharray={isDone ? undefined : '6 6'}
                />
              )
            })}
          </svg>

          {/* Zone islands */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="contents"
          >
            {curriculum.zones.map((zone, i) => {
              const theme = subjectTheme(zone.themeColor)
              const stars = zoneStars(zone.id)
              const maxStars = zone.stages.reduce(
                (s, st) => s + st.starsToEarn,
                0,
              )

              return (
                // Positioning is plain CSS so it never depends on rAF.
                // Framer entrance is on the inner element where pausing can't hide the island.
                <div
                  key={zone.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${zone.position.x}%`, top: `${zone.position.y}%` }}
                >
                  {zone.available ? (
                    <Link
                      to={`/zone/${zone.id}`}
                      onClick={() => sfx.enter()}
                      className="block group"
                      aria-label={`${zone.title}: ${stars} of ${maxStars} stars`}
                    >
                      <motion.div
                        variants={item}
                        whileHover={hoverPop}
                        whileTap={tap}
                        className="relative"
                      >
                        {/* island bubble */}
                        <motion.div
                          animate={{ y: [0, -6, 0] }}
                          transition={{
                            duration: 2.4,
                            repeat: Infinity,
                            delay: i * 0.3,
                          }}
                          className={[
                            'w-24 h-24 sm:w-28 sm:h-28 rounded-full',
                            'flex items-center justify-center text-5xl sm:text-6xl',
                            'shadow-xl ring-4',
                            theme.bg,
                            theme.ring,
                          ].join(' ')}
                        >
                          <span aria-hidden="true">{zone.emoji}</span>
                        </motion.div>

                        {/* title label */}
                        <div
                          className={[
                            'absolute -bottom-2 left-1/2 -translate-x-1/2',
                            'px-2.5 py-0.5 rounded-full kid-text text-xs sm:text-sm whitespace-nowrap shadow',
                            'bg-paper/95',
                            theme.accent,
                          ].join(' ')}
                        >
                          {zone.title}
                        </div>

                        {/* star chip */}
                        {maxStars > 0 && (
                          <div
                            className={[
                              'absolute -top-2 -right-2',
                              'rounded-full px-1.5 py-0.5 shadow',
                              'flex items-center kid-text text-xs',
                              theme.bg,
                              theme.text,
                            ].join(' ')}
                          >
                            <StarRating
                              earned={stars}
                              total={maxStars}
                              size="sm"
                            />
                          </div>
                        )}
                      </motion.div>
                    </Link>
                  ) : (
                    <div
                      className="relative cursor-not-allowed"
                      aria-disabled="true"
                      aria-label={`${zone.title}: locked`}
                      role="img"
                    >
                      <motion.div variants={item}>
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-ocean-900/60 flex flex-col items-center justify-center grayscale opacity-50 ring-4 ring-white/20">
                          <span className="text-4xl sm:text-5xl" aria-hidden="true">🔒</span>
                          <span className="text-white/60 text-2xl" aria-hidden="true">{zone.emoji}</span>
                        </div>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-ocean-900/70 text-white/80 px-3 py-0.5 rounded-full kid-text text-xs sm:text-sm whitespace-nowrap">
                          {zone.title}
                        </div>
                      </motion.div>
                    </div>
                  )}
                </div>
              )
            })}
          </motion.div>
        </div>

        {/* ── Footer badge note ─────────────────────────────────────────── */}
        <p className="text-center text-sky text-sm kid-text">
          {earned.length > 0
            ? `🏅 ${earned.length} badge${earned.length > 1 ? 's' : ''} earned — keep exploring!`
            : 'Explore every island to earn badges and level up!'}
        </p>
      </div>

      {/* ── Badge celebration overlay ──────────────────────────────────── */}
      <Celebration
        open={celebrating.length > 0}
        onClose={() => setCelebrating([])}
        title={`New ${celebrating.length > 1 ? 'Badges' : 'Badge'}! 🏅`}
      >
        <div className="flex flex-wrap justify-center gap-3 my-2">
          {celebrating.map((b) => (
            <div key={b.id} className="flex flex-col items-center w-24">
              <div
                className="text-5xl"
                style={{ filter: 'drop-shadow(0 0 8px rgba(247,193,2,0.7))' }}
                aria-hidden="true"
              >
                {b.emoji}
              </div>
              <div className="kid-text text-sm text-ink-700">{b.title}</div>
            </div>
          ))}
        </div>
      </Celebration>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { curriculum } from '../curriculum'
import { useProgress, zoneStars } from '../store/progress'
import { sfx } from '../lib/sound'
import { computeBadges, type BadgeStatus } from '../lib/badges'
import { todayStr } from '../lib/daily'
import DailyGoalCard from '../components/DailyGoalCard'

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

  return (
    <div className="flex-1 flex flex-col p-4">
      <div className="max-w-5xl w-full mx-auto">
        <div className="text-center mb-4 text-white">
          <h2 className="kid-text text-4xl drop-shadow-lg">
            {curriculum.title}
          </h2>
          <p className="kid-text text-lg text-white/90">
            Tap an island to start your quest
          </p>
        </div>

        <div className="flex justify-center flex-wrap gap-2 mb-4">
          <Link
            to="/daily"
            onClick={() => sfx.click()}
            className="kid-text flex items-center gap-1 px-4 py-2 rounded-full bg-quest-500 text-quest-900 shadow hover:scale-105 transition"
          >
            🌟 Daily{dailyDone ? ' ✓' : ''}
          </Link>
          <Link
            to="/focus"
            onClick={() => sfx.click()}
            className="kid-text flex items-center gap-1 px-4 py-2 rounded-full bg-correct-500 text-white shadow hover:scale-105 transition"
          >
            🎯 This Week
          </Link>
          <Link
            to="/tutor"
            onClick={() => sfx.click()}
            className="kid-text flex items-center gap-1 px-4 py-2 rounded-full bg-island-500 text-ocean-900 shadow hover:scale-105 transition"
          >
            📚 Tutor
          </Link>
          <Link
            to="/home"
            onClick={() => sfx.click()}
            className="kid-text flex items-center gap-1 px-4 py-2 rounded-full bg-quest-500 text-quest-900 shadow hover:scale-105 transition"
          >
            🏠 Home
          </Link>
          <Link
            to="/badges"
            onClick={() => sfx.click()}
            className="kid-text flex items-center gap-1 px-4 py-2 rounded-full bg-white/90 text-ocean-900 shadow hover:scale-105 transition"
          >
            🏅 Badges {earned.length}/{badges.length}
          </Link>
          <Link
            to="/progress"
            onClick={() => sfx.click()}
            className="kid-text flex items-center gap-1 px-4 py-2 rounded-full bg-island-500 text-ocean-900 shadow hover:scale-105 transition"
          >
            📈 Progress
          </Link>
        </div>

        <div className="mb-4">
          <DailyGoalCard />
        </div>

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

          {/* connection paths between zones */}
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            {curriculum.zones.slice(0, -1).map((z, i) => {
              const next = curriculum.zones[i + 1]
              return (
                <line
                  key={`${z.id}-${next.id}`}
                  x1={`${z.position.x}%`}
                  y1={`${z.position.y}%`}
                  x2={`${next.position.x}%`}
                  y2={`${next.position.y}%`}
                  stroke="white"
                  strokeWidth="3"
                  strokeDasharray="6 6"
                  opacity="0.4"
                />
              )
            })}
          </svg>

          {curriculum.zones.map((zone, i) => {
            const stars = zoneStars(zone.id)
            const maxStars = zone.stages.reduce(
              (s, st) => s + st.starsToEarn,
              0,
            )
            return (
              // Positioning + centering is plain CSS so it never depends on
              // requestAnimationFrame. (A Framer entrance animation here froze
              // at scale(0) in background/headless tabs — rAF is paused there —
              // leaving every island invisible. It also clobbered the Tailwind
              // -translate centering.) The gentle idle float lives on the inner
              // element below, where pausing it can't hide the island.
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
                  >
                    <div className="relative">
                      <motion.div
                        animate={{ y: [0, -6, 0] }}
                        transition={{
                          duration: 2.4,
                          repeat: Infinity,
                          delay: i * 0.3,
                        }}
                        className="w-28 h-28 rounded-full bg-quest-300 flex items-center justify-center text-6xl shadow-xl ring-8 ring-white/40 group-hover:scale-110 transition"
                      >
                        {zone.emoji}
                      </motion.div>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white/90 text-ocean-900 px-3 py-0.5 rounded-full kid-text text-sm whitespace-nowrap shadow">
                        {zone.title}
                      </div>
                      {maxStars > 0 && (
                        <div className="absolute -top-2 -right-2 bg-quest-500 text-quest-900 rounded-full px-2 py-0.5 kid-text text-sm shadow flex items-center gap-0.5">
                          <span>⭐</span>
                          <span>
                            {stars}/{maxStars}
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                ) : (
                  <div className="relative cursor-not-allowed">
                    <div className="w-28 h-28 rounded-full bg-ocean-900/60 flex items-center justify-center text-6xl grayscale opacity-50 ring-4 ring-white/20">
                      🔒
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-ocean-900/70 text-white/80 px-3 py-0.5 rounded-full kid-text text-sm whitespace-nowrap">
                      {zone.title}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="text-center text-white/80 mt-4 text-sm kid-text">
          {earned.length > 0
            ? `🏅 ${earned.length} badge${earned.length > 1 ? 's' : ''} earned — keep exploring!`
            : 'Explore every island to earn badges and level up!'}
        </div>
      </div>

      <AnimatePresence>
        {celebrating.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setCelebrating([])}
          >
            <motion.div
              initial={{ scale: 0.7, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white text-ocean-900 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="kid-text text-2xl mb-1">
                🎉 New {celebrating.length > 1 ? 'Badges' : 'Badge'}!
              </div>
              <div className="flex flex-wrap justify-center gap-3 my-4">
                {celebrating.map((b) => (
                  <div key={b.id} className="flex flex-col items-center w-24">
                    <div
                      className="text-5xl"
                      style={{ filter: 'drop-shadow(0 0 8px rgba(247,193,2,0.7))' }}
                    >
                      {b.emoji}
                    </div>
                    <div className="kid-text text-sm">{b.title}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setCelebrating([])}
                className="btn-quest bg-correct-500 text-white"
                style={{ borderColor: '#16a34a' }}
              >
                Awesome!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

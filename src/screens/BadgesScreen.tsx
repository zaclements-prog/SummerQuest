import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useProgress } from '../store/progress'
import { computeBadges, type BadgeStatus } from '../lib/badges'

export default function BadgesScreen() {
  const zones = useProgress((s) => s.zones)
  const stats = useProgress((s) => s.stats)
  const totalCoinsEarned = useProgress((s) => s.totalCoinsEarned)
  const markBadgesSeen = useProgress((s) => s.markBadgesSeen)

  const badges = computeBadges({ zones, stats, totalCoinsEarned })
  const earned = badges.filter((b) => b.earned)
  const zoneBadges = badges.filter((b) => b.category === 'zone')
  const milestones = badges.filter((b) => b.category === 'milestone')

  // Opening the trophy case counts as "seeing" everything earned so far.
  useEffect(() => {
    markBadgesSeen(earned.map((b) => b.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex-1 flex flex-col p-4 text-white overflow-y-auto">
      <div className="max-w-3xl w-full mx-auto">
        <Link to="/map" className="kid-text inline-block mb-3">
          ← Back to map
        </Link>

        <div className="text-center mb-5">
          <h2 className="kid-text text-4xl drop-shadow-lg">🏅 My Badges</h2>
          <p className="kid-text text-lg text-white/90">
            {earned.length} of {badges.length} earned
          </p>
          <div className="h-2 w-48 mx-auto mt-2 rounded-full bg-white/25 overflow-hidden">
            <div
              className="h-full bg-quest-400 rounded-full transition-[width] duration-500"
              style={{ width: `${Math.round((earned.length / badges.length) * 100)}%` }}
            />
          </div>
        </div>

        <Section title="Subject Badges" badges={zoneBadges} />
        <Section title="Achievements" badges={milestones} />
      </div>
    </div>
  )
}

function Section({ title, badges }: { title: string; badges: BadgeStatus[] }) {
  return (
    <div className="mb-6">
      <h3 className="kid-text text-xl mb-2 text-white/90">{title}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {badges.map((b, i) => (
          <BadgeCard key={b.id} badge={b} index={i} />
        ))}
      </div>
    </div>
  )
}

function BadgeCard({ badge, index }: { badge: BadgeStatus; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      className={`rounded-3xl p-3 text-center flex flex-col items-center gap-1 border-4 ${
        badge.earned
          ? 'bg-white text-ocean-900 border-quest-400 shadow-lg'
          : 'bg-white/10 text-white/70 border-white/15'
      }`}
    >
      <div
        className={`text-4xl ${badge.earned ? '' : 'grayscale opacity-50'}`}
        style={badge.earned ? { filter: 'drop-shadow(0 0 6px rgba(247,193,2,0.6))' } : undefined}
      >
        {badge.earned ? badge.emoji : '🔒'}
      </div>
      <div className="kid-text text-sm leading-tight">{badge.title}</div>
      {badge.earned ? (
        <div className="kid-text text-xs text-correct-600">Earned!</div>
      ) : (
        <div className="text-[11px] leading-tight opacity-80">{badge.description}</div>
      )}
    </motion.div>
  )
}

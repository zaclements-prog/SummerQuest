import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useProgress } from '../store/progress'
import { computeBadges, type BadgeStatus } from '../lib/badges'
import { sfx } from '../lib/sound'
import {
  Card,
  Button,
  PageHeader,
  ProgressBar,
  Pill,
  EmptyState,
  Celebration,
} from '../components/ui'
import { useEntrance } from '../lib/motion'

export default function BadgesScreen() {
  const zones = useProgress((s) => s.zones)
  const stats = useProgress((s) => s.stats)
  const totalCoinsEarned = useProgress((s) => s.totalCoinsEarned)
  const seenBadges = useProgress((s) => s.seenBadges)
  const markBadgesSeen = useProgress((s) => s.markBadgesSeen)

  const badges = useMemo(
    () => computeBadges({ zones, stats, totalCoinsEarned }),
    [zones, stats, totalCoinsEarned],
  )
  const earned = badges.filter((b) => b.earned)
  const zoneBadges = badges.filter((b) => b.category === 'zone')
  const milestones = badges.filter((b) => b.category === 'milestone')

  // Badges earned since the case was last opened (computed once, at mount) —
  // these get a one-time celebration + a persistent "NEW!" ribbon this visit.
  const [newIds] = useState<Set<string>>(
    () => new Set(earned.filter((b) => !seenBadges.includes(b.id)).map((b) => b.id)),
  )
  const [celebrating, setCelebrating] = useState<BadgeStatus[]>(() =>
    earned.filter((b) => newIds.has(b.id)),
  )

  // Opening the trophy case counts as "seeing" everything earned so far.
  useEffect(() => {
    if (celebrating.length > 0) sfx.victory()
    markBadgesSeen(earned.map((b) => b.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Tapped badge → detail modal (earned AND locked).
  const [selected, setSelected] = useState<BadgeStatus | null>(null)

  const pct = badges.length > 0 ? Math.round((earned.length / badges.length) * 100) : 0

  return (
    <div className="flex-1 flex flex-col p-4 overflow-y-auto">
      <div className="max-w-3xl w-full mx-auto">
        <PageHeader title="🏅 My Badges" back={{ to: '/map', label: 'Map' }} />

        {/* ── Overall progress ─────────────────────────────────────────── */}
        <div className="text-center mb-6">
          <p className="kid-text text-2xl text-sky drop-shadow">
            {earned.length} of {badges.length} earned
          </p>
          <p className="text-sky text-sm mt-1">
            {earned.length === 0
              ? 'Play to collect your first badge!'
              : pct >= 100
                ? 'You collected them all! 🎉'
                : 'Keep questing to fill your trophy case.'}
          </p>
          <ProgressBar
            value={earned.length}
            max={badges.length}
            tone="quest"
            className="max-w-xs mx-auto mt-3"
          />
        </div>

        {earned.length === 0 ? (
          <EmptyState
            emoji="🏆"
            title="Your trophy case is waiting"
            message="Finish a stage to earn your very first badge. Every island has trophies to collect!"
            cta={{ label: 'Play now →', to: '/map' }}
          />
        ) : (
          <>
            <Section
              title="Subject Badges"
              badges={zoneBadges}
              newIds={newIds}
              onSelect={setSelected}
            />
            <Section
              title="Achievements"
              badges={milestones}
              newIds={newIds}
              onSelect={setSelected}
            />
          </>
        )}
      </div>

      {/* ── Badge detail modal ───────────────────────────────────────────── */}
      <BadgeDetailModal badge={selected} onClose={() => setSelected(null)} />

      {/* ── New-badge celebration overlay ────────────────────────────────── */}
      <Celebration
        open={celebrating.length > 0}
        onClose={() => setCelebrating([])}
        title={`New ${celebrating.length > 1 ? 'Badges' : 'Badge'}! 🏅`}
      >
        <div className="flex flex-wrap justify-center gap-3 my-2">
          {celebrating.map((b) => (
            <div key={b.id} className="flex flex-col items-center w-24">
              <div
                className="text-5xl animate-glow text-quest-500"
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

// ── Section ───────────────────────────────────────────────────────────────────

function Section({
  title,
  badges,
  newIds,
  onSelect,
}: {
  title: string
  badges: BadgeStatus[]
  newIds: Set<string>
  onSelect: (b: BadgeStatus) => void
}) {
  const earnedCount = badges.filter((b) => b.earned).length
  const { container, item } = useEntrance()

  return (
    <section className="mb-7">
      <div className="flex items-center justify-between mb-3">
        <h2 className="kid-text text-xl text-sky drop-shadow">{title}</h2>
        <Pill tone={earnedCount === badges.length ? 'correct' : 'ink'} icon="🏅">
          {earnedCount} of {badges.length}
        </Pill>
      </div>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
      >
        {badges.map((b) => (
          <motion.div key={b.id} variants={item}>
            <BadgeCard badge={b} isNew={newIds.has(b.id)} onSelect={onSelect} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}

// ── Badge card ────────────────────────────────────────────────────────────────

function BadgeCard({
  badge,
  isNew,
  onSelect,
}: {
  badge: BadgeStatus
  isNew: boolean
  onSelect: (b: BadgeStatus) => void
}) {
  const earned = badge.earned

  return (
    <Card
      tone={earned ? 'quest' : undefined}
      accent={earned}
      onClick={() => {
        sfx.click()
        onSelect(badge)
      }}
      className={[
        'relative h-full p-3 text-center flex flex-col items-center gap-1.5',
        earned ? '' : 'border-4 border-ocean-300/60 bg-ocean-900/15',
        isNew ? 'animate-pop' : '',
      ].join(' ')}
    >
      {/* NEW! ribbon for badges earned since last visit */}
      {isNew && (
        <span className="absolute -top-2 -right-2 z-10 rounded-full bg-correct-600 text-white kid-text text-[11px] px-2 py-0.5 shadow-md ring-2 ring-paper">
          NEW!
        </span>
      )}

      <div
        className={
          earned
            ? 'text-4xl animate-glow text-quest-500'
            : 'text-4xl grayscale opacity-60'
        }
        aria-hidden="true"
      >
        {earned ? badge.emoji : '🔒'}
      </div>

      <div
        className={[
          'kid-text text-sm leading-tight',
          earned ? 'text-ink-900' : 'text-ink-700',
        ].join(' ')}
      >
        {badge.title}
      </div>

      {earned ? (
        <div className="kid-text text-[13px] text-correct-600">Earned!</div>
      ) : (
        <div className="text-[13px] leading-snug text-sky/90">{badge.description}</div>
      )}
    </Card>
  )
}

// ── Badge detail modal ────────────────────────────────────────────────────────

function BadgeDetailModal({
  badge,
  onClose,
}: {
  badge: BadgeStatus | null
  onClose: () => void
}) {
  const reduced = useReducedMotion() ?? false
  const open = badge != null

  return (
    <AnimatePresence>
      {open && badge && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-ink-900/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={badge.title}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: 32 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: 32 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          >
            <Card
              tone={badge.earned ? 'quest' : undefined}
              accent={badge.earned}
              className="relative p-8 w-full max-w-sm text-center"
            >
              <div
                className={
                  badge.earned
                    ? 'text-6xl mb-3 animate-glow text-quest-500'
                    : 'text-6xl mb-3 grayscale opacity-70'
                }
                aria-hidden="true"
              >
                {badge.earned ? badge.emoji : '🔒'}
              </div>

              <h2 className="kid-text text-2xl text-ink-900 mb-2">{badge.title}</h2>

              <div className="flex justify-center mb-3">
                <Pill tone={badge.earned ? 'correct' : 'ocean'} icon={badge.earned ? '✅' : '🎯'}>
                  {badge.earned ? 'Earned!' : 'How to earn'}
                </Pill>
              </div>

              <p className="text-ink-700 text-base mb-6">{badge.description}</p>

              <Button
                variant="primary"
                size="lg"
                onClick={onClose}
                className="w-full justify-center"
              >
                {badge.earned ? 'Awesome! 🎉' : 'Got it! 👍'}
              </Button>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

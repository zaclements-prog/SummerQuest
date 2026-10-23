import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useProgress } from '../store/progress'
import { computeBadges, type BadgeStatus } from '../lib/badges'
import { sfx } from '../lib/sound'
import { useListenSay } from '../components/listen/useListenSay'
import {
  Card,
  Button,
  PageHeader,
  ProgressBar,
  Pill,
  EmptyState,
  Celebration,
  Medallion,
  Modal,
  Page,
  SectionTitle,
} from '../components/ui'
import { useEntrance } from '../lib/motion'

export default function BadgesScreen() {
  const zones = useProgress((s) => s.zones)
  const stats = useProgress((s) => s.stats)
  const totalCoinsEarned = useProgress((s) => s.totalCoinsEarned)
  const seenBadges = useProgress((s) => s.seenBadges)
  const markBadgesSeen = useProgress((s) => s.markBadgesSeen)
  const grade = useProgress((s) => s.player?.grade)

  const badges = useMemo(
    () => computeBadges({ zones, stats, totalCoinsEarned, grade }),
    [zones, stats, totalCoinsEarned, grade],
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

  // K–1: the badge card is said out loud
  useListenSay(celebrating.length > 0, { line: 'k-nav/newBadge' })

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
    <Page width="lg">
      <PageHeader title="🏅 My Badges" back={{ to: '/map', label: 'Map' }} className="!mb-0" />

      {/* ── Overall progress ─────────────────────────────────────────── */}
      <Card tone="quest" accent className="relative overflow-hidden p-5 sm:p-6 flex items-center gap-4 sm:gap-5">
        <div className="absolute -left-12 top-1/2 -translate-y-1/2 w-52 h-52 sunburst pointer-events-none" aria-hidden="true" />
        <Medallion tone="quest" size="xl" className="relative">
          🏆
        </Medallion>
        <div className="relative flex-1 min-w-0">
          <p className="kid-text font-bold text-3xl text-ink-900 leading-tight">
            {earned.length} of {badges.length} earned
          </p>
          <p className="text-ink-700 text-base mt-0.5">
            {earned.length === 0
              ? 'Play to collect your first badge!'
              : pct >= 100
                ? 'You collected them all! 🎉'
                : 'Keep questing to fill your trophy case.'}
          </p>
          <ProgressBar value={earned.length} max={badges.length} tone="quest" className="mt-3 max-w-sm" />
        </div>
      </Card>

      {earned.length === 0 ? (
        <EmptyState
          emoji="🏆"
          title="Your trophy case is waiting"
          message="Finish a stage to earn your very first badge. Every island has trophies to collect!"
          cta={{ label: 'Play now →', to: '/world' }}
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
            <div key={b.id} className="flex flex-col items-center gap-1 w-24">
              <Medallion tone="quest" size="lg">
                {b.emoji}
              </Medallion>
              <div className="kid-text text-sm text-ink-700">{b.title}</div>
            </div>
          ))}
        </div>
      </Celebration>
    </Page>
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
    <section className="flex flex-col gap-3">
      <SectionTitle
        right={
          <Pill tone={earnedCount === badges.length ? 'correct' : 'ink'} icon="🏅">
            {earnedCount} of {badges.length}
          </Pill>
        }
      >
        {title}
      </SectionTitle>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4"
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
        'relative h-full px-3 pt-4 pb-3 text-center flex flex-col items-center gap-2',
        earned ? '' : '!bg-cream-100 !border-line/40 !border-dashed',
        isNew ? 'animate-pop' : '',
      ].join(' ')}
    >
      {/* NEW! ribbon for badges earned since last visit */}
      {isNew && (
        <span className="absolute -top-3 -right-2 z-10 rotate-6 rounded-full bg-wrong-400 text-ink-900 kid-text text-xs px-2.5 py-0.5 border-2 border-line shadow-ledge-sm">
          NEW!
        </span>
      )}

      <Medallion tone={earned ? 'quest' : 'cream'} size="lg" className={earned ? '' : 'opacity-80'}>
        {earned ? badge.emoji : '🔒'}
      </Medallion>

      <div className="kid-text text-base leading-tight text-ink-900">{badge.title}</div>

      {earned ? (
        <span className="kid-text text-sm rounded-full bg-correct-300 border-2 border-line px-2.5 leading-6">
          ✓ Earned!
        </span>
      ) : (
        <div className="text-sm leading-snug text-ink-700">{badge.description}</div>
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
  return (
    <Modal open={badge != null} onClose={onClose} label={badge?.title ?? 'Badge'}>
      {badge && (
        <div className="relative p-7 text-center overflow-hidden rounded-toon">
          {badge.earned && (
            <div
              className="absolute left-1/2 top-16 -translate-x-1/2 -translate-y-1/2 w-64 h-64 sunburst animate-spin-slow pointer-events-none"
              aria-hidden="true"
            />
          )}
          <Medallion tone={badge.earned ? 'quest' : 'cream'} size="xl" className="relative mb-3">
            {badge.earned ? badge.emoji : '🔒'}
          </Medallion>

          <h2 className="relative kid-text font-bold text-2xl text-ink-900 mb-2">{badge.title}</h2>

          <div className="relative flex justify-center mb-3">
            <Pill tone={badge.earned ? 'correct' : 'ocean'} icon={badge.earned ? '✅' : '🎯'}>
              {badge.earned ? 'Earned!' : 'How to earn'}
            </Pill>
          </div>

          <p className="relative text-ink-700 text-lg mb-6">{badge.description}</p>

          <Button variant="primary" size="lg" onClick={onClose} className="relative w-full justify-center">
            {badge.earned ? 'Awesome! 🎉' : 'Got it! 👍'}
          </Button>
        </div>
      )}
    </Modal>
  )
}

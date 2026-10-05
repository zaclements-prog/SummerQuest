import { curriculum } from '../curriculum'

/**
 * Badge / achievement catalog. Every badge is DERIVED from progress the game
 * already tracks (zone mastery, stars, streak, answers, coins) — earning is
 * computed, never separately persisted, so badges can't desync from real play.
 *
 * Names are drawn from the gamification framework + worksheet "Gamification
 * Ideas" (Multiplication Master, Reading Ranger, Fraction Chef, Science
 * Explorer, Writing Warrior, Week Warrior, …).
 */

export interface Badge {
  id: string
  emoji: string
  title: string
  /** How to earn it — shown on locked badges. */
  description: string
  category: 'zone' | 'milestone'
}

export interface BadgeStatus extends Badge {
  earned: boolean
}

/** Minimal shape this module needs from the progress store (kept local to avoid coupling). */
export interface BadgeCtx {
  zones: Record<string, { stages: Record<string, { stars: number }> }>
  stats: { problemsAnswered: number; streakDays: number; bestStreak?: number }
  /** Cumulative coins ever earned (monotonic) so a "collector" badge can't be un-earned by spending. */
  totalCoinsEarned: number
}

const ZONE_BADGES: { zoneId: string; emoji: string; title: string }[] = [
  { zoneId: 'multiplication-mesa', emoji: '✖️', title: 'Multiplication Master' },
  { zoneId: 'division-dunes', emoji: '➗', title: 'Division Dynamo' },
  { zoneId: 'fraction-falls', emoji: '🍕', title: 'Fraction Chef' },
  { zoneId: 'place-value-plateau', emoji: '🔢', title: 'Place Value Pro' },
  { zoneId: 'measurement-marsh', emoji: '📏', title: 'Measurement Master' },
  { zoneId: 'geometry-grove', emoji: '🔷', title: 'Geometry Genius' },
  { zoneId: 'data-delta', emoji: '📊', title: 'Data Detective' },
  { zoneId: 'word-problem-woods', emoji: '🧩', title: 'Word Problem Whiz' },
  { zoneId: 'reading-reef', emoji: '📖', title: 'Reading Ranger' },
  { zoneId: 'writing-workshop', emoji: '✍️', title: 'Writing Warrior' },
  { zoneId: 'science-summit', emoji: '🔬', title: 'Science Explorer' },
  { zoneId: 'tower-battlefront', emoji: '🏰', title: 'Tower Champion' },
]

function clearedStages(zone?: { stages: Record<string, { stars: number }> }): number {
  if (!zone) return 0
  return Object.values(zone.stages).filter((s) => s.stars > 0).length
}

function zoneMastered(ctx: BadgeCtx, zoneId: string, expectedStages: number): boolean {
  return clearedStages(ctx.zones[zoneId]) >= expectedStages && expectedStages > 0
}

function totalStars(ctx: BadgeCtx): number {
  let s = 0
  for (const z of Object.values(ctx.zones)) for (const st of Object.values(z.stages)) s += st.stars
  return s
}

function anyStageWithStars(ctx: BadgeCtx, n: number): boolean {
  for (const z of Object.values(ctx.zones)) for (const st of Object.values(z.stages)) if (st.stars >= n) return true
  return false
}

function clearedStageCount(ctx: BadgeCtx): number {
  let c = 0
  for (const z of Object.values(ctx.zones)) c += clearedStages(z)
  return c
}

function masteredZoneCount(ctx: BadgeCtx): number {
  let c = 0
  for (const zone of curriculum.zones) {
    if (zoneMastered(ctx, zone.id, zone.stages.length)) c++
  }
  return c
}

export function computeBadges(ctx: BadgeCtx): BadgeStatus[] {
  const stars = totalStars(ctx)

  const zoneBadges: BadgeStatus[] = ZONE_BADGES.map((zb) => {
    const zone = curriculum.zones.find((z) => z.id === zb.zoneId)
    const expected = zone?.stages.length ?? 3
    return {
      id: `zone-${zb.zoneId}`,
      emoji: zb.emoji,
      title: zb.title,
      category: 'zone',
      description: `Master every stage of ${zone?.title ?? zb.title}.`,
      earned: zoneMastered(ctx, zb.zoneId, expected),
    }
  })

  const milestones: BadgeStatus[] = [
    {
      id: 'first-steps',
      emoji: '👣',
      title: 'First Steps',
      description: 'Finish your very first stage.',
      earned: clearedStageCount(ctx) >= 1,
    },
    {
      id: 'perfect',
      emoji: '💯',
      title: 'Perfect!',
      description: 'Earn 3 stars on any stage.',
      earned: anyStageWithStars(ctx, 3),
    },
    {
      id: 'star-collector',
      emoji: '⭐',
      title: 'Star Collector',
      description: 'Earn 25 stars in all.',
      earned: stars >= 25,
    },
    {
      id: 'superstar',
      emoji: '🌟',
      title: 'Superstar',
      description: 'Earn 50 stars in all.',
      earned: stars >= 50,
    },
    {
      id: 'week-warrior',
      emoji: '🔥',
      title: 'Week Warrior',
      description: 'Play 7 days in a row.',
      // Best-ever streak, so the badge isn't taken away when a streak later breaks.
      earned: Math.max(ctx.stats.streakDays, ctx.stats.bestStreak ?? 0) >= 7,
    },
    {
      id: 'century-club',
      emoji: '💪',
      title: 'Century Club',
      description: 'Answer 100 questions.',
      earned: ctx.stats.problemsAnswered >= 100,
    },
    {
      id: 'coin-collector',
      emoji: '🪙',
      title: 'Coin Collector',
      description: 'Earn 200 coins in all.',
      earned: ctx.totalCoinsEarned >= 200,
    },
    {
      id: 'grand-champion',
      emoji: '👑',
      title: 'Grand Champion',
      description: 'Master every zone on the map.',
      earned: masteredZoneCount(ctx) >= curriculum.zones.length,
    },
  ].map((m) => ({ ...m, category: 'milestone' as const }))

  return [...zoneBadges, ...milestones]
}

export function earnedBadgeIds(ctx: BadgeCtx): string[] {
  return computeBadges(ctx)
    .filter((b) => b.earned)
    .map((b) => b.id)
}

/**
 * Explorer level system. XP is DERIVED from progress the game already tracks
 * (correct answers + stars earned) — no extra persisted state, so it works
 * retroactively and can never drift out of sync with actual progress.
 *
 * Titles come from the gamification framework ("Explorer → Adventurer …") and
 * the integrated lesson plan ("Junior → Senior → Master Explorer").
 */

export interface ZoneLike {
  stages: Record<string, { stars: number }>
}

export interface LevelInfo {
  /** 1-based level number. */
  level: number
  title: string
  xp: number
  /** XP accumulated past the start of the current level. */
  xpIntoLevel: number
  /** XP span of the current level (Infinity at the max level). */
  xpForLevel: number
  /** 0..1 progress toward the next level (1 at max level). */
  progress: number
  /** Title of the next level, or undefined at max. */
  nextTitle?: string
  isMax: boolean
}

const TIERS: { title: string; minXp: number }[] = [
  { title: 'Explorer', minXp: 0 },
  { title: 'Adventurer', minXp: 100 },
  { title: 'Pathfinder', minXp: 250 },
  { title: 'Trailblazer', minXp: 450 },
  { title: 'Navigator', minXp: 700 },
  { title: 'Voyager', minXp: 1000 },
  { title: 'Master Explorer', minXp: 1400 },
]

const XP_PER_CORRECT = 5
const XP_PER_STAR = 20

export function totalStars(zones: Record<string, ZoneLike>): number {
  let s = 0
  for (const z of Object.values(zones)) {
    for (const st of Object.values(z.stages)) s += st.stars
  }
  return s
}

export function computeXp(problemsCorrect: number, starsTotal: number): number {
  return problemsCorrect * XP_PER_CORRECT + starsTotal * XP_PER_STAR
}

export function levelFromXp(xp: number): LevelInfo {
  let idx = 0
  for (let i = 0; i < TIERS.length; i++) {
    if (xp >= TIERS[i].minXp) idx = i
  }
  const tier = TIERS[idx]
  const next = TIERS[idx + 1]
  const isMax = !next
  const xpIntoLevel = xp - tier.minXp
  const xpForLevel = isMax ? Infinity : next.minXp - tier.minXp
  const progress = isMax ? 1 : Math.min(1, xpIntoLevel / xpForLevel)
  return {
    level: idx + 1,
    title: tier.title,
    xp,
    xpIntoLevel,
    xpForLevel,
    progress,
    nextTitle: next?.title,
    isMax,
  }
}

/** Convenience: derive the full level info straight from progress fields. */
export function levelFromProgress(
  problemsCorrect: number,
  zones: Record<string, ZoneLike>,
): LevelInfo {
  return levelFromXp(computeXp(problemsCorrect, totalStars(zones)))
}

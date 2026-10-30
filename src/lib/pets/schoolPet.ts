import { addDays, localDayKey } from '../dates'
import { attemptCredit, weeklyFocus, withinDays } from '../analytics'
import { isLessonFor } from '../../tutoring/lessons'
import type { GradeLevel } from '../gradeTiers'
import type { SessionRecord, SkillAttempt } from '../../store/progress'
import type { PetGrowth } from './growth'
import type { PetStage } from './types'

/**
 * The Schoolhouse pet: a raven that grows from Schoolhouse practice instead of
 * one zone's stars. It keeps its own small record in the store (`schoolPet`),
 * because what grows it (a skill leaving This Week's Focus, a Daily Challenge)
 * isn't kept anywhere else for good: the attempt log is capped and This Week's
 * Focus is a rolling 7-day window.
 *
 * | Stage | When                                                                  |
 * |-------|-----------------------------------------------------------------------|
 * | egg   | nothing yet                                                           |
 * | baby  | whichever comes first: a skill was cleared (it dropped off This       |
 * |       | Week's Focus because its accuracy recovered: ≥ 80 % over its last 7   |
 * |       | days, at least 4 tries, at the moment of a practice answer), or 3     |
 * |       | Daily Challenges were played (one a day)                              |
 * | kid   | hatched, and 5 "school points" (Daily Challenges + cleared skills)    |
 * | adult | 15 school points AND at least one full clear: the whole focus list   |
 * |       | went from non-empty to empty because of practice                     |
 *
 * Hatching is an event, not just a count: `hatched` flips when a clear or a
 * Daily Challenge brings the raven over the line, so the hatch always happens
 * as the child plays and its celebration shows (a save migrated to v5 with 3+
 * dailies already played stays an egg until the next daily or clear).
 *
 * Why these numbers: a zone pet becomes a kid at 5 stars and grows up when the
 * zone is complete (≈ 10–15 stars). 3 Daily Challenges hatch the egg even for
 * a child who never has a skill weak enough to land on This Week's Focus (the
 * owner's call, 2026-10-23). 5 points is about a school week of Daily
 * Challenges (or a few dailies and a cleared skill or two); 15 is three weeks
 * of steady Schoolhouse visits. The full clear makes "grown up" mean the child
 * really worked through everything they were stuck on at least once, which is
 * also the moment of the "finished everything" reward.
 *
 * Fair counting:
 * - A clear is judged at one instant: the focus list just before an answer vs
 *   just after it, at the same `now`. Time passing can't clear a skill (a
 *   skill that ages out of the 7-day window simply leaves; it never counts),
 *   and neither can a grade change (it isn't an answer).
 * - The same skill counts again only after 7 days (`SKILL_CLEAR_COOLDOWN_DAYS`),
 *   so wobbling around 80 % can't farm points.
 * - A Daily Challenge counts once a day (the claim is once a day).
 * - Counters only grow, so the raven never shrinks.
 */

/** The Schoolhouse pet's creature id (in `CREATURES` and the model registry). */
export const SCHOOL_PET_ID = 'raven'

/** Daily Challenges that hatch the egg (as does a single cleared skill, whichever comes first). */
export const RAVEN_HATCH_DAILIES = 3
/** School points (Daily Challenges + cleared skills) that grow a hatched raven into a kid. */
export const RAVEN_KID_POINTS = 5
/** School points a grown-up raven needs (and at least one full clear: `RAVEN_ADULT_FULL_CLEARS`). */
export const RAVEN_ADULT_POINTS = 15
/** Whole-focus-list clears a grown-up raven needs. */
export const RAVEN_ADULT_FULL_CLEARS = 1
/** A skill's clear counts again only this many days after its last counted clear. */
export const SKILL_CLEAR_COOLDOWN_DAYS = 7

/** The "finished everything" reward: coins for clearing the whole focus list (at most once a week). */
export const FOCUS_REWARD_COINS = 30
/** Days between two "finished everything" rewards. */
export const FOCUS_REWARD_COOLDOWN_DAYS = 7
/** The badge for clearing the whole focus list (see lib/badges). */
export const FOCUS_BADGE_ID = 'focus-finisher'

/** What the store keeps for the raven (and the reward). */
export interface SchoolPetProgress {
  /** Skills whose clear counted: skillId → the day (local YYYY-MM-DD) it last counted. */
  clearedSkills: Record<string, string>
  /** Clears that counted (each skill at most once per `SKILL_CLEAR_COOLDOWN_DAYS`). */
  clears: number
  /** Daily Challenges finished (one a day). */
  dailies: number
  /** Times the whole focus list was cleared by practice. */
  fullClears: number
  /** The day the last "finished everything" reward was paid (null: never). */
  rewardDay: string | null
  /** A paid reward whose celebration hasn't shown yet. */
  rewardPending: boolean
  /**
   * The egg has hatched: set by the clear or Daily Challenge that met the hatch
   * rule (`meetsHatch`), never by a migration, so every hatch is celebrated.
   */
  hatched: boolean
}

export function emptySchoolPet(): SchoolPetProgress {
  return { clearedSkills: {}, clears: 0, dailies: 0, fullClears: 0, rewardDay: null, rewardPending: false, hatched: false }
}

/**
 * The slice growth reads (so tests can pass less). Without `hatched`, the egg
 * counts as hatched exactly when the counters meet the hatch rule.
 */
export type SchoolPetLike = Pick<SchoolPetProgress, 'clears' | 'dailies' | 'fullClears'> & { hatched?: boolean }

/** The counters meet the hatch rule: a cleared skill, or `RAVEN_HATCH_DAILIES` Daily Challenges. */
export function meetsHatch(p: Pick<SchoolPetProgress, 'clears' | 'dailies'>): boolean {
  return p.clears >= 1 || p.dailies >= RAVEN_HATCH_DAILIES
}

/** Daily Challenges + cleared skills. */
export function schoolPoints(p: SchoolPetLike | null | undefined): number {
  return Math.max(0, p?.clears ?? 0) + Math.max(0, p?.dailies ?? 0)
}

/** The pure rule: the raven's stage from its counters. */
export function ravenGrowth(p: SchoolPetLike | null | undefined): PetGrowth {
  if (!p || !(p.hatched ?? meetsHatch(p))) return 'egg'
  const points = schoolPoints(p)
  if (points >= RAVEN_ADULT_POINTS && p.fullClears >= RAVEN_ADULT_FULL_CLEARS) return 'adult'
  if (points >= RAVEN_KID_POINTS) return 'kid'
  return 'baby'
}

/** What the raven needs next. */
export interface SchoolPetNext {
  stage: PetStage
  /** More school points it needs (0: none, only the full clear). */
  more: number
  /** It still needs a whole-focus-list clear (only for growing up). */
  fullClear: boolean
}

export interface SchoolPetStatus {
  /** Marks the Schoolhouse pet's status (a zone pet's has none). */
  school: true
  pet: { creatureId: string; egg: { shell: string; spot: string } }
  stage: PetGrowth
  /** School points so far, and the ones for the next stage. */
  points: number
  goal: number
  clears: number
  dailies: number
  fullClears: number
  next: SchoolPetNext | null
}

/** The raven's egg: a chalkboard slate with chalk-white spots. */
export const SCHOOL_PET_EGG = { shell: '#c9cbe6', spot: '#6f6aae' } as const

export function schoolPetStatus(p: SchoolPetLike | null | undefined): SchoolPetStatus {
  const stage = ravenGrowth(p)
  const points = schoolPoints(p)
  const fullClears = Math.max(0, p?.fullClears ?? 0)
  let next: SchoolPetNext | null = null
  let goal = 0
  if (stage === 'egg') {
    // (more: Daily Challenges still to play; a cleared skill would do it too. A migrated
    // save with 3+ already hatches on its next one.)
    next = { stage: 'baby', more: Math.max(1, RAVEN_HATCH_DAILIES - Math.max(0, p?.dailies ?? 0)), fullClear: false }
  } else if (stage === 'baby') {
    goal = RAVEN_KID_POINTS
    next = { stage: 'kid', more: Math.max(1, RAVEN_KID_POINTS - points), fullClear: false }
  } else if (stage === 'kid') {
    goal = RAVEN_ADULT_POINTS
    next = { stage: 'adult', more: Math.max(0, RAVEN_ADULT_POINTS - points), fullClear: fullClears < RAVEN_ADULT_FULL_CLEARS }
  }
  return {
    school: true,
    pet: { creatureId: SCHOOL_PET_ID, egg: SCHOOL_PET_EGG },
    stage,
    points,
    goal,
    clears: Math.max(0, p?.clears ?? 0),
    dailies: Math.max(0, p?.dailies ?? 0),
    fullClears,
    next,
  }
}

// ── This Week's Focus, before and after an answer ────────────────────────────

/** Mirrors analytics' `weakSkills` thresholds: on the list below this accuracy… */
const FOCUS_MAX_ACCURACY = 80
/** …with at least this many tries in the last 7 days. */
const FOCUS_MIN_ATTEMPTS = 4

/**
 * This Week's Focus as the child sees it (the Schoolhouse, the Focus page):
 * the weakest skills of the last 7 days whose lesson is in their grade band.
 */
export function focusSkillIds(
  attempts: readonly SkillAttempt[],
  grade: GradeLevel | null | undefined,
  now: number,
  sessions: readonly SessionRecord[] = [],
): string[] {
  return weeklyFocus([...attempts], [...sessions], now)
    .filter((f) => isLessonFor(f.lessonId, grade))
    .map((f) => f.skillId)
}

/** The skill's accuracy recovered: enough tries in the last 7 days, at or above the bar. */
export function skillRecovered(attempts: readonly SkillAttempt[], skillId: string, now: number): boolean {
  let tries = 0
  let right = 0
  for (const a of withinDays([...attempts], 7, now)) {
    if (a.skillId !== skillId) continue
    tries++
    right += attemptCredit(a) // (a right answer after "Show me how" counts half, as on the list)
  }
  return tries >= FOCUS_MIN_ATTEMPTS && Math.round((right / tries) * 100) >= FOCUS_MAX_ACCURACY
}

/** What one answer did to This Week's Focus. */
export interface FocusChange {
  /** Skills that left the list because their accuracy recovered. */
  cleared: string[]
  /** The list went from non-empty to empty with this answer. */
  emptied: boolean
}

/**
 * Compare This Week's Focus just before and just after an answer, both at the
 * answer's moment (`now`), so only the answer can have changed it.
 */
export function focusChange(
  before: readonly SkillAttempt[],
  after: readonly SkillAttempt[],
  grade: GradeLevel | null | undefined,
  now: number,
): FocusChange {
  const was = focusSkillIds(before, grade, now)
  if (was.length === 0) return { cleared: [], emptied: false }
  const is = new Set(focusSkillIds(after, grade, now))
  const cleared = was.filter((id) => !is.has(id) && skillRecovered(after, id, now))
  return { cleared, emptied: is.size === 0 && cleared.length > 0 }
}

/** Patch to the store after an answer: the raven's new record, and whether the weekly reward is paid now. */
export function applyFocusChange(
  p: SchoolPetProgress,
  change: FocusChange,
  now: number,
): { next: SchoolPetProgress; reward: boolean } {
  if (change.cleared.length === 0 && !change.emptied) return { next: p, reward: false }
  const today = localDayKey(now)
  const clearedSkills = { ...p.clearedSkills }
  let clears = p.clears
  for (const id of change.cleared) {
    const last = clearedSkills[id]
    if (last && today < addDays(last, SKILL_CLEAR_COOLDOWN_DAYS)) continue
    clearedSkills[id] = today
    clears++
  }
  let { fullClears, rewardDay, rewardPending } = p
  let reward = false
  if (change.emptied) {
    fullClears++
    if (!rewardDay || today >= addDays(rewardDay, FOCUS_REWARD_COOLDOWN_DAYS)) {
      reward = true
      rewardDay = today
      rewardPending = true
    }
  }
  const hatched = p.hatched || meetsHatch({ clears, dailies: p.dailies })
  return { next: { ...p, clearedSkills, clears, fullClears, rewardDay, rewardPending, hatched }, reward }
}

/**
 * A finished Daily Challenge counts once a day (`claimedBefore` is the day
 * already claimed, if any), and hatches the egg once the hatch rule is met.
 */
export function applyDaily(p: SchoolPetProgress, claimedBefore: string | undefined, today: string): SchoolPetProgress {
  if (claimedBefore === today) return p
  const dailies = p.dailies + 1
  return { ...p, dailies, hatched: p.hatched || meetsHatch({ clears: p.clears, dailies }) }
}

// ── Saved data ───────────────────────────────────────────────────────────────

const count = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0)
const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)

/** A saved `schoolPet`, cleaned (anything malformed counts as nothing yet). */
export function cleanSchoolPet(v: unknown): SchoolPetProgress {
  const out = emptySchoolPet()
  if (!v || typeof v !== 'object' || Array.isArray(v)) return out
  const r = v as Record<string, unknown>
  if (r.clearedSkills && typeof r.clearedSkills === 'object' && !Array.isArray(r.clearedSkills)) {
    for (const [k, d] of Object.entries(r.clearedSkills as Record<string, unknown>)) if (isDay(d)) out.clearedSkills[k] = d
  }
  out.clears = count(r.clears)
  out.dailies = count(r.dailies)
  out.fullClears = count(r.fullClears)
  out.rewardDay = isDay(r.rewardDay) ? r.rewardDay : null
  out.rewardPending = r.rewardPending === true
  // (a record from before `hatched`: only a clear proves the egg hatched in play)
  out.hatched = r.hatched === true || (r.hatched === undefined && out.clears >= 1)
  return out
}

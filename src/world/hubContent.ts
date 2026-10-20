import { getZone, zoneStages } from '../curriculum'
import { isLessonFor, lessonsFor } from '../tutoring/lessons'
import { isStageUnlocked, playableStageId } from '../lib/stageLocks'
import { weeklyFocus } from '../lib/analytics'
import type { SessionRecord, SkillAttempt } from '../store/progress'
import type { GradeLevel } from '../lib/gradeTiers'

/**
 * Pure view-model builders for the in-world panels (WorldPanel.tsx), kept out of
 * the component so they're unit-testable.
 */

interface Progress {
  zones: Record<string, { stages: Record<string, { stars: number }> } | undefined>
  attempts: SkillAttempt[]
  sessions: SessionRecord[]
  /** The child's grade (`player.grade`): picks each zone's stage set. */
  grade: GradeLevel | null | undefined
}

export interface StageRow {
  stageId: string
  title: string
  kind: 'concept' | 'practice' | 'mastery'
  stars: number
  starsToEarn: number
  locked: boolean
  /** Route that plays this stage. */
  href: string
}

/** A zone's stages (for the child's grade) in order, with stars and the same lock rule the zone page uses. */
export function zoneStageRows(zoneId: string, p: Pick<Progress, 'zones' | 'grade'>): StageRow[] {
  const zone = getZone(zoneId)
  if (!zone) return []
  const zp = p.zones[zoneId]
  return zoneStages(zone, p.grade).map((s) => ({
    stageId: s.id,
    title: s.title,
    kind: s.kind,
    stars: zp?.stages[s.id]?.stars ?? 0,
    starsToEarn: s.starsToEarn,
    locked: !isStageUnlocked(zone, s.id, zp, p.grade),
    href: `/play/${zoneId}/${s.id}`,
  }))
}

export interface LessonRow {
  id: string
  title: string
  emoji: string
  recommended: boolean
  href: string
}

/**
 * The child's tutor lessons (their grade band's: `lessonsFor`), optionally a
 * subset — `only` lists lesson ids or zone ids (the Library: the reading and
 * writing zones' lessons, whichever the band) — recommended-by-the-coach first.
 */
export function lessonRows(p: Pick<Progress, 'attempts' | 'sessions'> & { grade?: Progress['grade'] }, only?: string[], now = Date.now()): LessonRow[] {
  const recommended = new Set(weeklyFocus(p.attempts, p.sessions, now).map((f) => f.lessonId))
  return lessonsFor(p.grade)
    .filter((l) => !only || only.includes(l.id) || only.includes(l.zoneId))
    .map((l) => ({ id: l.id, title: l.title, emoji: l.emoji, recommended: recommended.has(l.id), href: `/tutor/${l.id}` }))
    .sort((a, b) => Number(b.recommended) - Number(a.recommended))
}

export interface FocusRow {
  skillId: string
  label: string
  accuracy: number
  emoji: string
  practiceHref: string
  learnHref: string
}

/**
 * This Week's Focus, top `max` items, with practice links that respect stage
 * locks. Only skills whose lesson is in the child's band: a K child is never
 * sent to a grade-3 lesson.
 */
export function focusRows(p: Progress, max = 3, now = Date.now()): FocusRow[] {
  return weeklyFocus(p.attempts, p.sessions, now)
    .filter((f) => isLessonFor(f.lessonId, p.grade))
    .slice(0, max)
    .map((f) => {
      const zone = getZone(f.zoneId)
      const stageId = zone ? playableStageId(zone, f.practiceStageId, p.zones[f.zoneId], p.grade) : f.practiceStageId
      return {
        skillId: f.skillId,
        label: f.label,
        accuracy: f.accuracy,
        emoji: zone?.emoji ?? '🎯',
        practiceHref: `/play/${f.zoneId}/${stageId}`,
        learnHref: `/tutor/${f.lessonId}`,
      }
    })
}

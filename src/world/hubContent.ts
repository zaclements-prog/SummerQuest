import { getZone } from '../curriculum'
import { allLessons } from '../tutoring/lessons'
import { isStageUnlocked, playableStageId } from '../lib/stageLocks'
import { weeklyFocus } from '../lib/analytics'
import type { SessionRecord, SkillAttempt } from '../store/progress'

/**
 * Pure view-model builders for the in-world panels (WorldPanel.tsx), kept out of
 * the component so they're unit-testable.
 */

interface Progress {
  zones: Record<string, { stages: Record<string, { stars: number }> } | undefined>
  attempts: SkillAttempt[]
  sessions: SessionRecord[]
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

/** A zone's stages in order, with stars and the same lock rule the zone page uses. */
export function zoneStageRows(zoneId: string, p: Pick<Progress, 'zones'>): StageRow[] {
  const zone = getZone(zoneId)
  if (!zone) return []
  const zp = p.zones[zoneId]
  return zone.stages.map((s) => ({
    stageId: s.id,
    title: s.title,
    kind: s.kind,
    stars: zp?.stages[s.id]?.stars ?? 0,
    starsToEarn: s.starsToEarn,
    locked: !isStageUnlocked(zone, s.id, zp),
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

/** Tutor lessons (optionally a subset), recommended-by-the-coach first. */
export function lessonRows(p: Pick<Progress, 'attempts' | 'sessions'>, only?: string[], now = Date.now()): LessonRow[] {
  const recommended = new Set(weeklyFocus(p.attempts, p.sessions, now).map((f) => f.lessonId))
  return allLessons
    .filter((l) => !only || only.includes(l.id))
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

/** This Week's Focus, top `max` items, with practice links that respect stage locks. */
export function focusRows(p: Progress, max = 3, now = Date.now()): FocusRow[] {
  return weeklyFocus(p.attempts, p.sessions, now)
    .slice(0, max)
    .map((f) => {
      const zone = getZone(f.zoneId)
      const stageId = zone ? playableStageId(zone, f.practiceStageId, p.zones[f.zoneId]) : f.practiceStageId
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

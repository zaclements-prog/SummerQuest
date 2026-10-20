import { getZone } from '../curriculum'
import type { Zone } from '../curriculum/types'
import { playableStageId } from '../lib/stageLocks'
import type { GradeLevel } from '../lib/gradeTiers'
import type { Lesson } from './types'

type ZoneProgressLike = { stages: Record<string, { stars: number }> } | undefined

/**
 * Where a lesson's "Now practice" goes for a child of this grade: its practice
 * stage when that is open in the zone's stage set for the grade's band, or else
 * the first stage there the child hasn't cleared (`playableStageId`). Always a
 * stage of the child's own band: a lesson opened from another band (a link, a
 * grade change) never lands on another band's stage.
 */
export function practiceStageFor(
  lesson: Pick<Lesson, 'zoneId' | 'practiceStageId'>,
  zoneProgress: ZoneProgressLike,
  grade: GradeLevel | null | undefined,
  zone: Zone | undefined = getZone(lesson.zoneId),
): string {
  return zone ? playableStageId(zone, lesson.practiceStageId, zoneProgress, grade) : lesson.practiceStageId
}

/** The route of a lesson's practice (see `practiceStageFor`). */
export function practiceHref(lesson: Pick<Lesson, 'zoneId' | 'practiceStageId'>, zoneProgress: ZoneProgressLike, grade: GradeLevel | null | undefined): string {
  return `/play/${lesson.zoneId}/${practiceStageFor(lesson, zoneProgress, grade)}`
}

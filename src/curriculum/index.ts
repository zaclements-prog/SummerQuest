import type { Curriculum, Stage, Zone } from './types'
import { multiplicationZone } from './multiplication'
import { divisionZone } from './division'
import { fractionZone } from './fraction'
import { wordProblemZone } from './wordProblem'
import { placeValueZone } from './placeValue'
import { measurementZone } from './measurement'
import { geometryZone } from './geometry'
import { dataGraphZone } from './dataGraph'
import { readingZone } from './reading'
import { writingZone } from './writing'
import { scienceZone } from './science'
import { towerDefenseZone } from './towerDefense'
import { bandFallbacks, contentBand } from '../lib/gradeBand'
import { DEFAULT_GRADE, gradeSpanText, type GradeLevel } from '../lib/gradeTiers'
import { OFFERED_GRADES } from '../lib/features'

export const curriculum: Curriculum = {
  id: 'summer-quest',
  title: 'Summer Quest',
  // "2nd-to-4th grade" while a build offers only 2–4 (lib/features)
  gradeRange: gradeSpanText(OFFERED_GRADES),
  zones: [
    multiplicationZone,
    divisionZone,
    fractionZone,
    placeValueZone,
    measurementZone,
    geometryZone,
    dataGraphZone,
    wordProblemZone,
    readingZone,
    writingZone,
    scienceZone,
    towerDefenseZone,
  ],
}

export function getZone(id: string) {
  return curriculum.zones.find((z) => z.id === id)
}

/**
 * The stages a zone plays at a grade — THE way to read a zone's stages. The
 * grade's content band (lib/gradeBand) picks the set: kindergarten, 1st and
 * 5th grade play their own (`zone.stagesByBand`) once one is authored (1st
 * grade with none plays kindergarten's), everything else (and a band with no
 * set yet) plays `zone.stages`, the 2nd–4th grade set. A
 * missing grade counts as DEFAULT_GRADE. Stars live under stage ids, which
 * differ per band, so a child who changes grade keeps every star and sees
 * each band's again on switching back.
 */
export function zoneStages(zone: Pick<Zone, 'stages' | 'stagesByBand'>, grade: GradeLevel | null | undefined): Stage[] {
  const band = contentBand(grade ?? DEFAULT_GRADE)
  if (band === 'g24') return zone.stages
  for (const b of bandFallbacks(band)) {
    const set = b === 'g24' ? undefined : zone.stagesByBand?.[b]
    if (set && set.length > 0) return set
  }
  return zone.stages
}

/**
 * A zone's name at a grade: its band's own name when it has one (K–1 plays
 * Multiplication Mesa as "Counting Mesa"), else `zone.title`. A missing grade
 * counts as DEFAULT_GRADE.
 */
export function zoneTitle(zone: Pick<Zone, 'title' | 'titleByBand'>, grade: GradeLevel | null | undefined): string {
  for (const b of bandFallbacks(contentBand(grade ?? DEFAULT_GRADE))) {
    const t = zone.titleByBand?.[b]
    if (t) return t
  }
  return zone.title
}

/** A stage of the zone's set for this grade (another band's stage isn't found). */
export function getStage(zoneId: string, stageId: string, grade: GradeLevel | null | undefined) {
  const zone = getZone(zoneId)
  return zone ? zoneStages(zone, grade).find((s) => s.id === stageId) : undefined
}

export * from './types'

import { curriculum, zoneStages } from '../curriculum'
import type { GradeLevel } from './gradeTiers'
import { isZoneSleeping } from './listenNav'

type ZonesProgress = Record<string, { stages: Record<string, { stars: number }> } | undefined>

/**
 * Where "Continue your quest" (and the map's "Next!" flag) goes: the first
 * stage, in island order, the child hasn't cleared yet (no star). Only once
 * every open stage has a star does it go back for the missing stars (the
 * first stage short of its full stars). A zone whose stages are all cleared
 * is finished for "continue": a 1-star stage never holds the child there
 * while new places wait. Null when everything has every star.
 */
export function findNextTarget(
  zonesProgress: ZonesProgress,
  grade: GradeLevel | null | undefined,
): { zoneId: string; stageId: string } | null {
  const open = curriculum.zones.filter((zone) => zone.available && !isZoneSleeping(zone, grade))
  const starsOf = (zoneId: string, stageId: string) => zonesProgress[zoneId]?.stages[stageId]?.stars ?? 0
  for (const unfinished of [
    (stars: number) => stars === 0,
    (stars: number, starsToEarn: number) => stars < starsToEarn,
  ]) {
    for (const zone of open) {
      // (K–1: a sleeping place has nothing to play yet — filtered above)
      for (const stage of zoneStages(zone, grade)) {
        if (unfinished(starsOf(zone.id, stage.id), stage.starsToEarn)) return { zoneId: zone.id, stageId: stage.id }
      }
    }
  }
  return null
}

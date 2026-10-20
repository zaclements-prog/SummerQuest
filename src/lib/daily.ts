import { curriculum, zoneStages } from '../curriculum'
import { localDayKey } from './dates'
import { DEFAULT_GRADE, type GradeLevel } from './gradeTiers'
import { contentBand } from './gradeBand'

/** Daily Challenge constants + helpers (kept out of the component file so Fast Refresh stays happy). */

export const DAILY_BONUS = 30
export const DAILY_QUESTION_COUNT = 5

export function todayStr(): string {
  return localDayKey()
}

/**
 * Today's challenge: a deterministic per-day pick (the whole app agrees on it) of a
 * zone and the stage whose problems feed the 5-question quiz, from each zone's
 * stage set for the child's grade (`zoneStages`). Only multiple-choice stages
 * qualify — writing prompts have no answer options to quiz on. K–1 picks only
 * from zones that have a K–1 stage set (the others are still sleeping for them).
 */
export function pickTodaysChallenge(grade: GradeLevel | null | undefined, day: string = todayStr()) {
  const k1 = contentBand(grade ?? DEFAULT_GRADE) === 'k1'
  const eligible = curriculum.zones.flatMap((zone) => {
    if (k1 && !zone.stagesByBand?.k1?.length) return []
    const stage = zoneStages(zone, grade).find((s) => s.gameId !== 'writingPad')
    return stage ? [{ zone, stage }] : []
  })
  let h = 0
  for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) >>> 0
  return eligible[h % eligible.length]
}

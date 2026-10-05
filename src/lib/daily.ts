import { curriculum } from '../curriculum'
import { localDayKey } from './dates'

/** Daily Challenge constants + helpers (kept out of the component file so Fast Refresh stays happy). */

export const DAILY_BONUS = 30
export const DAILY_QUESTION_COUNT = 5

export function todayStr(): string {
  return localDayKey()
}

/**
 * Today's challenge: a deterministic per-day pick (the whole app agrees on it) of a
 * zone and the stage whose problems feed the 5-question quiz. Only multiple-choice
 * stages qualify — writing prompts have no answer options to quiz on.
 */
export function pickTodaysChallenge(day: string = todayStr()) {
  const eligible = curriculum.zones.flatMap((zone) => {
    const stage = zone.stages.find((s) => s.gameId !== 'writingPad')
    return stage ? [{ zone, stage }] : []
  })
  let h = 0
  for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) >>> 0
  return eligible[h % eligible.length]
}

import { curriculum } from '../curriculum'
import { localDayKey } from './dates'

/** Daily Challenge constants + helpers (kept out of the component file so Fast Refresh stays happy). */

export const DAILY_BONUS = 30
export const DAILY_QUESTION_COUNT = 5

export function todayStr(): string {
  return localDayKey()
}

/** Deterministic per-day pick so the whole app shows the same subject each day. */
export function pickTodaysZone() {
  const key = todayStr()
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return curriculum.zones[h % curriculum.zones.length]
}

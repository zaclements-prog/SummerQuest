/**
 * Daily time goal: two 15-minute learning sessions per day (30 min total).
 * Time is accumulated by the play clock (src/lib/usePlayClock.ts) only while the
 * child is on an active learning screen (a quiz/game stage, the daily challenge,
 * or a tutor lesson) and the tab is visible and they're interacting. Time in the
 * Home, on the map, or in menus does not count. Resets each calendar day.
 */

export const SESSION_SECONDS = 15 * 60
export const SESSIONS_PER_DAY = 2
export const GOAL_SECONDS = SESSION_SECONDS * SESSIONS_PER_DAY
export const SESSION_BONUS_COINS = 25

export interface DailyGoalProgress {
  secondsToday: number
  minutesToday: number
  goalMinutes: number
  completedSessions: number
  goalMet: boolean
  /** One entry per session: minutes into that 15-min block + whether it's full. */
  segments: { index: number; minutes: number; seconds: number; full: boolean }[]
}

export function computeDailyGoal(secondsToday: number): DailyGoalProgress {
  const s = Math.max(0, secondsToday)
  const completedSessions = Math.min(SESSIONS_PER_DAY, Math.floor(s / SESSION_SECONDS))
  const segments = Array.from({ length: SESSIONS_PER_DAY }, (_, i) => {
    const segSecs = Math.max(0, Math.min(SESSION_SECONDS, s - i * SESSION_SECONDS))
    return {
      index: i,
      seconds: segSecs,
      minutes: Math.floor(segSecs / 60),
      full: segSecs >= SESSION_SECONDS,
    }
  })
  return {
    secondsToday: s,
    minutesToday: Math.floor(Math.min(s, GOAL_SECONDS) / 60),
    goalMinutes: GOAL_SECONDS / 60,
    completedSessions,
    goalMet: completedSessions >= SESSIONS_PER_DAY,
    segments,
  }
}

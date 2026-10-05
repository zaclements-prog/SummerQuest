/**
 * Calendar-day helpers. Every "today" in the app (streak, daily challenge, the
 * daily learning-time goal, per-day charts) is a day in the player's LOCAL time
 * zone — a UTC day (`toISOString().slice(0, 10)`) rolls over mid-afternoon or
 * evening in the Americas.
 */

const pad = (n: number) => String(n).padStart(2, '0')

/** YYYY-MM-DD for the given moment (default: now) in local time. */
export function localDayKey(at: Date | number = new Date()): string {
  const d = typeof at === 'number' ? new Date(at) : at
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Shift a YYYY-MM-DD key by whole calendar days (DST-safe). */
export function addDays(dayKey: string, days: number): string {
  const [y, m, d] = dayKey.split('-').map(Number)
  return localDayKey(new Date(y, m - 1, d + days))
}

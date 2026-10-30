/**
 * Snack Shack's clock math (src/games/SnackShack.tsx, the Clock Tower orders):
 * times are whole minutes after midnight, so crossing the hour, noon and
 * a.m. / p.m. are plain arithmetic. Pure; the draggable clock and the order
 * generator (src/lib/providers/snackShack.ts) share it.
 *
 * A clock either runs on 12 hours (`span` 720: no a.m. / p.m., 1st to 3rd
 * grade) or on the whole day (`span` 1440: 4th and 5th grade, where the hands
 * going past 12 turn a.m. into p.m.).
 */

export const HALF_DAY = 720
export const DAY = 1440

export type ClockSpan = typeof HALF_DAY | typeof DAY

/** `t` folded into one turn of the clock's span. */
export function wrapTime(t: number, span: ClockSpan): number {
  return ((Math.round(t) % span) + span) % span
}

/** The hour as a 12-hour clock shows it (1–12). */
export function hour12(t: number): number {
  return Math.floor(wrapTime(t, HALF_DAY) / 60) || 12
}

/** "10:15", or with `meridiem` "10:15 a.m." (12:00 p.m. is noon). */
export function fmtTime(t: number, meridiem = false): string {
  const m = wrapTime(t, DAY)
  const s = `${hour12(m)}:${String(m % 60).padStart(2, '0')}`
  return meridiem ? `${s} ${m < HALF_DAY ? 'a.m.' : 'p.m.'}` : s
}

/** a.m. (before noon) or p.m. */
export function isPm(t: number): boolean {
  return wrapTime(t, DAY) >= HALF_DAY
}

/** The two hands' angles in degrees clockwise from 12. The hour hand creeps between the hours. */
export function handAngles(t: number): { hour: number; minute: number } {
  const m = wrapTime(t, HALF_DAY)
  return { hour: (m / 60) * 30, minute: (m % 60) * 6 }
}

/** The signed shortest turn from angle `a` to `b` (degrees, −180…180]. */
export function turnBetween(a: number, b: number): number {
  let d = (b - a) % 360
  if (d > 180) d -= 360
  if (d <= -180) d += 360
  return d
}

/**
 * The geared clock: dragging the MINUTE hand by `deg` degrees moves the time
 * by deg / 6 minutes, and carries the hour hand with it (one turn of the long
 * hand is one hour). Not wrapped: callers keep a running (continuous) time
 * and snap it for display.
 */
export function turnMinuteHand(t: number, deg: number): number {
  return t + deg / 6
}

/** Dragging the HOUR hand by `deg` degrees: 30° is one hour. */
export function turnHourHand(t: number, deg: number): number {
  return t + deg * 2
}

/** A running time snapped to the clock's step (5 minutes, or 30 for 1st grade), wrapped into its span. */
export function snapTime(t: number, step: number, span: ClockSpan): number {
  return wrapTime(Math.round(t / step) * step, span)
}

/**
 * After an hour-hand drag: keep the minutes the clock had (`minutePart`)
 * and move by whole hours only.
 */
export function snapHours(t: number, minutePart: number, span: ClockSpan): number {
  return wrapTime(minutePart + Math.round((t - minutePart) / 60) * 60, span)
}

/** Two clock times are the same on this clock (a 12-hour clock ignores a.m. / p.m.). */
export function sameTime(a: number, b: number, span: ClockSpan): boolean {
  return wrapTime(a, span) === wrapTime(b, span)
}

/**
 * How a length of time is said in a story: "45 minutes", "1 hour",
 * "2 hours 15 minutes", "5 and a half hours"; `minutesOnly` says the whole
 * thing in minutes ("150 minutes", 5th grade's unit change).
 */
export function durationText(hours: number, minutes: number, style: 'plain' | 'half' | 'minutesOnly' = 'plain'): string {
  if (style === 'minutesOnly') return `${hours * 60 + minutes} minutes`
  if (style === 'half' && minutes === 30) return hours === 0 ? 'half an hour' : `${hours} and a half hours`
  const h = hours === 0 ? '' : `${hours} hour${hours === 1 ? '' : 's'}`
  const m = minutes === 0 ? '' : `${minutes} minute${minutes === 1 ? '' : 's'}`
  return [h, m].filter(Boolean).join(' ') || '0 minutes'
}

/** The time at the end crosses into the next hour from the start (10:45 + 30 min → 11:15). */
export function crossesHour(start: number, minutes: number): boolean {
  return (start % 60) + (minutes % 60) >= 60 || minutes >= 60
}

/** The span from `start` to `end` passes 12 noon (start before noon, end at or after it). */
export function crossesNoon(start: number, end: number): boolean {
  return start < HALF_DAY && end >= HALF_DAY
}

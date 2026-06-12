import type { SessionRecord } from '../store/progress'

/**
 * Pure aggregations over the recorded session history. Drives the per-session
 * review (the log) and the trend analysis (the charts) on the Progress screen.
 */

function acc(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0
}

function dayKey(at: number): string {
  return new Date(at).toISOString().slice(0, 10)
}

function dayLabel(key: string): string {
  const [, m, d] = key.split('-')
  return `${Number(m)}/${Number(d)}`
}

export interface Overall {
  sessions: number
  correct: number
  total: number
  accuracy: number
  stars: number
}

export function overall(sessions: SessionRecord[]): Overall {
  const correct = sessions.reduce((s, r) => s + r.correct, 0)
  const total = sessions.reduce((s, r) => s + r.total, 0)
  const stars = sessions.reduce((s, r) => s + r.stars, 0)
  return { sessions: sessions.length, correct, total, accuracy: acc(correct, total), stars }
}

export interface DayAgg {
  day: string
  label: string
  sessions: number
  questions: number
  correct: number
  accuracy: number
}

/** Group sessions by calendar day (ascending), keeping the most recent `lastN` active days. */
export function byDay(sessions: SessionRecord[], lastN = 7): DayAgg[] {
  const map = new Map<string, DayAgg>()
  for (const r of sessions) {
    const day = dayKey(r.at)
    const a =
      map.get(day) ??
      { day, label: dayLabel(day), sessions: 0, questions: 0, correct: 0, accuracy: 0 }
    a.sessions += 1
    a.questions += r.total
    a.correct += r.correct
    map.set(day, a)
  }
  const arr = [...map.values()].sort((x, y) => x.day.localeCompare(y.day))
  for (const a of arr) a.accuracy = acc(a.correct, a.questions)
  return arr.slice(-lastN)
}

export interface SubjectAgg {
  zoneId: string
  zoneTitle: string
  zoneEmoji: string
  sessions: number
  correct: number
  total: number
  accuracy: number
  stars: number
}

/** Per-subject performance, sorted by how much it's been played. */
export function bySubject(sessions: SessionRecord[]): SubjectAgg[] {
  const map = new Map<string, SubjectAgg>()
  for (const r of sessions) {
    const a =
      map.get(r.zoneId) ??
      {
        zoneId: r.zoneId,
        zoneTitle: r.zoneTitle,
        zoneEmoji: r.zoneEmoji,
        sessions: 0,
        correct: 0,
        total: 0,
        accuracy: 0,
        stars: 0,
      }
    a.sessions += 1
    a.correct += r.correct
    a.total += r.total
    a.stars += r.stars
    map.set(r.zoneId, a)
  }
  const arr = [...map.values()]
  for (const a of arr) a.accuracy = acc(a.correct, a.total)
  return arr.sort((x, y) => y.sessions - x.sessions)
}

export interface RecentPoint {
  accuracy: number
  emoji: string
  correct: number
  total: number
}

/** The last `n` quizzes in chronological order, for an accuracy-trend chart. */
export function recentAccuracy(sessions: SessionRecord[], n = 8): RecentPoint[] {
  return sessions.slice(-n).map((r) => ({
    accuracy: acc(r.correct, r.total),
    emoji: r.zoneEmoji,
    correct: r.correct,
    total: r.total,
  }))
}

import type { SkillAttempt } from '../store/progress'
import { skillMeta } from '../tutoring/skills'

const DAY_MS = 86_400_000

export function withinDays<T extends { at: number }>(items: T[], days: number, now = Date.now()): T[] {
  const cutoff = now - days * DAY_MS
  return items.filter((i) => i.at >= cutoff)
}

export interface WeakSkill {
  skillId: string
  label: string
  attempts: number
  correct: number
  accuracy: number
}

export function weakSkills(
  attempts: SkillAttempt[],
  opts: { days?: number; minAttempts?: number; max?: number; maxAccuracy?: number; now?: number } = {},
): WeakSkill[] {
  const { days = 7, minAttempts = 4, max = 5, maxAccuracy = 80, now = Date.now() } = opts
  const recent = withinDays(attempts, days, now)
  const map = new Map<string, WeakSkill>()
  for (const a of recent) {
    const w = map.get(a.skillId) ?? { skillId: a.skillId, label: a.skillLabel, attempts: 0, correct: 0, accuracy: 0 }
    w.attempts += 1
    w.correct += a.correct ? 1 : 0
    map.set(a.skillId, w)
  }
  const arr = [...map.values()].filter((w) => w.attempts >= minAttempts)
  for (const w of arr) w.accuracy = Math.round((w.correct / w.attempts) * 100)
  // Only surface skills the student is actually struggling with (accuracy below the
  // mastery bar) — a student acing everything should see an empty focus list.
  return arr
    .filter((w) => w.accuracy < maxAccuracy)
    .sort((x, y) => x.accuracy - y.accuracy || y.attempts - x.attempts)
    .slice(0, max)
}

export interface FocusItem extends WeakSkill {
  zoneId: string
  lessonId: string
  practiceStageId: string
}

export function weeklyFocus(
  attempts: SkillAttempt[],
  _sessions: SessionRecord[],
  now = Date.now(),
): FocusItem[] {
  return weakSkills(attempts, { now }).map((w) => {
    const m = skillMeta(w.skillId)
    return { ...w, label: w.label || m.label, zoneId: m.zoneId, lessonId: m.lessonId, practiceStageId: m.practiceStageId }
  })
}

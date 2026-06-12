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

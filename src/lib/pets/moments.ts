import type { PetMoment } from './growth'

/**
 * When pet celebrations may show: only at calm moments, never in the middle
 * of a game (`/play/*`, `/daily`) or a lesson. The lesson-complete card in
 * `/tutor/<id>` is calm; the rest of that screen is not.
 */
export function isCalmRoute(pathname: string, lessonCompleteOpen: boolean): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if (path === '/world' || path === '/map' || path === '/home' || path === '/pets' || path === '/tutor') return true
  if (path.startsWith('/zone/')) return true
  if (path.startsWith('/tutor/')) return lessonCompleteOpen
  return false
}

/**
 * More than this many waiting at once → one summary card. (One at a time made a
 * queue that popped up again on every screen after; several now batch into one.)
 */
export const MAX_QUEUED_MOMENTS = 1

export type MomentShow = { kind: 'one'; moment: PetMoment } | { kind: 'summary'; moments: PetMoment[] }

/** What to show next for these waiting moments (null: nothing waiting). */
export function nextMomentShow(pending: readonly PetMoment[]): MomentShow | null {
  if (pending.length === 0) return null
  if (pending.length > MAX_QUEUED_MOMENTS) return { kind: 'summary', moments: [...pending] }
  return { kind: 'one', moment: pending[0] }
}

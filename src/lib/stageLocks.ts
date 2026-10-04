import type { Zone } from '../curriculum/types'

/** Minimal progress shape needed (matches ZoneProgress in the store). */
type ZoneProgressLike = { stages: Record<string, { stars: number }> } | undefined

const cleared = (p: ZoneProgressLike, stageId: string) => (p?.stages[stageId]?.stars ?? 0) > 0

/**
 * A stage is playable once the stage before it has at least one star. A stage
 * that already has stars always stays playable (e.g. one reached via a tutor link).
 */
export function isStageUnlocked(zone: Zone, stageId: string, progress: ZoneProgressLike): boolean {
  const idx = zone.stages.findIndex((s) => s.id === stageId)
  if (idx < 0) return false
  if (idx === 0) return true
  return cleared(progress, stageId) || cleared(progress, zone.stages[idx - 1].id)
}

/**
 * Where to send a kid who wants to practice `preferredStageId` (tutor "Now practice",
 * weekly-focus links): that stage if it's unlocked, otherwise the first stage they
 * haven't cleared yet — which is always unlocked.
 */
export function playableStageId(zone: Zone, preferredStageId: string, progress: ZoneProgressLike): string {
  if (isStageUnlocked(zone, preferredStageId, progress)) return preferredStageId
  return (zone.stages.find((s) => !cleared(progress, s.id)) ?? zone.stages[0]).id
}

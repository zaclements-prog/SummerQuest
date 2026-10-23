import { curriculum, zoneStages } from '../curriculum'
import type { Stage, Zone } from '../curriculum/types'
import { weakFacts, type FactStats } from './adaptive'
import { findNextTarget } from './continueTarget'
import { effectiveConfigForStage, type GradeLevel } from './gradeTiers'
import { isZoneSleeping } from './listenNav'
import { isStageUnlocked } from './stageLocks'
import { parseMultFactId } from './providers/multiplication'
import { parseDivFactId } from './providers/division'
import { parseFracEqFactId } from './providers/fractionEquivalence'
import { parseFracCmpFactId } from './providers/fractionCompare'
import type { ProviderConfig } from './providers'

/**
 * The quest the World suggests: one stage, one tap to start it.
 *
 * - A new child (no stage played yet in their grade's places) gets the
 *   first stage of the first open place: their FIRST quest, right after setup.
 * - A returning child gets TODAY's quest, the first of:
 *   1. `missedFacts`: a stage they've played that asks the fact they've been
 *      missing most (adaptive.ts's weak facts: 2nd–4th grade's ×, ÷ and
 *      fraction facts);
 *   2. `almostStar`: a stage they tried but haven't earned a star on yet;
 *   3. `nextStage` / `moreStars`: where "Continue your quest" goes (the first
 *      uncleared stage, then the first one short of its stars).
 * - Null once every star is in: nothing to suggest, free play.
 *
 * Pure: the store keeps the day's pick (`quest`), so it doesn't change under
 * the child mid-day.
 */

export type QuestReason = 'first' | 'missedFacts' | 'almostStar' | 'nextStage' | 'moreStars'

export interface QuestPick {
  zoneId: string
  stageId: string
  reason: QuestReason
}

type ZonesLike = Record<string, { stages: Record<string, { stars: number; attempts?: number }> } | undefined>

export interface QuestInput {
  zones: ZonesLike
  factStats?: FactStats
  grade: GradeLevel | null | undefined
  now?: number
}

/** Places open at this grade (K–1: a sleeping place has nothing to play yet). */
function openZones(grade: GradeLevel | null | undefined): Zone[] {
  return curriculum.zones.filter((zone) => zone.available && !isZoneSleeping(zone, grade))
}

/** Can a stage with this provider config ask the fact `factId`? */
function servesFact(cfg: ProviderConfig, factId: string): boolean {
  switch (cfg.kind) {
    case 'multiplication':
      return parseMultFactId(factId, cfg) !== null
    case 'division':
      return parseDivFactId(factId, cfg) !== null
    case 'fractionEquivalence':
      return parseFracEqFactId(factId, cfg) !== null
    case 'fractionCompare':
      return parseFracCmpFactId(factId, cfg) !== null
    default:
      return false
  }
}

export function chooseQuest({ zones, factStats = {}, grade, now = Date.now() }: QuestInput): QuestPick | null {
  const open = openZones(grade)
  const played: { zone: Zone; stage: Stage; index: number; stars: number }[] = []
  for (const zone of open) {
    zoneStages(zone, grade).forEach((stage, index) => {
      const rec = zones[zone.id]?.stages[stage.id]
      if (rec && ((rec.attempts ?? 0) > 0 || rec.stars > 0) && isStageUnlocked(zone, stage.id, zones[zone.id], grade)) {
        played.push({ zone, stage, index, stars: rec.stars })
      }
    })
  }

  if (played.length === 0) {
    const first = open.map((zone) => ({ zone, stage: zoneStages(zone, grade)[0] })).find((z) => z.stage)
    return first ? { zoneId: first.zone.id, stageId: first.stage.id, reason: 'first' } : null
  }

  for (const { factId } of weakFacts(factStats, now)) {
    const hit = played.find((p) => servesFact(effectiveConfigForStage(p.stage, p.index, grade), factId))
    if (hit) return { zoneId: hit.zone.id, stageId: hit.stage.id, reason: 'missedFacts' }
  }

  const tried = played.find((p) => p.stars === 0)
  if (tried) return { zoneId: tried.zone.id, stageId: tried.stage.id, reason: 'almostStar' }

  const next = findNextTarget(zones, grade)
  if (!next) return null
  const stars = zones[next.zoneId]?.stages[next.stageId]?.stars ?? 0
  return { ...next, reason: stars === 0 ? 'nextStage' : 'moreStars' }
}

/** Is a stored pick still a stage of this grade's open places (the grade may have changed)? */
export function questStillValid(pick: Pick<QuestPick, 'zoneId' | 'stageId'>, grade: GradeLevel | null | undefined): boolean {
  const zone = openZones(grade).find((z) => z.id === pick.zoneId)
  return !!zone && zoneStages(zone, grade).some((s) => s.id === pick.stageId)
}

import { getZone, zoneStages } from '../../curriculum'
import type { Zone } from '../../curriculum'
import type { GradeLevel } from '../gradeTiers'
import { PETS } from './catalog'
import type { PetDef } from './catalog'
import type { PetStage } from './types'

/**
 * How far a pet has grown, derived from learning progress (never stored):
 *
 * | Stage | When                                                              |
 * |-------|-------------------------------------------------------------------|
 * | egg   | nothing yet                                                       |
 * | baby  | the zone's lesson is finished, or the zone has its first star     |
 * | kid   | stars ≥ min(5, total − 1) (5 in most zones, 2 in Tower Battlefront) |
 * | adult | stars ≥ total: the zone is complete (the zone celebration's test) |
 *
 * `stars` counts each of the zone's stages up to its `starsToEarn` (a stage
 * that over-reports can't finish the zone for another), and `total` is the
 * zone's maximum. The stages are the zone's set for the child's grade
 * (`zoneStages`): a pet grows from its zone's current band, and stars from
 * another band count again when the child switches back.
 */
export type PetGrowth = 'egg' | PetStage

export const GROWTH_ORDER: readonly PetGrowth[] = ['egg', 'baby', 'kid', 'adult']

/** 0 (egg) … 3 (adult); anything unknown counts as an egg. */
export function growthRank(g: PetGrowth | string | null | undefined): number {
  const i = GROWTH_ORDER.indexOf(g as PetGrowth)
  return i < 0 ? 0 : i
}

/** True for a known growth value (a saved `petsSeen` entry may be anything). */
export function isPetGrowth(v: unknown): v is PetGrowth {
  return typeof v === 'string' && (GROWTH_ORDER as readonly string[]).includes(v)
}

// Structural slices of the progress store, so this stays pure (and testable without it).
export interface StageStarsLike {
  stars: number
}
export interface ZoneProgressLike {
  stages: Record<string, StageStarsLike | undefined>
}
export type ZonesLike = Record<string, ZoneProgressLike | undefined>
export type LessonsDoneLike = Record<string, number | undefined>

export interface ZoneStarTotals {
  /** Stars earned, each stage counted up to its `starsToEarn`. */
  earned: number
  /** The zone's maximum. */
  total: number
  /** Every star earned (the zone celebration, and a grown-up pet). */
  complete: boolean
}

/**
 * A zone's star totals at a grade: each stage of its set for that grade
 * (`zoneStages`; null: the default grade) counts up to its `starsToEarn` (bad
 * values count as none); records of other bands' stages, or of stages the
 * zone no longer has, are ignored.
 */
export function zoneStarTotals(
  zone: Pick<Zone, 'stages' | 'stagesByBand'>,
  progress: ZoneProgressLike | null | undefined,
  grade: GradeLevel | null | undefined,
): ZoneStarTotals {
  let earned = 0
  let total = 0
  for (const stage of zoneStages(zone, grade)) {
    const max = Math.max(0, stage.starsToEarn)
    const got = progress?.stages[stage.id]?.stars ?? 0
    earned += Number.isFinite(got) ? Math.min(max, Math.max(0, Math.floor(got))) : 0
    total += max
  }
  return { earned, total, complete: total > 0 && earned >= total }
}

/** Stars that make a kid: min(5, total − 1), and never fewer than the first star. */
export function kidStarsFor(total: number): number {
  return Math.max(1, Math.min(5, total - 1))
}

/** The pure rule: a pet's stage from its zone's stars and whether its lesson is done. */
export function growthFromStars(stars: number, total: number, lessonDone: boolean): PetGrowth {
  if (total > 0 && stars >= total) return 'adult'
  if (total > 0 && stars >= kidStarsFor(total)) return 'kid'
  if (stars >= 1 || lessonDone) return 'baby'
  return 'egg'
}

export interface PetNext {
  /** The stage it grows into next. */
  stage: PetStage
  /** More stars (in its zone) it still needs. */
  more: number
  /** Finishing its lesson would do it instead (an egg with a lesson). */
  lesson: boolean
}

export interface PetStatus {
  pet: PetDef
  stage: PetGrowth
  /** Its zone's stars (capped per stage) and maximum. */
  stars: number
  total: number
  lessonDone: boolean
  /** What comes next; null once grown up (or when its zone has no stars to earn). */
  next: PetNext | null
}

type ZoneLookup = (id: string) => Pick<Zone, 'stages' | 'stagesByBand'> | undefined

/** One pet's growth (from its zone's stages for `grade`), and what it needs next. */
export function petStatus(
  pet: PetDef,
  zones: ZonesLike,
  lessonsDone: LessonsDoneLike,
  grade: GradeLevel | null | undefined,
  zoneLookup: ZoneLookup = getZone,
): PetStatus {
  const zone = zoneLookup(pet.zoneId)
  const { earned, total } = zone ? zoneStarTotals(zone, zones[pet.zoneId], grade) : { earned: 0, total: 0 }
  const lessonDone = !!pet.lessonId && lessonsDone[pet.lessonId] != null
  const stage = growthFromStars(earned, total, lessonDone)
  let next: PetNext | null = null
  if (stage === 'egg') next = { stage: 'baby', more: 1, lesson: !!pet.lessonId }
  else if (stage === 'baby' && total > 0) next = { stage: 'kid', more: kidStarsFor(total) - earned, lesson: false }
  else if (stage === 'kid') next = { stage: 'adult', more: total - earned, lesson: false }
  return { pet, stage, stars: earned, total, lessonDone, next }
}

/** Every pet's status at a grade, in catalog order. */
export function petStatuses(
  zones: ZonesLike,
  lessonsDone: LessonsDoneLike,
  grade: GradeLevel | null | undefined,
  zoneLookup: ZoneLookup = getZone,
): PetStatus[] {
  return PETS.map((p) => petStatus(p, zones, lessonsDone, grade, zoneLookup))
}

/** creatureId → its derived stage at a grade, for every pet. */
export function petStages(
  zones: ZonesLike,
  lessonsDone: LessonsDoneLike,
  grade: GradeLevel | null | undefined,
  zoneLookup: ZoneLookup = getZone,
): Record<string, PetGrowth> {
  const out: Record<string, PetGrowth> = {}
  for (const s of petStatuses(zones, lessonsDone, grade, zoneLookup)) out[s.pet.creatureId] = s.stage
  return out
}

/** A growth moment the child hasn't seen celebrated yet. */
export interface PetMoment {
  creatureId: string
  /** The stage last celebrated (an egg when never). */
  from: PetGrowth
  /** Its stage now. */
  to: PetGrowth
}

/** Pets whose stage is ahead of the one last celebrated, in catalog order. */
export function pendingMoments(stages: Record<string, PetGrowth>, seen: Record<string, PetGrowth | undefined>): PetMoment[] {
  const out: PetMoment[] = []
  for (const p of PETS) {
    const to = stages[p.creatureId] ?? 'egg'
    const from = isPetGrowth(seen[p.creatureId]) ? (seen[p.creatureId] as PetGrowth) : 'egg'
    if (growthRank(to) > growthRank(from)) out.push({ creatureId: p.creatureId, from, to })
  }
  return out
}

/**
 * The stage a pet shows in the Home room and the World: the one last
 * celebrated (never more than its stage now). A pet that grew while you were
 * busy learning keeps its old look until its celebration reveals the new one,
 * and a just-hatched pet only comes out once you've seen it hatch.
 */
export function shownStage(stage: PetGrowth, seen: PetGrowth | undefined): PetGrowth {
  const s = isPetGrowth(seen) ? seen : 'egg'
  return growthRank(s) < growthRank(stage) ? s : stage
}

/** Creatures whose pet is grown up (they belong among the avatars). */
export function adultPets(stages: Record<string, PetGrowth>): string[] {
  return PETS.filter((p) => stages[p.creatureId] === 'adult').map((p) => p.creatureId)
}

/** Creatures whose pet has hatched (any stage but egg), in catalog order. */
export function hatchedPets(stages: Record<string, PetGrowth>): string[] {
  return PETS.filter((p) => growthRank(stages[p.creatureId]) > 0).map((p) => p.creatureId)
}

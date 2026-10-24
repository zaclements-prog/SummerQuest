import { getZone, zoneStages } from '../../curriculum'
import type { Stage, Zone } from '../../curriculum'
import type { GradeLevel } from '../gradeTiers'
import { PETS, PET_IDS } from './catalog'
import type { PetDef } from './catalog'
import type { PetStage } from './types'
import { isLessonFor } from '../../tutoring/lessons'
import { SCHOOL_PET_ID, ravenGrowth } from './schoolPet'
import type { SchoolPetLike, SchoolPetStatus } from './schoolPet'

/**
 * How far a pet has grown, derived from learning progress (never stored):
 *
 * | Stage | When                                                              |
 * |-------|-------------------------------------------------------------------|
 * | egg   | nothing yet                                                       |
 * | baby  | one of the zone's lessons is finished, or the zone has a star     |
 * | kid   | stars ≥ min(5, total − 1) (5 in most zones, 2 in Tower Battlefront) |
 * | adult | stars ≥ total: the zone is complete (the zone celebration's test) |
 *
 * `stars` counts each stage up to its `starsToEarn` (a stage that
 * over-reports can't finish the zone for another), and `total` is the
 * maximum, both over ONE stage set: a zone has a set per content band
 * (2–4 always; K–1 and 5 once authored, `zone.stagesByBand`). A pet's stage is
 * the BEST it reaches in any of its zone's bands, so changing grade never
 * shrinks a pet. Bands are never added together: 2 stars in K and 3 in 2–4 are
 * 3, not 5.
 *
 * What it needs next (`next`, and the `stars` / `total` shown with it) is
 * counted in the child's CURRENT band (`zoneStages(zone, grade)`): the stars
 * they can earn from where they are.
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
  return stageSetTotals(zoneStages(zone, grade), progress)
}

/** Every stage set the zone has: 2–4's, then kindergarten's, 1st grade's and 5th grade's once authored (never an empty one). */
export function zoneStageSets(zone: Pick<Zone, 'stages' | 'stagesByBand'>): Stage[][] {
  const sets = [zone.stages]
  for (const band of ['k1', 'g1', 'g5'] as const) {
    const set = zone.stagesByBand?.[band]
    if (set && set.length > 0 && set !== zone.stages) sets.push(set)
  }
  return sets
}

/** The star totals of one stage set (each stage up to its `starsToEarn`). */
export function stageSetTotals(stages: readonly Stage[], progress: ZoneProgressLike | null | undefined): ZoneStarTotals {
  let earned = 0
  let total = 0
  for (const stage of stages) {
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
  /** Finishing its lesson would do it instead (an egg with a lesson this grade is offered). */
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

/** Any of the pet's lessons is finished (a 2–4 or a K–1 one: either hatches it). */
export function petLessonDone(pet: Pick<PetDef, 'lessonIds'>, lessonsDone: LessonsDoneLike): boolean {
  return pet.lessonIds.some((id) => lessonsDone[id] != null)
}

/**
 * One pet's growth (the best over its zone's bands), and what it needs next
 * in the band of `grade` (with that band's `stars` and `total`).
 */
export function petStatus(
  pet: PetDef,
  zones: ZonesLike,
  lessonsDone: LessonsDoneLike,
  grade: GradeLevel | null | undefined,
  zoneLookup: ZoneLookup = getZone,
): PetStatus {
  const zone = zoneLookup(pet.zoneId)
  const progress = zones[pet.zoneId]
  const lessonDone = petLessonDone(pet, lessonsDone)
  // the best stage over every band's set (a max, never a sum)
  let stage: PetGrowth = growthFromStars(0, 0, lessonDone)
  for (const set of zone ? zoneStageSets(zone) : []) {
    const t = stageSetTotals(set, progress)
    const g = growthFromStars(t.earned, t.total, lessonDone)
    if (growthRank(g) > growthRank(stage)) stage = g
  }
  // …and what comes next, counted in the child's current band
  const { earned, total } = zone ? zoneStarTotals(zone, progress, grade) : { earned: 0, total: 0 }
  let next: PetNext | null = null
  // (only a lesson this grade is offered: the dragon's one lesson is K–1's Counting Towers)
  if (stage === 'egg') next = { stage: 'baby', more: 1, lesson: pet.lessonIds.some((id) => isLessonFor(id, grade)) }
  else if (stage === 'baby' && total > 0) next = { stage: 'kid', more: Math.max(1, kidStarsFor(total) - earned), lesson: false }
  else if (stage === 'kid' && total > 0) next = { stage: 'adult', more: Math.max(1, total - earned), lesson: false }
  return { pet, stage, stars: earned, total, lessonDone, next }
}

/** Every pet's status (its stage is the same at every grade; `next` is the grade's band), in catalog order. */
export function petStatuses(
  zones: ZonesLike,
  lessonsDone: LessonsDoneLike,
  grade: GradeLevel | null | undefined,
  zoneLookup: ZoneLookup = getZone,
): PetStatus[] {
  return PETS.map((p) => petStatus(p, zones, lessonsDone, grade, zoneLookup))
}

/** creatureId → its derived stage, for every pet (a grade change never moves one: the best band counts). */
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

/** What every pet grows from: the zones' stars, finished lessons, and the Schoolhouse raven's record. */
export interface PetProgressLike {
  zones: ZonesLike
  lessonsDone: LessonsDoneLike
  schoolPet?: SchoolPetLike | null
}

/**
 * creatureId → stage for EVERY pet: the zone pets (`petStages`, best band) and
 * the Schoolhouse raven (`ravenGrowth`).
 */
export function allPetStages(p: PetProgressLike, zoneLookup: ZoneLookup = getZone): Record<string, PetGrowth> {
  return { ...petStages(p.zones, p.lessonsDone, null, zoneLookup), [SCHOOL_PET_ID]: ravenGrowth(p.schoolPet) }
}

/** A zone pet's status or the Schoolhouse raven's. */
export type AnyPetStatus = PetStatus | SchoolPetStatus

export function isSchoolStatus(s: AnyPetStatus): s is SchoolPetStatus {
  return 'school' in s && s.school === true
}

/** A growth moment the child hasn't seen celebrated yet. */
export interface PetMoment {
  creatureId: string
  /** The stage last celebrated (an egg when never). */
  from: PetGrowth
  /** Its stage now. */
  to: PetGrowth
}

/** Pets whose stage is ahead of the one last celebrated, in catalog order (the raven last). */
export function pendingMoments(stages: Record<string, PetGrowth>, seen: Record<string, PetGrowth | undefined>): PetMoment[] {
  const out: PetMoment[] = []
  for (const id of PET_IDS) {
    const to = stages[id] ?? 'egg'
    const from = isPetGrowth(seen[id]) ? (seen[id] as PetGrowth) : 'egg'
    if (growthRank(to) > growthRank(from)) out.push({ creatureId: id, from, to })
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
  return PET_IDS.filter((id) => stages[id] === 'adult')
}

/** Creatures whose pet has hatched (any stage but egg), in catalog order. */
export function hatchedPets(stages: Record<string, PetGrowth>): string[] {
  return PET_IDS.filter((id) => growthRank(stages[id]) > 0)
}

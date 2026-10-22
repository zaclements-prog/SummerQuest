import { creatureById } from '../home/catalog'

/**
 * The twelve zone pets (see docs/superpowers/specs/2026-10-18-pets-plan.md).
 * Every island zone has one egg; learning in that zone hatches it and grows the
 * pet (`growth.ts`). A grown-up pet joins the avatars you can play as.
 *
 * Listed in the island's zone order (the curriculum's), which is also the order
 * "Continue your quest" walks, so pets tend to hatch left to right on the Pets page.
 */
export interface PetDef {
  /** The creature it grows into (an id in `CREATURES`, and in the model registry). */
  creatureId: string
  /** The zone whose stars grow it (in any of the zone's bands: see growth.ts). */
  zoneId: string
  /**
   * The Tutor lessons that also hatch it: the zone's 2nd–4th grade lesson and,
   * for the kindergarten pilot's zones, its K–1 lesson. Finishing any one of
   * them does it. Tower Battlefront has none.
   */
  lessonIds: readonly string[]
  /** Its egg's colors: a soft shell and darker spots, picked to suit the zone. */
  egg: { shell: string; spot: string }
}

export const PETS: readonly PetDef[] = [
  { creatureId: 'lion', zoneId: 'multiplication-mesa', lessonIds: ['multiplication', 'kCounting'], egg: { shell: '#ffe594', spot: '#f2a65a' } },
  { creatureId: 'trex', zoneId: 'division-dunes', lessonIds: ['division', 'kCompare'], egg: { shell: '#f6e3b4', spot: '#c7955f' } },
  { creatureId: 'frog', zoneId: 'fraction-falls', lessonIds: ['fractions', 'kAddTake', 'g1Shares', 'g5Fractions'], egg: { shell: '#b4ebdc', spot: '#4aa6d6' } },
  { creatureId: 'unicorn', zoneId: 'place-value-plateau', lessonIds: ['placeValue', 'kTeens', 'g1Tens', 'g5Decimals'], egg: { shell: '#fcd3e2', spot: '#b79af0' } },
  { creatureId: 'bear', zoneId: 'measurement-marsh', lessonIds: ['measurement', 'kMeasure', 'g1Measure'], egg: { shell: '#c9e7b8', spot: '#6fbb63' } },
  { creatureId: 'panda', zoneId: 'geometry-grove', lessonIds: ['geometry', 'kShapes', 'g1Shapes'], egg: { shell: '#ddcdf7', spot: '#8461b6' } },
  { creatureId: 'fox', zoneId: 'data-delta', lessonIds: ['dataGraph', 'kSorting', 'g1Graphs'], egg: { shell: '#ffd9c7', spot: '#f2766b' } },
  { creatureId: 'owl', zoneId: 'word-problem-woods', lessonIds: ['wordProblem', 'kStoryMath'], egg: { shell: '#e9dcc4', spot: '#9a6a46' } },
  { creatureId: 'octopus', zoneId: 'reading-reef', lessonIds: ['reading', 'kLetters', 'kRhymes', 'g1Reading'], egg: { shell: '#ffc9b8', spot: '#f7a1c4' } },
  { creatureId: 'dragonet', zoneId: 'writing-workshop', lessonIds: ['writing', 'kTracing', 'g1Writing'], egg: { shell: '#cfe8fb', spot: '#8ab8ff' } },
  { creatureId: 'tiger', zoneId: 'science-summit', lessonIds: ['science', 'kScience', 'g1Science'], egg: { shell: '#fff0c2', spot: '#f2a65a' } },
  { creatureId: 'dragon', zoneId: 'tower-battlefront', lessonIds: ['kTowers'], egg: { shell: '#ffd0c4', spot: '#c94c42' } },
]

/** The pet that grows into this creature (every creature is one zone's pet). */
export function petById(creatureId: string | null | undefined): PetDef | undefined {
  return creatureId ? PETS.find((p) => p.creatureId === creatureId) : undefined
}

/** A pet's display name and emoji (from the creature roster). */
export function petName(creatureId: string): string {
  return creatureById(creatureId)?.name ?? creatureId
}
export function petEmoji(creatureId: string): string {
  return creatureById(creatureId)?.emoji ?? '🐾'
}

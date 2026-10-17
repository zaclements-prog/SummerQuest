/**
 * Grade tiers: the single static-difficulty table for the whole game.
 *
 * A student's grade is chosen once on their profile (store: `player.grade`) and
 * scales the difficulty KNOBS that stage configs leave abstract. Curriculum stays
 * flat — same zones, same stages, same unlock ladder — `effectiveConfig(stage, grade)`
 * resolves a stage's providerConfig into concrete per-grade numbers right before
 * `createProvider`. See docs/superpowers/specs/2026-10-12-grade-tiers-design.md.
 *
 * Pure: no store or React imports (providers/tests can use it freely).
 */

import type { ProviderConfig } from './providers'
import type { Stage } from '../curriculum/types'

export type GradeLevel = 2 | 3 | 4

export const GRADE_LEVELS: GradeLevel[] = [2, 3, 4]

export function isGradeLevel(v: unknown): v is GradeLevel {
  return v === 2 || v === 3 || v === 4
}

/** Friendly names for UI copy ("2nd grade"). */
export const GRADE_LABEL: Record<GradeLevel, string> = {
  2: '2nd grade',
  3: '3rd grade',
  4: '4th grade',
}

export interface Tier {
  /** Multiplication / division factor ceiling (min is the tier's floor). */
  multMin: number
  multMax: number
  divMin: number
  divMax: number
  /** Fraction difficulty per kind. */
  fracEquivMaxDenom: number
  fracCompareMaxDenom: number
  /** Place value. */
  pvIdentifyMaxPlace: 1000 | 10000 | 100000
  pvRoundMaxPlace: 1000 | 10000 | 100000
  pvRoundTo: 10 | 100 | 1000
  /** measurement kind per stage slot (concept vs mixed). */
  measureConcept: 'area' | 'perimeter'
  /**
   * Static-bank (geometry/dataGraph/reading/science) level per stage index:
   * [concept, practice, mastery]. Keeps the within-zone ramp (level up on later
   * stages) instead of flattening every stage to one level. Providers fall back
   * to easier shelves (then harder) when a bank has no items at the requested
   * level — so grades whose content isn't authored yet still serve questions.
   */
  bankLevels: [number, number, number]
  /** word-problem topic mix: G2 stays add/subtract, G3+ keep mult/div. */
  wpTopic: 'addSubtract' | 'multiplication' | 'division' | 'mixed'
}

export const GRADE_TIERS: Record<GradeLevel, Tier> = {
  2: {
    multMin: 2, multMax: 5,
    divMin: 2, divMax: 5,
    fracEquivMaxDenom: 8,
    fracCompareMaxDenom: 8,
    pvIdentifyMaxPlace: 1000,
    pvRoundMaxPlace: 1000,
    pvRoundTo: 10,
    measureConcept: 'area', // 2.G.A.2: area as tiling/counting unit squares
    bankLevels: [2, 2, 3],
    wpTopic: 'addSubtract',
  },
  3: {
    multMin: 2, multMax: 10,
    divMin: 2, divMax: 10,
    fracEquivMaxDenom: 12,
    fracCompareMaxDenom: 10,
    pvIdentifyMaxPlace: 10000,
    pvRoundMaxPlace: 10000,
    pvRoundTo: 100,
    measureConcept: 'area',
    bankLevels: [3, 3, 4],
    wpTopic: 'mixed',
  },
  4: {
    multMin: 3, multMax: 12,
    divMin: 2, divMax: 12,
    fracEquivMaxDenom: 16,
    fracCompareMaxDenom: 12,
    pvIdentifyMaxPlace: 100000,
    pvRoundMaxPlace: 100000,
    pvRoundTo: 1000,
    measureConcept: 'area',
    bankLevels: [3, 4, 4],
    wpTopic: 'mixed',
  },
}

/** Fallback for any code path without a profile (defaults to today's behavior). */
export const DEFAULT_GRADE: GradeLevel = 4

/**
 * Resolve a stage's providerConfig into grade-specific numbers.
 * `stageIndex` picks the bank level for static-bank zones (the concept →
 * practice → mastery ramp); identity for configs with no difficulty knobs.
 */
export function effectiveConfig(
  config: ProviderConfig,
  grade: GradeLevel,
  stageIndex = 0,
): ProviderConfig {
  const t = GRADE_TIERS[grade]
  switch (config.kind) {
    case 'multiplication':
      return { ...config, factorMin: t.multMin, factorMax: t.multMax }
    case 'division':
      return {
        ...config,
        divisorMin: t.divMin,
        divisorMax: t.divMax,
        quotientMin: t.divMin,
        quotientMax: t.divMax,
      }
    case 'fractionEquivalence':
      return { ...config, maxDenominator: t.fracEquivMaxDenom }
    case 'fractionCompare':
      return { ...config, maxDenominator: t.fracCompareMaxDenom }
    case 'placeValueIdentify':
      return { ...config, maxPlace: t.pvIdentifyMaxPlace }
    case 'placeValueRounding':
      return { ...config, maxPlace: t.pvRoundMaxPlace, roundTo: t.pvRoundTo }
    case 'measurement':
      return config.type === 'mixed' ? config : { ...config, type: t.measureConcept }
    case 'wordProblem':
      return { ...config, topic: t.wpTopic }
    case 'readingComprehension':
    case 'science':
    case 'geometry':
    case 'dataGraph': {
      const idx = Math.min(stageIndex, 2)
      return { ...config, level: t.bankLevels[idx] as 2 | 3 | 4 }
    }
    case 'writingPrompt':
    case 'scienceCycle':
    case 'multiplicationGrove':
      return config
  }
}

/** Convenience for call sites that have a Stage + its zone index + a profile grade. */
export function effectiveConfigForStage(
  stage: Stage,
  stageIndex: number,
  grade: GradeLevel | null | undefined,
): ProviderConfig {
  return effectiveConfig(stage.providerConfig, grade ?? DEFAULT_GRADE, stageIndex)
}

/**
 * Pick the bank level a static provider should actually serve: the requested
 * level if the bank has items there, else the nearest EASIER level with items,
 * else the nearest HARDER one. Lets a grade go live zone-by-zone as content is
 * authored without ever handing a provider an empty pool.
 */
export function pickLevel(requested: number, availableLevels: number[]): number {
  const uniq = [...new Set(availableLevels)]
  if (uniq.includes(requested)) return requested
  const easier = uniq.filter((l) => l < requested).sort((a, b) => b - a)[0]
  if (easier !== undefined) return easier
  const harder = uniq.filter((l) => l > requested).sort((a, b) => a - b)[0]
  if (harder !== undefined) return harder
  throw new Error('pickLevel: no levels available')
}

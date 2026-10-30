/**
 * Grade tiers: the single static-difficulty table for the whole game.
 *
 * A student's grade is chosen once on their profile (store: `player.grade`) and
 * scales the difficulty KNOBS that stage configs leave abstract. Within a content
 * band (lib/gradeBand: K–1, 2–4, 5; a zone's set is `zoneStages(zone, grade)`)
 * the curriculum stays flat — same zones, same stages, same unlock ladder —
 * and `effectiveConfig(stage, grade)` resolves a stage's providerConfig into
 * concrete per-grade numbers right before `createProvider`. See
 * docs/superpowers/specs/2026-10-12-grade-tiers-design.md and
 * docs/superpowers/specs/2026-10-19-k5-expansion-plan.md.
 *
 * Pure: no store or React imports (providers/tests can use it freely).
 */

import type { ProviderConfig } from './providers'
import type { Stage } from '../curriculum/types'
import { groveMaxFactor } from './grove/groveCore'

/** 0 is kindergarten; 1–5 are grades 1–5 (see lib/gradeBand for the K–1 / 2–4 / 5 bands). */
export type GradeLevel = 0 | 1 | 2 | 3 | 4 | 5

/** Every grade the engine knows. Which ones a build OFFERS is `lib/features` (`OFFERED_GRADES`). */
export const GRADE_LEVELS: GradeLevel[] = [0, 1, 2, 3, 4, 5]

export function isGradeLevel(v: unknown): v is GradeLevel {
  return typeof v === 'number' && (GRADE_LEVELS as number[]).includes(v)
}

/** Friendly names for UI copy ("2nd grade"). */
export const GRADE_LABEL: Record<GradeLevel, string> = {
  0: 'Kindergarten',
  1: '1st grade',
  2: '2nd grade',
  3: '3rd grade',
  4: '4th grade',
  5: '5th grade',
}

/** Short names for grade pickers: a letter or two to show big ("K", "1st"). */
export const GRADE_SHORT_LABEL: Record<GradeLevel, string> = {
  0: 'K',
  1: '1st',
  2: '2nd',
  3: '3rd',
  4: '4th',
  5: '5th',
}

/**
 * A run of grades in a sentence: "2nd, 3rd, or 4th grade" (up to three),
 * "kindergarten through 5th grade" (more). For the grades a build offers.
 */
export function gradeListText(grades: readonly GradeLevel[]): string {
  const g = [...new Set(grades)].sort((a, b) => a - b)
  if (g.length === 0) return ''
  const name = (x: GradeLevel) => (x === 0 ? 'kindergarten' : GRADE_SHORT_LABEL[x])
  const tail = g[g.length - 1] === 0 ? '' : ' grade'
  if (g.length > 3) return `${name(g[0])} through ${name(g[g.length - 1])}${tail}`
  if (g.length === 1) return `${name(g[0])}${tail}`
  return `${g.slice(0, -1).map(name).join(', ')}${g.length > 2 ? ',' : ''} or ${name(g[g.length - 1])}${tail}`
}

/**
 * The Welcome screen's grades: `gradeListText`, but never leading with
 * kindergarten (a 10-year-old who reads "kindergarten" first takes the game
 * for little kids): "1st through 5th grade, and kindergarten too";
 * "2nd, 3rd, or 4th grade" as before when there's no kindergarten.
 */
export function welcomeGradeText(grades: readonly GradeLevel[]): string {
  const older = grades.filter((g) => g !== 0)
  if (older.length === 0 || older.length === grades.length) return gradeListText(grades)
  return `${gradeListText(older)}, and kindergarten too`
}

/** The grade a child goes into after finishing `grade` ("1st" after K, "6th" after 5th). */
export function nextGradeShortLabel(grade: GradeLevel): string {
  return grade < 5 ? GRADE_SHORT_LABEL[(grade + 1) as GradeLevel] : '6th'
}

/** A compact span for meta copy: "2nd-to-4th grade", "K-to-5th grade". */
export function gradeSpanText(grades: readonly GradeLevel[]): string {
  const g = [...grades].sort((a, b) => a - b)
  if (g.length === 0) return ''
  const first = GRADE_SHORT_LABEL[g[0]]
  const last = GRADE_SHORT_LABEL[g[g.length - 1]]
  return g.length === 1 ? GRADE_LABEL[g[0]] : `${first}-to-${last} grade`
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
  bankLevels: [GradeLevel, GradeLevel, GradeLevel]
  /** word-problem topic mix: G2 stays add/subtract, G3+ keep mult/div. */
  wpTopic: 'addSubtract' | 'multiplication' | 'division' | 'mixed'
}

/**
 * K and 1st grade: the easiest knobs every provider accepts. K–1 get their own
 * stage sets (lib/gradeBand, `zoneStages`); until a zone has one, its 2–4
 * stages run with these, so a younger child still gets valid, gentle problems.
 */
const K1_TIER: Tier = {
  multMin: 2, multMax: 5,
  divMin: 2, divMax: 5,
  fracEquivMaxDenom: 6, // halves and thirds only (1/2 = 2/4, 3/6; 1/3 = 2/6)
  fracCompareMaxDenom: 4, // halves, thirds and fourths (1.G.3 equal shares)
  pvIdentifyMaxPlace: 1000,
  pvRoundMaxPlace: 1000,
  pvRoundTo: 10,
  measureConcept: 'area',
  bankLevels: [2, 2, 2], // the easiest shelf on every step (no level-3 boss)
  wpTopic: 'addSubtract',
}

export const GRADE_TIERS: Record<GradeLevel, Tier> = {
  0: K1_TIER,
  1: K1_TIER,
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
  // 5th grade: never easier than 4th. Grade 5 gets its own stage sets and
  // providers (decimals, long division, …); until then the 2–4 stages run at
  // 4th grade's ceilings, a little harder where a provider already allows it.
  5: {
    multMin: 3, multMax: 12,
    divMin: 2, divMax: 12,
    fracEquivMaxDenom: 20, // the forge still caps its own gauge (FORGE_LIMITS)
    fracCompareMaxDenom: 12,
    pvIdentifyMaxPlace: 100000,
    pvRoundMaxPlace: 100000,
    pvRoundTo: 1000,
    measureConcept: 'area',
    bankLevels: [4, 5, 5], // level 5 isn't stocked yet: pickLevel serves level 4
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
      return { ...config, level: t.bankLevels[idx] }
    }
    case 'multiplicationGrove':
      // Times Grove filters its own bank; this keeps other hosts (the Daily
      // Challenge) inside the grade's orders too.
      return { ...config, maxFactor: groveMaxFactor(grade) }
    case 'writingPrompt':
    case 'scienceCycle':
      return config
    // K–1 stage sets carry their own ranges (stage to stage); kindergarten and
    // 1st grade play them as written.
    case 'kCounting':
    case 'kShapes':
    case 'kLetters':
    case 'kLiteracy':
    case 'kTrace':
    case 'kStories':
    case 'kAddTake':
    case 'kStoryMath':
    case 'kCompare':
    case 'kTeens':
      return config
    case 'kMeasure':
    case 'kSort':
    case 'kTowers':
    case 'kScience':
      return config
    // 1st grade (phase 2b): Word Reef, Writing Workshop, Tower Battlefront (their own ramps, as written)
    case 'g1Reading':
    case 'g1Writing':
    case 'g1Towers':
      return config
    // 1st grade (phase 2b): Tens Plateau, Fair Share Falls, Shape Grove (each stage carries its own mode)
    case 'g1Tens':
    case 'g1Shares':
    case 'g1Shapes':
      return config
    // 1st grade (phase 2b): Measure Marsh, Graph Delta, Sky Summit play as written
    case 'g1Measure':
    case 'g1Graphs':
    case 'g1Science':
      return config
    // 1st grade (phase 2b): Adding Mesa, Take-Away Dunes, Story Woods (their stages carry their own ranges)
    case 'g1Adding':
    case 'g1Subtract':
    case 'g1StoryMath':
      return config
    // 5th grade (phase 3): Reading Reef, Writing Workshop, Science Summit play as written
    case 'g5Reading':
    case 'g5Writing':
    case 'g5Science':
    case 'g5Spheres':
      return config
    // 5th grade (phase 3): Fraction Falls, Place Value Plateau, Tower Battlefront (their own ramps, as written)
    case 'g5Fractions':
    case 'g5Decimals':
    case 'g5Gates':
      return config
    // 5th grade (phase 3): Measurement Marsh, Geometry Grove, Data Delta (5th grade's own kinds, as written)
    case 'g5Measure':
    case 'g5Geometry':
    case 'g5Data':
      return config
    // 5th grade (phase 3): Multiplication Mesa, Division Dunes, Word Problem Woods play as written
    case 'g5Mult':
    case 'g5Div':
    case 'g5Expr':
      return config
    // Gobble Garden: whole numbers follow the grade's place-value reach, fractions its denominators
    case 'gobble':
      if (config.set === 'whole') return { ...config, maxPlace: t.pvIdentifyMaxPlace }
      if (config.set === 'frac') return { ...config, maxDen: t.fracCompareMaxDenom }
      return config
    // Snack Shack: grades 2–4 share a stage, so the grade picks the money and the clock
    case 'snackShack':
      return config.band === 'g24' ? { ...config, grade } : config
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

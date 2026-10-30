/**
 * Provider factory. Curriculum data references providers by config; this is where
 * config → live provider mapping happens. Adding a new provider type:
 *   1. add a new ProviderConfig variant
 *   2. add a new file under src/lib/providers/<topic>.ts that returns a ProblemProvider
 *   3. register it in the switch below
 *
 * LLM-backed providers will register here too — same shape, async next().
 */

import type { ProblemProvider } from '../problem'
import type { GradeLevel } from '../gradeTiers'
import { makeMultiplicationProvider } from './multiplication'
import { makeDivisionProvider } from './division'
import { makeFractionEquivalenceProvider, type FracEqMode } from './fractionEquivalence'
import { makeFractionCompareProvider } from './fractionCompare'
import { makePlaceValueRoundingProvider } from './placeValueRounding'
import { makePlaceValueIdentifyProvider } from './placeValueIdentify'
import { makeWordProblemProvider } from './wordProblem'
import { makeMeasurementProvider } from './measurement'
import { makeReadingComprehensionProvider } from './readingComprehension'
import { makeWritingPromptProvider } from './writingPrompt'
import { makeScienceProvider } from './science'
import { makeGeometryProvider } from './geometry'
import { makeDataGraphProvider } from './dataGraph'
import { makeScienceCycleProvider } from './scienceCycle'
import { makeMultiplicationGroveProvider } from './multiplicationGrove'
import { makeKCountingProvider, type KCountingConfig } from './kCounting'
import { makeKShapesProvider, type KShapesConfig } from './kShapes'
import { makeKLettersProvider, type KLettersConfig } from './kLetters'
import { makeKLiteracyProvider, type KLiteracyConfig } from './kLiteracy'
import { makeKTraceProvider, type KTraceConfig } from './kTrace'
import { makeKStoriesProvider } from './kStories'
import { makeKAddTakeProvider, type KAddTakeConfig } from './kAddTake'
import { makeKStoryMathProvider, type KStoryMathConfig } from './kStoryMath'
import { makeKCompareProvider, type KCompareConfig } from './kCompare'
import { makeKTeensProvider, type KTeensConfig } from './kTeens'
import { makeKMeasureProvider, type KMeasureConfig } from './kMeasure'
import { makeKSortProvider, type KSortConfig } from './kSort'
import { makeKTowersProvider, type KTowersConfig } from './kTowers'
import { makeKScienceProvider, type KScienceConfig } from './kScience'
// 1st grade (phase 2b): Word Reef, Writing Workshop, Tower Battlefront
import { makeG1ReadingProvider, type G1ReadingConfig } from './g1Reading'
import { makeG1WritingProvider, type G1WritingConfig } from './g1Writing'
import { makeG1TowersProvider, type G1TowersConfig } from './g1Towers'
// 1st grade (phase 2b): Tens Plateau, Fair Share Falls, Shape Grove
import { makeG1TensProvider, type G1TensConfig } from './g1Tens'
import { makeG1SharesProvider, type G1SharesConfig } from './g1Shares'
import { makeG1ShapesProvider, type G1ShapesConfig } from './g1Shapes'
// 1st grade (phase 2b): Measure Marsh, Graph Delta, Sky Summit
import { makeG1MeasureProvider, type G1MeasureConfig } from './g1Measure'
import { makeG1GraphsProvider, type G1GraphsConfig } from './g1Graphs'
import { makeG1ScienceProvider, type G1ScienceConfig } from './g1Science'
// 1st grade (phase 2b): Adding Mesa, Take-Away Dunes, Story Woods
import { makeG1AddingProvider, type G1AddingConfig } from './g1Adding'
import { makeG1SubtractProvider, type G1SubtractConfig } from './g1Subtract'
import { makeG1StoryMathProvider, type G1StoryMathConfig } from './g1StoryMath'
// 5th grade (phase 3): Reading Reef, Writing Workshop, Science Summit (and Cloud Keeper's spheres tier)
import { makeG5ReadingProvider, type G5ReadingConfig } from './g5Reading'
import { makeG5WritingProvider, type G5WritingConfig } from './g5Writing'
import { makeG5ScienceProvider, type G5ScienceConfig } from './g5Science'
import { makeG5SpheresProvider } from './g5Spheres'
// 5th grade (phase 3): Fraction Falls, Place Value Plateau, Tower Battlefront
import { makeG5FractionsProvider, type G5FractionsConfig } from './g5Fractions'
import { makeG5DecimalsProvider, type G5DecimalsConfig } from './g5Decimals'
import { makeG5GatesProvider } from './g5Gates'
// 5th grade (phase 3): Measurement Marsh, Geometry Grove, Data Delta
import { makeG5MeasureProvider, type G5MeasureConfig } from './g5Measure'
import { makeG5GeometryProvider, type G5GeometryConfig } from './g5Geometry'
import { makeG5DataProvider, type G5DataConfig } from './g5Data'
// 5th grade (phase 3): Multiplication Mesa, Division Dunes, Word Problem Woods
import { makeG5MultProvider, type G5MultConfig } from './g5Mult'
import { makeG5DivProvider, type G5DivConfig } from './g5Div'
import { makeG5ExprProvider, type G5ExprConfig } from './g5Expr'
// Puddle Patrol (Tower Battlefront, grades 2–5): the planned waves and the game's own question
import { makePuddlePatrolProvider, type PuddlePatrolConfig } from './puddlePatrol'

export type ProviderConfig =
  | { kind: 'multiplication'; factorMin: number; factorMax: number }
  | { kind: 'division'; divisorMin: number; divisorMax: number; quotientMin: number; quotientMax: number }
  | { kind: 'fractionEquivalence'; maxDenominator: number; shapes?: readonly FracEqMode[] }
  | { kind: 'fractionCompare'; maxDenominator: number }
  | { kind: 'placeValueRounding'; maxPlace: 100 | 1000 | 10000 | 100000; roundTo: 10 | 100 | 1000 }
  | { kind: 'placeValueIdentify'; maxPlace: 1000 | 10000 | 100000 }
  | { kind: 'wordProblem'; topic: 'addSubtract' | 'multiplication' | 'division' | 'mixed'; source?: 'static' | 'llm' }
  | { kind: 'measurement'; type: 'area' | 'perimeter' | 'time' | 'money' | 'mixed' }
  | { kind: 'readingComprehension'; level: GradeLevel; source?: 'static' | 'llm' }
  | { kind: 'writingPrompt'; writingKind: 'sentence' | 'paragraph' | 'story'; source?: 'static' | 'llm' }
  | { kind: 'science'; level: GradeLevel; source?: 'static' | 'llm' }
  | { kind: 'geometry'; level: GradeLevel; source?: 'static' | 'llm' }
  | { kind: 'dataGraph'; level: GradeLevel; source?: 'static' | 'llm' }
  | { kind: 'scienceCycle' }
  | { kind: 'multiplicationGrove'; maxFactor?: number }
  // ── K–1 (Listen & Play: spoken questions, picture answers) ──
  /** Counting Mesa: count to 20, find the group; compare groups and numerals. */
  | ({ kind: 'kCounting' } & KCountingConfig)
  /** Shape Grove: name flat and solid shapes, flat or solid, sides and corners. */
  | ({ kind: 'kShapes' } & KShapesConfig)
  /** Letter Reef: letter names, big and little letters, first sounds. */
  | ({ kind: 'kLetters' } & KLettersConfig)
  /** Letter Reef: rhymes, word parts (the drum), blending sounds, sight words. */
  | ({ kind: 'kLiteracy' } & KLiteracyConfig)
  /** Writing Workshop: trace warm-up strokes, numerals and capital letters (the `trace` activity). */
  | ({ kind: 'kTrace' } & KTraceConfig)
  /** Writing Workshop: a three-picture story, then first, next, last (the `order` activity). */
  | { kind: 'kStories' }
  /** Add-and-Take Falls: things join and leave as the voice says so, within 5, then 10; make ten (the `mathStory` activity). */
  | ({ kind: 'kAddTake' } & KAddTakeConfig)
  /** Story Woods: spoken story problems within 10, acted out (the `mathStory` activity). */
  | ({ kind: 'kStoryMath' } & KStoryMathConfig)
  /** Number Dunes: more, fewer and the same, comparing numbers, one more and one less, numbers in order. */
  | ({ kind: 'kCompare' } & KCompareConfig)
  /** Ten Frame Plateau: teen numbers as a full ten and some more; counting to 20. */
  | ({ kind: 'kTeens' } & KTeensConfig)
  /** Measure Marsh: longer / shorter, taller / shorter, heavier / lighter (the `measure` activity). */
  | ({ kind: 'kMeasure' } & KMeasureConfig)
  /** Sorting Delta: sort into groups, count a group, which has more (the `sort` activity). */
  | ({ kind: 'kSort' } & KSortConfig)
  /** Counting Towers: the questions that build the towers (how many, more / fewer, to 20). */
  | ({ kind: 'kTowers' } & KTowersConfig)
  /** Nature Summit: the weather and what to wear, what plants and animals need, push and pull. */
  | ({ kind: 'kScience' } & KScienceConfig)
  // ── 1st grade (phase 2b): Word Reef, Writing Workshop, Tower Battlefront ──
  /** Word Reef: short vowels, letter teams, reading words, read-along sentences, sight words. */
  | ({ kind: 'g1Reading' } & G1ReadingConfig)
  /** Writing Workshop (1st grade): trace lowercase letters, spell words from letter tiles, build a sentence from word tiles. */
  | ({ kind: 'g1Writing' } & G1WritingConfig)
  /** Counting Towers (1st grade): add and take away within 20, the questions that build the towers. */
  | ({ kind: 'g1Towers' } & G1TowersConfig)
  // ── 1st grade (phase 2b): Tens Plateau, Fair Share Falls, Shape Grove ──
  /** Tens Plateau: tens and ones on base-ten blocks, comparing with > < =, ten more / less, counting to 120. */
  | ({ kind: 'g1Tens' } & G1TensConfig)
  /** Fair Share Falls: equal shares, halves and fourths of circles and rectangles. */
  | ({ kind: 'g1Shares' } & G1SharesConfig)
  /** Shape Grove (1st grade): what makes a shape, putting shapes together, solids that roll and stack. */
  | ({ kind: 'g1Shapes' } & G1ShapesConfig)
  /** 1st-grade Measure Marsh: lengths in order and through a string, paper clips and cubes, the clock. */
  | ({ kind: 'g1Measure' } & G1MeasureConfig)
  /** Graph Delta: making and reading picture and tally graphs. */
  | ({ kind: 'g1Graphs' } & G1GraphsConfig)
  /** Sky Summit: light and sound, the day and night sky, animal families. */
  | ({ kind: 'g1Science' } & G1ScienceConfig)
  // ── 1st grade (phase 2b): Adding Mesa, Take-Away Dunes, Story Woods ──
  /** Adding Mesa: add within 20, a number sentence over a picture of the strategy (count on, doubles, make ten). */
  | ({ kind: 'g1Adding' } & G1AddingConfig)
  /** Take-Away Dunes: subtract within 20 (take away, count back, think addition, the missing number, fact families). */
  | ({ kind: 'g1Subtract' } & G1SubtractConfig)
  /** Story Woods at 1st grade: story problems within 20, every kind and unknown, acted out, then a number sentence. */
  | ({ kind: 'g1StoryMath' } & G1StoryMathConfig)
  // ── 5th grade (phase 3): Reading Reef, Writing Workshop, Science Summit ──
  /** Reading Reef (5th grade): level-5 stories, poems and articles, a passage at a time. */
  | ({ kind: 'g5Reading' } & G5ReadingConfig)
  /** Writing Workshop (5th grade): opinion, informative and narrative prompts with a checklist (the writing pad). */
  | ({ kind: 'g5Writing' } & G5WritingConfig)
  /** Science Summit (5th grade): matter, food webs, Earth's spheres, shadows and stars. */
  | ({ kind: 'g5Science' } & G5ScienceConfig)
  /** Cloud Keeper's grade-5 tier: carry water, carbon dioxide and minerals between Earth's spheres. */
  | { kind: 'g5Spheres' }
  // ── 5th grade (phase 3): Fraction Falls, Place Value Plateau, Tower Battlefront ──
  /** Fraction Falls (5th grade): unlike denominators, multiplying fractions, fractions as division. */
  | ({ kind: 'g5Fractions' } & G5FractionsConfig)
  /** Place Value Plateau (5th grade): decimals to thousandths: read, compare, round, operate, powers of 10. */
  | ({ kind: 'g5Decimals' } & G5DecimalsConfig)
  /** Tower Battlefront (5th grade): the fraction and decimal questions that buy a tower. */
  | { kind: 'g5Gates' }
  // ── 5th grade (phase 3): Measurement Marsh, Geometry Grove, Data Delta ──
  /** Volume of prisms and composed figures; converting units within a system. */
  | ({ kind: 'g5Measure' } & G5MeasureConfig)
  /** The coordinate plane (first quadrant); classifying two-dimensional figures. */
  | ({ kind: 'g5Geometry' } & G5GeometryConfig)
  /** Line plots in fractions of a unit; graphing two number patterns. */
  | ({ kind: 'g5Data' } & G5DataConfig)
  // ── 5th grade (phase 3): Multiplication Mesa, Division Dunes, Word Problem Woods ──
  /** Multiplication Mesa (5th grade): area models, the standard algorithm, powers of 10 and exponents. */
  | ({ kind: 'g5Mult' } & G5MultConfig)
  /** Division Dunes (5th grade): long division to 4-digit by 2-digit, two-digit divisors, remainders in stories. */
  | ({ kind: 'g5Div' } & G5DivConfig)
  /** Word Problem Woods (5th grade): writing and working out expressions, two-rule patterns, multi-step stories. */
  | ({ kind: 'g5Expr' } & G5ExprConfig)
  // ── Puddle Patrol (Tower Battlefront, grades 2–5) ──
  /** Which Pudding does this sprinkler wash? Even / odd, multiples, factors, primes, fractions equal to ½…; plus the stage's waves. */
  | ({ kind: 'puddlePatrol' } & PuddlePatrolConfig)

export function createProvider(config: ProviderConfig): ProblemProvider {
  switch (config.kind) {
    case 'multiplication':
      return makeMultiplicationProvider(config)
    case 'division':
      return makeDivisionProvider(config)
    case 'fractionEquivalence':
      return makeFractionEquivalenceProvider(config)
    case 'fractionCompare':
      return makeFractionCompareProvider(config)
    case 'placeValueRounding':
      return makePlaceValueRoundingProvider(config)
    case 'placeValueIdentify':
      return makePlaceValueIdentifyProvider(config)
    case 'wordProblem':
      return makeWordProblemProvider(config)
    case 'measurement':
      return makeMeasurementProvider(config)
    case 'readingComprehension':
      return makeReadingComprehensionProvider(config)
    case 'writingPrompt':
      return makeWritingPromptProvider({ kind: config.writingKind, source: config.source })
    case 'science':
      return makeScienceProvider(config)
    case 'geometry':
      return makeGeometryProvider(config)
    case 'dataGraph':
      return makeDataGraphProvider(config)
    case 'scienceCycle':
      return makeScienceCycleProvider()
    case 'multiplicationGrove':
      return makeMultiplicationGroveProvider({ maxFactor: config.maxFactor })
    case 'kCounting':
      return makeKCountingProvider(config)
    case 'kShapes':
      return makeKShapesProvider(config)
    case 'kLetters':
      return makeKLettersProvider(config)
    case 'kLiteracy':
      return makeKLiteracyProvider(config)
    case 'kTrace':
      return makeKTraceProvider(config)
    case 'kStories':
      return makeKStoriesProvider()
    case 'kAddTake':
      return makeKAddTakeProvider(config)
    case 'kStoryMath':
      return makeKStoryMathProvider(config)
    case 'kCompare':
      return makeKCompareProvider(config)
    case 'kTeens':
      return makeKTeensProvider(config)
    case 'kMeasure':
      return makeKMeasureProvider(config)
    case 'kSort':
      return makeKSortProvider(config)
    case 'kTowers':
      return makeKTowersProvider(config)
    case 'kScience':
      return makeKScienceProvider(config)
    // 1st grade (phase 2b): Word Reef, Writing Workshop, Tower Battlefront
    case 'g1Reading':
      return makeG1ReadingProvider(config)
    case 'g1Writing':
      return makeG1WritingProvider(config)
    case 'g1Towers':
      return makeG1TowersProvider(config)
    // 1st grade (phase 2b): Tens Plateau, Fair Share Falls, Shape Grove
    case 'g1Tens':
      return makeG1TensProvider(config)
    case 'g1Shares':
      return makeG1SharesProvider(config)
    case 'g1Shapes':
      return makeG1ShapesProvider(config)
    // 1st grade (phase 2b): Measure Marsh, Graph Delta, Sky Summit
    case 'g1Measure':
      return makeG1MeasureProvider(config)
    case 'g1Graphs':
      return makeG1GraphsProvider(config)
    case 'g1Science':
      return makeG1ScienceProvider(config)
    // 1st grade (phase 2b): Adding Mesa, Take-Away Dunes, Story Woods
    case 'g1Adding':
      return makeG1AddingProvider(config)
    case 'g1Subtract':
      return makeG1SubtractProvider(config)
    case 'g1StoryMath':
      return makeG1StoryMathProvider(config)
    // 5th grade (phase 3): Reading Reef, Writing Workshop, Science Summit
    case 'g5Reading':
      return makeG5ReadingProvider(config)
    case 'g5Writing':
      return makeG5WritingProvider(config)
    case 'g5Science':
      return makeG5ScienceProvider(config)
    case 'g5Spheres':
      return makeG5SpheresProvider()
    // 5th grade (phase 3): Fraction Falls, Place Value Plateau, Tower Battlefront
    case 'g5Fractions':
      return makeG5FractionsProvider(config)
    case 'g5Decimals':
      return makeG5DecimalsProvider(config)
    case 'g5Gates':
      return makeG5GatesProvider()
    // 5th grade (phase 3): Measurement Marsh, Geometry Grove, Data Delta
    case 'g5Measure':
      return makeG5MeasureProvider(config)
    case 'g5Geometry':
      return makeG5GeometryProvider(config)
    case 'g5Data':
      return makeG5DataProvider(config)
    // 5th grade (phase 3): Multiplication Mesa, Division Dunes, Word Problem Woods
    case 'g5Mult':
      return makeG5MultProvider(config)
    case 'g5Div':
      return makeG5DivProvider(config)
    case 'g5Expr':
      return makeG5ExprProvider(config)
    // Puddle Patrol (Tower Battlefront, grades 2–5)
    case 'puddlePatrol':
      return makePuddlePatrolProvider(config)
  }
}

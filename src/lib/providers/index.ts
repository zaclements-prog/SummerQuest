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
  }
}

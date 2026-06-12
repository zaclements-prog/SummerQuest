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
import { makeMultiplicationProvider } from './multiplication'
import { makeDivisionProvider } from './division'
import { makeFractionEquivalenceProvider } from './fractionEquivalence'
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

export type ProviderConfig =
  | { kind: 'multiplication'; factorMin: number; factorMax: number }
  | { kind: 'division'; divisorMin: number; divisorMax: number; quotientMin: number; quotientMax: number }
  | { kind: 'fractionEquivalence'; maxDenominator: number }
  | { kind: 'fractionCompare'; maxDenominator: number }
  | { kind: 'placeValueRounding'; maxPlace: 100 | 1000 | 10000; roundTo: 10 | 100 | 1000 }
  | { kind: 'placeValueIdentify'; maxPlace: 1000 | 10000 | 100000 }
  | { kind: 'wordProblem'; topic: 'multiplication' | 'division' | 'mixed'; source?: 'static' | 'llm' }
  | { kind: 'measurement'; type: 'area' | 'perimeter' | 'time' | 'money' | 'mixed' }
  | { kind: 'readingComprehension'; level: 3 | 4; source?: 'static' | 'llm' }
  | { kind: 'writingPrompt'; writingKind: 'sentence' | 'paragraph' | 'story'; source?: 'static' | 'llm' }
  | { kind: 'science'; level: 3 | 4; source?: 'static' | 'llm' }
  | { kind: 'geometry'; level: 3 | 4; source?: 'static' | 'llm' }
  | { kind: 'dataGraph'; level: 3 | 4; source?: 'static' | 'llm' }

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
  }
}

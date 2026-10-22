import type { Scene } from '../types'
import { dataGraphScenes } from './dataGraph'
import { divisionScenes } from './division'
import { fractionsScenes } from './fractions'
import { geometryScenes } from './geometry'
import { measurementScenes } from './measurement'
import { multiplicationScenes } from './multiplication'
import { placeValueScenes } from './placeValue'
import { readingScenes } from './reading'
import { scienceScenes } from './science'
import { wordProblemScenes } from './wordProblem'
import { writingScenes } from './writing'
import { kCountingScenes } from './kCounting'
import { kLettersScenes } from './kLetters'
import { kShapesScenes } from './kShapes'
import { kRhymesScenes } from './kRhymes'
import { kTracingScenes } from './kTracing'
import { kAddTakeScenes } from './kAddTake'
import { kStoryMathScenes } from './kStoryMath'
import { kCompareScenes } from './kCompare'
import { kTeensScenes } from './kTeens'
import { kMeasureScenes } from './kMeasure'
import { kSortingScenes } from './kSorting'
import { kScienceScenes } from './kScience'
import { kTowersScenes } from './kTowers'
// 1st grade (phase 2b): Word Reef, Writing Workshop
import { g1ReadingScenes } from './g1Reading'
import { g1WritingScenes } from './g1Writing'
// 1st grade (phase 2b): Tens Plateau, Fair Share Falls, Shape Grove
import { g1TensScenes } from './g1Tens'
import { g1SharesScenes } from './g1Shares'
import { g1ShapesScenes } from './g1Shapes'
// 1st grade (phase 2b): Measure Marsh, Graph Delta, Sky Summit
import { g1MeasureScenes } from './g1Measure'
import { g1GraphsScenes } from './g1Graphs'
import { g1ScienceScenes } from './g1Science'
// 5th grade (phase 3): Reading Reef, Writing Workshop, Science Summit
import { g5ReadingScenes } from './g5Reading'
import { g5WritingScenes } from './g5Writing'
import { g5ScienceScenes } from './g5Science'

/**
 * Motion graphics by lesson → step id. A step without a scene falls back to
 * its static `visual` (VisualRenderer). Scene modules live next to this file,
 * one per lesson (`scenes/<lessonId>.tsx`), each exporting a Record<stepId, Scene>.
 */
const SCENES: Record<string, Record<string, Scene>> = {
  fractions: fractionsScenes,
  multiplication: multiplicationScenes,
  division: divisionScenes,
  placeValue: placeValueScenes,
  geometry: geometryScenes,
  measurement: measurementScenes,
  dataGraph: dataGraphScenes,
  wordProblem: wordProblemScenes,
  reading: readingScenes,
  writing: writingScenes,
  science: scienceScenes,
  // kindergarten (band k1)
  kCounting: kCountingScenes,
  kShapes: kShapesScenes,
  kLetters: kLettersScenes,
  kRhymes: kRhymesScenes,
  kTracing: kTracingScenes,
  kAddTake: kAddTakeScenes,
  kStoryMath: kStoryMathScenes,
  // K complete (phase 2a)
  kCompare: kCompareScenes,
  kTeens: kTeensScenes,
  kMeasure: kMeasureScenes,
  kSorting: kSortingScenes,
  kScience: kScienceScenes,
  kTowers: kTowersScenes,
  // 1st grade (phase 2b): Word Reef, Writing Workshop
  g1Reading: g1ReadingScenes,
  g1Writing: g1WritingScenes,
  // 1st grade (phase 2b): Tens Plateau, Fair Share Falls, Shape Grove
  g1Tens: g1TensScenes,
  g1Shares: g1SharesScenes,
  g1Shapes: g1ShapesScenes,
  // 1st grade (phase 2b): Measure Marsh, Graph Delta, Sky Summit
  g1Measure: g1MeasureScenes,
  g1Graphs: g1GraphsScenes,
  g1Science: g1ScienceScenes,
  // 5th grade (phase 3): Reading Reef, Writing Workshop, Science Summit
  g5Reading: g5ReadingScenes,
  g5Writing: g5WritingScenes,
  g5Science: g5ScienceScenes,
}

export function sceneFor(lessonId: string, stepId: string): Scene | undefined {
  return SCENES[lessonId]?.[stepId]
}

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
import { kScienceScenes } from './kScience'
import { kTowersScenes } from './kTowers'

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
  kScience: kScienceScenes,
  kTowers: kTowersScenes,
}

export function sceneFor(lessonId: string, stepId: string): Scene | undefined {
  return SCENES[lessonId]?.[stepId]
}

import type { Scene } from '../types'
import { fractionsScenes } from './fractions'
import { wordProblemScenes } from './wordProblem'
import { readingScenes } from './reading'
import { writingScenes } from './writing'
import { scienceScenes } from './science'

/**
 * Motion graphics by lesson → step id. A step without a scene falls back to
 * its static `visual` (VisualRenderer). Scene modules live next to this file,
 * one per lesson (`scenes/<lessonId>.tsx`), each exporting a Record<stepId, Scene>.
 */
const SCENES: Record<string, Record<string, Scene>> = {
  fractions: fractionsScenes,
  wordProblem: wordProblemScenes,
  reading: readingScenes,
  writing: writingScenes,
  science: scienceScenes,
}

export function sceneFor(lessonId: string, stepId: string): Scene | undefined {
  return SCENES[lessonId]?.[stepId]
}

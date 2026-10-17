import type { Scene } from '../types'
import { fractionsScenes } from './fractions'

/**
 * Motion graphics by lesson → step id. A step without a scene falls back to
 * its static `visual` (VisualRenderer). Scene modules live next to this file,
 * one per lesson (`scenes/<lessonId>.tsx`), each exporting a Record<stepId, Scene>.
 */
const SCENES: Record<string, Record<string, Scene>> = {
  fractions: fractionsScenes,
}

export function sceneFor(lessonId: string, stepId: string): Scene | undefined {
  return SCENES[lessonId]?.[stepId]
}

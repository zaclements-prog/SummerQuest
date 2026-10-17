import type { Scene } from '../types'
import { dataGraphScenes } from './dataGraph'
import { fractionsScenes } from './fractions'
import { geometryScenes } from './geometry'
import { measurementScenes } from './measurement'

/**
 * Motion graphics by lesson → step id. A step without a scene falls back to
 * its static `visual` (VisualRenderer). Scene modules live next to this file,
 * one per lesson (`scenes/<lessonId>.tsx`), each exporting a Record<stepId, Scene>.
 */
const SCENES: Record<string, Record<string, Scene>> = {
  fractions: fractionsScenes,
  geometry: geometryScenes,
  measurement: measurementScenes,
  dataGraph: dataGraphScenes,
}

export function sceneFor(lessonId: string, stepId: string): Scene | undefined {
  return SCENES[lessonId]?.[stepId]
}

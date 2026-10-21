/**
 * Build-time feature flags for content that isn't ready for every build.
 *
 * - `k1`: kindergarten and 1st grade (the voice-first "Listen & Play" band).
 * - `g5`: 5th grade.
 *
 * Each is on in the dev server (`import.meta.env.DEV`), or when the build sets
 * `VITE_K1=true` / `VITE_G5=true`. Production builds — `npm run build`,
 * `build:single` and the Amazon `build:store` — leave them off, so the grade
 * pickers offer only 2nd–4th grade until the K–1 and grade-5 content is
 * authored. The store build reads the two variables from the command line only
 * (never from .env.local; see vite.config.ts).
 *
 * The engine itself knows every grade (`GRADE_LEVELS`, 0–5): a profile saved
 * with a grade this build doesn't offer still loads and plays.
 */

import { GRADE_LEVELS, type GradeLevel } from './gradeTiers'
import { contentBand, isListenBand } from './gradeBand'

export interface Features {
  /** Offer kindergarten and 1st grade. */
  k1: boolean
  /** Offer 5th grade. */
  g5: boolean
}

/** The build-time values the flags read (a slice of `import.meta.env`). */
export interface FeatureEnv {
  DEV?: boolean
  VITE_K1?: string
  VITE_G5?: string
}

export function readFeatures(env: FeatureEnv): Features {
  return {
    k1: env.DEV === true || env.VITE_K1 === 'true',
    g5: env.DEV === true || env.VITE_G5 === 'true',
  }
}

// Each property spelled out, so Vite replaces it statically (and `define` can force it).
export const FEATURES: Features = readFeatures({
  DEV: import.meta.env.DEV,
  VITE_K1: import.meta.env.VITE_K1,
  VITE_G5: import.meta.env.VITE_G5,
})

/** The grades a build with these flags offers in its grade pickers, youngest first. */
export function offeredGrades(features: Features): GradeLevel[] {
  return GRADE_LEVELS.filter((g) => {
    const band = contentBand(g)
    return isListenBand(band) ? features.k1 : band === 'g5' ? features.g5 : true
  })
}

/** The grades this build offers (2–4 in a production build without the flags). */
export const OFFERED_GRADES: GradeLevel[] = offeredGrades(FEATURES)

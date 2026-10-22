/**
 * Grade bands (docs/superpowers/specs/2026-10-19-k5-expansion-plan.md).
 *
 * Grades run 0 (kindergarten) to 5. Two different groupings hang off a grade:
 *
 * - The CONTENT band picks a zone's stage set: kindergarten (`k1`, the K–1
 *   pilot's name, kept) and 1st grade (`g1`) have their own stages, 2–4 share
 *   today's stages (difficulty scaled by `gradeTiers`), and 5 has its own. 1st
 *   grade falls back to the kindergarten set where it has none of its own,
 *   and 5th grade to 2–4's (`bandFallbacks`).
 * - The EXPERIENCE mode picks how screens talk to the child: `listen` (K–1,
 *   voice-first, pictures, no reading needed), `readHear` (2–3, read-aloud on
 *   every question), `own` (4–5, read-aloud on tap).
 *
 * Pure: takes a plain number so it works before and after `GradeLevel` widens.
 */

export type ContentBand = 'k1' | 'g1' | 'g24' | 'g5'
export type ExperienceMode = 'listen' | 'readHear' | 'own'

export function contentBand(grade: number): ContentBand {
  if (grade <= 0) return 'k1'
  if (grade === 1) return 'g1'
  if (grade >= 5) return 'g5'
  return 'g24'
}

/**
 * Where a band's stage set (or lessons, or zone name) comes from, in order:
 * 1st grade uses its own, else kindergarten's; 5th grade its own, else
 * 2nd–4th grade's (today's stages and lessons); the others only their own.
 */
export function bandFallbacks(band: ContentBand): readonly ContentBand[] {
  if (band === 'g1') return ['g1', 'k1']
  if (band === 'g5') return ['g5', 'g24']
  return [band]
}

/** The voice-first bands: kindergarten and 1st grade (`listen` mode). */
export function isListenBand(band: ContentBand): boolean {
  return band === 'k1' || band === 'g1'
}

export function experienceMode(grade: number): ExperienceMode {
  if (grade <= 1) return 'listen'
  if (grade <= 3) return 'readHear'
  return 'own'
}

/** Voice-first (K–1): every instruction spoken, pictures over words, no typing, no timers. */
export function isListenMode(grade: number): boolean {
  return experienceMode(grade) === 'listen'
}

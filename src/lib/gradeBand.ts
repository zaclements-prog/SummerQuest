/**
 * Grade bands (docs/superpowers/specs/2026-10-19-k5-expansion-plan.md).
 *
 * Grades run 0 (kindergarten) to 5. Two different groupings hang off a grade:
 *
 * - The CONTENT band picks a zone's stage set: K–1 has its own stages, 2–4
 *   share today's stages (difficulty scaled by `gradeTiers`), and 5 has its own.
 * - The EXPERIENCE mode picks how screens talk to the child: `listen` (K–1,
 *   voice-first, pictures, no reading needed), `readHear` (2–3, read-aloud on
 *   every question), `own` (4–5, read-aloud on tap).
 *
 * Pure: takes a plain number so it works before and after `GradeLevel` widens.
 */

export type ContentBand = 'k1' | 'g24' | 'g5'
export type ExperienceMode = 'listen' | 'readHear' | 'own'

export function contentBand(grade: number): ContentBand {
  if (grade <= 1) return 'k1'
  if (grade >= 5) return 'g5'
  return 'g24'
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

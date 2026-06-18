// ── Subject type ──────────────────────────────────────────────────────────────

export type Subject = 'island' | 'monster' | 'ocean' | 'quest'

// ── Per-subject Tailwind class bundles ───────────────────────────────────────

export interface SubjectTheme {
  /** Background fill class */
  bg: string
  /** Ring/border class for focus + accent rings */
  ring: string
  /** Accent text class (dark enough for AA on white) */
  accent: string
  /** Body-readable text class */
  text: string
  /** Button surface + text classes */
  button: string
}

const themes: Record<Subject, SubjectTheme> = {
  quest: {
    bg: 'bg-quest-400',
    ring: 'ring-quest-500',
    accent: 'text-quest-700',
    text: 'text-quest-900',
    button: 'bg-quest-400 text-quest-900',
  },
  island: {
    bg: 'bg-island-500',
    ring: 'ring-island-600',
    accent: 'text-island-700',
    text: 'text-island-800',
    button: 'bg-island-500 text-ink-900',
  },
  ocean: {
    bg: 'bg-ocean-600',
    ring: 'ring-ocean-700',
    accent: 'text-ocean-700',
    text: 'text-ocean-900',
    button: 'bg-ocean-600 text-paper',
  },
  monster: {
    bg: 'bg-monster-600',
    ring: 'ring-monster-700',
    accent: 'text-monster-700',
    text: 'text-monster-800',
    button: 'bg-monster-600 text-paper',
  },
}

/**
 * Returns the Tailwind class bundle for a given subject, defaulting to 'quest'.
 */
export function subjectTheme(s: Subject | string): SubjectTheme {
  return themes[(s as Subject) in themes ? (s as Subject) : 'quest']
}

// ── Accuracy tone helpers ─────────────────────────────────────────────────────

export type AccuracyTone = 'wrong' | 'quest' | 'correct'

/**
 * Maps an accuracy percentage (0–100) to a semantic tone.
 * < 60  → 'wrong'
 * < 85  → 'quest'
 * ≥ 85  → 'correct'
 */
export function accuracyTone(pct: number): AccuracyTone {
  if (pct < 60) return 'wrong'
  if (pct < 85) return 'quest'
  return 'correct'
}

/**
 * Maps an accuracy percentage to a `text-*-600` Tailwind class.
 */
export function accuracyColorClass(pct: number): string {
  const tone = accuracyTone(pct)
  if (tone === 'wrong') return 'text-wrong-600'
  if (tone === 'quest') return 'text-quest-600'
  return 'text-correct-600'
}

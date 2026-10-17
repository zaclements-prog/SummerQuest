/**
 * Tone class bundles for the toon UI kit — the one place a color "tone" turns
 * into Tailwind classes, so every card, chip, bar and medallion agrees.
 *
 * Fills are pastels with ink-900 text (AA on all of them); `text` is the
 * darkest accent shade and is AA on paper/cream.
 */

export type Tone = 'quest' | 'island' | 'ocean' | 'monster' | 'correct' | 'wrong'

export interface ToneClasses {
  /** Pastel fill for big surfaces (headers, chips, medallion rings). */
  fill: string
  /** A lighter tint for card washes and rows. */
  soft: string
  /** Accent text, AA on paper and on its own soft tint. */
  text: string
  /** Border in the tone (for rings and dividers). */
  border: string
  /** Progress-bar fill. */
  bar: string
  /** The chunky colored ledge under an accented card. */
  ledge: string
  /** Raw hex of the mid fill, for SVG and inline gradients. */
  hex: string
  /** Raw hex of a light tint. */
  hexSoft: string
  /** Raw hex of the deep shade. */
  hexDeep: string
}

export const TONES: Record<Tone, ToneClasses> = {
  quest: {
    fill: 'bg-quest-300',
    soft: 'bg-quest-100',
    text: 'text-quest-800',
    border: 'border-quest-500',
    bar: 'bg-quest-400',
    ledge: 'shadow-[0_5px_0_0_var(--color-quest-500),0_16px_30px_-14px_rgb(58_44_56/0.3)]',
    hex: '#ffd95e',
    hexSoft: '#fff4cc',
    hexDeep: '#d8901f',
  },
  island: {
    fill: 'bg-island-300',
    soft: 'bg-island-100',
    text: 'text-island-800',
    border: 'border-island-500',
    bar: 'bg-island-400',
    ledge: 'shadow-[0_5px_0_0_var(--color-island-500),0_16px_30px_-14px_rgb(58_44_56/0.3)]',
    hex: '#9fe6c8',
    hexSoft: '#ddf6ee',
    hexDeep: '#2f8378',
  },
  ocean: {
    fill: 'bg-ocean-300',
    soft: 'bg-ocean-100',
    text: 'text-ocean-800',
    border: 'border-ocean-500',
    bar: 'bg-ocean-400',
    ledge: 'shadow-[0_5px_0_0_var(--color-ocean-500),0_16px_30px_-14px_rgb(58_44_56/0.3)]',
    hex: '#9fd3f2',
    hexSoft: '#e1f2fc',
    hexDeep: '#2f7bb0',
  },
  monster: {
    fill: 'bg-monster-300',
    soft: 'bg-monster-100',
    text: 'text-monster-800',
    border: 'border-monster-500',
    bar: 'bg-monster-400',
    ledge: 'shadow-[0_5px_0_0_var(--color-monster-500),0_16px_30px_-14px_rgb(58_44_56/0.3)]',
    hex: '#cdb8f5',
    hexSoft: '#efe7fc',
    hexDeep: '#8461b6',
  },
  correct: {
    fill: 'bg-correct-300',
    soft: 'bg-correct-100',
    text: 'text-correct-800',
    border: 'border-correct-500',
    bar: 'bg-correct-500',
    ledge: 'shadow-[0_5px_0_0_var(--color-correct-500),0_16px_30px_-14px_rgb(58_44_56/0.3)]',
    hex: '#a9e08f',
    hexSoft: '#e6f6dc',
    hexDeep: '#3f8f4b',
  },
  wrong: {
    fill: 'bg-wrong-300',
    soft: 'bg-wrong-100',
    text: 'text-wrong-800',
    border: 'border-wrong-500',
    bar: 'bg-wrong-500',
    ledge: 'shadow-[0_5px_0_0_var(--color-wrong-500),0_16px_30px_-14px_rgb(58_44_56/0.3)]',
    hex: '#ffb09a',
    hexSoft: '#ffe9e2',
    hexDeep: '#c94c42',
  },
}

/** A zone's `themeColor` (or any unknown string) → its tone. */
export function toneOf(themeColor: string | undefined): Tone {
  return themeColor && themeColor in TONES ? (themeColor as Tone) : 'quest'
}

/** Accuracy (0–100) → tone: red under 60, sunny under 85, green above. */
export function accuracyToneOf(pct: number): 'wrong' | 'quest' | 'correct' {
  if (pct < 60) return 'wrong'
  if (pct < 85) return 'quest'
  return 'correct'
}

import type { GameResult } from './GameRunner'

export interface ResultCopy {
  /** The big headline ("Perfect!", "The base fell at wave 4"). */
  heading: string
  /** A short line under it (what to try next), or null. */
  praise: string | null
  emoji: string
  /** Shown (and sounded) as a win: some stars, and the game wasn't lost. */
  won: boolean
}

/**
 * The result screen's words, from the stars and how the game ended — never from
 * a percentage (a 3D game's first-try rate can be 67% on a 3-star run). "Perfect!"
 * only when every answer was right; a lost game (the base fell) says so plainly.
 */
export function resultCopy(result: GameResult): ResultCopy {
  const { stars, correct, total, outcome } = result
  if (outcome?.lost) {
    return {
      heading: outcome.headline,
      praise: outcome.detail ?? (stars >= 3 ? null : 'Try again for more stars!'),
      emoji: '💔',
      won: false,
    }
  }
  if (stars >= 3) {
    const perfect = total > 0 && correct >= total
    return { heading: perfect ? 'Perfect!' : 'Amazing!', praise: outcome?.detail ?? null, emoji: '🏆', won: true }
  }
  if (stars >= 1) {
    return {
      heading: stars === 2 ? 'Great job!' : 'Nice work!',
      praise: outcome?.detail ?? 'Play again for more stars!',
      emoji: '🎉',
      won: true,
    }
  }
  return { heading: 'Keep trying!', praise: outcome?.detail ?? 'Play again to earn a star!', emoji: '💪', won: false }
}

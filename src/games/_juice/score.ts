/**
 * Run scoring shared by the 3D mini-games (pure: no React, no DOM — unit-tested
 * in __tests__/score.test.ts). One shape for every game so scores feel alike:
 *
 *   points = (base + speed bonus) × streak multiplier
 *
 * - `base` is what a correct answer is worth (a finale is worth more);
 * - the speed bonus pays for answering while the threat is still far off / the
 *   clock still has sand in it (`fractionLeft` 1 → full bonus, 0 → none);
 * - the streak multiplier climbs ×1 → ×1.25 → … → ×2 for consecutive clean
 *   answers. Wrong answers only reset the streak: the run never fails out.
 */

export const STREAK_STEP = 0.25
export const STREAK_MAX_MULT = 2
export const SPEED_MAX = 60

/** Multiplier for the `streak`-th clean answer in a row (1 = the first → ×1). */
export function streakMultiplier(streak: number): number {
  const s = Math.max(1, Math.floor(streak))
  return Math.min(STREAK_MAX_MULT, 1 + (s - 1) * STREAK_STEP)
}

/** Speed bonus for answering with `fractionLeft` (0–1) of the threat/clock left. */
export function speedBonus(fractionLeft: number, max = SPEED_MAX): number {
  const f = Number.isFinite(fractionLeft) ? Math.min(1, Math.max(0, fractionLeft)) : 0
  return Math.round(f * max)
}

export interface HitScore {
  base: number
  speed: number
  mult: number
  points: number
}

/** Points for one correct answer. `streak` counts this answer (1 = first in a row). */
export function hitScore({ base, fractionLeft, streak, speedMax = SPEED_MAX }: { base: number; fractionLeft: number; streak: number; speedMax?: number }): HitScore {
  const speed = speedBonus(fractionLeft, speedMax)
  const mult = streakMultiplier(streak)
  return { base, speed, mult, points: Math.round((base + speed) * mult) }
}

/** "×1.5"-style label for a multiplier (no trailing zeros). */
export function multLabel(mult: number): string {
  return `×${Number(mult.toFixed(2))}`
}

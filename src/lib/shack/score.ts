/**
 * Snack Shack's score, tips, stars and the stand's upgrades
 * (src/games/SnackShack.tsx). Pure and tested.
 *
 * Every graded step (the tray, how many in all, the total, the change, the
 * clock) is one decision: right on the first try, right after help or a try
 * again, or shown (the second miss shows the answer and the order goes on).
 * Nobody fails out and no customer leaves unhappy: every customer tips at
 * least one star.
 */

export type StepResult = 'first' | 'helped' | 'retry' | 'shown'

/** Stars a customer tips: 3 when every step was right first time, 2 when worked out (help or a second try), else 1. */
export function tipFor(steps: readonly StepResult[]): number {
  if (steps.every((s) => s === 'first')) return 3
  if (steps.every((s) => s !== 'shown')) return 2
  return 1
}

/** Points for one step (first try 100, helped or second try 50, shown 10). */
export function stepPoints(s: StepResult): number {
  return s === 'first' ? 100 : s === 'shown' ? 10 : 50
}

/** The stage's stars from the share of steps right on the first try (helped counts as right, as in the quiz games). */
export function shiftStars(right: number, total: number): number {
  const share = total > 0 ? right / total : 0
  return share >= 0.85 ? 3 : share >= 0.6 ? 2 : share >= 0.3 ? 1 : 0
}

/** Tip stars at which the stand gets a new decoration (the child picks one of two). */
export const UPGRADE_AT: readonly number[] = [2, 5, 8, 11]

/** How many upgrades `tips` stars have paid for. */
export function upgradesFor(tips: number): number {
  return UPGRADE_AT.filter((n) => tips >= n).length
}

export const SHACK_BEST_KEY = 'sq-best-snack-shack-v1'

export function shackBestKey(stageId?: string | null): string {
  return stageId ? `${SHACK_BEST_KEY}:${stageId}` : SHACK_BEST_KEY
}

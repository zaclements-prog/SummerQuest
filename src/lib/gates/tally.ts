import type { Decision, GatePair, Side } from './types'

/**
 * Bookkeeping for gate choices: each decision, the smart-pick tally, and the
 * chance-level scaffold check (plan rule 6: if picks sit near chance — ≤ 55 %
 * smart over the last 10 — the game slows down and adds pictures).
 */

export function decide(pair: GatePair, picked: Side): Decision {
  const result = picked === 'left' ? pair.left.result : pair.right.result
  const other = picked === 'left' ? pair.right.result : pair.left.result
  const tie = pair.winner === 'tie'
  return { picked, smart: tie || pair.winner === picked, tie, result, other, pair }
}

export function smartTally(ds: readonly Pick<Decision, 'smart'>[]): { smart: number; total: number } {
  let smart = 0
  for (const d of ds) if (d.smart) smart++
  return { smart, total: ds.length }
}

export const SCAFFOLD = {
  /** Decisions looked at. */
  window: 10,
  /** At or below this smart share over the window → scaffold. */
  maxSmartShare: 0.55,
} as const

/**
 * `scaffold: true` when the last `window` decisions are at or below chance-ish
 * (≤ 55 % smart). Fewer than `window` decisions never trigger it: there is no
 * telling chance from a slow start yet.
 */
export function scaffoldCheck(ds: readonly Pick<Decision, 'smart'>[], cfg: { window: number; maxSmartShare: number } = SCAFFOLD): { scaffold: boolean; share: number | null } {
  if (ds.length < cfg.window) return { scaffold: false, share: null }
  const last = ds.slice(-cfg.window)
  const share = smartTally(last).smart / cfg.window
  return { scaffold: share <= cfg.maxSmartShare, share }
}

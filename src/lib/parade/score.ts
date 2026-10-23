import { MINUS, TIMES } from '../numbers'
import type { Decision, OpSetId } from '../gates'

/**
 * Critter Parade scoring (plan rule 7: stars count smart picks, never speed
 * or luck). Pure.
 */

/**
 * Stars from the smart-pick share, capped by finale wins:
 * 3 = mostly smart picks (≥ 85 %) and every tug-of-war won;
 * 2 = ≥ 65 % and all but one won; 1 = ≥ 40 % (better than guessing); else 0.
 */
export function paradeStars({ smart, total, wins, levels }: { smart: number; total: number; wins: number; levels: number }): number {
  const share = total > 0 ? smart / total : 0
  const byPicks = share >= 0.85 ? 3 : share >= 0.65 ? 2 : share >= 0.4 ? 1 : 0
  const byWins = wins >= levels ? 3 : wins >= levels - 1 ? 2 : 1
  return Math.min(byPicks, byWins)
}

/** Points for one level: the parade's size, 25 per smart pick, and a finale bonus with the margin. */
export function levelScore({ count, smartPicks, win, margin }: { count: number; smartPicks: number; win: boolean; margin: number }): number {
  return count + smartPicks * 25 + (win ? 100 + Math.max(0, margin) : 0)
}

/** The pick that cost the most this level (the biggest missed gain), or null when every pick was smart. */
export function worstPick(ds: readonly Decision[]): Decision | null {
  let worst: Decision | null = null
  for (const d of ds) if (!d.smart && (!worst || d.other - d.result > worst.other - worst.result)) worst = d
  return worst
}

/**
 * Where a parade stage keeps its best score: one per stage (the subtraction
 * parade never shows the addition parade's best). A stage with no best of
 * its own yet simply has none; outside a stage, the old shared key.
 */
export function paradeBestKey(stageId?: string | null): string {
  return stageId ? `sq-best-critter-parade-v1:${stageId}` : 'sq-best-critter-parade-v1'
}

/** The tip on the rematch card: the biggest missed gain this level, in a few words. */
export function lossHint(ds: readonly Decision[], opSet: OpSetId): string {
  const worst = worstPick(ds)
  if (worst) {
    const better = worst.picked === 'left' ? worst.pair.right : worst.pair.left
    const picked = worst.picked === 'left' ? worst.pair.left : worst.pair.right
    const verb = worst.pair.goal === 'keep' ? 'kept' : 'made'
    return `With ${worst.pair.count}, ${better.label} ${verb} ${better.result} but ${picked.label} ${verb} ${picked.result}. Work out both before you pick!`
  }
  switch (opSet) {
    case 'addSub':
      return 'Count on from our number for each gate, then pick the bigger one!'
    case 'add20':
      return 'Add each gate to our number, then pick the bigger one!'
    case 'sub20':
      return 'Take each gate away from our number. Keep the bigger one!'
    case 'mulAdd':
      return `${TIMES} is great for a big crowd. For a small crowd, a big + can win!`
    case 'divSub':
      return `${MINUS} takes a few friends away; ÷ splits us up. Work out both!`
    default:
      return `A fraction of us is a part: ${TIMES}½ halves us. Work out both gates!`
  }
}

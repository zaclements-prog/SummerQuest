/**
 * Personal bests for the 3D mini-games, kept in localStorage under each game's
 * OWN key (no store-schema change). Storage can be missing, full or blocked
 * (private windows, previews), so every access is wrapped: a failed read is an
 * empty record, a failed write is silently skipped — the run itself never cares.
 */

export interface RunBest {
  /** Highest run score so far. */
  score: number
  /** Longest clean-answer streak in any run. */
  streak: number
  /** Number of perfect runs (every answer right first time). */
  perfect: number
  /** Completed runs. */
  runs: number
}

export const EMPTY_BEST: RunBest = { score: 0, streak: 0, perfect: 0, runs: 0 }

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0
}

/** Parse a stored record defensively (old/garbled values read as zero). */
export function parseBest(raw: string | null): RunBest {
  if (!raw) return { ...EMPTY_BEST }
  try {
    const o = JSON.parse(raw) as Partial<Record<keyof RunBest, unknown>> | null
    if (!o || typeof o !== 'object') return { ...EMPTY_BEST }
    return { score: num(o.score), streak: num(o.streak), perfect: num(o.perfect), runs: num(o.runs) }
  } catch {
    return { ...EMPTY_BEST }
  }
}

/** The record after one more run (pure). */
export function mergeRun(prev: RunBest, run: { score: number; streak: number; perfect: boolean }): RunBest {
  return {
    score: Math.max(prev.score, num(run.score)),
    streak: Math.max(prev.streak, num(run.streak)),
    perfect: prev.perfect + (run.perfect ? 1 : 0),
    runs: prev.runs + 1,
  }
}

export function loadBest(key: string): RunBest {
  try {
    return parseBest(window.localStorage.getItem(key))
  } catch {
    return { ...EMPTY_BEST }
  }
}

/**
 * Fold a finished run into the stored best. Returns the record before and
 * after, and whether the score beat a previous best (a first run with any
 * score counts as a new best too — there was nothing to beat).
 */
export function recordRun(key: string, run: { score: number; streak: number; perfect: boolean }): { prev: RunBest; best: RunBest; newBest: boolean } {
  const prev = loadBest(key)
  const best = mergeRun(prev, run)
  try {
    window.localStorage.setItem(key, JSON.stringify(best))
  } catch {
    // storage full / blocked: the best just isn't remembered this time
  }
  return { prev, best, newBest: run.score > prev.score }
}

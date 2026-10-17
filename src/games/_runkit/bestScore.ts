/**
 * Personal bests for the 3D mini-games, kept in localStorage under each game's
 * OWN key (no store-schema change; see the fun-pass spec). Pure merge logic +
 * storage that never throws (private mode, blocked storage, corrupt JSON).
 */

export interface RunBest {
  score: number
  streak: number
  /** Runs finished with every answer right first time. */
  perfectRuns: number
}

export interface RunTally {
  score: number
  streak: number
  perfect: boolean
}

/** Fold a finished run into the stored best. `newBest` = the score beat the old one. */
export function mergeBest(prev: RunBest | null, run: RunTally): { best: RunBest; newBest: boolean } {
  const p = prev ?? { score: 0, streak: 0, perfectRuns: 0 }
  return {
    best: {
      score: Math.max(p.score, run.score),
      streak: Math.max(p.streak, run.streak),
      perfectRuns: p.perfectRuns + (run.perfect ? 1 : 0),
    },
    newBest: run.score > p.score,
  }
}

type Store = Pick<Storage, 'getItem' | 'setItem'>

const nonNeg = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0)

function storage(): Store | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function loadBest(key: string, store: Store | null = storage()): RunBest | null {
  try {
    const raw = store?.getItem(key)
    if (!raw) return null
    const v = JSON.parse(raw) as Partial<RunBest> | null
    if (!v || typeof v !== 'object') return null
    return { score: nonNeg(v.score), streak: nonNeg(v.streak), perfectRuns: nonNeg(v.perfectRuns) }
  } catch {
    return null
  }
}

export function saveBest(key: string, best: RunBest, store: Store | null = storage()): void {
  try {
    store?.setItem(key, JSON.stringify(best))
  } catch {
    // storage full / blocked: the run still counts, the best just isn't kept
  }
}

/** Load → merge → save in one go; returns what the results screen shows. */
export function recordRunBest(key: string, run: RunTally, store: Store | null = storage()) {
  const prev = loadBest(key, store)
  const { best, newBest } = mergeBest(prev, run)
  saveBest(key, best, store)
  return { prev, best, newBest }
}

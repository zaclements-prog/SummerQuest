/**
 * Adaptive practice inside a stage: serve more of the facts a child keeps missing.
 *
 * Procedural "fact" providers (7 × 8, 56 ÷ 8, 2/3 = ?/6, 3/8 vs 2/5) tag each
 * problem with a stable `factId`. The store keeps a small per-fact record
 * (`factStats`, updated by `recordAnswer(correct, problem)`), and a provider's
 * `createFactSampler` reads it at draw time to decide what to ask next:
 *
 *  (a) Within a session — a fact the child just missed comes back 2–3 questions
 *      later (never back-to-back), at most twice per fact per session.
 *  (b) Across sessions — facts with recent misses are drawn more often: up to
 *      ~35% of draws come from the child's weak facts that fit the stage's range,
 *      weighted by recency × miss rate. The rest stay uniform so new facts still
 *      appear. A fact graduates (no boost) after 2 correct answers in a row.
 *
 * Pure: no store or React imports. Randomness and time are injectable for tests.
 */

export type Rng = () => number

export interface FactStat {
  attempts: number
  misses: number
  /** Correct answers in a row since the last miss (0 right after a miss). */
  streak: number
  lastSeenAt: number
  lastMissedAt?: number
}

export type FactStats = Record<string, FactStat>

const DAY_MS = 86_400_000

/** Most facts the store remembers; the least recently seen are dropped first. */
export const MAX_FACT_STATS = 500
/** Correct answers in a row (after a miss) that retire a fact from the boost. */
export const GRADUATE_STREAK = 2
/** A miss counts half as much after a week, a quarter after two. */
export const MISS_HALF_LIFE_MS = 7 * DAY_MS
/** Weights below this (misses from ~a month+ ago) no longer count as weak. */
export const MIN_WEAK_WEIGHT = 0.02
/** Largest share of draws that come from the child's weak facts. */
export const BOOST_SHARE = 0.35
/** Total weak weight at which the boost reaches its full share (less evidence → smaller boost). */
export const FULL_BOOST_WEIGHT = 0.5
/** A missed fact comes back this many questions after it was asked (inclusive range). */
export const RETRY_GAP_MIN = 2
export const RETRY_GAP_MAX = 3
/** Retries per fact per session (so a fact appears at most 3 times from misses). */
export const MAX_RETRIES_PER_FACT = 2
/** A boosted pick skips facts served in the last this-many draws. */
export const RECENT_WINDOW = 2
/** Unanswered served facts (skipped, game ended) stop being watched after this many draws. */
const WATCH_DRAWS = 6
/** Re-rolls of a uniform draw that repeats the previous fact (or jumps a queued retry). */
const MAX_REROLLS = 8

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

export function updateFactStat(prev: FactStat | undefined, correct: boolean, now: number): FactStat {
  const p: FactStat = prev ?? { attempts: 0, misses: 0, streak: 0, lastSeenAt: now }
  const attempts = num(p.attempts) + 1
  return correct
    ? { ...p, attempts, streak: num(p.streak) + 1, lastSeenAt: now }
    : { ...p, attempts, misses: num(p.misses) + 1, streak: 0, lastSeenAt: now, lastMissedAt: now }
}

/** Keep the `cap` most recently seen facts (ties: the later-inserted one wins). */
export function pruneFactStats(stats: FactStats, cap = MAX_FACT_STATS): FactStats {
  const entries = Object.entries(stats)
  if (entries.length <= cap) return stats
  const ranked = entries
    .map((entry, i) => ({ entry, i }))
    .sort((x, y) => num(y.entry[1]?.lastSeenAt) - num(x.entry[1]?.lastSeenAt) || y.i - x.i)
  return Object.fromEntries(ranked.slice(0, Math.max(0, cap)).map((r) => r.entry))
}

/** New stats with one answer recorded (the fact moves to the most-recent end), capped. */
export function recordFactAnswer(
  stats: FactStats,
  factId: string,
  correct: boolean,
  now: number,
  cap = MAX_FACT_STATS,
): FactStats {
  const rest = { ...stats }
  const prev = rest[factId]
  delete rest[factId]
  return pruneFactStats({ ...rest, [factId]: updateFactStat(prev, correct, now) }, cap)
}

/**
 * How strongly a fact should be boosted, 0 when it isn't weak: recency of the
 * last miss (half-life one week) × smoothed miss rate × how far from graduating.
 */
export function factWeight(stat: FactStat | undefined, now: number): number {
  if (!stat || typeof stat !== 'object') return 0
  const misses = num(stat.misses)
  const streak = num(stat.streak)
  if (misses <= 0 || stat.lastMissedAt == null || streak >= GRADUATE_STREAK) return 0
  const age = Math.max(0, now - num(stat.lastMissedAt))
  const recency = 0.5 ** (age / MISS_HALF_LIFE_MS)
  const missRate = (misses + 1) / (Math.max(num(stat.attempts), misses) + 2)
  const pending = 1 - streak / GRADUATE_STREAK
  const w = recency * missRate * pending
  return Number.isFinite(w) && w >= MIN_WEAK_WEIGHT ? w : 0
}

export interface WeakFact {
  factId: string
  weight: number
}

/** The child's weak facts (optionally only those passing `filter`), heaviest first. */
export function weakFacts(stats: FactStats, now: number, filter?: (factId: string) => boolean): WeakFact[] {
  const out: WeakFact[] = []
  for (const [factId, stat] of Object.entries(stats ?? {})) {
    const weight = factWeight(stat, now)
    if (weight > 0 && (!filter || filter(factId))) out.push({ factId, weight })
  }
  return out.sort((a, b) => b.weight - a.weight || (a.factId < b.factId ? -1 : 1))
}

/** Pick one item with probability proportional to its weight; undefined if none has weight. */
export function pickWeighted<T>(items: readonly T[], weightOf: (item: T) => number, rng: Rng = Math.random): T | undefined {
  let total = 0
  for (const item of items) total += Math.max(0, num(weightOf(item)))
  if (!(total > 0)) return undefined
  let r = rng() * total
  let last: T | undefined
  for (const item of items) {
    const w = Math.max(0, num(weightOf(item)))
    if (w <= 0) continue
    if (r < w) return item
    r -= w
    last = item
  }
  return last // float rounding guard
}

/** Chance that a draw comes from the weak facts: full share once there's enough weight. */
export function boostChance(weak: readonly WeakFact[]): number {
  const total = weak.reduce((sum, w) => sum + w.weight, 0)
  return BOOST_SHARE * Math.min(1, total / FULL_BOOST_WEIGHT)
}

// ── Within-session retry queue ──────────────────────────────────────────────

export interface RetryItem<F> {
  factId: string
  fact: F
}

export interface RetryQueue<F> {
  /** Compare watched facts with fresh stats; queue a retry for each new miss. */
  update(stats: FactStats): void
  /** Remove and return a retry due at this draw — never `lastId`, so never back-to-back. */
  take(lastId?: string): RetryItem<F> | undefined
  /** Register the fact served at this draw (snapshots its counts to spot a later miss). */
  served(factId: string, fact: F, stats: FactStats): void
  queuedIds(): string[]
  reset(): void
}

/**
 * Session memory for "try that one again": providers don't hear about answers
 * directly, so the queue snapshots a fact's miss count when it's served and
 * notices on a later draw that the store's count went up.
 */
export function createRetryQueue<F>(rng: Rng = Math.random): RetryQueue<F> {
  let draw = 0
  let watching: { factId: string; fact: F; at: number; misses: number; attempts: number }[] = []
  let queue: { factId: string; fact: F; due: number }[] = []
  let retries = new Map<string, number>()

  return {
    update(stats) {
      const still: typeof watching = []
      for (const w of watching) {
        const s = stats[w.factId]
        if (num(s?.misses) > w.misses) {
          const n = retries.get(w.factId) ?? 0
          if (n < MAX_RETRIES_PER_FACT && !queue.some((q) => q.factId === w.factId)) {
            retries.set(w.factId, n + 1)
            const gap = RETRY_GAP_MIN + Math.floor(rng() * (RETRY_GAP_MAX - RETRY_GAP_MIN + 1))
            queue.push({ factId: w.factId, fact: w.fact, due: w.at + gap })
          }
        } else if (num(s?.attempts) <= w.attempts && draw - w.at <= WATCH_DRAWS) {
          still.push(w) // not answered yet — keep watching
        }
      }
      watching = still
    },
    take(lastId) {
      let best = -1
      for (let i = 0; i < queue.length; i++) {
        const q = queue[i]
        if (q.due <= draw && q.factId !== lastId && (best < 0 || q.due < queue[best].due)) best = i
      }
      if (best < 0) return undefined
      const [item] = queue.splice(best, 1)
      return { factId: item.factId, fact: item.fact }
    },
    served(factId, fact, stats) {
      // Served again anyway (e.g. a uniform draw) — that counts as its retry.
      queue = queue.filter((q) => q.factId !== factId)
      const s = stats[factId]
      watching.push({ factId, fact, at: draw, misses: num(s?.misses), attempts: num(s?.attempts) })
      draw++
    },
    queuedIds: () => queue.map((q) => q.factId),
    reset() {
      draw = 0
      watching = []
      queue = []
      retries = new Map()
    },
  }
}

// ── Fact sampler: retry → weak-fact boost → uniform ─────────────────────────

export type FactSource = 'retry' | 'boost' | 'uniform'

export interface FactDraw<F> {
  fact: F
  factId: string
  source: FactSource
}

export interface FactSamplerOptions<F> {
  /** Stable identity of a fact, e.g. "mult:6x8" (normalize commutative order). */
  key: (fact: F) => string
  /** Rebuild a fact from its id; null when it isn't this kind or is outside the stage's range. */
  parse: (factId: string) => F | null
  /** A uniformly random fact from the stage's configured range. */
  uniform: () => F
  /** The child's current per-fact record (providers pass the store's `factStats`). */
  stats: () => FactStats | undefined
  rng?: Rng
  now?: () => number
}

export interface FactSampler<F> {
  next(): FactDraw<F>
  reset(): void
}

export function createFactSampler<F>(opts: FactSamplerOptions<F>): FactSampler<F> {
  const rng = opts.rng ?? Math.random
  const now = opts.now ?? Date.now
  const queue = createRetryQueue<F>(rng)
  let recent: string[] = []

  function serve(fact: F, source: FactSource, stats: FactStats): FactDraw<F> {
    const factId = opts.key(fact)
    queue.served(factId, fact, stats)
    recent = [...recent, factId].slice(-RECENT_WINDOW)
    return { fact, factId, source }
  }

  return {
    next() {
      const stats = opts.stats() ?? {}
      const last = recent[recent.length - 1]

      queue.update(stats)
      const retry = queue.take(last)
      if (retry) return serve(retry.fact, 'retry', stats)

      const queued = new Set(queue.queuedIds())
      const servable = (id: string) => {
        if (queued.has(id) || recent.includes(id)) return false
        const fact = opts.parse(id)
        return fact !== null && opts.key(fact) === id // in range, and a canonical id
      }
      const weak = weakFacts(stats, now(), servable)
      if (weak.length > 0 && rng() < boostChance(weak)) {
        const pick = pickWeighted(weak, (w) => w.weight, rng)
        const fact = pick ? opts.parse(pick.factId) : null
        if (fact !== null) return serve(fact, 'boost', stats)
      }

      // Uniform, but not the previous fact again, and not a retry before its turn.
      const clash = (f: F) => {
        const id = opts.key(f)
        return id === last || queued.has(id)
      }
      let fact = opts.uniform()
      for (let i = 0; i < MAX_REROLLS && clash(fact); i++) fact = opts.uniform()
      return serve(fact, 'uniform', stats)
    },
    reset() {
      queue.reset()
      recent = []
    },
  }
}

/** Integer in [min, max] (both inclusive) — for range checks in providers' `parse`. */
export function inRange(n: number, min: number, max: number): boolean {
  return Number.isInteger(n) && n >= min && n <= max
}

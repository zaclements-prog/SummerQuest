import { describe, it, expect } from 'vitest'
import {
  BOOST_SHARE,
  GRADUATE_STREAK,
  MAX_RETRIES_PER_FACT,
  MISS_HALF_LIFE_MS,
  createFactSampler,
  createRetryQueue,
  factWeight,
  pickWeighted,
  pruneFactStats,
  recordFactAnswer,
  updateFactStat,
  weakFacts,
  type FactStat,
  type FactStats,
} from '../adaptive'
import { seededRng } from '../random'

const NOW = 1_700_000_000_000
const DAY = 86_400_000

/** A fact answered `misses` times wrong out of `attempts`, last missed `ageDays` ago. */
function stat(attempts: number, misses: number, ageDays = 0, streak = 0): FactStat {
  const at = NOW - ageDays * DAY
  return { attempts, misses, streak, lastSeenAt: at, lastMissedAt: misses > 0 ? at : undefined }
}

/** Replay answers through updateFactStat, one minute apart. */
function replay(answers: boolean[], start = NOW): FactStat | undefined {
  let s: FactStat | undefined
  answers.forEach((ok, i) => (s = updateFactStat(s, ok, start + i * 60_000)))
  return s
}

describe('updateFactStat', () => {
  it('counts attempts, misses and the correct-in-a-row streak', () => {
    const s = replay([true, false, true])!
    expect(s).toMatchObject({ attempts: 3, misses: 1, streak: 1 })
    expect(s.lastMissedAt).toBe(NOW + 60_000)
    expect(s.lastSeenAt).toBe(NOW + 120_000)
  })
  it('a miss resets the streak', () => {
    expect(replay([true, true, true, false])!.streak).toBe(0)
  })
})

describe('factWeight / weakFacts', () => {
  it('facts never missed are not weak', () => {
    expect(factWeight(replay([true, true, true]), NOW)).toBe(0)
    expect(factWeight(undefined, NOW)).toBe(0)
  })

  it('graduates after consecutive correct answers', () => {
    const missed = replay([false])!
    const oneRight = replay([false, true])!
    const twoRight = replay([false, true, true])!
    expect(GRADUATE_STREAK).toBe(2)
    expect(factWeight(missed, NOW)).toBeGreaterThan(0)
    expect(factWeight(oneRight, NOW)).toBeGreaterThan(0)
    expect(factWeight(oneRight, NOW)).toBeLessThan(factWeight(missed, NOW))
    expect(factWeight(twoRight, NOW)).toBe(0)
    // …and a new miss makes it weak again
    expect(factWeight(replay([false, true, true, false]), NOW)).toBeGreaterThan(0)
  })

  it('decays with the age of the last miss and expires', () => {
    const fresh = factWeight(stat(2, 1, 0), NOW)
    const week = factWeight(stat(2, 1, 7), NOW)
    const twoWeeks = factWeight(stat(2, 1, 14), NOW)
    expect(week / fresh).toBeCloseTo(0.5, 5)
    expect(twoWeeks / fresh).toBeCloseTo(0.25, 5)
    expect(MISS_HALF_LIFE_MS).toBe(7 * DAY)
    expect(factWeight(stat(2, 1, 90), NOW)).toBe(0)
  })

  it('weighs a higher miss rate more', () => {
    expect(factWeight(stat(4, 4), NOW)).toBeGreaterThan(factWeight(stat(4, 1), NOW))
  })

  it('lists weak facts heaviest first and applies the filter', () => {
    const stats: FactStats = {
      'mult:7x8': stat(5, 4),
      'mult:6x7': stat(5, 1),
      'mult:3x4': stat(5, 0),
      'div:56/8': stat(2, 2),
    }
    expect(weakFacts(stats, NOW).map((w) => w.factId)).toEqual(['div:56/8', 'mult:7x8', 'mult:6x7'])
    expect(weakFacts(stats, NOW, (id) => id.startsWith('mult:')).map((w) => w.factId)).toEqual([
      'mult:7x8',
      'mult:6x7',
    ])
  })

  it('ignores malformed persisted entries', () => {
    const stats = { bad: null, worse: { misses: 'x' } } as unknown as FactStats
    expect(weakFacts(stats, NOW)).toEqual([])
  })
})

describe('pickWeighted', () => {
  it('is deterministic for an injected RNG', () => {
    const items = ['a', 'b', 'c']
    const w = (x: string) => ({ a: 1, b: 2, c: 7 })[x]!
    const run = () => {
      const rng = seededRng('pick')
      return Array.from({ length: 20 }, () => pickWeighted(items, w, rng))
    }
    expect(run()).toEqual(run())
    expect(pickWeighted(items, w, () => 0)).toBe('a')
    expect(pickWeighted(items, w, () => 0.15)).toBe('b')
    expect(pickWeighted(items, w, () => 0.99)).toBe('c')
  })

  it('picks in proportion to weight and never picks zero-weight items', () => {
    const rng = seededRng('proportion')
    const counts: Record<string, number> = { a: 0, b: 0, z: 0 }
    const w = (x: string) => ({ a: 1, b: 3, z: 0 })[x]!
    for (let i = 0; i < 4000; i++) counts[pickWeighted(['a', 'b', 'z'], w, rng)!]++
    expect(counts.z).toBe(0)
    expect(counts.b / counts.a).toBeGreaterThan(2.5)
    expect(counts.b / counts.a).toBeLessThan(3.5)
  })

  it('returns undefined when nothing has weight', () => {
    expect(pickWeighted([], () => 1)).toBeUndefined()
    expect(pickWeighted(['a'], () => 0)).toBeUndefined()
  })
})

describe('recordFactAnswer / pruneFactStats', () => {
  it('records immutably', () => {
    const before: FactStats = {}
    const after = recordFactAnswer(before, 'mult:7x8', false, NOW)
    expect(before).toEqual({})
    expect(after['mult:7x8']).toMatchObject({ attempts: 1, misses: 1, streak: 0 })
  })

  it('caps the record, dropping the least recently seen facts', () => {
    let stats: FactStats = {}
    for (let i = 0; i < 10; i++) stats = recordFactAnswer(stats, `f${i}`, true, NOW + i, 5)
    expect(Object.keys(stats).sort()).toEqual(['f5', 'f6', 'f7', 'f8', 'f9'])
    // Seeing f5 again makes it the newest; the next new fact evicts f6 instead.
    stats = recordFactAnswer(stats, 'f5', false, NOW + 20, 5)
    stats = recordFactAnswer(stats, 'f10', true, NOW + 21, 5)
    expect(Object.keys(stats).sort()).toEqual(['f10', 'f5', 'f7', 'f8', 'f9'])
  })

  it('keeps the just-recorded fact even when every timestamp ties', () => {
    let stats: FactStats = {}
    for (let i = 0; i < 4; i++) stats = recordFactAnswer(stats, `f${i}`, true, NOW, 3)
    expect(stats.f3).toBeDefined()
    expect(Object.keys(stats)).toHaveLength(3)
    expect(pruneFactStats(stats, 10)).toBe(stats)
  })
})

describe('createRetryQueue', () => {
  it('queues a missed fact 2–3 draws after it was served, at most twice per fact', () => {
    const q = createRetryQueue<string>(seededRng('queue'))
    let stats: FactStats = {}
    q.served('x', 'x', stats) // draw 0
    stats = recordFactAnswer(stats, 'x', false, NOW)
    q.update(stats)
    expect(q.queuedIds()).toEqual(['x'])
    expect(q.take()).toBeUndefined() // draw 1: too soon
    q.served('y', 'y', stats)
    q.update(stats)
    const two = q.take('y') // draw 2 (gap 2) or nothing (gap 3)
    if (!two) {
      q.served('z', 'z', stats)
      expect(q.take('z')).toEqual({ factId: 'x', fact: 'x' }) // draw 3
    } else {
      expect(two).toEqual({ factId: 'x', fact: 'x' })
    }
  })

  it('never returns the fact that was just served', () => {
    const q = createRetryQueue<string>(() => 0) // gap = 2
    let stats: FactStats = {}
    q.served('x', 'x', stats)
    stats = recordFactAnswer(stats, 'x', false, NOW)
    q.served('y', 'y', stats)
    q.update(stats)
    expect(q.take('x')).toBeUndefined()
    expect(q.take('y')?.factId).toBe('x')
  })

  it('stops retrying a fact after MAX_RETRIES_PER_FACT misses', () => {
    const q = createRetryQueue<string>(() => 0)
    let stats: FactStats = {}
    let retries = 0
    for (let round = 0; round < 5; round++) {
      q.served('x', 'x', stats)
      stats = recordFactAnswer(stats, 'x', false, NOW)
      q.served('y', 'y', stats)
      q.served('z', 'z', stats)
      q.update(stats)
      if (q.take('z')) retries++
    }
    expect(retries).toBe(MAX_RETRIES_PER_FACT)
  })
})

describe('createFactSampler', () => {
  // A toy fact space: the numbers 0..19 ("n:7"), uniform from the injected RNG.
  function sampler(stats: () => FactStats, seed = 'sampler') {
    const rng = seededRng(seed)
    return createFactSampler<number>({
      key: (n) => `n:${n}`,
      parse: (id) => {
        const m = /^n:(\d+)$/.exec(id)
        return m && Number(m[1]) < 20 ? Number(m[1]) : null
      },
      uniform: () => Math.floor(rng() * 20),
      stats,
      rng,
      now: () => NOW,
    })
  }

  it('is deterministic for a given seed', () => {
    const stats = { 'n:7': stat(3, 2) }
    const draw = () => {
      const s = sampler(() => stats, 'same')
      return Array.from({ length: 50 }, () => s.next().factId)
    }
    expect(draw()).toEqual(draw())
  })

  it('serves the weak facts about BOOST_SHARE of the time when there are several', () => {
    const stats: FactStats = { 'n:3': stat(3, 3), 'n:7': stat(3, 3), 'n:11': stat(3, 3), 'n:15': stat(3, 3) }
    const s = sampler(() => stats)
    let weak = 0
    let boosted = 0
    const N = 4000
    for (let i = 0; i < N; i++) {
      const d = s.next()
      if (d.factId in stats) weak++
      if (d.source === 'boost') boosted++
    }
    expect(boosted / N).toBeGreaterThan(BOOST_SHARE - 0.05)
    expect(boosted / N).toBeLessThan(BOOST_SHARE + 0.05)
    // plus the uniform share that lands on them anyway (4/20 of the rest)
    expect(weak / N).toBeGreaterThan(0.4)
    expect(weak / N).toBeLessThan(0.6)
  })

  it('ignores weak facts outside the range (parse → null) and non-canonical ids', () => {
    const stats: FactStats = { 'n:99': stat(3, 3), 'n:07': stat(3, 3) }
    const s = sampler(() => stats)
    for (let i = 0; i < 300; i++) expect(s.next().source).toBe('uniform')
  })

  it('a faint (old) miss gets a smaller boost than a fresh one', () => {
    const share = (ageDays: number) => {
      const stats: FactStats = { 'n:5': stat(1, 1, ageDays) }
      const s = sampler(() => stats, `age-${ageDays}`)
      let hits = 0
      for (let i = 0; i < 3000; i++) if (s.next().source === 'boost') hits++
      return hits / 3000
    }
    expect(share(21)).toBeLessThan(share(0) * 0.6)
  })

  it('brings a just-missed fact back 2–3 draws later, never back-to-back', () => {
    for (const seed of ['r1', 'r2', 'r3', 'r4', 'r5', 'r6']) {
      let stats: FactStats = {}
      const s = sampler(() => stats, seed)
      const first = s.next()
      stats = recordFactAnswer(stats, first.factId, false, NOW)
      const later = [s.next(), s.next(), s.next()]
      expect(later[0].factId).not.toBe(first.factId)
      const at = later.findIndex((d) => d.factId === first.factId && d.source === 'retry')
      expect(at === 1 || at === 2, `seed ${seed}: ${later.map((d) => d.factId)}`).toBe(true)
    }
  })

  it('does not repeat a uniform fact back-to-back', () => {
    const s = createFactSampler<number>({
      key: (n) => `n:${n}`,
      parse: () => null,
      uniform: (() => {
        const seq = [1, 1, 1, 2, 2, 3]
        let i = 0
        return () => seq[i++ % seq.length]
      })(),
      stats: () => ({}),
    })
    const out = Array.from({ length: 4 }, () => s.next().factId)
    for (let i = 1; i < out.length; i++) expect(out[i]).not.toBe(out[i - 1])
  })
})

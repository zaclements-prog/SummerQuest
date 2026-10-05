export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Deterministic PRNG: the same `seed` always gives the same sequence of numbers in
 * [0, 1). Use it wherever randomness must be reproducible (tests, per-step shuffles).
 */
export function seededRng(seed: string): () => number {
  // FNV-1a hash of the seed → mulberry32 PRNG
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Deterministic shuffle: the same `seed` always gives the same order. Pure, so it's
 * safe to call during render (e.g. to shuffle a lesson check's options per step).
 */
export function seededShuffle<T>(arr: readonly T[], seed: string): T[] {
  const rand = seededRng(seed)
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

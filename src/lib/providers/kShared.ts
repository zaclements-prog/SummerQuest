import { randInt, shuffle } from '../random'

/**
 * Small helpers the kindergarten (Listen & Play) providers share. They all
 * draw from `Math.random` (via lib/random), so a test that seeds it
 * (`seededRng`) gets the same questions every run.
 */

/** A random element of `xs`, never one of `avoid` while there's another choice. */
export function pickOne<T>(xs: readonly T[], avoid: readonly T[] = []): T {
  const pool = xs.filter((x) => !avoid.includes(x))
  const from = pool.length ? pool : xs
  return from[randInt(0, from.length - 1)]
}

/** The longest Listen & Play round (questions): how far back "this round" remembers. */
export const ROUND_MEMORY = 6

/**
 * The last `size` things a provider asked (a round's worth): `has` says
 * whether one came up this round. Older ones are forgotten, so a provider
 * that runs on without a `reset()` keeps its variety and never runs dry.
 */
export function makeRecent<T>(size = ROUND_MEMORY) {
  const xs: T[] = []
  return {
    has: (x: T) => xs.includes(x),
    add(x: T) {
      xs.push(x)
      if (xs.length > size) xs.shift()
    },
    list: (): readonly T[] => xs,
    clear() {
      xs.length = 0
    },
  }
}

/**
 * What to keep out of a pick from `pool` so a round doesn't ask the same
 * thing twice: everything in `used` (this round's picks) while some of the
 * pool is still unused; once it's all used, just `last` (never twice in a row).
 */
export function avoidUsed<T>(pool: readonly T[], used: readonly T[], last?: T): T[] {
  const fresh = pool.filter((x) => !used.includes(x))
  return fresh.length ? pool.filter((x) => used.includes(x)) : pool.filter((x) => x === last)
}

/**
 * Deals `items` in a shuffled order, a fresh shuffle each time they run out,
 * never the same item twice in a row (not even across a reshuffle). Every
 * item comes up once before any comes up again, so a round of letters
 * doesn't keep landing on the same few.
 */
export function makeDeck<T>(items: readonly T[]) {
  let deck: T[] = []
  let last: T | undefined
  return {
    /** The next item, skipping any that `ok` refuses (when another one is left). */
    next(ok: (x: T) => boolean = () => true): T {
      if (!deck.length) {
        deck = shuffle(items)
        if (deck.length > 1 && deck[0] === last) deck.push(deck.shift()!)
      }
      let at = deck.findIndex((x) => x !== last && ok(x))
      if (at < 0) at = deck.findIndex((x) => x !== last)
      if (at < 0) at = 0
      const [x] = deck.splice(at, 1)
      last = x
      return x
    },
    reset() {
      deck = []
      last = undefined
    },
  }
}

/**
 * Keeps the answer moving between the cards: shuffles a question's options,
 * reshuffling (a few times) rather than put the answer in the same place a
 * third time running. `note` where each question that is actually asked put
 * its answer (a question drawn and then thrown away doesn't count).
 */
export function makePositionGuard() {
  const recent: number[] = []
  /** Would the answer at `at` be in the same place three times running? */
  const wouldRepeat = (at: number) => {
    const n = recent.length
    return n >= 2 && recent[n - 1] === at && recent[n - 2] === at
  }
  /** Record where an asked question's answer went. */
  const note = (at: number) => {
    recent.push(at)
    if (recent.length > 4) recent.shift()
  }
  return {
    arrange<T>(options: readonly T[], answer: T): T[] {
      let out = shuffle(options)
      for (let tries = 0; tries < 12 && wouldRepeat(out.indexOf(answer)); tries++) out = shuffle(options)
      return out
    },
    wouldRepeat,
    note,
    reset() {
      recent.length = 0
    },
  }
}

/** Picks the next question kind from `kinds`, never three of one in a row. */
export function makeKindPicker<K>(kinds: readonly K[]) {
  const recent: K[] = []
  return {
    next(): K {
      const two = recent.slice(-2)
      const pool = two.length === 2 && two[0] === two[1] && kinds.length > 1 ? kinds.filter((k) => k !== two[0]) : kinds
      const k = pool[randInt(0, pool.length - 1)]
      recent.push(k)
      if (recent.length > 4) recent.shift()
      return k
    },
    reset() {
      recent.length = 0
    },
  }
}

/** How many sticker colours the Listen & Play pictures have (PictureCard's palette). */
export const STICKER_COLORS = 8

/** `n` different sticker colours, in a random order. */
export function distinctColors(n: number): number[] {
  return shuffle(Array.from({ length: STICKER_COLORS }, (_, i) => i)).slice(0, n)
}

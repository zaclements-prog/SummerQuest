import type { PictureOption, ProblemProvider } from '../problem'
import type { ListenProblem } from '../../games/listenPlay/types'
import { K_COUNT_THINGS } from '../../voice/packs/k-math'
import { randInt, shuffle } from '../random'

/**
 * Kindergarten counting (K.CC.4–5), voice-first, for the Listen & Play shell:
 *
 * - "How many apples? Tap the number." — a group to count, numeral cards;
 * - "Tap the group with 5 apples." — a numeral to match, group cards.
 *
 * Counts run 1–10 ("find the group" starts at 2: no "1 apples"). Every problem
 * carries its spoken question (`k-math` pack), a spoken label per card
 * (`listen/number`), its own picture and the guide's cues.
 *
 * Not in `createProvider` yet: a new ProviderConfig kind also needs a case in
 * gradeTiers' `effectiveConfig`, which the K–1 stage-set work owns. Until then
 * hosts build it directly (the dev demo does).
 */

export type KCountingKind = 'howMany' | 'findGroup'
export type KThing = (typeof K_COUNT_THINGS)[number]

/** The picture for each countable thing in the k-math voice pack. */
export const K_THING_EMOJI: Record<KThing, string> = {
  apples: '🍎',
  stars: '⭐',
  fish: '🐟',
  ducks: '🦆',
  balls: '⚽',
  flowers: '🌼',
  bees: '🐝',
  cars: '🚗',
  cookies: '🍪',
  frogs: '🐸',
}

export interface KCountingConfig {
  /** Smallest and largest count (defaults 1 and 10). */
  min?: number
  max?: number
  /** Which question shapes to mix (default both). */
  kinds?: KCountingKind[]
  /** Answer cards per question: 2 or 3 (default 3). */
  choices?: 2 | 3
}

/**
 * Two (or one) other counts near `n`: one a step away, one a little further,
 * so the cards differ but still make the child count.
 */
export function countDistractors(n: number, lo: number, hi: number, k: number): number[] {
  const near = shuffle([n - 1, n + 1].filter((v) => v >= lo && v <= hi))
  const far = shuffle([n - 2, n + 2, n - 3, n + 3].filter((v) => v >= lo && v <= hi))
  const out: number[] = []
  for (const v of [...near.slice(0, 1), ...far, ...near.slice(1)]) {
    if (out.length >= k) break
    if (!out.includes(v)) out.push(v)
  }
  return out
}

export function makeKCountingProvider(cfg: KCountingConfig = {}): Omit<ProblemProvider, 'next'> & { next(): ListenProblem } {
  const min = Math.max(1, cfg.min ?? 1)
  const max = Math.min(10, cfg.max ?? 10)
  const kinds = cfg.kinds?.length ? cfg.kinds : (['howMany', 'findGroup'] as KCountingKind[])
  const choices = cfg.choices ?? 3
  let serial = 0
  let lastN = -1
  let lastThing = ''
  const recentKinds: KCountingKind[] = []

  function pickKind(): KCountingKind {
    // mix the shapes, never three of one in a row
    const two = recentKinds.slice(-2)
    const pool = two.length === 2 && two[0] === two[1] && kinds.length > 1 ? kinds.filter((k) => k !== two[0]) : kinds
    const k = pool[randInt(0, pool.length - 1)]
    recentKinds.push(k)
    return k
  }

  function pickThing(): KThing {
    let t: KThing
    do t = K_COUNT_THINGS[randInt(0, K_COUNT_THINGS.length - 1)]
    while (t === lastThing)
    lastThing = t
    return t
  }

  function pickN(lo: number): number {
    if (lo >= max) return max
    let n: number
    do n = randInt(lo, max)
    while (n === lastN)
    lastN = n
    return n
  }

  return {
    topic: 'kCounting',
    reset() {
      serial = 0
      lastN = -1
      lastThing = ''
      recentKinds.length = 0
    },
    next(): ListenProblem {
      const kind = pickKind()
      const thing = pickThing()
      const emoji = K_THING_EMOJI[thing]
      // "find the group" needs a plural ("2 apples" and up)
      const lo = kind === 'findGroup' ? Math.max(2, min) : min
      const n = pickN(lo)
      const options = shuffle([n, ...countDistractors(n, kind === 'findGroup' ? Math.max(1, min) : min, max, choices - 1)])
      const say = (v: number) => ({ template: 'listen/number', slots: { n: v } })
      const base = {
        id: `kcount-${serial++}`,
        options,
        answer: n,
        topic: 'kCounting',
        difficulty: n,
        // (the array visual lets a grade 2–4 quiz host show the same question)
        visual: { kind: 'array' as const, rows: 1, cols: n, itemEmoji: emoji },
      }
      if (kind === 'howMany') {
        return {
          ...base,
          prompt: `How many ${thing}?`,
          subtopic: 'howMany',
          skill: { id: 'k-count-howmany', label: 'Counting: how many?' },
          speech: { template: 'k-math/howMany', slots: { thing } },
          picture: { kind: 'group', count: n, emoji },
          pictureOptions: options.map<PictureOption>((v) => ({ value: v, picture: { kind: 'numeral', n: v }, speech: say(v) })),
          cues: [
            { target: 'picture' },
            { target: 'cards', cue: 'Tap' },
          ],
        }
      }
      return {
        ...base,
        prompt: `Tap the group with ${n} ${thing}.`,
        subtopic: 'findGroup',
        skill: { id: 'k-count-group', label: 'Counting: find the group' },
        speech: { template: 'k-math/findGroup', slots: { n, thing } },
        picture: { kind: 'numeral', n },
        pictureOptions: options.map<PictureOption>((v) => ({ value: v, picture: { kind: 'group', count: v, emoji }, speech: say(v) })),
        cues: [
          { target: 'cards' },
          { target: 'picture', cue: 'with' },
          // (back to the cards as the line ends, and the hand stays there)
          { target: 'cards', cue: 1 },
        ],
      }
    },
  }
}

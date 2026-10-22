import type { ProblemProvider } from '../problem'
import type { ListenProblem } from '../../games/listenPlay/types'
import type { BuildSpec, TenFramesSpec } from '../../games/listenPlay/activities/numberSpecs'
import { K_COUNT_THINGS } from '../../voice/packs/k-math'
import { K_NEXT_FIRST, K_TEENS_MAX, K_TEENS_MIN } from '../../voice/packs/k-teens'
import { voiceText } from '../../voice/registry'
import type { VoiceRef } from '../../voice/types'
import { randInt } from '../random'
import { K_THING_EMOJI } from './kCounting'
import { makePositionGuard, pickOne } from './kShared'

/**
 * Kindergarten teen numbers (Ten Frame Plateau, K.NBT.1; counting to 20,
 * K.CC.2 and K.CC.5), voice-first, for the Listen & Play shell. A teen number
 * is a full ten and some more ones: two ten-frames, a full one on top and the
 * ones below, always said "ten and three more: thirteen". Every question is
 * answered through the number activities (src/games/listenPlay/activities):
 *
 * - `tenAnd` ("Ten and more"): "A full ten and three more. How many dots?"
 *   (numeral cards), then "Which one shows fourteen?" (ten-frame cards), then
 *   the same without the "full ten and…" help in the question;
 * - `build` ("Fill the frames"): "Make fourteen: a full ten and four more!"
 *   — tap the counters into the frames, then ✓ (the last two just "Make
 *   seventeen!");
 * - `twenty` ("Count to twenty", the mastery): "Eleven, twelve, thirteen. What
 *   comes next?", things to count set out on ten-frames, making a number,
 *   and the frames questions, up to twenty.
 *
 * Wrong cards are the mistakes a K child makes: the ones without the ten (3
 * for 13), one off (12 or 14), the last number said again.
 */

export type KTeensMode = 'tenAnd' | 'build' | 'twenty'

export interface KTeensConfig {
  mode?: KTeensMode
}

type Item =
  | { q: 'howMany'; lo: number; hi: number; say: 'tenAnd' | 'plain' | 'things' }
  | { q: 'shows'; lo: number; hi: number }
  | { q: 'build'; lo: number; hi: number; say: 'make' | 'makeJust' }
  | { q: 'next'; lo: number; hi: number }

const PLAN: Record<KTeensMode, Item[]> = {
  tenAnd: [
    { q: 'howMany', lo: 11, hi: 13, say: 'tenAnd' },
    { q: 'howMany', lo: 12, hi: 15, say: 'tenAnd' },
    { q: 'shows', lo: 11, hi: 15 },
    { q: 'howMany', lo: 14, hi: 19, say: 'plain' },
    { q: 'shows', lo: 15, hi: 19 },
    { q: 'howMany', lo: 15, hi: 20, say: 'plain' },
  ],
  build: [
    { q: 'build', lo: 11, hi: 13, say: 'make' },
    { q: 'build', lo: 12, hi: 14, say: 'make' },
    { q: 'build', lo: 14, hi: 16, say: 'make' },
    { q: 'build', lo: 15, hi: 18, say: 'makeJust' },
    { q: 'build', lo: 16, hi: 19, say: 'makeJust' },
    { q: 'build', lo: 17, hi: 20, say: 'makeJust' },
  ],
  twenty: [
    { q: 'next', lo: 11, hi: 15 },
    { q: 'howMany', lo: 11, hi: 20, say: 'things' },
    { q: 'build', lo: 13, hi: 20, say: 'makeJust' },
    { q: 'next', lo: 16, hi: 20 },
    { q: 'shows', lo: 16, hi: 20 },
    { q: 'howMany', lo: 16, hi: 20, say: 'plain' },
  ],
}

const SKILL = {
  teens: { id: 'k-teens', label: 'teen numbers: ten and some more' },
  build: { id: 'k-teens-build', label: 'making teen numbers' },
  count20: { id: 'k-count-20', label: 'counting on to 20' },
} as const

const PRAISE: VoiceRef[] = [{ line: 'k-teens/youKnowTens' }, { line: 'k-teens/bigCounting' }]

/** The wrong cards for a teen number: its ones alone (no ten), and one off. */
function teenNear(n: number): number[] {
  return [n - 10, n + 1 <= K_TEENS_MAX ? n + 1 : n - 1]
}

export function makeKTeensProvider(cfg: KTeensConfig = {}): Omit<ProblemProvider, 'next'> & { next(): ListenProblem } {
  const mode = cfg.mode ?? 'tenAnd'
  const plan = PLAN[mode]
  const places = makePositionGuard()
  let asked = 0
  let serial = 0
  let lastN = -1
  let lastThing = ''

  const base = (subtopic: string, n: number, skill: keyof typeof SKILL, speech: VoiceRef) => ({
    id: `kteens-${serial++}`,
    topic: 'kTeens',
    subtopic,
    difficulty: n,
    skill: SKILL[skill],
    praise: PRAISE,
    speech,
    prompt: voiceText(speech),
  })

  /** A number in [lo, hi] (within 11–20), not the last one asked. */
  function pickN(lo: number, hi: number): number {
    const a = Math.max(K_TEENS_MIN, lo)
    const b = Math.min(K_TEENS_MAX, hi)
    if (a >= b) return b
    let n: number
    do n = randInt(a, b)
    while (n === lastN)
    lastN = n
    return n
  }

  function howMany(it: Extract<Item, { q: 'howMany' }>): ListenProblem {
    const n = pickN(it.lo, it.hi)
    const cards = places.arrange([n, ...teenNear(n)], n)
    let speech: VoiceRef
    let emoji: string | undefined
    if (it.say === 'things') {
      const thing = pickOne(K_COUNT_THINGS, [lastThing as (typeof K_COUNT_THINGS)[number]])
      lastThing = thing
      emoji = K_THING_EMOJI[thing]
      speech = { template: 'k-math/howMany', slots: { thing } }
    } else if (it.say === 'tenAnd') {
      speech = { line: n === 20 ? 'k-teens/twoTens' : `k-teens/tenAnd-${n - 10}` }
    } else {
      speech = { line: 'k-teens/howManyDots' }
    }
    const spec: TenFramesSpec = { kind: 'teenFrames', ask: 'howMany', n, cards, ...(emoji ? { emoji } : {}) }
    return { ...base('howMany', n, it.say === 'things' ? 'count20' : 'teens', speech), options: cards, answer: n, activity: spec }
  }

  function shows(it: Extract<Item, { q: 'shows' }>): ListenProblem {
    const n = pickN(it.lo, it.hi)
    const cards = places.arrange([n, ...teenNear(n)], n)
    const spec: TenFramesSpec = { kind: 'teenFrames', ask: 'shows', n, cards }
    return { ...base('shows', n, 'teens', { line: `k-teens/shows-${n}` }), options: cards, answer: n, activity: spec }
  }

  function next(it: Extract<Item, { q: 'next' }>): ListenProblem {
    // the next number after three said: at least K_NEXT_FIRST + 3
    const n = pickN(Math.max(it.lo, K_NEXT_FIRST + 3), it.hi)
    // one skipped, and the last number said again
    const cards = places.arrange([n, n + 1 <= K_TEENS_MAX ? n + 1 : n - 2, n - 1], n)
    const spec: TenFramesSpec = { kind: 'teenFrames', ask: 'next', n, cards }
    return { ...base('next', n, 'count20', { line: `k-teens/next-${n - 3}` }), options: cards, answer: n, activity: spec }
  }

  function build(it: Extract<Item, { q: 'build' }>): ListenProblem {
    const n = pickN(it.lo, it.hi)
    const spec: BuildSpec = { kind: 'buildTeen', n }
    return {
      ...base('build', n, mode === 'twenty' ? 'count20' : 'build', { line: `k-teens/${it.say}-${n}` }),
      // (answered by filling the frames and ✓: the activity checks the count)
      options: [],
      answer: n,
      activity: spec,
    }
  }

  return {
    topic: 'kTeens',
    reset() {
      asked = 0
      serial = 0
      lastN = -1
      lastThing = ''
      places.reset()
    },
    next(): ListenProblem {
      const i = asked < plan.length ? asked : Math.floor(plan.length / 2) + ((asked - plan.length) % Math.ceil(plan.length / 2))
      asked++
      const it = plan[i]
      const p = it.q === 'howMany' ? howMany(it) : it.q === 'shows' ? shows(it) : it.q === 'next' ? next(it) : build(it)
      const at = p.options.indexOf(p.answer)
      if (at >= 0) places.note(at)
      return p
    },
  }
}

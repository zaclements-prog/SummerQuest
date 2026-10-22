import type { ProblemProvider } from '../problem'
import type { ListenProblem } from '../../games/listenPlay/types'
import type { MathHome, MathMotion, MathPlot, MathStorySpec } from '../../games/listenPlay/activities/mathStorySpec'
import { K_ADDTAKE_THINGS, K_ADDTAKE_VERB, type KAddTakeThing } from '../../voice/packs/k-addtake'
import type { VoiceRef } from '../../voice/types'
import { randInt } from '../random'
import { makeDeck, makePositionGuard } from './kShared'
import { storyProblem } from './kMathStory'

/**
 * Add-and-Take Falls (K.OA.1, K.OA.5, K.OA.4), voice-first, for the Listen &
 * Play `mathStory` activity: the things join or leave on screen as the voice
 * says so, then three numeral cards.
 *
 * - `within5`: "Here are 3 frogs." "2 more hop in." "How many now?" and
 *   "Here are 5 ducks." "2 swim away." "How many are left?", totals to 5;
 * - `within10`: the same up to 10;
 * - `make10`: "Here are 7 bees." "How many more make ten?" on a ten-frame.
 *
 * A round ramps gently (the shell `reset()`s the provider when a round
 * starts): one joining or leaving first, then two or three, then more; for
 * ten, one or two empty spots first, then more. Adding and taking away take
 * turns; the things come from a deck (all of them before any repeats).
 */

export type KAddTakeMode = 'within5' | 'within10' | 'make10'

export interface KAddTakeConfig {
  mode?: KAddTakeMode
}

/** The picture, home and way of moving for each thing in the k-addtake pack. */
export const K_ADDTAKE_ART: Record<KAddTakeThing, { emoji: string; home: MathHome; motion: MathMotion }> = {
  frogs: { emoji: '🐸', home: 'log', motion: 'hop' },
  bunnies: { emoji: '🐰', home: 'patch', motion: 'hop' },
  ducks: { emoji: '🦆', home: 'water', motion: 'swim' },
  fish: { emoji: '🐟', home: 'water', motion: 'swim' },
  turtles: { emoji: '🐢', home: 'water', motion: 'swim' },
  bees: { emoji: '🐝', home: 'patch', motion: 'fly' },
  butterflies: { emoji: '🦋', home: 'patch', motion: 'fly' },
  ladybugs: { emoji: '🐞', home: 'patch', motion: 'fly' },
  birds: { emoji: '🐦', home: 'branch', motion: 'fly' },
}

const line = (id: string): VoiceRef => ({ line: `k-addtake/${id}` })

/** "Here are 3 frogs." (or "Here is one frog.") */
export function startLine(thing: KAddTakeThing, n: number): VoiceRef {
  return n === 1 ? line(`one-${thing}`) : { template: 'k-addtake/start', slots: { n, thing } }
}

/** "2 more hop in." / "2 swim away." (and "One more hops in." for one) */
export function changeLine(thing: KAddTakeThing, plot: 'join' | 'leave', n: number): VoiceRef {
  const id = `${K_ADDTAKE_VERB[thing]}${plot === 'join' ? 'In' : 'Away'}`
  return n === 1 ? line(`${id}-1`) : { template: `k-addtake/${id}`, slots: { n } }
}

const PRAISE: Record<'join' | 'leave' | 'frame', VoiceRef[]> = {
  join: [{ line: 'k-story-math/greatAdding' }, { line: 'k-story-math/smartThinking' }],
  leave: [{ line: 'k-story-math/greatTakingAway' }, { line: 'k-story-math/smartThinking' }],
  frame: [{ line: 'k-story-math/youMadeTen' }, { line: 'k-story-math/smartThinking' }],
}

const SKILL = {
  addTake: { id: 'k-add-take', label: 'adding and taking away' },
  makeTen: { id: 'k-make-ten', label: 'making ten' },
}

/** How far a round's `i`-th question may go: [biggest change, biggest total]. */
function reach(mode: Exclude<KAddTakeMode, 'make10'>, i: number): { change: number; total: number; least: number } {
  if (mode === 'within5') return i < 2 ? { change: 1, total: 4, least: 1 } : i < 4 ? { change: 2, total: 5, least: 1 } : { change: 3, total: 5, least: 1 }
  // within 10: past five from the start (the 5s are the stage before)
  return i < 2 ? { change: 2, total: 7, least: 6 } : i < 4 ? { change: 3, total: 9, least: 6 } : { change: 4, total: 10, least: 6 }
}

/** The make-ten ramp: how many of the ten are there to start (one or two empty spots first, then more). */
const TEN_START: readonly (readonly [number, number])[] = [
  [8, 9],
  [6, 8],
  [5, 7],
  [3, 6],
  [1, 5],
  [1, 9],
]

export function makeKAddTakeProvider(cfg: KAddTakeConfig = {}): Omit<ProblemProvider, 'next'> & { next(): ListenProblem } {
  const mode = cfg.mode ?? 'within5'
  const things = makeDeck(K_ADDTAKE_THINGS)
  const plots = makeDeck<'join' | 'leave'>(['join', 'leave'])
  const places = makePositionGuard()
  let serial = 0
  let asked = 0
  let lastSig = ''
  let lastA = -1

  function numbers(plot: MathPlot, i: number): { a: number; b: number } {
    if (plot === 'frame') {
      const [lo, hi] = TEN_START[Math.min(i, TEN_START.length - 1)]
      let a = randInt(lo, hi)
      if (a === lastA && hi > lo) a = a === hi ? a - 1 : a + 1
      return { a, b: 10 - a }
    }
    const r = reach(mode as Exclude<KAddTakeMode, 'make10'>, i)
    const b = randInt(1, r.change)
    if (plot === 'join') {
      // a + b within the round's reach, and past five in the within-10 stage
      const a = randInt(Math.max(1, r.least - b), r.total - b)
      return { a, b }
    }
    // leave: from at most the total, at least one stays
    const a = randInt(Math.max(b + 1, r.least), r.total)
    return { a, b }
  }

  function make(i: number): ListenProblem {
    const plot: MathPlot = mode === 'make10' ? 'frame' : plots.next()
    const thing = things.next()
    const art = K_ADDTAKE_ART[thing]
    const { a, b } = numbers(plot, i)
    const spec: MathStorySpec = {
      kind: 'mathStory',
      plot,
      a,
      b,
      emoji: art.emoji,
      place: 'falls',
      home: plot === 'frame' ? 'frame' : art.home,
      motion: art.motion,
      lines: plot === 'frame' ? [startLine(thing, a)] : [startLine(thing, a), changeLine(thing, plot as 'join' | 'leave', b)],
      ask: line(plot === 'frame' ? 'makeTen' : plot === 'join' ? 'howManyNow' : 'howManyLeft'),
    }
    return storyProblem(spec, places, {
      id: `kaddtake-${serial++}`,
      topic: 'kAddTake',
      subtopic: plot,
      skill: plot === 'frame' ? SKILL.makeTen : SKILL.addTake,
      praise: PRAISE[plot === 'frame' ? 'frame' : (plot as 'join' | 'leave')],
    })
  }

  return {
    topic: 'kAddTake',
    reset() {
      asked = 0
      lastSig = ''
      lastA = -1
      places.reset()
    },
    next(): ListenProblem {
      const i = asked++
      // never the same story twice in a row
      for (let tries = 0; ; tries++) {
        const p = make(i)
        const s = p.activity as MathStorySpec
        const sig = `${s.plot}|${s.a}|${s.b}`
        if (sig !== lastSig || tries >= 8) {
          lastSig = sig
          lastA = s.a
          places.note(p.options.indexOf(p.answer))
          return p
        }
      }
    },
  }
}

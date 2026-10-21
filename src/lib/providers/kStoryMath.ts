import type { ProblemProvider } from '../problem'
import type { ListenProblem } from '../../games/listenPlay/types'
import type { MathHome, MathMotion, MathPlace, MathStorySpec } from '../../games/listenPlay/activities/mathStorySpec'
import { K_WOODS_STORIES, type KWoodsPlot, type KWoodsStory, type KWoodsStoryId } from '../../voice/packs/k-woods'
import type { VoiceRef } from '../../voice/types'
import { randInt } from '../random'
import { makeDeck, makePositionGuard } from './kShared'
import { storyProblem, STORY_MAX } from './kMathStory'

/**
 * Story Woods (K.OA.2), voice-first, for the Listen & Play `mathStory`
 * activity: the narrator tells a tiny story (characters, a place, a little
 * plot), the child acts it out on screen (taps the newcomers in, the leavers
 * away, the pears into the basket, one carrot to each bunny), then taps the
 * answer. Stories come from the `k-woods` pack (35 of them):
 *
 * - `join`: "Bear picked 3 apples." "Then Fox brought her 2 more." "How many
 *   apples does Bear have now?"
 * - `leave`: "Owl saw 6 birds in the tree." "Then 2 flew away." "How many
 *   birds are still in the tree?"
 * - `together`: "Bear put 3 apples in her basket." "Then she put in 2 pears."
 *   "How many fruits are in her basket?"
 * - `compare`: "5 bunnies came for lunch." "There were only 3 carrots." "How
 *   many more carrots do we need?"
 *
 * A stage names the plots it tells and its biggest number (`max`: 5, then
 * 10). A round ramps (small changes first) and deals the plots like cards:
 * each one once before any repeats, never twice in a row; each plot's
 * stories come from their own deck.
 */

export interface KStoryMathConfig {
  /** Which kinds of story (default: adding to and taking from). */
  plots?: KWoodsPlot[]
  /** The biggest number in a story (default 10). */
  max?: number
}

/** Where each story happens and who is in it: emoji every Android tablet draws (Unicode 9 or older). */
export interface WoodsArt {
  place: MathPlace
  home: MathHome
  emoji: string
  /** The second kind (put together), or the treats (how many more). */
  emoji2?: string
  who?: string
  friend?: string
  motion: MathMotion
}

export const K_WOODS_ART: Record<KWoodsStoryId, WoodsArt> = {
  // add to
  bearApples: { place: 'woods', home: 'basket', emoji: '🍎', who: '🐻', friend: '🦊', motion: 'slide' },
  squirrelNuts: { place: 'woods', home: 'patch', emoji: '🌰', who: '🐿️', motion: 'slide' },
  henChicks: { place: 'farm', home: 'nest', emoji: '🐤', who: '🐔', motion: 'hop' },
  puppyBalloons: { place: 'park', home: 'patch', emoji: '🎈', who: '🐶', friend: '🐱', motion: 'float' },
  crabShells: { place: 'beach', home: 'patch', emoji: '🐚', who: '🦀', motion: 'slide' },
  bunnyTulips: { place: 'garden', home: 'patch', emoji: '🌷', who: '🐰', motion: 'hop' },
  penguinSnowmen: { place: 'snow', home: 'patch', emoji: '⛄', who: '🐧', motion: 'slide' },
  birdEggs: { place: 'tree', home: 'nest', emoji: '🥚', who: '🐦', motion: 'slide' },
  mouseCheese: { place: 'kitchen', home: 'plate', emoji: '🧀', who: '🐭', friend: '🐹', motion: 'slide' },
  monkeyBananas: { place: 'park', home: 'basket', emoji: '🍌', who: '🐵', friend: '🐘', motion: 'slide' },
  owlStars: { place: 'night', home: 'sky', emoji: '⭐', who: '🦉', motion: 'float' },
  // take from
  owlBirds: { place: 'tree', home: 'branch', emoji: '🐦', who: '🦉', motion: 'fly' },
  bearCookies: { place: 'kitchen', home: 'plate', emoji: '🍪', who: '🐻', friend: '🐰', motion: 'slide' },
  puppyFloat: { place: 'park', home: 'patch', emoji: '🎈', who: '🐶', motion: 'float' },
  bearFish: { place: 'river', home: 'water', emoji: '🐟', who: '🐻', motion: 'swim' },
  bunnyButterflies: { place: 'garden', home: 'patch', emoji: '🦋', who: '🐰', motion: 'fly' },
  penguinSnowflakes: { place: 'snow', home: 'patch', emoji: '❄️', who: '🐧', motion: 'melt' },
  chicksYard: { place: 'farm', home: 'patch', emoji: '🐤', friend: '🐔', motion: 'hop' },
  bunnyCarrots: { place: 'garden', home: 'patch', emoji: '🥕', who: '🐰', friend: '🐷', motion: 'slide' },
  frogBoats: { place: 'lake', home: 'water', emoji: '⛵', who: '🐸', motion: 'float' },
  owlPencils: { place: 'room', home: 'box', emoji: '✏️', who: '🦉', friend: '🐭', motion: 'slide' },
  foxLeaves: { place: 'woods', home: 'patch', emoji: '🍂', who: '🦊', motion: 'float' },
  // put together
  bearFruit: { place: 'woods', home: 'basket', emoji: '🍎', emoji2: '🍐', who: '🐻', motion: 'slide' },
  foxFruit: { place: 'garden', home: 'basket', emoji: '🍓', emoji2: '🍑', who: '🦊', motion: 'slide' },
  monkeyFruit: { place: 'park', home: 'basket', emoji: '🍌', emoji2: '🍊', who: '🐵', motion: 'slide' },
  bunnyFlowers: { place: 'garden', home: 'basket', emoji: '🌷', emoji2: '🌻', who: '🐰', motion: 'slide' },
  puppyToys: { place: 'room', home: 'box', emoji: '⚽', emoji2: '🚗', who: '🐶', motion: 'slide' },
  pigPicnic: { place: 'park', home: 'basket', emoji: '🍋', emoji2: '🍏', who: '🐷', motion: 'slide' },
  logFriends: { place: 'lake', home: 'log', emoji: '🐸', emoji2: '🐢', motion: 'hop' },
  // how many more
  bunnyLunch: { place: 'garden', home: 'blanket', emoji: '🐰', emoji2: '🥕', motion: 'slide' },
  kittenBalls: { place: 'park', home: 'patch', emoji: '🐱', emoji2: '🎾', motion: 'slide' },
  monkeyShare: { place: 'park', home: 'patch', emoji: '🐵', emoji2: '🍌', motion: 'slide' },
  bearHoney: { place: 'park', home: 'blanket', emoji: '🐻', emoji2: '🍯', motion: 'slide' },
  puppyHats: { place: 'room', home: 'patch', emoji: '🐶', emoji2: '🎩', motion: 'slide' },
  mouseSnack: { place: 'kitchen', home: 'blanket', emoji: '🐭', emoji2: '🧀', motion: 'slide' },
}

/** What the child is asked to do after the change line, per plot (k-story-math). */
const ACT: Record<KWoodsPlot, VoiceRef> = {
  join: { line: 'k-story-math/actIn' },
  leave: { line: 'k-story-math/actAway' },
  together: { line: 'k-story-math/actPut' },
  compare: { line: 'k-story-math/actGive' },
}

const PRAISE: VoiceRef[] = [{ line: 'k-story-math/youSolvedIt' }, { line: 'k-story-math/smartThinking' }]

const SKILL = {
  story: { id: 'k-story-problems', label: 'story problems' },
  more: { id: 'k-story-more', label: 'how many more' },
}

/** Every plot a stage can tell, in teaching order. */
export const WOODS_PLOTS: readonly KWoodsPlot[] = ['join', 'leave', 'together', 'compare']

/**
 * The two numbers of a story for a round's `i`-th question: inside the
 * numbers its lines are recorded for, a total (or a start) within `max`, the
 * change small at first.
 */
export function storyNumbers(story: KWoodsStory, max: number, i: number): { a: number; b: number } {
  const [aLo, aHi] = story.a
  const [bLo, bHi] = story.b
  const early = i < 2
  const bTop = (cap: number) => Math.max(bLo, Math.min(bHi, cap))
  switch (story.plot) {
    case 'join':
    case 'together': {
      const b = randInt(bLo, bTop(early ? 2 : 5))
      const a = randInt(aLo, Math.max(aLo, Math.min(aHi, max - b)))
      return { a, b: Math.min(b, max - a) }
    }
    case 'leave': {
      const a = randInt(aLo, Math.max(aLo, Math.min(aHi, max)))
      const b = randInt(bLo, Math.max(bLo, Math.min(bTop(early ? 2 : 4), a - 1)))
      return { a, b }
    }
    case 'compare': {
      const a = randInt(aLo, Math.max(aLo, Math.min(aHi, max)))
      // at least two treats, at least one friend still waiting (early: just one or two)
      const b = randInt(Math.max(bLo, early ? a - 2 : bLo), Math.max(bLo, Math.min(bHi, a - 1)))
      return { a, b }
    }
  }
}

export function makeKStoryMathProvider(cfg: KStoryMathConfig = {}): Omit<ProblemProvider, 'next'> & { next(): ListenProblem } {
  const max = Math.max(4, Math.min(STORY_MAX, cfg.max ?? STORY_MAX))
  const plots = makeDeck(cfg.plots?.length ? cfg.plots : (['join', 'leave'] as KWoodsPlot[]))
  const decks = Object.fromEntries(WOODS_PLOTS.map((p) => [p, makeDeck(K_WOODS_STORIES.filter((s) => s.plot === p))])) as Record<KWoodsPlot, ReturnType<typeof makeDeck<KWoodsStory>>>
  const places = makePositionGuard()
  let serial = 0
  let asked = 0
  let lastSig = ''

  function make(i: number): ListenProblem {
    const plot = plots.next()
    // (a story whose numbers can't fit the stage's biggest number waits for a later stage)
    const story = decks[plot].next((s) => s.a[0] + (plot === 'join' || plot === 'together' ? s.b[0] : 0) <= max)
    const art = K_WOODS_ART[story.id as KWoodsStoryId]
    const { a, b } = storyNumbers(story, max, i)
    const spec: MathStorySpec = {
      kind: 'mathStory',
      plot,
      a,
      b,
      emoji: art.emoji,
      emoji2: art.emoji2,
      place: art.place,
      home: art.home,
      who: art.who,
      friend: art.friend,
      motion: art.motion,
      lines: [
        { template: `k-woods/${story.id}-a`, slots: { n: a } },
        { template: `k-woods/${story.id}-b`, slots: { n: b } },
      ],
      ask: { line: `k-woods/${story.id}-q` },
      act: ACT[plot],
    }
    return storyProblem(spec, places, {
      id: `kwoods-${serial++}`,
      topic: 'kStoryMath',
      subtopic: `${plot}:${story.id}`,
      skill: plot === 'compare' ? SKILL.more : SKILL.story,
      praise: PRAISE,
    })
  }

  return {
    topic: 'kStoryMath',
    reset() {
      asked = 0
      lastSig = ''
      places.reset()
    },
    next(): ListenProblem {
      const i = asked++
      for (let tries = 0; ; tries++) {
        const p = make(i)
        const sig = p.subtopic ?? ''
        if (sig !== lastSig || tries >= 8) {
          lastSig = sig
          places.note(p.options.indexOf(p.answer))
          return p
        }
      }
    },
  }
}

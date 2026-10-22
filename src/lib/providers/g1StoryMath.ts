import type { ProblemProvider } from '../problem'
import type { ListenProblem } from '../../games/listenPlay/types'
import { storyAnswer, type MathPlot, type MathStorySpec } from '../../games/listenPlay/activities/mathStorySpec'
import { G1_WOODS_STORIES, g1WoodsLineId, type G1WoodsPlot, type G1WoodsStory, type G1WoodsStoryId } from '../../voice/packs/g1-woods'
import { voiceText } from '../../voice/registry'
import type { VoiceRef } from '../../voice/types'
import { randInt } from '../random'
import { makeDeck, makePositionGuard } from './kShared'
import { numeralCard } from './kMathStory'
import type { WoodsArt } from './kStoryMath'
import { factCards, type Mixup } from './g1Facts'

/**
 * Story Woods at 1st grade (1.OA.1–2), voice-first, for the Listen & Play
 * `mathStory` activity (kindergarten's, extended): the narrator tells a story
 * within 20, the child acts it out (brings the newcomers in, taps the leavers
 * away, takes one kind out, lines two groups up), taps the answer, and the
 * number sentence is written and read ("8 + 5 = 13"). Stories come from the
 * `g1-woods` pack (39 of them):
 *
 * - `join`, `leave`, `together`: the result unknown, as kindergarten's, bigger;
 * - `compare` / `fewer`: how many more, how many fewer (two rows matched up);
 * - `joinChange`, `leaveChange`: the change unknown ("Now Bear has 13. How
 *   many did Fox give her?"): count on or back to the number said;
 * - `joinStart`: the start unknown ("Bear had some apples…");
 * - `apart`: take apart ("12 flowers; 5 are tulips: how many sunflowers?");
 * - `three`: three groups put together (1.OA.2).
 *
 * A stage names the kinds it tells. A round ramps (small numbers first, up
 * to 20 later) and deals the kinds like cards: each once before any repeats,
 * never twice in a row; each kind's stories come from their own deck.
 */

export interface G1StoryMathConfig {
  /** Which kinds of story (default: adding to, taking from, putting together). */
  plots?: G1WoodsPlot[]
}

/** Where each story happens and who is in it: emoji every Android tablet draws (Unicode 9 or older). */
export interface G1WoodsArt extends WoodsArt {
  /** Three groups: the third kind. */
  emoji3?: string
}

export const G1_WOODS_ART: Record<G1WoodsStoryId, G1WoodsArt> = {
  // add to
  duckPond: { place: 'lake', home: 'water', emoji: '🦆', motion: 'swim' },
  sheepField: { place: 'farm', home: 'patch', emoji: '🐑', motion: 'hop' },
  penguinFish: { place: 'snow', home: 'plate', emoji: '🐟', who: '🐧', motion: 'slide' },
  gardenBees: { place: 'garden', home: 'patch', emoji: '🐝', motion: 'fly' },
  // take from
  logFrogs: { place: 'lake', home: 'log', emoji: '🐸', motion: 'hop' },
  squirrelSnack: { place: 'woods', home: 'patch', emoji: '🌰', who: '🐿️', motion: 'melt' },
  mouseCookies: { place: 'kitchen', home: 'plate', emoji: '🍪', who: '🐭', friend: '🐹', motion: 'slide' },
  pigBalloons: { place: 'park', home: 'patch', emoji: '🎈', who: '🐷', motion: 'float' },
  // put together
  foxBerries: { place: 'garden', home: 'basket', emoji: '🍓', emoji2: '🍒', who: '🦊', motion: 'slide' },
  pondPals: { place: 'lake', home: 'water', emoji: '🦆', emoji2: '🐢', motion: 'swim' },
  toyBox: { place: 'room', home: 'box', emoji: '⚽', emoji2: '🚗', who: '🐶', motion: 'slide' },
  farmYard: { place: 'farm', home: 'patch', emoji: '🐔', emoji2: '🐤', motion: 'hop' },
  // how many more
  penguinHats: { place: 'snow', home: 'blanket', emoji: '🐧', emoji2: '🎩', motion: 'slide' },
  beeFlowers: { place: 'garden', home: 'patch', emoji: '🐝', emoji2: '🌸', motion: 'slide' },
  puppyBalls: { place: 'park', home: 'patch', emoji: '🐶', emoji2: '🎾', motion: 'slide' },
  // how many fewer: the first group in a row, the second one waits by its owner
  applePicking: { place: 'woods', home: 'blanket', emoji: '🍎', emoji2: '🍎', friend: '🦊', motion: 'slide' },
  shellHunt: { place: 'beach', home: 'patch', emoji: '🐚', emoji2: '🐚', friend: '🐢', motion: 'slide' },
  starGazing: { place: 'night', home: 'sky', emoji: '⭐', emoji2: '⭐', friend: '🦇', motion: 'float' },
  carrotPulling: { place: 'garden', home: 'patch', emoji: '🥕', emoji2: '🥕', friend: '🐷', motion: 'slide' },
  // add to, the change unknown
  appleGift: { place: 'woods', home: 'basket', emoji: '🍎', who: '🐻', friend: '🦊', motion: 'slide' },
  branchBirds: { place: 'tree', home: 'branch', emoji: '🐦', motion: 'fly' },
  henNest: { place: 'farm', home: 'nest', emoji: '🥚', who: '🐔', motion: 'slide' },
  crabBox: { place: 'beach', home: 'box', emoji: '🐚', who: '🦀', motion: 'slide' },
  // take from, the change unknown
  treeBirds: { place: 'tree', home: 'branch', emoji: '🐦', motion: 'fly' },
  rockFish: { place: 'river', home: 'water', emoji: '🐟', motion: 'swim' },
  bearShare: { place: 'kitchen', home: 'plate', emoji: '🍪', who: '🐻', motion: 'slide' },
  windyLeaves: { place: 'woods', home: 'patch', emoji: '🍂', who: '🦊', motion: 'float' },
  // add to, the start unknown
  appleStart: { place: 'woods', home: 'basket', emoji: '🍎', who: '🐻', friend: '🦊', motion: 'slide' },
  frogStart: { place: 'lake', home: 'log', emoji: '🐸', motion: 'hop' },
  starStart: { place: 'night', home: 'sky', emoji: '⭐', who: '🦉', motion: 'float' },
  balloonStart: { place: 'park', home: 'patch', emoji: '🎈', who: '🐶', friend: '🐱', motion: 'float' },
  // take apart: the first kind is taken out, the second stays
  flowerSort: { place: 'garden', home: 'basket', emoji: '🌷', emoji2: '🌻', who: '🐰', motion: 'slide' },
  fruitSort: { place: 'park', home: 'basket', emoji: '🍌', emoji2: '🍊', who: '🐵', motion: 'slide' },
  pondSort: { place: 'lake', home: 'water', emoji: '🦆', emoji2: '🐢', motion: 'swim' },
  toySort: { place: 'room', home: 'box', emoji: '⚽', emoji2: '🚗', who: '🐶', motion: 'slide' },
  // three groups
  fruitBasket: { place: 'woods', home: 'basket', emoji: '🍎', emoji2: '🍐', emoji3: '🍑', who: '🐻', motion: 'slide' },
  pondParty: { place: 'lake', home: 'water', emoji: '🦆', emoji2: '🐸', emoji3: '🐢', motion: 'swim' },
  toyCleanup: { place: 'room', home: 'box', emoji: '⚽', emoji2: '🚗', emoji3: '🥁', who: '🐶', motion: 'slide' },
  flowerBunch: { place: 'garden', home: 'basket', emoji: '🌷', emoji2: '🌻', emoji3: '🌹', who: '🐰', motion: 'slide' },
}

/** Every kind a stage can tell, in teaching order. */
export const G1_WOODS_PLOTS: readonly G1WoodsPlot[] = ['join', 'leave', 'together', 'compare', 'fewer', 'joinChange', 'leaveChange', 'joinStart', 'apart', 'three']

/** The activity's plot for each kind of story (how many fewer is acted out as how many more). */
export const G1_PLOT: Record<G1WoodsPlot, MathPlot> = {
  join: 'join',
  leave: 'leave',
  together: 'together',
  compare: 'compare',
  fewer: 'compare',
  joinChange: 'joinChange',
  leaveChange: 'leaveChange',
  joinStart: 'joinStart',
  apart: 'apart',
  three: 'three',
}

const k = (id: string): VoiceRef => ({ line: `k-story-math/${id}` })
const g = (id: string): VoiceRef => ({ line: `g1-story-math/${id}` })

const PRAISE: VoiceRef[] = [g('storyStar'), k('youSolvedIt'), k('smartThinking')]

const SKILL = {
  story: { id: 'g1-story-problems', label: 'story problems within 20' },
  unknown: { id: 'g1-story-unknowns', label: 'story problems with a missing number' },
  compare: { id: 'g1-story-compare', label: 'how many more or fewer' },
  three: { id: 'g1-three-addends', label: 'adding three numbers' },
}
const SKILL_OF: Record<G1WoodsPlot, keyof typeof SKILL> = {
  join: 'story',
  leave: 'story',
  together: 'story',
  compare: 'compare',
  fewer: 'compare',
  joinChange: 'unknown',
  leaveChange: 'unknown',
  joinStart: 'unknown',
  apart: 'unknown',
  three: 'three',
}

/** The numbers of a story for a round's `i`-th question: `a`, `b` (and `c`, and the decoys), small at first. */
export interface G1StoryNumbers {
  a: number
  b: number
  c?: number
  extra?: number
}

export function g1StoryNumbers(plot: G1WoodsPlot, i: number): G1StoryNumbers {
  const early = i < 2
  const r = randInt
  switch (plot) {
    case 'join': {
      const b = early ? r(2, 4) : r(3, 6)
      return { a: early ? r(5, 8) : r(6, Math.min(12, 18 - b)), b }
    }
    case 'leave': {
      const a = early ? r(10, 13) : r(12, 16)
      return { a, b: early ? r(2, 4) : r(3, Math.min(7, a - 4)) }
    }
    case 'together': {
      const b = early ? r(3, 5) : r(4, 8)
      return { a: early ? r(4, 7) : r(6, Math.min(10, 18 - b)), b }
    }
    case 'compare':
    case 'fewer': {
      const a = early ? r(6, 8) : r(7, 10)
      return { a, b: early ? r(a - 2, a - 1) : r(3, a - 2) }
    }
    case 'joinChange': {
      const b = early ? r(2, 4) : r(3, 6)
      return { a: early ? r(4, 7) : r(6, Math.min(10, 16 - b)), b, extra: r(2, 3) }
    }
    case 'leaveChange': {
      const a = early ? r(9, 12) : r(11, 16)
      return { a, b: early ? r(2, 4) : r(3, 6) }
    }
    case 'joinStart': {
      const b = early ? r(2, 4) : r(3, 6)
      return { a: early ? r(3, 6) : r(5, Math.min(9, 15 - b)), b }
    }
    case 'apart': {
      const a = early ? r(2, 4) : r(3, 8)
      return { a, b: early ? r(Math.max(3, 7 - a), 6) : r(Math.max(2, 10 - a), Math.min(8, 16 - a)) }
    }
    case 'three':
      return early ? { a: r(2, 4), b: r(2, 3), c: r(2, 3) } : { a: r(3, 7), b: r(2, 5), c: r(2, 5) }
  }
}

/** The numbers each of a story's lines says (null: a line without one). */
export function lineNumbers(plot: G1WoodsPlot, n: G1StoryNumbers): (number | null)[] {
  const { a, b } = n
  switch (plot) {
    case 'joinChange':
      return [a, null, a + b]
    case 'leaveChange':
      return [a, null, a - b]
    case 'joinStart':
      return [null, b, a + b]
    case 'apart':
      return [a + b, a]
    case 'three':
      return [a, b, n.c ?? 0]
    default:
      return [a, b]
  }
}

/** The number sentence written once the answer is found, where its answer is, and how it is read. */
export function storySentence(plot: G1WoodsPlot, n: G1StoryNumbers): { tokens: (number | '+' | '−' | '=')[]; at: number; said: VoiceRef } {
  const { a, b } = n
  const plus = (x: number, y: number, z: number, at: number) => ({ tokens: [x, '+', y, '=', z] as (number | '+' | '−' | '=')[], at, said: { template: 'g1-story-math/sayPlus', slots: { a: x, b: y, c: z } } })
  const minus = (x: number, y: number, z: number, at: number) => ({ tokens: [x, '−', y, '=', z] as (number | '+' | '−' | '=')[], at, said: { template: 'g1-story-math/sayMinus', slots: { a: x, b: y, c: z } } })
  switch (plot) {
    case 'join':
    case 'together':
      return plus(a, b, a + b, 4)
    case 'leave':
    case 'compare':
    case 'fewer':
      return minus(a, b, a - b, 4)
    case 'joinChange':
      return plus(a, b, a + b, 2)
    case 'leaveChange':
      return minus(a, b, a - b, 2)
    case 'joinStart':
      return plus(a, b, a + b, 0)
    case 'apart':
      return minus(a + b, a, b, 4)
    case 'three': {
      const c = n.c ?? 0
      return { tokens: [a, '+', b, '+', c, '=', a + b + c], at: 6, said: { template: 'g1-story-math/sayPlus3', slots: { a, b, c, d: a + b + c } } }
    }
  }
}

/** The likely wrong answers for a story, each with a word (most telling first). */
export function storyMixups(plot: G1WoodsPlot, n: G1StoryNumbers): Mixup[] {
  const { a, b } = n
  const c = n.c ?? 0
  switch (plot) {
    case 'join':
      return [[a, k('noteStart')], [b, null]]
    case 'together':
      return [[a, k('noteOneKind')], [b, k('noteOneKind')]]
    case 'leave':
      return [[a, k('noteStart')], [b, k('noteGone')], [a + b, k('noteSomeLeft')]]
    case 'compare':
      return [[a, k('noteFriends')], [b, k('noteHave')]]
    case 'fewer':
      return [[a, g('noteBigger')], [b, g('noteSmaller')]]
    case 'joinChange':
      return [[a + b, g('noteTotal')], [a, k('noteStart')]]
    case 'leaveChange':
      return [[a - b, g('noteLeftNow')], [a, k('noteStart')]]
    case 'joinStart':
      return [[a + b, g('noteTotal')], [b, g('noteCame')]]
    case 'apart':
      return [[a + b, g('noteAll')], [a, g('noteTakenOut')]]
    case 'three':
      return [[a + b, g('noteTwoGroups')], [b + c, g('noteTwoGroups')], [a + c, g('noteTwoGroups')]]
  }
}

/** What the child is asked to do once the story is told. */
function actOf(story: G1WoodsStory, n: G1StoryNumbers): VoiceRef {
  switch (story.plot) {
    case 'join':
    case 'joinStart':
      return k('actIn')
    case 'leave':
      return k('actAway')
    case 'together':
    case 'three':
      return k('actPut')
    case 'compare':
      return k('actGive')
    case 'fewer':
      return g('actLineUp')
    case 'joinChange':
      return g('actFill')
    case 'leaveChange':
      return { template: 'g1-story-math/actAwayTo', slots: { n: n.a - n.b } }
    case 'apart':
      return { line: `g1-woods/${story.id}-act` }
  }
}

/** A story's `mathStory` question: the scene, the cards, a word for each wrong one, the sentence for after. */
export function g1StoryProblem(story: G1WoodsStory, n: G1StoryNumbers, places: { arrange<T>(o: readonly T[], answer: T): T[] }, id: string): ListenProblem {
  const art = G1_WOODS_ART[story.id as G1WoodsStoryId]
  const nums = lineNumbers(story.plot, n)
  const lines: VoiceRef[] = story.lines.map((_, i): VoiceRef => {
    const v = nums[i]
    const lineId = `g1-woods/${g1WoodsLineId(story.id, i)}`
    return v === null || v === undefined ? { line: lineId } : { template: lineId, slots: { n: v } }
  })
  const sentence = storySentence(story.plot, n)
  const spec: MathStorySpec = {
    kind: 'mathStory',
    plot: G1_PLOT[story.plot],
    a: n.a,
    b: n.b,
    c: n.c,
    extra: n.extra,
    emoji: art.emoji,
    emoji2: art.emoji2,
    emoji3: art.emoji3,
    place: art.place,
    home: art.home,
    who: art.who,
    friend: art.friend,
    motion: art.motion,
    lines,
    ask: { line: `g1-woods/${story.id}-q` },
    act: actOf(story, n),
    sentence: sentence.tokens,
    sentenceAnswerAt: sentence.at,
    sentenceSaid: sentence.said,
  }
  const answer = storyAnswer(spec)
  const { cards, notes } = factCards(answer, storyMixups(story.plot, n))
  const options = places.arrange(cards, answer)
  return {
    id,
    topic: 'g1StoryMath',
    subtopic: `${story.plot}:${story.id}`,
    skill: SKILL[SKILL_OF[story.plot]],
    praise: PRAISE,
    difficulty: Math.max(n.a, n.b, answer),
    prompt: [...lines, spec.act!, spec.ask].map((r) => voiceText(r)).join(' '),
    options,
    answer,
    speech: spec.ask,
    pictureOptions: options.map(numeralCard),
    notes: options.map((v) => (v === answer ? null : (notes.get(v) ?? null))),
    activity: spec,
  }
}

export function makeG1StoryMathProvider(cfg: G1StoryMathConfig = {}): Omit<ProblemProvider, 'next'> & { next(): ListenProblem } {
  const plots = makeDeck(cfg.plots?.length ? cfg.plots : (['join', 'leave', 'together'] as G1WoodsPlot[]))
  const all: readonly G1WoodsStory[] = G1_WOODS_STORIES
  const decks = Object.fromEntries(G1_WOODS_PLOTS.map((p) => [p, makeDeck(all.filter((s) => s.plot === p))])) as Record<G1WoodsPlot, ReturnType<typeof makeDeck<G1WoodsStory>>>
  const places = makePositionGuard()
  let serial = 0
  let asked = 0
  let lastSig = ''

  return {
    topic: 'g1StoryMath',
    reset() {
      asked = 0
      lastSig = ''
      places.reset()
    },
    next(): ListenProblem {
      const i = asked++
      for (let tries = 0; ; tries++) {
        const plot = plots.next()
        const story = decks[plot].next()
        const p = g1StoryProblem(story, g1StoryNumbers(plot, i), places, `g1woods-${serial++}`)
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

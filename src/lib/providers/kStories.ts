import type { ProblemProvider } from '../problem'
import type { ListenProblem } from '../../games/listenPlay/types'
import { K_STORIES, type KStoryId } from '../../voice/packs/k-stories'
import { voiceText } from '../../voice/registry'
import type { VoiceRef } from '../../voice/types'
import { shuffle } from '../random'
import { makeDeck } from './kShared'

/**
 * Kindergarten story order (Writing Workshop, K; RL.K.2–3, W.K.3), for the
 * Listen & Play `order` activity: the narrator tells a tiny three-picture
 * story, one sentence per picture (each lights up as its sentence is said),
 * the pictures mix themselves up, and the child taps them into the first,
 * next and last slots.
 *
 * Stories come from a deck (no story twice until all have been told), and the
 * pictures are never left in story order, nor mixed the same way twice in a row.
 */

/** The pictures for each story in the k-stories voice pack: emoji every Android tablet draws (Unicode 9 or older). */
export const STORY_PICTURES: Record<KStoryId, readonly [string, string, string]> = {
  egg: ['🥚', '🐣', '🐔'],
  flower: ['🌱', '🌿', '🌻'],
  butterfly: ['🐛', '🍃', '🦋'],
  snowman: ['❄️', '⛄', '💧'],
  bedtime: ['🛁', '📖', '😴'],
  pizza: ['🍅', '🧀', '🍕'],
  rainbow: ['☁️', '🌧️', '🌈'],
  apple: ['🌸', '🍏', '🍎'],
  day: ['🌅', '☀️', '🌙'],
  growUp: ['👶', '👦', '👨'],
  tree: ['🌰', '🌱', '🌳'],
  mail: ['✏️', '✉️', '📮'],
  popcorn: ['🌽', '🔥', '🍿'],
}

/** A story-order question's activity (`ListenProblem.activity`, kind `order`). */
export interface OrderSpec {
  kind: 'order'
  story: KStoryId
  /** The pictures in story order: first, next, last. */
  pictures: readonly [string, string, string]
  /** The sentence for each picture, in story order. */
  lines: readonly [VoiceRef, VoiceRef, VoiceRef]
  /** Where each picture sits once mixed up: `mixed[k]` is the story step shown in place k. */
  mixed: readonly number[]
}

export const isOrderSpec = (s: { kind: string } | undefined): s is OrderSpec => s?.kind === 'order'

const PRAISE: VoiceRef[] = [{ line: 'k-stories/youKnowStory' }, { line: 'k-stories/greatRemembering' }]

export function makeKStoriesProvider(): Omit<ProblemProvider, 'next'> & { next(): ListenProblem } {
  const deck = makeDeck(K_STORIES.map((s) => s.id))
  let serial = 0
  let lastMix = ''
  const firstAt: number[] = []

  /** A mix that isn't story order, isn't the last one, and doesn't keep the first picture in one place. */
  function mix(): number[] {
    let m = [1, 2, 0]
    for (let tries = 0; tries < 30; tries++) {
      const c = shuffle([0, 1, 2])
      if (c.join('') === '012') continue
      m = c
      const where = c.indexOf(0)
      const third = firstAt.length >= 2 && firstAt[firstAt.length - 1] === where && firstAt[firstAt.length - 2] === where
      if (c.join('') !== lastMix && !third) break
    }
    lastMix = m.join('')
    firstAt.push(m.indexOf(0))
    if (firstAt.length > 4) firstAt.shift()
    return m
  }

  return {
    topic: 'kStories',
    reset() {
      serial = 0
    },
    next(): ListenProblem {
      const id = deck.next()
      const story = K_STORIES.find((s) => s.id === id)!
      const speech: VoiceRef = { line: 'k-stories/listen' }
      const activity: OrderSpec = {
        kind: 'order',
        story: id,
        pictures: STORY_PICTURES[id],
        lines: [{ line: `k-stories/${id}-1` }, { line: `k-stories/${id}-2` }, { line: `k-stories/${id}-3` }],
        mixed: mix(),
      }
      return {
        id: `kstory-${serial++}`,
        topic: 'kStories',
        subtopic: id,
        prompt: `${voiceText(speech)} ${story.lines.join(' ')}`,
        // (answered by putting the pictures in order: the activity checks each tap)
        options: [],
        answer: STORY_PICTURES[id].join(''),
        skill: { id: 'k-story-order', label: 'telling a story in order' },
        speech,
        praise: PRAISE,
        activity,
      }
    },
  }
}

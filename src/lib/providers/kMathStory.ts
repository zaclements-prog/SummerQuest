import type { PictureOption } from '../problem'
import type { ListenProblem } from '../../games/listenPlay/types'
import { storyAnswer, type MathStorySpec } from '../../games/listenPlay/activities/mathStorySpec'
import { voiceText } from '../../voice/registry'
import type { VoiceRef } from '../../voice/types'
import { shuffle } from '../random'

/**
 * What Add-and-Take Falls and Story Woods share (K.OA.1–5): a `mathStory`
 * question (src/games/listenPlay/activities/MathStory.tsx) answered with
 * three numeral cards, the wrong two chosen to be worth getting wrong, and a
 * word about each wrong one.
 */

export const STORY_MAX = 10

const kit = (id: string): VoiceRef => ({ line: `k-story-math/${id}` })

export const numeralCard = (v: number): PictureOption => ({ value: v, picture: { kind: 'numeral', n: v }, speech: { template: 'listen/number', slots: { n: v } } })

type Numbers = Pick<MathStorySpec, 'plot' | 'a' | 'b'>

/**
 * The mix-ups a five-year-old makes, most telling first: the number at the
 * start (nothing joined or left), the change itself, the other operation, or
 * a ten-frame's full spots.
 */
function mixUps({ plot, a, b }: Numbers): number[] {
  switch (plot) {
    case 'join':
      return [a, b, a - b]
    case 'together':
      return [a, b]
    case 'leave':
      return [a, a + b, b]
    case 'compare':
      return [a, b]
    case 'frame':
      return [a, 10]
    default:
      // (1st grade's stories: lib/providers/g1StoryMath)
      return []
  }
}

/**
 * Two wrong cards for a story: one a likely mix-up when there is one, and one
 * a step from the answer (a miscount), all different, all 1–10.
 */
export function storyDistractors(s: Numbers): number[] {
  const answer = storyAnswer(s)
  const ok = (v: number) => Number.isInteger(v) && v >= 1 && v <= STORY_MAX && v !== answer
  const out: number[] = []
  const add = (v: number) => {
    if (out.length < 2 && ok(v) && !out.includes(v)) out.push(v)
  }
  const mix = mixUps(s).filter(ok)
  if (mix.length) add(mix[0])
  for (const v of shuffle([answer - 1, answer + 1])) add(v)
  for (const v of mix) add(v)
  for (const v of [answer + 2, answer - 2, answer + 3, answer - 3]) add(v)
  return out
}

/** A word about a wrong card ("That's how many there were at the start."), or null. */
export function storyNote(s: Numbers, v: number): VoiceRef | null {
  const answer = storyAnswer(s)
  if (v === answer) return null
  switch (s.plot) {
    case 'join':
      return v === s.a ? kit('noteStart') : v < answer ? kit('noteMoreCame') : null
    case 'together':
      return v === s.a || v === s.b ? kit('noteOneKind') : null
    case 'leave':
      return v === s.a ? kit('noteStart') : v === s.b ? kit('noteGone') : v > answer ? kit('noteSomeLeft') : null
    case 'compare':
      return v === s.a ? kit('noteFriends') : v === s.b ? kit('noteHave') : null
    case 'frame':
      return v === s.a ? kit('noteFull') : v === 10 ? kit('noteTen') : null
    default:
      // (1st grade's stories: lib/providers/g1StoryMath)
      return null
  }
}

/** Keeps the answer moving between the cards (kShared's position guard: the provider notes where each ASKED question put it). */
export interface Arranger {
  arrange<T>(options: readonly T[], answer: T): T[]
}

/**
 * A `mathStory` question: the activity, its numeral cards (in `places`' order),
 * a word for each wrong card, the story as its caption, and the question as
 * its `speech`.
 */
export function storyProblem(
  spec: MathStorySpec,
  places: Arranger,
  base: Pick<ListenProblem, 'id' | 'topic' | 'subtopic' | 'skill' | 'praise'>,
): ListenProblem {
  const answer = storyAnswer(spec)
  const options = places.arrange([answer, ...storyDistractors(spec)], answer)
  const said = [...spec.lines, ...(spec.act ? [spec.act] : []), spec.ask].map((r) => voiceText(r))
  return {
    ...base,
    difficulty: Math.max(spec.a, spec.b, answer),
    prompt: said.join(' '),
    options,
    answer,
    speech: spec.ask,
    pictureOptions: options.map(numeralCard),
    notes: options.map((v) => storyNote(spec, v)),
    activity: spec,
  }
}

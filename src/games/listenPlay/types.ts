import type { ComponentType } from 'react'
import type { GuideStep } from '../../guide/store'
import type { Picture, Problem } from '../../lib/problem'
import type { VoiceRef } from '../../voice/types'

/**
 * What the Listen & Play guide can spotlight on a question screen: the
 * question's picture, all the answer cards, one half of a `pair`, or one card
 * (`card0`, `card1`, …: by its index in `pictureOptions`).
 */
export type ListenTarget = 'picture' | 'cards' | 'pair0' | 'pair1' | `card${number}`

/**
 * What the walkthrough after a wrong pick counts aloud (each thing lights up
 * as its number is said):
 *
 * - `count` (default): the question's group, or the sides of the question's
 *   shape; else the picked card's group;
 * - `each`: every group on screen in turn, both halves of a `pair` or every
 *   open card (comparing: "Let's count each group.");
 * - `picked`: the picked card: its group, or the sides of its shape;
 * - `countUp`: count up to the biggest numeral card, each numeral card lit as
 *   its number is said (the number said later is bigger);
 * - `answer`: the answer card (its group, or the sides of its shape), right
 *   after `reteach` has named it ("This is a square. Four sides, all the
 *   same." "One, two, three, four.");
 * - `none`: nothing to count.
 */
export type ListenWalkthrough = 'count' | 'each' | 'picked' | 'countUp' | 'answer' | 'none'

/**
 * A K–1 question as Listen & Play reads it: a `Problem` with `speech` and
 * `pictureOptions` (the phase-0 contract), plus optional extras a provider
 * may add. Structural, so any provider's problems fit; the extras are a
 * candidate for the shared contract once a second game uses them.
 */
export interface ListenProblem extends Problem {
  /**
   * The question's own picture: the apples in "How many apples?", the numeral
   * in "Tap the group with 5 apples", the big B in "Find the little b". A
   * group picture is also what the walkthrough counts along after a wrong
   * answer, and what the child can tap to count (a shape: its sides).
   * Without it, an `array` visual with an emoji becomes a group, and any
   * other visual is drawn by the shared VisualRenderer. With nothing to show,
   * the cards take the whole screen.
   */
  picture?: Picture
  /** Two pictures side by side to compare ("Are they the same?"), drawn instead of `picture`. */
  pair?: readonly [Picture, Picture]
  /**
   * When the guide spotlights what, as phrases of the spoken question (or a
   * fraction of the line, 0–1). Default: the picture as the line starts, then
   * the cards on "tap" (or half-way through).
   */
  cues?: { target: ListenTarget; cue?: string | number }[]
  /**
   * After the question, name each card as it lights up ("Ball! Cat! Sun!"),
   * with its own `speech`: for pictures a child might call something else.
   */
  nameCards?: boolean
  walkthrough?: ListenWalkthrough
  /**
   * Said about a card when it was picked and isn't the answer, before any
   * count-along (by card index): "Cat starts with C.", "A cube is solid."
   */
  notes?: readonly (VoiceRef | null)[]
  /**
   * After a miss, the answer card lights up as this is said ("This is the
   * letter A.", "This is a hexagon. It has six sides."): the miss re-teaches,
   * so the next try isn't a guess between the cards left. Said after the
   * note about the picked card, before any count-along.
   */
  reteach?: VoiceRef
  /** Praise for this question, taking turns with the kit's own. */
  praise?: readonly VoiceRef[]
  /**
   * Answered by doing something instead of tapping a card: tracing a letter,
   * tapping a drum once per part of a word, putting a story in order. The
   * activity (registered by `kind` in ./activities) takes the whole stage;
   * the shell still asks the question, keeps the 🔊, the progress dots, the
   * stars, the praise and the "let's look again". `pictureOptions` and
   * `options` are then unused (`answer` is still what the activity checks).
   */
  activity?: ListenActivitySpec
}

/** Which activity, plus whatever that activity needs (each activity narrows it). */
export interface ListenActivitySpec {
  kind: string
}

/** What the shell is doing (the same phases the cards follow). */
export type ListenPhase = 'loading' | 'ask' | 'judge' | 'praise' | 'oops' | 'done'

/**
 * What an activity component gets from the shell. It draws the whole stage
 * (inside a box with the `lp-activity` guide id) and reports each finished
 * try with `onAttempt`; right → praise and on to the next question, not yet →
 * "Hmm, let's look again", then the activity's help (see `registerHelp`),
 * then "Your turn!" and `misses` goes up by one.
 */
export interface ListenActivityProps<S extends ListenActivitySpec = ListenActivitySpec> {
  problem: ListenProblem
  spec: S
  phase: ListenPhase
  /** The child can act now: the question has been put (phase 'ask') and no dialog is open. */
  active: boolean
  /** Tries on this question that weren't right yet (0 on the first): help more as it grows. */
  misses: number
  /** One finished try. Ignored unless `active`. */
  onAttempt(correct: boolean): void
  /**
   * The help the shell runs after "let's look again" (a hand tracing the
   * stroke, the drum tapped once per part as the voice says them): an async
   * function that resolves when it is done (or `null` for none). The latest
   * registered one is used.
   */
  registerHelp(help: (() => Promise<void>) | null): void
}

/** An activity: its component, and (optionally) how the question is put. */
export interface ListenActivityDef<S extends ListenActivitySpec = ListenActivitySpec> {
  Component: ComponentType<ListenActivityProps<S>>
  /**
   * What the narrator says and points at as the question is asked. Default:
   * the question's `speech`, lighting the activity's area. Guide ids inside
   * the activity are the activity's own (`data-guide`). `misses`: tries on this
   * question that weren't right yet (asked again after help, the pointing
   * can show where to go on rather than where to finish).
   */
  askSteps?(problem: ListenProblem, spec: S, misses: number): GuideStep[]
}

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
 * - `none`: nothing to count.
 */
export type ListenWalkthrough = 'count' | 'each' | 'picked' | 'countUp' | 'none'

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
  /** Praise for this question, taking turns with the kit's own. */
  praise?: readonly VoiceRef[]
}

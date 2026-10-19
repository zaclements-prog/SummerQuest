import type { Picture, Problem } from '../../lib/problem'

/** What the Listen & Play guide can spotlight on a question screen. */
export type ListenTarget = 'picture' | 'cards'

/**
 * A K–1 question as Listen & Play reads it: a `Problem` with `speech` and
 * `pictureOptions` (the phase-0 contract), plus two optional extras a provider
 * may add. Structural, so any provider's problems fit; the extras are a
 * candidate for the shared contract once a second game uses them.
 */
export interface ListenProblem extends Problem {
  /**
   * The question's own picture: the apples in "How many apples?", the numeral
   * in "Tap the group with 5 apples". A group picture is also what the
   * walkthrough counts along after a wrong answer, and what the child can tap
   * to count. Without it, an `array` visual with an emoji becomes a group, and
   * any other visual is drawn by the shared VisualRenderer.
   */
  picture?: Picture
  /**
   * When the guide spotlights what, as phrases of the spoken question (or a
   * fraction of the line, 0–1). Default: the picture as the line starts, then
   * the cards on "tap" (or half-way through).
   */
  cues?: { target: ListenTarget; cue?: string | number }[]
}

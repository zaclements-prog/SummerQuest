import type { Picture, PictureOption } from '../../../lib/problem'
import type { VoiceRef } from '../../../voice/types'
import type { ListenActivitySpec } from '../types'

/**
 * The `readAlong` activity's question (Word Reef, 1st grade): something
 * printed, in Andika, read with the voice, then a choice of big cards. Plain
 * data (no React), so providers can build it.
 *
 * - `word` ("Read a word"): a word to read, then the card with its picture.
 *   The voice never says the word until the child has answered (or, after a
 *   miss, it sounds it out with each letter lighting up).
 * - `gap` ("c _ t"): a word's picture, the word with its middle letter
 *   missing, and letter cards; the right one drops into the gap.
 * - `sentence` ("Read along"): a sentence read aloud, each word lighting as
 *   it is said, then a question answered with a picture.
 */
export interface ReadAlongSpec extends ListenActivitySpec {
  kind: 'readAlong'
  layout: 'word' | 'gap' | 'sentence'
  /** What is printed, in pieces: a word's letters (or letter teams like "sh"), or a sentence's words ("mat."). */
  units: readonly string[]
  /** `gap`: the piece left out (its letter is the answer). */
  gap?: number
  /** `gap`: the word's picture, shown above it. */
  picture?: Picture
  /** The cards (pictures, or letter tiles); the right one's value is the problem's `answer`. */
  cards: readonly PictureOption[]
  /**
   * Read aloud with the pieces lighting: a sentence (as it is asked, and again
   * in the help), or a word sounded out (the help). `at[i]` is where piece i
   * is said in the line's text (−1: not lit on its own); from `whole` on, every
   * piece is lit together ("…tuh. Cat!").
   */
  read: { line: VoiceRef; at: readonly number[]; whole?: number }
  /** `sentence`: the question asked once it has been read ("Who is on the mat?"). */
  ask?: VoiceRef
  /** After the question, name each card as it lights up (pictures a child might call something else). */
  nameCards?: boolean
  /** Said before the reading in the help ("Let's sound it out."). */
  helpIntro?: VoiceRef
  /** `sentence`: the piece that answers the question (it stays lit after the help reads it). */
  key?: number
}

/** Guide ids inside the activity: the printed text, the gap, the picture; the cards keep the kit's `lp-card-<i>`. */
export const RA_TEXT = 'ra-text'
export const RA_GAP = 'ra-gap'
export const RA_PICTURE = 'ra-picture'

/** Where each word of `text` starts (the offsets a sentence's words light at). */
export function wordOffsets(text: string): number[] {
  const out: number[] = []
  const re = /\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) out.push(m.index)
  return out
}

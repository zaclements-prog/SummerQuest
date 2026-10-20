import type { VoiceRef } from '../../../voice/types'
import type { ListenActivitySpec } from '../types'

/**
 * The `drum` activity's question ("Clap the parts", RF.K.2b): a word said with
 * its picture shown; the child taps the drum once per part, then ✓. Plain
 * data (no React), so providers can build it.
 */
export interface DrumSpec extends ListenActivitySpec {
  kind: 'drum'
  /** The word ("tiger"): its picture is shown, and the question says it. */
  word: string
  /** Its picture (an emoji every Android tablet draws). */
  emoji: string
  /** How many parts it has (1–3): the taps that are right. */
  parts: number
  /** The help line, said as the drum is tapped once per part ("Tie… gur."): parts separated by "…". */
  partsLine: VoiceRef
}

/** Guide ids inside the drum activity: the word's picture, the drum, the ✓. */
export const LP_DRUM_WORD = 'lp-drum-word'
export const LP_DRUM = 'lp-drum'
export const LP_DRUM_CHECK = 'lp-drum-check'

/** The most claps the row shows (more taps still sound, but a K word has 1–3 parts). */
export const DRUM_MAX_TAPS = 6

/** Where each part starts in the help line's text ("Tie… gur." → [0, 5]), so the drum is tapped as each part is said. */
export function partOffsets(text: string): number[] {
  const out: number[] = []
  const re = /[^\s…]+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) out.push(m.index)
  return out
}

import type { VoiceRef } from '../../../voice/types'
import type { ListenActivitySpec } from '../types'

/**
 * The `tiles` activity's question (Writing Workshop, 1st grade): build
 * something from tiles, in order, into a row of slots. Plain data (no React),
 * so providers can build it.
 *
 * - `letters` ("Spell it"): a word's picture, one slot per letter, letter
 *   tiles (its letters and a few others); a tap says the letter's name.
 * - `words` ("Build a sentence"): one slot per word and one for the period,
 *   word tiles (the first word with its capital) and the period tile; later
 *   on, the first word in small letters too, which doesn't start a sentence.
 *
 * A tap puts a tile in the next empty slot; a tap on a filled slot sends its
 * tile back. When every slot is filled it is checked: right → the whole thing
 * is said; not yet → the help says it again, each slot lighting with the tile
 * that goes there, and the tiles in the wrong place go back.
 */
export interface TilesSpec extends ListenActivitySpec {
  kind: 'tiles'
  mode: 'letters' | 'words'
  /** What goes in the slots, in order: ['c', 'a', 't'] or ['The', 'dog', 'ran', '.']. */
  units: readonly string[]
  /** Every tile on the tray, in the order shown: each unit once, and the extra ones. */
  tiles: readonly string[]
  /** Said when a tile is tapped (by tile index; null: nothing). */
  tileSpeech: readonly (VoiceRef | null)[]
  /** `letters`: the word's picture. */
  emoji?: string
  /** The help line, slot i lighting with its tile at `at[i]` (−1: with the one before), e.g. "Kuh… aa… tuh. Cat!". */
  help: { line: VoiceRef; at: readonly number[] }
  /** Said before the help line ("Let's spell it together.", the capital-and-period rule). */
  helpIntro?: VoiceRef
  /** Said once it is built (the word, or the sentence read back with each slot lighting at `at[i]`). */
  done?: { line: VoiceRef; at: readonly number[] }
}

/** Guide ids inside the activity: the slots row, the tray, the picture. */
export const TILES_SLOTS = 'tiles-slots'
export const TILES_TRAY = 'tiles-tray'
export const TILES_PICTURE = 'tiles-picture'
export const tilesSlot = (i: number) => `tiles-slot-${i}`
export const tilesTile = (i: number) => `tiles-tile-${i}`

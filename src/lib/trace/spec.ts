import type { VoiceRef } from '../../voice/types'
import type { GlyphKind } from './glyphs'

/**
 * A trace question's activity (`ListenProblem.activity`, kind `trace`): which
 * glyph to trace, and what celebrates it when it's done. Plain data, so a
 * provider builds it and the Listen & Play `trace` activity draws it.
 */
export interface TraceSpec {
  kind: 'trace'
  glyph: GlyphKind
  /** The glyph's id: `B`, `7`, `circle`. */
  id: string
  /** Said when it's done ("B!", "seven!"); warm-ups have none. */
  name?: VoiceRef
  /** A letter's picture word, shown (and said) when it's done: B → ⚽ "ball!". */
  picture?: { emoji: string; speech: VoiceRef }
}

export const isTraceSpec = (s: { kind: string } | undefined): s is TraceSpec => s?.kind === 'trace'

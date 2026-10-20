import type { ProblemProvider } from '../problem'
import type { ListenProblem } from '../../games/listenPlay/types'
import { K_PICTURE_WORDS } from '../../voice/packs/k-letters'
import { voiceText } from '../../voice/registry'
import type { VoiceRef } from '../../voice/types'
import { LETTER_FAMILIES, WARMUP_FAMILIES, glyph, type Glyph, type GlyphKind } from '../trace/glyphs'
import type { TraceSpec } from '../trace/spec'
import { K_WORD_EMOJI } from './kLetters'
import { makeDeck } from './kShared'

/**
 * Kindergarten tracing, voice-first, for the Listen & Play `trace` activity
 * (Writing Workshop). Every question is one glyph to trace with a finger,
 * stroke by stroke from the green dot:
 *
 * - `warmup`: pre-writing strokes: both lines (down, across), a slant, the
 *   circle and the C-curve, then a zig-zag or a wave;
 * - `numbers`: six of the numerals 0–9, in counting order;
 * - `letters`: the capital letters by stroke family: two with straight
 *   lines (L T I E F H), two with slants (A K M N V W X Y Z), then two with
 *   curves (C O Q G S D P B R J U).
 *
 * A round (`TRACE_ROUND`, the stage's question count) deals each family its
 * share from its own shuffled deck, kept in the family's teaching order. The
 * decks carry on across rounds (a replay `reset()`s to a new round, not to
 * the same letters), so a few plays meet every glyph.
 */

export type KTraceMode = 'warmup' | 'numbers' | 'letters'

export interface KTraceConfig {
  mode?: KTraceMode
}

/** How many glyphs a round deals (the trace stages' question count). */
export const TRACE_ROUND = 6

interface Family {
  kind: GlyphKind
  ids: readonly string[]
  take: number
}

const FAMILIES: Record<KTraceMode, Family[]> = {
  warmup: [
    { kind: 'warmup', ids: WARMUP_FAMILIES.lines, take: 2 },
    { kind: 'warmup', ids: WARMUP_FAMILIES.slants, take: 1 },
    { kind: 'warmup', ids: WARMUP_FAMILIES.curves, take: 2 },
    { kind: 'warmup', ids: WARMUP_FAMILIES.patterns, take: 1 },
  ],
  numbers: [{ kind: 'digit', ids: '0123456789'.split(''), take: 6 }],
  letters: [
    { kind: 'letter', ids: LETTER_FAMILIES.straight, take: 2 },
    { kind: 'letter', ids: LETTER_FAMILIES.slant, take: 2 },
    { kind: 'letter', ids: LETTER_FAMILIES.curve, take: 2 },
  ],
}

const SKILL: Record<GlyphKind, { id: string; label: string }> = {
  warmup: { id: 'k-trace-lines', label: 'tracing lines and curves' },
  digit: { id: 'k-trace-numbers', label: 'writing numbers' },
  letter: { id: 'k-trace-letters', label: 'writing capital letters' },
}

const PRAISE: VoiceRef[] = [{ line: 'k-trace/greatTracing' }, { line: 'k-trace/niceLines' }]

/** How a glyph is introduced ("Let's trace the letter B!", "…a seven!", "…a circle!"). */
export function traceIntro(g: Pick<Glyph, 'kind' | 'id'>): VoiceRef {
  if (g.kind === 'letter') return { template: 'k-trace/letter', slots: { letter: g.id } }
  if (g.kind === 'digit') return { line: `k-trace/digit-${g.id}` }
  return { line: `k-trace/warm-${g.id.startsWith('slant') ? 'slant' : g.id}` }
}

/** A letter's picture word: the first k-letters word that starts with it (B → ball), if any. */
export function pictureWord(letter: string): (typeof K_PICTURE_WORDS)[number] | undefined {
  return K_PICTURE_WORDS.find((w) => w[0] === letter.toLowerCase())
}

/** The trace activity for a glyph: what to trace, and its name and picture word for when it's done. */
export function traceSpec(kind: GlyphKind, id: string): TraceSpec {
  const g = glyph(kind, id)
  const spec: TraceSpec = { kind: 'trace', glyph: g.kind, id: g.id }
  if (g.kind === 'digit') spec.name = { template: 'listen/number', slots: { n: Number(g.id) } }
  if (g.kind === 'letter') {
    spec.name = { template: 'k-letters/letter', slots: { letter: g.id } }
    const w = pictureWord(g.id)
    if (w) spec.picture = { emoji: K_WORD_EMOJI[w], speech: { template: 'k-letters/word', slots: { word: w } } }
  }
  return spec
}

/**
 * A trace question (any provider's): the glyph, the line that asks for it
 * (default: its intro), and whose skill it practises.
 */
export function traceQuestion(
  kind: GlyphKind,
  id: string,
  base: { id: string; topic: string; subtopic?: string; speech?: VoiceRef; skill?: { id: string; label: string }; praise?: readonly VoiceRef[] },
): ListenProblem {
  const g = glyph(kind, id)
  const speech = base.speech ?? traceIntro(g)
  return {
    id: base.id,
    topic: base.topic,
    subtopic: base.subtopic ?? g.kind,
    prompt: voiceText(speech),
    // (answered by tracing: the activity checks the strokes, the cards are unused)
    options: [],
    answer: g.id,
    difficulty: g.strokes.length,
    skill: base.skill ?? SKILL[g.kind],
    speech,
    praise: base.praise ?? PRAISE,
    activity: traceSpec(g.kind, g.id),
  }
}

export function makeKTraceProvider(cfg: KTraceConfig = {}): Omit<ProblemProvider, 'next'> & { next(): ListenProblem } {
  const mode = cfg.mode ?? 'letters'
  const families = FAMILIES[mode]
  const decks = families.map((f) => makeDeck(f.ids))
  let round: { kind: GlyphKind; id: string }[] = []
  let at = 0
  let serial = 0

  /** A fresh round: each family's share from its deck, in the family's teaching order. */
  function deal() {
    round = families.flatMap((f, k) => {
      const picked: string[] = []
      for (let i = 0; i < f.take; i++) picked.push(decks[k].next((x) => !picked.includes(x)))
      return picked.sort((a, b) => f.ids.indexOf(a) - f.ids.indexOf(b)).map((id) => ({ kind: f.kind, id }))
    })
    at = 0
  }

  return {
    topic: 'kTrace',
    reset() {
      // a new round from where the decks are (a replay meets other glyphs)
      at = round.length
      serial = 0
    },
    next(): ListenProblem {
      if (at >= round.length) deal()
      const { kind, id } = round[at++]
      return traceQuestion(kind, id, { id: `ktrace-${serial++}`, topic: 'kTrace', subtopic: mode })
    },
  }
}

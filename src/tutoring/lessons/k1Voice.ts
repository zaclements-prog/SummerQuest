import type { PictureOption } from '../../lib/problem'
import type { VoiceRef } from '../../voice/types'

/**
 * Voice references for the K–1 lessons (band `k1`). A lesson's narration is
 * its own clip (`<lessonId>/<stepId>`, the `tts:*` pipeline); everything else
 * the lessons SAY — each "your turn" question and each picture card's name —
 * is a voice line in the `k-lessons` pack (src/voice/packs/k-lessons.ts, the
 * `voice:*` pipeline), recorded in the K voice.
 *
 * Pure data helpers: no React, so the narration and voice dumps can import them.
 */
export const K_LESSON_PACK = 'k-lessons'

/** A check question's line id: `<lessonId>-<stepId>` (so it never collides, and stays put). */
export const askLineId = (lessonId: string, stepId: string) => `${lessonId}-${stepId}`

/** How a check question is said: the `k-lessons` line holding the question's own text. */
export const askAloud = (lessonId: string, stepId: string): VoiceRef => ({ line: `${K_LESSON_PACK}/${askLineId(lessonId, stepId)}` })

/** A `k-lessons` line (a card's name: "Triangle!"). */
export const kLine = (id: string): VoiceRef => ({ line: `${K_LESSON_PACK}/${id}` })

/** A number said as a card's name ("five!"), from the Listen & Play kit. */
export const sayNumber = (n: number): VoiceRef => ({ template: 'listen/number', slots: { n } })

/** Numeral cards for counts. */
export const numeralCards = (ns: number[]): PictureOption[] => ns.map((n) => ({ value: n, picture: { kind: 'numeral', n }, speech: sayNumber(n) }))

/** Group cards ("three cookies"), named by their count. */
export const groupCards = (ns: number[], emoji: string): PictureOption[] =>
  ns.map((n) => ({ value: n, picture: { kind: 'group', count: n, emoji }, speech: sayNumber(n) }))

import type { GuideStep } from '../../guide/store'
import type { PictureOption } from '../../lib/problem'
import { phraseIndex } from '../motion/cues'
import { COUNT_MAX } from '../../voice/packs/listen'
import { VOICE_PACKS, voiceText } from '../../voice/registry'
import type { VoiceRef } from '../../voice/types'
import { K_LESSON_PACK } from '../lessons/k1Voice'
import type { LessonCheck } from '../types'

/**
 * What the guide says and points at in a voice-first (listen mode) lesson, as
 * plain data: the screen runs it, tests read it. Guide ids on the screen:
 *   lesson-stage    the motion-graphics stage
 *   lesson-card-<i> answer card i (in the order shown)
 *   lesson-next     the big ▶
 */
export const LESSON_STAGE = 'lesson-stage'
export const LESSON_NEXT = 'lesson-next'
export const lessonCard = (i: number) => `lesson-card-${i}`

/** A check's answer cards: its pictures, or numerals / words for its options (a 2–4 lesson opened in listen mode). */
export function checkCards(check: LessonCheck): PictureOption[] {
  if (check.pictures?.length) return check.pictures
  return check.options.map((v) => ({
    value: v,
    picture: typeof v === 'number' ? { kind: 'numeral', n: v } : { kind: 'word', text: String(v) },
    speech: typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= COUNT_MAX ? { template: 'listen/number', slots: { n: v } } : undefined,
  }))
}

function safeText(check: LessonCheck): string {
  try {
    return check.speech ? voiceText(check.speech) : ''
  } catch {
    return ''
  }
}

/**
 * Asking the question: the line (the check's `speech`); the stage lit as it
 * starts when there is something on it to count; each card lit as the
 * question names it (`namedAt`); then all the cards still in play, a hand
 * gliding along them — on "tap" or "which" when the question says it after
 * its first word, else half-way. It never points at the answer alone.
 */
export function askSteps(check: LessonCheck, cards: PictureOption[], open: number[]): GuideStep[] {
  const text = safeText(check)
  const ids = open.map(lessonCard)
  const steps: GuideStep[] = []
  const add = (s: Omit<GuideStep, 'voice'>) => steps.push(steps.length ? s : { voice: check.speech ?? null, ...s })
  if (check.countAlong) add({ target: LESSON_STAGE, hand: false, pad: 6 })
  for (const n of check.namedAt ?? []) {
    const i = cards.findIndex((c) => c.value === n.option)
    if (i >= 0 && open.includes(i)) add({ target: lessonCard(i), cue: n.cue, hand: 'tap', pad: 10 })
  }
  // (the first "tap" / "which" that isn't the line's first word: a cue is found by its first occurrence)
  const word = ['tap', 'which'].find((w) => phraseIndex(text, w) > 0)
  add({ target: ids.length === 1 ? ids[0] : ids, cue: word ?? 0.45, hand: ids.length === 1 ? 'tap' : 'sweep', pad: 12 })
  return steps
}

/**
 * A check's explanation as a `k-lessons` line ("A triangle has three
 * sides."), said after a miss with the answer lit up: the line whose text is
 * the check's `explain` (see `explainLineId`). Null when there is none.
 */
export function explainAloud(check: LessonCheck): VoiceRef | null {
  if (check.countAlong) return null
  const lines = VOICE_PACKS[K_LESSON_PACK]?.lines ?? {}
  const id = Object.keys(lines).find((k) => k.startsWith('explain-') && lines[k] === check.explain)
  return id ? { line: `${K_LESSON_PACK}/${id}` } : null
}

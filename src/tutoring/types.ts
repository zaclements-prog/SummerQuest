import type { ContentBand } from '../lib/gradeBand'
import type { PictureOption, ProblemAnswer, ProblemVisual } from '../lib/problem'
import type { VoiceRef } from '../voice/types'

/** A step's "your turn" question. */
export interface LessonCheck {
  question: string
  options: ProblemAnswer[]
  answer: ProblemAnswer
  explain: string
  /**
   * Picture answers for the voice-first grades (K–1): one card per option,
   * each `value` one of `options` (so checking the answer is unchanged), each
   * said aloud when tapped (`speech`). Required on a `k1` lesson's checks.
   */
  pictures?: PictureOption[]
  /** How the question is said aloud (a voice line whose text is `question`). */
  speech?: VoiceRef
  /**
   * After a wrong pick, count this many things on the stage aloud together
   * ("Let's count together. One, two, three…") before trying again.
   */
  countAlong?: number
  /**
   * The question names the pictures ("Banana. Fish. Apple. Which one…?"): the
   * guide points at each card as its name (`cue`, a phrase of `question`) is said.
   */
  namedAt?: { option: ProblemAnswer; cue: string }[]
}

export interface LessonStep {
  /** Keys the step's narration clip (`<lessonId>/<stepId>`): keep it stable. */
  id: string
  narration: string                 // spoken aloud + shown
  body?: string                     // extra on-screen teaching text
  visual?: ProblemVisual            // rendered by VisualRenderer
  check?: LessonCheck
}

export interface Lesson {
  id: string
  zoneId: string
  skillIds: string[]
  title: string
  emoji: string
  intro: string
  steps: LessonStep[]
  practiceStageId: string
  /**
   * The content band whose children get this lesson (lib/gradeBand): `k1`
   * (K–1, voice-first), `g24` (grades 2–4, the default) or `g5`. Its practice
   * stage is in the zone's stage set for that band.
   */
  band?: ContentBand
}

import type { Lesson } from '../types'
import { contentBand, type ContentBand } from '../../lib/gradeBand'
import { K1_NARRATION_PACE } from '../motion/cues'
import { multiplicationLesson } from './multiplication'
import { divisionLesson } from './division'
import { fractionsLesson } from './fractions'
import { placeValueLesson } from './placeValue'
import { measurementLesson } from './measurement'
import { geometryLesson } from './geometry'
import { dataGraphLesson } from './dataGraph'
import { wordProblemLesson } from './wordProblem'
import { readingLesson } from './reading'
import { writingLesson } from './writing'
import { scienceLesson } from './science'
import { kCountingLesson } from './kCounting'
import { kShapesLesson } from './kShapes'
import { kLettersLesson } from './kLetters'
import { kTracingLesson } from './kTracing'

/**
 * The lessons, by content band (lib/gradeBand; K–5 plan §2): K–1 children get
 * the short voice lessons, grades 2–4 today's eleven, and grade 5 borrows the
 * 2–4 lessons until its own are written. Pick a child's list with
 * `lessonsFor(grade)`; look any lesson up with `getLesson(id)`.
 */

/** Grades 2–4 (band `g24`): today's lessons. */
export const g24Lessons: Lesson[] = [
  multiplicationLesson,
  divisionLesson,
  fractionsLesson,
  placeValueLesson,
  measurementLesson,
  geometryLesson,
  dataGraphLesson,
  wordProblemLesson,
  readingLesson,
  writingLesson,
  scienceLesson,
]

/** Kindergarten and grade 1 (band `k1`): the kindergarten pilot's voice lessons, then K literacy's. */
export const k1Lessons: Lesson[] = [kCountingLesson, kShapesLesson, kLettersLesson, kTracingLesson]

/** Every lesson of every band: what `getLesson` finds, and what the narration dump and scene tests cover. */
export const everyLesson: Lesson[] = [...g24Lessons, ...k1Lessons]

/**
 * Grades 2–4's lessons under their original name (code written before the
 * bands: the pets' lesson table and its tests). New code picks by grade with
 * `lessonsFor`, or uses `everyLesson`.
 */
export const allLessons: Lesson[] = g24Lessons

/** A lesson's band (`g24` unless it says otherwise). */
export const lessonBand = (l: Pick<Lesson, 'band'>): ContentBand => l.band ?? 'g24'

/** How fast the lesson is told without a recording (`useNarration`'s `pace`): slower for K–1. */
export const narrationPace = (l: Pick<Lesson, 'band'>): number => (lessonBand(l) === 'k1' ? K1_NARRATION_PACE : 1)

/** Grade 4's band: what a missing grade means (as `zoneStages` reads it: lib/gradeTiers DEFAULT_GRADE). */
const DEFAULT_BAND: ContentBand = 'g24'

/**
 * The lessons a child of this grade sees: their band's, or grades 2–4's when
 * the band has none yet (grade 5, for now). A missing grade counts as grade 4.
 */
export function lessonsFor(grade: number | null | undefined): Lesson[] {
  const band = grade == null ? DEFAULT_BAND : contentBand(grade)
  const own = everyLesson.filter((l) => lessonBand(l) === band)
  return own.length > 0 ? own : g24Lessons
}

/** Is this lesson one a child of this grade is offered? */
export function isLessonFor(lessonId: string, grade: number | null | undefined): boolean {
  return lessonsFor(grade).some((l) => l.id === lessonId)
}

/** A zone's lesson for a child of this grade (the first, if a band ever has two), if any. */
export function zoneLessonFor(zoneId: string, grade: number | null | undefined): Lesson | undefined {
  return lessonsFor(grade).find((l) => l.zoneId === zoneId)
}

export function getLesson(id: string): Lesson | undefined {
  return everyLesson.find((l) => l.id === id)
}

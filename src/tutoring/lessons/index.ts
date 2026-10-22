import type { Lesson } from '../types'
import { bandFallbacks, contentBand, isListenBand, type ContentBand } from '../../lib/gradeBand'
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
import { kRhymesLesson } from './kRhymes'
import { kTracingLesson } from './kTracing'
import { kAddTakeLesson } from './kAddTake'
import { kStoryMathLesson } from './kStoryMath'
import { kCompareLesson } from './kCompare'
import { kTeensLesson } from './kTeens'
import { kMeasureLesson } from './kMeasure'
import { kSortingLesson } from './kSorting'
import { kScienceLesson } from './kScience'
import { kTowersLesson } from './kTowers'
// 1st grade (phase 2b): Word Reef, Writing Workshop
import { g1ReadingLesson } from './g1Reading'
import { g1WritingLesson } from './g1Writing'
// 1st grade (phase 2b): Tens Plateau, Fair Share Falls, Shape Grove
import { g1TensLesson } from './g1Tens'
import { g1SharesLesson } from './g1Shares'
import { g1ShapesLesson } from './g1Shapes'
// 1st grade (phase 2b): Measure Marsh, Graph Delta, Sky Summit
import { g1MeasureLesson } from './g1Measure'
import { g1GraphsLesson } from './g1Graphs'
import { g1ScienceLesson } from './g1Science'
// 1st grade (phase 2b): Adding Mesa, Take-Away Dunes, Story Woods
import { g1AddingLesson } from './g1Adding'
import { g1SubtractLesson } from './g1Subtract'
import { g1StoryMathLesson } from './g1StoryMath'
// 5th grade (phase 3): Reading Reef, Writing Workshop, Science Summit
import { g5ReadingLesson } from './g5Reading'
import { g5WritingLesson } from './g5Writing'
import { g5ScienceLesson } from './g5Science'
// 5th grade (phase 3): Fraction Falls, Place Value Plateau
import { g5FractionsLesson } from './g5Fractions'
import { g5DecimalsLesson } from './g5Decimals'
// 5th grade (phase 3): Measurement Marsh, Geometry Grove, Data Delta
import { g5VolumeLesson } from './g5Volume'
import { g5CoordinatesLesson } from './g5Coordinates'
import { g5LinePlotsLesson } from './g5LinePlots'

/**
 * The lessons, by content band (lib/gradeBand; K–5 plan §2): kindergarten and
 * 1st grade get the short voice lessons (1st grade its own where a zone has
 * one, else kindergarten's), grades 2–4 today's eleven, and grade 5 its own
 * (borrowing the 2–4 lessons until they're written). Pick a child's list with
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

/** Kindergarten (band `k1`; 1st grade too where it has none of its own): the kindergarten voice lessons. */
export const k1Lessons: Lesson[] = [
  kCountingLesson,
  kShapesLesson,
  kLettersLesson,
  kRhymesLesson,
  kTracingLesson,
  // K complete (phase 2a)
  kAddTakeLesson,
  kStoryMathLesson,
  kCompareLesson,
  kTeensLesson,
  kMeasureLesson,
  kSortingLesson,
  kScienceLesson,
  kTowersLesson,
]

/** 1st grade (band `g1`): its own voice lessons. */
export const g1Lessons: Lesson[] = [
  // Word Reef, Writing Workshop (phase 2b)
  g1ReadingLesson,
  g1WritingLesson,
  // Tens Plateau, Fair Share Falls, Shape Grove (phase 2b)
  g1TensLesson,
  g1SharesLesson,
  g1ShapesLesson,
  // Measure Marsh, Graph Delta, Sky Summit
  g1MeasureLesson,
  g1GraphsLesson,
  g1ScienceLesson,
  // Adding Mesa, Take-Away Dunes, Story Woods (phase 2b)
  g1AddingLesson,
  g1SubtractLesson,
  g1StoryMathLesson,
]

/** 5th grade (band `g5`). */
export const g5Lessons: Lesson[] = [
  // Reading Reef, Writing Workshop, Science Summit (phase 3)
  g5ReadingLesson,
  g5WritingLesson,
  g5ScienceLesson,
  // Fraction Falls, Place Value Plateau (phase 3)
  g5FractionsLesson,
  g5DecimalsLesson,
  // Measurement Marsh, Geometry Grove, Data Delta (phase 3)
  g5VolumeLesson,
  g5CoordinatesLesson,
  g5LinePlotsLesson,
]

/** Every lesson of every band: what `getLesson` finds, and what the narration dump and scene tests cover. */
export const everyLesson: Lesson[] = [...g24Lessons, ...k1Lessons, ...g1Lessons, ...g5Lessons]

/**
 * Grades 2–4's lessons under their original name (code written before the
 * bands: the pets' lesson table and its tests). New code picks by grade with
 * `lessonsFor`, or uses `everyLesson`.
 */
export const allLessons: Lesson[] = g24Lessons

/** A lesson's band (`g24` unless it says otherwise). */
export const lessonBand = (l: Pick<Lesson, 'band'>): ContentBand => l.band ?? 'g24'

/** How fast the lesson is told without a recording (`useNarration`'s `pace`): slower for K–1. */
export const narrationPace = (l: Pick<Lesson, 'band'>): number => (isListenBand(lessonBand(l)) ? K1_NARRATION_PACE : 1)

/** Grade 4's band: what a missing grade means (as `zoneStages` reads it: lib/gradeTiers DEFAULT_GRADE). */
const DEFAULT_BAND: ContentBand = 'g24'

/**
 * The lessons a child of this grade sees: their band's, or grades 2–4's when
 * the band has none yet. 1st grade gets its own lesson(s) for each zone that
 * has some, and kindergarten's for the others; 5th grade its own, and 2–4's
 * for the others (`bandFallbacks`). A missing grade counts as grade 4.
 */
export function lessonsFor(grade: number | null | undefined): Lesson[] {
  const band = grade == null ? DEFAULT_BAND : contentBand(grade)
  const out: Lesson[] = []
  const covered = new Set<string>()
  for (const b of bandFallbacks(band)) {
    const own = everyLesson.filter((l) => lessonBand(l) === b && !covered.has(l.zoneId))
    out.push(...own)
    for (const l of own) covered.add(l.zoneId)
  }
  return out.length > 0 ? out : g24Lessons
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

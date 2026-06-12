import type { Lesson } from '../types'
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

export const allLessons: Lesson[] = [
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

export function getLesson(id: string): Lesson | undefined {
  return allLessons.find((l) => l.id === id)
}

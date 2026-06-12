import type { Curriculum } from './types'
import { multiplicationZone } from './multiplication'
import { divisionZone } from './division'
import { fractionZone } from './fraction'
import { wordProblemZone } from './wordProblem'
import { placeValueZone } from './placeValue'
import { measurementZone } from './measurement'
import { geometryZone } from './geometry'
import { dataGraphZone } from './dataGraph'
import { readingZone } from './reading'
import { writingZone } from './writing'
import { scienceZone } from './science'
import { towerDefenseZone } from './towerDefense'

export const curriculum: Curriculum = {
  id: 'grade-3-to-4-summer',
  title: 'Summer Quest: 3rd → 4th',
  gradeRange: '3rd-to-4th grade',
  zones: [
    multiplicationZone,
    divisionZone,
    fractionZone,
    placeValueZone,
    measurementZone,
    geometryZone,
    dataGraphZone,
    wordProblemZone,
    readingZone,
    writingZone,
    scienceZone,
    towerDefenseZone,
  ],
}

export function getZone(id: string) {
  return curriculum.zones.find((z) => z.id === id)
}

export function getStage(zoneId: string, stageId: string) {
  const zone = getZone(zoneId)
  return zone?.stages.find((s) => s.id === stageId)
}

export * from './types'

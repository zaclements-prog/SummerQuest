import type { ListenActivityDef, ListenActivitySpec } from '../types'
import { drumActivity } from './Drum'
import { traceActivity } from './Trace'
import { storyOrderActivity } from './StoryOrder'
import { mathStoryActivity } from './MathStory'
// Number Dunes and Ten Frame Plateau (K, phase 2a)
import { matchActivity } from './Match'
import { compareNumbersActivity } from './CompareNumbers'
import { numberOrderActivity } from './NumberOrder'
import { tenFramesActivity } from './TenFramesQuiz'
import { buildActivity } from './BuildTeen'
import { measureActivity } from './Measure'
import { sortActivity } from './Sort'
// Word Reef and Writing Workshop (1st grade, phase 2b)
import { readAlongActivity } from './ReadAlong'
import { tilesActivity } from './TileBuild'

/**
 * Listen & Play activities by `kind` (see `ListenProblem.activity`): the
 * questions answered by doing something other than tapping a card. Each
 * activity lives in its own file here and adds one line below.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- each def narrows its own spec
export const LISTEN_ACTIVITIES: Record<string, ListenActivityDef<any>> = {
  drum: drumActivity,
  trace: traceActivity,
  order: storyOrderActivity,
  mathStory: mathStoryActivity,
  // Number Dunes and Ten Frame Plateau (K, phase 2a)
  matchRows: matchActivity,
  compareNumbers: compareNumbersActivity,
  numberOrder: numberOrderActivity,
  teenFrames: tenFramesActivity,
  buildTeen: buildActivity,
  measure: measureActivity,
  sort: sortActivity,
  // Word Reef and Writing Workshop (1st grade, phase 2b)
  readAlong: readAlongActivity,
  tiles: tilesActivity,
}

export function activityDef(spec: ListenActivitySpec | undefined): ListenActivityDef | null {
  return spec ? (LISTEN_ACTIVITIES[spec.kind] ?? null) : null
}

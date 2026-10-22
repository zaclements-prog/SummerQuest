import type { ListenActivityDef, ListenActivitySpec } from '../types'
import { drumActivity } from './Drum'
import { traceActivity } from './Trace'
import { storyOrderActivity } from './StoryOrder'
import { measureActivity } from './Measure'
import { sortActivity } from './Sort'

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
  measure: measureActivity,
  sort: sortActivity,
}

export function activityDef(spec: ListenActivitySpec | undefined): ListenActivityDef | null {
  return spec ? (LISTEN_ACTIVITIES[spec.kind] ?? null) : null
}

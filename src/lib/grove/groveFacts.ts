import { createFactSampler, type FactStats, type Rng } from '../adaptive'
import { multFactId } from '../providers/multiplication'
import type { GroveTask } from './groveCore'

/**
 * Times Grove's rounds and the child's multiplication facts (lib/adaptive).
 * `planGroveRun` still lays out the run: warm-ups, the middle rounds, the
 * finale. Each round then goes through the same fact sampler as the × drill,
 * keyed by the same ids ("mult:3x4"), so a miss anywhere counts here too:
 *
 *  - warm-ups and the finale keep their planned order (`pin`): the scaffold
 *    stays small and the giant order stays the run's biggest, but a miss on
 *    them is watched like any other;
 *  - plain orders and mystery rows (`order`, `missing`) may instead serve a
 *    retry of a fact just missed, or one of the child's weak facts — only
 *    shapes in the grade's bank, never the finale's;
 *  - "any equal rows" rounds (`total`) have no single fact and stay as planned.
 *
 * The last adaptive round of a run takes a pending retry even before its turn:
 * a 5-round grove has only one such round. With no misses on record every
 * round is exactly the planned one (the sampler draws nothing random then).
 */

type Shape = { rows: number; cols: number }

export interface GroveRoundDraw {
  task: GroveTask
  /** The multiplication fact this round practises (none for `total` rounds). */
  factId?: string
}

const adaptive = (t: GroveTask) => t.kind === 'order' || t.kind === 'missing'

export function createGroveFactDraw(opts: {
  tasks: readonly GroveTask[]
  /** The grade's order bank (`grovePoolFor`). */
  shapes: readonly Shape[]
  stats: () => FactStats | undefined
  rng?: Rng
  now?: () => number
}) {
  const { tasks } = opts
  const finale = tasks.find((t) => t.kind === 'finale')
  const finaleId = finale ? multFactId(finale.rows, finale.cols) : null
  const lastAdaptive = tasks.reduce((at, t, i) => (adaptive(t) ? i : at), -1)
  let planned: Shape = tasks[0] ?? { rows: 2, cols: 2 }
  const sampler = createFactSampler<Shape>({
    key: (s) => multFactId(s.rows, s.cols),
    parse: (id) => {
      if (id === finaleId) return null
      return opts.shapes.find((s) => multFactId(s.rows, s.cols) === id) ?? null
    },
    uniform: () => planned,
    stats: opts.stats,
    rng: opts.rng,
    now: opts.now,
  })
  const drawn = new Map<number, GroveRoundDraw>()

  return {
    /** Round `index`'s task, drawn once (asking again returns the same round). */
    round(index: number): GroveRoundDraw {
      const hit = drawn.get(index)
      if (hit) return hit
      const task = tasks[index]
      let out: GroveRoundDraw
      if (task.kind === 'total') out = { task }
      else if (!adaptive(task)) out = { task, factId: sampler.pin(task).factId }
      else {
        planned = task
        const { fact, factId } = sampler.next({ early: index === lastAdaptive })
        const same = fact.rows === task.rows && fact.cols === task.cols
        out = { task: same ? task : { ...task, rows: fact.rows, cols: fact.cols, total: fact.rows * fact.cols }, factId }
      }
      drawn.set(index, out)
      return out
    },
  }
}

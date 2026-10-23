import { describe, expect, it } from 'vitest'
import { recordFactAnswer, type FactStat, type FactStats } from '../../adaptive'
import { multFactId } from '../../providers/multiplication'
import { grovePoolFor } from '../../providers/multiplicationGrove'
import { seededRng } from '../../random'
import { GROVE_ROUNDS, groveMaxFactor, planGroveRun, type GroveTask } from '../groveCore'
import { createGroveFactDraw } from '../groveFacts'

/**
 * Times Grove draws its middle rounds through the × fact sampler: a fact the
 * child misses comes back in the same run, weak facts come up more often, and
 * a child with nothing missed plays exactly the planned run.
 */

const now = () => 1_000_000_000
const id = (t: Pick<GroveTask, 'rows' | 'cols'>) => multFactId(t.rows, t.cols)
const missed = (attempts: number, misses: number): FactStat => ({ attempts, misses, streak: 0, lastSeenAt: now(), lastMissedAt: now() })

/** Play a run: `miss(index)` says which rounds the child gets wrong (once each, then right). */
function play(grade: number, seed: string, miss: (i: number) => boolean, start: FactStats = {}) {
  const shapes = grovePoolFor(groveMaxFactor(grade))
  const rng = seededRng(seed)
  const tasks = planGroveRun(GROVE_ROUNDS, shapes, rng)
  let stats = start
  const draw = createGroveFactDraw({ tasks, shapes, stats: () => stats, rng, now })
  const rounds = tasks.map((_, i) => {
    const r = draw.round(i)
    if (r.factId) {
      if (miss(i)) stats = recordFactAnswer(stats, r.factId, false, now())
      stats = recordFactAnswer(stats, r.factId, true, now())
    }
    return r
  })
  return { tasks, rounds, shapes }
}

describe('Times Grove × fact sampler', () => {
  it('with nothing missed, every round is exactly the planned one', () => {
    for (const grade of [2, 3, 4])
      for (let i = 0; i < 40; i++) {
        const { tasks, rounds } = play(grade, `clean:${grade}:${i}`, () => false)
        expect(rounds.map((r) => r.task)).toEqual(tasks)
        // every round but "any equal rows" names its fact
        for (const r of rounds) expect(r.factId).toBe(r.task.kind === 'total' ? undefined : id(r.task))
      }
  })

  it('a warm-up missed in round 1 comes back on the next plain order (before: the plan rarely asks a fact twice)', () => {
    for (const grade of [2, 3, 4]) {
      let planRepeats = 0
      for (let i = 0; i < 40; i++) {
        const { tasks, rounds } = play(grade, `miss:${grade}:${i}`, (r) => r === 0)
        const missedId = id(tasks[0])
        // the plan alone seldom asks it again (only as a turned array, when the bank runs short)…
        if (tasks.slice(1).some((t) => id(t) === missedId)) planRepeats++
        // …the grove always does: on the next plain order (round 3 of 5)
        expect(tasks[2].kind).toBe('order')
        expect(id(rounds[2].task)).toBe(missedId)
        expect(rounds[2].factId).toBe(missedId)
        // the scaffolds and the finale are untouched
        expect([rounds[0], rounds[1], rounds[3], rounds[4]].map((r) => r.task)).toEqual([tasks[0], tasks[1], tasks[3], tasks[4]])
      }
      expect(planRepeats).toBeLessThan(20)
    }
  })

  it('weak facts from the × drill come up more often, but only shapes the grade plants, never the finale', () => {
    const grade = 2
    const weak = 'mult:3x4'
    let withBoost = 0
    let without = 0
    for (let i = 0; i < 300; i++) {
      const a = play(grade, `weak:${i}`, () => false, { [weak]: missed(4, 3), 'mult:7x8': missed(4, 4) })
      const b = play(grade, `weak:${i}`, () => false)
      if (a.rounds.some((r) => r.factId === weak)) withBoost++
      if (b.rounds.some((r) => r.factId === weak)) without++
      const finaleId = id(a.tasks[a.tasks.length - 1])
      for (const r of a.rounds) {
        expect(a.shapes.some((s) => s.rows === r.task.rows && s.cols === r.task.cols)).toBe(true)
        expect(r.factId).not.toBe('mult:7x8') // outside grade 2's ≤ 5 field
        if (r.task.kind !== 'finale') expect(r.factId).not.toBe(finaleId)
        expect(r.task.total).toBe(r.task.rows * r.task.cols)
      }
    }
    expect(withBoost).toBeGreaterThan(without + 40)
  })

  it('a round asked twice is the same round', () => {
    const shapes = grovePoolFor(5)
    const tasks = planGroveRun(GROVE_ROUNDS, shapes, seededRng('twice'))
    const stats: FactStats = { [multFactId(tasks[0].rows, tasks[0].cols)]: missed(2, 2) }
    const draw = createGroveFactDraw({ tasks, shapes, stats: () => stats, rng: seededRng('twice-draw'), now })
    for (let i = 0; i < tasks.length; i++) expect(draw.round(i)).toBe(draw.round(i))
  })
})

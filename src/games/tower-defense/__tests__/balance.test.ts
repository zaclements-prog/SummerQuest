import { describe, expect, it } from 'vitest'
import { PATROL_SETS, patrolSpec, planPatrol, type PatrolSetId } from '../../../lib/puddle'
import { playBot, type BotKind, type BotRun } from '../bots'

/**
 * The playtest, as a test (the full numbers: scripts/puddle-balance.ts):
 * three bots play every stage over many seeds through the real engine.
 *
 * - optimal (matches towers to the lineup) earns 3 stars;
 * - a sensible child with slips and slow taps ("kid") usually earns 2 or 3;
 * - random placement ("naive") mostly earns 1, and always finishes;
 * - a stage takes 2–4 minutes in K–1, 3–6 in grades 2–5 (waves + thinking).
 */

const gradeOf = (set: PatrolSetId) => ({ k1: 0, g1: 1, g24: 3, g5: 5 })[patrolSpec(set).band]
const runs = (set: PatrolSetId, kind: BotKind, n: number): BotRun[] =>
  Array.from({ length: n }, (_, i) => playBot(planPatrol(set, `bal-${i}`, gradeOf(set)), kind, `b${i}`))
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

describe.each(PATROL_SETS)('balance: %s', (set) => {
  const young = ['k1', 'g1'].includes(patrolSpec(set).band)
  const [lo, hi] = young ? [2, 4.3] : [3, 6.3]

  it('optimal earns 3 stars', () => {
    const rs = runs(set, 'optimal', 6)
    expect(rs.every((r) => r.stars === 3)).toBe(true)
    expect(mean(rs.map((r) => r.seconds)) / 60).toBeGreaterThanOrEqual(lo)
  })

  it('a sensible child usually earns 2 or 3; random placement mostly 1 (and still finishes)', () => {
    const kid = runs(set, 'kid', 24)
    const naive = runs(set, 'naive', 24)
    expect(kid.filter((r) => r.stars >= 2).length / kid.length).toBeGreaterThanOrEqual(0.7)
    expect(mean(kid.map((r) => r.clean))).toBeGreaterThan(mean(naive.map((r) => r.clean)) + 0.1)
    expect(naive.filter((r) => r.stars === 1).length / naive.length).toBeGreaterThanOrEqual(0.5)
    expect(naive.every((r) => r.stars >= 1)).toBe(true)
    const minutes = mean(kid.map((r) => r.seconds)) / 60
    expect(minutes).toBeGreaterThanOrEqual(lo)
    expect(minutes).toBeLessThanOrEqual(hi)
  })
})

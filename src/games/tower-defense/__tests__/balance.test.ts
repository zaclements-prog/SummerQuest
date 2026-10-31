import { describe, expect, it } from 'vitest'
import { PATROL_SETS, patrolSpec, planPatrol, type PatrolSetId } from '../../../lib/puddle'
import { playBot, type BotKind, type BotRun } from '../bots'

/**
 * The playtest, as a test (the full numbers: scripts/puddle-balance.mjs):
 * bots play every stage over many seeds through the real engine.
 *
 * - optimal (matches towers to the lineup) earns 3 stars;
 * - a sensible child with slips and slow taps ("kid"), and the band's own
 *   playtest persona, usually earn 2 or 3;
 * - random placement ("naive") mostly earns 1, and always finishes;
 * - placing without reading pays less than reading: one of each sprinkler
 *   ("spread") never beats the sensible child by much, and changing rules all
 *   through the wave ("spam") washes less than random placement;
 * - a stage takes 2–4 minutes in K–1, 3–6 in grades 2–5 (waves + thinking),
 *   and no wave is a long watch (the dead time between decisions).
 */

const gradeOf = (set: PatrolSetId) => ({ k1: 0, g1: 1, g24: 3, g5: 5 })[patrolSpec(set).band]
const personaOf = (set: PatrolSetId): BotKind => ({ k1: 'k', g1: 'g1', g24: 'g3strong', g5: 'g5' })[patrolSpec(set).band] as BotKind
const runs = (set: PatrolSetId, kind: BotKind, n: number): BotRun[] =>
  Array.from({ length: n }, (_, i) => playBot(planPatrol(set, `bal-${i}`, gradeOf(set)), kind, `b${i}`))
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const share = (rs: BotRun[], f: (r: BotRun) => boolean) => rs.filter(f).length / rs.length

describe.each(PATROL_SETS)('balance: %s', (set) => {
  const young = ['k1', 'g1'].includes(patrolSpec(set).band)
  const [lo, hi] = young ? [2, 4.3] : [3, 6.3]

  it('optimal earns 3 stars', { timeout: 30_000 }, () => {
    const rs = runs(set, 'optimal', 6)
    expect(rs.every((r) => r.stars === 3)).toBe(true)
    expect(mean(rs.map((r) => r.seconds)) / 60).toBeGreaterThanOrEqual(lo)
  })

  it('a sensible child usually earns 2 or 3; random placement mostly 1 (and still finishes)', { timeout: 30_000 }, () => {
    const kid = runs(set, 'kid', 24)
    const persona = runs(set, personaOf(set), 24)
    const naive = runs(set, 'naive', 24)
    expect(share(kid, (r) => r.stars >= 2)).toBeGreaterThanOrEqual(0.7)
    expect(share(persona, (r) => r.stars >= 2)).toBeGreaterThanOrEqual(0.7)
    expect(mean(kid.map((r) => r.clean))).toBeGreaterThan(mean(naive.map((r) => r.clean)) + 0.1)
    expect(share(naive, (r) => r.stars === 1)).toBeGreaterThanOrEqual(0.5)
    expect(naive.every((r) => r.stars >= 1)).toBe(true)
    const minutes = mean(kid.map((r) => r.seconds)) / 60
    expect(minutes).toBeGreaterThanOrEqual(lo)
    expect(minutes).toBeLessThanOrEqual(hi)
    // the watching: a wave is over in well under half a minute on average
    expect(mean(kid.map((r) => r.waveSeconds / planPatrol(set, 'x', gradeOf(set)).waves.length))).toBeLessThan(21)
  })

  it('placement is the math: not reading pays less than reading', { timeout: 30_000 }, () => {
    const kid = runs(set, 'kid', 24)
    const spread = runs(set, 'spread', 24)
    const spam = runs(set, 'spam', 12)
    const naive = runs(set, 'naive', 12)
    // one of each sprinkler, never looking at the lineup: rarely 3 stars, and no better than a sensible child
    expect(share(spread, (r) => r.stars === 3)).toBeLessThanOrEqual(0.25)
    expect(mean(spread.map((r) => r.clean))).toBeLessThanOrEqual(mean(kid.map((r) => r.clean)) + 0.03)
    // tapping through the cards mid-wave washes less than random placement
    expect(mean(spam.map((r) => r.clean))).toBeLessThan(mean(naive.map((r) => r.clean)))
  })
})

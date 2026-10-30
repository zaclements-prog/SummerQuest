import { describe, expect, it } from 'vitest'
import { planPatrol, rule, valueText } from '../../../lib/puddle'
import { TICK, TUNING, buildLayout, inReach } from '../config'
import { advance, canBuild, createPatrol, drainEvents, patrolStars, placeTower, pondClean, rulesNow, startWave, step, towerCount } from '../engine'
import type { PatrolEvent, PatrolState } from '../types'

/** Play the current wave to its end; the events it raised. */
function playWave(s: PatrolState): PatrolEvent[] {
  startWave(s)
  const out: PatrolEvent[] = []
  for (let i = 0; i < 20000 && s.phase === 'wave'; i++) {
    step(s)
    out.push(...drainEvents(s))
  }
  return out
}

describe('Puddle Patrol engine', () => {
  it('the field: every slot reaches the path; the middle ones reach both rows', () => {
    for (const band of ['k1', 'g24'] as const) {
      const l = buildLayout(band)
      expect(l.length).toBeGreaterThan(25)
      for (const sl of l.slots) expect(sl.reach.length, `slot ${sl.id}`).toBeGreaterThan(0)
      expect(l.slots.some((sl) => sl.reach.length >= 2)).toBe(true)
    }
    expect(buildLayout('k1').slots).toHaveLength(4)
    expect(buildLayout('g5').slots).toHaveLength(6)
  })

  it('waits between waves: nothing moves until Go', () => {
    const s = createPatrol(planPatrol('g24-evenOdd', 'a', 3))
    advance(s, 5)
    expect(s.t).toBe(0)
    expect(s.puddings).toHaveLength(0)
    expect(s.phase).toBe('plan')
  })

  it('placing: a new tower costs drops, a swap is free, the field has a limit', () => {
    const s = createPatrol(planPatrol('g24-evenOdd', 'a', 3))
    const { cost, startDrops, maxTowers } = TUNING.g24
    expect(placeTower(s, 2, 'even')).toBe('built')
    expect(s.drops).toBe(startDrops - cost)
    expect(placeTower(s, 2, 'odd')).toBe('swapped')
    expect(s.drops).toBe(startDrops - cost)
    expect(placeTower(s, 2, 'odd')).toBe('same')
    expect(placeTower(s, 3, 'even')).toBe('built')
    // out of drops
    expect(canBuild(s)).toBe(startDrops - 2 * cost >= cost)
    s.drops = 99
    for (let i = 0; i < 6; i++) placeTower(s, i, 'even')
    expect(towerCount(s)).toBe(maxTowers)
    const empty = s.towers.findIndex((t) => !t)
    expect(placeTower(s, empty, 'odd')).toBe('full')
    // only the rules on offer
    expect(placeTower(s, 2, 'mult-5')).toBe('closed')
  })

  it('a tower washes only what fits its rule; a misfit gets one bounce per tower and walks on to the pond', () => {
    const s = createPatrol(planPatrol('g24-evenOdd', 'b', 3))
    placeTower(s, 2, 'even')
    placeTower(s, 3, 'even')
    const evs = playWave(s)
    const wave = s.plan.waves[0]
    const evens = wave.puddings.filter((p) => rule('even').fits(p.value)).length
    const washed = evs.filter((e) => e.kind === 'wash')
    const leaked = evs.filter((e) => e.kind === 'leak')
    for (const e of washed) if (e.kind === 'wash') expect(rule('even').fits(e.value), valueText(e.value)).toBe(true)
    // every odd one splashed into the pond (harmlessly), after a bounce off each even tower it passed
    for (const e of leaked) if (e.kind === 'leak') expect(rule('even').fits(e.value)).toBe(false)
    expect(washed.length + leaked.length).toBe(wave.puddings.length)
    expect(washed.length).toBeLessThanOrEqual(evens)
    const bounces = evs.filter((e) => e.kind === 'bounce')
    const pairs = new Set(bounces.map((e) => (e.kind === 'bounce' ? `${e.id}|${e.slot}` : '')))
    expect(pairs.size).toBe(bounces.length)
    expect(bounces.length).toBeGreaterThan(0)
    expect(evs.at(-1)).toMatchObject({ kind: 'waveEnd', wave: 0 })
    expect(s.phase).toBe('plan')
    expect(s.wave).toBe(1)
  })

  it('no fail state: a wave with no towers just ends, every Pudding in the pond, and the stage goes on', () => {
    const s = createPatrol(planPatrol('k-count', 'c', 0))
    startWave(s)
    for (let i = 0; i < 20000 && s.phase === 'wave'; i++) step(s)
    expect(s.phase).toBe('plan')
    expect(s.tallies[0].leaked).toBe(s.plan.waves[0].puddings.length)
    expect(pondClean(s)).toBe(0)
    // and it can still be played to the end
    while (s.phase === 'plan') {
      placeTower(s, 0, rulesNow(s)[0])
      playWave(s)
    }
    expect(s.phase).toBe('done')
    expect(patrolStars(pondClean(s), 'k1')).toBeGreaterThanOrEqual(1)
  })

  it('is deterministic: the same moves give the same run at any frame rate', () => {
    const run = (dt: number) => {
      const s = createPatrol(planPatrol('g5-factors', 'd', 5))
      placeTower(s, 2, 'factor-24')
      placeTower(s, 3, 'mult-5')
      startWave(s)
      for (let i = 0; i < 4000 && s.phase === 'wave'; i++) advance(s, dt)
      return { tallies: s.tallies[0], t: Math.round(s.t / TICK), drops: s.drops }
    }
    expect(run(1 / 60)).toEqual(run(1 / 24))
    expect(run(TICK)).toEqual(run(0.05))
  })

  it('washes earn drops; the price of a tower stays put', () => {
    const s = createPatrol(planPatrol('g24-evenOdd', 'e', 3))
    placeTower(s, 2, 'even')
    placeTower(s, 3, 'odd')
    const before = s.drops
    playWave(s)
    expect(s.drops).toBe(before + s.tallies[0].washed * TUNING.g24.washReward)
  })

  it('a spray only reaches the path near its slot', () => {
    const l = buildLayout('g24')
    const sl = l.slots[0]
    expect(inReach(sl, (sl.reach[0][0] + sl.reach[0][1]) / 2)).toBe(true)
    expect(inReach(sl, l.length)).toBe(false)
  })

  it('stars come from the clean pond, by band; finishing is always at least one', () => {
    expect(patrolStars(1, 'g24')).toBe(3)
    expect(patrolStars(0, 'g24')).toBe(1)
    expect(patrolStars(0.85, 'g24')).toBe(2)
    expect(patrolStars(0.9, 'k1')).toBe(3)
    expect(patrolStars(0.7, 'g5')).toBe(1)
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useProgress } from '../../../store/progress'
import { arenaRules } from '../../arena/divisionCore'
import { GRADE_TIERS } from '../../gradeTiers'
import type { Problem } from '../../problem'
import { seededRng } from '../../random'
import { makeArenaProviders, makeDivisionProvider } from '../division'
import { forgeSumFacts, makeForgeSumProvider } from '../g5Fractions'

/**
 * The 3D games that draw their own facts bring a missed fact back the way the
 * drills do (lib/adaptive). Times Grove's half lives in grove/__tests__/groveFacts.
 */

beforeEach(() => useProgress.getState().resetPlayer())
afterEach(() => vi.restoreAllMocks())

const answer = (p: Problem, right: boolean) => useProgress.getState().recordAnswer(right, p)

describe('Division Arena: warm-up and main golems share one retry queue', () => {
  /** A 5-golem arena (warm, warm, main, main, boss): miss the first warm-up, answer the rest. */
  function run(grade: 2 | 3 | 4, seed: string, shared: boolean) {
    useProgress.getState().resetPlayer()
    vi.spyOn(Math, 'random').mockImplementation(seededRng(seed))
    const rules = arenaRules(1, GRADE_TIERS[grade].divMax)
    const { facts, warm } = shared
      ? makeArenaProviders(rules.facts, rules.warm)
      : { facts: makeDivisionProvider(rules.facts), warm: makeDivisionProvider(rules.warm) }
    const first = warm.next() as Problem
    answer(first, false)
    answer(first, true)
    const later: Problem[] = []
    const second = warm.next() as Problem
    answer(second, true)
    for (let i = 0; i < 2; i++) {
      const p = facts.next() as Problem
      later.push(p)
      answer(p, true)
    }
    vi.restoreAllMocks()
    return { first, second, mains: later }
  }

  it('a fact missed on a warm-up comes back on a main golem (before: only by chance)', () => {
    let before = 0
    let runs = 0
    for (const grade of [2, 3, 4] as const)
      for (let i = 0; i < 40; i++) {
        runs++
        const now = run(grade, `arena:${grade}:${i}`, true)
        if (now.second.factId !== now.first.factId) expect(now.mains.map((p) => p.factId)).toContain(now.first.factId)
        const old = run(grade, `arena:${grade}:${i}`, false)
        if (old.mains.some((p) => p.factId === old.first.factId)) before++
      }
    // before, only the cross-session boost (≤ 35% of draws) brought it back now and then
    expect(before / runs).toBeLessThan(0.6)
  })

  it('each draw keeps its own range: a main-range miss never comes back as a warm-up', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRng('ranges'))
    const rules = arenaRules(1, GRADE_TIERS[4].divMax)
    const { facts, warm } = makeArenaProviders(rules.facts, rules.warm)
    const inWarm = (p: Problem) => {
      const [dividend, divisor] = p.prompt.match(/^(\d+) ÷ (\d+)/)!.slice(1).map(Number)
      const q = dividend / divisor
      return divisor >= rules.warm.divisorMin && divisor <= rules.warm.divisorMax && q >= rules.warm.quotientMin && q <= rules.warm.quotientMax
    }
    for (let i = 0; i < 200; i++) {
      const p = facts.next() as Problem
      answer(p, false)
      const w = warm.next() as Problem
      expect(inWarm(w)).toBe(true)
      answer(w, true)
    }
  })
})

describe('Fraction Forge, grade 5: unlike-denominator orders', () => {
  it('every order names its fact, and a missed order comes back 2–3 orders later (before: not until the deck ran out)', () => {
    const deckSize = forgeSumFacts(12).length
    expect(deckSize).toBeGreaterThan(30)
    for (let i = 0; i < 40; i++) {
      useProgress.getState().resetPlayer()
      vi.spyOn(Math, 'random').mockImplementation(seededRng(`forge5:${i}`))
      const p = makeForgeSumProvider(12)
      const first = p.next() as Problem
      expect(first.factId).toMatch(/^fsum:\d+\/\d+\+\d+\/\d+$/)
      answer(first, false)
      const after: Problem[] = []
      for (let k = 0; k < 3; k++) {
        const q = p.next() as Problem
        after.push(q)
        answer(q, true)
      }
      const at = after.findIndex((q) => q.factId === first.factId)
      expect(at === 1 || at === 2, `came back at ${at}`).toBe(true)
      expect(after.find((q) => q.factId === first.factId)!.prompt).toBe(first.prompt)
      vi.restoreAllMocks()
    }
  })

  it('orders the child keeps missing are dealt more often across runs', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRng('forge5-weak'))
    const target = 'fsum:1/2+1/3'
    useProgress.setState({ factStats: { [target]: { attempts: 4, misses: 3, streak: 0, lastSeenAt: Date.now(), lastMissedAt: Date.now() } } })
    const p = makeForgeSumProvider(12)
    const hits = Array.from({ length: 400 }, () => p.next() as Problem).filter((q) => q.factId === target).length
    expect(hits / 400).toBeGreaterThan((1 / forgeSumFacts(12).length) * 4)
  })
})

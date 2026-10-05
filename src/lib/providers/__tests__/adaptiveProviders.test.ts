import { describe, it, expect, beforeEach } from 'vitest'
import { useProgress } from '../../../store/progress'
import type { FactStat, FactStats } from '../../adaptive'
import type { Problem } from '../../problem'
import { makeMultiplicationProvider, multFactId, parseMultFactId } from '../multiplication'
import { makeDivisionProvider, divFactId, parseDivFactId } from '../division'
import { makeFractionEquivalenceProvider, parseFracEqFactId, fracEqFactId } from '../fractionEquivalence'
import { makeFractionCompareProvider, parseFracCmpFactId, fracCmpFactId } from '../fractionCompare'

/**
 * Fact providers read the child's per-fact record from the store at draw time:
 * missed facts come back more often (across sessions) and a fact missed just now
 * comes back a couple of questions later (within the session).
 */

const MULT = { factorMin: 2, factorMax: 10 }
const DIV = { divisorMin: 2, divisorMax: 10, quotientMin: 2, quotientMax: 10 }

/** A fact missed `misses` of `attempts` times, last just now. */
const missed = (attempts: number, misses: number): FactStat => ({
  attempts,
  misses,
  streak: 0,
  lastSeenAt: Date.now(),
  lastMissedAt: Date.now(),
})

const seed = (factStats: FactStats) => useProgress.setState({ factStats })

function draw(next: () => Problem, n: number): Problem[] {
  return Array.from({ length: n }, () => next())
}

/** [a, b] from "a × b = ?" */
const factors = (p: Problem) => p.prompt.match(/^(\d+) × (\d+) = \?$/)!.slice(1).map(Number)

beforeEach(() => useProgress.getState().resetPlayer())

describe('multiplication: weak facts across sessions', () => {
  it('serves a missed 7×8 noticeably more than uniform, but still serves other facts', () => {
    seed({ 'mult:7x8': missed(4, 3) })
    const provider = makeMultiplicationProvider(MULT)
    const problems = draw(() => provider.next() as Problem, 1000)

    const hits = problems.filter((p) => p.factId === 'mult:7x8').length
    const uniformShare = 2 / 81 // 7×8 or 8×7 out of 9 × 9 ordered pairs
    expect(hits / 1000).toBeGreaterThan(uniformShare * 4)
    expect(hits / 1000).toBeLessThan(0.45) // the rest stays uniform
    expect(new Set(problems.map((p) => p.factId)).size).toBeGreaterThan(30)
    // both orders of the boosted fact show up
    expect(new Set(problems.filter((p) => p.factId === 'mult:7x8').map((p) => p.prompt)).size).toBe(2)

    for (const p of problems) {
      for (const f of factors(p)) {
        expect(f).toBeGreaterThanOrEqual(MULT.factorMin)
        expect(f).toBeLessThanOrEqual(MULT.factorMax)
      }
      const [a, b] = factors(p)
      expect(p.factId).toBe(multFactId(a, b))
      expect(p.answer).toBe(a * b)
    }
  })

  it('never serves a weak fact outside the stage range', () => {
    seed({ 'mult:7x8': missed(4, 4), 'mult:3x12': missed(2, 2), 'mult:4x5': missed(3, 3) })
    const provider = makeMultiplicationProvider({ factorMin: 2, factorMax: 6 })
    const problems = draw(() => provider.next() as Problem, 500)
    expect(problems.some((p) => p.factId === 'mult:7x8' || p.factId === 'mult:3x12')).toBe(false)
    expect(problems.filter((p) => p.factId === 'mult:4x5').length).toBeGreaterThan(500 * 0.1) // in range: boosted
    for (const p of problems) for (const f of factors(p)) expect(f >= 2 && f <= 6).toBe(true)
  })

  it('stops boosting a fact once it is answered right twice in a row', () => {
    seed({ 'mult:7x8': missed(4, 3) })
    const { recordAnswer } = useProgress.getState()
    recordAnswer(true, { factId: 'mult:7x8' })
    recordAnswer(true, { factId: 'mult:7x8' })
    const provider = makeMultiplicationProvider(MULT)
    const hits = draw(() => provider.next() as Problem, 1000).filter((p) => p.factId === 'mult:7x8').length
    expect(hits / 1000).toBeLessThan(0.07) // back to ~uniform (2.5%)
  })
})

describe('within-session retry', () => {
  it('a missed problem comes back 2–3 questions later, never immediately', () => {
    for (let trial = 0; trial < 40; trial++) {
      useProgress.getState().resetPlayer()
      const provider = makeMultiplicationProvider(MULT)
      const first = provider.next() as Problem
      useProgress.getState().recordAnswer(false, first)
      const [p1, p2, p3] = draw(() => provider.next() as Problem, 3)
      expect(p1.factId).not.toBe(first.factId)
      const back = [p2, p3].filter((p) => p.factId === first.factId)
      expect(back, `trial ${trial}`).toHaveLength(1)
      // the same question again (fresh id so the UI re-renders, reshuffled buttons)
      expect(back[0].prompt).toBe(first.prompt)
      expect(back[0].id).not.toBe(first.id)
      expect(back[0].options.filter((o) => o === back[0].answer)).toHaveLength(1)
    }
  })

  it('a fact answered right is not retried', () => {
    for (let trial = 0; trial < 20; trial++) {
      useProgress.getState().resetPlayer()
      const provider = makeMultiplicationProvider(MULT)
      const first = provider.next() as Problem
      useProgress.getState().recordAnswer(true, first)
      const next = draw(() => provider.next() as Problem, 4)
      // only an occasional uniform repeat (≈1/40 per draw), never a scheduled retry
      expect(next.filter((p) => p.factId === first.factId).length).toBeLessThan(2)
    }
  })

  it('works for division too', () => {
    const provider = makeDivisionProvider(DIV)
    const first = provider.next() as Problem
    useProgress.getState().recordAnswer(false, first)
    const later = draw(() => provider.next() as Problem, 3)
    expect(later[0].factId).not.toBe(first.factId)
    expect(later.slice(1).some((p) => p.factId === first.factId)).toBe(true)
  })
})

describe('division: weak facts across sessions', () => {
  it('boosts a missed 56 ÷ 8 within the configured range', () => {
    seed({ 'div:56/8': missed(3, 2), 'div:120/12': missed(3, 3) })
    const provider = makeDivisionProvider(DIV)
    const problems = draw(() => provider.next() as Problem, 1000)
    const hits = problems.filter((p) => p.prompt === '56 ÷ 8 = ?').length
    expect(hits / 1000).toBeGreaterThan((1 / 81) * 4)
    expect(problems.some((p) => p.factId === 'div:120/12')).toBe(false)
    for (const p of problems) {
      const [dividend, divisor] = p.prompt.match(/^(\d+) ÷ (\d+) = \?$/)!.slice(1).map(Number)
      expect(p.answer).toBe(dividend / divisor)
      expect(p.factId).toBe(divFactId(divisor, dividend / divisor))
      expect(divisor >= 2 && divisor <= 10 && dividend / divisor >= 2 && dividend / divisor <= 10).toBe(true)
    }
  })
})

describe('fact ids', () => {
  it('round-trip through parse for every fact provider', () => {
    const FRAC_EQ = { maxDenominator: 12 }
    const FRAC_CMP = { maxDenominator: 10 }
    const cases: Array<{ provider: { next(): unknown }; canonical: (id: string) => string | undefined }> = [
      { provider: makeMultiplicationProvider(MULT), canonical: (id) => { const f = parseMultFactId(id, MULT); return f ? multFactId(f.a, f.b) : undefined } },
      { provider: makeDivisionProvider(DIV), canonical: (id) => { const f = parseDivFactId(id, DIV); return f ? divFactId(f.divisor, f.quotient) : undefined } },
      { provider: makeFractionEquivalenceProvider(FRAC_EQ), canonical: (id) => { const f = parseFracEqFactId(id, FRAC_EQ); return f ? fracEqFactId(f) : undefined } },
      { provider: makeFractionCompareProvider(FRAC_CMP), canonical: (id) => { const f = parseFracCmpFactId(id, FRAC_CMP); return f ? fracCmpFactId(f) : undefined } },
    ]
    for (const { provider, canonical } of cases) {
      for (const p of draw(() => provider.next() as Problem, 200)) {
        expect(p.factId, p.prompt).toBeDefined()
        expect(canonical(p.factId!), p.prompt).toBe(p.factId)
      }
    }
  })

  it('fraction facts name what the prompt asks', () => {
    const eq = makeFractionEquivalenceProvider({ maxDenominator: 12 })
    for (const p of draw(() => eq.next() as Problem, 100)) {
      expect(p.factId).toBe(`frac-eq:${p.prompt.replace(/\s/g, '')}`)
    }
    const cmp = makeFractionCompareProvider({ maxDenominator: 10 })
    for (const p of draw(() => cmp.next() as Problem, 100)) {
      const [a, b] = p.prompt.split('?').map((t) => t.trim())
      expect([`frac-cmp:${a},${b}`, `frac-cmp:${b},${a}`]).toContain(p.factId)
    }
  })
})

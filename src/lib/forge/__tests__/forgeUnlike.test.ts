import { afterEach, describe, expect, it, vi } from 'vitest'
import { getZone, zoneStages } from '../../../curriculum'
import { GRADE_TIERS } from '../../gradeTiers'
import { makeFractionEquivalenceProvider } from '../../providers/fractionEquivalence'
import { forgeSumFacts, makeForgeSumProvider } from '../../providers/g5Fractions'
import { seededRng } from '../../random'
import type { Problem } from '../../problem'
import {
  FORGE_LIMITS,
  forgeDenominators,
  forgeFactConfigForGrade,
  forgeModeOf,
  gaugeChoices,
  isCommonDenominator,
  lcmOf,
  parseFracEqRound,
  parseUnlikeRound,
  recipeText,
  renamedParts,
} from '../fractionCore'

/**
 * Fraction Forge's grade-5 tier (unlike denominators on the gauge) is its own
 * mode, switched on only by the grade-5 stage's `params.mode: 'unlike'`. The
 * classic forge (grades 2–4) keeps its facts, its rounds and its parse exactly.
 */

afterEach(() => vi.restoreAllMocks())

/** FNV-1a of a JSON value: short golden values. */
function hash(x: unknown): string {
  const s = JSON.stringify(x)
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16)
}

describe('the forge mode a stage plays', () => {
  it('grades 2–4 (and every non-g5 stage) play the classic equivalence forge; only g5-frac-1 plays unlike', () => {
    const falls = getZone('fraction-falls')!
    for (const g of [2, 3, 4] as const) for (const s of zoneStages(falls, g)) expect(forgeModeOf(s.params), s.id).toBe('equiv')
    expect(forgeModeOf(undefined)).toBe('equiv')
    const g5 = zoneStages(falls, 5)
    expect(g5.filter((s) => s.gameId === 'fractionForge').map((s) => [s.id, forgeModeOf(s.params)])).toEqual([['g5-frac-1', 'unlike']])
    // the 2–4 forge stage itself is untouched
    expect(falls.stages[0]).toMatchObject({ id: 'frac-concept', gameId: 'fractionForge', params: { rounds: 5 }, providerConfig: { kind: 'fractionEquivalence', maxDenominator: 12 } })
  })

  // Retuned 2026-10-23 (docs/research/2026-10-23-game-difficulty-audit.md):
  // each grade's orders keep to its standards' denominators, so 3rd grade's and
  // 4th grade's goldens moved; 2nd grade's (already on the list) did not.
  it('each grade orders only its own denominators: 3.NF up to 3rd grade, 4.NF at 4th (no ninths)', () => {
    for (const g of [2, 3, 4] as const) {
      const p = makeFractionEquivalenceProvider(forgeFactConfigForGrade(g, GRADE_TIERS[g].fracEquivMaxDenom))
      const seen = new Set<number>()
      for (let i = 0; i < 400; i++) {
        const r = parseFracEqRound(p.next() as Problem)
        for (const d of [r.baseDenom, r.targetDenom]) {
          expect(forgeDenominators(g), `grade ${g}: ${r.factId}`).toContain(d)
          seen.add(d)
        }
      }
      if (g <= 3) expect([...seen].sort((a, b) => a - b)).toEqual([2, 3, 4, 6, 8])
      else expect([...seen].sort((a, b) => a - b)).toEqual([2, 3, 4, 5, 6, 8, 10, 12])
    }
  })

  it('the classic forge draws the same facts as before, grade by grade (golden)', () => {
    const got: Record<number, string> = {}
    for (const g of [2, 3, 4] as const) {
      vi.spyOn(Math, 'random').mockImplementation(seededRng(`forge-g${g}`))
      const p = makeFractionEquivalenceProvider(forgeFactConfigForGrade(g, GRADE_TIERS[g].fracEquivMaxDenom))
      const rounds = Array.from({ length: 40 }, () => parseFracEqRound(p.next() as Problem))
      // a classic round has no grade-5 parts or gauge
      for (const r of rounds) expect(Object.keys(r).sort()).toEqual(['baseDenom', 'baseNum', 'factId', 'targetDenom', 'targetNum'])
      got[g] = hash(rounds)
      vi.restoreAllMocks()
    }
    expect(got).toMatchInlineSnapshot(`
      {
        "2": "acca6186",
        "3": "3cf3b5f1",
        "4": "e6a4f9cd",
      }
    `)
  })
})

describe('grade 5: unlike denominators on the gauge', () => {
  const facts = forgeSumFacts(FORGE_LIMITS.denomMax)

  it('every order fits the gauge: its least common denominator ≤ 12, the sum under one bar', () => {
    for (const [a, b] of facts) {
      const L = lcmOf(a.d, b.d)
      expect(L).toBeLessThanOrEqual(FORGE_LIMITS.denomMax)
      expect(a.d).not.toBe(b.d)
      expect(a.n * b.d + b.n * a.d).toBeLessThan(a.d * b.d)
    }
  })

  it('parses each order into LCD slabs; renaming the parts adds up to the answer', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRng('unlike'))
    const p = makeForgeSumProvider(FORGE_LIMITS.denomMax)
    for (let i = 0; i < facts.length; i++) {
      const q = p.next() as Problem
      const r = parseUnlikeRound(q)
      const [x, y] = r.parts!
      expect(r.targetDenom).toBe(lcmOf(x.denom, y.denom))
      expect(r.targetNum).toBe((x.num * r.targetDenom) / x.denom + (y.num * r.targetDenom) / y.denom)
      expect(r.targetNum).toBeLessThan(r.targetDenom)
      // the stack the kid builds fits the press
      expect(r.targetNum).toBeLessThanOrEqual(16)
      expect(recipeText(r)).toBe(q.prompt.replace(' = ?', ''))
      const renamed = renamedParts(r).split(' + ').map((t) => Number(t.split('/')[0]))
      expect(renamed[0] + renamed[1]).toBe(r.targetNum)
    }
  })

  it('the gauge offers three sizes, exactly one a common denominator: the least one', () => {
    for (const [a, b] of facts) {
      const chips = gaugeChoices(a.d, b.d)
      expect(new Set(chips).size).toBe(3)
      const ok = chips.filter((D) => isCommonDenominator(D, a.d, b.d))
      expect(ok).toEqual([lcmOf(a.d, b.d)])
      // b + d (adding the bottoms) is always one of the wrong chips
      expect(chips).toContain(a.d + b.d)
      for (const D of chips) expect(D).toBeLessThanOrEqual(FORGE_LIMITS.denomMax)
    }
    expect(gaugeChoices(2, 3)).toEqual([3, 5, 6])
    expect(gaugeChoices(2, 4)).toEqual([2, 4, 6])
    expect(gaugeChoices(4, 6)).toEqual([6, 10, 12])
  })

  it('rejects anything that is not an unlike sum under one bar', () => {
    const P = (prompt: string, answer: string) => ({ prompt, answer }) as Problem
    expect(() => parseUnlikeRound(P('1/4 + 2/4 = ?', '3/4'))).toThrow()
    expect(() => parseUnlikeRound(P('2/3 + 3/4 = ?', '1 5/12'))).toThrow()
    expect(() => parseUnlikeRound(P('1/2 + 1/3 = ?', '2/5'))).toThrow()
    expect(() => parseUnlikeRound(P('2/3 = ?/6', '4'))).toThrow()
    expect(parseUnlikeRound(P('1/2 + 1/6 = ?', '2/3'))).toMatchObject({ targetDenom: 6, targetNum: 4 })
  })
})

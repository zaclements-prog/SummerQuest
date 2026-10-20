import { describe, expect, it } from 'vitest'
import { GROVE_ORDER_ALTS, GROVE_ORDERS, groveOrder, groveOrdersFor, grovePoolFor, groveProblem, groveSkill, makeMultiplicationGroveProvider } from '../multiplicationGrove'
import { FIELD, groveCandidates, groveChant, parseGroveRound } from '../../grove/groveCore'
import { SKILLS } from '../../../tutoring/skills'

describe('grove order bank', () => {
  it('keeps a healthy curated set of factor pairs that fit the 7 × 7 field', () => {
    expect(GROVE_ORDERS.length).toBeGreaterThanOrEqual(20)
    const pairs = new Set(GROVE_ORDERS.map((o) => `${o.rows}x${o.cols}`))
    expect(pairs.size).toBe(GROVE_ORDERS.length)
    for (const o of GROVE_ORDERS) {
      expect(o.rows).toBeGreaterThanOrEqual(2)
      expect(o.rows).toBeLessThanOrEqual(FIELD.rows)
      expect(o.cols).toBeGreaterThanOrEqual(2)
      expect(o.cols).toBeLessThanOrEqual(FIELD.cols)
    }
  })

  it('prompts are unique, substantial, and name the order', () => {
    const seen = new Set<string>()
    for (const o of GROVE_ORDERS) {
      expect(seen.has(o.prompt)).toBe(false)
      seen.add(o.prompt)
      expect(o.prompt.length).toBeGreaterThan(30)
      expect(o.prompt).toMatch(new RegExp(`${o.rows}\\s*(rows)?\\s*(of|with)\\s*${o.cols}\\b`))
      // the verb is planting now — no "which plot" quiz wording
      expect(o.prompt).not.toMatch(/which/i)
    }
  })

  it('prompts never leak a candidate total (the answer is a count, not a read)', () => {
    for (const o of GROVE_ORDERS) {
      const tokens = o.prompt.match(/\d+/g) ?? []
      for (const s of groveCandidates(o.rows, o.cols)) {
        expect(tokens, `${o.prompt}: leaks total ${s.total}`).not.toContain(String(s.total))
      }
    }
  })

  it('every order round-trips through groveCore with three distinct totals', () => {
    for (const o of GROVE_ORDERS) {
      const round = parseGroveRound(groveProblem(o))
      expect(round.shape.total).toBe(o.rows * o.cols)
      expect(new Set(round.siblings.map((s) => s.total)).size).toBe(3)
    }
  })

  it('grade filter: each tier only sees its factors, and has room for a full run', () => {
    for (const mf of [5, 6, 7]) {
      const bank = groveOrdersFor(mf)
      expect(bank.length).toBeGreaterThanOrEqual(10)
      for (const o of bank) expect(Math.max(o.rows, o.cols)).toBeLessThanOrEqual(mf)
    }
    expect(groveOrdersFor(7)).toHaveLength(GROVE_ORDERS.length)
  })

  it('groveOrder finds the bank order, or makes a plain one', () => {
    expect(groveOrder(3, 4).prompt).toContain('3 rows of 4')
    expect(groveOrder(7, 7)).toEqual({ rows: 7, cols: 7, prompt: 'Plant 7 rows of 7 trees.' })
  })
})

// CCSS 2.OA.A.3-4 — the second-pass phrasings that widen the G2 pool to 30+.
describe('grove second-pass phrasings', () => {
  it('keeps a substantial shelf with unique prompts that name the order', () => {
    expect(GROVE_ORDER_ALTS.length).toBeGreaterThanOrEqual(5)
    const seen = new Set<string>()
    for (const o of GROVE_ORDER_ALTS) {
      expect(seen.has(o.prompt)).toBe(false)
      seen.add(o.prompt)
      expect(o.prompt.length).toBeGreaterThan(30)
      expect(o.prompt).toMatch(new RegExp(`${o.rows}\\s*(rows)?\\s*(of|with)\\s*${o.cols}\\b`))
      expect(o.prompt).not.toMatch(/which/i)
    }
    // never re-prints a canonical prompt — an alt must be a fresh reading
    const canonical = new Set(GROVE_ORDERS.map((o) => o.prompt))
    for (const o of GROVE_ORDER_ALTS) expect(canonical.has(o.prompt)).toBe(false)
  })

  it('stays inside the grade-2 cap (factors ≤ 5)', () => {
    for (const o of GROVE_ORDER_ALTS) expect(Math.max(o.rows, o.cols)).toBeLessThanOrEqual(5)
  })

  it('prompts never leak a candidate total, and orders round-trip', () => {
    for (const o of GROVE_ORDER_ALTS) {
      const tokens = o.prompt.match(/\d+/g) ?? []
      for (const s of groveCandidates(o.rows, o.cols)) {
        expect(tokens, `${o.prompt}: leaks total ${s.total}`).not.toContain(String(s.total))
      }
      const round = parseGroveRound(groveProblem(o))
      expect(round.shape.total).toBe(o.rows * o.cols)
      expect(new Set(round.siblings.map((s) => s.total)).size).toBe(3)
    }
  })
})

describe('makeMultiplicationGroveProvider', () => {
  it('serves problems whose answer is the target total among three plot totals', async () => {
    const p = makeMultiplicationGroveProvider()
    for (let i = 0; i < 10; i++) {
      const problem = await p.next()
      expect(new Set(problem.options.map(String)).size).toBe(problem.options.length)
      expect(problem.options).toContain(problem.answer)
      expect(problem.options.length).toBe(3)
      expect(problem.visual?.kind).toBe('array')
      expect(SKILLS[problem.skill!.id]).toBeDefined()
      // curated fixed bank: no adaptive factId (not sampler-backed)
      expect(problem.factId).toBeUndefined()
      expect(problem.topic).toBe('multiplication-grove')
    }
  })

  it('options are exactly the round’s candidate totals, no reads in the prompt', async () => {
    const p = makeMultiplicationGroveProvider()
    for (let i = 0; i < GROVE_ORDERS.length; i++) {
      const problem = await p.next()
      const m = problem.visual?.kind === 'array' ? problem.visual : null
      expect(m).not.toBeNull()
      const c = groveCandidates(m!.rows, m!.cols)
      expect([...problem.options].sort((a, b) => (a as number) - (b as number))).toEqual(
        c.map((s) => s.total).sort((a, b) => a - b),
      )
      const scene = groveChant(m!.rows, m!.cols, m!.rows)
      expect(problem.prompt).not.toContain(scene)
    }
  })

  it('routes tall factors to the 6–9 skill and small ones to 2–5', () => {
    expect(groveSkill(2, 3).id).toBe('mult-f2_5')
    expect(groveSkill(5, 2).id).toBe('mult-f2_5')
    expect(groveSkill(2, 6).id).toBe('mult-f6_9')
    expect(groveSkill(6, 2).id).toBe('mult-f6_9')
    expect(groveSkill(5, 6).id).toBe('mult-f6_9')
  })

  it('does not repeat an order until the whole (grade) bank has been served', async () => {
    for (const mf of [5, 6, 7]) {
      const p = makeMultiplicationGroveProvider({ maxFactor: mf })
      const seen = new Set<string>()
      for (let i = 0; i < groveOrdersFor(mf).length; i++) {
        const problem = await p.next()
        expect(seen.has(problem.prompt)).toBe(false)
        seen.add(problem.prompt)
      }
    }
  })

  it('the default (GameRunner) provider stays within factors up to 6', async () => {
    const p = makeMultiplicationGroveProvider()
    for (let i = 0; i < 40; i++) {
      const problem = await p.next()
      const m = problem.visual?.kind === 'array' ? problem.visual : null
      expect(Math.max(m!.rows, m!.cols)).toBeLessThanOrEqual(6)
    }
  })

  it('reshuffles after the bank is exhausted and resets', async () => {
    const p = makeMultiplicationGroveProvider()
    // the served pool is the canonical bank plus the second-pass phrasings
    for (let i = 0; i < grovePoolFor().length; i++) await p.next()
    const first = await p.next()
    expect(grovePoolFor().some((o) => first.prompt.startsWith(o.prompt))).toBe(true)
    p.reset?.()
    const after = await p.next()
    expect(grovePoolFor().some((o) => after.prompt.startsWith(o.prompt))).toBe(true)
  })
})

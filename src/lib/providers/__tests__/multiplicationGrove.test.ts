import { describe, expect, it } from 'vitest'
import { GROVE_ORDERS, groveSkill, makeMultiplicationGroveProvider } from '../multiplicationGrove'
import { groveCandidates, groveChant, parseGroveRound } from '../../grove/groveCore'
import { SKILLS } from '../../../tutoring/skills'

describe('grove order bank', () => {
  it('keeps a healthy curated set of factor pairs between 2 and 6', () => {
    expect(GROVE_ORDERS.length).toBeGreaterThanOrEqual(10)
    const pairs = new Set(GROVE_ORDERS.map((o) => `${o.rows}x${o.cols}`))
    expect(pairs.size).toBe(GROVE_ORDERS.length)
    for (const o of GROVE_ORDERS) {
      expect(o.rows).toBeGreaterThanOrEqual(2)
      expect(o.rows).toBeLessThanOrEqual(6)
      expect(o.cols).toBeGreaterThanOrEqual(2)
      expect(o.cols).toBeLessThanOrEqual(6)
    }
  })

  it('prompts are unique, substantial, and name the order', () => {
    const seen = new Set<string>()
    for (const o of GROVE_ORDERS) {
      expect(seen.has(o.prompt)).toBe(false)
      seen.add(o.prompt)
      expect(o.prompt.length).toBeGreaterThan(40)
      expect(o.prompt).toMatch(new RegExp(`${o.rows}\\s*(rows)?\\s*(of|with)\\s*${o.cols}\\b`))
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
      const problem = {
        prompt: o.prompt,
        answer: o.rows * o.cols,
        visual: { kind: 'array' as const, rows: o.rows, cols: o.cols },
      }
      const round = parseGroveRound(problem)
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

  it('does not repeat an order until the whole bank has been served', async () => {
    const p = makeMultiplicationGroveProvider()
    const seen = new Set<string>()
    for (let i = 0; i < GROVE_ORDERS.length; i++) {
      const problem = await p.next()
      expect(seen.has(problem.prompt)).toBe(false)
      seen.add(problem.prompt)
    }
  })

  it('reshuffles after the bank is exhausted and resets', async () => {
    const p = makeMultiplicationGroveProvider()
    for (let i = 0; i < GROVE_ORDERS.length; i++) await p.next()
    const first = await p.next()
    expect(GROVE_ORDERS.some((o) => o.prompt === first.prompt)).toBe(true)
    p.reset?.()
    const after = await p.next()
    expect(GROVE_ORDERS.some((o) => o.prompt === after.prompt)).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { CYCLE_SITUATIONS, makeScienceCycleProvider, situationShort } from '../scienceCycle'
import { PROCESSES } from '../../cycle/cycleCore'

describe('short captions (the host speech bubble)', () => {
  it('every situation has a short, leak-free caption', () => {
    for (const s of CYCLE_SITUATIONS) {
      expect(s.short.length).toBeGreaterThan(5)
      expect(s.short.length).toBeLessThanOrEqual(28)
      for (const p of PROCESSES) expect(s.short.toLowerCase()).not.toContain(p)
      expect(situationShort(s.prompt)).toBe(s.short)
    }
  })
  it('falls back to the prompt for unknown text', () => {
    expect(situationShort('mystery')).toBe('mystery')
  })
})

describe('nextFor (route-order legs)', () => {
  it('serves a situation whose answer is the asked process', async () => {
    const p = makeScienceCycleProvider()
    for (const proc of [...PROCESSES, ...PROCESSES, ...PROCESSES]) {
      const problem = p.nextFor(proc)
      expect(problem.answer).toBe(proc)
      expect([...problem.options].sort()).toEqual([...PROCESSES].sort())
      expect(problem.skill?.id).toBe('sci-water-cycle')
      expect(problem.factId).toBeUndefined()
    }
  })
  it('cycles through every situation of a process before repeating, never back to back', () => {
    const p = makeScienceCycleProvider()
    const evap = CYCLE_SITUATIONS.filter((s) => s.answer === 'evaporation')
    const seen = new Set<string>()
    for (let i = 0; i < evap.length; i++) seen.add(p.nextFor('evaporation').prompt)
    expect(seen.size).toBe(evap.length)
    let prev = ''
    for (let i = 0; i < 40; i++) {
      const cur = p.nextFor('evaporation').prompt
      expect(cur).not.toBe(prev)
      prev = cur
    }
  })
})

describe('water-cycle situation bank', () => {
  it('answers are valid processes and balanced across all three', () => {
    const counts: Record<string, number> = {}
    for (const s of CYCLE_SITUATIONS) {
      expect(PROCESSES).toContain(s.answer)
      counts[s.answer] = (counts[s.answer] ?? 0) + 1
    }
    for (const p of PROCESSES) expect(counts[p] ?? 0).toBeGreaterThanOrEqual(5)
  })

  it('never leaks its own answer word in the prompt', () => {
    for (const s of CYCLE_SITUATIONS) {
      expect(s.prompt.toLowerCase()).not.toContain(s.answer)
    }
  })

  it('prompts are unique and substantial', () => {
    const seen = new Set<string>()
    for (const s of CYCLE_SITUATIONS) {
      expect(seen.has(s.prompt)).toBe(false)
      seen.add(s.prompt)
      expect(s.prompt.length).toBeGreaterThan(40)
    }
  })

  it('every situation asks the kid something (a question or a blank to fill)', () => {
    // a bare statement ("Snow falls on the mountains.") over three answer buttons
    // left 7-year-olds guessing what was being asked
    for (const s of CYCLE_SITUATIONS) expect(s.prompt, s.prompt).toMatch(/\?$|___\.$/)
  })
})

describe('makeScienceCycleProvider', () => {
  it('serves problems whose answer is a process and whose options are all three processes', async () => {
    const p = makeScienceCycleProvider()
    for (let i = 0; i < 6; i++) {
      const problem = await p.next()
      expect(PROCESSES).toContain(problem.answer as (typeof PROCESSES)[number])
      expect([...problem.options].sort()).toEqual([...PROCESSES].sort())
      expect(problem.skill?.id).toBe('sci-water-cycle')
      // curated fixed bank: no adaptive factId (not sampler-backed)
      expect(problem.factId).toBeUndefined()
    }
  })

  it('does not repeat a situation until the whole bank has been served', async () => {
    const p = makeScienceCycleProvider()
    const seen = new Set<string>()
    for (let i = 0; i < CYCLE_SITUATIONS.length; i++) {
      const problem = await p.next()
      expect(seen.has(problem.prompt)).toBe(false)
      seen.add(problem.prompt)
    }
  })

  it('reshuffles after the bank is exhausted and resets', async () => {
    const p = makeScienceCycleProvider()
    for (let i = 0; i < CYCLE_SITUATIONS.length; i++) await p.next()
    const first = await p.next()
    expect(CYCLE_SITUATIONS.some((s) => s.prompt === first.prompt)).toBe(true)
    p.reset?.()
    const after = await p.next()
    expect(CYCLE_SITUATIONS.some((s) => s.prompt === after.prompt)).toBe(true)
  })
})

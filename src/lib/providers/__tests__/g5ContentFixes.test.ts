import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Problem } from '../../problem'
import { seededRng } from '../../random'
import { foodWebItem, FOOD_CHAINS, pluralOf } from '../g5Science'
import { makeG5GeometryProvider } from '../g5Geometry'
import { makeG5MultProvider, roundGreatest } from '../g5Mult'
import { makeG5MeasureProvider } from '../g5Measure'
import { powersItem } from '../g5Decimals'
import { SPHERE_MOVES } from '../g5Spheres'
import { G5_ASN } from '../content/g5Shapes'

/** Grade-5 playtest fixes: wording, definitions and distractors. */

const num = (s: string) => Number(String(s).replace(/,/g, ''))

function many(make: () => Problem, n = 600): Problem[] {
  return Array.from({ length: n }, make)
}

afterEach(() => vi.restoreAllMocks())

describe('grade-5 content', () => {
  it('"if all the grasshoppers disappeared": food-chain questions use the plural', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRng('food-plural'))
    const asked = Array.from({ length: 400 }, foodWebItem).filter((q) => /if all the/.test(q.prompt))
    expect(asked.length).toBeGreaterThan(10)
    for (const q of asked) {
      const consumer = FOOD_CHAINS.find((c) => q.prompt.includes(c.chain.join(' → ')))!.chain[1]
      expect(q.prompt).toContain(`if all the ${pluralOf(consumer)} disappeared`)
    }
    expect(pluralOf('grasshopper')).toBe('grasshoppers')
    expect(pluralOf('mouse')).toBe('mice')
    expect(pluralOf('krill')).toBe('krill')
  })

  it('triangles use the inclusive definition: isosceles is "at least two" equal sides', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRng('tri-incl'))
    const prov = makeG5GeometryProvider({ mode: 'classify' })
    const tri = many(() => prov.next() as Problem).filter((p) => /has sides of/.test(p.prompt))
    expect(tri.length).toBeGreaterThan(10)
    for (const p of tri) {
      expect(p.hint).not.toMatch(/exactly two/i)
      expect(p.hint).toMatch(/at least two equal sides: isosceles/i)
    }
    expect(G5_ASN.find((a) => /equilateral triangle is ___ an isosceles/.test(a.text))?.answer).toBe('always')
  })

  it('estimates say which place to round to, and the answer rounds there', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRng('est-place'))
    const prov = makeG5MultProvider({ mode: 'algorithm' })
    const est = many(() => prov.next() as Problem).filter((p) => p.subtopic === 'estimate')
    expect(est.length).toBeGreaterThan(10)
    for (const p of est) {
      expect(p.prompt).toMatch(/^Round each number to its greatest place, then estimate\./)
      const [a, b] = p.prompt.match(/(\d+) × (\d+)/)!.slice(1).map(Number)
      expect(num(String(p.answer))).toBe(roundGreatest(a) * roundGreatest(b))
    }
  })

  it('unit conversions never offer "add the factor" (9 kg = 1,009 g)', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRng('conv-add'))
    const prov = makeG5MeasureProvider({ mode: 'convert' })
    const toSmall = many(() => prov.next() as Problem, 800).filter((p) => p.subtopic === 'toSmall')
    expect(toSmall.length).toBeGreaterThan(20)
    for (const p of toSmall) {
      const n = num(p.prompt.split(' ')[0])
      const f = Number(p.hint!.match(/multiply by ([\d,]+)/)![1].replace(/,/g, ''))
      if (![10, 100, 1000].includes(f)) continue // (customary: 6 ft → 18 is "times 3", not "plus 12")
      // no option is the amount plus the factor
      for (const o of p.options) expect(Math.abs(num(String(o)) - (n + f)), `${p.prompt} ${o}`).toBeGreaterThan(1e-9)
    }
  })

  it('"34.1 × 10³": every choice is the same digits with the point moved, never a stray .1 or .2', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRng('pow-shift'))
    for (let i = 0; i < 400; i++) {
      const it = powersItem()
      const digits = (s: string) => s.replace(/[^0-9]/g, '').replace(/^0+/, '').replace(/0+$/, '')
      const want = digits(it.answer)
      for (const o of it.options) expect(digits(o), `${it.prompt}: ${it.options.join(' / ')}`).toBe(want)
    }
  })

  it('Sphere Keeper: groundwater reads as water (hydrosphere), not ground', () => {
    const mv = SPHERE_MOVES.find((m) => /groundwater/.test(m.event))!
    expect(mv.to).toBe('hydrosphere')
    expect(mv.clue).not.toMatch(/underground/)
    expect(mv.clue).toMatch(/water/i)
  })
})

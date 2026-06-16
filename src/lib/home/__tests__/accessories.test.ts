import { describe, it, expect } from 'vitest'
import { ACCESSORIES, accessoryById } from '../accessories'

const SLOTS = ['head', 'face', 'back', 'body']

describe('accessories catalog', () => {
  it('ids unique, prices positive, slots valid, ~16 items', () => {
    const ids = ACCESSORIES.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ACCESSORIES.length).toBeGreaterThanOrEqual(14)
    for (const a of ACCESSORIES) {
      expect(a.price).toBeGreaterThan(0)
      expect(SLOTS).toContain(a.slot)
      expect(a.modelId.length).toBeGreaterThan(0)
    }
  })
  it('covers all four slots', () => {
    for (const s of SLOTS) expect(ACCESSORIES.some((a) => a.slot === s)).toBe(true)
  })
  it('accessoryById resolves and returns undefined for unknown', () => {
    expect(accessoryById(ACCESSORIES[0].id)?.id).toBe(ACCESSORIES[0].id)
    expect(accessoryById('nope')).toBeUndefined()
  })
})

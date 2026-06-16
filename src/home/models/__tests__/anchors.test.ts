import { describe, it, expect } from 'vitest'
import { CREATURE_ANCHORS, anchorsFor } from '../anchors'
import { CREATURES } from '../../../lib/home/catalog'

describe('anchors', () => {
  it('every creature has a full anchor set with positive scale', () => {
    for (const c of CREATURES) {
      const a = CREATURE_ANCHORS[c.id]
      expect(a, `missing anchors for ${c.id}`).toBeTruthy()
      for (const slot of ['head', 'face', 'back', 'body'] as const) {
        expect(Array.isArray(a[slot])).toBe(true)
        expect(a[slot]).toHaveLength(3)
      }
      expect(a.scale).toBeGreaterThan(0)
    }
  })
  it('anchorsFor returns a fallback for an unknown creature', () => {
    const a = anchorsFor('nope')
    expect(a.scale).toBeGreaterThan(0)
    expect(a.head).toHaveLength(3)
  })
})

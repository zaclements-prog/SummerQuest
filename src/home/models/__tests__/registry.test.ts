import { describe, it, expect } from 'vitest'
import { creatureBuilder, furnitureBuilder } from '../registry'

describe('registry', () => {
  it('returns a builder for a known creature and a fallback for unknown', () => {
    expect(typeof creatureBuilder('fox')).toBe('function')
    expect(typeof creatureBuilder('nope')).toBe('function') // fallback, never undefined
    expect(typeof furnitureBuilder('nope')).toBe('function')
  })
})

import { CREATURES } from '../../../lib/home/catalog'
import { _coverage } from '../registry'
it('every creature id has a registered (non-fallback) builder', () => {
  for (const c of CREATURES) expect(c.id in _coverage.CREATURE_BUILDERS).toBe(true)
})

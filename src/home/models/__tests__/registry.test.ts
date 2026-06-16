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

import { HOME_ITEMS } from '../../../lib/home/catalog'
it('every home item modelId has a registered (non-fallback) builder', () => {
  for (const i of HOME_ITEMS) expect(i.modelId in _coverage.FURNITURE_BUILDERS).toBe(true)
})

import { describe, it, expect } from 'vitest'
import { creatureBuilder, furnitureBuilder } from '../registry'

describe('registry', () => {
  it('returns a builder for a known creature and a fallback for unknown', () => {
    expect(typeof creatureBuilder('fox')).toBe('function')
    expect(typeof creatureBuilder('nope')).toBe('function') // fallback, never undefined
    expect(typeof furnitureBuilder('nope')).toBe('function')
  })
})

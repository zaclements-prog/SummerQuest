import { describe, it, expect } from 'vitest'
import { starterCreaturePatch } from '../../home/starterCreature'

// The World renders no avatar without an active creature, so whichever 3D screen a
// new player opens first (Home or World) must seed the starter.
describe('starterCreaturePatch', () => {
  it('gives a new player the creature matching their avatar emoji', () => {
    expect(starterCreaturePatch({ player: { emoji: '🐉' }, ownedCreatures: [], activeCreature: null }))
      .toEqual({ ownedCreatures: ['dragon'], activeCreature: 'dragon' })
  })

  it('falls back to the first creature for an unknown emoji', () => {
    expect(starterCreaturePatch({ player: { emoji: '❓' }, ownedCreatures: [], activeCreature: null }))
      .toEqual({ ownedCreatures: ['fox'], activeCreature: 'fox' })
  })

  it('re-activates an owned creature when none is active', () => {
    expect(starterCreaturePatch({ player: { emoji: '🦊' }, ownedCreatures: ['owl', 'fox'], activeCreature: null }))
      .toEqual({ activeCreature: 'owl' })
  })

  it('leaves an existing setup alone, and does nothing without a player', () => {
    expect(starterCreaturePatch({ player: { emoji: '🦊' }, ownedCreatures: ['fox', 'owl'], activeCreature: 'owl' })).toBeNull()
    expect(starterCreaturePatch({ player: null, ownedCreatures: [], activeCreature: null })).toBeNull()
  })
})

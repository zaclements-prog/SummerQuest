import { describe, it, expect } from 'vitest'
import { homePetIds, MAX_HOME_PETS } from '../roster'

describe('Home room pets', () => {
  const hatched = ['lion', 'trex', 'frog', 'unicorn', 'bear', 'panda', 'fox', 'owl']

  it('puts the buddy first and keeps the rest in order', () => {
    expect(homePetIds(['lion', 'frog', 'owl'], 'owl', null)).toEqual(['owl', 'lion', 'frog'])
    expect(homePetIds(['lion', 'frog'], 'lion', null)).toEqual(['lion', 'frog'])
  })

  it("never shows the creature you're playing as", () => {
    expect(homePetIds(['lion', 'frog', 'owl'], 'frog', 'frog')).toEqual(['lion', 'owl'])
    expect(homePetIds(['lion', 'frog', 'owl'], null, 'lion')).toEqual(['frog', 'owl'])
  })

  it('shows at most six, the buddy always among them', () => {
    expect(MAX_HOME_PETS).toBe(6)
    const out = homePetIds(hatched, 'owl', null)
    expect(out).toHaveLength(6)
    expect(out[0]).toBe('owl')
    expect(out).toEqual(['owl', 'lion', 'trex', 'frog', 'unicorn', 'bear'])
  })

  it('a buddy that is not hatched (or not set) changes nothing', () => {
    expect(homePetIds(['lion', 'frog'], 'dragon', null)).toEqual(['lion', 'frog'])
    expect(homePetIds([], null, 'fox')).toEqual([])
  })
})

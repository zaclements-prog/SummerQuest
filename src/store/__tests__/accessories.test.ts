import { describe, it, expect, beforeEach } from 'vitest'
import { useProgress } from '../progress'

beforeEach(() => {
  useProgress.getState().resetPlayer()
  useProgress.setState({ coins: 1000 })
})

describe('accessory store', () => {
  it('buyAccessory spends coins once; equip sets the slot from the catalog', () => {
    expect(useProgress.getState().buyAccessory('cap', 80)).toBe(true)
    expect(useProgress.getState().coins).toBe(920)
    expect(useProgress.getState().ownedAccessories).toContain('cap')
    expect(useProgress.getState().buyAccessory('cap', 80)).toBe(true) // already owned, no charge
    expect(useProgress.getState().coins).toBe(920)
    useProgress.getState().equipAccessory('cap')
    expect(useProgress.getState().equippedAccessories.head).toBe('cap')
  })
  it('equipping a same-slot item replaces; re-equipping toggles off', () => {
    useProgress.getState().buyAccessory('cap', 80)
    useProgress.getState().buyAccessory('tophat', 200)
    useProgress.getState().equipAccessory('cap')
    useProgress.getState().equipAccessory('tophat')
    expect(useProgress.getState().equippedAccessories.head).toBe('tophat')
    useProgress.getState().equipAccessory('tophat')
    expect(useProgress.getState().equippedAccessories.head).toBeNull()
  })
  it('unequipSlot clears a slot; resetPlayer clears all', () => {
    useProgress.getState().buyAccessory('sunglasses', 120)
    useProgress.getState().equipAccessory('sunglasses')
    useProgress.getState().unequipSlot('face')
    expect(useProgress.getState().equippedAccessories.face).toBeNull()
    useProgress.getState().buyAccessory('cap', 80)
    useProgress.getState().resetPlayer()
    expect(useProgress.getState().ownedAccessories).toEqual([])
    expect(useProgress.getState().equippedAccessories).toEqual({ head: null, face: null, back: null, body: null })
  })
})

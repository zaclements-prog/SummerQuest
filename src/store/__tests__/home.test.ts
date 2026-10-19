import { describe, it, expect, beforeEach } from 'vitest'
import { useProgress } from '../progress'

beforeEach(() => {
  useProgress.getState().resetPlayer()
  useProgress.setState({ coins: 100, ownedCreatures: ['fox'], activeCreature: 'fox' })
})

describe('home store', () => {
  it('buyHomeItem spends coins and adds to inventory; fails when too poor', () => {
    expect(useProgress.getState().buyHomeItem('rug', 30)).toBe(true)
    expect(useProgress.getState().coins).toBe(70)
    expect(useProgress.getState().ownedHomeItems['rug']).toBe(1)
    expect(useProgress.getState().buyHomeItem('crown_lamp', 999)).toBe(false)
    expect(useProgress.getState().coins).toBe(70)
  })

  it('placeItem consumes one from inventory and appends a placement', () => {
    useProgress.getState().buyHomeItem('rug', 30)
    const uid = useProgress.getState().placeItem('rug', 2, 3, 90)
    expect(uid).toBeTruthy()
    expect(useProgress.getState().ownedHomeItems['rug']).toBe(0)
    const p = useProgress.getState().placedItems
    expect(p).toHaveLength(1)
    expect(p[0]).toMatchObject({ itemId: 'rug', gx: 2, gz: 3, rot: 90 })
  })

  it('placeItem returns null when inventory is empty', () => {
    expect(useProgress.getState().placeItem('rug', 0, 0, 0)).toBeNull()
  })

  it('moveItem updates a placement; removeItem returns it to inventory', () => {
    useProgress.getState().buyHomeItem('rug', 30)
    const uid = useProgress.getState().placeItem('rug', 0, 0, 0)!
    useProgress.getState().moveItem(uid, 5, 5, 180)
    expect(useProgress.getState().placedItems[0]).toMatchObject({ gx: 5, gz: 5, rot: 180 })
    useProgress.getState().removeItem(uid)
    expect(useProgress.getState().placedItems).toHaveLength(0)
    expect(useProgress.getState().ownedHomeItems['rug']).toBe(1)
  })

  it('becomeCreature switches to an owned creature; an unowned one is ignored (and costs nothing)', () => {
    useProgress.setState({ ownedCreatures: ['fox', 'dragon'] })
    useProgress.getState().becomeCreature('dragon')
    expect(useProgress.getState().activeCreature).toBe('dragon')
    useProgress.getState().becomeCreature('unicorn') // not owned → ignored
    expect(useProgress.getState().activeCreature).toBe('dragon')
    expect(useProgress.getState().coins).toBe(100)
  })

  it('creatures are no longer for sale', () => {
    expect('buyCreature' in useProgress.getState()).toBe(false)
  })

  it('resetPlayer clears home state', () => {
    useProgress.getState().buyHomeItem('rug', 30)
    useProgress.getState().resetPlayer()
    expect(useProgress.getState().placedItems).toEqual([])
    expect(useProgress.getState().ownedHomeItems).toEqual({})
    expect(useProgress.getState().ownedCreatures).toEqual([])
  })
})

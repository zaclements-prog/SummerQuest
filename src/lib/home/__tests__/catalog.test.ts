import { describe, it, expect } from 'vitest'
import { HOME_ITEMS, CREATURES, creatureForEmoji } from '../catalog'

const AVATAR_EMOJIS = ['🦊','🐯','🦁','🐻','🐼','🐸','🦉','🐲','🦄','🐙','🦖','🐉']

describe('catalog', () => {
  it('home item ids are unique with positive prices and valid footprints', () => {
    const ids = HOME_ITEMS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const i of HOME_ITEMS) {
      expect(i.price).toBeGreaterThan(0)
      expect(i.footprint.w).toBeGreaterThanOrEqual(1)
      expect(i.footprint.d).toBeGreaterThanOrEqual(1)
      expect(['furniture', 'decor']).toContain(i.category)
    }
  })

  it('creatures cover every avatar emoji exactly once (plus the Schoolhouse raven, not a starter)', () => {
    const starters = CREATURES.filter((c) => c.id !== 'raven')
    const emojis = starters.map((c) => c.emoji)
    expect(new Set(emojis)).toEqual(new Set(AVATAR_EMOJIS))
    expect(emojis.length).toBe(AVATAR_EMOJIS.length)
    expect(new Set(CREATURES.map((c) => c.id)).size).toBe(CREATURES.length)
    // its emoji is no starter's, so a player's emoji never resolves to it
    expect(AVATAR_EMOJIS).not.toContain(CREATURES.find((c) => c.id === 'raven')!.emoji)
  })

  it('every creature emoji is one picture on older tablets (no ZWJ sequence, like the black bird)', () => {
    for (const c of CREATURES) expect(c.emoji, c.id).not.toMatch(/\u200d/)
  })

  it('creatureForEmoji resolves the starter from a player emoji', () => {
    expect(creatureForEmoji('🐉')?.id).toBe('dragon')
    expect(creatureForEmoji('🦊')?.id).toBe('fox')
    expect(creatureForEmoji('❓')).toBeUndefined()
  })
})

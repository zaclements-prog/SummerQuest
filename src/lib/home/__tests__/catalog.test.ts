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

  it('creatures cover every avatar emoji exactly once', () => {
    const emojis = CREATURES.map((c) => c.emoji)
    expect(new Set(emojis)).toEqual(new Set(AVATAR_EMOJIS))
    expect(emojis.length).toBe(AVATAR_EMOJIS.length)
    expect(new Set(CREATURES.map((c) => c.id)).size).toBe(CREATURES.length)
  })

  it('creatureForEmoji resolves the starter from a player emoji', () => {
    expect(creatureForEmoji('🐉')?.id).toBe('dragon')
    expect(creatureForEmoji('🦊')?.id).toBe('fox')
    expect(creatureForEmoji('❓')).toBeUndefined()
  })
})

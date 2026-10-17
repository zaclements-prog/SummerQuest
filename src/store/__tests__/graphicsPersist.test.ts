// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { useProgress } from '../progress'
import type { GraphicsQuality } from '../progress'

const KEY = 'summerquest-progress-v1'

function seedSave(state: Record<string, unknown>, version = 2) {
  localStorage.setItem(KEY, JSON.stringify({ state, version }))
}

describe('graphicsQuality in the persisted save', () => {
  beforeEach(() => {
    localStorage.clear()
    useProgress.persist?.clearStorage()
    useProgress.setState({ graphicsQuality: 'auto' })
  })

  it("a save from before the setting starts on 'auto' and keeps the rest", async () => {
    seedSave({ player: { emoji: '🦊', color: '#f97316', name: 'Old', grade: 3 }, coins: 12 })
    await useProgress.persist.rehydrate()
    const s = useProgress.getState()
    expect(s.graphicsQuality).toBe('auto')
    expect(s.coins).toBe(12)
    expect(s.player?.name).toBe('Old')
  })

  it('a v0 save (pre-migrations) also loads with the default', async () => {
    seedSave({ coins: 3 }, 0)
    await useProgress.persist.rehydrate()
    expect(useProgress.getState().graphicsQuality).toBe('auto')
    expect(useProgress.getState().coins).toBe(3)
  })

  it('a saved choice survives a reload', async () => {
    for (const q of ['high', 'low', 'auto'] as GraphicsQuality[]) {
      seedSave({ graphicsQuality: q })
      await useProgress.persist.rehydrate()
      expect(useProgress.getState().graphicsQuality).toBe(q)
    }
  })

  it('a corrupt value falls back to auto', async () => {
    seedSave({ graphicsQuality: 'ultra' })
    await useProgress.persist.rehydrate()
    expect(useProgress.getState().graphicsQuality).toBe('auto')
  })

  it('setGraphicsQuality persists the choice and rejects junk', () => {
    useProgress.getState().setGraphicsQuality('low')
    expect(useProgress.getState().graphicsQuality).toBe('low')
    expect(JSON.parse(localStorage.getItem(KEY)!).state.graphicsQuality).toBe('low')
    useProgress.getState().setGraphicsQuality('shiny' as GraphicsQuality)
    expect(useProgress.getState().graphicsQuality).toBe('low')
  })

  it('is a device setting: resetting the player keeps it', () => {
    useProgress.getState().setAvatar({ emoji: '🐼', color: '#38bdf8', name: 'P', grade: 3 })
    useProgress.getState().setGraphicsQuality('high')
    useProgress.getState().resetPlayer()
    expect(useProgress.getState().player).toBeNull()
    expect(useProgress.getState().graphicsQuality).toBe('high')
  })
})

// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { useProgress } from '../progress'

const KEY = 'summerquest-progress-v1'

function seedSave(state: Record<string, unknown>) {
  localStorage.setItem(KEY, JSON.stringify({ state: state, version: 2 }))
}

describe('grade tiers in the persisted save', () => {
  beforeEach(() => {
    localStorage.clear()
    useProgress.persist?.clearStorage()
  })

  it('a pre-grade player save gets grade 4 on rehydrate', async () => {
    seedSave({ player: { emoji: '🦊', color: '#f97316', name: 'Old Save' } })
    await useProgress.persist.rehydrate()
    const p = useProgress.getState().player
    expect(p?.grade).toBe(4)
    expect(p?.name).toBe('Old Save')
  })

  it('a corrupt grade falls back to 4', async () => {
    seedSave({ player: { emoji: '🦊', color: '#f97316', name: 'X', grade: 'gold' } })
    await useProgress.persist.rehydrate()
    expect(useProgress.getState().player?.grade).toBe(4)
  })

  it('a valid grade survives rehydration', async () => {
    seedSave({ player: { emoji: '🐸', color: '#84cc16', name: 'K', grade: 2 } })
    await useProgress.persist.rehydrate()
    expect(useProgress.getState().player?.grade).toBe(2)
  })

  it('setGrade updates the player and nothing else', () => {
    useProgress.getState().setAvatar({ emoji: '🐼', color: '#38bdf8', name: 'P', grade: 3 })
    useProgress.getState().addCoins(50)
    useProgress.getState().setGrade(2)
    const s = useProgress.getState()
    expect(s.player?.grade).toBe(2)
    expect(s.player?.name).toBe('P')
    expect(s.coins).toBe(50)
  })
})

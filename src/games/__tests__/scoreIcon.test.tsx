import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act, createElement as h } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ScorePill } from '../_runkit/RunHud'
import { ScoreChip } from '../_juice/JuiceHud'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

// The 3D games' running score sat next to the stars a stage awards as "⭐ 1,198"
// and read like a star count: the score's icon is a target instead.
describe('3D game HUD score', () => {
  it('ScoreChip (Times Grove, Division Arena, Critter Parade) shows 🎯, not ⭐', () => {
    act(() => root.render(h(ScoreChip, { score: 1198, best: 900 })))
    const t = container.textContent ?? ''
    expect(t).toContain('🎯')
    expect(t).not.toContain('⭐')
    expect(container.querySelector('[aria-label]')?.getAttribute('aria-label')).toBe(`Score ${(1198).toLocaleString()}`)
  })

  it('ScorePill (Cloud Keeper, Fraction Forge) shows 🎯, not ⭐', () => {
    act(() => root.render(h(ScorePill, { score: 0 })))
    const t = container.textContent ?? ''
    expect(t).toContain('🎯')
    expect(t).not.toContain('⭐')
  })
})

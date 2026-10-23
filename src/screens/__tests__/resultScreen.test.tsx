// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { ResultScreen, type GameResult } from '../GameRunner'
import { resultCopy } from '../resultCopy'

/**
 * The stage result screen: its headline comes from the stars and how the game
 * ended (never a stray percentage), and it's the only screen after a game —
 * no extra "Awesome!" pop-up on top of it.
 */

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const r = (over: Partial<GameResult>): GameResult => ({ stars: 3, score: 100, correct: 6, total: 6, ...over })

describe('resultCopy', () => {
  it('"Perfect!" only when every answer was right', () => {
    expect(resultCopy(r({ stars: 3, correct: 6, total: 6 })).heading).toBe('Perfect!')
    expect(resultCopy(r({ stars: 3, correct: 12, total: 13 })).heading).toBe('Amazing!')
    // a 3D game's first-try rate can be 4/6 on a 3-star run: still praised as 3 stars
    expect(resultCopy(r({ stars: 3, correct: 4, total: 6 }))).toMatchObject({ heading: 'Amazing!', won: true })
  })

  it('fewer stars: praise that matches, and a nudge for more', () => {
    expect(resultCopy(r({ stars: 2 }))).toMatchObject({ heading: 'Great job!', praise: 'Play again for more stars!', won: true })
    expect(resultCopy(r({ stars: 1 }))).toMatchObject({ heading: 'Nice work!', won: true })
    expect(resultCopy(r({ stars: 0, correct: 6, total: 6 }))).toMatchObject({ heading: 'Keep trying!', won: false })
  })

  it('a lost game says so plainly, whatever the answers', () => {
    const lost = r({ stars: 1, correct: 3, total: 3, outcome: { lost: true, headline: 'The base fell at wave 4', detail: 'Try again for more stars!' } })
    expect(resultCopy(lost)).toEqual({ heading: 'The base fell at wave 4', praise: 'Try again for more stars!', emoji: '💔', won: false })
  })
})

describe('ResultScreen', () => {
  let container: HTMLDivElement
  let root: Root
  beforeEach(() => {
    vi.useFakeTimers()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })
  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.useRealTimers()
  })

  function show(result: GameResult) {
    act(() =>
      root.render(
        <MemoryRouter>
          <ResultScreen result={result} coins={20} onContinue={() => {}} onPlayAgain={() => {}} />
        </MemoryRouter>,
      ),
    )
    act(() => vi.advanceTimersByTime(1000))
  }

  it('a win: one screen with Continue, no pop-up on top', () => {
    show(r({ stars: 3, correct: 12, total: 13 }))
    expect(document.querySelector('[aria-modal="true"]')).toBeNull()
    expect(container.textContent).toContain('Amazing!')
    expect(container.textContent).not.toContain('Perfect!')
    expect(container.textContent).not.toContain('%')
    expect(container.textContent).toContain('12 of 13 right on the first try')
    expect([...container.querySelectorAll('button')].some((b) => b.textContent?.includes('Continue'))).toBe(true)
  })

  it('tower defense lost: the base fell, not "Great job! 100%"', () => {
    show(r({ stars: 1, correct: 3, total: 3, outcome: { lost: true, headline: 'The base fell at wave 4', detail: 'Try again for more stars!' } }))
    expect(container.textContent).toContain('The base fell at wave 4')
    expect(container.textContent).toContain('Try again for more stars!')
    expect(container.textContent).not.toContain('Great job')
    expect(container.textContent).not.toContain('100%')
  })
})

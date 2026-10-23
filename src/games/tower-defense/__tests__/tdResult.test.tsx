// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { GameResult } from '../../../screens/GameRunner'
import { createProvider } from '../../../lib/providers'
import type { GameState } from '../types'

/**
 * Tower Battlefront (grades 2–4) reports how it ended, so the result screen can
 * say "The base fell at wave 4" instead of praising the math-gate score.
 */

const end = vi.hoisted(() => ({ hasWon: false, wave: 4 }))
vi.mock('../engine', async (importOriginal) => {
  const real = await importOriginal<typeof import('../engine')>()
  return {
    ...real,
    createInitialState: (w: number, h: number): GameState => {
      const s = real.createInitialState(w, h)
      s.isGameOver = true
      s.hasWon = end.hasWon
      s.wave = end.wave
      return s
    },
  }
})

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.useRealTimers()
})

async function finish(): Promise<GameResult> {
  const { default: TowerDefense } = await import('../TowerDefense')
  const done = vi.fn<(r: GameResult) => void>()
  act(() => root.render(<TowerDefense provider={createProvider({ kind: 'multiplication', factorMin: 2, factorMax: 5 })} onComplete={done} onExit={() => {}} />))
  act(() => vi.advanceTimersByTime(1500))
  expect(done).toHaveBeenCalledTimes(1)
  return done.mock.calls[0][0]
}

describe('Tower Battlefront result', () => {
  it('the base fell: says so, at the wave it fell', async () => {
    end.hasWon = false
    end.wave = 4
    const r = await finish()
    expect(r.stars).toBe(1)
    expect(r.outcome).toEqual({ lost: true, headline: 'The base fell at wave 4', detail: 'Try again for more stars!' })
  })

  it('a win carries no "lost" outcome', async () => {
    end.hasWon = true
    end.wave = 10
    const r = await finish()
    expect(r.stars).toBe(3)
    expect(r.outcome).toBeUndefined()
  })
})

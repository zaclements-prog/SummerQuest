// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { getZone, zoneStages } from '../../../curriculum'
import { createProvider } from '../../../lib/providers'
import { effectiveConfigForStage, type GradeLevel } from '../../../lib/gradeTiers'
import { seededRng } from '../../../lib/random'
import { useProgress } from '../../../store/progress'
import MathGate from '../MathGate'

/**
 * Tower Battlefront at 2nd grade: the classic game's multiplication gate
 * (×2–5), with the provider's array under the fact (2.OA.4: arrays up to
 * 5 × 5). 3rd and 4th graders answer the fact alone, as before.
 */

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  vi.spyOn(Math, 'random').mockImplementation(seededRng('g2-towers'))
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.useRealTimers()
})

async function openGate(grade: GradeLevel) {
  useProgress.getState().resetPlayer()
  useProgress.getState().setAvatar({ emoji: '🦊', color: '#f97316', name: 'T', grade })
  const stage = zoneStages(getZone('tower-battlefront')!, grade)[0]
  const provider = createProvider(effectiveConfigForStage(stage, 0, grade))
  vi.useFakeTimers()
  act(() => root.render(<MathGate title="Buy Cannon for 25 🪙" provider={provider} onCorrect={() => {}} onCancel={() => {}} />))
  await act(async () => {
    await vi.advanceTimersByTimeAsync(10)
  })
  const m = /(\d+) × (\d+) = \?/.exec(container.textContent ?? '')
  expect(m, container.textContent ?? '').not.toBeNull()
  return { a: Number(m![1]), b: Number(m![2]), apples: (container.textContent ?? '').split('🍎').length - 1 }
}

describe('Tower Battlefront, grade 2', () => {
  it('the gate shows the fact as an array: one apple per product', async () => {
    const { a, b, apples } = await openGate(2)
    expect(Math.max(a, b)).toBeLessThanOrEqual(5)
    expect(apples).toBe(a * b)
  })

  it('3rd and 4th grade answer the fact with no array', async () => {
    for (const g of [3, 4] as const) {
      const { apples } = await openGate(g)
      expect(apples, `grade ${g}`).toBe(0)
      act(() => root.render(<></>))
      vi.useRealTimers()
    }
  })
})

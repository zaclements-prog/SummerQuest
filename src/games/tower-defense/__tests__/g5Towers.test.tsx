// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { getZone, zoneStages } from '../../../curriculum'
import { createProvider } from '../../../lib/providers'
import { effectiveConfigForStage } from '../../../lib/gradeTiers'
import { seededRng } from '../../../lib/random'
import type { Problem } from '../../../lib/problem'
import MathGate from '../MathGate'
import TowerDefense from '../TowerDefense'

/**
 * Tower Battlefront at 5th grade: the CLASSIC tower defense (not the K–1
 * Counting Towers), its rules untouched (classicEngine's golden traces), with
 * grade-5 gates: each tower is bought with a fraction or decimal question.
 */

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  vi.spyOn(Math, 'random').mockImplementation(seededRng('g5-towers'))
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

const g5Stage = () => zoneStages(getZone('tower-battlefront')!, 5)

describe('Tower Battlefront, grade 5', () => {
  it('one stage, the classic game (no listen mode), gated by the g5Gates questions', () => {
    expect(g5Stage().map((s) => [s.id, s.gameId, s.kind])).toEqual([['g5-td-1', 'towerDefense', 'mastery']])
    expect(g5Stage()[0].params?.listen).toBeUndefined()
    expect(effectiveConfigForStage(g5Stage()[0], 0, 5)).toEqual({ kind: 'g5Gates' })
    // grades 2–4 keep td-arena and its multiplication gates
    for (const g of [2, 3, 4] as const) expect(zoneStages(getZone('tower-battlefront')!, g).map((s) => [s.id, s.providerConfig.kind])).toEqual([['td-arena', 'multiplication']])
  })

  it('renders the classic board and shop', () => {
    const stage = g5Stage()[0]
    act(() => root.render(<TowerDefense provider={createProvider(stage.providerConfig)} params={stage.params} onComplete={() => {}} onExit={() => {}} />))
    expect(container.querySelector('svg[viewBox="0 0 720 420"]')).not.toBeNull()
    expect(container.textContent).toContain('Start Wave 1')
    expect(container.textContent).toContain('Wave 1/10')
    expect(container.querySelector('[data-listen-gate]')).toBeNull()
  })

  it("the math gate asks a grade-5 fraction or decimal question and buys on a right answer", async () => {
    const provider = createProvider({ kind: 'g5Gates' })
    const onCorrect = vi.fn()
    vi.useFakeTimers()
    act(() => root.render(<MathGate title="Buy Cannon for 25 🪙" provider={provider} onCorrect={onCorrect} onCancel={() => {}} />))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })
    const prompt = container.textContent ?? ''
    expect(prompt).toMatch(/\d+\/\d+|\d\.\d/)
    const btns = [...container.querySelectorAll<HTMLButtonElement>('button.choice')]
    expect(btns.length).toBeGreaterThanOrEqual(3)
    // the right button (its aria-label is the option)
    const fiber = (b: HTMLButtonElement) => {
      const k = Object.keys(b).find((x) => x.startsWith('__reactProps$'))!
      return (b as unknown as Record<string, { onClick: () => void }>)[k]
    }
    const answers = btns.map((b) => b.getAttribute('aria-label'))
    expect(answers.every((a) => a && a.length > 0)).toBe(true)
    // pick each in turn until the gate closes (a wrong pick loads a new question)
    for (let i = 0; i < 12 && !onCorrect.mock.calls.length; i++) {
      const b = container.querySelector<HTMLButtonElement>('button.choice:not([disabled])')
      if (b) act(() => fiber(b).onClick())
      await act(async () => {
        await vi.advanceTimersByTimeAsync(800)
      })
    }
    vi.useRealTimers()
    expect(onCorrect).toHaveBeenCalled()
  })

  it('gate questions are short enough for the gate card', () => {
    const p = createProvider({ kind: 'g5Gates' })
    for (let i = 0; i < 300; i++) expect((p.next() as Problem).prompt.length).toBeLessThanOrEqual(70)
  })
})

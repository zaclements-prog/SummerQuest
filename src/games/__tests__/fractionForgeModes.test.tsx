// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { seededRng } from '../../lib/random'
import { useProgress } from '../../store/progress'
import { createProvider } from '../../lib/providers'

/**
 * Fraction Forge's two modes, through the real component (the 3D canvas
 * stubbed out: its scene is presentational). Grades 2–4 (no `params.mode`)
 * open straight on the press with an equivalence order and no gauge; grade 5's
 * `mode: 'unlike'` orders `a/b + c/d` and asks for the slab size first.
 */

vi.mock('../../platform/gl/GLCanvas', () => ({ default: () => null }))

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

async function advance(ms: number) {
  for (let left = ms; left > 0; left -= 50) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(Math.min(50, left))
    })
  }
}

type ForgeHook = { state: () => Record<string, unknown>; pickGauge: (d: number) => void }
const hook = () => (window as unknown as { __sqForge: ForgeHook }).__sqForge
const text = () => container.textContent ?? ''

async function mount(params: Record<string, unknown>) {
  const { default: FractionForge } = await import('../FractionForge')
  act(() =>
    root.render(<FractionForge provider={createProvider({ kind: 'fractionEquivalence', maxDenominator: 12 })} params={params} onComplete={() => {}} onExit={() => {}} />),
  )
  await advance(2600) // the hook: the shop opens, the first customer comes in
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
  vi.spyOn(Math, 'random').mockImplementation(seededRng('forge-modes'))
  useProgress.getState().resetPlayer()
  useProgress.getState().setAvatar({ emoji: '🦊', color: '#f97316', name: 'T', grade: 3 })
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

describe('Fraction Forge modes', () => {
  it('grades 2–4: the classic equivalence order, straight to the press, no gauge', async () => {
    await mount({ rounds: 5 })
    const st = hook().state()
    expect(st.mode).toBe('equiv')
    expect(st.phase).toBe('build')
    expect(st.gauges).toBeNull()
    expect(container.querySelector('[data-forge-gauge]')).toBeNull()
    const r = st.round as { baseNum: number; baseDenom: number; targetDenom: number; parts?: unknown }
    expect(r.parts).toBeUndefined()
    expect(text()).toContain(`wants ${r.baseNum}/${r.baseDenom} of a bar!`)
    expect(text()).toContain(`Stamp 1/${r.targetDenom} slabs`)
    expect(text()).not.toContain('slab size')
  }, 30_000)

  it('grade 5: an a/b + c/d order; the gauge first (a wrong size is a miss), then the press in LCD slabs', async () => {
    await mount({ rounds: 5, mode: 'unlike' })
    let st = hook().state()
    expect(st.mode).toBe('unlike')
    expect(st.phase).toBe('gauge')
    const r = st.round as { targetDenom: number; parts: { num: number; denom: number }[] }
    const recipe = r.parts.map((q) => `${q.num}/${q.denom}`).join(' + ')
    expect(text()).toContain(`wants ${recipe} of a bar! Pick the slab size.`)
    expect(text()).toContain('Pick the slab size')
    const chips = [...container.querySelectorAll<HTMLButtonElement>('[data-forge-gauge] button')]
    expect(chips.map((b) => Number(b.dataset.gauge)).sort((a, b) => a - b)).toEqual([...(st.gauges as number[])].sort((a, b) => a - b))
    expect(chips).toHaveLength(3)

    // a wrong size: its ticks show, it counts against a clean first try, and the chips come back
    const answered = () => useProgress.getState().stats.problemsAnswered
    const before = answered()
    const wrong = chips.find((b) => Number(b.dataset.gauge) !== r.targetDenom)!
    act(() => wrong.click())
    expect(text()).toContain("slabs don't fit both parts")
    expect(answered()).toBe(before + 1)
    expect(hook().state().phase).toBe('gauge')
    await advance(1800)

    const right = [...container.querySelectorAll<HTMLButtonElement>('[data-forge-gauge] button')].find((b) => Number(b.dataset.gauge) === r.targetDenom)!
    act(() => right.click())
    st = hook().state()
    expect(st.phase).toBe('build')
    expect(container.querySelector('[data-forge-gauge]')).toBeNull()
    expect(text()).toContain(`Stamp 1/${r.targetDenom} slabs`)
    expect(text()).toContain('Yes!')
  }, 30_000)
})

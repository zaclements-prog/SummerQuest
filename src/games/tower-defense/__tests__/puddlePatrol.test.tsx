// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { seededRng } from '../../../lib/random'
import { useProgress } from '../../../store/progress'
import { createProvider } from '../../../lib/providers'
import type { ProviderConfig } from '../../../lib/providers'
import type { GameResult } from '../../../screens/GameRunner'
import type { RuleId } from '../../../lib/puddle'

/**
 * Puddle Patrol through the real component (the 3D canvas stubbed out: the
 * scene only draws the state). A child's moves go through the dev hook's real
 * handlers; the simulation runs through the same events the scene delivers.
 */

vi.mock('../../../platform/gl/GLCanvas', () => ({ default: () => null }))

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

interface PatrolHook {
  state: () => {
    phase: string
    wave: number
    waves: number
    towers: (RuleId | null)[]
    rules: RuleId[]
    drops: number
    intro: RuleId | null
    results: { stars: number } | null
    slotOrder: number[]
    maxTowers: number
    walking: { id: number; value: string }[]
  }
  place: (slot: number, r: RuleId) => string
  tapSlot: (slot: number) => void
  tapCard: (r: RuleId) => void
  tapPudding: (id: number) => void
  go: () => void
  closeIntro: () => void
  closeInfo: () => void
  advance: (s: number) => void
  collect: () => void
}

let container: HTMLDivElement
let root: Root
const hook = () => (window as unknown as { __sqPatrol: PatrolHook }).__sqPatrol
const text = () => container.textContent ?? ''

async function wait(ms: number) {
  for (let left = ms; left > 0; left -= 50) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(Math.min(50, left))
    })
  }
}

async function mount(cfg: ProviderConfig, params: Record<string, unknown>, grade: 0 | 1 | 2 | 3 | 4 | 5, onComplete: (r: GameResult) => void) {
  useProgress.getState().setAvatar({ emoji: '🦊', color: '#f97316', name: 'T', grade })
  const { default: PuddlePatrol } = await import('../PuddlePatrol')
  act(() =>
    root.render(<PuddlePatrol provider={createProvider(cfg)} params={params} onComplete={onComplete} onExit={() => {}} meta={{ zoneId: 'tower-battlefront', stageId: 'test' }} />),
  )
  await wait(1000)
}

/** Play the whole stage: each wave, a tower for every rule in the best slots, then Go. */
async function playThrough() {
  for (let guard = 0; guard < 40; guard++) {
    const s = hook().state()
    if (s.phase === 'done' || s.results) break
    if (s.intro) {
      act(() => hook().closeIntro())
      await wait(400)
      continue
    }
    for (let i = 0; i < s.maxTowers; i++) act(() => void hook().place(s.slotOrder[i], s.rules[i % s.rules.length]))
    act(() => hook().go())
    await act(async () => hook().advance(70))
    await wait(2000)
  }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
  vi.spyOn(Math, 'random').mockImplementation(seededRng('puddle-smoke'))
  useProgress.getState().resetPlayer()
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

describe('Puddle Patrol (the game)', () => {
  it('grades 2–4: the tray, the lineup, placing by tap (spot then card), and a whole stage to the results', async () => {
    const done = vi.fn()
    await mount({ kind: 'puddlePatrol', set: 'g24-evenOdd', grade: 3 }, { patrol: 'g24-evenOdd' }, 3, done)
    expect(text()).toContain('Even numbers')
    expect(text()).toContain('Odd numbers')
    expect(text()).toContain('Coming next: wave 1 of 7')
    // no Go until a sprinkler stands
    expect(container.querySelector('[data-guide="pp-go"]')).toBeNull()
    act(() => hook().tapSlot(hook().state().slotOrder[0]))
    act(() => hook().tapCard('even'))
    expect(hook().state().towers.filter(Boolean)).toEqual(['even'])
    await wait(100)
    expect(container.querySelector('[data-guide="pp-go"]')).not.toBeNull()
    // a swap is free
    const drops = hook().state().drops
    act(() => void hook().place(hook().state().slotOrder[0], 'odd'))
    expect(hook().state().drops).toBe(drops)
    await playThrough()
    await wait(3000)
    expect(hook().state().results).not.toBeNull()
    expect(text()).toContain('Pond clean')
    act(() => hook().collect())
    expect(done).toHaveBeenCalledTimes(1)
    const r = done.mock.calls[0][0] as GameResult
    expect(r.stars).toBeGreaterThanOrEqual(1)
    expect(r.total).toBeGreaterThan(0)
    // the coach heard about it: placements and waves, per skill
    const attempts = useProgress.getState().attempts
    expect(attempts.some((a) => a.skillId === 'mult-even-odd')).toBe(true)
  }, 60_000)

  it('a tapped Pudding shows how it fits each rule, and why not', async () => {
    await mount({ kind: 'puddlePatrol', set: 'g24-skip', grade: 3 }, { patrol: 'g24-skip' }, 3, () => {})
    act(() => void hook().place(hook().state().slotOrder[0], 'mult-2'))
    act(() => hook().go())
    await act(async () => hook().advance(3))
    await wait(100)
    const p = hook().state().walking[0]
    act(() => hook().tapPudding(p.id))
    await wait(100)
    expect(text()).toMatch(/is not a multiple of|× \d+ = /)
    expect(text()).toContain('Got it')
  }, 30_000)

  it('kindergarten: voice-first (no words on the cards), dot groups, a new sprinkler arrives, and it ends in stars', async () => {
    const done = vi.fn()
    await mount({ kind: 'kTowers', mode: 'count' }, { listen: true, patrol: 'k-count' }, 0, done)
    const st = hook().state()
    expect(st.rules).toEqual(['dots-2', 'dots-3'])
    expect(text()).not.toContain('Groups of')
    expect(container.querySelector('[data-guide="pp-card-0"]')).not.toBeNull()
    let sawIntro = false
    for (let guard = 0; guard < 20 && !done.mock.calls.length; guard++) {
      const s = hook().state()
      if (s.intro) {
        sawIntro = true
        act(() => hook().closeIntro())
        await wait(400)
        continue
      }
      if (s.phase === 'plan') {
        for (let i = 0; i < s.maxTowers; i++) act(() => void hook().place(s.slotOrder[i], s.rules[i % s.rules.length]))
        act(() => hook().go())
        await act(async () => hook().advance(60))
      }
      await wait(3000)
    }
    expect(sawIntro).toBe(true)
    await wait(15000)
    expect(done).toHaveBeenCalled()
    expect((done.mock.calls[0][0] as GameResult).stars).toBeGreaterThanOrEqual(1)
  }, 60_000)
})

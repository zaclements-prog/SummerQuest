// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useProgress } from '../../store/progress'
import { createProvider } from '../../lib/providers'
import { getGuideSnapshot, resetGuideForTests } from '../../guide/store'
import type { GradeLevel } from '../../lib/gradeTiers'
import type { Hooks, ShownGate, World } from '../CritterParade.scene'

/**
 * Critter Parade's follow-on levels through the real component. The 3D canvas
 * is a plain wrapper and the scene a stub that hands over the hooks the frame
 * loop would call, so the test steps a level to its tug-of-war and on to the
 * next level (or the rematch) without WebGL.
 */

let scene: { worldRef: { current: World | null }; hooksRef: { current: Hooks | null }; gates: ShownGate[] } | null = null
vi.mock('../../platform/gl/GLCanvas', () => ({ default: ({ children }: { children?: unknown }) => children ?? null }))
vi.mock('../CritterParade.scene', async (orig) => {
  const real = await orig<typeof import('../CritterParade.scene')>()
  return {
    ...real,
    ParadeScene: (props: NonNullable<typeof scene>) => {
      scene = props
      return null
    },
  }
})

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

async function wait(ms: number) {
  for (let left = ms; left > 0; left -= 50) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(Math.min(50, left))
    })
  }
}

interface ParadeHook {
  state: () => { phase: string; level: number; listen: boolean; levelEnd: { win: boolean } | null }
  next: () => void
  rematch: () => void
}
const hook = () => (window as unknown as { __sqParade: ParadeHook }).__sqParade

async function mount(grade: GradeLevel) {
  useProgress.getState().setAvatar({ emoji: '🦊', color: '#f97316', name: 'T', grade })
  const { default: CritterParade } = await import('../CritterParade')
  act(() =>
    root.render(<CritterParade provider={createProvider({ kind: 'multiplication', factorMin: 2, factorMax: 10 })} params={{ ops: grade <= 1 ? 'add' : 'mul' }} onComplete={() => {}} onExit={() => {}} meta={{ zoneId: 'multiplication-mesa', stageId: 'k-count-parade' }} />),
  )
  await wait(2200)
}

/** Skip the level's gates: the parade stops at the rope at its start count, so the Gang wins. */
async function loseLevel() {
  await act(async () => {
    scene!.hooksRef.current!.onFinaleStart()
  })
  await act(async () => {
    scene!.hooksRef.current!.onFinaleResult()
  })
  await wait(2400)
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-07-01T10:00:00Z'))
  vi.spyOn(Math, 'random').mockReturnValue(0.42)
  resetGuideForTests()
  scene = null
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  resetGuideForTests()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('Critter Parade, the next level', () => {
  for (const [name, go] of [
    ['Next parade', () => hook().next()],
    ['the rematch', () => hook().rematch()],
  ] as const) {
    it(`K–1: ${name} hushes the last level's end-of-parade lines (they never talk over the new level)`, async () => {
      await mount(0)
      expect(hook().state().listen).toBe(true)
      await loseLevel()
      expect(hook().state().phase).toBe('levelEnd')
      // the card's lines are said by the guide…
      expect(getGuideSnapshot().run).not.toBeNull()
      expect(getGuideSnapshot().speaking).toBe(true)
      await act(async () => go())
      // …and the new level starts quiet: nothing left to say, nothing to say again
      expect(getGuideSnapshot().run).toBeNull()
      expect(hook().state().phase).toBe('intro')
      await wait(6000)
      expect(getGuideSnapshot().run).toBeNull()
    }, 60000)
  }

  it('the rematch repaints its gates: the first pair gets the new attempt\'s colours like the rest', async () => {
    await mount(3)
    const first = () => scene!.gates[0]
    expect(first().pair).not.toBeNull()
    const before = { at: first().at, colors: first().colors }
    await loseLevel()
    expect(hook().state().levelEnd?.win).toBe(false)
    await act(async () => hook().rematch())
    // the same gate pair again (the same level), drawn for attempt 2
    expect(first().at).toBe(before.at)
    expect(first().colors).not.toEqual(before.colors)
  }, 60000)
})

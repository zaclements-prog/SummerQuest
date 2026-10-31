// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { seededRng } from '../../lib/random'
import { useProgress } from '../../store/progress'
import { createProvider } from '../../lib/providers'
import type { GameResult } from '../../screens/GameRunner'
import type { GobbleSetId } from '../../lib/gobble'
import type { GradeLevel } from '../../lib/gradeTiers'

/**
 * Gobble Garden through the real component (the 3D canvas stubbed out: no
 * frame loop runs, so the test steps the park through the dev hook's
 * `advance`, and steers through the same target a finger sets). A whole
 * session per band: eat, burp, three parks, the results, the stars; every
 * decision lands in the progress store under the zone's skill.
 */

vi.mock('../../platform/gl/GLCanvas', () => ({ default: () => null }))

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

interface Snack {
  slot: number
  x: number
  z: number
  text: string
  edible: boolean
}
interface GobbleHook {
  state: () => {
    phase: string
    set: string
    listen: boolean
    round: number
    cloud: { x: number; z: number; value: string }
    snacks: Snack[]
    eaten: number
    decisions: number
    right: number
    burp: { snack: string; cloud: string } | null
    parkEnd: { reason: string; eaten: number } | null
    results: { stars: number; score: number; right: number; total: number } | null
  }
  steer: (x: number, z: number) => void
  advance: (s: number) => void
  next: () => void
  collect: () => void
}
const hook = () => (window as unknown as { __sqGobble: GobbleHook }).__sqGobble
const text = () => container.textContent ?? ''

async function mount(set: GobbleSetId, grade: GradeLevel, onDone: (r: GameResult) => void) {
  useProgress.getState().setAvatar({ emoji: '🦊', color: '#f97316', name: 'T', grade })
  const { default: GobbleGarden } = await import('../GobbleGarden')
  act(() =>
    root.render(<GobbleGarden provider={createProvider({ kind: 'gobble', set })} params={{ seconds: 80 }} onComplete={onDone} onExit={() => {}} meta={{ zoneId: 'place-value-plateau', stageId: 'pv-gobble' }} />),
  )
  await wait(2600) // the park's intro
}

/** Steer at the nearest snack of a kind and step until it's eaten or bumped. */
async function go(edible: boolean) {
  const st = hook().state()
  const pool = st.snacks.filter((s) => s.edible === edible).sort((a, b) => Math.hypot(a.x - st.cloud.x, a.z - st.cloud.z) - Math.hypot(b.x - st.cloud.x, b.z - st.cloud.z))
  const t = pool[0]
  if (!t) return
  for (let i = 0; i < 30; i++) {
    act(() => {
      hook().steer(t.x, t.z)
      hook().advance(0.2)
    })
    const now = hook().state()
    // (a new decision: this one's eaten or bumped; the last burp's card may still be up)
    if (now.phase !== 'play' || !now.snacks.some((s) => s.slot === t.slot && s.text === t.text) || now.decisions > st.decisions) break
  }
  await wait(60)
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
  // the park's seed reads Date.now(): pin it, or each run lays out a different park
  vi.setSystemTime(new Date('2026-07-01T10:00:00'))
  vi.spyOn(Math, 'random').mockImplementation(seededRng('gobble-garden'))
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

describe('Gobble Garden', () => {
  it.each([
    ['whole', 3, 'pv-identify'],
    ['frac', 4, 'frac-cmp-'],
    ['dec', 5, 'g5-dec-compare'],
    ['fracDec', 5, 'g5-frac-compare'],
    ['g1', 1, 'g1-compare-2digit'],
    ['k', 0, 'k-compare-numbers'],
  ] as const)('%s (grade %s): eat, burp, three parks, results, stars; each decision filed under the skill', async (set, grade, skill) => {
    let result: GameResult | null = null
    await mount(set, grade, (r) => (result = r))
    let st = hook().state()
    expect(st.phase).toBe('play')
    expect(st.set).toBe(set)
    expect(st.listen).toBe(grade <= 1)
    // the cloud's number on the HUD
    expect(container.querySelector('[data-guide="gobble-number"]')?.textContent).toContain(st.cloud.value)

    // a too-big snack: a burp, the card shows both values
    await go(false)
    st = hook().state()
    expect(st.burp).not.toBeNull()
    expect(st.right).toBe(0)
    expect(st.decisions).toBe(1)
    const card = container.querySelector('[data-gobble-burp]')
    expect(card).not.toBeNull()
    expect(card!.textContent).toContain(st.burp!.cloud)
    if (grade >= 2) expect(text()).toContain('Too big, burp!')

    // three parks of eating (with the odd bump), each ending on a card the child moves on from
    for (let park = 0; park < 3; park++) {
      for (let k = 0; k < 80 && hook().state().phase === 'play'; k++) await go(k % 9 !== 8)
      st = hook().state()
      expect(st.phase, `park ${park}`).toBe('parkEnd')
      expect(container.querySelector('[data-gobble-park-end]')).not.toBeNull()
      // never automatic: it waits
      await wait(3000)
      expect(hook().state().phase).toBe('parkEnd')
      act(() => hook().next())
      await wait(2600)
    }
    st = hook().state()
    expect(st.phase).toBe('results')
    expect(st.results!.total).toBe(st.decisions)
    expect(st.results!.stars).toBeGreaterThanOrEqual(1)
    expect(st.results!.stars).toBeLessThanOrEqual(3)
    expect(container.querySelector(grade <= 1 ? '[data-gobble-results]' : '[data-guide="gobble-number"]')).not.toBeNull()

    // every decision reached the store, under the zone's skill
    const attempts = useProgress.getState().attempts.filter((a) => a.topic === 'gobble-garden')
    expect(attempts).toHaveLength(st.decisions)
    expect(attempts.every((a) => a.skillId.startsWith(skill))).toBe(true)
    expect(attempts.filter((a) => a.correct)).toHaveLength(st.right)

    act(() => hook().collect())
    expect(result).toEqual({ stars: st.results!.stars, score: st.results!.score, correct: st.right, total: st.decisions })
  }, 60_000)

  it('grades 2–5: the clock ends a park ("Time\'s up!") with what was eaten kept', async () => {
    await mount('whole', 4, () => {})
    await go(true)
    const eaten = hook().state().eaten
    expect(eaten).toBeGreaterThanOrEqual(1)
    act(() => hook().advance(85))
    await wait(100)
    const st = hook().state()
    expect(st.phase).toBe('parkEnd')
    expect(st.parkEnd!.reason).toBe('time')
    expect(st.eaten).toBe(eaten)
    expect(text()).toContain("Time's up!")
  }, 30_000)

  it('K–1: no clock (a park only ends when it is tidy)', async () => {
    await mount('k', 0, () => {})
    act(() => hook().advance(200))
    await wait(100)
    expect(hook().state().phase).toBe('play')
  }, 30_000)
})

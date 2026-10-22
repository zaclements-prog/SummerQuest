import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import GuideLayer from '../../../guide/GuideLayer'
import { getGuideSnapshot, resetGuideForTests } from '../../../guide/store'
import { makeKTowersProvider } from '../../../lib/providers/kTowers'
import { makeMultiplicationProvider } from '../../../lib/providers/multiplication'
import { seededRng } from '../../../lib/random'
import { useProgress } from '../../../store/progress'
import { expectTextBudget, visibleWords } from '../../../test/textBudget'
import type { GameResult } from '../../../screens/GameRunner'
import GameRunner from '../../../screens/GameRunner'
import type { ProblemProvider } from '../../../lib/problem'
import TowerDefense from '../TowerDefense'
import { createInitialState, startNextWave, tick } from '../engine'
import { K_HEARTS, K_MAX_LEVEL, K_SPOTS, K_SPOT_R, buildOnSpot, kRules, powerUpSpot, spotClearance, towerOnSpot } from '../kRules'
import { listenStars } from '../../listenPlay/script'

/**
 * Counting Towers (K–1) in the real Tower Battlefront shell: the stage's
 * `params.listen` picks it, the grades 2–4 game stays as it was. A spot asks
 * a spoken counting question in picture cards while the waves wait; a miss
 * gets "let's look again", a count-along and another try; the base never
 * falls (a wave that gets by just ends and is tried again); the stars are the
 * questions answered right first time. Nothing on screen to read.
 */

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const FAKE = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] as const

let container: HTMLDivElement
let root: Root

async function advance(ms: number) {
  for (let left = ms; left > 0; left -= 50) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(Math.min(50, left))
    })
  }
}
async function until(ok: () => boolean, ms = 30000) {
  for (let left = ms; left > 0 && !ok(); left -= 50) await advance(50)
  expect(ok()).toBe(true)
}

const q = (sel: string) => container.querySelector<HTMLElement>(sel)
const lines = () => getGuideSnapshot().run?.lines.map((l) => l.text) ?? []
const marks = () => getGuideSnapshot().run?.lines.flatMap((l) => l.marks.map((m) => m.target)) ?? []
const gate = () => q('[data-listen-gate]')
const gateCards = () => [...container.querySelectorAll<HTMLButtonElement>('[data-listen-gate] button[data-guide^="lp-card-"]')]
const rightCard = () => gateCards().find((c) => c.querySelector('[data-correct]'))!
const wrongCard = () => gateCards().find((c) => !c.querySelector('[data-correct]') && c.dataset.state !== 'tried')!
const spot = (i: number) => container.querySelector<SVGGElement>(`[data-guide="td-spot-${i}"]`)!
const tap = (el: Element) => act(() => void el.dispatchEvent(new MouseEvent('click', { bubbles: true })))
const towers = () => window.__sqTowers!.state()

declare global {
  interface Window {
    __sqTowers?: { state(): { progress: string; wave: number; waves: number; lives: number; setbacks: number; towers: number[]; canGo: boolean; over: boolean; won: boolean; asked: number; firstRight: number }; speed(k: number): void; clearTowers(): void }
  }
}

function mount(provider: ProblemProvider, params: Record<string, unknown>, onComplete: (r: GameResult) => void = () => {}) {
  act(() =>
    root.render(
      <>
        <GuideLayer />
        <TowerDefense provider={provider} params={params} onComplete={onComplete} onExit={() => {}} />
      </>,
    ),
  )
}

/** Answer the open question right (first try) and wait for the tower. */
async function answerRight() {
  await until(() => gate()?.getAttribute('data-phase') === 'ask')
  tap(rightCard())
  await until(() => !gate())
}

// (the K game is loaded on demand: load it before the clock is faked)
beforeAll(async () => {
  await import('../KTowers')
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: [...FAKE] })
  vi.spyOn(Math, 'random').mockImplementation(seededRng('k-towers'))
  resetGuideForTests()
  useProgress.setState({ stats: { ...useProgress.getState().stats, problemsAnswered: 0, problemsCorrect: 0 } })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  resetGuideForTests()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('Counting Towers (K–1)', { timeout: 60_000 }, () => {
  it('a K stage plays Counting Towers: nothing to read, and the voice points at a build spot', async () => {
    mount(makeKTowersProvider({ mode: 'count' }), { listen: true, waves: 3 })
    await until(() => !!q('[data-k-towers]'))
    await advance(700)
    expect(visibleWords(container)).toEqual([])
    expectTextBudget(container, 0)
    expect(container.querySelectorAll('[data-spot]')).toHaveLength(K_SPOTS.length)
    expect(lines()).toEqual(['Critters are coming! Tap a spot to build a tower.'])
    expect(marks()).toEqual(['td-spot-0'])
    // icons, not words: hearts, a critter per wave, no ▶ until there's a tower to defend with
    expect(q('[data-hearts]')!.getAttribute('data-hearts')).toBe(String(K_HEARTS))
    expect(q('[data-guide="td-go"]')).toBeNull()
    // and none of the grades 2–4 HUD
    expect(container.textContent).not.toMatch(/Wave|Cannon|Start/)
  })

  it('a spot asks a spoken counting question in picture cards; right builds a tower, and the ▶ comes after two', async () => {
    mount(makeKTowersProvider({ mode: 'count' }), { listen: true, waves: 3 })
    await until(() => !!q('[data-k-towers]'))
    await advance(700)
    tap(spot(0))
    await until(() => gate()?.getAttribute('data-phase') === 'ask')
    expect(gateCards()).toHaveLength(3)
    expect(lines()[0]).toMatch(/^How many (critters|towers|gems|rockets)\? Tap the number\.$/)
    expect(marks()).toEqual(['lp-picture', ['lp-card-0', 'lp-card-1', 'lp-card-2']])
    expectTextBudget(gate()!, 0)
    tap(rightCard())
    await until(() => !gate())
    expect(spot(0).getAttribute('data-level')).toBe('1')
    await advance(200)
    expect(lines()).toEqual(['Your tower is ready!'])
    await until(() => lines()[0] === 'Build one more tower!')
    expect(marks()).toEqual(['td-spot-1'])
    expect(q('[data-guide="td-go"]')).toBeNull()
    tap(spot(1))
    await answerRight()
    await until(() => lines()[0] === 'Ready? Tap the arrow to start!')
    expect(marks()).toEqual(['td-go'])
    expect(q('[data-guide="td-go"]')).not.toBeNull()
  })

  it('a miss: "let\'s look again", a count-along, another try (the tried card aside); never failing out', async () => {
    mount(makeKTowersProvider({ mode: 'count' }), { listen: true, waves: 3 })
    await until(() => !!q('[data-k-towers]'))
    await advance(700)
    tap(spot(2))
    await until(() => gate()?.getAttribute('data-phase') === 'ask')
    const answer = Number(rightCard().getAttribute('aria-label'))
    tap(wrongCard())
    await until(() => lines()[0] === "Hmm, let's look again.")
    await until(() => lines()[0] === "Let's count together.")
    await until(() => gate()?.getAttribute('data-phase') === 'ask', 30000)
    // every one was counted, lit one by one as its number was said
    expect(q('[data-listen-gate] [data-guide="lp-picture"]')!.querySelectorAll('[data-marked]')).toHaveLength(answer)
    expect(gateCards().filter((c) => c.dataset.state === 'tried')).toHaveLength(1)
    expect(spot(2).getAttribute('data-level')).toBe('0')
    // a second miss: still no failing out
    tap(wrongCard())
    await until(() => gate()?.getAttribute('data-phase') === 'oops')
    await until(() => gate()?.getAttribute('data-phase') === 'ask', 30000)
    tap(rightCard())
    await until(() => !gate())
    expect(spot(2).getAttribute('data-level')).toBe('1')
    expect(towers()).toMatchObject({ asked: 1, firstRight: 0 })
  })

  it('↩ closes the question without building; a tower at the top level just says so', async () => {
    mount(makeKTowersProvider({ mode: 'count' }), { listen: true, waves: 3 })
    await until(() => !!q('[data-k-towers]'))
    await advance(700)
    tap(spot(0))
    await until(() => gate()?.getAttribute('data-phase') === 'ask')
    tap(q('[data-guide="gate-close"]')!)
    await advance(100)
    expect(gate()).toBeNull()
    expect(spot(0).getAttribute('data-level')).toBe('0')
    // build, then power up twice: a tower grows to its top level and no further
    tap(spot(0))
    await answerRight()
    for (let level = 2; level <= K_MAX_LEVEL; level++) {
      tap(spot(0))
      await answerRight()
      expect(spot(0).getAttribute('data-level')).toBe(String(level))
      await until(() => lines()[0] === 'Your tower is stronger!')
    }
    tap(spot(0))
    await advance(100)
    expect(gate()).toBeNull()
    expect(lines()).toEqual(['This tower is super strong!'])
  })

  it('the waves wait while a question is open', async () => {
    mount(makeKTowersProvider({ mode: 'compare' }), { listen: true, waves: 3 })
    await until(() => !!q('[data-k-towers]'))
    await advance(700)
    for (const i of [0, 1]) {
      tap(spot(i))
      await answerRight()
    }
    await until(() => !!q('[data-guide="td-go"]'))
    tap(q('[data-guide="td-go"]')!)
    await advance(6000)
    expect(towers().progress).not.toBe('idle')
    tap(spot(3))
    await until(() => gate()?.getAttribute('data-phase') === 'ask')
    const board = () => container.querySelector('[data-board]')!.innerHTML
    const frozen = board()
    const st = towers()
    await advance(4000)
    expect(towers()).toEqual(st)
    expect(board()).toBe(frozen)
    tap(rightCard())
    await until(() => !gate())
    await advance(2000)
    expect(board()).not.toBe(frozen)
  })

  it('a whole stage: build, ▶, stop each wave, and the stars are the first-try answers (never 0)', async () => {
    let result: GameResult | null = null
    mount(makeKTowersProvider({ mode: 'count' }), { listen: true, waves: 3 }, (r) => (result = r))
    await until(() => !!q('[data-k-towers]'))
    await advance(700)
    window.__sqTowers!.speed(8)
    let built = 0
    let missed = false
    for (let guard = 0; guard < 400 && !result; guard++) {
      const st = towers()
      if (st.canGo && built >= 2 + st.wave) {
        tap(q('[data-guide="td-go"]')!)
        await advance(300)
        continue
      }
      if (!st.over && (st.progress === 'idle' || st.progress === 'between-waves')) {
        // build on the next free spot, or make the first tower that can grow stronger
        const i = st.towers.findIndex((l) => l === 0) >= 0 ? st.towers.findIndex((l) => l === 0) : st.towers.findIndex((l) => l < K_MAX_LEVEL)
        tap(spot(i))
        await until(() => gate()?.getAttribute('data-phase') === 'ask')
        if (!missed) {
          // one miss on the way (the stars count first tries)
          missed = true
          tap(wrongCard())
          await until(() => gate()?.getAttribute('data-phase') === 'ask', 30000)
        }
        tap(rightCard())
        await until(() => !gate())
        built++
        continue
      }
      await advance(500)
    }
    expect(result).not.toBeNull()
    const st = towers()
    expect(st).toMatchObject({ over: true, won: true, setbacks: 0 })
    expect(result!).toEqual({ stars: listenStars(st.firstRight, st.asked), score: st.firstRight * 10 + 60, correct: st.firstRight, total: st.asked })
    expect(result!.stars).toBe(2)
  })

  it('the critters that get by end the wave, never the game: the hearts come back, and it is tried again (easier)', async () => {
    mount(makeKTowersProvider({ mode: 'count' }), { listen: true, waves: 3 })
    await until(() => !!q('[data-k-towers]'))
    await advance(700)
    for (const i of [0, 1]) {
      tap(spot(i))
      await answerRight()
    }
    await until(() => !!q('[data-guide="td-go"]'))
    // (QA: the towers go, so the whole wave gets by)
    window.__sqTowers!.clearTowers()
    window.__sqTowers!.speed(8)
    tap(q('[data-guide="td-go"]')!)
    await until(() => towers().setbacks === 1, 40000)
    expect(towers()).toMatchObject({ over: false, wave: 0, lives: K_HEARTS, progress: 'between-waves' })
    await advance(300)
    expect(lines()).toEqual(["Oh no, some got by! Let's add a tower and try again."])
    // one new tower (or a stronger one) brings the ▶ back
    expect(q('[data-guide="td-go"]')).toBeNull()
    tap(spot(0))
    await answerRight()
    await until(() => !!q('[data-guide="td-go"]'))
  })
})

describe('Counting Towers rules (the engine with K rules)', () => {
  it('every build spot sits on the grass, clear of the path and of each other, and is a big target', () => {
    K_SPOTS.forEach((_, i) => expect(spotClearance(i), `spot ${i}`).toBeGreaterThan(K_SPOT_R + 23))
    for (let i = 0; i < K_SPOTS.length; i++)
      for (let j = i + 1; j < K_SPOTS.length; j++) expect(Math.hypot(K_SPOTS[i].x - K_SPOTS[j].x, K_SPOTS[i].y - K_SPOTS[j].y)).toBeGreaterThan(K_SPOT_R * 2.5)
    for (const p of K_SPOTS) {
      expect(p.x - K_SPOT_R).toBeGreaterThan(0)
      expect(p.y - K_SPOT_R).toBeGreaterThan(0)
      expect(p.x + K_SPOT_R).toBeLessThan(720)
      expect(p.y + K_SPOT_R).toBeLessThan(420)
    }
  })

  it('few, slow waves; no clock between them; a base that never falls, a wave tried again a little easier', () => {
    const rules = kRules(3)
    expect(rules.waves).toHaveLength(3)
    expect(kRules(4).waves).toHaveLength(4)
    expect(rules.speedScale).toBeLessThan(1)
    expect(rules.waves.every((w) => w.enemyCount <= 6)).toBe(true)
    const s = createInitialState(720, 420, rules)
    startNextWave(s)
    for (let f = 0; f < 20000 && s.setbacks === 0; f++) tick(s, 16)
    expect(s).toMatchObject({ isGameOver: false, hasWon: false, setbacks: 1, retries: 1, lives: K_HEARTS, wave: 0, waveProgress: 'between-waves' })
    expect(s.enemies).toHaveLength(0)
    // nothing starts on its own
    for (let f = 0; f < 2000; f++) tick(s, 16)
    expect(s.wave).toBe(0)
    // tried again: one critter fewer
    s.lives = K_HEARTS
    startNextWave(s)
    expect(s.waveTotal).toBe(rules.waves[0].enemyCount - 1)
    // and however often critters get by (no towers at all), it is never game over: each wave
    // eases until it passes, and the stage ends in a win
    for (let tries = 0; tries < 40 && !s.isGameOver; tries++) {
      for (let f = 0; f < 20000 && !s.isGameOver && s.waveProgress !== 'between-waves'; f++) tick(s, 16)
      expect(s.isGameOver && !s.hasWon).toBe(false)
      if (s.isGameOver) break
      s.lives = K_HEARTS // (KTowers fills the hearts at each ▶)
      startNextWave(s)
    }
    expect(s).toMatchObject({ isGameOver: true, hasWon: true })
  })

  it('towers are built and grow on their spots, up to the top level', () => {
    const s = createInitialState(720, 420, kRules(3))
    expect(buildOnSpot(s, 0)).toBe(true)
    expect(buildOnSpot(s, 0)).toBe(false)
    expect(powerUpSpot(s, 1)).toBe(false)
    expect(powerUpSpot(s, 0)).toBe(true)
    expect(powerUpSpot(s, 0)).toBe(true)
    expect(powerUpSpot(s, 0)).toBe(false)
    expect(towerOnSpot(s, 0)?.level).toBe(K_MAX_LEVEL)
    expect(rulesTower(1).range).toBeLessThan(rulesTower(3).range)
    expect(rulesTower(1).fireRateHz).toBeLessThan(rulesTower(3).fireRateHz)
  })
})

const rulesTower = (level: number) => kRules(3).tower('cannon', level)

describe('Tower Battlefront for grades 2–4: unchanged', { timeout: 60_000 }, () => {
  it('without `params.listen` it is the classic game: gold, waves of ten, the cannon shop, no voice', async () => {
    mount(makeMultiplicationProvider({ factorMin: 2, factorMax: 10 }), undefined as unknown as Record<string, unknown>)
    await advance(500)
    expect(q('[data-k-towers]')).toBeNull()
    expect(container.textContent).toContain('Wave 1/10')
    expect(container.textContent).toContain('Start Wave 1')
    expect(container.textContent).toContain('Cannon Tower')
    expect(container.textContent).toContain('75')
    expect(getGuideSnapshot().run).toBeNull()
  })
})

describe('Counting Towers through the stage runner', { timeout: 60_000 }, () => {
  it('k-towers-1 at grade K: the K game, then the results card with nothing to read; the stars are saved', async () => {
    useProgress.getState().resetPlayer()
    useProgress.setState({ player: { emoji: '🦁', color: '#fb923c', name: 'Leo', grade: 0 } })
    act(() =>
      root.render(
        <MemoryRouter initialEntries={['/play/tower-battlefront/k-towers-1']}>
          <GuideLayer />
          <Routes>
            <Route path="/play/:zoneId/:stageId" element={<GameRunner />} />
            <Route path="/zone/:zoneId" element={<div data-zone-page="" />} />
          </Routes>
        </MemoryRouter>,
      ),
    )
    await until(() => !!q('[data-k-towers]'))
    await advance(700)
    expectTextBudget(container, 0)
    window.__sqTowers!.speed(8)
    for (let guard = 0; guard < 400 && !q('[data-listen-result]'); guard++) {
      const st = towers()
      if (st.canGo) {
        tap(q('[data-guide="td-go"]')!)
        await advance(300)
      } else if (!st.over && (st.progress === 'idle' || st.progress === 'between-waves')) {
        const i = st.towers.findIndex((l) => l === 0) >= 0 ? st.towers.findIndex((l) => l === 0) : st.towers.findIndex((l) => l < K_MAX_LEVEL)
        tap(spot(i))
        await answerRight()
      } else await advance(500)
    }
    await until(() => !!q('[data-listen-result]'))
    expectTextBudget(container, 0)
    expect(useProgress.getState().zones['tower-battlefront']?.stages['k-towers-1']?.stars).toBe(3)
  })
})

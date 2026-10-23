// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { Problem, ProblemProvider } from '../../lib/problem'
import type { GameResult } from '../../screens/GameRunner'
import { useProgress } from '../../store/progress'
import ConceptPlay from '../ConceptPlay'
import BossBattle from '../BossBattle'
import SpeedRun, { MISS_REVIEW_MS } from '../SpeedRun'

/**
 * Wrong-answer feedback in the 2D stage games: the right answer and the
 * provider's hint stay on screen until "Got it →" (ConceptPlay, BossBattle), or
 * for a few seconds with the clock stopped (SpeedRun). Right answers still move
 * on by themselves.
 */

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

/** "n + 1 = ?" problems, answer n+1, with a hint. */
function provider(): ProblemProvider {
  let n = 0
  return {
    topic: 'test',
    next(): Problem {
      n += 1
      return { id: `q${n}`, prompt: `What is ${n} + 1?`, options: [n + 1, n + 2, n + 3, n + 4], answer: n + 1, topic: 'test', hint: `Count on one from ${n}.` }
    },
  }
}

async function advance(ms: number) {
  for (let left = ms; left > 0; left -= 50) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(Math.min(50, left))
    })
  }
}

const text = () => container.textContent ?? ''
const buttons = () => [...container.querySelectorAll('button')]
const answerButtons = () => buttons().filter((b) => /^\d+$/.test(b.textContent ?? ''))
const gotIt = () => container.querySelector<HTMLButtonElement>('[data-guide="miss-got-it"]')
function current(): number {
  const m = /What is (\d+) \+ 1\?/.exec(text())
  return Number(m?.[1])
}
async function answer(right: boolean) {
  const want = current() + (right ? 1 : 2)
  const btn = answerButtons().find((b) => b.textContent === String(want))!
  await act(async () => btn.click())
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
  useProgress.getState().resetPlayer()
  useProgress.getState().setAvatar({ emoji: '🦊', color: '#f97316', name: 'T', grade: 3 })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('ConceptPlay wrong-answer note', () => {
  it('keeps the right answer + hint up until "Got it", then moves on', async () => {
    const done = vi.fn()
    act(() => root.render(<ConceptPlay provider={provider()} params={{ questionCount: 3 }} onComplete={done} onExit={() => {}} />))
    await advance(100)
    expect(current()).toBe(1)
    await answer(false)
    await advance(10_000)
    expect(current()).toBe(1) // still here: no auto-advance on a miss
    expect(text()).toContain('The answer is 2.')
    expect(text()).toContain('Count on one from 1.')
    await act(async () => gotIt()!.click())
    await advance(100)
    expect(current()).toBe(2)
    expect(gotIt()).toBeNull()
  })

  it('a right answer still moves on by itself', async () => {
    act(() => root.render(<ConceptPlay provider={provider()} params={{ questionCount: 3 }} onComplete={() => {}} onExit={() => {}} />))
    await advance(100)
    await answer(true)
    expect(gotIt()).toBeNull()
    await advance(1200)
    expect(current()).toBe(2)
  })

  it('a miss on the last question finishes after "Got it" (once, even on a double tap)', async () => {
    const done = vi.fn<(r: GameResult) => void>()
    act(() => root.render(<ConceptPlay provider={provider()} params={{ questionCount: 1 }} onComplete={done} onExit={() => {}} />))
    await advance(100)
    await answer(false)
    await advance(5000)
    expect(done).not.toHaveBeenCalled()
    await act(async () => {
      gotIt()!.click()
      gotIt()!.click()
    })
    expect(done).toHaveBeenCalledTimes(1)
    expect(done.mock.calls[0][0]).toMatchObject({ correct: 0, total: 1 })
  })
})

describe('BossBattle wrong-answer note and counter', () => {
  it('shows the hint after a miss and waits for "Got it"; the counter names the question being answered', async () => {
    const done = vi.fn()
    act(() => root.render(<BossBattle provider={provider()} params={{ questionCount: 10 }} onComplete={done} onExit={() => {}} />))
    await advance(100)
    expect(text()).toContain('Question 1 · up to 10')
    await answer(true)
    // the answer is still showing: still question 1, not 2
    expect(text()).toContain('Question 1 · up to 10')
    await advance(1000)
    expect(text()).toContain('Question 2 · up to 10')
    await answer(false)
    expect(text()).toContain('Question 2 · up to 10')
    expect(text()).toContain('The answer is 3.')
    expect(text()).toContain('Count on one from 2.')
    await advance(10_000)
    expect(current()).toBe(2) // waits for the child
    await act(async () => gotIt()!.click())
    await advance(100)
    expect(current()).toBe(3)
    expect(text()).toContain('Question 3 · up to 10')
    expect(done).not.toHaveBeenCalled()
  })

  it('the last heart lost on a miss: the hint first, then the battle ends', async () => {
    const done = vi.fn<(r: GameResult) => void>()
    // 3 questions: 2 hits to win, 3 hearts
    act(() => root.render(<BossBattle provider={provider()} params={{ questionCount: 3 }} onComplete={done} onExit={() => {}} />))
    await advance(100)
    for (let i = 0; i < 3; i++) {
      await answer(false)
      await advance(1000)
      expect(gotIt()).not.toBeNull()
      await act(async () => gotIt()!.click())
      await advance(100)
    }
    expect(text()).toContain('Out of hearts!')
    await advance(1200)
    expect(done).toHaveBeenCalledTimes(1)
    expect(done.mock.calls[0][0]).toMatchObject({ correct: 0, total: 3 })
  })
})

describe('SpeedRun wrong-answer note', () => {
  it('shows the answer + hint for a few seconds with the clock stopped', async () => {
    act(() => root.render(<SpeedRun provider={provider()} params={{ timeLimitSec: 30 }} onComplete={() => {}} onExit={() => {}} />))
    await advance(100)
    await advance(2000)
    const clock = () => Number(/(\d+)s/.exec(text())?.[1])
    const before = clock()
    await answer(false)
    expect(text()).toContain('The answer is 2.')
    expect(text()).toContain('Count on one from 1.')
    await advance(MISS_REVIEW_MS - 200)
    expect(current()).toBe(1)
    expect(clock()).toBe(before) // reading the hint costs no time
    await advance(400)
    expect(current()).toBe(2)
    expect(text()).not.toContain('The answer is')
    await advance(2000)
    expect(clock()).toBeLessThan(before)
  })

  it('"Got it" moves on sooner', async () => {
    act(() => root.render(<SpeedRun provider={provider()} params={{ timeLimitSec: 30 }} onComplete={() => {}} onExit={() => {}} />))
    await advance(100)
    await answer(false)
    await act(async () => gotIt()!.click())
    await advance(50)
    expect(current()).toBe(2)
  })
})

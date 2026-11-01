// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Problem, ProblemProvider } from '../../lib/problem'
import { useProgress } from '../../store/progress'
import { makeG5ReadingProvider, G5_QUESTIONS_PER_PASSAGE } from '../../lib/providers/g5Reading'

/**
 * "↻ Play again" plays the stage from its first question: GameRunner keeps the
 * stage's provider but resets it, so a provider that plans a round (Reading
 * Reef's grade-5 passages, three questions each) starts a fresh round instead
 * of carrying on mid-round from where the last run stopped.
 */

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/** A round-shaped provider: "n + 1 = ?" counting up from 1, back to 1 on reset. */
const made: ProblemProvider[] = []
vi.mock('../../lib/providers', () => ({
  createProvider: () => {
    let n = 0
    const p: ProblemProvider = {
      topic: 'test',
      next(): Problem {
        n += 1
        return { id: `q${n}-${Math.random()}`, prompt: `What is ${n} + 1?`, options: [n + 1, n + 2, n + 3, n + 4], answer: n + 1, topic: 'test' }
      },
      reset() {
        n = 0
      },
    }
    made.push(p)
    return p
  },
}))

const { default: GameRunner } = await import('../GameRunner')

let container: HTMLDivElement
let root: Root

async function advance(ms: number) {
  for (let left = ms; left > 0; left -= 50) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(Math.min(50, left))
    })
  }
}
const text = () => container.textContent ?? ''
const current = () => Number(/What is (\d+) \+ 1\?/.exec(text())?.[1])
const button = (re: RegExp) => [...container.querySelectorAll('button')].find((b) => re.test(b.textContent ?? ''))

async function playRound(questions: number) {
  for (let i = 0; i < questions; i++) {
    const want = String(current() + 1)
    const btn = [...container.querySelectorAll('button')].find((b) => b.textContent === want)!
    await act(async () => btn.click())
    await advance(1300)
  }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
  made.length = 0
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

describe('GameRunner: Play again', () => {
  it('starts the round over from the first question, and counts the second run once', async () => {
    // Division Dunes' first grade-3 stage: ConceptPlay, 6 questions
    act(() =>
      root.render(
        <MemoryRouter initialEntries={['/play/division-dunes/div-concept']}>
          <Routes>
            <Route path="/play/:zoneId/:stageId" element={<GameRunner />} />
          </Routes>
        </MemoryRouter>,
      ),
    )
    await advance(100)
    expect(current()).toBe(1)
    await playRound(6)
    expect(button(/Play again/)).toBeTruthy()
    expect(useProgress.getState().sessions).toHaveLength(1)

    await act(async () => button(/Play again/)!.click())
    await advance(100)
    // the same provider, reset: question 1 again (it used to carry on at 7 + 1)
    expect(made).toHaveLength(1)
    expect(text()).toContain('Question 1 of 6')
    expect(current()).toBe(1)

    await playRound(6)
    expect(button(/Play again/)).toBeTruthy()
    expect(useProgress.getState().sessions).toHaveLength(2)
    expect(useProgress.getState().attempts).toHaveLength(12)
  })
})

describe('g5Reading reset', () => {
  it('a reset round opens on a new passage and asks three of its questions', () => {
    const rnd = vi.spyOn(Math, 'random')
    let seed = 7
    rnd.mockImplementation(() => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646)
    const p = makeG5ReadingProvider({ shelf: 'literature' })
    const title = () => (p.next() as Problem & { visual: { passageTitle: string } }).visual.passageTitle
    // a 5-question run: three on one passage, two on the next
    const run1 = Array.from({ length: 5 }, title)
    expect(run1[0]).toBe(run1[2])
    expect(run1[3]).not.toBe(run1[2])
    p.reset!()
    const run2 = Array.from({ length: G5_QUESTIONS_PER_PASSAGE }, title)
    // a whole passage (without the reset: the last one of the old passage, then two of the next)
    expect(new Set(run2).size).toBe(1)
    rnd.mockRestore()
  })
})

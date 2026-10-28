// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { Problem, ProblemProvider } from '../../lib/problem'
import type { GameResult } from '../../screens/GameRunner'
import { useProgress } from '../../store/progress'
import { timeWalkthrough } from '../../lib/providers/measurement'
import ConceptPlay from '../ConceptPlay'
import BossBattle from '../BossBattle'

/**
 * "💡 Show me how" in the 2D quiz games: it opens over the question, steps
 * through the worked example to "Your turn!", and closes back to the question
 * with a reminder strip. Opening it never counts as an answer or costs a
 * heart; a right answer afterwards is right, marked `helped`.
 */

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

/** "It is n:00…" elapsed-time problems with a real walkthrough (answer: n+2:30). */
function provider(): ProblemProvider {
  let n = 0
  return {
    topic: 'measurement',
    next(): Problem {
      n += 1
      const end = `${n + 2}:30`
      return {
        id: `q${n}`,
        prompt: `It is ${n}:00. What time will it be in 2 hours and 30 minutes?`,
        options: [end, `${n + 2}:35`, `${n + 3}:30`, `${n + 2}:20`],
        answer: end,
        topic: 'measurement-time',
        hint: 'Add 2 hours and 30 minutes.',
        skill: { id: 'meas-time', label: 'telling time' },
        showMe: timeWalkthrough(n * 60, 2, 30),
      }
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

const q = <T extends Element = HTMLButtonElement>(sel: string) => container.ownerDocument.querySelector<T>(sel)
const text = () => container.ownerDocument.body.textContent ?? ''
const showMeButton = () => q('[data-guide="show-me"]')
const panel = () => q<HTMLElement>('[data-show-me]')
const say = () => q('[data-show-me-say]')?.textContent
const answerButton = (label: string) => [...container.querySelectorAll('button')].find((b) => b.textContent === label)!
const hearts = () => q('[aria-label^="Your hearts"]')?.getAttribute('aria-label')

async function click(el: HTMLElement | null) {
  expect(el).not.toBeNull()
  await act(async () => el!.click())
  await advance(100)
}

/** Open "Show me how" and tap Next to the last step, then "Your turn!". */
async function watchToYourTurn() {
  await click(showMeButton())
  expect(panel()).not.toBeNull()
  expect(say()).toBe('We start at 1:00.')
  const lines = [say()]
  while (!q('[data-guide="show-me-your-turn"]')) {
    await click(q('[data-guide="show-me-next"]'))
    lines.push(say())
  }
  expect(lines).toEqual([
    'We start at 1:00.',
    'Jump 1 hour: 1:00 to 2:00.',
    'Jump 1 more hour: 2:00 to 3:00.',
    'Now the minutes: 30 more.',
    'So what time will it be? Your turn!',
  ])
  // the panel never shows the answer
  expect(panel()!.textContent).not.toContain('3:30')
  await click(q('[data-guide="show-me-your-turn"]'))
  expect(panel()).toBeNull()
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

const meta = { zoneId: 'measurement-marsh', stageId: 'meas-mastery' } as never

describe('ConceptPlay: Show me how', () => {
  it('walks through, hands back with a reminder strip, and a right answer counts (helped)', async () => {
    const done = vi.fn<(r: GameResult) => void>()
    act(() => root.render(<ConceptPlay provider={provider()} params={{ questionCount: 1 }} onComplete={done} onExit={() => {}} meta={meta} />))
    await advance(100)
    await watchToYourTurn()
    expect(q('[data-show-me-strip]')).not.toBeNull()
    expect(useProgress.getState().helpAsks['meas-time']).toMatchObject({ count: 1, label: 'telling time' })
    expect(useProgress.getState().attempts).toHaveLength(0) // opening it isn't an answer
    await click(answerButton('3:30'))
    await advance(1200)
    expect(done).toHaveBeenCalledTimes(1)
    expect(done.mock.calls[0][0]).toMatchObject({ correct: 1, total: 1, stars: 3 })
    expect(useProgress.getState().attempts).toMatchObject([{ skillId: 'meas-time', correct: true, helped: true }])
  })

  it('an answer without it is not marked helped', async () => {
    act(() => root.render(<ConceptPlay provider={provider()} params={{ questionCount: 2 }} onComplete={() => {}} onExit={() => {}} meta={meta} />))
    await advance(100)
    expect(showMeButton()).not.toBeNull()
    await click(answerButton('3:30'))
    expect(useProgress.getState().attempts[0].helped).toBeUndefined()
  })

  it('is offered on the wrong-answer note too', async () => {
    act(() => root.render(<ConceptPlay provider={provider()} params={{ questionCount: 2 }} onComplete={() => {}} onExit={() => {}} meta={meta} />))
    await advance(100)
    await click(answerButton('3:35'))
    expect(showMeButton()).toBeNull() // (the question's own button goes once answered)
    await click(q('[data-guide="miss-show-me"]'))
    expect(panel()).not.toBeNull()
    await click(q('button[aria-label="Back to the question"]'))
      expect(panel()).toBeNull()
    expect(q('[data-guide="miss-got-it"]')).not.toBeNull()
    expect(useProgress.getState().helpAsks['meas-time'].count).toBe(1)
  })

  it('questions without a walkthrough look exactly as before', async () => {
    const plain: ProblemProvider = { topic: 't', next: () => ({ id: 'p', prompt: 'What is 1 + 1?', options: [2, 3, 4, 5], answer: 2, topic: 't' }) }
    act(() => root.render(<ConceptPlay provider={plain} params={{ questionCount: 1 }} onComplete={() => {}} onExit={() => {}} />))
    await advance(100)
    expect(showMeButton()).toBeNull()
    await click(answerButton('3'))
    expect(q('[data-guide="miss-show-me"]')).toBeNull()
  })
})

describe('BossBattle: Show me how', () => {
  it('costs no heart and no question; the right answer afterwards is a hit, marked helped', async () => {
    act(() => root.render(<BossBattle provider={provider()} params={{ questionCount: 3 }} onComplete={() => {}} onExit={() => {}} meta={meta} />))
    await advance(100)
    const before = hearts()
    expect(text()).toContain('Question 1 · up to 3')
    await watchToYourTurn()
    expect(hearts()).toBe(before)
    expect(text()).toContain('Question 1 · up to 3')
    expect(text()).toContain('Boss HP2/2')
    await click(answerButton('3:30'))
    await advance(1000)
    expect(text()).toContain('Boss HP1/2')
    expect(hearts()).toBe(before)
    expect(useProgress.getState().attempts).toMatchObject([{ correct: true, helped: true }])
    // the next question starts fresh: its own button, no strip
    expect(text()).toContain('Question 2 · up to 3')
    expect(showMeButton()).not.toBeNull()
    expect(q('[data-show-me-strip]')).toBeNull()
  })

  it('answers are locked while the walkthrough is open', async () => {
    act(() => root.render(<BossBattle provider={provider()} params={{ questionCount: 3 }} onComplete={() => {}} onExit={() => {}} meta={meta} />))
    await advance(100)
    await click(showMeButton())
    await act(async () => answerButton('3:30').click())
    await advance(1000)
    expect(useProgress.getState().attempts).toHaveLength(0)
    expect(text()).toContain('Question 1 · up to 3')
  })
})

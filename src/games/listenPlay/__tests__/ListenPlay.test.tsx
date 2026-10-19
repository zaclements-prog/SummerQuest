import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import GuideLayer from '../../../guide/GuideLayer'
import { getGuideSnapshot, resetGuideForTests } from '../../../guide/store'
import { makeKCountingProvider } from '../../../lib/providers/kCounting'
import { seededRng } from '../../../lib/random'
import { useProgress } from '../../../store/progress'
import { expectTextBudget, visibleWords } from '../../../test/textBudget'
import type { GameResult } from '../../../screens/GameRunner'
import type { ProblemProvider } from '../../../lib/problem'
import ListenPlay from '../ListenPlay'
import { ListenResultCard } from '../ListenResultCard'
import type { ListenProblem } from '../types'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const FAKE = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] as const

let container: HTMLDivElement
let root: Root

/** Let time pass in small steps, each its own act(), so React renders and runs effects between them (as a browser would). */
async function advance(ms: number) {
  for (let left = ms; left > 0; left -= 50) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(Math.min(50, left))
    })
  }
}

const cards = () => [...container.querySelectorAll<HTMLButtonElement>('button[data-guide^="lp-card-"]')]
const rightCard = () => cards().find((c) => c.querySelector('[data-correct]'))!
const wrongCards = () => cards().filter((c) => !c.querySelector('[data-correct]') && c.dataset.state !== 'tried')

function mount(provider: ProblemProvider, onComplete: (r: GameResult) => void, count = 3) {
  act(() =>
    root.render(
      <>
        <GuideLayer />
        <ListenPlay provider={provider} params={{ questionCount: count }} onComplete={onComplete} onExit={() => {}} />
      </>,
    ),
  )
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: [...FAKE] })
  vi.spyOn(Math, 'random').mockImplementation(seededRng('listen-play'))
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

describe('Listen & Play', () => {
  it('shows a kindergartner no words to read (K budget: 0–2)', async () => {
    mount(makeKCountingProvider(), () => {})
    await advance(100)
    expect(cards()).toHaveLength(3)
    expectTextBudget(container, 2)
    expect(visibleWords(container)).toEqual([])
  })

  it('asks out loud and points: the picture first, then the cards', async () => {
    mount(makeKCountingProvider({ kinds: ['howMany'] }), () => {})
    await advance(50)
    const run = getGuideSnapshot().run!
    expect(run.lines[0].text).toMatch(/^How many \w+\? Tap the number\.$/)
    expect(run.lines[0].marks.map((m) => m.target)).toEqual(['lp-picture', ['lp-card-0', 'lp-card-1', 'lp-card-2']])
    expect(run.lines[0].marks[1].hand).toBe('sweep')
  })

  it('a wrong pick gets "let\'s look again", a count-along, and another try; it never fails out', async () => {
    let result: GameResult | null = null
    const provider = makeKCountingProvider({ kinds: ['howMany'] })
    mount(provider, (r) => (result = r))
    await advance(100)

    const answer = Number(rightCard().getAttribute('aria-label'))
    act(() => wrongCards()[0].click())
    await advance(1000)
    expect(getGuideSnapshot().run?.lines[0].text).toBe("Hmm, let's look again.")
    await advance(2000)
    // counting along: the apples light up one by one as their numbers are said
    expect(getGuideSnapshot().run?.lines.map((l) => l.text)[0]).toBe("Let's count together.")
    await advance(12000)
    const picture = container.querySelector('[data-guide="lp-picture"]')!
    expect(picture.querySelectorAll('[data-marked]')).toHaveLength(answer)
    // and back to the question, the tried card resting aside
    expect(cards().filter((c) => c.dataset.state === 'tried')).toHaveLength(1)
    expect(getGuideSnapshot().run?.lines[0].text).toMatch(/^How many/)

    // the other wrong card too: still no failing out
    act(() => wrongCards()[0].click())
    await advance(16000)
    expect(container.querySelector('[data-phase]')!.getAttribute('data-phase')).toBe('ask')
    expect(cards().filter((c) => c.dataset.state === 'tried')).toHaveLength(2)
    act(() => rightCard().click())
    await advance(3000)
    // on to question 2
    expect(container.querySelectorAll('[data-now]')).toHaveLength(1)

    for (let i = 0; i < 2; i++) {
      await advance(100)
      act(() => rightCard().click())
      await advance(4000)
    }
    expect(result).toEqual({ stars: 2, score: 20, correct: 2, total: 3 })
    // one answer recorded per question (the first pick), not per try
    expect(useProgress.getState().stats.problemsAnswered).toBe(3)
  })

  it('a wrong group is counted on its own card, then the question again', async () => {
    mount(makeKCountingProvider({ kinds: ['findGroup'] }), () => {})
    await advance(100)
    const wrong = wrongCards()[0]
    const count = Number(wrong.getAttribute('aria-label')!.split(' ')[0])
    act(() => wrong.click())
    await advance(4000)
    expect(wrong.dataset.state).toBe('look')
    await advance(12000)
    expect(wrong.querySelectorAll('[data-marked]')).toHaveLength(count)
    expect(wrong.querySelector('.lp-count-bubble')?.textContent).toBe(String(count))
  })

  it('stars are never 0', async () => {
    let result: GameResult | null = null
    mount(makeKCountingProvider(), (r) => (result = r), 3)
    for (let i = 0; i < 3; i++) {
      await advance(100)
      act(() => wrongCards()[0].click())
      await advance(16000)
      act(() => rightCard().click())
      await advance(4000)
    }
    expect(result).toMatchObject({ stars: 1, correct: 0, total: 3 })
  })

  it('hushes while "Quit?" is open and starts the question over after', async () => {
    const provider = makeKCountingProvider({ kinds: ['howMany'] })
    mount(provider, () => {})
    await advance(100)
    act(() =>
      root.render(
        <>
          <GuideLayer />
          <ListenPlay provider={provider} params={{ questionCount: 3 }} onComplete={() => {}} onExit={() => {}} paused />
        </>,
      ),
    )
    await advance(50)
    expect(getGuideSnapshot().run).toBeNull()
    act(() => rightCard().click()) // taps do nothing while paused
    expect(cards().some((c) => c.dataset.state === 'chosen')).toBe(false)
    mount(provider, () => {})
    await advance(50)
    expect(getGuideSnapshot().run?.lines[0].text).toMatch(/^How many/)
  })

  it('works with any provider: plain options become numeral cards', async () => {
    const q: ListenProblem = { id: 'x', prompt: '2 + 1', options: [3, 4], answer: 3, topic: 't' }
    mount({ topic: 't', next: () => q }, () => {})
    await advance(50)
    expect(cards().map((c) => c.getAttribute('aria-label'))).toEqual(['3', '4'])
  })
})

describe('the listen-mode results card', () => {
  it('has stars, ↺ and ▶, and no words', async () => {
    const replay = vi.fn()
    const next = vi.fn()
    act(() => root.render(<><GuideLayer /><ListenResultCard stars={2} coins={14} onReplay={replay} onNext={next} /></>))
    expectTextBudget(container, 0)
    await advance(800)
    expect(getGuideSnapshot().run?.lines[0].text).toBe('You got two stars! Tap the arrow to keep going.')
    expect(getGuideSnapshot().run?.lines[0].marks[0].target).toBe('lp-next')
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Next"]')!.click())
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Play again"]')!.click())
    expect(next).toHaveBeenCalledTimes(1)
    expect(replay).toHaveBeenCalledTimes(1)
  })
})

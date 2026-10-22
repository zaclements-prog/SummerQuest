import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import GuideLayer from '../../../guide/GuideLayer'
import { getGuideSnapshot, resetGuideForTests } from '../../../guide/store'
import { makeKScienceProvider, type KScienceMode } from '../../../lib/providers/kScience'
import { seededRng } from '../../../lib/random'
import { useProgress } from '../../../store/progress'
import { expectTextBudget, visibleWords } from '../../../test/textBudget'
import type { GameResult } from '../../../screens/GameRunner'
import ListenPlay from '../ListenPlay'
import { voiceText } from '../../../voice/registry'

/**
 * Nature Summit in the real Listen & Play shell: drawn and emoji picture
 * cards, each named as it lights up; a wrong pick hears a line about the card
 * it picked ("Mittens keep your hands warm in the snow."), then "Now you
 * try!", the card resting aside; never failing out. Nothing to read.
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

const cards = () => [...container.querySelectorAll<HTMLButtonElement>('button[data-guide^="lp-card-"]')]
const rightCard = () => cards().find((c) => c.querySelector('[data-correct]'))!
const wrongCard = () => cards().find((c) => !c.querySelector('[data-correct]') && c.dataset.state !== 'tried')!
const phase = () => container.querySelector('[data-listen-play]')!.getAttribute('data-phase')
const lines = () => getGuideSnapshot().run?.lines.map((l) => l.text) ?? []

function mount(mode: KScienceMode, count: number, onComplete: (r: GameResult) => void = () => {}) {
  act(() =>
    root.render(
      <>
        <GuideLayer />
        <ListenPlay provider={makeKScienceProvider({ mode })} params={{ questionCount: count }} onComplete={onComplete} onExit={() => {}} />
      </>,
    ),
  )
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: [...FAKE] })
  vi.spyOn(Math, 'random').mockImplementation(seededRng('k-science-items'))
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

describe('Nature Summit in Listen & Play', { timeout: 60_000 }, () => {
  it.each(['weather', 'needs', 'pushPull'] as KScienceMode[])('%s: every screen is pictures only, and every card is named as it lights up', async (mode) => {
    let result: GameResult | null = null
    mount(mode, mode === 'pushPull' ? 6 : 5, (r) => (result = r))
    for (let i = 0; i < 6 && !result; i++) {
      await until(() => phase() === 'ask' || !!result)
      if (result) break
      expect(visibleWords(container), `question ${i + 1}`).toEqual([])
      expectTextBudget(container, 0)
      // the question, then each card's name (its card lit), then the hand along them all
      const run = getGuideSnapshot().run!
      const names = cards().map((_, k) => run.lines.find((l) => l.marks.some((m) => m.target === `lp-card-${k}`) && l.voice)?.text)
      for (const n of names) expect(n).toMatch(/!$/)
      tap(rightCard())
      await until(() => phase() !== 'ask' && phase() !== 'judge')
    }
    await until(() => !!result)
    expect(result).toMatchObject({ stars: 3 })
  })

  it('a wrong pick: "let\'s look again", a word about that card, "Now you try!", and it rests aside', async () => {
    mount('weather', 5)
    // the third question asks what to wear
    for (let i = 0; i < 2; i++) {
      await until(() => phase() === 'ask')
      tap(rightCard())
      await until(() => phase() === 'loading' || (phase() === 'ask' && cards().every((c) => c.dataset.state === 'idle')))
    }
    await until(() => phase() === 'ask')
    await advance(200)
    const wrong = wrongCard()
    tap(wrong)
    await until(() => lines()[0] === "Hmm, let's look again.")
    const label = wrong.getAttribute('aria-label')!
    const note = voiceText({ line: `k-science/for-${label}` })
    await until(() => lines()[0] === note)
    await until(() => lines()[0] === 'Now you try!')
    await until(() => phase() === 'ask')
    expect(wrong.dataset.state).toBe('tried')
    tap(rightCard())
    await until(() => phase() === 'praise')
  })
})

function tap(el: Element) {
  act(() => void el.dispatchEvent(new MouseEvent('click', { bubbles: true })))
}

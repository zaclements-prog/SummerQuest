import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import GuideLayer from '../../../guide/GuideLayer'
import { getGuideSnapshot, resetGuideForTests } from '../../../guide/store'
import { getZone, zoneStages } from '../../../curriculum'
import { createProvider } from '../../../lib/providers'
import { seededRng } from '../../../lib/random'
import { useProgress } from '../../../store/progress'
import { expectTextBudget, visibleWords } from '../../../test/textBudget'
import type { ProblemProvider } from '../../../lib/problem'
import TowerDefense from '../TowerDefense'

/**
 * Counting Towers for 1st grade in the real Tower Battlefront shell: a
 * `g1-towers-*` stage plays the same K–1 tower game (its `params.listen`),
 * each tower built by a + or − question: the number sentence shown and said,
 * numeral cards; a miss hears the strategy and tries again, never failing out.
 * Only numbers and signs on screen.
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
const gate = () => q('[data-listen-gate]')
const gateCards = () => [...container.querySelectorAll<HTMLButtonElement>('[data-listen-gate] button[data-guide^="lp-card-"]')]
const rightCard = () => gateCards().find((c) => c.querySelector('[data-correct]'))!
const wrongCard = () => gateCards().find((c) => !c.querySelector('[data-correct]') && c.dataset.state !== 'tried')!
const spot = (i: number) => container.querySelector<SVGGElement>(`[data-guide="td-spot-${i}"]`)!
const tap = (el: Element) => act(() => void el.dispatchEvent(new MouseEvent('click', { bubbles: true })))

function mount(provider: ProblemProvider, params: Record<string, unknown>) {
  act(() =>
    root.render(
      <>
        <GuideLayer />
        <TowerDefense provider={provider} params={params} onComplete={() => {}} onExit={() => {}} />
      </>,
    ),
  )
}

beforeAll(async () => {
  await import('../KTowers')
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: [...FAKE] })
  vi.spyOn(Math, 'random').mockImplementation(seededRng('g1-towers'))
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

describe('Counting Towers, 1st grade', { timeout: 60_000 }, () => {
  const stages = zoneStages(getZone('tower-battlefront')!, 1)

  it.each(stages.map((s) => [s.id, s] as const))('%s: a spot asks a number sentence out loud, with numeral cards; right builds the tower', async (_id, stage) => {
    mount(createProvider(stage.providerConfig), stage.params!)
    await until(() => !!q('[data-k-towers]'))
    await advance(700)
    expectTextBudget(container, 0)
    tap(spot(0))
    await until(() => gate()?.getAttribute('data-phase') === 'ask')
    expect(lines()[0]).toMatch(/^[A-Z][a-z-]+ (plus|minus) [a-z-]+\. Tap the answer\.$/)
    // the number sentence in the picture panel, numeral cards: numbers and signs only
    const sentence = q('[data-listen-gate] [data-guide="lp-picture"]')!.textContent!
    expect(sentence).toMatch(/^\d+ [+−] \d+$/)
    expect(visibleWords(gate()!)).toEqual([])
    expect(gateCards()).toHaveLength(3)
    tap(rightCard())
    await until(() => !gate())
    expect(spot(0).getAttribute('data-level')).toBe('1')
  })

  it('a miss hears the strategy (count on, count back or count up), then tries again; never failing out', async () => {
    const stage = stages[0]
    mount(createProvider(stage.providerConfig), stage.params!)
    await until(() => !!q('[data-k-towers]'))
    await advance(700)
    tap(spot(1))
    await until(() => gate()?.getAttribute('data-phase') === 'ask')
    // no counters until a miss; then they stay with the question (a picture, not just words)
    expect(q('[data-listen-gate] [data-help-picture]')).toBeNull()
    tap(wrongCard())
    await until(() => !!q('[data-listen-gate] [data-help-picture] svg'))
    await until(() => lines()[0] === "Hmm, let's look again.")
    await until(() => /^(Start at|Count up from) /.test(lines()[0] ?? ''))
    await until(() => gate()?.getAttribute('data-phase') === 'ask', 30000)
    expect(gateCards().filter((c) => c.dataset.state === 'tried')).toHaveLength(1)
    tap(rightCard())
    await until(() => !gate())
    expect(spot(1).getAttribute('data-level')).toBe('1')
  })
})

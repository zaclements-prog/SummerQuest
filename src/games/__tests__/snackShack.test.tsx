// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { GameResult } from '../../screens/GameRunner'
import { useProgress } from '../../store/progress'
import { makeSnackShackProvider, type ShiftPlan } from '../../lib/providers/snackShack'
import { fewestPieces, type Denom } from '../../lib/shack/money'
import { wrapTime } from '../../lib/shack/clock'
import { resetGuideForTests } from '../../guide/store'
import { seededRng } from '../../lib/random'
import SnackShack from '../SnackShack'

/**
 * Snack Shack, rendered: a shift is played through the real buttons (the
 * bins, the bell, the cash drawer, the clock's keys), misses teach and come
 * back, every graded step reaches the progress store under the zone's skills,
 * and the shift ends on its results with stars.
 */

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

interface Live {
  plan: ShiftPlan
  oi: number
  step: string
  misses: number
}
const live = () => (window as unknown as { __snackShack: Live }).__snackShack

async function advance(ms: number) {
  for (let left = ms; left > 0; left -= 50) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(Math.min(50, left))
    })
  }
}
const q = <T extends Element = HTMLButtonElement>(sel: string) => document.querySelector<T>(sel)
const qa = (sel: string) => [...document.querySelectorAll<HTMLButtonElement>(sel)]
async function click(el: Element | null | undefined) {
  expect(el, 'button to click').toBeTruthy()
  await act(async () => (el as HTMLElement).click())
  await advance(60)
}
/** The drawer and tray pieces answer to pointer events (drag or tap): a tap is down then up. */
async function tapPiece(el: Element | null) {
  expect(el).toBeTruthy()
  const ev = (type: string) => Object.assign(new MouseEvent(type, { bubbles: true, clientX: 5, clientY: 5 }), { pointerId: 1 })
  await act(async () => {
    el!.dispatchEvent(ev('pointerdown'))
  })
  await act(async () => {
    window.dispatchEvent(ev('pointerup'))
  })
  await advance(60)
}
async function key(el: Element | null, k: string) {
  await act(async () => {
    el!.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
  })
}

/** Play the current step right (or, `wrong`: one snack too many on the tray first). */
async function playStep(wrong = false) {
  const { plan, oi, step } = live()
  const o = plan.orders[oi]
  if (step === 'fill' && o.kind !== 'elapsed') {
    for (const l of o.lines) for (let i = 0; i < l.qty + (wrong ? 1 : 0); i++) await click(q(`[data-bin="${l.food.id}"]`))
    await click(q('[data-guide="shack-bell"]'))
    if (wrong) {
      for (const l of o.lines) await click(q(`[aria-label="Take back ${l.food.one}"]`))
      await click(q('[data-guide="shack-bell"]'))
    }
  } else if (step === 'count' && o.kind === 'count') {
    await click(q(`[data-choice="${o.lines.reduce((s, l) => s + l.qty, 0)}"]`))
  } else if (step === 'total' && o.kind === 'money') {
    await click(q(`[data-choice="${o.total}"]`))
  } else if (step === 'change' && o.kind === 'money') {
    const pieces = fewestPieces(o.change, plan.drawer)
    for (const [d, n] of Object.entries(pieces) as [Denom, number][]) for (let i = 0; i < n; i++) await tapPiece(q(`[data-denom="${d}"]`))
    await click(q('[aria-label="Give the change"]'))
  } else if (step === 'clock' && (o.kind === 'elapsed' || o.kind === 'clockAt')) {
    const clock = q('[data-guide="shack-clock"]')
    const target = o.kind === 'elapsed' ? o.end : o.time
    let diff = wrapTime(target - Number(clock!.getAttribute('aria-valuenow')), plan.clockSpan)
    while (diff >= 60) {
      await key(clock, 'PageUp')
      diff -= 60
    }
    while (diff > 0) {
      await key(clock, 'ArrowRight')
      diff -= plan.clockStep
    }
    await click(q('[data-guide="shack-clock-done"]'))
  }
  await advance(1500)
}

async function playShift(done: ReturnType<typeof vi.fn>) {
  for (let guard = 0; guard < 80 && live().step !== 'results'; guard++) {
    const s = live().step
    if (s === 'decor') await click(q('[data-decor]'))
    else if (s === 'thanks') await advance(500)
    else await playStep()
  }
  expect(live().step).toBe('results')
  await advance(3000)
  await click(q('[data-guide="shack-collect"]') ?? qa('button').find((b) => b.textContent?.includes('Collect')))
  expect(done).toHaveBeenCalledTimes(1)
}

function render(grade: number, stageId: string, zoneId = 'measurement-marsh') {
  useProgress.getState().setAvatar({ emoji: '🦊', color: '#f97316', name: 'T', grade: grade as never })
  const done = vi.fn<(r: GameResult) => void>()
  act(() =>
    root.render(<SnackShack provider={makeSnackShackProvider()} params={{ customers: 6 }} onComplete={done} onExit={() => {}} meta={{ zoneId, stageId }} />),
  )
  return done
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
  // the same shift every run
  vi.spyOn(Math, 'random').mockImplementation(seededRng('snack-shack-test'))
  useProgress.getState().resetPlayer()
  resetGuideForTests()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('Snack Shack', () => {
  it('3rd grade: a whole shift of orders, change and Clock Tower times, every step reported', async () => {
    const done = render(3, 'meas-shack')
    await advance(600)
    expect(q('[data-snack-shack]')!.getAttribute('data-band')).toBe('g24')
    // the first customer: one snack, its price on the bin
    expect(qa('[data-bin]').length).toBe(5)
    await playShift(done)
    const r = done.mock.calls[0][0] as GameResult
    expect(r).toMatchObject({ stars: 3, correct: r.total })
    const attempts = useProgress.getState().attempts
    expect(attempts.length).toBe(r.total)
    expect(new Set(attempts.map((a) => a.skillId))).toEqual(new Set(['meas-money', 'meas-time']))
    expect(attempts.every((a) => a.correct && a.zoneId === 'measurement-marsh' && a.topic === 'snack-shack')).toBe(true)
  }, 30000)

  it('a wrong change teaches with the count-up, then the child tries again (counted wrong once)', async () => {
    render(4, 'meas-shack')
    await advance(600)
    await playStep() // fill
    if (live().step === 'total') await playStep()
    expect(live().step).toBe('change')
    // give one quarter too much
    const { plan, oi } = live()
    const o = plan.orders[oi]
    if (o.kind !== 'money') throw new Error('money first')
    for (const [d, n] of Object.entries(fewestPieces(o.change, plan.drawer)) as [Denom, number][]) for (let i = 0; i < n; i++) await tapPiece(q(`[data-denom="${d}"]`))
    await tapPiece(q('[data-denom="quarter"]'))
    await click(q('[aria-label="Give the change"]'))
    expect(q('[data-teach="change"]')).not.toBeNull()
    expect(document.body.textContent).toContain('Count up from')
    expect(useProgress.getState().attempts.at(-1)).toMatchObject({ skillId: 'meas-money', correct: false })
    // put a quarter back: right now (a retry, not reported again)
    await tapPiece(q('[aria-label="Put back a quarter"]'))
    await click(q('[aria-label="Give the change"]'))
    await advance(800)
    expect(['thanks', 'decor', 'clock']).toContain(live().step)
    expect(useProgress.getState().attempts.filter((a) => a.skillId === 'meas-money')).toHaveLength(1 + (o.askTotal ? 1 : 0))
  }, 30000)

  it('a Clock Tower miss shows the jumps on a timeline; a second miss shows the answer', async () => {
    render(5, 'g5-measure-shack')
    await advance(600)
    for (let g = 0; g < 30 && live().step !== 'clock'; g++) {
      if (live().step === 'decor') await click(q('[data-decor]'))
      else await playStep()
    }
    await click(q('[data-guide="shack-clock-done"]')) // the start time: wrong
    expect(q('[data-teach="clock"]')).not.toBeNull()
    await click(q('[data-guide="shack-clock-done"]')) // still wrong
    expect(document.body.textContent).toContain('It ends at')
    await click([...document.querySelectorAll('button')].find((b) => b.textContent === 'Got it →'))
    await advance(2500)
    expect(useProgress.getState().attempts.find((a) => a.skillId === 'g5-convert')).toMatchObject({ correct: false })
  }, 30000)

  it('kindergarten: count the snacks onto the tray, how many in all, a wrong tray numbers the snacks', async () => {
    const done = render(0, 'k-addsub-shack', 'fraction-falls')
    await advance(600)
    expect(q('[data-snack-shack]')!.getAttribute('data-band')).toBe('k1')
    // one too many on the tray: the snacks are numbered, then it's fixed and served
    await playStep(true)
    expect(useProgress.getState().attempts[0]).toMatchObject({ skillId: 'k-add-take', correct: false })
    await playShift(done)
    expect(done.mock.calls[0][0].stars).toBeGreaterThanOrEqual(2)
    expect(useProgress.getState().attempts.every((a) => a.skillId === 'k-add-take')).toBe(true)
  }, 30000)

  it('1st grade: fill, then set the pick-up clock to the hour', async () => {
    const done = render(1, 'g1-measure-shack')
    await advance(600)
    expect(q('[data-snack-shack]')!.getAttribute('data-band')).toBe('g1')
    await playShift(done)
    expect(done.mock.calls[0][0]).toMatchObject({ stars: 3, total: 6, correct: 6 })
    expect(useProgress.getState().attempts.every((a) => a.skillId === 'g1-time')).toBe(true)
  }, 30000)
})

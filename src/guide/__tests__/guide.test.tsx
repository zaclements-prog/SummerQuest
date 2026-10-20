import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import GuideLayer from '../GuideLayer'
import { buildLines, getGuideSnapshot, guide, registerGuideTarget, resetGuideForTests, resolveTarget } from '../store'
import { SayAgainButton } from '../SayAgainButton'
import { useIdleReprompt } from '../useIdleReprompt'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

const FAKE = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] as const

/** A target element at a fixed place on screen (jsdom has no layout). */
function target(id: string, rect = { left: 200, top: 150, width: 240, height: 120 }) {
  const el = document.createElement('button')
  el.setAttribute('data-guide', id)
  el.getBoundingClientRect = () => ({ ...rect, x: rect.left, y: rect.top, right: rect.left + rect.width, bottom: rect.top + rect.height, toJSON: () => ({}) }) as DOMRect
  document.body.appendChild(el)
  return el
}

const spot = () => document.querySelector<HTMLElement>('.gl-spot')!
const ring = () => document.querySelector<HTMLElement>('.gl-ring')!
const hand = () => document.querySelector<HTMLElement>('.gl-hand')!
const on = (el: HTMLElement) => el.hasAttribute('data-on')

/** Let time pass in small steps, each its own act(), so React renders and runs effects between them (as a browser would). */
async function advance(ms: number) {
  for (let left = ms; left > 0; left -= 50) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(Math.min(50, left))
    })
  }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: [...FAKE] })
  resetGuideForTests()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<GuideLayer />))
})

afterEach(() => {
  act(() => root.unmount())
  resetGuideForTests()
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('guide lines', () => {
  it('groups steps into lines: no voice = another target on the same line', () => {
    const lines = buildLines([
      { voice: { line: 'k-math/greatCounting' }, target: 'a' },
      { target: ['b', 'c'], cue: 'counting' },
      { voice: { line: 'ui/greatJob' } },
    ])
    expect(lines).toHaveLength(2)
    expect(lines[0].marks.map((m) => m.target)).toEqual(['a', ['b', 'c']])
    expect(lines[0].marks.map((m) => m.hand)).toEqual(['tap', 'sweep'])
    expect(lines[1].text).toBe('Great job!')
    expect(lines[1].marks).toEqual([])
  })

  it('drops a voice line it cannot find instead of crashing the app shell', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const lines = buildLines([{ voice: { line: 'ui/noSuchLine' }, target: 'a' }])
    expect(lines[0].voice).toBeNull()
    expect(lines[0].marks).toHaveLength(1)
    err.mockRestore()
  })
})

describe('guide overlay', () => {
  it('spotlights the target on its cued phrase, then the next one, and never takes taps', async () => {
    target('picture', { left: 20, top: 100, width: 300, height: 260 })
    target('cards', { left: 400, top: 140, width: 500, height: 170 })
    const done = vi.fn()
    // "How many apples? Tap the number." — picture from the start, cards on "Tap"
    void guide
      .sequence([
        { voice: { template: 'k-math/howMany', slots: { thing: 'apples' } }, target: 'picture', hand: false },
        { target: 'cards', cue: 'Tap', hand: 'sweep' },
      ])
      .then(done)
    await advance(300)
    expect(on(spot())).toBe(true)
    expect(spot().style.width).toBe(`${300 + 20}px`)
    expect(on(hand())).toBe(false)
    // the overlay is a tap-through layer
    expect(getComputedStyle(document.querySelector('.gl-root')!).pointerEvents).toBe('none')

    await advance(1200) // past "Tap" (char 17 of 33 at 14 chars/s ≈ 1.2 s)
    expect(spot().style.transform).toBe('translate3d(390px, 130px, 0)')
    expect(on(hand())).toBe(true)
    expect(hand().dataset.mode).toBe('sweep')
    expect(done).not.toHaveBeenCalled()

    await advance(1600) // the line ends: the promise settles, the pointing stays
    expect(done).toHaveBeenCalledWith(true)
    expect(getGuideSnapshot().speaking).toBe(false)
    expect(on(hand())).toBe(true)
    expect(on(ring())).toBe(true)

    await advance(1200) // the dim lifts a moment after the line
    expect(on(spot())).toBe(false)
    expect(on(hand())).toBe(true)
  })

  it('fires events as the voice reaches them, and all of them by the end', async () => {
    target('group')
    const seen: number[] = []
    void guide.sequence([{ voice: { line: 'listen/count3' }, target: 'group', events: [0, 5, 10].map((char, i) => ({ char, run: () => seen.push(i) })) }])
    await advance(100)
    expect(seen).toEqual([0])
    await advance(400)
    expect(seen).toEqual([0, 1])
    await advance(2000)
    expect(seen).toEqual([0, 1, 2])
  })

  it('a new call takes over: the old promise settles false', async () => {
    const first = guide.say({ line: 'ui/greatJob' })
    await advance(50)
    const second = guide.say({ line: 'listen/youDidIt' })
    await expect(first).resolves.toBe(false)
    await advance(3000)
    await expect(second).resolves.toBe(true)
  })

  it('follows the target when it moves (resize, rotation)', async () => {
    const el = target('t', { left: 100, top: 100, width: 100, height: 100 })
    void guide.show({ voice: null, target: 't' })
    await advance(100)
    expect(ring().style.transform).toBe('translate3d(86px, 86px, 0)')
    el.getBoundingClientRect = () => ({ left: 500, top: 300, width: 100, height: 100, x: 500, y: 300, right: 600, bottom: 400, toJSON: () => ({}) }) as DOMRect
    window.dispatchEvent(new Event('resize'))
    await advance(50)
    expect(ring().style.transform).toBe('translate3d(486px, 286px, 0)')
  })

  it('says it again: replays the last guided line, not a card label', async () => {
    target('a')
    await act(async () => {
      void guide.show({ voice: { line: 'ui/tapToStart' }, target: 'a', cue: 'the star' })
    })
    await advance(3000)
    void guide.say({ line: 'listen/youDidIt' })
    await advance(2000)
    act(() => root.render(<><GuideLayer /><SayAgainButton /></>))
    act(() => document.querySelector<HTMLButtonElement>('[data-guide="say-again"]')!.click())
    await advance(10)
    expect(getGuideSnapshot().run?.lines[0].text).toBe('Tap the star to start!')
    expect(getGuideSnapshot().speaking).toBe(true)
  })

  it('clears on a new screen (resetKey), and forgets what to say again', async () => {
    void guide.show({ voice: { line: 'ui/greatJob' } })
    await advance(10)
    act(() => root.render(<GuideLayer resetKey="/next" />))
    expect(getGuideSnapshot().run).toBeNull()
    expect(guide.canReplay()).toBe(false)
  })

  it('resolves 3D anchors and DOM ids alike', () => {
    target('dom', { left: 10, top: 10, width: 50, height: 50 })
    const off = registerGuideTarget('pad', () => ({ left: 300, top: 200, width: 96, height: 96 }) as DOMRect)
    expect(resolveTarget('pad')).toEqual({ x: 300, y: 200, w: 96, h: 96 })
    expect(resolveTarget(['dom', 'pad'])).toEqual({ x: 10, y: 10, w: 386, h: 286 })
    off()
    expect(resolveTarget('pad')).toBeNull()
  })
})

function Idle({ k, onIdle }: { k: string; onIdle: () => void }) {
  useIdleReprompt({ key: k, onIdle })
  return null
}

describe('idle re-prompt', () => {
  it('after 8 s with no touch it fires once, then stops nagging; a touch restarts the wait', async () => {
    const onIdle = vi.fn()
    act(() => root.render(<><GuideLayer /><Idle k="q1" onIdle={onIdle} /></>))
    await advance(7000)
    window.dispatchEvent(new Event('pointerdown'))
    await advance(7000)
    expect(onIdle).not.toHaveBeenCalled()
    await advance(1500)
    expect(onIdle).toHaveBeenCalledTimes(1)
    await advance(30000)
    expect(onIdle).toHaveBeenCalledTimes(1)
    // a new question: one more chance
    act(() => root.render(<><GuideLayer /><Idle k="q2" onIdle={onIdle} /></>))
    await advance(8100)
    expect(onIdle).toHaveBeenCalledTimes(2)
  })

  it('does not count while the narrator is talking', async () => {
    const onIdle = vi.fn()
    act(() => root.render(<><GuideLayer /><Idle k="q" onIdle={onIdle} /></>))
    void guide.sequence([{ voice: { line: 'listen/count20' } }]) // ~11 s of counting
    await advance(9000)
    expect(onIdle).not.toHaveBeenCalled()
    await advance(12000)
    expect(onIdle).toHaveBeenCalledTimes(1)
  })
})

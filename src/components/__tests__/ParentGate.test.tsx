import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, createElement as h } from 'react'
import type { ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ParentGate, { RequireParent } from '../ParentGate'
import AppShell from '../AppShell'
import { GATE_LOCK_MS, GATE_PASS_MS } from '../../lib/parentGate'
import { parentGateOpen, resetParentGateForTests } from '../../lib/parentGateSession'
import { useProgress } from '../../store/progress'

// React's act() warns unless this flag is set in non-RTL environments.
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

function render(ui: ReactNode) {
  act(() => root.render(ui))
}

const text = () => container.textContent ?? ''
const input = () => container.querySelector<HTMLInputElement>('input')
const submitButton = () => container.querySelector<HTMLButtonElement>('button[type="submit"]')

/** The product the gate is asking for right now. */
function answer(): number {
  const m = /What is (\d+) × (\d+)\?/.exec(text())
  if (!m) throw new Error(`no question on screen: ${text()}`)
  return Number(m[1]) * Number(m[2])
}

/** Type into the (controlled) answer field the way a keyboard would. */
function type(value: string) {
  const el = input()!
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setValue.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function submit(value: string) {
  type(value)
  act(() => submitButton()!.click())
}

function clickButton(label: string | RegExp) {
  const b = [...container.querySelectorAll('button')].find((el) =>
    typeof label === 'string' ? el.textContent?.includes(label) : label.test(el.getAttribute('aria-label') ?? el.textContent ?? ''),
  )
  if (!b) throw new Error(`no button ${label}`)
  act(() => b.click())
}

const PLAYER = { emoji: '🦊', color: '#fb923c', name: 'Sam', grade: 3 as const }

beforeEach(() => {
  vi.useFakeTimers()
  resetParentGateForTests()
  useProgress.getState().resetPlayer()
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.useRealTimers()
})

describe('ParentGate', () => {
  it('asks a grown-up for a typed product: number pad, no answer buttons', () => {
    render(h(MemoryRouter, null, h(ParentGate, { open: true, onPass: () => {}, onCancel: () => {} })))
    expect(text()).toContain('Grown-ups only')
    const a = answer()
    expect(a).toBeGreaterThanOrEqual(169)
    expect(a).toBeLessThanOrEqual(841)
    const field = input()!
    expect(field.inputMode).toBe('numeric')
    expect(field.getAttribute('pattern')).toBe('[0-9]*')
    // the only buttons are Back and Continue: nothing to guess between
    expect(container.querySelectorAll('button')).toHaveLength(2)
    // and it focuses the field once the dialog has popped in (the number pad comes up)
    act(() => vi.advanceTimersByTime(250))
    expect(document.activeElement).toBe(field)
  })

  it('lets a grown-up through and stays open for 10 minutes', () => {
    const onPass = vi.fn()
    render(h(MemoryRouter, null, h(ParentGate, { open: true, onPass, onCancel: () => {} })))
    submit(String(answer()))
    expect(onPass).toHaveBeenCalledTimes(1)
    expect(parentGateOpen()).toBe(true)
    act(() => vi.advanceTimersByTime(GATE_PASS_MS - 1000))
    expect(parentGateOpen()).toBe(true)
    act(() => vi.advanceTimersByTime(1000))
    expect(parentGateOpen()).toBe(false)
  })

  it('locks for 30 seconds after three wrong answers, with no hints', () => {
    const onPass = vi.fn()
    render(h(MemoryRouter, null, h(ParentGate, { open: true, onPass, onCancel: () => {} })))
    const first = answer()
    submit(String(first + 1))
    expect(text()).toContain('Not quite')
    expect(text()).not.toContain(String(first)) // the answer is never shown
    submit('1')
    submit('1')
    expect(text()).toContain('Too many tries')
    expect(input()).toBeNull()
    expect(submitButton()!.disabled).toBe(true)
    // closing and reopening doesn't get around it
    render(h(MemoryRouter, null, h(ParentGate, { open: false, onPass, onCancel: () => {} })))
    act(() => vi.advanceTimersByTime(1000))
    render(h(MemoryRouter, null, h(ParentGate, { open: true, onPass, onCancel: () => {} })))
    expect(text()).toContain('Too many tries')
    act(() => vi.advanceTimersByTime(GATE_LOCK_MS - 2000))
    expect(input()).toBeNull()
    act(() => vi.advanceTimersByTime(1500))
    expect(input()).not.toBeNull()
    submit(String(answer()))
    expect(onPass).toHaveBeenCalledTimes(1)
  })

  it('a blank answer is not a miss; Back cancels', () => {
    const onCancel = vi.fn()
    render(h(MemoryRouter, null, h(ParentGate, { open: true, onPass: () => {}, onCancel })))
    submit('')
    submit('')
    submit('')
    expect(text()).not.toContain('Too many tries')
    clickButton('Back')
    expect(onCancel).toHaveBeenCalled()
  })
})

describe('/parent is gated', () => {
  function app(path: string) {
    return h(
      MemoryRouter,
      { initialEntries: [path] },
      h(
        Routes,
        null,
        h(Route, { path: '/parent', element: h(RequireParent, null, h('div', null, 'Parent dashboard page')) }),
        h(Route, { path: '/world', element: h('div', null, 'World page') }),
        h(Route, { path: '/', element: h('div', null, 'Welcome page') }),
      ),
    )
  }

  it('a direct URL meets the gate; Back returns to the game', () => {
    useProgress.setState({ player: PLAYER })
    render(app('/parent'))
    expect(text()).toContain('Grown-ups only')
    expect(text()).not.toContain('Parent dashboard page')
    clickButton('Back')
    expect(text()).toContain('World page')
  })

  it('before there is a player, Back goes to the welcome screen', () => {
    render(app('/parent'))
    clickButton('Back')
    expect(text()).toContain('Welcome page')
  })

  it('opens after a pass, skips the question for 10 minutes, then asks again', () => {
    render(app('/parent'))
    submit(String(answer()))
    expect(text()).toContain('Parent dashboard page')

    act(() => root.unmount())
    root = createRoot(container)
    act(() => vi.advanceTimersByTime(GATE_PASS_MS - 5000))
    render(app('/parent'))
    expect(text()).toContain('Parent dashboard page')

    act(() => root.unmount())
    root = createRoot(container)
    act(() => vi.advanceTimersByTime(5000))
    render(app('/parent'))
    expect(text()).toContain('Grown-ups only')
    expect(text()).not.toContain('Parent dashboard page')
  })
})

describe('the 👨‍👩‍👧 button in the top bar', () => {
  it('asks over the current screen and only then opens the Parent area', () => {
    useProgress.setState({ player: PLAYER })
    render(
      h(
        MemoryRouter,
        { initialEntries: ['/world'] },
        h(
          AppShell,
          null,
          h(
            Routes,
            null,
            h(Route, { path: '/world', element: h('div', null, 'World page') }),
            h(Route, { path: '/parent', element: h(RequireParent, null, h('div', null, 'Parent dashboard page')) }),
          ),
        ),
      ),
    )
    clickButton(/Parent dashboard/)
    expect(text()).toContain('Grown-ups only')
    expect(text()).toContain('World page') // still where the kid was
    clickButton('Back')
    act(() => vi.advanceTimersByTime(1000))
    expect(text()).toContain('World page')
    expect(text()).not.toContain('Parent dashboard page')

    clickButton(/Parent dashboard/)
    submit(String(answer()))
    expect(text()).toContain('Parent dashboard page')
  })
})

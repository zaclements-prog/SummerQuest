import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, createElement as h, lazy, Suspense, useEffect } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import AppErrorBoundary from '../AppErrorBoundary'
import { lazyWithRetry } from '../../lib/lazyWithRetry'

// React's act() warns unless this flag is set in non-RTL environments.
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root
let consoleError: ReturnType<typeof vi.spyOn>
const fetchSpy = vi.fn()

const text = () => container.textContent ?? ''

function clickButton(label: string) {
  const b = [...container.querySelectorAll('button')].find((el) => el.textContent?.includes(label))
  if (!b) throw new Error(`no button "${label}" in: ${text()}`)
  act(() => b.click())
}

/** Let rejected / resolved dynamic imports settle and React retry. */
const settle = () => act(async () => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0))
})

function Boom(): ReactNode {
  throw new Error('kaboom')
}

const chunkError = () => new TypeError('Failed to fetch dynamically imported module: http://localhost/assets/WorldScreen-x.js')

function app(routes: Array<{ path: string; element: ReactNode }>, opts: { at: string; reload?: () => void }) {
  return h(
    MemoryRouter,
    { initialEntries: [opts.at] },
    h(AppErrorBoundary, {
      reload: opts.reload ?? (() => {}),
      children: h(Suspense, { fallback: h('div', null, 'Loading…') }, h(Routes, null, ...routes.map((r) => h(Route, { key: r.path, ...r })))),
    }),
  )
}

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  fetchSpy.mockReset()
  vi.stubGlobal('fetch', fetchSpy)
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  consoleError.mockRestore()
  vi.unstubAllGlobals()
})

describe('root error boundary', () => {
  it('turns a crash into the friendly recovery screen, logged to the console only', () => {
    act(() => root.render(app([{ path: '/boom', element: h(Boom) }, { path: '/world', element: h('div', null, 'World page') }], { at: '/boom' })))
    expect(text()).toContain("Oops! Let's try that again")
    expect(text()).toContain('Back to the World')
    expect(text()).toContain('Restart')
    expect(consoleError).toHaveBeenCalledWith('[app] a screen crashed', expect.any(Error), expect.anything())
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('"Back to the World" goes to /world and clears the error', () => {
    act(() => root.render(app([{ path: '/boom', element: h(Boom) }, { path: '/world', element: h('div', null, 'World page') }], { at: '/boom' })))
    clickButton('Back to the World')
    expect(text()).toContain('World page')
    expect(text()).not.toContain('Oops')
  })

  it('"Restart" reloads the app', () => {
    const reload = vi.fn()
    act(() => root.render(app([{ path: '/boom', element: h(Boom) }], { at: '/boom', reload })))
    clickButton('Restart')
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('moving to another screen (the back button) gives it a fresh try', () => {
    const nav: { go: (to: string) => void } = { go: () => {} }
    function Nav() {
      const navigate = useNavigate()
      useEffect(() => {
        nav.go = (to) => void navigate(to)
      })
      return null
    }
    act(() =>
      root.render(
        h(
          MemoryRouter,
          { initialEntries: ['/boom'] },
          h(Nav),
          h(AppErrorBoundary, {
            reload: () => {},
            children: h(Routes, null, h(Route, { path: '/boom', element: h(Boom) }), h(Route, { path: '/map', element: h('div', null, 'Map page') })),
          }),
        ),
      ),
    )
    expect(text()).toContain('Oops')
    act(() => nav.go('/map'))
    expect(text()).toContain('Map page')
  })

  it('catches a lazy screen whose code failed to load', async () => {
    const Broken = lazy(() => Promise.reject(chunkError()))
    act(() => root.render(app([{ path: '/play', element: h(Broken) }], { at: '/play' })))
    await settle()
    expect(text()).toContain("Oops! Let's try that again")
    expect(consoleError).toHaveBeenCalledWith('[app] a screen failed to load', expect.any(TypeError), expect.anything())
  })

  it('a chunk that failed to load is fetched again after "Back to the World"', async () => {
    const World = () => h('div', null, 'World page')
    let online = false
    const load = vi.fn<() => Promise<{ default: ComponentType<object> }>>(() =>
      online ? Promise.resolve({ default: World }) : Promise.reject(chunkError()),
    )
    const LazyWorld = lazyWithRetry(load)
    act(() => root.render(app([{ path: '/world', element: h(LazyWorld) }], { at: '/world' })))
    await settle()
    await settle()
    expect(text()).toContain('Oops')
    // a failed chunk waits on the error screen: no import loop in the background
    const tries = load.mock.calls.length
    expect(tries).toBe(1)
    online = true
    clickButton('Back to the World')
    await settle()
    expect(load.mock.calls.length).toBeGreaterThan(tries)
    expect(text()).toContain('World page')
  })
})

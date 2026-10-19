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

  it('a game whose code failed to load is fetched again on the next visit', async () => {
    const Game = () => h('div', null, 'Game page')
    let online = false
    const load = vi.fn<() => Promise<{ default: ComponentType<object> }>>(() =>
      online ? Promise.resolve({ default: Game }) : Promise.reject(chunkError()),
    )
    const LazyGame = lazyWithRetry(load)
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
          { initialEntries: ['/play'] },
          h(Nav),
          h(AppErrorBoundary, {
            reload: () => {},
            children: h(
              Suspense,
              { fallback: h('div', null, 'Loading…') },
              h(Routes, null, h(Route, { path: '/play', element: h(LazyGame) }), h(Route, { path: '/world', element: h('div', null, 'World page') })),
            ),
          }),
        ),
      ),
    )
    await settle()
    await settle()
    expect(text()).toContain('Oops')
    // a failed chunk waits on the error screen: no import loop in the background
    expect(load).toHaveBeenCalledTimes(1)

    clickButton('Back to the World')
    await settle()
    expect(text()).toContain('World page')

    online = true
    act(() => nav.go('/play'))
    await settle()
    expect(load).toHaveBeenCalledTimes(2)
    expect(text()).toContain('Game page')
  })

  it("when the World's own code failed to load, Back to the World restarts the app", async () => {
    const reload = vi.fn()
    const LazyWorld = lazyWithRetry<object>(() => Promise.reject(chunkError()))
    act(() => root.render(app([{ path: '/world', element: h(LazyWorld) }], { at: '/world', reload })))
    await settle()
    expect(text()).toContain('Oops')
    // (Chromium, and Fire's WebView, remember a failed module until the page reloads)
    clickButton('Back to the World')
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('a crash in the World itself gets another try in place', () => {
    let broken = true
    function FlakyWorld(): ReactNode {
      if (broken) throw new Error('kaboom')
      return h('div', null, 'World page')
    }
    const reload = vi.fn()
    act(() => root.render(app([{ path: '/world', element: h(FlakyWorld) }], { at: '/world', reload })))
    expect(text()).toContain('Oops')
    broken = false
    clickButton('Back to the World')
    expect(text()).toContain('World page')
    expect(reload).not.toHaveBeenCalled()
  })

  // The app's lazy routes share one loading wrapper, so going from one to
  // another suspends inside a boundary that is already showing: the router's
  // transition then can't commit until the new code arrives. A failure must
  // still reach the error screen, not retry in a loop behind the old screen.
  it('a failing screen opened from another lazy screen reaches the error screen (no retry loop)', async () => {
    const load = vi.fn<() => Promise<{ default: ComponentType<object> }>>(() => Promise.reject(chunkError()))
    const LessonA = lazyWithRetry<object>(() => Promise.resolve({ default: () => h('div', null, 'Lesson list') }))
    const LessonB = lazyWithRetry(load)
    const Loader = ({ children }: { children: ReactNode }) => h(Suspense, { fallback: h('div', null, 'Loading…') }, children)
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
          { initialEntries: ['/tutor'] },
          h(Nav),
          h(AppErrorBoundary, {
            reload: () => {},
            children: h(
              Routes,
              null,
              h(Route, { path: '/tutor', element: h(Loader, null, h(LessonA)) }),
              h(Route, { path: '/tutor/b', element: h(Loader, null, h(LessonB)) }),
            ),
          }),
        ),
      ),
    )
    await settle()
    expect(text()).toContain('Lesson list')
    act(() => nav.go('/tutor/b'))
    await settle()
    await settle()
    expect(text()).toContain("Oops! Let's try that again")
    expect(load).toHaveBeenCalledTimes(1)
  })
})

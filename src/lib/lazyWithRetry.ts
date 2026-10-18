import { createElement, lazy } from 'react'
import type { ComponentType } from 'react'

/** Lazy components whose code failed to load, waiting for a fresh try. */
const failed = new Set<() => void>()

/**
 * Give every lazy component whose code failed to load a fresh import on its
 * next render. The app's error screen calls this when the kid moves on
 * (src/components/AppErrorBoundary.tsx). Until then a failed component keeps
 * failing, so it lands on that screen instead of re-importing in a loop.
 */
export function retryFailedLoads() {
  for (const retry of failed) retry()
  failed.clear()
}

/**
 * React.lazy that can try again. React remembers a failed import() for good,
 * so a screen or game whose code didn't arrive (an interrupted update, a
 * storage hiccup) would fail on every visit, even after the error screen's
 * "Back to the World". The failure still throws to the nearest error boundary;
 * retryFailedLoads() then swaps in a fresh lazy component, so the next visit
 * imports again. That helps where the browser retries the fetch. Chromium (and
 * so Fire's WebView) remembers a failed module until the page reloads, so
 * there the error screen's Restart is what brings it back.
 */
export function lazyWithRetry<P extends object>(load: () => Promise<{ default: ComponentType<P> }>): ComponentType<P> {
  const make = () =>
    lazy(() =>
      load().catch((e: unknown) => {
        failed.add(retry)
        throw e
      }),
    )
  const retry = () => {
    current = make()
  }
  let current = make()
  return function LazyWithRetry(props: P) {
    return createElement(current, props)
  }
}

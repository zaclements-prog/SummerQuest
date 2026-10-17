import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange)
  return () => document.removeEventListener('visibilitychange', onChange)
}
const hiddenNow = () => document.hidden
const serverSnapshot = () => false

/**
 * True while the page is hidden (another tab, the app backgrounded, the screen
 * locked). Games fold it into their `paused` flag so timed elements (patience
 * clocks, storm timers) freeze while nobody can see them.
 */
export function usePageHidden(): boolean {
  return useSyncExternalStore(subscribe, hiddenNow, serverSnapshot)
}

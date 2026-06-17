import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useProgress } from '../store/progress'

/**
 * Accumulates active LEARNING time toward the daily goal. Counts a second only
 * when the child is on an active learning screen (a quiz/game stage, the daily
 * challenge, or a tutor lesson) AND the tab is visible AND they've interacted
 * recently. Browsing the map, decorating the Home, or sitting in menus does not
 * count — that time is "free". Mounted once in AppShell. Uses wall-clock deltas
 * (not a naive counter), so throttled timers in background tabs can't mis-count.
 */

const TICK_MS = 5000
const IDLE_LIMIT_MS = 120_000 // 2 min of zero interaction = paused
const MAX_ELAPSED_S = 20 // ignore catch-up bursts after a throttle/sleep

// Routes that count as active learning. Everything else (/, /map, /zone/*,
// /badges, /progress, /tutor index, /focus, /home, /parent, …) is "free" time.
const LEARNING_PATTERNS = [
  /^\/play\//, // a quiz/game stage
  /^\/daily(\/|$)/, // the daily challenge
  /^\/tutor\/.+/, // a tutor lesson (not the /tutor index itself)
]

/** True when the current path is an active learning screen. */
export function isLearningPath(path: string): boolean {
  return LEARNING_PATTERNS.some((re) => re.test(path))
}

export function usePlayClock() {
  const player = useProgress((s) => s.player)
  const tickPlay = useProgress((s) => s.tickPlay)
  const { pathname } = useLocation()

  // Read through a ref so the interval always sees the current screen without
  // tearing down/recreating itself (and losing its wall-clock baseline) on nav.
  const learningRef = useRef(false)
  learningRef.current = isLearningPath(pathname)

  useEffect(() => {
    if (!player) return
    let last = Date.now()
    let lastActivity = Date.now()

    const bump = () => {
      lastActivity = Date.now()
    }
    const onVisibility = () => {
      // Returning to the tab: reset the delta baseline so the hidden gap isn't counted.
      last = Date.now()
      if (document.visibilityState === 'visible') lastActivity = Date.now()
    }

    const activityEvents = ['pointerdown', 'keydown', 'pointermove', 'touchstart', 'scroll']
    activityEvents.forEach((e) => window.addEventListener(e, bump, { passive: true }))
    document.addEventListener('visibilitychange', onVisibility)

    const id = setInterval(() => {
      const now = Date.now()
      const elapsed = (now - last) / 1000
      last = now
      const idleMs = now - lastActivity
      if (
        learningRef.current &&
        document.visibilityState === 'visible' &&
        elapsed < MAX_ELAPSED_S &&
        idleMs < IDLE_LIMIT_MS
      ) {
        tickPlay(elapsed)
      }
    }, TICK_MS)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
      activityEvents.forEach((e) => window.removeEventListener(e, bump))
    }
  }, [player, tickPlay])
}

import { useEffect } from 'react'
import { useProgress } from '../store/progress'

/**
 * Accumulates active play time toward the daily goal. Counts a second only when
 * the tab is VISIBLE and the child has interacted recently — so a backgrounded
 * or walked-away-from tab doesn't inflate "learning time". Mounted once in
 * AppShell. Uses wall-clock deltas (not a naive counter), so throttled timers
 * in background tabs can't over- or under-count.
 */

const TICK_MS = 5000
const IDLE_LIMIT_MS = 120_000 // 2 min of zero interaction = paused
const MAX_ELAPSED_S = 20 // ignore catch-up bursts after a throttle/sleep

export function usePlayClock() {
  const player = useProgress((s) => s.player)
  const tickPlay = useProgress((s) => s.tickPlay)

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
      if (document.visibilityState === 'visible' && elapsed < MAX_ELAPSED_S && idleMs < IDLE_LIMIT_MS) {
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

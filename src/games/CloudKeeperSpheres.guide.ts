import { useCallback, useEffect, useMemo, useRef } from 'react'

/**
 * The guided journey's hint arrow, one pending timer at a time.
 *
 * Each leg schedules its own arrow ("show the way if the kid hesitates"). A
 * quick kid finishes a leg before that timer fires, so it must not outlive the
 * leg: a stale one lit the PREVIOUS leg's sphere during the next leg, or lit
 * an arrow in Puff's and Grit's unguided journeys. Scheduling a new arrow, or
 * cancelling (a station was entered), drops the pending one; unmounting does too.
 */
export function useGuideTimer<T>(show: (to: T) => void) {
  const timer = useRef<number | null>(null)
  const showRef = useRef(show)
  useEffect(() => {
    showRef.current = show
  }, [show])
  const cancel = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
  }, [])
  const schedule = useCallback(
    (ms: number, to: T) => {
      cancel()
      timer.current = window.setTimeout(() => {
        timer.current = null
        showRef.current(to)
      }, ms)
    },
    [cancel],
  )
  useEffect(() => cancel, [cancel])
  // stable: the run's callbacks list it as a dependency
  return useMemo(() => ({ schedule, cancel }), [schedule, cancel])
}

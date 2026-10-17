import { useEffect, useState } from 'react'
import type { NarrationClock } from '../../lib/narration'
import { stageNow } from '../motion/stageClock'

/** True once the step's narration (and so its animation) has played through. */
export function useNarrationDone(clock: NarrationClock, key: string): boolean {
  const [done, setDone] = useState<{ key: string; done: boolean }>({ key, done: false })
  useEffect(() => {
    let raf = 0
    let last: boolean | null = null
    const loop = () => {
      const d = stageNow(clock) > clock.duration() + 0.6
      if (d !== last) {
        last = d
        setDone({ key, done: d })
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [clock, key])
  return done.key === key && done.done
}

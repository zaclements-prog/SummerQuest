import { useCallback, useEffect, useState } from 'react'
import type { NarrationClock } from '../../lib/narration'
import { phraseIndex } from './cues'
import { Defs } from './kit'
import { H, M, W } from './palette'
import type { Scene } from './types'

/**
 * Plays a lesson step's motion graphic in sync with its narration: every frame
 * it reads the narration clock and re-renders the scene at that time.
 */
export default function MotionStage({ scene: SceneComp, text, clock, reduced, label }: { scene: Scene; text: string; clock: NarrationClock; reduced: boolean; label?: string }) {
  const [t, setT] = useState(0)
  const [dur, setDur] = useState(() => clock.duration())

  useEffect(() => {
    if (reduced) return
    let raf = 0
    const loop = () => {
      // DEV/QA: `window.__sqMotionT = 3.2` pins the timeline (headless screenshots).
      const forced = import.meta.env.DEV ? (window as { __sqMotionT?: number }).__sqMotionT : undefined
      setT(typeof forced === 'number' ? forced : clock.now())
      setDur(clock.duration())
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [clock, reduced])

  const cue = useCallback(
    (phrase: string, nth = 0) => {
      const i = phraseIndex(text, phrase, nth)
      if (i < 0) {
        if (import.meta.env.DEV) console.warn(`[motion] cue "${phrase}" not found in narration: ${text}`)
        return 0
      }
      return clock.timeAtChar(i)
    },
    [text, clock],
  )

  return (
    <div className="relative w-full overflow-hidden rounded-3xl" style={{ aspectRatio: `${W} / ${H}`, background: M.paper, boxShadow: `inset 0 0 0 3px ${M.ink}` }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" role="img" aria-label={label ?? text}>
        <Defs />
        <SceneComp t={reduced ? 1e4 : t} dur={dur} cue={cue} reduced={reduced} />
      </svg>
    </div>
  )
}

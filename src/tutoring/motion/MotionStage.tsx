import { useCallback, useEffect, useState } from 'react'
import { isTouchFirst } from '../../platform/gl/deviceClass'
import type { NarrationClock } from '../../lib/narration'
import { phraseIndex } from './cues'
import { Defs } from './kit'
import { H, M, W } from './palette'
import { stageNow } from './stageClock'
import type { Scene } from './types'

/**
 * Shortest time between stage redraws (ms). Phones and tablets redraw the vector
 * stage at 30 fps: each redraw re-renders the scene and re-rasterizes the whole SVG,
 * and a Fire tablet managed only an uneven 35–45 fps at 60 (measured on a Fire HD 10).
 * A steady 30 looks smoother than that, and motion graphics are made at 24–30.
 */
const STAGE_FRAME_MS = isTouchFirst() ? 1000 / 30 : 0

/**
 * Phones and tablets hold the last frame this long (s) after the narration ends. Every
 * scene keeps some ambient motion going (twinkles, bobbing, a breathing backdrop), so
 * without this the stage repaints forever while the child reads or answers the check.
 * Replay (or the next step) restarts the clock, and the stage with it.
 */
const IDLE_HOLD_S = isTouchFirst() ? 1.5 : Infinity

/**
 * Plays a lesson step's motion graphic in sync with its narration: every frame
 * it reads the narration clock and re-renders the scene at that time.
 * `framed` (default) draws the stage's own rounded ink frame; the lesson player
 * turns it off when it frames the stage itself.
 */
export default function MotionStage({ scene: SceneComp, text, clock, reduced, label, framed = true }: { scene: Scene; text: string; clock: NarrationClock; reduced: boolean; label?: string; framed?: boolean }) {
  const [t, setT] = useState(0)
  const [dur, setDur] = useState(() => clock.duration())

  useEffect(() => {
    if (reduced) return
    let raf = 0
    let last = -Infinity
    const loop = (now: number) => {
      // (−2 ms: rAF timestamps jitter; without it a 60 Hz screen would drop to 20 fps)
      if (now - last >= STAGE_FRAME_MS - 2) {
        last = now
        const d = clock.duration()
        // (an unchanged value doesn't re-render: once held, the stage costs nothing)
        setT(Math.min(stageNow(clock), d + IDLE_HOLD_S))
        setDur(d)
      }
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
    <div
      className={framed ? 'sq-stage relative w-full overflow-hidden rounded-3xl' : 'sq-stage relative w-full overflow-hidden'}
      style={{ aspectRatio: `${W} / ${H}`, background: M.paper, boxShadow: framed ? `inset 0 0 0 3px ${M.ink}` : undefined }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" role="img" aria-label={label ?? text}>
        <Defs />
        <SceneComp t={reduced ? 1e4 : t} dur={dur} cue={cue} reduced={reduced} />
      </svg>
    </div>
  )
}

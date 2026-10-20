import { useEffect, useRef } from 'react'
import { getGuideSnapshot, guide, subscribeGuide } from './store'

/** How long with no touch before the line is said again (ms). */
export const IDLE_REPROMPT_MS = 8000

/**
 * "Did you hear me?": after `delayMs` with no touch (and nothing being said),
 * say the screen's line once more, gently (no dimming), then stop nagging.
 * Fires at most once per `key` (pass the question's id); any touch or key
 * restarts the wait (so does a finger moving while it's down, or lifting:
 * a child tracing slowly is never interrupted), and the wait only counts
 * while the narrator is quiet.
 *
 * Default action: `guide.replay({ gentle: true })`.
 */
export function useIdleReprompt({
  key,
  enabled = true,
  delayMs = IDLE_REPROMPT_MS,
  onIdle,
}: {
  key: unknown
  enabled?: boolean
  delayMs?: number
  onIdle?: () => void
}) {
  const onIdleRef = useRef(onIdle)
  useEffect(() => {
    onIdleRef.current = onIdle
  })

  useEffect(() => {
    if (!enabled) return
    let done = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const arm = () => {
      clearTimeout(timer)
      if (done || getGuideSnapshot().speaking) return
      timer = setTimeout(() => {
        if (done || getGuideSnapshot().speaking) return
        done = true
        const f = onIdleRef.current
        if (f) f()
        else void guide.replay({ gentle: true })
      }, delayMs)
    }
    // (the narrator starting or stopping re-arms: the wait counts from the end of a line)
    let wasSpeaking = getGuideSnapshot().speaking
    const unsub = subscribeGuide(() => {
      const sp = getGuideSnapshot().speaking
      if (sp === wasSpeaking) return
      wasSpeaking = sp
      if (sp) clearTimeout(timer)
      else arm()
    })
    // a finger still down and moving (tracing a letter, slowly) is a touch too, and so is lifting it
    const moved = (e: PointerEvent) => {
      if (e.buttons) arm()
    }
    window.addEventListener('pointerdown', arm, true)
    window.addEventListener('pointermove', moved, true)
    window.addEventListener('pointerup', arm, true)
    window.addEventListener('keydown', arm, true)
    arm()
    return () => {
      done = true
      clearTimeout(timer)
      unsub()
      window.removeEventListener('pointerdown', arm, true)
      window.removeEventListener('pointermove', moved, true)
      window.removeEventListener('pointerup', arm, true)
      window.removeEventListener('keydown', arm, true)
    }
  }, [key, enabled, delayMs])
}

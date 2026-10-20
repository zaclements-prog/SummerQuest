import { useCallback, useEffect, useRef } from 'react'
import { guide, type GuideStep } from '../../guide/store'
import { useProgress } from '../../store/progress'

/** Wait this long on a screen before its first-visit line (it settles in first). */
const INTRO_DELAY_MS = 1200

/**
 * K–1: a screen's spoken explanation. The first visit says it by itself (once
 * per profile: `toursSeen`), and the returned function says it again (the
 * screen's 🔊). Does nothing while `enabled` is false (grades 2–5).
 */
export function useListenIntro(id: string, step: GuideStep | readonly GuideStep[], enabled: boolean): () => void {
  const seen = useProgress((s) => s.toursSeen.includes(id))
  const steps = useRef<readonly GuideStep[]>(Array.isArray(step) ? step : [step as GuideStep])
  useEffect(() => {
    steps.current = Array.isArray(step) ? step : [step as GuideStep]
  })
  const explain = useCallback(() => void guide.sequence(steps.current), [])

  useEffect(() => {
    if (!enabled || seen) return
    const t = window.setTimeout(() => {
      useProgress.getState().markTourSeen(id)
      explain()
    }, INTRO_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [enabled, seen, id, explain])

  return explain
}

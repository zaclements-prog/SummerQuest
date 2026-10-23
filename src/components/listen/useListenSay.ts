import { useEffect } from 'react'
import { guide, type GuideStep } from '../../guide/store'
import { listenGrade } from '../../lib/listenNav'
import { useProgress } from '../../store/progress'
import type { VoiceRef } from '../../voice/types'

/**
 * K–1 (listen mode) only: say `what` (a line, or guide steps) each time
 * `open` turns true: a reward card coming up ("You got a new badge!"). Not
 * dimmed, and not "said again" by 🔊 (the screen behind keeps its own line).
 * Grades 2–5 hear nothing new. A hook of its own, so a card's own code (when
 * and how it shows) needs no change beyond the call.
 */
export function useListenSay(open: boolean, what: VoiceRef | readonly GuideStep[] | null) {
  const listen = listenGrade(useProgress((s) => s.player?.grade))
  const key = what ? JSON.stringify(what, (_k, v) => (typeof v === 'function' ? undefined : v)) : ''
  useEffect(() => {
    if (!listen || !open || !key) return
    const parsed = JSON.parse(key) as VoiceRef | GuideStep[]
    const steps: GuideStep[] = Array.isArray(parsed) ? parsed : [{ voice: parsed, dim: false }]
    void guide.sequence(
      steps.map((s) => ({ dim: false, ...s })),
      { repeatable: false },
    )
  }, [listen, open, key])
}

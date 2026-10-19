import { useEffect, useMemo, useState } from 'react'
import { useProgress } from '../store/progress'
import { browserVoiceEnv } from './env'
import { VoicePlayer } from './player'
import { planVoice, voiceRefKey } from './playlist'
import type { VoicePlayback, VoiceRef } from './types'

/**
 * Say a voice line (and give its timeline to anything animating with it).
 *
 * Plays the line's recording from public/voice (a fixed line or a `whole`
 * template is one clip; a `stitch` template is its carrier pieces and slot
 * values back to back) on the shared, gesture-unlocked <audio> element; falls
 * back to device speech reading the caption when a recording is missing, and
 * to a silent estimated timeline when there is no device speech or sound is
 * off. See src/voice/player.ts.
 *
 * - `ref` null = say nothing. A new ref (by value) interrupts and restarts.
 * - `autoPlay: false` waits for `replay()`; the clock holds at 0 until then.
 * - Sound off (the kid's 🔇 setting): the clock still runs, silently.
 * - The app going to the background freezes the voice and the clock together;
 *   coming back carries both on from the same moment.
 * - One voice at a time: this line interrupts any other voice line or lesson
 *   narration that is speaking, and is interrupted by the next one.
 * - `stop()` silences it; the clock carries on silently from where it was.
 */
export function useVoice(ref: VoiceRef | null, opts: { autoPlay?: boolean } = {}): VoicePlayback {
  const autoPlay = opts.autoPlay ?? true
  const soundEnabled = useProgress((s) => s.soundEnabled)
  const key = ref ? voiceRefKey(ref) : ''
  // throws on an unknown line or a bad slot value (a test catches the typo, not a child)
  const plan = useMemo(() => (key ? planVoice(JSON.parse(key) as VoiceRef) : null), [key])
  const [player] = useState(() => new VoicePlayer(browserVoiceEnv()))
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    player.setListener(setPlaying)
    return () => player.setListener(null)
  }, [player])

  // Every new line (or sound switched on / off): load it, then say it, or run its
  // timeline silently. Deferred so the effect doesn't start sound synchronously.
  useEffect(() => {
    player.load(plan)
    if (!plan || !autoPlay) return
    if (!soundEnabled) {
      player.runSilent()
      return () => player.stop()
    }
    const t = window.setTimeout(() => void player.play(), 0)
    return () => {
      window.clearTimeout(t)
      player.stop()
    }
  }, [player, plan, soundEnabled, autoPlay])

  useEffect(() => {
    const onVisibility = () => player.onVisibility(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [player])

  useEffect(() => () => player.dispose(), [player])

  return {
    text: plan?.caption ?? '',
    playing,
    clock: player.clock,
    replay: () => player.replay(soundEnabled),
    stop: () => player.stop(),
  }
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_CHARS_PER_SEC } from '../tutoring/motion/cues'
import { voiceText } from './registry'
import type { VoiceClock, VoicePlayback, VoiceRef } from './types'

const perf = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

/**
 * Say a voice line (and give its timeline to anything animating with it).
 *
 * CONTRACT STUB (phase 0): runs the timeline silently, estimated from the text
 * length, so the guide and the Listen & Play screens can be built against the
 * final API. The voice-system work replaces the inside with the recorded clips
 * (played on the gesture-unlocked shared <audio> element, word-timed), stitched
 * templates, and the device-speech fallback — keeping this signature.
 *
 * `ref` null = say nothing. A new ref (by value) restarts; `autoPlay: false`
 * waits for `replay()`.
 */
export function useVoice(ref: VoiceRef | null, opts: { autoPlay?: boolean } = {}): VoicePlayback {
  const autoPlay = opts.autoPlay ?? true
  const key = ref ? JSON.stringify(ref) : ''
  const text = useMemo(() => (key ? voiceText(JSON.parse(key) as VoiceRef) : ''), [key])
  const textRef = useRef(text)
  const startRef = useRef(perf())
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    textRef.current = text
    startRef.current = perf()
    if (!text || !autoPlay) return
    // timers, not a synchronous setState: the effect only schedules the "speaking" window
    const on = window.setTimeout(() => setPlaying(true), 0)
    const off = window.setTimeout(() => setPlaying(false), (text.length / DEFAULT_CHARS_PER_SEC) * 1000)
    return () => {
      window.clearTimeout(on)
      window.clearTimeout(off)
      setPlaying(false)
    }
  }, [text, autoPlay])

  const clock = useMemo<VoiceClock>(() => {
    const duration = () => Math.max(0.5, textRef.current.length / DEFAULT_CHARS_PER_SEC)
    return {
      now: () => (perf() - startRef.current) / 1000,
      duration,
      timeAtChar: (i) => (textRef.current.length ? (i / textRef.current.length) * duration() : 0),
    }
  }, [])

  return {
    text,
    playing,
    clock,
    replay: () => {
      startRef.current = perf()
    },
    stop: () => setPlaying(false),
  }
}

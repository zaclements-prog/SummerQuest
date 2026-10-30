import { useCallback, useEffect, useRef, useState } from 'react'
import { useProgress } from '../store/progress'
import { browserVoiceEnv } from '../voice/env'
import { VoicePlayer } from '../voice/player'
import { planVoice } from '../voice/playlist'
import { voiceText } from '../voice/registry'
import type { VoiceRef } from '../voice/types'
import { guide, type GuideStep } from '../guide/store'

/**
 * What the Snack Shack says. Kindergarten and 1st grade: every line is a
 * voice-pack line or template, said through the Guide (so the 🔊 button says
 * it again, and the hand can point while it talks). Grades 2–5: a fixed line
 * plays its recording; a customer's order with its prices and times is read
 * by device speech (no recording), one after another.
 */

/** One thing to say: a voice line, a sentence for device speech, or (K–1) a line with something to point at. */
export type SayItem = VoiceRef | string | { voice: VoiceRef; target?: string; hand?: GuideStep['hand'] }

const isRef = (x: SayItem): x is VoiceRef => typeof x === 'object' && ('line' in x || 'template' in x)

/** The caption of a say item (for the live region and tests). */
export function sayText(x: SayItem): string {
  if (typeof x === 'string') return x
  return voiceText(isRef(x) ? x : x.voice)
}

export interface ShackSpeaker {
  say(items: readonly SayItem[]): void
  stop(): void
  /** The last thing said (for the 🔊 button and the screen reader). */
  caption: string
}

export function useShackSpeaker(listen: boolean): ShackSpeaker {
  const soundEnabled = useProgress((s) => s.soundEnabled)
  const [player] = useState(() => new VoicePlayer(browserVoiceEnv()))
  const queue = useRef<SayItem[]>([])
  const timer = useRef<number | undefined>(undefined)
  const [caption, setCaption] = useState('')
  const soundRef = useRef(soundEnabled)
  useEffect(() => {
    soundRef.current = soundEnabled
  }, [soundEnabled])

  const stop = useCallback(() => {
    queue.current = []
    window.clearInterval(timer.current)
    player.stop()
    if (listen) guide.clear({ forget: false })
  }, [player, listen])

  /** Say the queue one item after another (each starts once the one before has been said). */
  const playQueue = useCallback(() => {
    const next = () => {
      window.clearInterval(timer.current)
      const item = queue.current.shift()
      if (!item) return
      const text = sayText(item)
      setCaption(text)
      const ref = typeof item === 'string' ? null : isRef(item) ? item : item.voice
      player.load(ref ? planVoice(ref) : { caption: text, segments: [] })
      if (soundRef.current) void player.play()
      else player.runSilent()
      timer.current = window.setInterval(() => {
        const now = player.clock.now()
        if (!player.playing && now > 0 && now >= player.clock.duration()) next()
      }, 120)
    }
    next()
  }, [player])

  const say = useCallback(
    (items: readonly SayItem[]) => {
      stop()
      if (items.length === 0) return
      setCaption(items.map(sayText).join(' '))
      if (listen && items.every((x) => typeof x !== 'string')) {
        // K–1: through the Guide (one narrator for the app; 🔊 says it again)
        const steps = items.map((x): GuideStep => {
          if (typeof x === 'string' || isRef(x)) return { voice: typeof x === 'string' ? null : x, dim: false }
          return { voice: x.voice, dim: false, ...(x.target ? { target: x.target, pad: 6, ...(x.hand ? { hand: x.hand } : {}) } : {}) }
        })
        void guide.sequence(steps, { repeatable: true })
        return
      }
      queue.current = [...items]
      playQueue()
    },
    [listen, stop, playQueue],
  )

  useEffect(() => {
    const onVis = () => player.onVisibility(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [player])
  useEffect(
    () => () => {
      window.clearInterval(timer.current)
      player.dispose()
      if (listen) guide.clear({ forget: true })
    },
    [player, listen],
  )

  return { say, stop, caption }
}

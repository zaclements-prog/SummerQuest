import { useEffect, useRef, useState } from 'react'
import { useProgress } from '../store/progress'

type Manifest = Record<string, { file: string; hash: string }>
let manifestCache: Manifest | null = null

async function loadManifest(): Promise<Manifest> {
  if (manifestCache) return manifestCache
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}tts/manifest.json`)
    if (!r.ok) return {} // transient: don't cache, so a later call can retry
    manifestCache = await r.json()
    return manifestCache!
  } catch {
    return {} // network blip / offline: leave cache null so we retry next time
  }
}

/** Plays narration for a lesson step: MP3 if available, else browser speech synthesis. */
export function useNarration(lessonId: string, stepId: string, text: string) {
  const soundEnabled = useProgress((s) => s.soundEnabled)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  // Bumped by every play() AND stop(): async work (manifest fetch, play() promise,
  // load errors) checks it and bails if it's no longer the current playback, so
  // nothing starts or speaks after the kid has moved on.
  const genRef = useRef(0)
  const [playing, setPlaying] = useState(false)

  const stop = () => {
    genRef.current++
    const audio = audioRef.current
    audioRef.current = null
    if (audio) {
      audio.onended = null
      audio.onerror = null
      audio.pause()
    }
    window.speechSynthesis?.cancel()
    setPlaying(false)
  }

  const play = async () => {
    stop()
    const gen = genRef.current
    const isCurrent = () => gen === genRef.current
    const man = await loadManifest()
    if (!isCurrent()) return
    const clip = man[`${lessonId}/${stepId}`]
    if (!clip) {
      speak(text, setPlaying)
      return
    }
    const audio = new Audio(`${import.meta.env.BASE_URL}${clip.file}`)
    audioRef.current = audio
    // The MP3 can fail via onerror AND a rejected play(); fall back to speech once.
    let fellBack = false
    const fallBack = () => {
      if (fellBack || !isCurrent()) return
      fellBack = true
      audioRef.current = null
      speak(text, setPlaying)
    }
    audio.onended = () => {
      if (isCurrent()) setPlaying(false)
    }
    audio.onerror = fallBack
    setPlaying(true)
    audio.play().catch((e: unknown) => {
      // AbortError = we paused it ourselves (stop / step change): not a failure.
      if (e instanceof DOMException && e.name === 'AbortError') return
      fallBack()
    })
  }

  // Auto-play when the step changes (only if sound is on); stop when the step
  // changes, the screen unmounts, or sound is switched off. Deferred so we don't
  // setState synchronously inside the effect body.
  useEffect(() => {
    if (!soundEnabled) return
    const t = setTimeout(() => {
      play()
    }, 0)
    return () => {
      clearTimeout(t)
      stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, stepId, soundEnabled])

  return { playing, play, stop }
}

function speak(text: string, setPlaying: (b: boolean) => void) {
  if (!('speechSynthesis' in window)) {
    setPlaying(false)
    return
  }
  const u = new SpeechSynthesisUtterance(text)
  u.rate = 0.95
  const v = window.speechSynthesis.getVoices().find((x) => x.lang.startsWith('en'))
  if (v) u.voice = v
  u.onend = () => setPlaying(false)
  u.onerror = () => setPlaying(false)
  setPlaying(true)
  window.speechSynthesis.speak(u)
}

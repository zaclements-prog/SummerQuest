import { useEffect, useRef, useState } from 'react'
import { useProgress } from '../store/progress'

type Manifest = Record<string, { file: string; hash: string }>
let manifestCache: Manifest | null = null

async function loadManifest(): Promise<Manifest> {
  if (manifestCache) return manifestCache
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}tts/manifest.json`)
    manifestCache = r.ok ? await r.json() : {}
  } catch {
    manifestCache = {}
  }
  return manifestCache!
}

/** Plays narration for a lesson step: MP3 if available, else browser speech synthesis. */
export function useNarration(lessonId: string, stepId: string, text: string) {
  const soundEnabled = useProgress((s) => s.soundEnabled)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  const stop = () => {
    audioRef.current?.pause()
    if (audioRef.current) audioRef.current.currentTime = 0
    window.speechSynthesis?.cancel()
    setPlaying(false)
  }

  const play = async () => {
    stop()
    const man = await loadManifest()
    const clip = man[`${lessonId}/${stepId}`]
    if (clip) {
      const audio = new Audio(`${import.meta.env.BASE_URL}${clip.file}`)
      audioRef.current = audio
      audio.onended = () => setPlaying(false)
      audio.onerror = () => speak(text, setPlaying)
      setPlaying(true)
      audio.play().catch(() => speak(text, setPlaying))
    } else {
      speak(text, setPlaying)
    }
  }

  // auto-play when the step changes (only if sound is on). Deferred to a
  // microtask so we don't call setState synchronously inside the effect body
  // (browsers gate autoplay until a user gesture anyway).
  useEffect(() => {
    if (!soundEnabled) return
    const t = setTimeout(() => { play() }, 0)
    return () => {
      clearTimeout(t)
      stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, stepId])

  return { playing, play, stop }
}

function speak(text: string, setPlaying: (b: boolean) => void) {
  if (!('speechSynthesis' in window)) return
  const u = new SpeechSynthesisUtterance(text)
  u.rate = 0.95
  const v = window.speechSynthesis.getVoices().find((x) => x.lang.startsWith('en'))
  if (v) u.voice = v
  u.onend = () => setPlaying(false)
  setPlaying(true)
  window.speechSynthesis.speak(u)
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useProgress } from '../store/progress'
import { DEFAULT_CHARS_PER_SEC, alignWords, timeAtChar, type TimedWord } from '../tutoring/motion/cues'

/**
 * One rendered narration clip (public/tts/manifest.json). `duration` (seconds)
 * and `words` (path to a `{ words: TimedWord[] }` JSON of word timings) are
 * optional extras a renderer may add; see docs/narration-handoff.md.
 */
export interface NarrationClip {
  file: string
  hash: string
  duration?: number
  words?: string
}
type Manifest = Record<string, NarrationClip>
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

const wordsCache = new Map<string, Promise<TimedWord[] | null>>()
function loadWords(path: string): Promise<TimedWord[] | null> {
  let p = wordsCache.get(path)
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}${path}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { words?: TimedWord[] } | null) => (j && Array.isArray(j.words) ? j.words : null))
      .catch(() => null)
    wordsCache.set(path, p)
  }
  return p
}

/**
 * The narration's timeline, read every animation frame by the lesson motion
 * graphics. It always runs: from the audio clip when there is one, from browser
 * speech otherwise, and on a silent estimate when sound is off or stopped, so
 * the visuals play either way.
 */
export interface NarrationClock {
  /** Seconds since this step's narration (or silent timeline) started. Keeps counting after it ends. */
  now(): number
  /** Best-known narration length in seconds. */
  duration(): number
  /** Seconds at which character `i` of the narration text is spoken. */
  timeAtChar(i: number): number
}

interface ClockState {
  source: 'virtual' | 'audio' | 'speech'
  start: number // performance.now() ms when the timeline started
  audio: HTMLAudioElement | null
  endedAt: number | null // perf ms when the audio ended
  cps: number // estimated characters per second (speech / virtual)
  clipDuration: number | null // from the manifest
  aligned: { start: number; s: number }[] | null
  paused: boolean // frozen by pause(): now() holds at pausedAt until resume()
  pausedAt: number
}

const perf = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

/** Plays narration for a lesson step: MP3 if available, else browser speech synthesis. */
export function useNarration(lessonId: string, stepId: string, text: string) {
  const soundEnabled = useProgress((s) => s.soundEnabled)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  // Bumped by every play() AND stop(): async work (manifest fetch, play() promise,
  // load errors) checks it and bails if it's no longer the current playback, so
  // nothing starts or speaks after the kid has moved on.
  const genRef = useRef(0)
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const clockRef = useRef<ClockState>({
    source: 'virtual',
    start: perf(),
    audio: null,
    endedAt: null,
    cps: DEFAULT_CHARS_PER_SEC,
    clipDuration: null,
    aligned: null,
    paused: false,
    pausedAt: 0,
  })

  const textRef = useRef(text)
  useEffect(() => {
    textRef.current = text
  }, [text])

  // A stable clock object; it reads the mutable state on every call.
  const clock = useMemo<NarrationClock>(() => {
    const c = () => clockRef.current
    const duration = () => {
      const s = c()
      if (s.source === 'audio' && s.audio && Number.isFinite(s.audio.duration) && s.audio.duration > 0) return s.audio.duration
      if (s.source === 'audio' && s.clipDuration) return s.clipDuration
      return Math.max(1, textRef.current.length / s.cps)
    }
    return {
      now() {
        const s = c()
        if (s.paused) return s.pausedAt
        if (s.source === 'audio' && s.audio) {
          if (s.endedAt != null) return duration() + (perf() - s.endedAt) / 1000
          return s.audio.currentTime
        }
        return (perf() - s.start) / 1000
      },
      duration,
      timeAtChar(i: number) {
        const s = c()
        return timeAtChar(i, textRef.current.length, duration(), s.source === 'audio' ? s.aligned : null)
      },
    }
  }, [])

  /** Restart the timeline silently from `at` seconds (narration off / stopped). */
  const goVirtual = (at = 0) => {
    const s = clockRef.current
    s.source = 'virtual'
    s.start = perf() - at * 1000
    s.audio = null
    s.endedAt = null
    s.cps = DEFAULT_CHARS_PER_SEC
    s.aligned = null
    s.paused = false
  }

  const stop = () => {
    // keep the visuals running from where they were, silently
    const at = clock.now()
    genRef.current++
    const audio = audioRef.current
    audioRef.current = null
    if (audio) {
      audio.onended = null
      audio.onerror = null
      audio.pause()
    }
    window.speechSynthesis?.cancel()
    goVirtual(at)
    setPlaying(false)
    setPaused(false)
  }

  /**
   * Freeze the narration AND the visuals where they are (resume() carries on
   * from the same moment). Works for the audio clip, browser speech and the
   * silent timeline alike.
   */
  const pause = () => {
    const s = clockRef.current
    if (s.paused) return
    const at = clock.now()
    s.paused = true
    s.pausedAt = at
    const audio = audioRef.current
    if (s.source === 'audio' && audio && s.endedAt == null) {
      audio.pause() // keeps currentTime; the pending play() rejects with AbortError (ignored)
    } else if (s.source === 'speech') {
      genRef.current++ // the cancelled utterance's callbacks are now stale
      window.speechSynthesis?.cancel()
    } else if (s.source === 'virtual') {
      genRef.current++ // a clip still loading must not start while we're paused
    }
    setPlaying(false)
    setPaused(true)
  }

  /** Carry on after pause(). Speech restarts from the word it stopped on. */
  const resume = () => {
    const s = clockRef.current
    if (!s.paused) return
    const at = s.pausedAt
    s.paused = false
    setPaused(false)
    const audio = audioRef.current
    if (s.source === 'audio' && s.endedAt != null) {
      // the clip already finished: keep counting from the frozen moment
      s.endedAt = perf() - Math.max(0, at - clock.duration()) * 1000
      return
    }
    if (s.source === 'audio' && audio && s.audio === audio) {
      const gen = genRef.current
      setPlaying(true)
      audio.play().catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return
        if (gen !== genRef.current) return
        goVirtual(at) // can't play any more: keep the visuals going silently
        setPlaying(false)
      })
      return
    }
    if (s.source === 'speech') {
      const text = textRef.current
      let from = Math.min(text.length, Math.round(at * s.cps))
      while (from > 0 && /\S/.test(text[from - 1])) from-- // back to the start of that word
      if (from >= text.length - 1) {
        goVirtual(at) // nothing left to say
        return
      }
      const gen = ++genRef.current
      const offset = from / s.cps
      s.start = perf() - offset * 1000
      speak(text.slice(from), setPlaying, {
        onStart: () => {
          if (gen === genRef.current) clockRef.current.start = perf() - offset * 1000
        },
        onBoundary: (charIndex) => {
          if (gen !== genRef.current) return
          const st = clockRef.current
          const elapsed = (perf() - st.start) / 1000
          if (elapsed > 0.4 && charIndex + from > 8) st.cps = (charIndex + from) / elapsed
        },
      })
      return
    }
    // silent timeline: carry on from where it froze
    s.start = perf() - at * 1000
  }

  const startSpeech = (gen: number) => {
    const s = clockRef.current
    s.source = 'speech'
    s.start = perf()
    s.audio = null
    s.endedAt = null
    s.aligned = null
    s.cps = DEFAULT_CHARS_PER_SEC
    speak(textRef.current, setPlaying, {
      onStart: () => {
        if (gen === genRef.current) clockRef.current.start = perf()
      },
      onBoundary: (charIndex) => {
        if (gen !== genRef.current) return
        const st = clockRef.current
        const elapsed = (perf() - st.start) / 1000
        // learn the voice's real pace from word boundaries (where browsers send them)
        if (elapsed > 0.4 && charIndex > 8) st.cps = charIndex / elapsed
      },
    })
  }

  const play = async () => {
    stop()
    goVirtual(0)
    const gen = genRef.current
    const isCurrent = () => gen === genRef.current
    const man = await loadManifest()
    if (!isCurrent()) return
    const clip = man[`${lessonId}/${stepId}`]
    if (!clip) {
      startSpeech(gen)
      return
    }
    const audio = new Audio(`${import.meta.env.BASE_URL}${clip.file}`)
    audioRef.current = audio
    const s = clockRef.current
    s.source = 'audio'
    s.audio = audio
    s.endedAt = null
    s.clipDuration = clip.duration ?? null
    s.aligned = null
    if (clip.words) {
      void loadWords(clip.words).then((w) => {
        if (isCurrent() && w) clockRef.current.aligned = alignWords(textRef.current, w)
      })
    }
    // The MP3 can fail via onerror AND a rejected play(); fall back to speech once.
    let fellBack = false
    const fallBack = () => {
      if (fellBack || !isCurrent()) return
      fellBack = true
      audioRef.current = null
      startSpeech(gen)
    }
    audio.onended = () => {
      if (!isCurrent()) return
      clockRef.current.endedAt = perf()
      setPlaying(false)
    }
    audio.onerror = fallBack
    setPlaying(true)
    audio.play().catch((e: unknown) => {
      // AbortError = we paused it ourselves (stop / step change): not a failure.
      if (e instanceof DOMException && e.name === 'AbortError') return
      fallBack()
    })
  }

  // On every step: restart the (silent) timeline, then auto-play the narration
  // if sound is on. Stop when the step changes, the screen unmounts, or sound is
  // switched off. Deferred so we don't setState synchronously in the effect body.
  useEffect(() => {
    goVirtual(0)
    if (!soundEnabled) return () => setPaused(false)
    const t = setTimeout(() => {
      play()
    }, 0)
    return () => {
      clearTimeout(t)
      stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, stepId, soundEnabled])

  /** Restart the visuals (and the narration, if sound is on). */
  const replay = () => {
    if (soundEnabled) void play()
    else {
      goVirtual(0)
      setPaused(false)
    }
  }

  return { playing, paused, play, stop, pause, resume, replay, clock }
}

function speak(
  text: string,
  setPlaying: (b: boolean) => void,
  hooks: { onStart?: () => void; onBoundary?: (charIndex: number) => void } = {},
) {
  if (!('speechSynthesis' in window)) {
    setPlaying(false)
    return
  }
  const u = new SpeechSynthesisUtterance(text)
  u.rate = 0.95
  const v = window.speechSynthesis.getVoices().find((x) => x.lang.startsWith('en'))
  if (v) u.voice = v
  u.onstart = () => hooks.onStart?.()
  u.onboundary = (e) => hooks.onBoundary?.(e.charIndex)
  u.onend = () => setPlaying(false)
  u.onerror = () => setPlaying(false)
  setPlaying(true)
  window.speechSynthesis.speak(u)
}

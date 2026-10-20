/**
 * Device speech: the fallback when a voice line has no recording. Behind a
 * small interface so a native text-to-speech plugin (e.g. a Capacitor plugin
 * calling Android's offline TTS on Fire tablets) can replace the browser's
 * `speechSynthesis` later with `setSpeechBackend`, without touching the player.
 *
 * Privacy: device speech only ever reads the line's caption text (on-screen
 * questions and instructions), never the child's name, and prefers voices the
 * device synthesizes itself (`localService`), so nothing leaves the device.
 */

export interface SpeechHooks {
  onStart?(): void
  /** Character index (in the spoken text) of the word now being said, where the engine reports it. */
  onBoundary?(charIndex: number): void
  onEnd?(): void
  onError?(error: string): void
}

export interface SpeechVoiceInfo {
  name: string
  lang: string
  local: boolean
  isDefault: boolean
}

export interface SpeechBackend {
  readonly name: string
  /** Is there an engine to call at all? (It may still turn out silent: the player watches for `onStart`.) */
  available(): boolean
  voices(): SpeechVoiceInfo[]
  speak(text: string, hooks: SpeechHooks, opts?: { rate?: number }): void
  cancel(): void
}

type Synth = SpeechSynthesis | undefined
const synth = (): Synth => (typeof window !== 'undefined' ? window.speechSynthesis : undefined)

function pickVoice(list: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const en = list.filter((v) => v.lang?.toLowerCase().startsWith('en'))
  // an on-device voice first (network voices would send the text away), US English first
  return (
    en.find((v) => v.localService && /en[-_]us/i.test(v.lang)) ??
    en.find((v) => v.localService) ??
    // no voice says it is local: only the engine's default (on Fire / Android that is the
    // installed offline engine); never pick a named network voice ourselves
    undefined
  )
}

/** The browser's Web Speech API. */
export const webSpeechBackend: SpeechBackend = {
  name: 'speechSynthesis',
  available() {
    return !!synth() && typeof SpeechSynthesisUtterance !== 'undefined'
  },
  voices() {
    try {
      return (synth()?.getVoices() ?? []).map((v) => ({ name: v.name, lang: v.lang, local: v.localService, isDefault: v.default }))
    } catch {
      return []
    }
  },
  speak(text, hooks, opts = {}) {
    const s = synth()
    if (!s || typeof SpeechSynthesisUtterance === 'undefined') {
      hooks.onError?.('unavailable')
      return
    }
    try {
      const u = new SpeechSynthesisUtterance(text)
      u.rate = opts.rate ?? 0.9
      const v = pickVoice(s.getVoices?.() ?? [])
      if (v) u.voice = v
      u.onstart = () => hooks.onStart?.()
      u.onboundary = (e) => hooks.onBoundary?.(e.charIndex)
      u.onend = () => hooks.onEnd?.()
      u.onerror = (e) => hooks.onError?.((e as SpeechSynthesisErrorEvent).error ?? 'error')
      s.speak(u)
    } catch (e) {
      hooks.onError?.(e instanceof Error ? e.message : 'error')
    }
  },
  cancel() {
    try {
      synth()?.cancel()
    } catch {
      /* no speech support */
    }
  },
}

let backend: SpeechBackend = webSpeechBackend

/** The device-speech engine in use. */
export function speechBackend(): SpeechBackend {
  return backend
}

/** Swap the engine (a native TTS plugin on the tablet; a fake in tests). */
export function setSpeechBackend(b: SpeechBackend): void {
  backend = b
}

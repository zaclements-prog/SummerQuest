import { claimNarrationAudio, controlsNarrationAudio, releaseNarrationAudio } from '../platform/web/audioUnlock'
import { releaseSpeechChannel, speechChannelHeldByOther, takeSpeechChannel } from '../lib/speechChannel'
import type { TimedWord } from '../tutoring/motion/cues'
import type { AudioLike, PlayerEnv, VoiceManifest } from './player'
import { speechBackend } from './speech'

/**
 * The real world for the voice player: public/voice/manifest.json, the shared
 * unlocked <audio> element, the device-speech backend and the speech channel.
 * (Same-origin fetches only, written with a literal base so the store build's
 * network check can see where they go.)
 */

let manifestCache: VoiceManifest | null = null
let manifestLoad: Promise<VoiceManifest> | null = null

export function loadVoiceManifest(): Promise<VoiceManifest> {
  if (manifestCache) return Promise.resolve(manifestCache)
  // The offline single file (opened from file://) ships no clips and can't fetch: device speech.
  if (typeof location !== 'undefined' && location.protocol === 'file:') return Promise.resolve({})
  manifestLoad ??= fetch(`${import.meta.env.BASE_URL}voice/manifest.json`)
    .then(async (r) => {
      if (!r.ok) return {} // transient: don't cache, so a later line can retry
      const m = (await r.json()) as VoiceManifest
      manifestCache = m && typeof m === 'object' ? m : {}
      return manifestCache
    })
    .catch(() => ({}))
    .finally(() => {
      manifestLoad = null
    })
  return manifestLoad
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

const GESTURES = ['pointerup', 'touchend', 'click', 'keydown'] as const

export function browserVoiceEnv(): PlayerEnv {
  return {
    now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
    setTimeout: (fn, ms) => window.setTimeout(fn, ms),
    clearTimeout: (id) => window.clearTimeout(id as number),
    loadManifest: loadVoiceManifest,
    loadWords,
    clipUrl: (file) => `${import.meta.env.BASE_URL}${file}`,
    claimAudio: (owner) => claimNarrationAudio(owner),
    controlsAudio: (audio, owner) => controlsNarrationAudio(audio as HTMLAudioElement, owner),
    releaseAudio: (owner) => releaseNarrationAudio(owner),
    newAudio: (): AudioLike => new Audio(),
    speech: speechBackend,
    channel: { take: takeSpeechChannel, release: releaseSpeechChannel, heldByOther: speechChannelHeldByOther },
    hidden: () => typeof document !== 'undefined' && document.visibilityState === 'hidden',
    onceGesture(fn) {
      const opts: AddEventListenerOptions = { capture: true, passive: true }
      const off = () => {
        for (const t of GESTURES) window.removeEventListener(t, on, opts)
      }
      const on = () => {
        off()
        fn()
      }
      // added after the audio unlock's own listeners (src/platform/web/boot.ts), so the
      // shared element is already unlocked when the line starts inside this same tap
      for (const t of GESTURES) window.addEventListener(t, on, opts)
      return off
    },
  }
}

/** Tests only. */
export function resetVoiceManifestCacheForTests() {
  manifestCache = null
  manifestLoad = null
  wordsCache.clear()
}

import { useProgress } from '../../store/progress'

/**
 * A tiny "say it out loud" helper for the mini-games (counting camels, chanting
 * array rows). Uses the browser's speech synthesis when sound is on; silently
 * does nothing where speech isn't available. Short words only — it is a chant,
 * not narration (lessons use lib/narration's recorded clips).
 */
function synth(): SpeechSynthesis | null {
  try {
    return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null
  } catch {
    return null
  }
}

export const voice = {
  /** Speak `text`. `interrupt` cuts off whatever is still being said first. */
  say(text: string, opts: { interrupt?: boolean; rate?: number; pitch?: number } = {}) {
    if (!useProgress.getState().soundEnabled) return
    // nothing plays while the app is in the background (audioUnlock cancels speech on the way out)
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    const s = synth()
    if (!s) return
    try {
      if (opts.interrupt) s.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.rate = opts.rate ?? 1.15
      u.pitch = opts.pitch ?? 1.15
      u.volume = 0.9
      const v = s.getVoices().find((x) => x.lang.startsWith('en'))
      if (v) u.voice = v
      s.speak(u)
    } catch {
      // speech is a bonus; never let it break play
    }
  },
  cancel() {
    try {
      synth()?.cancel()
    } catch {
      // ignore
    }
  },
}

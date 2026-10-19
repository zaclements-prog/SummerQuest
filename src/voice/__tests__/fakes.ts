import { vi } from 'vitest'
import { releaseSpeechChannel, speechChannelHeldByOther, takeSpeechChannel } from '../../lib/speechChannel'
import type { TimedWord } from '../../tutoring/motion/cues'
import type { AudioLike, PlayerEnv, VoiceManifest } from '../player'
import type { SpeechBackend, SpeechHooks } from '../speech'

/**
 * A fake <audio> that behaves like a browser's: play() stays pending until the
 * clip actually starts (start()), pause() or a new `src` rejects a pending
 * play() with AbortError, and end() fires `onended`.
 */
export class FakeAudio {
  onended: (() => void) | null = null
  onerror: (() => void) | null = null
  paused = true
  currentTime = 0
  duration = NaN
  /** Every src play() was called with, in order. */
  played: string[] = []
  private _src = ''
  private pending?: { resolve: () => void; reject: (e: unknown) => void }
  get src() {
    return this._src
  }
  set src(v: string) {
    this.abort('interrupted by a new load request')
    this._src = v
    this.currentTime = 0
    this.duration = NaN
    this.paused = true
  }
  play() {
    this.paused = false
    this.played.push(this._src)
    return new Promise<void>((resolve, reject) => {
      this.pending = { resolve, reject }
    })
  }
  /** The clip starts sounding (its length is now known). */
  start(duration?: number) {
    if (duration !== undefined) this.duration = duration
    this.pending?.resolve()
    this.pending = undefined
  }
  /** play() is refused (e.g. NotAllowedError before a tap). */
  refuse(name: string) {
    this.pending?.reject(new DOMException('refused', name))
    this.pending = undefined
    this.paused = true
  }
  end() {
    this.currentTime = Number.isFinite(this.duration) ? this.duration : this.currentTime
    this.paused = true
    this.onended?.()
  }
  pause() {
    this.paused = true
    this.abort('interrupted by a call to pause()')
  }
  private abort(why: string) {
    this.pending?.reject(new DOMException(`The play() request was ${why}.`, 'AbortError'))
    this.pending = undefined
  }
}

/** A fake device-speech engine: records what it was asked to say; the test fires the events. */
export class FakeSpeech implements SpeechBackend {
  name = 'fake-speech'
  isAvailable = true
  calls: { text: string; hooks: SpeechHooks }[] = []
  cancel = vi.fn()
  available() {
    return this.isAvailable
  }
  voices() {
    return [{ name: 'Fake', lang: 'en-US', local: true, isDefault: true }]
  }
  speak(text: string, hooks: SpeechHooks) {
    this.calls.push({ text, hooks })
  }
  get last() {
    return this.calls[this.calls.length - 1]
  }
}

/** Fake time + timers + one shared (already unlocked) element + the real speech channel. */
export function fakeEnv(manifest: VoiceManifest, words: Record<string, TimedWord[]> = {}) {
  let t = 0
  let timers: { at: number; fn: () => void; id: number }[] = []
  let nextId = 1
  const shared = new FakeAudio()
  let owner: object | null = null
  const speech = new FakeSpeech()
  const gestures: (() => void)[] = []
  let hidden = false
  const env: PlayerEnv = {
    now: () => t,
    setTimeout: (fn, ms) => {
      const id = nextId++
      timers.push({ at: t + ms, fn, id })
      return id
    },
    clearTimeout: (id) => {
      timers = timers.filter((x) => x.id !== id)
    },
    loadManifest: () => Promise.resolve(manifest),
    loadWords: (path) => Promise.resolve(words[path] ?? null),
    clipUrl: (file) => `/${file}`,
    claimAudio: (by) => {
      owner = by
      return shared as unknown as AudioLike
    },
    controlsAudio: (a, by) => (a as unknown) !== shared || owner === by,
    releaseAudio: (by) => {
      if (owner === by) owner = null
    },
    newAudio: () => new FakeAudio() as unknown as AudioLike,
    speech: () => speech,
    channel: { take: takeSpeechChannel, release: releaseSpeechChannel, heldByOther: speechChannelHeldByOther },
    hidden: () => hidden,
    onceGesture: (fn) => {
      gestures.push(fn)
      return () => {
        const i = gestures.indexOf(fn)
        if (i >= 0) gestures.splice(i, 1)
      }
    },
  }
  return {
    env,
    shared,
    speech,
    /** Move time forward, running due timers in order. */
    advance(ms: number) {
      const end = t + ms
      for (;;) {
        const due = timers.filter((x) => x.at <= end).sort((a, b) => a.at - b.at)[0]
        if (!due) break
        timers = timers.filter((x) => x !== due)
        t = due.at
        due.fn()
      }
      t = end
    },
    tap() {
      for (const g of [...gestures]) g()
    },
    setHidden(h: boolean) {
      hidden = h
    },
    get owner() {
      return owner
    },
    get pendingTimers() {
      return timers.length
    },
  }
}

/** Let resolved promises run (the manifest, play() settling). */
export const flush = () => new Promise((r) => setTimeout(r, 0))

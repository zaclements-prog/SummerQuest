import { DEFAULT_CHARS_PER_SEC, type TimedWord } from '../tutoring/motion/cues'
import type { PlanSegment } from './catalog'
import { playlistDuration, playlistTimeAtChar, scaledTimeAtChar, segmentStarts, type SegTiming } from './clock'
import type { SpeechBackend } from './speech'
import { alignCaptionWords } from './spoken'
import type { VoiceClock } from './types'

/**
 * The voice-line player, without React (src/voice/useVoice.ts wraps it).
 *
 * Plays a line's clips back to back on ONE audio element (the shared,
 * gesture-unlocked one from src/platform/web/audioUnlock.ts once the first tap
 * has happened), with the short pauses the plan asks for. Fallback chain:
 *
 *   1. the recorded clip(s), when every clip of the line is in the manifest;
 *   2. device speech reading the caption (src/voice/speech.ts);
 *   3. a silent timeline estimated from the text,
 *
 * and `clock` always runs, so anything animated with the voice plays either
 * way. Only one voice speaks at a time: playing takes the speech channel
 * (src/lib/speechChannel.ts), which stops whatever was speaking before.
 *
 * Everything the outside world provides comes in through `PlayerEnv`, so the
 * playlist and the clock are tested with a fake audio element and fake time.
 */

export interface VoicePlan {
  /** What the narrator says, as shown (digits as digits). */
  caption: string
  /** The clips to play, in order (empty: there is no recording; speech reads the caption). */
  segments: PlanSegment[]
}

/** The parts of an <audio> element the player uses. */
export type AudioLike = Pick<HTMLAudioElement, 'src' | 'currentTime' | 'duration' | 'paused' | 'onended' | 'onerror' | 'play' | 'pause'>

/** One rendered clip (public/voice/manifest.json): the same shape as the lesson manifest. */
export interface VoiceManifestEntry {
  file: string
  hash: string
  duration?: number
  words?: string
}
export type VoiceManifest = Record<string, VoiceManifestEntry>

export interface SpeechChannel {
  take(by: object, interrupt: () => void): void
  release(by: object): void
  heldByOther(by: object): boolean
}

export interface PlayerEnv {
  /** Milliseconds (performance.now()). */
  now(): number
  setTimeout(fn: () => void, ms: number): unknown
  clearTimeout(id: unknown): void
  loadManifest(): Promise<VoiceManifest>
  loadWords(path: string): Promise<TimedWord[] | null>
  /** URL of a manifest `file`. */
  clipUrl(file: string): string
  /** The shared, unlocked element for `owner` (null before the first gesture). */
  claimAudio(owner: object): AudioLike | null
  controlsAudio(audio: AudioLike, owner: object): boolean
  releaseAudio(owner: object): void
  /** A private element, when the shared one isn't unlocked yet. */
  newAudio(): AudioLike
  speech(): SpeechBackend
  channel: SpeechChannel
  hidden(): boolean
  /** Call `fn` once on the next user gesture; returns an unsubscribe. */
  onceGesture?(fn: () => void): () => void
}

export type VoiceSource = 'idle' | 'loading' | 'audio' | 'speech' | 'virtual'

/** What the last play() did: the Parent area's voice check shows it, tests read it. */
export interface PlayReport {
  source: VoiceSource
  clip: 'none' | 'missing' | 'loaded' | 'error' | 'blocked'
  speech: 'none' | 'unavailable' | 'started' | 'silent' | 'error'
  detail?: string
  /** Seconds, once known (the recording's or the estimate). */
  duration?: number
}

export interface PlayerOptions {
  /** `recorded`: clips only, no device speech (voice check). `speech`: device speech only. */
  prefer?: 'auto' | 'recorded' | 'speech'
  /** Device speech rate (1 = the engine's normal pace). */
  rate?: number
  /** Device speech that hasn't started after this long is treated as silent (ms). */
  speechStartTimeoutMs?: number
}

const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError'
const errName = (e: unknown) => (e && typeof e === 'object' && 'name' in e ? String((e as { name: unknown }).name) : '')

export class VoicePlayer {
  readonly clock: VoiceClock
  playing = false
  report: PlayReport = { source: 'idle', clip: 'none', speech: 'none' }

  private plan: VoicePlan | null = null
  /** Identifies this player to the shared element and the speech channel. */
  private readonly owner = {}
  /** Bumped by every play / stop / pause: stale async work checks it and bails. */
  private gen = 0
  private src: VoiceSource = 'idle'
  /** perf ms of t = 0 (virtual and speech timelines). */
  private start = 0
  private cps = DEFAULT_CHARS_PER_SEC
  private paused = false
  private pausedAt = 0
  /** Where the app going to the background left us: resume the line, or start it when back. */
  private bg: 'none' | 'resume' | 'restart' = 'none'
  // audio playlist
  private segs: SegTiming[] = []
  private urls: string[] = []
  private idx = 0
  private phase: 'gap' | 'play' | 'ended' = 'gap'
  private phaseStart = 0
  private audio: AudioLike | null = null
  private fellBack = false
  private gapTimer: unknown = null
  // speech
  private speechTimer: unknown = null
  private speechDone = false
  private offGesture: (() => void) | null = null
  private onPlaying: ((playing: boolean) => void) | null = null
  private onReport: ((r: PlayReport) => void) | null = null
  private readonly interrupt = () => this.stop()
  private readonly env: PlayerEnv
  private readonly opts: PlayerOptions

  constructor(env: PlayerEnv, opts: PlayerOptions = {}) {
    this.env = env
    this.opts = opts
    // a stable clock object that reads the player's state on every call
    this.clock = {
      now: () => this.now(),
      duration: () => this.duration(),
      timeAtChar: (i: number) => this.timeAtChar(i),
    }
  }

  setListener(fn: ((playing: boolean) => void) | null) {
    this.onPlaying = fn
  }

  setReportListener(fn: ((r: PlayReport) => void) | null) {
    this.onReport = fn
  }

  /** The current line's caption ("" when none). */
  get text(): string {
    return this.plan?.caption ?? ''
  }

  // ── clock ──────────────────────────────────────────────────────────────

  private now(): number {
    if (this.paused) return this.pausedAt
    switch (this.src) {
      case 'idle':
      case 'loading':
        return 0
      case 'audio':
        return this.audioNow()
      default:
        return (this.env.now() - this.start) / 1000
    }
  }

  private estimate(): number {
    return Math.max(0.5, this.text.length / this.cps)
  }

  private duration(): number {
    if (this.src === 'audio') {
      this.syncDur()
      return playlistDuration(this.segs)
    }
    return this.estimate()
  }

  private timeAtChar(i: number): number {
    if (this.src === 'audio') {
      this.syncDur()
      return playlistTimeAtChar(i, this.segs)
    }
    return scaledTimeAtChar(i, this.text.length, this.estimate())
  }

  /** The playing clip's real length, once the element knows it. */
  private syncDur() {
    const a = this.audio
    if (this.phase === 'play' && a && Number.isFinite(a.duration) && a.duration > 0 && this.segs[this.idx]) {
      this.segs[this.idx].dur = a.duration
    }
  }

  private audioNow(): number {
    this.syncDur()
    const starts = segmentStarts(this.segs)
    const t = (this.env.now() - this.phaseStart) / 1000
    if (this.phase === 'ended') return playlistDuration(this.segs) + t
    const at = starts[this.idx] ?? 0
    if (this.phase === 'play') return at + Math.max(0, this.audio?.currentTime ?? 0)
    // the pause before a clip (or its load): counts up, but never past the clip's start
    return Math.min(at, at - (this.segs[this.idx]?.gap ?? 0) + t)
  }

  // ── state helpers ──────────────────────────────────────────────────────

  private setPlaying(b: boolean) {
    if (this.playing === b) return
    this.playing = b
    this.onPlaying?.(b)
  }

  private setReport(patch: Partial<PlayReport>) {
    this.report = { ...this.report, ...patch }
    this.onReport?.(this.report)
  }

  private clearTimers() {
    if (this.gapTimer != null) this.env.clearTimeout(this.gapTimer)
    if (this.speechTimer != null) this.env.clearTimeout(this.speechTimer)
    this.gapTimer = this.speechTimer = null
  }

  /** Silence everything this player is doing (the timeline is left to the caller). */
  private halt() {
    this.gen++
    this.clearTimers()
    this.offGesture?.()
    this.offGesture = null
    const audio = this.audio
    this.audio = null
    if (audio && this.env.controlsAudio(audio, this.owner)) {
      audio.onended = null
      audio.onerror = null
      audio.pause()
    }
    this.env.releaseAudio(this.owner)
    // the speech queue is shared: only cancel it while it is ours
    if (this.src === 'speech' && !this.speechDone && !this.env.channel.heldByOther(this.owner)) this.env.speech().cancel()
    this.env.channel.release(this.owner)
    this.bg = 'none'
    this.setPlaying(false)
  }

  /** Carry on silently from `at` seconds. */
  private goVirtual(at: number) {
    this.src = 'virtual'
    this.start = this.env.now() - at * 1000
    this.paused = false
  }

  /** Done sounding (the timeline keeps counting): let the next speaker have the channel. */
  private finish() {
    this.setPlaying(false)
    this.env.releaseAudio(this.owner)
    this.env.channel.release(this.owner)
  }

  // ── public API ─────────────────────────────────────────────────────────

  /** Switch to a line (null: none) without saying it; the timeline holds at 0 until play / runSilent. */
  load(plan: VoicePlan | null) {
    this.halt()
    this.plan = plan
    this.src = 'idle'
    this.paused = false
    this.cps = DEFAULT_CHARS_PER_SEC
    this.segs = []
  }

  /** Say the line from the start (stopping whatever this player was saying). */
  async play(): Promise<void> {
    this.halt()
    const plan = this.plan
    if (!plan) return
    const gen = this.gen
    this.src = 'loading'
    this.paused = false
    this.cps = DEFAULT_CHARS_PER_SEC
    this.segs = []
    this.fellBack = false
    this.speechDone = false
    this.report = { source: 'loading', clip: 'none', speech: 'none' }
    this.setReport({})
    if (this.env.hidden()) {
      // asked to start in the background: wait, frozen at the start, and begin when back
      this.paused = true
      this.pausedAt = 0
      this.bg = 'restart'
      return
    }
    this.env.channel.take(this.owner, this.interrupt)
    const prefer = this.opts.prefer ?? 'auto'
    if (prefer === 'speech') {
      this.startSpeech(gen)
      return
    }
    const man = await this.env.loadManifest()
    if (gen !== this.gen) return
    const entries = plan.segments.map((s) => man[s.key])
    if (plan.segments.length && entries.every(Boolean)) {
      this.startAudio(gen, entries as VoiceManifestEntry[])
      return
    }
    this.setReport({ clip: 'missing', detail: plan.segments.filter((_, i) => !entries[i]).map((s) => s.key).join(', ') })
    if (prefer === 'recorded') {
      this.goVirtual(0)
      this.setReport({ source: 'virtual' })
      this.finish()
      return
    }
    this.startSpeech(gen)
  }

  /** The silent timeline from the start (sound off). */
  runSilent() {
    this.halt()
    this.goVirtual(0)
  }

  /** Say it again from the start; silently when sound is off. */
  replay(sound: boolean) {
    if (sound) void this.play()
    else this.runSilent()
  }

  /** Stop sounding; the timeline carries on silently from where it was. */
  stop() {
    const at = this.now()
    const was = this.src
    this.halt()
    if (was === 'idle') return
    this.goVirtual(at)
  }

  /** Freeze the sound AND the timeline (the app went to the background). */
  pause() {
    if (this.paused) return
    const at = this.now()
    this.paused = true
    this.pausedAt = at
    this.clearTimers()
    if (this.src === 'audio' && this.phase === 'play' && this.audio && this.env.controlsAudio(this.audio, this.owner)) {
      this.audio.pause() // keeps currentTime; the pending play() rejects with AbortError (ignored)
    } else if (this.src === 'speech') {
      this.gen++ // the cancelled utterance's callbacks are stale now
      if (!this.speechDone && !this.env.channel.heldByOther(this.owner)) this.env.speech().cancel()
    } else if (this.src === 'loading') {
      this.gen++ // the manifest arriving must not start anything; resume() restarts
    }
    this.setPlaying(false)
  }

  /** Carry on after pause(), from the same moment. */
  resume() {
    if (!this.paused) return
    const at = this.pausedAt
    this.paused = false
    const now = this.env.now()
    switch (this.src) {
      case 'loading':
        void this.play()
        return
      case 'virtual':
        this.start = now - at * 1000
        return
      case 'speech':
        this.resumeSpeech(at)
        return
      case 'audio':
        break
      default:
        return
    }
    const starts = segmentStarts(this.segs)
    if (this.phase === 'ended') {
      this.phaseStart = now - (at - playlistDuration(this.segs)) * 1000
      return
    }
    const gen = this.gen
    if (this.phase === 'gap') {
      const segStart = starts[this.idx]
      const prevEnd = segStart - this.segs[this.idx].gap
      this.phaseStart = now - (at - prevEnd) * 1000
      this.env.channel.take(this.owner, this.interrupt)
      this.gapTimer = this.env.setTimeout(() => this.beginSegment(this.idx, gen), Math.max(0, segStart - at) * 1000)
      return
    }
    const audio = this.audio
    if (!audio || !this.env.controlsAudio(audio, this.owner)) {
      this.goVirtual(at) // another player took the shared element: carry on silently
      return
    }
    this.env.channel.take(this.owner, this.interrupt)
    this.setPlaying(true)
    audio.play().catch((e: unknown) => {
      if (isAbort(e) || gen !== this.gen) return
      this.goVirtual(at)
      this.finish()
    })
  }

  /** The page was hidden / shown again (document.visibilitychange). */
  onVisibility(hidden: boolean) {
    if (hidden) {
      if (this.paused || this.src === 'idle') return
      const restart = this.src === 'loading'
      this.pause()
      this.bg = restart ? 'restart' : 'resume'
      return
    }
    const how = this.bg
    this.bg = 'none'
    if (how === 'none' || !this.paused) return
    if (how === 'restart') void this.play()
    else this.resume()
  }

  /** Unmounting: stop everything and forget the line. */
  dispose() {
    this.halt()
    this.plan = null
    this.src = 'idle'
    this.paused = false
  }

  // ── recorded clips ─────────────────────────────────────────────────────

  private startAudio(gen: number, entries: VoiceManifestEntry[]) {
    const plan = this.plan!
    this.segs = plan.segments.map((s, i) => ({
      capStart: s.capStart,
      capEnd: s.capEnd,
      gap: s.gap,
      dur: entries[i].duration ?? Math.max(0.3, s.text.length / DEFAULT_CHARS_PER_SEC),
      aligned: null,
    }))
    this.urls = entries.map((e) => this.env.clipUrl(e.file))
    entries.forEach((e, i) => {
      if (!e.words) return
      void this.env.loadWords(e.words).then((w) => {
        const seg = this.segs[i]
        if (gen !== this.gen || !w || !seg) return
        seg.aligned = alignCaptionWords(plan.caption, seg.capStart, seg.capEnd, w)
      })
    })
    this.audio = this.env.claimAudio(this.owner) ?? this.env.newAudio()
    this.src = 'audio'
    this.setReport({ source: 'audio', duration: playlistDuration(this.segs) })
    this.playSegment(0, gen)
  }

  private playSegment(i: number, gen: number) {
    this.idx = i
    this.phase = 'gap'
    this.phaseStart = this.env.now()
    const wait = this.segs[i].gap
    if (wait > 0) this.gapTimer = this.env.setTimeout(() => this.beginSegment(i, gen), wait * 1000)
    else this.beginSegment(i, gen)
  }

  private beginSegment(i: number, gen: number) {
    this.gapTimer = null
    if (gen !== this.gen || this.paused) return
    const audio = this.audio
    if (!audio || !this.env.controlsAudio(audio, this.owner)) {
      this.goVirtual(this.now()) // the shared element went to another player: carry on silently
      this.finish()
      return
    }
    this.phase = 'play'
    audio.onended = () => {
      if (gen === this.gen) this.segmentEnded(i, gen)
    }
    audio.onerror = () => this.audioFailed(gen, `clip ${i + 1} failed to load`)
    audio.src = this.urls[i]
    this.setPlaying(true)
    let started: Promise<void>
    try {
      started = audio.play()
    } catch (e) {
      this.audioFailed(gen, String(e))
      return
    }
    Promise.resolve(started).then(
      () => {
        if (gen !== this.gen || i !== 0 || this.report.clip !== 'none') return
        this.setReport({ clip: 'loaded' })
      },
      (e: unknown) => {
        // AbortError = we paused it or swapped the clip ourselves: not a failure.
        if (isAbort(e) || gen !== this.gen) return
        if (errName(e) === 'NotAllowedError') this.blocked(gen)
        else this.audioFailed(gen, e instanceof Error ? e.message : String(e))
      },
    )
  }

  private segmentEnded(i: number, gen: number) {
    const a = this.audio
    this.syncDur()
    if (a && !(Number.isFinite(a.duration) && a.duration > 0) && a.currentTime > 0) this.segs[i].dur = a.currentTime
    if (i === 0 && this.report.clip === 'none') this.setReport({ clip: 'loaded' })
    if (i + 1 < this.segs.length) {
      this.playSegment(i + 1, gen)
      return
    }
    this.phase = 'ended'
    this.phaseStart = this.env.now()
    this.setReport({ duration: playlistDuration(this.segs) })
    this.finish()
  }

  /** A clip wouldn't play: say the line with device speech instead (once). */
  private audioFailed(gen: number, why: string) {
    if (gen !== this.gen || this.fellBack) return
    this.fellBack = true
    const audio = this.audio
    this.audio = null
    if (audio && this.env.controlsAudio(audio, this.owner)) {
      audio.onended = null
      audio.onerror = null
      audio.pause()
    }
    this.env.releaseAudio(this.owner)
    this.setReport({ clip: 'error', detail: why })
    if ((this.opts.prefer ?? 'auto') === 'recorded') {
      this.goVirtual(this.now())
      this.finish()
      return
    }
    this.segs = []
    this.startSpeech(gen)
  }

  /** The browser refused to start sound before a tap (autoplay policy): stay silent, say it on the first tap. */
  private blocked(gen: number) {
    const at = this.now()
    const audio = this.audio
    this.audio = null
    if (audio && this.env.controlsAudio(audio, this.owner)) audio.pause()
    this.goVirtual(at)
    this.setReport({ clip: 'blocked', source: 'virtual' })
    this.finish()
    if (this.env.onceGesture) {
      this.offGesture = this.env.onceGesture(() => {
        this.offGesture = null
        if (gen === this.gen) void this.play()
      })
    }
  }

  // ── device speech ──────────────────────────────────────────────────────

  private startSpeech(gen: number) {
    const sp = this.env.speech()
    this.src = 'speech'
    this.cps = DEFAULT_CHARS_PER_SEC
    this.start = this.env.now()
    if (!sp.available() || !this.text) {
      this.speechDone = true
      this.src = 'virtual'
      this.setReport({ source: 'virtual', speech: this.text ? 'unavailable' : 'none' })
      this.finish()
      return
    }
    this.setReport({ source: 'speech' })
    this.speakFrom(gen, 0)
  }

  private resumeSpeech(at: number) {
    const text = this.text
    let from = Math.min(text.length, Math.round(at * this.cps))
    while (from > 0 && /\S/.test(text[from - 1])) from-- // back to the start of that word
    if (this.speechDone || from >= text.length - 1) {
      this.start = this.env.now() - at * 1000 // nothing left to say: keep counting
      return
    }
    this.env.channel.take(this.owner, this.interrupt)
    this.speakFrom(++this.gen, from)
  }

  private speakFrom(gen: number, from: number) {
    const sp = this.env.speech()
    const offset = from / this.cps
    this.start = this.env.now() - offset * 1000
    this.speechDone = false
    let started = false
    const done = () => {
      this.speechDone = true
      if (this.speechTimer != null) this.env.clearTimeout(this.speechTimer)
      this.speechTimer = null
      this.finish()
    }
    // Some WebViews have speechSynthesis but never say anything (no voices installed):
    // no `start` soon means silent, so don't claim to be playing forever.
    this.speechTimer = this.env.setTimeout(() => {
      if (gen !== this.gen || started) return
      this.setReport({ speech: 'silent' })
      sp.cancel()
      done()
    }, this.opts.speechStartTimeoutMs ?? 2500)
    this.setPlaying(true)
    sp.speak(
      this.text.slice(from),
      {
        onStart: () => {
          if (gen !== this.gen) return
          started = true
          this.start = this.env.now() - offset * 1000
          this.setReport({ speech: 'started' })
          // and some never send `end`: stop claiming to play well after it should be over
          if (this.speechTimer != null) this.env.clearTimeout(this.speechTimer)
          this.speechTimer = this.env.setTimeout(() => {
            if (gen === this.gen) done()
          }, (this.estimate() * 2 + 3) * 1000)
        },
        onBoundary: (charIndex) => {
          if (gen !== this.gen) return
          const elapsed = (this.env.now() - this.start) / 1000
          const at = charIndex + from
          // learn the voice's real pace from word boundaries (where engines send them)
          if (elapsed > 0.4 && at > 8) this.cps = at / elapsed
        },
        onEnd: () => {
          if (gen === this.gen) done()
        },
        onError: (error) => {
          if (gen !== this.gen) return
          if (error !== 'interrupted' && error !== 'canceled') this.setReport({ speech: 'error', detail: error })
          done()
        },
      },
      { rate: this.opts.rate },
    )
  }
}

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { claimNarrationAudio, installAudioUnlock, resetAudioUnlockForTests } from '../audioUnlock'
import { sfx } from '../../../lib/sound'
import { voice } from '../../../games/_juice/voice'
import { useProgress } from '../../../store/progress'

// App stores (Amazon's among them) check that an app goes silent when it is
// sent to the background. These drive jsdom's visibility events.

function setVisibility(v: 'hidden' | 'visible') {
  Object.defineProperty(document, 'visibilityState', { value: v, configurable: true })
  Object.defineProperty(document, 'hidden', { value: v === 'hidden', configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

/** An effect node: records how it was stopped (a number = scheduled, undefined = right now). */
class FakeNode extends EventTarget {
  stops: Array<number | undefined> = []
  frequency = { setValueAtTime() {}, exponentialRampToValueAtTime() {} }
  Q = { value: 0 }
  type = ''
  buffer: unknown = null
  connect<T>(next: T): T {
    return next
  }
  start() {}
  stop(when?: number) {
    this.stops.push(when)
  }
  /** The browser finished playing it. */
  end() {
    this.dispatchEvent(new Event('ended'))
  }
  get stoppedNow() {
    return this.stops.includes(undefined)
  }
}

/** Minimal AudioContext: suspended until resumed, like every browser before a gesture. */
class FakeContext {
  static last: FakeContext | null = null
  state: 'suspended' | 'running' | 'interrupted' = 'suspended'
  currentTime = 0
  sampleRate = 8000
  destination = {}
  nodes: FakeNode[] = []
  constructor() {
    FakeContext.last = this
  }
  resume() {
    this.state = 'running'
    return Promise.resolve()
  }
  suspend() {
    this.state = 'suspended'
    return Promise.resolve()
  }
  private node() {
    const n = new FakeNode()
    this.nodes.push(n)
    return n
  }
  createOscillator() {
    return this.node()
  }
  createBufferSource() {
    return this.node()
  }
  createGain() {
    return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: <T>(n: T) => n }
  }
  createBiquadFilter() {
    return { type: '', Q: { value: 0 }, frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: <T>(n: T) => n }
  }
  createBuffer() {
    return { getChannelData: () => new Float32Array(1) }
  }
}

/** A browser-like <audio>: play() stays pending until start(); pause() rejects it with AbortError. */
class FakeAudio {
  static instances: FakeAudio[] = []
  static autoStart = true
  paused = true
  src = ''
  preload = ''
  pauses = 0
  private pending?: { resolve: () => void; reject: (e: unknown) => void }
  constructor() {
    FakeAudio.instances.push(this)
  }
  play() {
    this.paused = false
    const p = new Promise<void>((resolve, reject) => {
      this.pending = { resolve, reject }
    })
    if (FakeAudio.autoStart) this.pending?.resolve()
    return p
  }
  pause() {
    this.paused = true
    this.pauses++
    this.pending?.reject(new DOMException('The play() request was interrupted by a call to pause().', 'AbortError'))
    this.pending = undefined
  }
}

const speech = { speak: vi.fn(), cancel: vi.fn(), getVoices: () => [], speaking: false, pending: false }
let off: () => void

beforeEach(() => {
  vi.useFakeTimers()
  resetAudioUnlockForTests()
  FakeAudio.instances = []
  FakeAudio.autoStart = true
  speech.speak.mockReset()
  speech.cancel.mockReset()
  vi.stubGlobal('AudioContext', FakeContext)
  vi.stubGlobal('Audio', FakeAudio)
  vi.stubGlobal('speechSynthesis', speech)
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      text: string
      volume = 1
      constructor(text: string) {
        this.text = text
      }
    },
  )
  useProgress.setState({ soundEnabled: true })
  setVisibility('visible')
  off = installAudioUnlock()
})

afterEach(() => {
  off()
  resetAudioUnlockForTests()
  setVisibility('visible')
  delete (document as { visibilityState?: unknown }).visibilityState
  delete (document as { hidden?: unknown }).hidden
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('going to the background silences everything', () => {
  it('stops the sound effects (and the notes still queued), suspends the context, and wakes it on return', () => {
    window.dispatchEvent(new Event('touchend')) // the first tap creates and wakes the effects context
    const ctx = FakeContext.last!
    expect(ctx.state).toBe('running')

    const before = ctx.nodes.length // (the unlock's silent primer)
    sfx.fanfare() // a jingle: some notes start now, some a beat later
    const jingle = ctx.nodes.slice(before)
    const playing = ctx.nodes.length
    expect(jingle.length).toBeGreaterThan(4)
    jingle[0].end() // one note already finished on its own

    setVisibility('hidden')
    expect(ctx.state).toBe('suspended')
    expect(jingle.slice(1).every((n) => n.stoppedNow)).toBe(true)
    expect(jingle[0].stoppedNow).toBe(false) // a finished note is left alone

    // a game timer that fires in the background makes no sound
    setTimeout(() => sfx.correct(), 1000)
    vi.advanceTimersByTime(5000)
    sfx.coin()
    expect(ctx.nodes).toHaveLength(playing)

    setVisibility('visible')
    expect(ctx.state).toBe('running')
    sfx.coin()
    expect(ctx.nodes.length).toBeGreaterThan(playing)
  })

  it('pauses the shared narration element and stops speech', async () => {
    window.dispatchEvent(new Event('click')) // unlocks the shared narration element (iOS)
    await vi.advanceTimersByTimeAsync(0)
    const el = claimNarrationAudio({})!
    expect(el).not.toBeNull()
    el.src = 'tts/fractions/a.mp3'
    void el.play()
    expect(el.paused).toBe(false)

    setVisibility('hidden')
    expect(el.paused).toBe(true)
    expect(speech.cancel).toHaveBeenCalled()
    // returning doesn't restart it here: the lesson player resumes it with its clock
    setVisibility('visible')
    expect(el.paused).toBe(true)
  })

  it("leaves a silent unlock clip that's still starting alone, so the iOS unlock completes", async () => {
    FakeAudio.autoStart = false
    window.dispatchEvent(new Event('click'))
    const [el] = FakeAudio.instances
    expect(el.paused).toBe(false) // the silent clip is starting inside the tap
    setVisibility('hidden')
    expect(el.pauses).toBe(0)
    setVisibility('visible')
    await vi.advanceTimersByTimeAsync(0)
  })

  it('mini-game chants stay quiet in the background', () => {
    setVisibility('hidden')
    voice.say('three')
    expect(speech.speak).not.toHaveBeenCalled()
    setVisibility('visible')
    voice.say('three')
    expect(speech.speak).toHaveBeenCalledTimes(1)
  })

  it('pagehide silences too (the page being put away or closed)', () => {
    window.dispatchEvent(new Event('touchend'))
    const ctx = FakeContext.last!
    sfx.pop()
    window.dispatchEvent(new Event('pagehide'))
    expect(ctx.state).toBe('suspended')
    expect(ctx.nodes.at(-1)!.stoppedNow).toBe(true)
    expect(speech.cancel).toHaveBeenCalled()
  })
})

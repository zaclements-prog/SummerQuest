import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, createElement, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useNarration } from '../narration'
import { useProgress } from '../../store/progress'
import { installAudioUnlock, resetAudioUnlockForTests } from '../../platform/web/audioUnlock'

// React's act() warns unless this flag is set in non-RTL environments.
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/**
 * The app going to the background (home button, another app, screen locked)
 * must leave the lesson silent AND its clock frozen, then carry both on from
 * the same moment, so the voice and the motion graphics never drift apart.
 */

/** A browser-like <audio>: play() stays pending until start(); pause() or a new src rejects it with AbortError. */
class FakeAudio {
  static instances: FakeAudio[] = []
  onended: (() => void) | null = null
  onerror: (() => void) | null = null
  paused = true
  currentTime = 0
  duration = 8
  preload = ''
  played: string[] = []
  private _src = ''
  private pending?: { resolve: () => void; reject: (e: unknown) => void }
  constructor(src?: string) {
    if (src) this._src = src
    FakeAudio.instances.push(this)
  }
  get src() {
    return this._src
  }
  set src(v: string) {
    this.abort()
    this._src = v
    this.currentTime = 0
    this.paused = true
  }
  play() {
    this.paused = false
    this.played.push(this._src)
    return new Promise<void>((resolve, reject) => {
      this.pending = { resolve, reject }
    })
  }
  start() {
    this.pending?.resolve()
    this.pending = undefined
  }
  pause() {
    this.paused = true
    this.abort()
  }
  private abort() {
    this.pending?.reject(new DOMException('The play() request was interrupted.', 'AbortError'))
    this.pending = undefined
  }
}

const CLIP = '/tts/fractions/a.mp3'
const TEXT = 'Two halves make one whole, and four quarters make one whole too.'
const speech = { speak: vi.fn(), cancel: vi.fn(), getVoices: () => [], speaking: false, pending: false }
/** What was said aloud (ignores the first tap's empty priming utterance). */
const spoken = () => speech.speak.mock.calls.map((c) => (c[0] as { text: string }).text).filter((t) => t !== '')
const clipPlays = () => FakeAudio.instances.flatMap((a) => a.played).filter((s) => s === CLIP).length
const clipElement = () => FakeAudio.instances.find((a) => a.src === CLIP)!

let manifestDelay = 0
const fetchMock = vi.fn(
  () =>
    new Promise((resolve) =>
      setTimeout(
        () => resolve({ ok: true, json: async () => ({ 'fractions/a': { file: 'tts/fractions/a.mp3', hash: 'x' } }) }),
        manifestDelay,
      ),
    ),
)

let root: Root
let api: ReturnType<typeof useNarration>
let off: () => void

function Harness({ step }: { step: string }) {
  const narration = useNarration('fractions', step, TEXT)
  useEffect(() => {
    api = narration
  })
  return null
}

const tick = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })

function setVisibility(v: 'hidden' | 'visible') {
  act(() => {
    Object.defineProperty(document, 'visibilityState', { value: v, configurable: true })
    Object.defineProperty(document, 'hidden', { value: v === 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

async function mount(step: string) {
  act(() => root.render(createElement(Harness, { step })))
  await tick(10)
}

beforeEach(() => {
  vi.useFakeTimers()
  resetAudioUnlockForTests()
  FakeAudio.instances = []
  manifestDelay = 0
  fetchMock.mockClear()
  speech.speak.mockReset()
  speech.cancel.mockReset()
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
  vi.stubGlobal('fetch', fetchMock)
  useProgress.setState({ soundEnabled: true })
  setVisibility('visible')
  off = installAudioUnlock() // the app-wide silencer runs too, as in the app
  root = createRoot(document.createElement('div'))
})

afterEach(() => {
  act(() => root.unmount())
  off()
  resetAudioUnlockForTests()
  setVisibility('visible')
  delete (document as { visibilityState?: unknown }).visibilityState
  delete (document as { hidden?: unknown }).hidden
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('narration and the app going to the background', () => {
  // First: the clip list (manifest) is still uncached, so its fetch is in flight.
  it('a step sent to the background while its clip is still loading starts when the kid is back', async () => {
    manifestDelay = 500
    await mount('a')
    expect(fetchMock).toHaveBeenCalled()
    setVisibility('hidden')
    await tick(2000) // the clip list arrives while hidden
    expect(clipPlays()).toBe(0)
    expect(spoken()).toEqual([])
    expect(api.clock.now()).toBeLessThan(0.05)

    setVisibility('visible')
    await tick(10)
    expect(clipPlays()).toBe(1)
    expect(api.paused).toBe(false)
  })

  it('pauses the clip and freezes the clock, then plays on from the same moment', async () => {
    await mount('a')
    const audio = clipElement()
    audio.start()
    audio.currentTime = 2.5
    expect(api.playing).toBe(true)

    setVisibility('hidden')
    expect(audio.paused).toBe(true)
    expect(api.paused).toBe(true)
    expect(api.clock.now()).toBe(2.5)
    await tick(60_000)
    expect(api.clock.now()).toBe(2.5)
    expect(audio.paused).toBe(true)

    setVisibility('visible')
    expect(audio.paused).toBe(false)
    expect(clipPlays()).toBe(2) // play() again on the same element, from currentTime
    expect(audio.currentTime).toBe(2.5)
    expect(api.playing).toBe(true)
    expect(api.clock.now()).toBe(2.5)
    await tick(10)
    expect(spoken()).toEqual([]) // the paused clip's AbortError never fell back to speech
  })

  it('works with the shared, tap-unlocked element (iOS)', async () => {
    act(() => window.dispatchEvent(new Event('click'))) // first tap: unlock the shared element
    FakeAudio.instances[0].start()
    await tick(0)
    await mount('a')
    const shared = FakeAudio.instances[0]
    expect(FakeAudio.instances).toHaveLength(1) // the clip reuses the unlocked element
    expect(shared.src).toBe(CLIP)
    shared.start()
    shared.currentTime = 1.25

    setVisibility('hidden')
    expect(shared.paused).toBe(true)
    expect(api.clock.now()).toBe(1.25)
    await tick(30_000)

    setVisibility('visible')
    expect(shared.paused).toBe(false)
    expect(shared.played.filter((s) => s === CLIP)).toHaveLength(2)
    expect(api.clock.now()).toBe(1.25)
  })

  it('stops browser speech and freezes its timeline, then speaks on from that word', async () => {
    await mount('b') // no clip for this step: browser speech
    expect(spoken()).toEqual([TEXT])
    await tick(2000)
    const before = api.clock.now()
    expect(before).toBeGreaterThan(1.9)

    setVisibility('hidden')
    expect(speech.cancel).toHaveBeenCalled()
    const frozen = api.clock.now()
    await tick(60_000)
    expect(api.clock.now()).toBe(frozen)

    setVisibility('visible')
    const again = spoken()
    expect(again).toHaveLength(2)
    const rest = again[1]
    expect(rest.length).toBeLessThan(TEXT.length)
    expect(TEXT.endsWith(rest)).toBe(true)
    expect(TEXT[TEXT.length - rest.length - 1]).toMatch(/\s/) // from the start of a word
    await tick(100)
    expect(api.clock.now()).toBeGreaterThan(frozen)
    expect(api.clock.now()).toBeLessThan(frozen + 0.2) // not the minute spent away
  })

  it('freezes the silent timeline too (sound off)', async () => {
    useProgress.setState({ soundEnabled: false })
    await mount('a')
    await tick(1500)
    setVisibility('hidden')
    const frozen = api.clock.now()
    await tick(60_000)
    expect(api.clock.now()).toBe(frozen)
    setVisibility('visible')
    await tick(100)
    expect(api.clock.now()).toBeGreaterThan(frozen)
    expect(api.clock.now()).toBeLessThan(frozen + 0.2)
    expect(clipPlays()).toBe(0)
  })

  it("a narration the kid paused stays paused when the app comes back", async () => {
    await mount('a')
    const audio = clipElement()
    audio.start()
    audio.currentTime = 3
    act(() => api.pause())
    setVisibility('hidden')
    await tick(5000)
    setVisibility('visible')
    expect(audio.paused).toBe(true)
    expect(api.paused).toBe(true)
    expect(clipPlays()).toBe(1)
    expect(api.clock.now()).toBe(3)
  })

  it('a step that opens while the app is hidden waits silently for the kid', async () => {
    setVisibility('hidden')
    await mount('a')
    await tick(5000)
    expect(clipPlays()).toBe(0)
    expect(spoken()).toEqual([])
    expect(api.clock.now()).toBeLessThan(0.05)

    setVisibility('visible')
    await tick(10)
    expect(clipPlays()).toBe(1)
  })
})

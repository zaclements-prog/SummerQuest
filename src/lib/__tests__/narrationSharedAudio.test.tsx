import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, createElement, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useNarration } from '../narration'
import { useProgress } from '../../store/progress'
import { installAudioUnlock, resetAudioUnlockForTests } from '../../platform/web/audioUnlock'

// React's act() warns unless this flag is set in non-RTL environments.
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/**
 * Fake <audio> that behaves like a browser's: play() stays pending until the
 * clip actually starts (start()), and pause() or a new `src` rejects a pending
 * play() with AbortError.
 */
class FakeAudio {
  static instances: FakeAudio[] = []
  onended: (() => void) | null = null
  onerror: (() => void) | null = null
  paused = true
  currentTime = 0
  duration = NaN
  preload = ''
  /** Every src that play() was called with, in order. */
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
    this.abort('interrupted by a new load request')
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
    this.abort('interrupted by a call to pause()')
  }
  private abort(why: string) {
    this.pending?.reject(new DOMException(`The play() request was ${why}.`, 'AbortError'))
    this.pending = undefined
  }
}

const speak = vi.fn()
/** What was actually said aloud (the first tap primes speech with one empty utterance). */
const spoken = () => speak.mock.calls.map((c) => (c[0] as { text: string }).text).filter((t) => t !== '')
let root: Root
let api: ReturnType<typeof useNarration>

function Harness({ step }: { step: string }) {
  const narration = useNarration('fractions', step, `narration for ${step}`)
  useEffect(() => {
    api = narration
  })
  return null
}

const flush = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 5))
  })

/** The first tap: touchend carries user activation on iOS. */
async function tap() {
  await act(async () => {
    window.dispatchEvent(new Event('touchend'))
  })
}

beforeEach(() => {
  resetAudioUnlockForTests()
  FakeAudio.instances = []
  speak.mockReset()
  vi.stubGlobal('Audio', FakeAudio)
  vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn(), getVoices: () => [], speaking: false, pending: false })
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
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        'fractions/a': { file: 'tts/fractions/a.mp3', hash: 'x' },
        'fractions/b': { file: 'tts/fractions/b.mp3', hash: 'y' },
      }),
    })),
  )
  useProgress.setState({ soundEnabled: true })
  root = createRoot(document.createElement('div'))
  installAudioUnlock()
})

afterEach(() => {
  act(() => root.unmount())
  resetAudioUnlockForTests()
  vi.unstubAllGlobals()
})

describe('narration on one shared, gesture-unlocked <audio> (iOS)', () => {
  it('unlocks one element on the first tap and reuses it for every clip', async () => {
    await tap()
    expect(FakeAudio.instances).toHaveLength(1)
    const el = FakeAudio.instances[0]
    // the unlock plays a silent clip inside the gesture
    expect(el.played).toHaveLength(1)
    expect(el.played[0]).toMatch(/^data:audio\/wav;base64,/)
    await act(async () => el.start())
    expect(el.paused).toBe(true) // silent clip stopped again; nobody owns it yet

    act(() => root.render(createElement(Harness, { step: 'a' })))
    await flush()
    expect(FakeAudio.instances).toHaveLength(1)
    expect(el.src).toMatch(/tts\/fractions\/a\.mp3$/)
    expect(el.paused).toBe(false)
    expect(api.playing).toBe(true)

    act(() => root.render(createElement(Harness, { step: 'b' })))
    await flush()
    expect(FakeAudio.instances).toHaveLength(1) // no new element: iOS would block one
    expect(el.src).toMatch(/tts\/fractions\/b\.mp3$/)
    expect(el.paused).toBe(false)
    expect(el.played.slice(1).map((s) => s.split('/').pop())).toEqual(['a.mp3', 'b.mp3'])
    // the AbortErrors from swapping clips never trigger the speech fallback
    expect(spoken()).toEqual([])

    act(() => root.unmount())
    expect(el.paused).toBe(true)
    root = createRoot(document.createElement('div')) // for afterEach
  })

  it('pauses and resumes the clip in place on the shared element', async () => {
    await tap()
    const el = FakeAudio.instances[0]
    await act(async () => el.start())
    act(() => root.render(createElement(Harness, { step: 'a' })))
    await flush()
    el.currentTime = 1.5
    act(() => api.pause())
    expect(el.paused).toBe(true)
    expect(api.clock.now()).toBe(1.5)
    act(() => api.resume())
    expect(el.paused).toBe(false)
    expect(el.src).toMatch(/a\.mp3$/) // same clip, carried on — not reloaded
    expect(FakeAudio.instances).toHaveLength(1)
    await flush()
    expect(spoken()).toEqual([])
  })

  it('a clip ending on the shared element ends only the current step', async () => {
    await tap()
    const el = FakeAudio.instances[0]
    await act(async () => el.start())
    act(() => root.render(createElement(Harness, { step: 'a' })))
    await flush()
    act(() => el.onended?.())
    expect(api.playing).toBe(false)
    act(() => root.render(createElement(Harness, { step: 'b' })))
    await flush()
    expect(api.playing).toBe(true)
    expect(el.src).toMatch(/b\.mp3$/)
  })

  it('without a gesture yet, each clip still gets its own element (desktop autoplay path)', async () => {
    act(() => root.render(createElement(Harness, { step: 'a' })))
    await flush()
    act(() => root.render(createElement(Harness, { step: 'b' })))
    await flush()
    expect(FakeAudio.instances).toHaveLength(2)
    expect(FakeAudio.instances[0].paused).toBe(true)
    expect(FakeAudio.instances[1].paused).toBe(false)
  })

  it('primes speech once, with a silent empty utterance', async () => {
    await tap()
    await tap()
    expect(speak).toHaveBeenCalledTimes(1)
    const u = speak.mock.calls[0][0] as { text: string; volume: number }
    expect(u.text).toBe('')
    expect(u.volume).toBe(0)
  })

  it('a touch pointerdown alone does not count as the unlocking gesture', async () => {
    await act(async () => {
      window.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerType: 'touch' }))
    })
    expect(FakeAudio.instances).toHaveLength(0)
    expect(speak).not.toHaveBeenCalled()
    await tap()
    expect(FakeAudio.instances).toHaveLength(1)
  })

  it('retries the unlock on the next gesture when the browser refused it', async () => {
    await tap()
    const el = FakeAudio.instances[0]
    // the browser said no (e.g. not an activating event on this engine): play() rejects, still paused
    await act(async () => {
      el.paused = true
      ;(el as unknown as { pending: { reject: (e: unknown) => void } }).pending.reject(
        new DOMException('not allowed', 'NotAllowedError'),
      )
    })
    act(() => root.render(createElement(Harness, { step: 'a' })))
    await flush()
    // still locked: this clip got a private element
    expect(FakeAudio.instances).toHaveLength(2)
    act(() => root.unmount())
    root = createRoot(document.createElement('div'))
    await tap()
    expect(el.played.filter((s) => s.startsWith('data:'))).toHaveLength(2)
  })
})

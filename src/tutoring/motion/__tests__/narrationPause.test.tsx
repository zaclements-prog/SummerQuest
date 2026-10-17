import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, createElement, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useNarration } from '../../../lib/narration'
import { useProgress } from '../../../store/progress'

// React's act() warns unless this flag is set in non-RTL environments.
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/** Fake <audio> with a settable playhead; pause() rejects the pending play() like browsers do. */
class FakeAudio {
  static instances: FakeAudio[] = []
  onended: (() => void) | null = null
  onerror: (() => void) | null = null
  paused = true
  currentTime = 0
  duration = 8
  plays = 0
  src: string
  private reject?: (e: unknown) => void
  constructor(src: string) {
    this.src = src
    FakeAudio.instances.push(this)
  }
  play() {
    this.paused = false
    this.plays++
    return new Promise<void>((_res, rej) => {
      this.reject = rej
    })
  }
  pause() {
    this.paused = true
    this.reject?.(new DOMException('The play() request was interrupted by a call to pause().', 'AbortError'))
  }
}

const speak = vi.fn()
let root: Root
let api: ReturnType<typeof useNarration>

function Harness() {
  const narration = useNarration('fractions', 'a', 'narration for a step that is long enough to keep talking')
  useEffect(() => {
    api = narration
  })
  return null
}

const wait = (ms: number) => act(async () => {
  await new Promise((r) => setTimeout(r, ms))
})

beforeEach(() => {
  FakeAudio.instances = []
  speak.mockReset()
  vi.stubGlobal('Audio', FakeAudio)
  vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn(), getVoices: () => [] })
  vi.stubGlobal('SpeechSynthesisUtterance', class {
    text: string
    constructor(text: string) {
      this.text = text
    }
  })
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ 'fractions/a': { file: 'tts/fractions/a.mp3', hash: 'x' } }) })))
  root = createRoot(document.createElement('div'))
})

afterEach(() => {
  act(() => root.unmount())
  vi.unstubAllGlobals()
})

describe('narration pause / resume (the lesson player freezes visuals with the voice)', () => {
  it('freezes and resumes the silent timeline when sound is off', async () => {
    useProgress.setState({ soundEnabled: false })
    act(() => root.render(createElement(Harness)))
    await wait(30)
    act(() => api.pause())
    expect(api.paused).toBe(true)
    const frozen = api.clock.now()
    await wait(40)
    expect(api.clock.now()).toBe(frozen)
    act(() => api.resume())
    expect(api.paused).toBe(false)
    await wait(40)
    expect(api.clock.now()).toBeGreaterThan(frozen)
    // and it carried on from where it froze, not from the start
    expect(api.clock.now()).toBeLessThan(frozen + 1)
  })

  it('pauses the clip in place and plays it on from there', async () => {
    useProgress.setState({ soundEnabled: true })
    act(() => root.render(createElement(Harness)))
    await wait(10)
    const audio = FakeAudio.instances[0]
    expect(audio.paused).toBe(false)
    audio.currentTime = 2.5
    act(() => api.pause())
    expect(audio.paused).toBe(true)
    expect(api.playing).toBe(false)
    expect(api.paused).toBe(true)
    audio.currentTime = 2.5
    expect(api.clock.now()).toBe(2.5)
    act(() => api.resume())
    expect(audio.paused).toBe(false)
    expect(audio.plays).toBe(2)
    expect(api.playing).toBe(true)
    await wait(10)
    // the AbortError from pausing never triggers the speech fallback
    expect(speak).not.toHaveBeenCalled()
  })

  it('replay clears a pause and restarts from zero', async () => {
    useProgress.setState({ soundEnabled: false })
    act(() => root.render(createElement(Harness)))
    await wait(60)
    act(() => api.pause())
    act(() => api.replay())
    expect(api.paused).toBe(false)
    expect(api.clock.now()).toBeLessThan(0.05)
  })
})

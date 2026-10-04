import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, createElement, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useNarration } from '../narration'
import { useProgress } from '../../store/progress'

// React's act() warns unless this flag is set in non-RTL environments.
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/** Fake <audio>: play() stays pending until resolved, and pause() rejects it with AbortError (like browsers). */
class FakeAudio {
  static instances: FakeAudio[] = []
  onended: (() => void) | null = null
  onerror: (() => void) | null = null
  paused = true
  src: string
  private reject?: (e: unknown) => void
  constructor(src: string) {
    this.src = src
    FakeAudio.instances.push(this)
  }
  play() {
    this.paused = false
    return new Promise<void>((_res, rej) => {
      this.reject = rej
    })
  }
  pause() {
    this.paused = true
    this.reject?.(new DOMException('The play() request was interrupted by a call to pause().', 'AbortError'))
  }
  fail() {
    this.onerror?.()
    this.reject?.(new DOMException('no supported source', 'NotSupportedError'))
  }
}

const speak = vi.fn()
let root: Root
let container: HTMLDivElement
let api: ReturnType<typeof useNarration>

function Harness({ step }: { step: string }) {
  const narration = useNarration('fractions', step, `narration for ${step}`)
  useEffect(() => {
    api = narration
  })
  return null
}

const flush = () => act(async () => {
  await new Promise((r) => setTimeout(r, 5))
})

beforeEach(() => {
  FakeAudio.instances = []
  speak.mockReset()
  vi.stubGlobal('Audio', FakeAudio)
  vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn(), getVoices: () => [] })
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      text: string
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
  container = document.createElement('div')
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  vi.unstubAllGlobals()
})

describe('useNarration', () => {
  it('plays the step clip and stops it (silently) when the step changes', async () => {
    act(() => root.render(createElement(Harness, { step: 'a' })))
    await flush()
    expect(FakeAudio.instances).toHaveLength(1)
    act(() => root.render(createElement(Harness, { step: 'b' })))
    await flush()
    expect(FakeAudio.instances[0].paused).toBe(true)
    // The AbortError from pausing must not trigger the speech fallback.
    expect(speak).not.toHaveBeenCalled()
  })

  it('says nothing after the lesson is left mid-load', async () => {
    act(() => root.render(createElement(Harness, { step: 'a' })))
    await flush()
    act(() => root.unmount())
    await flush()
    expect(speak).not.toHaveBeenCalled()
    root = createRoot(container) // for afterEach
  })

  it('falls back to speech exactly once when the clip fails', async () => {
    act(() => root.render(createElement(Harness, { step: 'a' })))
    await flush()
    act(() => FakeAudio.instances[0].fail())
    await flush()
    expect(speak).toHaveBeenCalledTimes(1)
  })

  it('stops when sound is switched off', async () => {
    act(() => root.render(createElement(Harness, { step: 'a' })))
    await flush()
    expect(api.playing).toBe(true)
    act(() => useProgress.setState({ soundEnabled: false }))
    await flush()
    expect(FakeAudio.instances[0].paused).toBe(true)
    expect(api.playing).toBe(false)
    expect(speak).not.toHaveBeenCalled()
  })
})

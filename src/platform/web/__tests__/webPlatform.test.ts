import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { installAudioUnlock, resetAudioUnlockForTests } from '../audioUnlock'
import { persistStorageAfterFirstGesture } from '../storage'
import { installTouchGuards } from '../touchGuards'

/** Minimal AudioContext: starts suspended, like every browser before a gesture. */
class FakeContext {
  static last: FakeContext | null = null
  state: 'suspended' | 'running' | 'interrupted' = 'suspended'
  resumes = 0
  destination = {}
  constructor() {
    FakeContext.last = this
  }
  resume() {
    this.resumes++
    this.state = 'running'
    return Promise.resolve()
  }
  createBuffer() {
    return {}
  }
  createBufferSource() {
    return { buffer: null, connect: () => {}, start: () => {} }
  }
}

describe('effects AudioContext unlock', () => {
  let off: () => void
  beforeEach(() => {
    resetAudioUnlockForTests()
    vi.stubGlobal('AudioContext', FakeContext)
    vi.stubGlobal('Audio', class {
      paused = true
      src = ''
      play() {
        return Promise.resolve()
      }
      pause() {}
    })
    off = installAudioUnlock()
  })
  afterEach(() => {
    off()
    resetAudioUnlockForTests()
    vi.unstubAllGlobals()
  })

  it('wakes on touchend and again after the app comes back from the background', async () => {
    window.dispatchEvent(new Event('touchend'))
    const c = FakeContext.last!
    expect(c).toBeTruthy()
    expect(c.state).toBe('running')
    const before = c.resumes
    // iOS suspends ("interrupted") the context while the app is in the background
    c.state = 'interrupted'
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(c.resumes).toBe(before + 1)
    expect(c.state).toBe('running')
    // ...and any later tap resumes it too
    c.state = 'suspended'
    window.dispatchEvent(new Event('touchend'))
    expect(c.state).toBe('running')
  })
})

describe('persistent storage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('asks once, after the first interaction', async () => {
    const persist = vi.fn(async () => true)
    const persisted = vi.fn(async () => false)
    vi.stubGlobal('navigator', { ...navigator, storage: { persist, persisted } })
    const off = persistStorageAfterFirstGesture()
    expect(persist).not.toHaveBeenCalled()
    window.dispatchEvent(new Event('click'))
    window.dispatchEvent(new Event('click'))
    await new Promise((r) => setTimeout(r, 0))
    expect(persist).toHaveBeenCalledTimes(1)
    off()
  })

  it('does nothing where the API is missing', () => {
    vi.stubGlobal('navigator', { ...navigator, storage: undefined })
    expect(() => persistStorageAfterFirstGesture()()).not.toThrow()
  })
})

describe('touch guards', () => {
  it('blocks the long-press menu on canvases but not in text fields', () => {
    const off = installTouchGuards()
    const canvas = document.createElement('canvas')
    const input = document.createElement('input')
    document.body.append(canvas, input)
    const onCanvas = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    canvas.dispatchEvent(onCanvas)
    expect(onCanvas.defaultPrevented).toBe(true)
    const onInput = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    input.dispatchEvent(onInput)
    expect(onInput.defaultPrevented).toBe(false)
    off()
    canvas.remove()
    input.remove()
  })
})

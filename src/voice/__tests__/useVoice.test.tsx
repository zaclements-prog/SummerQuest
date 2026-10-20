import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useVoice } from '../useVoice'
import { resetVoiceManifestCacheForTests } from '../env'
import type { VoicePlayback, VoiceRef } from '../types'
import { useNarration } from '../../lib/narration'
import { resetSpeechChannelForTests } from '../../lib/speechChannel'
import { useProgress } from '../../store/progress'
import { installAudioUnlock, resetAudioUnlockForTests } from '../../platform/web/audioUnlock'
import { FakeAudio } from './fakes'

// React's act() warns unless this flag is set in non-RTL environments.
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/** Every <audio> made (the first is the shared, gesture-unlocked one). */
let audios: FakeAudio[] = []
class TrackedAudio extends FakeAudio {
  constructor(src?: string) {
    super()
    if (src) this.src = src
    audios.push(this)
  }
}

const speak = vi.fn()
const cancel = vi.fn()
const spoken = () => speak.mock.calls.map((c) => (c[0] as { text: string }).text).filter((t) => t !== '')

const VOICE_MANIFEST = {
  'ui/greatJob': { file: 'voice/ui/greatJob.mp3', hash: 'x', duration: 0.9 },
}
const LESSON_MANIFEST = {
  'fractions/a': { file: 'tts/fractions/a.mp3', hash: 'y' },
}

let root: Root
let voice: VoicePlayback
let narration: ReturnType<typeof useNarration>

function Voice({ r, autoPlay }: { r: VoiceRef | null; autoPlay?: boolean }) {
  const v = useVoice(r, { autoPlay })
  useEffect(() => {
    voice = v
  })
  return null
}
function Lesson() {
  const n = useNarration('fractions', 'a', 'narration for a')
  useEffect(() => {
    narration = n
  })
  return null
}
function Both({ r, lesson }: { r: VoiceRef | null; lesson: boolean }) {
  return createElement('div', null, lesson ? createElement(Lesson) : null, createElement(Voice, { r }))
}

const flush = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 5))
  })

async function tap() {
  await act(async () => {
    window.dispatchEvent(new Event('touchend'))
  })
  await act(async () => audios[0]?.start()) // the silent unlock clip plays
}

beforeEach(() => {
  resetAudioUnlockForTests()
  resetSpeechChannelForTests()
  resetVoiceManifestCacheForTests()
  audios = []
  speak.mockReset()
  cancel.mockReset()
  vi.stubGlobal('Audio', TrackedAudio)
  vi.stubGlobal('speechSynthesis', { speak, cancel, getVoices: () => [], speaking: false, pending: false })
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
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () => (url.endsWith('voice/manifest.json') ? VOICE_MANIFEST : url.endsWith('tts/manifest.json') ? LESSON_MANIFEST : null),
    })),
  )
  useProgress.setState({ soundEnabled: true })
  root = createRoot(document.createElement('div'))
  installAudioUnlock()
})

afterEach(() => {
  act(() => root.unmount())
  resetAudioUnlockForTests()
  resetSpeechChannelForTests()
  vi.unstubAllGlobals()
})

describe('useVoice', () => {
  it('plays the recorded line on the shared, unlocked element', async () => {
    await tap()
    act(() => root.render(createElement(Voice, { r: { line: 'ui/greatJob' } })))
    expect(voice.text).toBe('Great job!')
    await flush()
    const el = audios[0]
    expect(audios).toHaveLength(1)
    expect(el.src).toMatch(/voice\/ui\/greatJob\.mp3$/)
    expect(voice.playing).toBe(true)
    await act(async () => el.start(0.9))
    el.currentTime = 0.3
    expect(voice.clock.now()).toBeCloseTo(0.3)
    await act(async () => el.end())
    expect(voice.playing).toBe(false)
  })

  it('reads a line with no recording with device speech', async () => {
    act(() => root.render(createElement(Voice, { r: { line: 'ui/tapToStart' } })))
    await flush()
    expect(spoken()).toEqual(['Tap the star to start!'])
    expect(voice.playing).toBe(true)
  })

  it('sound off: no audio, no speech, the clock still runs', async () => {
    useProgress.setState({ soundEnabled: false })
    act(() => root.render(createElement(Voice, { r: { line: 'ui/greatJob' } })))
    await flush()
    expect(audios).toHaveLength(0)
    expect(spoken()).toEqual([])
    expect(voice.playing).toBe(false)
    expect(voice.clock.now()).toBeGreaterThan(0)
  })

  it('autoPlay: false waits for replay(), holding the clock at 0', async () => {
    await tap()
    act(() => root.render(createElement(Voice, { r: { line: 'ui/greatJob' }, autoPlay: false })))
    await flush()
    expect(voice.clock.now()).toBe(0)
    expect(audios[0].played).toHaveLength(1) // only the unlock clip
    await act(async () => voice.replay())
    await flush()
    expect(audios[0].src).toMatch(/greatJob\.mp3$/)
    expect(voice.playing).toBe(true)
  })

  it('throws on an unknown line, like voiceText', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => act(() => root.render(createElement(Voice, { r: { line: 'ui/nope' } })))).toThrow(/unknown voice line/)
    spy.mockRestore()
  })
})

describe('one voice at a time: voice lines and lesson narration', () => {
  it('a voice line interrupts the lesson narration (whose visuals carry on silently)', async () => {
    await tap()
    const el = audios[0]
    act(() => root.render(createElement(Both, { r: null, lesson: true })))
    await flush()
    expect(el.src).toMatch(/tts\/fractions\/a\.mp3$/)
    expect(narration.playing).toBe(true)
    act(() => root.render(createElement(Both, { r: { line: 'ui/greatJob' }, lesson: true })))
    await flush()
    expect(el.src).toMatch(/voice\/ui\/greatJob\.mp3$/)
    expect(narration.playing).toBe(false)
    expect(voice.playing).toBe(true)
    expect(narration.clock.now()).toBeGreaterThanOrEqual(0)
  })

  it('the lesson narration starting interrupts a voice line', async () => {
    await tap()
    const el = audios[0]
    act(() => root.render(createElement(Both, { r: { line: 'ui/greatJob' }, lesson: false })))
    await flush()
    expect(voice.playing).toBe(true)
    act(() => root.render(createElement(Both, { r: { line: 'ui/greatJob' }, lesson: true })))
    await flush()
    expect(el.src).toMatch(/tts\/fractions\/a\.mp3$/)
    expect(voice.playing).toBe(false)
    expect(narration.playing).toBe(true)
  })

  it("leaving a lesson doesn't cancel a voice line that is speaking", async () => {
    // no tap: nothing unlocked; the voice line has no clip, so it speaks
    act(() => root.render(createElement(Both, { r: null, lesson: true })))
    await flush()
    act(() => root.render(createElement(Both, { r: { line: 'ui/tapToStart' }, lesson: true })))
    await flush()
    expect(spoken()).toEqual(['Tap the star to start!'])
    cancel.mockClear()
    act(() => root.render(createElement(Both, { r: { line: 'ui/tapToStart' }, lesson: false })))
    await flush()
    expect(cancel).not.toHaveBeenCalled()
    expect(voice.playing).toBe(true)
  })
})

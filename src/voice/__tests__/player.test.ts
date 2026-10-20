import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { GAP, planTemplate } from '../catalog'
import { playlistDuration, playlistTimeAtChar, scaledTimeAtChar, segmentStarts, type SegTiming } from '../clock'
import { VoicePlayer, type VoiceManifest, type VoicePlan } from '../player'
import { fillTemplate } from '../registry'
import { resetSpeechChannelForTests } from '../../lib/speechChannel'
import { DEFAULT_CHARS_PER_SEC, phraseIndex } from '../../tutoring/motion/cues'
import type { TemplateDef } from '../types'
import { fakeEnv, flush } from './fakes'

const LINE: VoicePlan = {
  caption: 'Tap the star to start!',
  segments: [{ key: 'ui/tapToStart', text: 'Tap the star to start!', capStart: 0, capEnd: 22, gap: 0 }],
}

const howMany: TemplateDef = { text: 'Find {n} {thing}. Tap them!', slots: { n: { numbers: [1, 20] }, thing: { words: ['fish'] } }, render: 'stitch' }
const caption = fillTemplate(howMany.text, { n: 7, thing: 'fish' }) // "Find 7 fish. Tap them!"
const STITCHED: VoicePlan = { caption, segments: planTemplate('k/howMany', howMany, { n: 7, thing: 'fish' }, caption) }

const entry = (key: string, duration?: number, words = false) => ({
  file: `voice/${key.replace('#', '.part')}.mp3`,
  hash: 'h',
  ...(duration !== undefined ? { duration } : {}),
  ...(words ? { words: `voice/${key.replace('#', '.part')}.words.json` } : {}),
})

const MANIFEST: VoiceManifest = {
  'ui/tapToStart': entry('ui/tapToStart', 1.6, true),
  'k/howMany#0': entry('k/howMany#0', 0.4, true),
  'slots/number/7': entry('slots/number/7', 0.5, true),
  'slots/word/fish': entry('slots/word/fish', 0.45),
  'k/howMany#2': entry('k/howMany#2', 0.8, true),
}
const WORDS = {
  'voice/ui/tapToStart.words.json': [
    { w: 'Tap', s: 0.05, e: 0.3 },
    { w: 'the', s: 0.3, e: 0.42 },
    { w: 'star', s: 0.42, e: 0.8 },
    { w: 'to', s: 0.8, e: 0.95 },
    { w: 'start!', s: 0.95, e: 1.5 },
  ],
  'voice/k/howMany.part0.words.json': [{ w: 'Find', s: 0.02, e: 0.35 }],
  'voice/slots/number/7.words.json': [{ w: 'seven', s: 0.01, e: 0.45 }],
  'voice/k/howMany.part2.words.json': [
    { w: 'Tap', s: 0.02, e: 0.3 },
    { w: 'them!', s: 0.3, e: 0.75 },
  ],
}

beforeEach(() => resetSpeechChannelForTests())
afterEach(() => resetSpeechChannelForTests())

describe('playlist timeline (pure)', () => {
  const segs: SegTiming[] = [
    { capStart: 0, capEnd: 4, gap: 0, dur: 0.4, aligned: null },
    { capStart: 5, capEnd: 6, gap: 0.05, dur: 0.5, aligned: [{ start: 5, s: 0.01 }] },
    { capStart: 13, capEnd: 22, gap: 0.35, dur: 0.8, aligned: null },
  ]

  it('lays the clips end to end with their pauses', () => {
    const starts = segmentStarts(segs)
    expect(starts).toHaveLength(3)
    ;[0, 0.45, 1.3].forEach((t, i) => expect(starts[i]).toBeCloseTo(t))
    expect(playlistDuration(segs)).toBeCloseTo(2.1)
  })

  it('times a character from word timings, else by its place in its clip', () => {
    expect(playlistTimeAtChar(0, segs)).toBe(0)
    expect(playlistTimeAtChar(2, segs)).toBeCloseTo(0.2) // half-way through "Find"
    expect(playlistTimeAtChar(4, segs)).toBeCloseTo(0.45) // the space before "7": when "7" starts
    expect(playlistTimeAtChar(5, segs)).toBeCloseTo(0.46) // "7" = "seven" at 0.01 s into its clip
    expect(playlistTimeAtChar(10, segs)).toBeCloseTo(1.3) // ". " before "Tap": the next clip's start
    expect(playlistTimeAtChar(13 + 4.5, segs)).toBeCloseTo(1.3 + 0.4)
    expect(playlistTimeAtChar(99, segs)).toBeCloseTo(2.1)
  })

  it('scales by characters when only a length is known', () => {
    expect(scaledTimeAtChar(5, 10, 2)).toBe(1)
    expect(scaledTimeAtChar(50, 10, 2)).toBe(2)
    expect(scaledTimeAtChar(3, 0, 2)).toBe(0)
  })
})

describe('VoicePlayer: a recorded line', () => {
  it('plays the clip on the shared element and runs the clock from it', async () => {
    const f = fakeEnv(MANIFEST, WORDS)
    const p = new VoicePlayer(f.env)
    p.load(LINE)
    expect(p.clock.now()).toBe(0) // held at the start until played
    await p.play()
    await flush()
    expect(f.shared.src).toBe('/voice/ui/tapToStart.mp3')
    expect(f.shared.paused).toBe(false)
    expect(p.playing).toBe(true)
    expect(p.clock.duration()).toBe(1.6) // the manifest's, until the element knows
    f.shared.start(1.62)
    await flush()
    expect(p.report).toMatchObject({ source: 'audio', clip: 'loaded' })
    expect(p.clock.duration()).toBeCloseTo(1.62)
    f.shared.currentTime = 0.5
    expect(p.clock.now()).toBe(0.5)
    // word timings land the cue on "star"
    expect(p.clock.timeAtChar(phraseIndex(LINE.caption, 'star'))).toBe(0.42)
    f.shared.end()
    expect(p.playing).toBe(false)
    f.advance(1000)
    expect(p.clock.now()).toBeCloseTo(2.62) // keeps counting after the end
    expect(f.owner).toBeNull() // the shared element is free for the next voice
  })

  it('times characters by duration when there are no word timings', async () => {
    const f = fakeEnv({ 'ui/tapToStart': entry('ui/tapToStart', 2.2) })
    const p = new VoicePlayer(f.env)
    p.load(LINE)
    await p.play()
    expect(p.clock.timeAtChar(11)).toBeCloseTo(1.1)
  })

  it('stop() silences it and the clock carries on silently; replay() starts over', async () => {
    const f = fakeEnv(MANIFEST, WORDS)
    const p = new VoicePlayer(f.env)
    p.load(LINE)
    await p.play()
    f.shared.start(1.6)
    f.shared.currentTime = 0.8
    p.stop()
    expect(f.shared.paused).toBe(true)
    expect(p.playing).toBe(false)
    f.advance(500)
    expect(p.clock.now()).toBeCloseTo(1.3)
    p.replay(true)
    await flush()
    expect(p.clock.now()).toBe(0)
    expect(f.shared.played).toEqual(['/voice/ui/tapToStart.mp3', '/voice/ui/tapToStart.mp3'])
    p.replay(false) // sound off: the silent timeline from the start
    expect(f.shared.paused).toBe(true)
    f.advance(300)
    expect(p.clock.now()).toBeCloseTo(0.3)
    expect(p.clock.duration()).toBeCloseTo(LINE.caption.length / DEFAULT_CHARS_PER_SEC)
  })
})

describe('VoicePlayer: a stitched template', () => {
  it('plays the pieces and slot words back to back with the planned pauses', async () => {
    expect(STITCHED.segments.map((s) => [s.key, s.gap])).toEqual([
      ['k/howMany#0', 0],
      ['slots/number/7', GAP.tight],
      ['slots/word/fish', GAP.tight],
      ['k/howMany#2', GAP.sentence],
    ])
    const f = fakeEnv(MANIFEST, WORDS)
    const p = new VoicePlayer(f.env)
    p.load(STITCHED)
    await p.play()
    await flush()
    expect(p.clock.duration()).toBeCloseTo(0.4 + 0.05 + 0.5 + 0.05 + 0.45 + 0.35 + 0.8)

    f.shared.start(0.4)
    f.shared.currentTime = 0.3
    expect(p.clock.now()).toBeCloseTo(0.3)
    f.shared.end() // "Find" done: a tight pause before "seven"
    expect(f.shared.src).toBe('/voice/k/howMany.part0.mp3')
    f.advance(30)
    expect(p.clock.now()).toBeCloseTo(0.43)
    f.advance(20)
    expect(f.shared.src).toBe('/voice/slots/number/7.mp3')
    expect(p.playing).toBe(true)
    f.shared.start(0.5)
    f.shared.currentTime = 0.2
    expect(p.clock.now()).toBeCloseTo(0.45 + 0.2)
    // "7" in the caption is "seven" at 0.01 s into its clip
    expect(p.clock.timeAtChar(caption.indexOf('7'))).toBeCloseTo(0.46)
    f.shared.end()
    f.advance(50)
    expect(f.shared.src).toBe('/voice/slots/word/fish.mp3')
    // the element is slow to start: the clock holds at the clip's start, never runs ahead
    f.advance(200)
    expect(p.clock.now()).toBeCloseTo(1.0)
    f.shared.start(0.45)
    f.shared.end()
    f.advance(349)
    expect(f.shared.src).toBe('/voice/slots/word/fish.mp3') // a sentence pause before "Tap them!"
    f.advance(1)
    expect(f.shared.src).toBe('/voice/k/howMany.part2.mp3')
    f.shared.start(0.8)
    // "Tap" of the last clip: its start on the line's timeline plus its word time
    expect(p.clock.timeAtChar(phraseIndex(caption, 'Tap'))).toBeCloseTo(1.8 + 0.02)
    f.shared.end()
    expect(p.playing).toBe(false)
    expect(f.shared.played).toEqual([
      '/voice/k/howMany.part0.mp3',
      '/voice/slots/number/7.mp3',
      '/voice/slots/word/fish.mp3',
      '/voice/k/howMany.part2.mp3',
    ])
  })

  it('reads the whole caption with device speech when any clip is missing (never a mix of voices)', async () => {
    const { 'slots/number/7': _gone, ...rest } = MANIFEST
    void _gone
    const f = fakeEnv(rest)
    const p = new VoicePlayer(f.env)
    p.load(STITCHED)
    await p.play()
    expect(f.shared.played).toEqual([])
    expect(f.speech.last.text).toBe('Find 7 fish. Tap them!')
    expect(p.report).toMatchObject({ source: 'speech', clip: 'missing', detail: 'slots/number/7' })
  })
})

describe('VoicePlayer: fallbacks', () => {
  it('device speech: the clock learns the pace from word boundaries', async () => {
    const f = fakeEnv({})
    const p = new VoicePlayer(f.env)
    p.load(LINE)
    await p.play()
    expect(p.playing).toBe(true)
    f.advance(100)
    f.speech.last.hooks.onStart?.()
    expect(p.report.speech).toBe('started')
    expect(p.clock.now()).toBe(0)
    f.advance(1000)
    f.speech.last.hooks.onBoundary?.(15) // 15 characters in 1 s
    expect(p.clock.duration()).toBeCloseTo(LINE.caption.length / 15)
    expect(p.clock.timeAtChar(11)).toBeCloseTo(11 / 15)
    f.speech.last.hooks.onEnd?.()
    expect(p.playing).toBe(false)
  })

  it('device speech that never starts is treated as silent', async () => {
    const f = fakeEnv({})
    const p = new VoicePlayer(f.env)
    p.load(LINE)
    await p.play()
    f.advance(2600)
    expect(p.report.speech).toBe('silent')
    expect(p.playing).toBe(false)
    expect(f.speech.cancel).toHaveBeenCalled()
    expect(p.clock.now()).toBeCloseTo(2.6) // the timeline kept going
  })

  it('no device speech: the silent timeline', async () => {
    const f = fakeEnv({})
    f.speech.isAvailable = false
    const p = new VoicePlayer(f.env)
    p.load(LINE)
    await p.play()
    expect(p.playing).toBe(false)
    expect(p.report).toMatchObject({ source: 'virtual', speech: 'unavailable' })
    f.advance(700)
    expect(p.clock.now()).toBeCloseTo(0.7)
    expect(p.clock.timeAtChar(11)).toBeCloseTo(11 / DEFAULT_CHARS_PER_SEC)
  })

  it('a clip that fails to load falls back to speech, once', async () => {
    const f = fakeEnv(MANIFEST)
    const p = new VoicePlayer(f.env)
    p.load(LINE)
    await p.play()
    f.shared.onerror?.()
    f.shared.refuse('NotSupportedError')
    await flush()
    expect(f.speech.calls.map((c) => c.text)).toEqual([LINE.caption])
    expect(p.report).toMatchObject({ clip: 'error', source: 'speech' })
  })

  it('autoplay refused before a tap: silent for now, then says it on the first tap', async () => {
    const f = fakeEnv(MANIFEST)
    const p = new VoicePlayer(f.env)
    p.load(LINE)
    await p.play()
    f.shared.refuse('NotAllowedError')
    await flush()
    expect(p.report.clip).toBe('blocked')
    expect(f.speech.calls).toEqual([]) // speech would be refused too
    expect(p.playing).toBe(false)
    f.tap()
    await flush()
    expect(f.shared.played).toHaveLength(2)
    expect(p.playing).toBe(true)
  })

  it("the voice check's recorded-only player never falls back to speech", async () => {
    const f = fakeEnv({})
    const p = new VoicePlayer(f.env, { prefer: 'recorded' })
    p.load(LINE)
    await p.play()
    expect(f.speech.calls).toEqual([])
    expect(p.report).toMatchObject({ clip: 'missing', source: 'virtual' })
  })
})

describe('VoicePlayer: background and one voice at a time', () => {
  it('freezes the clip and the clock in the background and carries on when back', async () => {
    const f = fakeEnv(MANIFEST, WORDS)
    const p = new VoicePlayer(f.env)
    p.load(LINE)
    await p.play()
    f.shared.start(1.6)
    f.shared.currentTime = 0.7
    p.onVisibility(true)
    expect(f.shared.paused).toBe(true)
    expect(p.playing).toBe(false)
    f.advance(5000)
    expect(p.clock.now()).toBe(0.7)
    p.onVisibility(false)
    expect(f.shared.paused).toBe(false)
    expect(p.playing).toBe(true)
    expect(f.shared.played).toHaveLength(2) // resumed, not restarted
  })

  it('a pause between stitched clips keeps the rest of the pause for later', async () => {
    const f = fakeEnv(MANIFEST, WORDS)
    const p = new VoicePlayer(f.env)
    p.load(STITCHED)
    await p.play()
    f.shared.start(0.4)
    f.shared.end()
    f.advance(20)
    p.onVisibility(true)
    f.advance(10_000)
    expect(f.shared.src).toBe('/voice/k/howMany.part0.mp3')
    p.onVisibility(false)
    f.advance(29)
    expect(f.shared.src).toBe('/voice/k/howMany.part0.mp3')
    f.advance(1)
    expect(f.shared.src).toBe('/voice/slots/number/7.mp3')
  })

  it('a line asked to start in the background starts when the app is back', async () => {
    const f = fakeEnv(MANIFEST)
    f.setHidden(true)
    const p = new VoicePlayer(f.env)
    p.load(LINE)
    await p.play()
    expect(f.shared.played).toEqual([])
    f.setHidden(false)
    p.onVisibility(false)
    await flush()
    expect(f.shared.played).toEqual(['/voice/ui/tapToStart.mp3'])
  })

  it('device speech resumes from the word it stopped on', async () => {
    const f = fakeEnv({})
    const p = new VoicePlayer(f.env)
    p.load(LINE)
    await p.play()
    f.speech.last.hooks.onStart?.()
    f.advance(600) // ~8 characters at 14/s: inside "star"
    p.onVisibility(true)
    expect(f.speech.cancel).toHaveBeenCalled()
    p.onVisibility(false)
    expect(f.speech.last.text).toBe('star to start!')
  })

  it('a new voice interrupts the one speaking; its clock carries on silently', async () => {
    const f = fakeEnv(MANIFEST, WORDS)
    const a = new VoicePlayer(f.env)
    const b = new VoicePlayer(f.env)
    a.load(LINE)
    b.load(STITCHED)
    await a.play()
    f.shared.start(1.6)
    f.shared.currentTime = 0.4
    await b.play()
    expect(a.playing).toBe(false)
    expect(b.playing).toBe(true)
    expect(f.shared.src).toBe('/voice/k/howMany.part0.mp3')
    f.advance(1000)
    expect(a.clock.now()).toBeCloseTo(1.4)
  })

  it('an interrupted speech line is cancelled, but stopping a voice never cancels another one', async () => {
    const f = fakeEnv({})
    const a = new VoicePlayer(f.env)
    const b = new VoicePlayer(f.env)
    a.load(LINE)
    b.load(LINE)
    await a.play()
    f.speech.last.hooks.onStart?.()
    await b.play() // takes over: a's utterance is cancelled
    expect(f.speech.cancel).toHaveBeenCalledTimes(1)
    f.speech.last.hooks.onStart?.()
    a.stop() // a is already quiet: b keeps talking
    a.dispose()
    expect(f.speech.cancel).toHaveBeenCalledTimes(1)
    expect(b.playing).toBe(true)
  })
})

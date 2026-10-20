import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StrictMode, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import GuideLayer from '../../../guide/GuideLayer'
import { getGuideSnapshot, resetGuideForTests, subscribeGuide } from '../../../guide/store'
import { createProvider } from '../../../lib/providers'
import { traceQuestion } from '../../../lib/providers/kTrace'
import { makeKStoriesProvider, type OrderSpec } from '../../../lib/providers/kStories'
import { seededRng } from '../../../lib/random'
import { glyph } from '../../../lib/trace/glyphs'
import type { Pt } from '../../../lib/trace/geometry'
import { pickTodaysChallenge, DAILY_QUESTION_COUNT } from '../../../lib/daily'
import { localDayKey } from '../../../lib/dates'
import { effectiveConfigForStage } from '../../../lib/gradeTiers'
import { zoneStages } from '../../../curriculum'
import { useProgress } from '../../../store/progress'
import { expectTextBudget, visibleWords } from '../../../test/textBudget'
import type { GameResult } from '../../../screens/GameRunner'
import type { ProblemProvider } from '../../../lib/problem'
import ListenPlay from '../ListenPlay'
import type { ListenProblem } from '../types'
import { voiceText } from '../../../voice/registry'

/**
 * The Writing Workshop activities in the real Listen & Play shell: tracing
 * (stroke by stroke from the green dot; a wrong stroke fades, two on one
 * stroke bring the hand to show it; never failing out) and story order
 * (told, mixed up, tapped first, next, last). With no layout in jsdom, a
 * trace's client coordinates are its box units.
 */

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const FAKE = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] as const

let container: HTMLDivElement
let root: Root
let said: string[]
let unsubscribe: () => void

async function advance(ms: number) {
  for (let left = ms; left > 0; left -= 50) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(Math.min(50, left))
    })
  }
}

function mount(provider: ProblemProvider, count: number, onComplete: (r: GameResult) => void = () => {}) {
  act(() =>
    root.render(
      <>
        <GuideLayer />
        <ListenPlay provider={provider} params={{ questionCount: count }} onComplete={onComplete} onExit={() => {}} />
      </>,
    ),
  )
}

/** Let time pass until `ok()` (at most `ms`). */
async function until(ok: () => boolean, ms = 20000) {
  for (let left = ms; left > 0 && !ok(); left -= 50) await advance(50)
  expect(ok()).toBe(true)
}

const phase = () => container.querySelector('[data-listen-play]')!.getAttribute('data-phase')
const pad = () => container.querySelector<SVGSVGElement>('[data-guide="trace-pad"]')!
const strokeNow = () => Number(pad().getAttribute('data-trace-stroke'))

/** A finger event (a PointerEvent where jsdom has one; a mouse event of the same name otherwise). */
function fire(type: string, p: Pt, buttons = 1) {
  const init = { bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, buttons, pointerId: 1 }
  const ev = typeof PointerEvent === 'function' ? new PointerEvent(type, init) : new MouseEvent(type, init)
  act(() => {
    pad().dispatchEvent(ev)
  })
}
/** Drag a finger through these points (box units) and lift it. */
function trace(pts: readonly Pt[]) {
  fire('pointerdown', pts[0])
  for (const p of pts.slice(1)) fire('pointermove', p)
  fire('pointerup', pts[pts.length - 1], 0)
}
const samples = (kind: 'letter' | 'digit' | 'warmup', id: string, stroke: number) => glyph(kind, id).strokes[stroke].sampled.pts.filter((_, i) => i % 2 === 0)
const shifted = (pts: readonly Pt[], dx: number, dy: number) => pts.map((p) => ({ x: p.x + dx, y: p.y + dy }))

beforeEach(() => {
  vi.useFakeTimers({ toFake: [...FAKE] })
  vi.spyOn(Math, 'random').mockImplementation(seededRng('listen-activities'))
  resetGuideForTests()
  useProgress.setState({ stats: { ...useProgress.getState().stats, problemsAnswered: 0, problemsCorrect: 0 } })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  said = []
  let serial = -1
  unsubscribe = subscribeGuide(() => {
    const s = getGuideSnapshot()
    if (s.run && s.lineSerial !== serial) {
      serial = s.lineSerial
      // (a silent line, only pointing, says nothing)
      if (s.run.lines[s.line].text) said.push(s.run.lines[s.line].text)
    }
  })
})

afterEach(() => {
  unsubscribe()
  act(() => root.unmount())
  resetGuideForTests()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.useRealTimers()
})

/** A provider that keeps asking to trace this glyph (a fresh question each time). */
const tracing = (kind: 'letter' | 'digit' | 'warmup', id: string): ProblemProvider => {
  let n = 0
  return { topic: 'kTrace', next: () => traceQuestion(kind, id, { id: `t${n++}`, topic: 'kTrace' }) }
}

describe('the trace activity', () => {
  it('asks for the glyph, then its first stroke at the green dot; nothing to read', async () => {
    mount(tracing('letter', 'L'), 3)
    await advance(100)
    const run = getGuideSnapshot().run!
    expect(run.lines.map((l) => l.text)).toEqual(["Let's trace the letter L!", 'Start at the top. Big line down.', ''])
    expect(run.lines.map((l) => l.marks[0].target)).toEqual(['trace-pad', 'trace-start', 'trace-start'])
    // the hand on the dot while the stroke is said, then just the ring (the hand never hides the arrow)
    expect(run.lines.map((l) => l.marks[0].hand)).toEqual([null, 'tap', null])
    expect(container.querySelector('[data-activity="trace"]')).not.toBeNull()
    // the guide (thick, light, every stroke), one green dot, an arrow, and no words
    expect(pad().querySelectorAll('[data-guide="trace-start"]')).toHaveLength(1)
    expect(pad().querySelectorAll('[data-guide="trace-arrow"]')).toHaveLength(1)
    expect(pad().getAttribute('data-trace-glyph')).toBe('letter:L')
    expectTextBudget(container, 0)
    expect(visibleWords(container)).toEqual([])
    expect(pad().querySelectorAll('text')).toHaveLength(0)
  })

  it('stroke by stroke: a right stroke stays inked and the next dot appears with its phrase; the glyph done says its name and picture word', async () => {
    let result: GameResult | null = null
    mount(tracing('letter', 'L'), 3, (r) => (result = r))
    await advance(6000)
    trace(samples('letter', 'L', 0))
    expect(strokeNow()).toBe(1)
    await advance(100)
    expect(said.at(-1)).toBe('Little line across.')
    trace(samples('letter', 'L', 1))
    expect(pad().hasAttribute('data-trace-done')).toBe(true)
    await advance(3000)
    // "L!", then L's picture word (lion 🦁), then the praise
    const i = said.indexOf('L!')
    expect(i).toBeGreaterThan(0)
    expect(said[i + 1]).toBe('lion!')
    expect(container.querySelector('.trace-sticker')?.textContent).toBe('🦁')
    expect(said).toContain('Great tracing!')
    // the rest of the round, first time each
    for (let k = 0; k < 2; k++) {
      await advance(6000)
      trace(samples('letter', 'L', 0))
      trace(samples('letter', 'L', 1))
      await advance(4000)
    }
    expect(result).toEqual({ stars: 3, score: 30, correct: 3, total: 3 })
  })

  it('a wrong stroke fades with a gentle word; a second wrong one is a miss: "let\'s look again", the hand shows it, then another try', async () => {
    let result: GameResult | null = null
    mount(tracing('letter', 'L'), 3, (r) => (result = r))
    await advance(6000)
    trace(samples('letter', 'L', 0))
    await advance(3000)
    // the little line across, started far from its dot
    said.length = 0
    trace(shifted(samples('letter', 'L', 1), 30, -40))
    expect(container.querySelector('.trace-ink-fade')).not.toBeNull()
    expect(strokeNow()).toBe(1)
    await advance(100)
    expect(said).toEqual(['Start at the green dot.'])
    expect(phase()).toBe('ask')
    // backwards (from the end): the second miss on this stroke
    await advance(3000)
    said.length = 0
    trace([...samples('letter', 'L', 1)].reverse())
    await advance(300)
    expect(said[0]).toBe("Hmm, let's look again.")
    // the help: the hand traces the stroke slowly as its phrase is said
    await until(() => said.includes('Little line across.'))
    await advance(400)
    expect(pad().querySelector('[data-trace-finger]')).not.toBeNull()
    await until(() => said.includes('Now you try!'))
    await advance(3000)
    expect(phase()).toBe('ask')
    // the earlier stroke kept its ink, and the child is still on this one
    expect(strokeNow()).toBe(1)
    expect(pad().querySelector('[data-trace-finger]')).toBeNull()
    // the re-ask is just the stroke, at its dot
    expect(said.at(-1)).toBe('Little line across.')
    trace(samples('letter', 'L', 1))
    await advance(4000)
    expect(said).toContain('L!')
    for (let k = 0; k < 2; k++) {
      await advance(6000)
      trace(samples('letter', 'L', 0))
      trace(samples('letter', 'L', 1))
      await advance(4000)
    }
    // the miss cost the first star, as a wrong card would
    expect(result).toEqual({ stars: 2, score: 20, correct: 2, total: 3 })
  })

  it('never fails out: miss after miss, the hand shows the stroke again and the child keeps trying', async () => {
    mount(tracing('digit', '7'), 3)
    await advance(6000)
    for (let round = 0; round < 3; round++) {
      // a scribble near the dot, twice
      for (let k = 0; k < 2; k++) {
        trace(Array.from({ length: 30 }, (_, i) => ({ x: 24 + 30 * Math.sin(i * 1.7), y: 10 + 25 * Math.abs(Math.cos(i * 1.1)) })))
        await advance(2500)
      }
      await advance(9000)
      expect(phase(), `after miss ${round + 1}`).toBe('ask')
    }
    trace(samples('digit', '7', 0))
    await advance(3000)
    expect(said).toContain('7!')
  })

  it('a tap, or a touch that barely moves, is not a try', async () => {
    mount(tracing('letter', 'T'), 3)
    await advance(6000)
    said.length = 0
    trace([{ x: 50, y: 10 }, { x: 50.5, y: 11 }])
    await advance(500)
    expect(said).toEqual([])
    expect(container.querySelector('.trace-ink-fade')).toBeNull()
  })

  it('a child tracing slowly is not interrupted by the "did you hear me?" re-prompt', async () => {
    mount(tracing('warmup', 'circle'), 3)
    await advance(6000)
    said.length = 0
    const pts = samples('warmup', 'circle', 0)
    fire('pointerdown', pts[0])
    // ~12 s to go round, well past the 8 s re-prompt
    for (const p of pts.slice(1)) {
      fire('pointermove', p)
      await advance(200)
    }
    fire('pointerup', pts[pts.length - 1], 0)
    expect(said).not.toContain("Let's trace a circle!")
    expect(said).not.toContain('Around like a C. Keep going, all the way around!')
    await advance(2000)
    expect(said[0]).toBe('Great tracing!')
  })

  it('the 🔊 and the idle re-prompt repeat the stroke the child is on', async () => {
    mount(tracing('letter', 'E'), 3)
    await advance(6000)
    trace(samples('letter', 'E', 0))
    await advance(3000)
    said.length = 0
    await advance(9000)
    expect(said).toEqual(['Little line across.'])
    expect(getGuideSnapshot().run?.gentle).toBe(true)
  })
})

describe('Counting Mesa: "You counted 6! Now trace a 6."', () => {
  const cards = () => [...container.querySelectorAll<HTMLButtonElement>('button[data-guide^="lp-card-"]')]

  /** Answer the card questions from the dev marker, then trace the numeral; returns what the trace asked. */
  async function playRound(count: number): Promise<{ asked: string; digit: string }> {
    for (let i = 0; i < count - 1; i++) {
      await advance(4000)
      const right = cards().find((c) => c.querySelector('[data-correct]'))!
      act(() => right.click())
      await advance(3000)
    }
    await advance(200)
    expect(container.querySelector('[data-activity="trace"]')).not.toBeNull()
    const run = getGuideSnapshot().run!
    const digit = pad().getAttribute('data-trace-glyph')!.split(':')[1]
    await advance(6000)
    for (let k = 0; k < glyph('digit', digit).strokes.length; k++) trace(samples('digit', digit, k))
    await advance(4000)
    return { asked: run.lines[0].text, digit }
  }
  /** The provider's questions, as asked. */
  const recording = (p: ProblemProvider, asked: ListenProblem[]): ProblemProvider => ({
    topic: p.topic,
    reset: () => p.reset?.(),
    next: () => {
      const q = p.next() as ListenProblem
      asked.push(q)
      return q
    },
  })

  it('the last of the five traces the number the fourth one counted', async () => {
    let result: GameResult | null = null
    const qs: ListenProblem[] = []
    mount(recording(createProvider({ kind: 'kCounting', mode: 'count', min: 1, max: 10, traceLast: 5 }), qs), 5, (r) => (result = r))
    const { asked, digit } = await playRound(5)
    expect(qs).toHaveLength(5)
    expect(qs.slice(0, 4).every((q) => !q.activity)).toBe(true)
    const n = Number(qs[3].answer)
    expect(n).toBeGreaterThanOrEqual(1)
    expect(n).toBeLessThanOrEqual(9)
    expect(digit).toBe(String(n))
    const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']
    expect(asked).toBe(`You counted ${words[n]}! Now trace ${n === 8 ? 'an' : 'a'} ${words[n]}.`)
    expect(said).toContain(`${n}!`)
    expect(result).toMatchObject({ correct: 5, total: 5, stars: 3 })
  })

  it('still the fifth under React’s dev double mount, and again on a replay (the shell starts the provider’s round afresh)', async () => {
    const provider = createProvider({ kind: 'kCounting', mode: 'count', min: 1, max: 10, traceLast: 5 })
    const strict = () =>
      act(() =>
        root.render(
          <StrictMode>
            <GuideLayer />
            <ListenPlay key={Math.random()} provider={provider} params={{ questionCount: 5 }} onComplete={() => {}} onExit={() => {}} />
          </StrictMode>,
        ),
      )
    strict()
    const { digit } = await playRound(5)
    expect(Number(digit)).toBeGreaterThanOrEqual(1)
    // a replay with the same provider (the results card's ↺): the trace is the fifth again
    strict()
    await playRound(5)
  })

  it('…and in the K Daily Challenge (Listen & Play, 5 questions), Counting Mesa ends the same way and Writing Workshop traces', async () => {
    const days = Array.from({ length: 60 }, (_, d) => localDayKey(new Date(2026, 0, 1 + d)))
    const mesaDay = days.find((d) => pickTodaysChallenge(0, d).zone.id === 'multiplication-mesa')!
    const wwDay = days.find((d) => pickTodaysChallenge(0, d).zone.id === 'writing-workshop')!
    // as the Daily Challenge screen builds its provider
    const providerFor = (day: string) => {
      const { zone, stage } = pickTodaysChallenge(0, day)
      const idx = zoneStages(zone, 0).findIndex((s) => s.id === stage.id)
      return createProvider(effectiveConfigForStage(stage, idx, 0))
    }
    let result: GameResult | null = null
    mount(providerFor(mesaDay), DAILY_QUESTION_COUNT, (r) => (result = r))
    await playRound(DAILY_QUESTION_COUNT)
    expect(result).toMatchObject({ total: DAILY_QUESTION_COUNT })

    act(() => root.render(<></>))
    result = null
    const ww = providerFor(wwDay)
    mount(ww, DAILY_QUESTION_COUNT, (r) => (result = r))
    for (let i = 0; i < DAILY_QUESTION_COUNT; i++) {
      await advance(6000)
      const id = pad().getAttribute('data-trace-glyph')!.split(':')[1]
      for (let k = 0; k < glyph('warmup', id).strokes.length; k++) trace(samples('warmup', id, k))
      await advance(4000)
    }
    expect(result).toMatchObject({ total: DAILY_QUESTION_COUNT, correct: DAILY_QUESTION_COUNT })
  })
})

describe('the story order activity', () => {
  const pic = (step: number) => container.querySelector<HTMLButtonElement>(`[data-guide="story-pic-${step}"]`)!
  const box = () => container.querySelector('[data-story]')!

  it('tells the story, each picture lit on its sentence, then mixes the pictures up and lights the slots', async () => {
    const provider = makeKStoriesProvider()
    const first = provider.next() as ListenProblem
    const spec = first.activity as OrderSpec
    mount({ topic: 'kStories', next: () => first }, 3)
    await advance(100)
    const run = getGuideSnapshot().run!
    expect(run.lines.map((l) => l.text).slice(0, 5)).toEqual(['Listen to the story!', ...spec.lines.map(voiceText), 'Now tap the pictures in order: first, next, last!'])
    expect(run.lines.slice(1, 4).map((l) => l.marks[0].target)).toEqual(['story-pic-0', 'story-pic-1', 'story-pic-2'])
    expect(run.lines[4].marks.map((m) => [m.target, m.cue])).toEqual([
      ['story-tray', undefined],
      ['story-slot-0', 'first'],
      ['story-slot-1', 'next'],
      ['story-slot-2', 'last'],
    ])
    // in story order while it's told; taps wait for the telling
    expect(box().hasAttribute('data-story-mixed')).toBe(false)
    act(() => pic(0).click())
    expect(box().getAttribute('data-story-placed')).toBe('0')
    expectTextBudget(container, 0)
    await advance(20000)
    expect(box().hasAttribute('data-story-mixed')).toBe(true)
    // mixed: no picture where it was told
    const x = (step: number) => (pic(step).parentElement as HTMLElement).style.transform
    expect(new Set([0, 1, 2].map(x)).size).toBe(3)
    expect(spec.mixed.join('')).not.toBe('012')
  })

  it('first, next, last: each lands in its slot; all three is a right try', async () => {
    let result: GameResult | null = null
    const provider = makeKStoriesProvider()
    mount(provider, 3, (r) => (result = r))
    for (let q = 0; q < 3; q++) {
      await advance(22000)
      said.length = 0
      for (const step of [0, 1, 2]) {
        act(() => pic(step).click())
        await advance(900)
      }
      expect(said.slice(0, 3)).toEqual(['First!', 'Next!', 'Last!'])
      expect(box().getAttribute('data-story-placed')).toBe('3')
      expect(pic(0).getAttribute('data-state')).toBe('right')
      await advance(4000)
    }
    expect(result).toEqual({ stars: 3, score: 30, correct: 3, total: 3 })
  })

  it('a wrong next pick: "let\'s look again", the story told again lighting the pictures, then on from where the child was', async () => {
    const provider = makeKStoriesProvider()
    const first = provider.next() as ListenProblem
    const spec = first.activity as OrderSpec
    mount({ topic: 'kStories', next: () => first }, 3)
    await advance(22000)
    act(() => pic(0).click())
    await advance(900)
    said.length = 0
    act(() => pic(2).click())
    expect(pic(2).getAttribute('data-state')).toBe('look')
    await advance(1500)
    expect(said[0]).toBe("Hmm, let's look again.")
    await advance(16000)
    // the story again, in order, each picture lit as its sentence is said
    expect(said.slice(1, 4)).toEqual(spec.lines.map(voiceText))
    expect(said).toContain('Now you try!')
    expect(said.at(-1)).toBe('What comes next? Tap it!')
    expect(phase()).toBe('ask')
    expect(box().getAttribute('data-story-placed')).toBe('1')
    act(() => pic(1).click())
    await advance(900)
    act(() => pic(2).click())
    await advance(4000)
    expect(said).toContain('Last!')
  })

  it('never fails out: wrong after wrong, the story is told again and the child carries on', async () => {
    const provider = makeKStoriesProvider()
    const first = provider.next() as ListenProblem
    mount({ topic: 'kStories', next: () => first }, 3)
    await advance(22000)
    for (let k = 0; k < 3; k++) {
      act(() => pic(2).click())
      await advance(22000)
      expect(phase()).toBe('ask')
    }
    for (const step of [0, 1, 2]) {
      act(() => pic(step).click())
      await advance(900)
    }
    await advance(3000)
    expect(said).toContain('Last!')
  })
})

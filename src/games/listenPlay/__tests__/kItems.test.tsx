import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import GuideLayer from '../../../guide/GuideLayer'
import { getGuideSnapshot, resetGuideForTests, subscribeGuide } from '../../../guide/store'
import { makeKShapesProvider } from '../../../lib/providers/kShapes'
import { makeKLettersProvider } from '../../../lib/providers/kLetters'
import { makeKCountingProvider } from '../../../lib/providers/kCounting'
import { seededRng } from '../../../lib/random'
import { useProgress } from '../../../store/progress'
import { expectTextBudget, visibleWords } from '../../../test/textBudget'
import type { ProblemProvider } from '../../../lib/problem'
import ListenPlay from '../ListenPlay'
import type { ListenProblem } from '../types'

/**
 * The Listen & Play kit with the kindergarten items: shapes and letters take
 * the stage without a picture, a big letter or two groups when there is one,
 * and each kind of question gets its own walkthrough after a wrong pick
 * (both groups counted, counting up to the bigger number, a shape's sides
 * traced, "Cat starts with C.").
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

const cards = () => [...container.querySelectorAll<HTMLButtonElement>('button[data-guide^="lp-card-"]')]
const marked = (sel: string) => container.querySelector(sel)!.querySelectorAll('[data-marked]').length

function mount(provider: ProblemProvider, count = 3) {
  act(() =>
    root.render(
      <>
        <GuideLayer />
        <ListenPlay provider={provider} params={{ questionCount: count }} onComplete={() => {}} onExit={() => {}} />
      </>,
    ),
  )
}

/** A provider that asks this one question. */
const only = (q: ListenProblem): ProblemProvider => ({ topic: q.topic, next: () => q })

beforeEach(() => {
  vi.useFakeTimers({ toFake: [...FAKE] })
  vi.spyOn(Math, 'random').mockImplementation(seededRng('listen-play-k'))
  resetGuideForTests()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  // everything the narrator starts to say, in order
  said = []
  let serial = -1
  unsubscribe = subscribeGuide(() => {
    const s = getGuideSnapshot()
    if (s.run && s.lineSerial !== serial) {
      serial = s.lineSerial
      said.push(s.run.lines[s.line].text)
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

describe('kindergarten items in Listen & Play', () => {
  it('"Tap the triangle.": no picture to show, so three big shape cards take the stage, and no words', async () => {
    mount(makeKShapesProvider({ mode: 'name2d' }))
    await advance(100)
    expect(container.querySelector('[data-guide="lp-picture"]')).toBeNull()
    expect(cards()).toHaveLength(3)
    expect(cards()[0].querySelector('svg polygon, svg circle, svg rect')).not.toBeNull()
    expectTextBudget(container, 0)
    // the guide sweeps the cards (there's no picture to light)
    expect(getGuideSnapshot().run!.lines[0].marks.map((m) => m.target)).toEqual([['lp-card-0', 'lp-card-1', 'lp-card-2']])
  })

  it('"Find the little b.": the big letter is the picture; letters are glyphs, not words to read', async () => {
    mount(makeKLettersProvider({ mode: 'matchCase' }))
    await advance(100)
    const picture = container.querySelector('[data-guide="lp-picture"]')!
    expect(picture.querySelector('svg[data-glyph] text')?.textContent).toMatch(/^[A-Z]$/)
    expect(cards().map((c) => c.querySelector('svg[data-glyph] text')?.textContent)).toEqual(cards().map((c) => c.getAttribute('aria-label')))
    expect(visibleWords(container)).toEqual([])
  })

  it('"Which one starts with B?": each picture is named after the question; a wrong pick hears why', async () => {
    const provider = makeKLettersProvider({ mode: 'firstSound' })
    const q = provider.next()
    mount(only(q))
    await advance(6000)
    const words = q.options.map((w) => `${w}!`)
    expect(said.slice(0, 4)).toEqual([q.prompt, ...words])
    // the pointing ends on all the cards together (never one card alone)
    expect(getGuideSnapshot().run!.lines.at(-1)!.marks[0].target).toEqual(['lp-card-0', 'lp-card-1', 'lp-card-2'])

    const wrong = q.options.findIndex((o) => o !== q.answer)
    const w = String(q.options[wrong])
    said.length = 0
    act(() => cards()[wrong].click())
    await advance(4000)
    expect(said.slice(0, 3)).toEqual([`${w}!`, "Hmm, let's look again.", `${w[0].toUpperCase()}${w.slice(1)} starts with ${w[0].toUpperCase()}.`])
  })

  it('"Are they the same?": two groups side by side; a wrong pick counts each group', async () => {
    const q: ListenProblem = {
      ...makeKCountingProvider({ kinds: ['same'] }).next(),
      pair: [
        { kind: 'group', count: 3, emoji: '🍎' },
        { kind: 'group', count: 4, emoji: '🍎' },
      ],
      answer: 'no',
    }
    mount(only(q))
    await advance(100)
    expect(container.querySelectorAll('[data-guide="lp-pair-0"] [data-obj]')).toHaveLength(3)
    expect(container.querySelectorAll('[data-guide="lp-pair-1"] [data-obj]')).toHaveLength(4)
    expect(cards().map((c) => c.getAttribute('aria-label'))).toEqual(['👍', '👎'])
    expectTextBudget(container, 0)
    // 👍 lights on "yes", 👎 on "no"
    expect(getGuideSnapshot().run!.lines[0].marks.map((m) => [m.target, m.cue])).toEqual([
      ['lp-picture', undefined],
      ['lp-card-0', 'yes'],
      ['lp-card-1', 'no'],
    ])
    said.length = 0
    act(() => cards()[0].click())
    await advance(16000)
    expect(said).toContain("Let's count each group.")
    expect(marked('[data-guide="lp-pair-0"]')).toBe(3)
    expect(marked('[data-guide="lp-pair-1"]')).toBe(4)
    expect([...container.querySelectorAll('[data-guide^="lp-pair-"] .lp-count-bubble')].map((b) => b.textContent)).toEqual(['3', '4'])
  })

  it('"Which group has more?": a wrong pick counts both groups on their cards', async () => {
    const q: ListenProblem = { ...makeKCountingProvider({ kinds: ['more'] }).next() }
    mount(only(q))
    await advance(100)
    // both groups draw their things the same size (one frame): the bigger group never looks smaller
    expect(new Set(cards().map((c) => c.querySelector('svg')!.getAttribute('viewBox'))).size).toBe(1)
    const wrong = q.options.findIndex((o) => o !== q.answer)
    act(() => cards()[wrong].click())
    await advance(16000)
    expect(cards().map((c) => c.querySelectorAll('[data-marked]').length)).toEqual(q.options)
    expect(cards().map((c) => c.querySelector('.lp-count-bubble')?.textContent)).toEqual(q.options.map(String))
  })

  it('"Which number is bigger?": a wrong pick counts up, lighting each numeral as it is said', async () => {
    const q: ListenProblem = {
      ...makeKCountingProvider({ kinds: ['bigger'] }).next(),
      options: [4, 7],
      answer: 7,
      pictureOptions: [4, 7].map((n) => ({ value: n, picture: { kind: 'numeral' as const, n }, speech: { template: 'listen/number', slots: { n } } })),
    }
    mount(only(q))
    await advance(100)
    expect(container.querySelector('[data-guide="lp-picture"]')).toBeNull()
    act(() => cards()[0].click())
    await advance(3000)
    let line = null
    for (let t = 0; t < 40 && !line; t++) {
      const run = getGuideSnapshot().run
      line = run?.lines.find((l) => l.text === 'One, two, three, four, five, six, seven.') ?? null
      if (!line) await advance(250)
    }
    expect(line!.marks.map((m) => [m.target, m.cue])).toEqual([
      [['lp-card-0', 'lp-card-1'], undefined],
      ['lp-card-0', 'four'],
      ['lp-card-1', 'seven'],
    ])
  })

  it('"How many sides does the triangle have?": the sides can be tapped to count, and the walkthrough traces them', async () => {
    const q: ListenProblem = {
      ...makeKShapesProvider({ kinds: ['howManySides'] }).next(),
      picture: { kind: 'shape', shape: 'triangle', color: 2 },
      options: [3, 4, 5],
      answer: 3,
      pictureOptions: [3, 4, 5].map((n) => ({ value: n, picture: { kind: 'numeral' as const, n }, speech: { template: 'listen/number', slots: { n } } })),
    }
    mount(only(q))
    await advance(100)
    const sides = () => [...container.querySelectorAll<SVGGElement>('[data-guide="lp-picture"] .lp-side')]
    expect(sides()).toHaveLength(3)
    // a child can count them by touch
    act(() => sides()[0].dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(marked('[data-guide="lp-picture"]')).toBe(1)
    said.length = 0
    act(() => cards()[1].click())
    await advance(16000)
    expect(said).toContain("Let's count the sides.")
    expect(said).toContain('One, two, three.')
    expect(marked('[data-guide="lp-picture"]')).toBe(3)
  })

  it('"Tap the shape with three sides.": a wrong card has its own sides counted', async () => {
    const base = makeKShapesProvider({ kinds: ['withSides'] }).next()
    const q: ListenProblem = {
      ...base,
      prompt: 'Tap the shape with three sides.',
      speech: { line: 'k-shapes/sides3' },
      options: ['triangle', 'square'],
      answer: 'triangle',
      pictureOptions: (['triangle', 'square'] as const).map((shape, i) => ({ value: shape, picture: { kind: 'shape' as const, shape, color: i }, speech: { template: 'k-shapes/label', slots: { shape } } })),
      walkthrough: 'picked',
    }
    mount(only(q))
    await advance(100)
    act(() => cards()[1].click())
    await advance(16000)
    expect(cards()[1].querySelectorAll('[data-marked]')).toHaveLength(4)
    expect(cards()[1].querySelector('.lp-count-bubble')?.textContent).toBe('4')
  })

  it('a right answer is praised with the question’s own lines, taking turns with the kit’s', async () => {
    useProgress.setState({ stats: { ...useProgress.getState().stats, problemsAnswered: 0, problemsCorrect: 0 } })
    const q = makeKShapesProvider({ mode: 'name2d' }).next()
    mount(only(q))
    await advance(100)
    said.length = 0
    act(() => cards()[q.options.indexOf(q.answer)].click())
    await advance(3000)
    expect(said).toContain('You know your shapes!')
  })
})

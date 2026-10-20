import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import GuideLayer from '../../../guide/GuideLayer'
import { getGuideSnapshot, resetGuideForTests, subscribeGuide } from '../../../guide/store'
import { makeKLiteracyProvider } from '../../../lib/providers/kLiteracy'
import { seededRng } from '../../../lib/random'
import { useProgress } from '../../../store/progress'
import { expectTextBudget, visibleWords } from '../../../test/textBudget'
import type { GameResult } from '../../../screens/GameRunner'
import type { ProblemProvider } from '../../../lib/problem'
import ListenPlay from '../ListenPlay'
import type { ListenProblem } from '../types'
import type { DrumSpec } from '../activities/drumSpec'

/**
 * Letter Reef's literacy screens in the real Listen & Play shell: the drum
 * (taps, ↩ and ⟲, ✓, a miss → the help taps the parts → another try, never
 * failing out), and the picture and word questions with their words about a
 * wrong pick. Every screen is checked against the K text budget: no words at
 * all, except Word hunt's three word cards (the only printed words a
 * kindergartner reads).
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
/** Let time pass until `ok()` (at most `ms`). */
async function until(ok: () => boolean, ms = 20000) {
  for (let t = 0; t < ms && !ok(); t += 50) await advance(50)
  expect(ok()).toBe(true)
}

const q = <T extends Element = HTMLElement>(sel: string) => container.querySelector<T>(sel)
const cards = () => [...container.querySelectorAll<HTMLButtonElement>('button[data-guide^="lp-card-"]')]
const phase = () => q('[data-listen-play]')!.getAttribute('data-phase')
const tap = (sel: string) => act(() => q<HTMLButtonElement>(sel)!.click())
const claps = () => container.querySelectorAll('[data-clap]').length
const rings = () => container.querySelectorAll('[data-ring]').length

function mount(provider: ProblemProvider, onComplete: (r: GameResult) => void = () => {}, count = 3) {
  act(() =>
    root.render(
      <>
        <GuideLayer />
        <ListenPlay provider={provider} params={{ questionCount: count }} onComplete={onComplete} onExit={() => {}} />
      </>,
    ),
  )
}

/** A provider that asks this one question (again and again). */
const only = (p: ListenProblem): ProblemProvider => ({ topic: p.topic, next: () => ({ ...p }) })

/** "Tiger! Tap the drum for each part, then tap the check." (two parts) */
const TIGER: DrumSpec = { kind: 'drum', word: 'tiger', emoji: '🐯', parts: 2, partsLine: { line: 'k-sounds/parts-tiger' } }
const tiger = (): ListenProblem => ({
  id: 'drum-tiger',
  prompt: 'Tiger! Tap the drum for each part, then tap the check.',
  options: [1, 2, 3],
  answer: 2,
  topic: 'kLiteracy',
  subtopic: 'syllables',
  skill: { id: 'k-syllables', label: 'word parts' },
  speech: { template: 'k-sounds/drumWord', slots: { word: 'Tiger' } },
  praise: [{ line: 'k-sounds/youHeardParts' }],
  activity: TIGER,
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: [...FAKE] })
  vi.spyOn(Math, 'random').mockImplementation(seededRng('k-literacy-items'))
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

describe('the drum (Clap the parts)', () => {
  it('shows the word’s picture, the drum and ✓ instead of cards; asks with each lit on its word; no words to read', async () => {
    mount(only(tiger()))
    await advance(100)
    expect(cards()).toHaveLength(0)
    const act0 = q('[data-guide="lp-activity"]')!
    expect(act0.getAttribute('data-activity')).toBe('drum')
    // (dev builds: how many parts the word has, for the playthrough bot)
    expect(q('[data-parts]')!.getAttribute('data-parts')).toBe('2')
    expect(q('[data-guide="lp-drum-word"] text')!.textContent).toBe('🐯')
    expect(q('[data-guide="lp-drum"]')).not.toBeNull()
    expect(q('[data-guide="lp-drum-check"]')).not.toBeNull()
    expectTextBudget(container, 0)
    const run = getGuideSnapshot().run!
    expect(run.lines[0].text).toBe('Tiger! Tap the drum for each part, then tap the check.')
    expect(run.lines[0].marks.map((m) => [m.target, m.cue])).toEqual([
      ['lp-drum-word', undefined],
      ['lp-drum', 'drum'],
      ['lp-drum-check', 'check'],
    ])
  })

  it('each tap adds a clap; ↩ takes one back, ⟲ clears them; ✓ does nothing until there is a tap', async () => {
    mount(only(tiger()))
    await advance(100)
    tap('[data-guide="lp-drum-check"]')
    await advance(500)
    expect(phase()).toBe('ask') // ✓ with no claps: nothing sent
    for (let i = 0; i < 3; i++) tap('[data-guide="lp-drum"]')
    expect(claps()).toBe(3)
    tap('[aria-label="Undo"]')
    expect(claps()).toBe(2)
    tap('[aria-label="Start over"]')
    expect(claps()).toBe(0)
    // no timer sends it: a long wait changes nothing
    tap('[data-guide="lp-drum"]')
    await advance(30000)
    expect(phase()).toBe('ask')
    expect(claps()).toBe(1)
    expectTextBudget(container, 0)
  })

  it('the right count and ✓: praise, and the next word', async () => {
    let result: GameResult | null = null
    mount(only(tiger()), (r) => (result = r), 3)
    for (let item = 0; item < 3; item++) {
      await until(() => phase() === 'ask' && !!q('[data-guide="lp-drum"]'))
      tap('[data-guide="lp-drum"]')
      tap('[data-guide="lp-drum"]')
      tap('[data-guide="lp-drum-check"]')
      expect(phase()).toBe('praise')
      expect(q('[role="status"]')!.getAttribute('data-state')).toBe('right')
      await until(() => phase() !== 'praise')
    }
    expect(said).toContain('You heard every part!')
    expect(result).toEqual({ stars: 3, score: 30, correct: 3, total: 3 })
  })

  it('a wrong count: "let’s look again", the drum tapped once per part as the parts are said, then another try', async () => {
    let result: GameResult | null = null
    mount(only(tiger()), (r) => (result = r), 3)
    await advance(100)
    for (let i = 0; i < 3; i++) tap('[data-guide="lp-drum"]')
    said.length = 0
    tap('[data-guide="lp-drum-check"]')
    expect(phase()).toBe('oops')
    // the help: the child's claps cleared, then one for each part as "Tie… gur." is said
    let most = 0
    for (let t = 0; t < 20000 && phase() !== 'ask'; t += 50) {
      await advance(50)
      if (said.includes('Tie… gur.')) most = Math.max(most, claps())
    }
    expect(said.slice(0, 4)).toEqual(["Hmm, let's look again.", "Let's tap it together.", 'Tie… gur.', 'Now you try!'])
    expect(most).toBe(2)
    expect(getGuideSnapshot().run?.lines.some((l) => l.text === 'Tie… gur.' && l.marks[0]?.target === 'lp-drum') || said.includes('Tie… gur.')).toBe(true)
    // another try: the claps start again from none, and it is asked again
    expect(phase()).toBe('ask')
    expect(claps()).toBe(0)
    expect(rings()).toBe(0)
    tap('[data-guide="lp-drum"]')
    tap('[data-guide="lp-drum"]')
    tap('[data-guide="lp-drum-check"]')
    expect(phase()).toBe('praise')
    for (let item = 1; item < 3; item++) {
      await until(() => phase() === 'ask' && q('[data-taps]')?.getAttribute('data-taps') === '0')
      tap('[data-guide="lp-drum"]')
      tap('[data-guide="lp-drum"]')
      tap('[data-guide="lp-drum-check"]')
      await until(() => phase() !== 'praise')
    }
    // the first try counts for the stars
    expect(result).toEqual({ stars: 2, score: 20, correct: 2, total: 3 })
  })

  it('never fails out: miss after miss, it helps and asks again; from the second miss, rings show how many claps', async () => {
    mount(only(tiger()))
    await advance(100)
    for (let miss = 1; miss <= 4; miss++) {
      await until(() => phase() === 'ask')
      tap('[data-guide="lp-drum"]')
      tap('[data-guide="lp-drum-check"]')
      expect(phase()).toBe('oops')
      await until(() => phase() === 'ask')
      expect(rings(), `after miss ${miss}`).toBe(miss >= 2 ? 2 : 0)
    }
    expect(said.filter((s) => s === 'Tie… gur.')).toHaveLength(4)
    // the rings fill as the claps come
    tap('[data-guide="lp-drum"]')
    expect([claps(), rings()]).toEqual([1, 1])
    tap('[data-guide="lp-drum"]')
    expect([claps(), rings()]).toEqual([2, 0])
    tap('[data-guide="lp-drum-check"]')
    expect(phase()).toBe('praise')
  })

  it('the drum questions from the provider play the same way (one part, three parts)', async () => {
    const p = makeKLiteracyProvider({ mode: 'syllables' })
    const asked = [p.next(), p.next(), p.next()]
    for (const item of asked.slice(1)) {
      act(() => root.unmount())
      root = createRoot(container)
      mount(only(item), () => {}, 3)
      await advance(100)
      const n = Number(q('[data-parts]')!.getAttribute('data-parts'))
      expect(n).toBe((item.activity as DrumSpec).parts)
      for (let i = 0; i < n; i++) tap('[data-guide="lp-drum"]')
      tap('[data-guide="lp-drum-check"]')
      expect(phase()).toBe('praise')
    }
  })
})

describe('the picture and word questions', () => {
  it('Rhyme time: the word’s picture and three named pictures; a wrong pick hears "cat, dog. Those don’t rhyme."', async () => {
    const item = makeKLiteracyProvider({ mode: 'rhyme' }).next()
    const t = /with (\w+)\?$/.exec(item.prompt)![1]
    mount(only(item))
    await advance(100)
    expect(q('[data-guide="lp-picture"]')).not.toBeNull()
    expect(cards()).toHaveLength(3)
    expectTextBudget(container, 0)
    await advance(8000)
    expect(said[0]).toBe(item.prompt)
    expect(said.slice(1, 4)).toHaveLength(3)
    const wrong = item.options.findIndex((o) => o !== item.answer)
    said.length = 0
    act(() => cards()[wrong].click())
    await advance(5000)
    expect(said).toContain(`${t}, ${item.options[wrong]}. Those don't rhyme.`)
    expectTextBudget(container, 0)
  })

  it('Finish the rhyme: the verse, then the cards named; no words on screen', async () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRng('finish'))
    const item = makeKLiteracyProvider({ mode: 'finishRhyme' }).next()
    mount(only(item))
    await advance(100)
    expect(q('[data-guide="lp-picture"]')).toBeNull()
    expect(cards()).toHaveLength(3)
    expectTextBudget(container, 0)
    await advance(16000)
    expect(said[0]).toBe(item.prompt)
    expect(said[0]).toMatch(/…$/)
  })

  it('Sound it out: "Listen: mmmm… oon." and three pictures; a wrong pick hears its own sounds', async () => {
    const item = makeKLiteracyProvider({ mode: 'blend' }).next()
    mount(only(item))
    await advance(100)
    expectTextBudget(container, 0)
    await advance(8000)
    expect(said[0]).toMatch(/^Listen: .+… .+\. What word\?$/)
    const wrong = item.options.findIndex((o) => o !== item.answer)
    said.length = 0
    act(() => cards()[wrong].click())
    await advance(5000)
    expect(said.find((s) => s.startsWith("That's "))).toMatch(new RegExp(`^That's ${item.options[wrong]}: .+… .+\\.$`))
  })

  it('Word hunt: exactly the three word cards are printed (in Andika); a wrong pick hears "That word is can."', async () => {
    const item = makeKLiteracyProvider({ mode: 'sight' }).next()
    mount(only(item))
    await advance(100)
    // the text budget allows exactly the word cards, nothing else
    expect(visibleWords(container).sort()).toEqual(item.options.map(String).sort())
    expectTextBudget(container, 3)
    for (const c of cards()) expect(c.querySelector('svg text')!.getAttribute('font-family')).toMatch(/^'Andika'/)
    await advance(6000)
    expect(said[0]).toBe(item.prompt)
    // the cards are never named aloud (that would read them for the child)
    for (const o of item.options) expect(said).not.toContain(`${o}!`)
    const wrong = item.options.findIndex((o) => o !== item.answer)
    said.length = 0
    act(() => cards()[wrong].click())
    await advance(5000)
    expect(said.slice(0, 2)).toEqual(["Hmm, let's look again.", `That word is ${item.options[wrong]}.`])
    expectTextBudget(container, 3)
  })
})

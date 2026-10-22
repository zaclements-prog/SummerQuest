import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import GuideLayer from '../../../guide/GuideLayer'
import { getGuideSnapshot, resetGuideForTests, subscribeGuide } from '../../../guide/store'
import { seededRng } from '../../../lib/random'
import { g1StoryProblem, type G1StoryNumbers } from '../../../lib/providers/g1StoryMath'
import { G1_WOODS_STORIES } from '../../../voice/packs/g1-woods'
import { useProgress } from '../../../store/progress'
import { expectTextBudget } from '../../../test/textBudget'
import type { GameResult } from '../../../screens/GameRunner'
import type { ProblemProvider } from '../../../lib/problem'
import { voiceText } from '../../../voice/registry'
import ListenPlay from '../ListenPlay'
import type { ListenProblem } from '../types'
import type { MathStorySpec } from '../activities/mathStorySpec'

/**
 * Story Woods at 1st grade: the `mathStory` activity's new kinds of story in
 * the real Listen & Play shell. The third line ("Now Bear has 9 apples.")
 * shows the spots to fill; acting it out counts on or back from the start;
 * taking apart moves only the kind being taken out; three groups come in
 * turn; the answer writes and reads the number sentence ("6 + 3 = 9"); a miss
 * acts the story out again together and counts what was asked. Never a
 * timer, never failing out, nothing to read but numbers and signs.
 */

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
vi.setConfig({ testTimeout: 60000 })

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
async function until(ok: () => boolean, ms = 30000) {
  for (let left = ms; left > 0 && !ok(); left -= 50) await advance(50)
  expect(ok()).toBe(true)
}

const q = <T extends Element = HTMLElement>(sel: string) => container.querySelector<T & HTMLElement>(sel)
const qa = (sel: string) => [...container.querySelectorAll<HTMLElement>(sel)]
const phase = () => q('[data-listen-play]')!.getAttribute('data-phase')
const story = () => q('[data-math-story]')
const stepNow = () => Number(story()?.getAttribute('data-ms-step') ?? -1)
const isOpen = () => !!story()?.hasAttribute('data-ms-open')
const isActing = () => !!story()?.hasAttribute('data-ms-acting')
const rightCard = () => qa('[data-guide^="lp-card-"]').find((c) => c.querySelector('[data-correct]'))!
const wrongCard = () => qa('[data-guide^="lp-card-"]').find((c) => !c.querySelector('[data-correct]') && c.getAttribute('data-state') !== 'tried')!
const home = () => qa('[data-thing][data-home]')
const click = (el: Element) => act(() => (el as HTMLElement).click())

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

beforeEach(() => {
  vi.useFakeTimers({ toFake: [...FAKE] })
  vi.spyOn(Math, 'random').mockImplementation(seededRng('g1-math-story'))
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

let serial = 0
/** A 1st-grade Story Woods question: this story, these numbers (the answer on card 0). */
function woods(id: string, n: G1StoryNumbers): ListenProblem {
  const s = G1_WOODS_STORIES.find((x) => x.id === id)!
  return g1StoryProblem(s, n, { arrange: (o) => [...o] }, `g1ms-${serial++}`)
}
const asking = (p: ListenProblem): ProblemProvider => ({ topic: p.topic, next: () => ({ ...p, id: `${p.id}-${serial++}` }) })
const spec = (p: ListenProblem) => p.activity as MathStorySpec

/** Act the story out: tap what can be tapped, one at a time, until the question opens. */
async function actItOut(max = 30): Promise<number> {
  let taps = 0
  for (; taps < max && !isOpen(); taps++) {
    const el = q('[data-act]')
    if (!el) break
    click(el)
    await advance(500)
  }
  return taps
}

describe('the change unknown', () => {
  it('add to: "Now Bear has 9 apples." shows the spots; bringing them in counts on; "How many did Fox give her?"; the sentence 6 + 3 = 9', async () => {
    const p = woods('appleGift', { a: 6, b: 3, extra: 2 })
    mount(asking(p), 3)
    await advance(60)
    expect(getGuideSnapshot().run!.lines.map((l) => l.text)).toEqual(['Bear had 6 apples.', 'Then Fox gave her some more.', 'Now Bear has 9 apples.', 'Bring them in to fill the empty spots!'])
    await until(() => stepNow() === 3)
    // three dashed spots up to nine
    expect(qa('[data-empty]')).toHaveLength(3)
    await until(isActing)
    // five wait at the side (more than are needed): only three come in
    expect(qa('[data-act]')).toHaveLength(5)
    said.length = 0
    expect(await actItOut()).toBe(3)
    expect(said.slice(0, 3)).toEqual(['7!', '8!', '9!'])
    expect(home()).toHaveLength(9)
    expect(qa('[data-empty]')).toHaveLength(0)
    await until(isOpen)
    expect(said).toContain('How many apples did Fox give her?')
    expectTextBudget(container, 0)
    click(rightCard())
    await until(() => !!q('[data-ms-sentence]'))
    const sentence = q('[data-ms-sentence]')!
    expect([...sentence.children].map((c) => c.textContent)).toEqual(['6', '+', '3', '=', '9'])
    expect(sentence.children[2].hasAttribute('data-answer')).toBe(true)
    await until(() => said.includes('6 plus 3 equals 9.'))
    expectTextBudget(container, 0)
  })

  it('take from: tapping them away counts back to the number said; the ones that went wait at the side to be counted', async () => {
    const p = woods('treeBirds', { a: 11, b: 4 })
    mount(asking(p), 3)
    await advance(60)
    expect(getGuideSnapshot().run!.lines.map((l) => l.text).slice(0, 4)).toEqual(['11 birds sat in a tree.', 'Then some flew away.', 'Now there are 7 birds in the tree.', 'Tap them away until 7 are left!'])
    await until(isActing)
    said.length = 0
    expect(await actItOut()).toBe(4)
    expect(said.slice(0, 4)).toEqual(['10!', '9!', '8!', '7!'])
    expect(home()).toHaveLength(7)
    await until(isOpen)
    // the four that flew away can be counted where they wait
    const gone = qa('[data-thing]:not([data-home]):not([data-hidden])')
    expect(gone).toHaveLength(4)
    click(gone[0])
    await advance(200)
    expect(gone[0].querySelector('.ms-badge')?.textContent).toBe('1')
    click(rightCard())
    await until(() => said.includes('11 minus 4 equals 7.'))
  })
})

describe('the start unknown, taking apart, three groups, how many fewer', () => {
  it('the start unknown: "Bear had some apples." nothing to see yet; the spots the newcomers don’t fill are dashed; the start pops in once found', async () => {
    const p = woods('appleStart', { a: 5, b: 3 })
    mount(asking(p), 3)
    await until(() => stepNow() === 1)
    expect(home()).toHaveLength(0)
    await until(isActing)
    expect(qa('[data-empty]')).toHaveLength(5)
    expect(await actItOut()).toBe(3)
    await until(isOpen)
    expect(home()).toHaveLength(3)
    expect(said).toContain('How many apples did Bear have at the start?')
    click(rightCard())
    await until(() => home().length === 8)
    await until(() => said.includes('5 plus 3 equals 8.'))
    expect(q('[data-ms-sentence] [data-answer]')!.textContent).toBe('5')
  })

  it('taking apart: only the tulips can be taken out; the sunflowers stay; "How many sunflowers?"', async () => {
    const p = woods('flowerSort', { a: 4, b: 5 })
    const s = spec(p)
    mount(asking(p), 3)
    await advance(60)
    expect(getGuideSnapshot().run!.lines.map((l) => l.text).slice(0, 3)).toEqual(['Bunny picked 9 flowers.', '4 are tulips. The rest are sunflowers.', 'Tap each tulip to take it out!'])
    await until(isActing)
    const tappable = qa('[data-act]')
    expect(tappable).toHaveLength(4)
    expect(tappable.every((el) => el.textContent === s.emoji)).toBe(true)
    expect(await actItOut()).toBe(4)
    expect(home().map((el) => el.textContent)).toEqual(Array(5).fill(s.emoji2))
    await until(isOpen)
    click(rightCard())
    await until(() => said.includes('9 minus 4 equals 5.'))
  })

  it('three groups: the second comes with its line, the third with its own; all of them put in; 3 + 2 + 4 = 9', async () => {
    const p = woods('fruitBasket', { a: 3, b: 2, c: 4 })
    const s = spec(p)
    mount(asking(p), 3)
    await until(() => stepNow() === 2)
    expect(qa('[data-thing]:not([data-hidden]):not([data-home])')).toHaveLength(2)
    await until(() => stepNow() === 3)
    expect(qa('[data-thing]:not([data-hidden]):not([data-home])')).toHaveLength(6)
    await until(isActing)
    expect(await actItOut()).toBe(6)
    expect(home().map((el) => el.textContent)).toEqual([...Array(3).fill(s.emoji), ...Array(2).fill(s.emoji2), ...Array(4).fill(s.emoji3)])
    await until(isOpen)
    click(rightCard())
    await until(() => !!q('[data-ms-sentence]'))
    expect([...q('[data-ms-sentence]')!.children].map((c) => c.textContent)).toEqual(['3', '+', '2', '+', '4', '=', '9'])
    await until(() => said.includes('3 plus 2 plus 4 equals 9.'))
  })

  it('how many fewer: Fox’s apples line up under Bear’s; the empty spots are how many fewer', async () => {
    const p = woods('applePicking', { a: 8, b: 5 })
    mount(asking(p), 3)
    await until(isActing)
    expect(said).toContain('Tap each one to line it up!')
    expect(await actItOut()).toBe(5)
    await until(isOpen)
    expect(qa('[data-empty]')).toHaveLength(3)
    click(rightCard())
    await until(() => said.includes('8 minus 5 equals 3.'))
  })
})

describe('a miss, and the round', () => {
  it('a miss acts the story out again together, counting on as they come, then counts how many came; never failing out', async () => {
    let result: GameResult | null = null
    const p = woods('appleGift', { a: 7, b: 4, extra: 2 })
    mount(asking(p), 3, (r) => (result = r))
    await until(isActing)
    await actItOut()
    await until(isOpen)
    said.length = 0
    click(wrongCard())
    await until(() => phase() === 'ask' && said.includes('Now you try!'), 60000)
    const from = said.indexOf("Let's act it out together.")
    expect(from).toBeGreaterThan(0)
    expect(said.slice(from + 1, from + 4)).toEqual(['Bear had 7 apples.', 'Then Fox gave her some more.', 'Now Bear has 11 apples.'])
    expect(said.slice(from + 4, from + 8)).toEqual(['8!', '9!', '10!', '11!'])
    expect(said.slice(from + 8, from + 10)).toEqual(["Let's count how many came.", 'One, two, three, four.'])
    expect(home()).toHaveLength(11)
    // the newcomers are ringed and counted
    expect(qa('[data-thing][data-home] .ms-fresh')).toHaveLength(4)
    await until(isOpen)
    click(rightCard())
    await until(() => phase() !== 'ask' || result !== null)
    for (let k = 0; k < 3 && result === null; k++) {
      await until(() => isActing() || isOpen() || result !== null)
      if (result) break
      if (isActing()) await actItOut()
      await until(isOpen)
      click(rightCard())
      await until(() => result !== null || phase() !== 'ask', 20000)
    }
    await until(() => result !== null)
    expect(result).toMatchObject({ correct: 2, total: 3 })
  })

  it('every written sentence is said as it appears, in the story’s own numbers', () => {
    for (const s of G1_WOODS_STORIES) {
      const n: G1StoryNumbers = { a: 6, b: 3, c: s.plot === 'three' ? 2 : undefined, extra: s.plot === 'joinChange' ? 2 : undefined }
      const p = woods(s.id, s.plot === 'leave' || s.plot === 'leaveChange' ? { a: 12, b: 3 } : n)
      const sp = spec(p)
      const text = voiceText(sp.sentenceSaid!)
      expect(text.replace(/[^\d ]/g, '').trim().split(/ +/).map(Number), s.id).toEqual(sp.sentence!.filter((t): t is number => typeof t === 'number'))
    }
  })
})

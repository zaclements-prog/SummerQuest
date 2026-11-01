import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StrictMode, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import GuideLayer from '../../../guide/GuideLayer'
import { getGuideSnapshot, resetGuideForTests, subscribeGuide } from '../../../guide/store'
import { createProvider } from '../../../lib/providers'
import { storyProblem } from '../../../lib/providers/kMathStory'
import { changeLine, startLine } from '../../../lib/providers/kAddTake'
import { seededRng } from '../../../lib/random'
import { pickTodaysChallenge } from '../../../lib/daily'
import { localDayKey } from '../../../lib/dates'
import { zoneStages, getZone } from '../../../curriculum'
import { effectiveConfigForStage } from '../../../lib/gradeTiers'
import { useProgress } from '../../../store/progress'
import { expectTextBudget } from '../../../test/textBudget'
import type { GameResult } from '../../../screens/GameRunner'
import type { ProblemProvider } from '../../../lib/problem'
import { voiceText } from '../../../voice/registry'
import ListenPlay from '../ListenPlay'
import type { ListenProblem } from '../types'
import type { MathStorySpec } from '../activities/mathStorySpec'

/**
 * The `mathStory` activity (Add-and-Take Falls, Story Woods) in the real
 * Listen & Play shell: the scene does what the voice says as it says it; the
 * cards open with the question; a wrong card gets its word, the story again
 * (slower, the change counted), the answer counted, and another try; Story
 * Woods waits for the child to act the change out; make ten counts the empty
 * spots. Never a timer, never failing out, nothing to read.
 */

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
// (fake timers keep these quick, but a busy machine can still take a while over many steps)
vi.setConfig({ testTimeout: 30000 })

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

function mount(provider: ProblemProvider, count: number, onComplete: (r: GameResult) => void = () => {}, strict = false) {
  const tree = (
    <>
      <GuideLayer />
      <ListenPlay provider={provider} params={{ questionCount: count }} onComplete={onComplete} onExit={() => {}} />
    </>
  )
  act(() => root.render(strict ? <StrictMode>{tree}</StrictMode> : tree))
}

const q = <T extends Element = HTMLElement>(sel: string) => container.querySelector<T & HTMLElement>(sel)
const qa = (sel: string) => [...container.querySelectorAll<HTMLElement>(sel)]
const phase = () => q('[data-listen-play]')!.getAttribute('data-phase')
const story = () => q('[data-math-story]')
const stepNow = () => Number(story()?.getAttribute('data-ms-step') ?? -1)
const isOpen = () => !!story()?.hasAttribute('data-ms-open')
const isActing = () => !!story()?.hasAttribute('data-ms-acting')
const card = (i: number) => q<HTMLButtonElement>(`[data-guide="lp-card-${i}"]`)!
const rightCard = () => qa('[data-guide^="lp-card-"]').find((c) => c.querySelector('[data-correct]'))!
const wrongCard = () => qa('[data-guide^="lp-card-"]').find((c) => !c.querySelector('[data-correct]') && c.getAttribute('data-state') !== 'tried')!
const home = () => qa('[data-thing][data-home]')
const click = (el: Element) => act(() => (el as HTMLElement).click())

beforeEach(() => {
  vi.useFakeTimers({ toFake: [...FAKE] })
  vi.spyOn(Math, 'random').mockImplementation(seededRng('math-story'))
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
/** An Add-and-Take Falls question with these numbers (the answer on card 0). */
function falls(plot: 'join' | 'leave' | 'frame', a: number, b: number): ListenProblem {
  const spec: MathStorySpec = {
    kind: 'mathStory',
    plot,
    a,
    b: plot === 'frame' ? 10 - a : b,
    emoji: '🐸',
    place: 'falls',
    home: plot === 'frame' ? 'frame' : 'log',
    motion: 'hop',
    lines: plot === 'frame' ? [startLine('frogs', a)] : [startLine('frogs', a), changeLine('frogs', plot, b)],
    ask: { line: `k-addtake/${plot === 'frame' ? 'makeTen' : plot === 'join' ? 'howManyNow' : 'howManyLeft'}` },
  }
  return storyProblem(spec, { arrange: (o) => [...o] }, { id: `ms-${serial++}`, topic: 'kAddTake', subtopic: plot, skill: { id: 'k-add-take', label: 'adding and taking away' } })
}
/** A Story Woods question: acted out. */
function woods(plot: 'join' | 'leave' | 'compare', a: number, b: number): ListenProblem {
  const id = plot === 'join' ? 'bearApples' : plot === 'leave' ? 'owlBirds' : 'bunnyLunch'
  const spec: MathStorySpec = {
    kind: 'mathStory',
    plot,
    a,
    b,
    emoji: plot === 'join' ? '🍎' : plot === 'leave' ? '🐦' : '🐰',
    emoji2: plot === 'compare' ? '🥕' : undefined,
    place: 'woods',
    home: 'patch',
    who: plot === 'compare' ? undefined : '🐻',
    friend: plot === 'join' ? '🦊' : undefined,
    motion: 'slide',
    lines: [
      { template: `k-woods/${id}-a`, slots: { n: a } },
      { template: `k-woods/${id}-b`, slots: { n: b } },
    ],
    ask: { line: `k-woods/${id}-q` },
    act: { line: `k-story-math/${plot === 'join' ? 'actIn' : plot === 'leave' ? 'actAway' : 'actGive'}` },
  }
  return storyProblem(spec, { arrange: (o) => [...o] }, { id: `ms-${serial++}`, topic: 'kStoryMath', subtopic: plot, skill: { id: 'k-story-problems', label: 'story problems' } })
}
const asking = (p: ListenProblem): ProblemProvider => ({ topic: p.topic, next: () => p })
const spec = (p: ListenProblem) => p.activity as MathStorySpec

describe('watching it happen (Add-and-Take Falls)', () => {
  it('"Here are 3 frogs." pops three in; "2 more hop in." brings two more; "How many now?" opens the cards', async () => {
    const p = falls('join', 3, 2)
    mount(asking(p), 3)
    await advance(60)
    const run = getGuideSnapshot().run!
    expect(run.lines.map((l) => l.text)).toEqual(['Here are 3 frogs.', '2 more hop in.', 'How many now?'])
    expect(run.lines.map((l) => l.marks[0].target)).toEqual(['ms-scene', 'ms-scene', 'ms-home'])
    // the cards are swept as the question is asked (never the answer alone)
    expect(run.lines[2].marks[1].target).toEqual(['lp-card-0', 'lp-card-1', 'lp-card-2'])
    expect(run.lines[2].marks[1].hand).toBe('sweep')
    expect(q('[data-activity="mathStory"]')).not.toBeNull()
    // before the story starts nothing is there, and the cards wait
    expect(card(0).getAttribute('aria-disabled')).toBe('true')
    await until(() => stepNow() === 1)
    expect(home()).toHaveLength(3)
    await until(() => stepNow() === 2)
    expect(home()).toHaveLength(5)
    expect(isOpen()).toBe(false)
    await until(() => isOpen())
    expect(card(0).hasAttribute('aria-disabled')).toBe(false)
    expectTextBudget(container, 0)
  })

  it('takes away: "Here are 5 frogs." "2 hop away." the last two leave; three are left', async () => {
    const p = falls('leave', 5, 2)
    mount(asking(p), 3)
    await until(() => stepNow() === 1)
    expect(home()).toHaveLength(5)
    await until(() => stepNow() === 2)
    expect(home()).toHaveLength(3)
    expect(home().map((e) => e.dataset.thing)).toEqual(['0', '1', '2'])
    expect(said.slice(0, 2)).toEqual(['Here are 5 frogs.', '2 hop away.'])
  })

  it('the right card: said, a happy pop, praise, and on; first tries earn the stars', async () => {
    let result: GameResult | null = null
    const qs = [falls('join', 3, 2), falls('leave', 4, 1), falls('join', 2, 2)]
    let n = 0
    mount({ topic: 'kAddTake', next: () => qs[n++ % qs.length] }, 3, (r) => (result = r))
    for (let k = 0; k < 3; k++) {
      await until(() => !!q('[data-ms-open]'))
      click(rightCard())
      expect(rightCard().getAttribute('data-state')).toBe('chosen')
      await until(() => rightCard().getAttribute('data-state') === 'right')
      await until(() => phase() === 'loading' || phase() === 'ask' || phase() === 'done', 8000)
      await advance(400)
    }
    await until(() => result !== null)
    expect(result).toEqual({ stars: 3, score: 30, correct: 3, total: 3 })
  })

  it('a wrong card: its word, the story again slower (the change counted), the answer counted, then another try', async () => {
    const p = falls('join', 3, 2)
    const [, start, change] = ['', ...spec(p).lines.map(voiceText)]
    mount(asking(p), 3)
    await until(() => isOpen())
    // card 1 is the mix-up: "3", how many there were at the start
    expect(p.options[1]).toBe(3)
    said.length = 0
    click(card(1))
    await advance(1200)
    expect(card(1).getAttribute('data-state')).toBe('look')
    await until(() => said.includes('Now you try!'), 40000)
    expect(said.slice(0, 2)).toEqual(['3!', "Hmm, let's look again."])
    expect(said.slice(2)).toEqual([
      "That's how many there were at the start.",
      "Let's watch it again.",
      start,
      change,
      'One, two.',
      "Let's count together.",
      'One, two, three, four, five.',
      'Now you try!',
    ])
    // each of the five got its number as it was counted
    expect(qa('[data-thing] .ms-badge').map((b) => b.textContent)).toEqual(['1', '2', '3', '4', '5'])
    await until(() => phase() === 'ask')
    await advance(300)
    // asked again (just the question), the tried card resting aside
    expect(getGuideSnapshot().run!.lines.map((l) => l.text)).toEqual(['How many now?'])
    expect(card(1).getAttribute('data-state')).toBe('tried')
    expect(getGuideSnapshot().run!.lines[0].marks[1].target).toEqual(['lp-card-0', 'lp-card-2'])
    await until(() => isOpen())
    click(card(1))
    await advance(400)
    expect(card(1).getAttribute('data-state')).toBe('tried')
    click(card(0))
    await until(() => phase() === 'praise')
  })

  it('never fails out: wrong after wrong, the help again and another try', async () => {
    const p = falls('leave', 6, 2)
    mount(asking(p), 3)
    for (let k = 0; k < 2; k++) {
      await until(() => isOpen() && phase() === 'ask', 40000)
      click(wrongCard())
      await until(() => phase() === 'oops')
      await until(() => phase() === 'ask', 40000)
    }
    await until(() => isOpen())
    click(rightCard())
    await until(() => phase() === 'praise')
  })

  it('after the question, the things can be tapped to count them', async () => {
    mount(asking(falls('join', 2, 2)), 3)
    await until(() => isOpen())
    await advance(2500)
    said.length = 0
    for (const el of home()) {
      click(el)
      await advance(700)
    }
    expect(said).toEqual(['1!', '2!', '3!', '4!'])
    // tapping a counted one again is a soft tick, not a new number
    click(home()[0])
    await advance(500)
    expect(said).toHaveLength(4)
  })

  it('make ten: a ten-frame; a wrong card counts the empty spots, filling each one, then "3 more make ten!"', async () => {
    const p = falls('frame', 7, 3)
    mount(asking(p), 3)
    await advance(60)
    expect(getGuideSnapshot().run!.lines.map((l) => l.text)).toEqual(['Here are 7 frogs.', 'How many more make ten?'])
    await until(() => isOpen())
    expect(home()).toHaveLength(7)
    expect(qa('[data-empty]')).toHaveLength(3)
    said.length = 0
    // the card that says how many are already there
    click(qa('[data-guide^="lp-card-"]').find((c) => c.getAttribute('aria-label') === '7')!)
    await until(() => said.includes('Now you try!'), 40000)
    expect(said.slice(2)).toEqual(["That's how many are there already.", "Let's count the empty spots.", 'One, two, three.', '3 more make ten!', 'Now you try!'])
    expect(home()).toHaveLength(10)
    expect(qa('[data-thing] .ms-badge').map((b) => b.textContent)).toEqual(['1', '2', '3'])
    await until(() => isOpen() && phase() === 'ask')
    click(rightCard())
    await until(() => phase() === 'praise')
  })

  it('shows nothing to read, and plays under React’s dev double mount', async () => {
    mount(asking(falls('join', 1, 1)), 3, () => {}, true)
    await until(() => isOpen())
    expect(said.slice(0, 3)).toEqual(['Here is one frog.', 'One more hops in.', 'How many now?'])
    expect(home()).toHaveLength(2)
    expectTextBudget(container, 0)
    click(rightCard())
    await until(() => phase() === 'praise')
  })
})

describe('acting it out (Story Woods)', () => {
  it('join: the story, then "Tap each one to bring it in!"; each tap brings one in and counts it; then the question', async () => {
    const p = woods('join', 3, 2)
    mount(asking(p), 3)
    await advance(60)
    expect(getGuideSnapshot().run!.lines.map((l) => l.text)).toEqual(['Bear picked 3 apples.', 'Then Fox brought her 2 more.', 'Tap each one to bring it in!'])
    await until(() => isActing())
    expect(home()).toHaveLength(3)
    // the cards wait for the acting
    expect(card(0).getAttribute('aria-disabled')).toBe('true')
    const waiting = qa('[data-act]')
    expect(waiting).toHaveLength(2)
    // the group can't be tapped away: only the newcomers move
    expect(qa('[data-thing][data-home][data-act]')).toHaveLength(0)
    said.length = 0
    click(waiting[0])
    await advance(700)
    expect(home()).toHaveLength(4)
    click(qa('[data-act]')[0])
    await advance(700)
    expect(home()).toHaveLength(5)
    expect(qa('[data-act]')).toHaveLength(0)
    await until(() => isOpen())
    expect(said).toEqual(['1!', '2!', 'How many apples does Bear have now?'])
    expectTextBudget(container, 0)
    click(rightCard())
    await until(() => phase() === 'praise')
  })

  it('leave: "Tap each one that goes away!": any of the group, and no more than the story says', async () => {
    mount(asking(woods('leave', 6, 2)), 3)
    await until(() => isActing())
    expect(qa('[data-act]')).toHaveLength(6)
    click(q('[data-thing="1"]')!)
    await advance(500)
    click(q('[data-thing="4"]')!)
    await advance(500)
    expect(home().map((e) => e.dataset.thing)).toEqual(['0', '2', '3', '5'])
    expect(qa('[data-act]')).toHaveLength(0)
    await until(() => isOpen())
    expect(said.at(-1)).toBe('How many birds are still in the tree?')
    click(rightCard())
    await until(() => phase() === 'praise')
  })

  it('how many more: a carrot for each bunny in turn; the empty spots are what we still need', async () => {
    const p = woods('compare', 5, 3)
    mount(asking(p), 3)
    await until(() => isActing())
    for (let k = 0; k < 3; k++) {
      click(qa('[data-act]')[0])
      await advance(600)
    }
    await until(() => isOpen())
    expect(qa('[data-empty]')).toHaveLength(2)
    // the empty spots count
    said.length = 0
    for (const e of qa('[data-empty]')) {
      click(e)
      await advance(600)
    }
    expect(said).toEqual(['1!', '2!'])
    click(rightCard())
    // the treats still needed pop in
    await until(() => qa('[data-empty]').length === 0)
    expect(home()).toHaveLength(10)
    await until(() => phase() === 'praise')
  })

  it('a wrong card: the hand acts it out together, slowly, then the answer is counted; the question again', async () => {
    const p = woods('join', 2, 2)
    mount(asking(p), 3)
    await until(() => isActing())
    for (let k = 0; k < 2; k++) {
      click(qa('[data-act]')[0])
      await advance(600)
    }
    await until(() => isOpen())
    said.length = 0
    click(wrongCard())
    await until(() => said.includes('Now you try!'), 40000)
    const helped = said.slice(said.indexOf("Let's act it out together."))
    expect(helped).toEqual(["Let's act it out together.", 'Bear picked 2 apples.', 'Then Fox brought her 2 more.', 'One, two.', "Let's count together.", 'One, two, three, four.', 'Now you try!'])
    await until(() => phase() === 'ask')
    await advance(300)
    // acted out by the help: straight to the question
    expect(getGuideSnapshot().run!.lines.map((l) => l.text)).toEqual(['How many apples does Bear have now?'])
    await until(() => isOpen())
    click(rightCard())
    await until(() => phase() === 'praise')
  })
})

describe('the real stages', () => {
  const stage = (zoneId: string, i: number) => {
    const st = zoneStages(getZone(zoneId)!, 0)[i]
    return { st, provider: createProvider(effectiveConfigForStage(st, i, 0)) }
  }

  /** Play a whole round: act out what waits for a tap, then tap the right card. */
  async function playRound(provider: ProblemProvider, count: number): Promise<GameResult> {
    let result: GameResult | null = null
    mount(provider, count, (r) => (result = r))
    for (let guard = 0; guard < 4000 && !result; guard++) {
      const el = q('[data-math-story]')
      if (el && phase() === 'ask') {
        const a = q('[data-act]')
        if (el.hasAttribute('data-ms-acting') && a) {
          click(a)
          await advance(450)
          continue
        }
        if (el.hasAttribute('data-ms-open')) {
          const c = rightCard()
          if (c && c.getAttribute('data-state') === 'idle') {
            click(c)
            await advance(300)
            continue
          }
        }
      }
      await advance(100)
    }
    expect(result).not.toBeNull()
    return result!
  }

  it.each([
    ['fraction-falls', 0],
    ['fraction-falls', 1],
    // (stage 2 is the Snack Shack, its own game)
    ['fraction-falls', 3],
    ['word-problem-woods', 0],
    ['word-problem-woods', 1],
    ['word-problem-woods', 2],
  ] as const)('%s stage %i plays to its stars', async (zoneId, i) => {
    const { st, provider } = stage(zoneId, i)
    const count = Number(st.params?.questionCount)
    expect(await playRound(provider, count)).toEqual({ stars: 3, score: count * 10, correct: count, total: count })
  }, 60000)

  it('…and in the K Daily Challenge, when it lands on these zones', async () => {
    const days = Array.from({ length: 200 }, (_, d) => localDayKey(new Date(2026, 0, 1 + d)))
    const picks = days.map((d) => pickTodaysChallenge(0, d)).filter((x) => x.zone.id === 'fraction-falls' || x.zone.id === 'word-problem-woods')
    expect(new Set(picks.map((x) => x.stage.id))).toEqual(new Set(['k-addsub-1', 'k-woods-1']))
    const { stage: st } = picks[0]
    const result = await playRound(createProvider(effectiveConfigForStage(st, 0, 0)), 5)
    expect(result.total).toBe(5)
  }, 60000)
})

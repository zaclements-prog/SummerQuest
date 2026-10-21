import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import GuideLayer from '../../../guide/GuideLayer'
import { getGuideSnapshot, resetGuideForTests, subscribeGuide } from '../../../guide/store'
import { createProvider } from '../../../lib/providers'
import { seededRng } from '../../../lib/random'
import { pickTodaysChallenge, DAILY_QUESTION_COUNT } from '../../../lib/daily'
import { localDayKey } from '../../../lib/dates'
import { effectiveConfigForStage } from '../../../lib/gradeTiers'
import { zoneStages } from '../../../curriculum'
import { useProgress } from '../../../store/progress'
import { expectTextBudget } from '../../../test/textBudget'
import type { GameResult } from '../../../screens/GameRunner'
import type { ProblemProvider } from '../../../lib/problem'
import { voiceText } from '../../../voice/registry'
import type { VoiceRef } from '../../../voice/types'
import ListenPlay from '../ListenPlay'
import type { ListenProblem } from '../types'
import { answerOf, type BuildSpec, type MatchSpec, type NumberActivitySpec, type NumberOrderSpec, type NumbersSpec, type TenFramesSpec } from '../activities/numberSpecs'

/**
 * Number Dunes' and Ten Frame Plateau's activities in the real Listen & Play
 * shell: asked aloud with the right things lit, nothing to read, a right
 * answer praised, a miss → "let's look again" → the activity's own help (the
 * rows lined up and matched, the ten-frames counted, a full ten and the ones
 * counted on) → "Now you try!", and never failing out.
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
async function until(ok: () => boolean, ms = 30000) {
  for (let t = 0; t < ms && !ok(); t += 50) await advance(50)
  expect(ok()).toBe(true)
}

const q = <T extends Element = HTMLElement>(sel: string) => container.querySelector<T>(sel)
const qa = (sel: string) => [...container.querySelectorAll<HTMLElement>(sel)]
const cards = () => qa('button[data-guide^="lp-card-"]') as HTMLButtonElement[]
const phase = () => q('[data-listen-play]')!.getAttribute('data-phase')
/** A tap (SVG cells too: jsdom gives them no `click()`). */
const tap = (el: Element | null) => act(() => {
  el!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
})
const asked = () => getGuideSnapshot().run!.lines

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

let serial = 0
/** A question for this activity, said with this line. */
function question(spec: NumberActivitySpec, speech: VoiceRef, topic = 'kCompare'): ListenProblem {
  const options = spec.kind === 'matchRows' ? ['top', 'bottom', 'same'] : spec.kind === 'compareNumbers' || spec.kind === 'teenFrames' ? [...spec.cards] : []
  return { id: `nq-${serial++}`, prompt: voiceText(speech), options, answer: answerOf(spec), topic, speech, activity: spec }
}
/** A provider that asks this question (a fresh copy each time). */
const only = (p: ListenProblem): ProblemProvider => ({ topic: p.topic, next: () => ({ ...p, id: `${p.id}-${serial++}` }) })

/** Answer whatever number activity is on screen, right (cards from the dev marker; tiles in order; the frames filled). */
async function answerRight() {
  const right = q('[data-guide^="lp-card-"]:has([data-correct])')
  if (right) return tap(right)
  const order = q('[data-order]')
  if (order) {
    const n = order.getAttribute('data-order')!.split(' ').length
    for (let step = Number(order.getAttribute('data-order-placed')); step < n; step++) {
      tap(q(`[data-guide="num-tile-${step}"]`))
      await advance(900)
    }
    return
  }
  const build = q('[data-build]')!
  const want = Number(build.getAttribute('data-build'))
  for (let c = Number(build.getAttribute('data-build-count')); c < want; c++) tap(q(`[data-guide="build-frames"] [data-cell="${c}"]`))
  tap(q('[data-guide="build-check"]'))
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: [...FAKE] })
  vi.spyOn(Math, 'random').mockImplementation(seededRng('k-number-activities'))
  resetGuideForTests()
  useProgress.setState({ stats: { ...useProgress.getState().stats, problemsAnswered: 0, problemsCorrect: 0 } })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  said = []
  let line = -1
  unsubscribe = subscribeGuide(() => {
    const s = getGuideSnapshot()
    if (s.run && s.lineSerial !== line) {
      line = s.lineSerial
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

// ── Number Dunes ─────────────────────────────────────────────────────────────

describe('Line them up (matchRows)', () => {
  const BEES: MatchSpec = { kind: 'matchRows', pair: 'bees', top: 4, bottom: 3, ask: 'more', lined: false }

  it('two rows and three cards (the bee, the flower, the same), each lit on its word; nothing to read', async () => {
    mount(only(question(BEES, { line: 'k-compare/ask-more-bees' })))
    await advance(100)
    expect(q('[data-activity]')!.getAttribute('data-activity')).toBe('matchRows')
    expect(qa('[data-thing="top"]')).toHaveLength(4)
    expect(qa('[data-thing="bottom"]')).toHaveLength(3)
    expect(q('[data-match]')!.hasAttribute('data-lined')).toBe(false)
    expect(cards().map((c) => c.getAttribute('aria-label'))).toEqual(['bees', 'flowers', 'the same'])
    expect(cards().map((c) => c.textContent)).toEqual(['🐝', '🌼', '⚖️'])
    expectTextBudget(container, 0)
    const lines = asked()
    expect(lines[0].text).toBe('Are there more bees or more flowers? Or are they the same?')
    expect(lines[0].marks.map((m) => [m.target, m.cue])).toEqual([
      ['match-rows', undefined],
      ['lp-card-0', 'bees'],
      ['lp-card-1', 'flowers'],
      ['lp-card-2', 'same'],
    ])
    // then the hand glides over all three, never one alone
    expect(lines[1].marks[0]).toMatchObject({ target: ['lp-card-0', 'lp-card-1', 'lp-card-2'], hand: 'sweep' })
  })

  it('a miss: the rows line up, each pair joined as it is counted, what is left over lights up; then another try, never failing out', async () => {
    let result: GameResult | null = null
    mount(only(question(BEES, { line: 'k-compare/ask-more-bees' })), (r) => (result = r), 3)
    await advance(5000)
    said.length = 0
    tap(cards()[2])
    await until(() => said.includes('Now you try!'))
    expect(said).toEqual(['The same!', "Hmm, let's look again.", "Let's line them up!", 'One, two, three.', 'Some bees have no flower.', 'There are more bees!', 'Now you try!'])
    expect(q('[data-match]')!.hasAttribute('data-lined')).toBe(true)
    expect(q('[data-match]')!.getAttribute('data-joined')).toBe('3')
    // the leftover bee hops in its glow
    expect(qa('.nk-left')).toHaveLength(1)
    await until(() => phase() === 'ask')
    expect(cards()[2].getAttribute('data-state')).toBe('tried')
    // the re-ask lights only the cards still in play
    await advance(200)
    expect(asked()[0].marks.map((m) => m.target)).toEqual(['match-rows', 'lp-card-0', 'lp-card-1'])
    // a second miss: the help again, and still another try
    await advance(5000)
    said.length = 0
    tap(cards()[1])
    await until(() => said.includes('Now you try!'))
    expect(said).toContain('There are more bees!')
    await until(() => phase() === 'ask')
    tap(cards()[0])
    await until(() => phase() === 'praise')
    expect(cards()[0].getAttribute('data-state')).toBe('right')
    for (let i = 0; i < 2; i++) {
      await until(() => phase() === 'ask' && !!q('[data-match]'))
      await advance(4000)
      await answerRight()
      await until(() => phase() !== 'ask')
    }
    await until(() => result !== null)
    expect(result).toEqual({ stars: 2, score: 20, correct: 2, total: 3 })
  })

  it('the same: "Every hen has an egg. They are the same!"; and "fewer" asks for the row with fewer', async () => {
    const SAME: MatchSpec = { kind: 'matchRows', pair: 'hens', top: 5, bottom: 5, ask: 'more', lined: true }
    mount(only(question(SAME, { line: 'k-compare/ask-more-hens' })))
    await advance(5000)
    said.length = 0
    tap(cards()[0])
    await until(() => said.includes('Now you try!'))
    expect(said).toEqual(['Hens!', "Hmm, let's look again.", "Let's line them up!", 'One, two, three, four, five.', 'Every hen has an egg. They are the same!', 'Now you try!'])
    expect(qa('.nk-left')).toHaveLength(0)

    act(() => root.render(<></>))
    said.length = 0
    const FEWER: MatchSpec = { kind: 'matchRows', pair: 'cats', top: 6, bottom: 4, ask: 'fewer', lined: false }
    mount(only(question(FEWER, { line: 'k-compare/ask-fewer-cats' })))
    await advance(5000)
    expect(q('[data-guide="lp-card-1"]')!.querySelector('[data-correct]')).not.toBeNull()
    tap(cards()[0])
    await until(() => said.includes('Now you try!'))
    expect(said.slice(-3)).toEqual(['Some cats have no fish.', 'There are fewer fish!', 'Now you try!'])
  })
})

describe('Which is more? (compareNumbers)', () => {
  it('"Which number is more, four or seven?": each card lit on its number; a miss shows the ten-frames and counts the dots', async () => {
    const spec: NumbersSpec = { kind: 'compareNumbers', ask: 'more', a: 4, b: 7, cards: [4, 7] }
    mount(only(question(spec, { line: 'k-compare/more-4-7' })))
    await advance(100)
    expect(cards().map((c) => c.getAttribute('aria-label'))).toEqual(['4', '7'])
    expect(q('[data-guide="numbers-frame"]')).toBeNull()
    expectTextBudget(container, 0)
    expect(asked()[0].marks.map((m) => [m.target, m.cue])).toEqual([
      [['lp-card-0', 'lp-card-1'], undefined],
      ['lp-card-0', 'four'],
      ['lp-card-1', 'seven'],
    ])
    // no ten-frames yet: the numbers alone
    expect(qa('[data-frames]')).toHaveLength(0)
    await advance(4000)
    said.length = 0
    tap(cards()[0])
    await until(() => said.includes('Now you try!'))
    expect(said).toEqual(['4!', "Hmm, let's look again.", "Let's count the dots on each one.", 'One, two, three, four.', 'One, two, three, four, five, six, seven.', 'Seven is more than four.', 'Now you try!'])
    expect(q('[data-numbers]')!.hasAttribute('data-revealed')).toBe(true)
    expect(cards().map((c) => c.querySelectorAll('[data-filled]').length)).toEqual([4, 7])
    expect(cards().map((c) => c.querySelectorAll('[data-marked]').length)).toEqual([4, 7])
    expectTextBudget(container, 0)
    await until(() => phase() === 'ask')
    tap(cards()[1])
    await until(() => phase() === 'praise')
  })

  it('"…less…": the smaller number, and "Three is less than eight."', async () => {
    const spec: NumbersSpec = { kind: 'compareNumbers', ask: 'less', a: 8, b: 3, cards: [8, 3] }
    mount(only(question(spec, { line: 'k-compare/less-8-3' })))
    await advance(4000)
    said.length = 0
    tap(cards()[0])
    await until(() => said.includes('Now you try!'))
    expect(said).toContain('Three is less than eight.')
  })

  it('one more: a dot drops in on "One more"; a miss counts the dots, "Six and one more is seven."', async () => {
    const spec: NumbersSpec = { kind: 'compareNumbers', ask: 'oneMore', a: 6, cards: [8, 6, 7] }
    mount(only(question(spec, { line: 'k-compare/oneMore-6' })))
    await advance(100)
    const frame = () => q('[data-guide="numbers-frame"] svg')!
    expect(frame().getAttribute('data-count')).toBe('6')
    expect(asked()[0].text).toBe('Here are six dots. One more comes! How many now?')
    await until(() => !!q('[data-numbers]')?.hasAttribute('data-dropped'))
    expect(frame().getAttribute('data-count')).toBe('7')
    expect(qa('.nk-fresh')).toHaveLength(1)
    expectTextBudget(container, 0)
    await advance(3000)
    said.length = 0
    tap(cards()[0])
    await until(() => said.includes('Now you try!'))
    expect(said).toEqual(['8!', "Hmm, let's look again.", "Let's count together.", 'One, two, three, four, five, six, seven.', 'Six and one more is seven.', 'Now you try!'])
    expect(frame().querySelectorAll('[data-marked]')).toHaveLength(7)
  })

  it('one less: a dot hops away on "One hops away"', async () => {
    const spec: NumbersSpec = { kind: 'compareNumbers', ask: 'oneLess', a: 5, cards: [4, 5, 3] }
    mount(only(question(spec, { line: 'k-compare/oneLess-5' })))
    await until(() => !!q('[data-numbers]')?.hasAttribute('data-dropped'))
    await advance(900)
    expect(q('[data-guide="numbers-frame"] svg')!.getAttribute('data-count')).toBe('4')
    await advance(3000)
    said.length = 0
    tap(cards()[1])
    await until(() => said.includes('Now you try!'))
    expect(said).toContain('Five, take away one, is four.')
  })
})

describe('Numbers in order (numberOrder)', () => {
  const RUN: NumberOrderSpec = { kind: 'numberOrder', numbers: [3, 4, 5, 6], mixed: [2, 0, 3, 1] }

  it('mixed up on top, slots below; smallest first; a wrong one is a miss: counted in order, then carry on', async () => {
    mount(only(question(RUN, { line: 'k-compare/orderAsk' })))
    await advance(100)
    expect(asked()[0].text).toBe('Put the numbers in order! Tap the smallest number first.')
    expect(asked()[0].marks.map((m) => [m.target, m.cue])).toEqual([
      ['num-tray', undefined],
      ['num-slot-0', 'smallest'],
    ])
    expectTextBudget(container, 0)
    const placed = () => q('[data-order]')!.getAttribute('data-order-placed')
    await advance(4000)
    tap(q('[data-guide="num-tile-0"]'))
    expect(placed()).toBe('1')
    await advance(1000)
    said.length = 0
    tap(q('[data-guide="num-tile-2"]'))
    await until(() => said.includes('Now you try!'))
    expect(said).toEqual(["Hmm, let's look again.", "Let's count them in order.", '3!', '4!', '5!', '6!', 'Now you try!'])
    await until(() => phase() === 'ask')
    await advance(100)
    expect(asked()[0].text).toBe('Which number comes next? Tap it!')
    expect(placed()).toBe('1')
    for (const step of [1, 2, 3]) {
      tap(q(`[data-guide="num-tile-${step}"]`))
      await advance(900)
    }
    // all in order: the try that was right (the first try missed, so no star for it)
    await until(() => phase() === 'praise')
    expect(placed()).toBe('4')
    expect(useProgress.getState().stats.problemsAnswered).toBe(1)
  })
})

// ── Ten Frame Plateau ────────────────────────────────────────────────────────

describe('Ten and more (teenFrames)', () => {
  it('"A full ten and three more. How many dots?": a miss lights the full ten, counts on the ones, "Ten and three more: thirteen."', async () => {
    const spec: TenFramesSpec = { kind: 'teenFrames', ask: 'howMany', n: 13, cards: [3, 13, 14] }
    mount(only(question(spec, { line: 'k-teens/tenAnd-3' }, 'kTeens')))
    await advance(100)
    const pic = () => q('[data-guide="teen-picture"]')!
    expect(pic().querySelector('svg')!.getAttribute('data-frames')).toBe('2')
    expect(pic().querySelectorAll('[data-filled]')).toHaveLength(13)
    expectTextBudget(container, 0)
    await advance(4000)
    said.length = 0
    tap(cards()[0])
    await until(() => said.includes('Now you try!'))
    expect(said).toEqual(['3!', "Hmm, let's look again.", 'A full ten!', '11!', '12!', '13!', 'Ten and three more: thirteen.', 'Now you try!'])
    expect(pic().querySelectorAll('.nk-frame-glow[data-on]')).toHaveLength(1)
    expect([...pic().querySelectorAll('[data-marked]')].map((c) => c.getAttribute('data-cell'))).toEqual(['10', '11', '12'])
    await until(() => phase() === 'ask')
    tap(cards()[1])
    await until(() => phase() === 'praise')
  })

  it('"Which one shows fourteen?": ten-frame cards; the ones alone hear "That\'s only four", one off is counted on', async () => {
    const spec: TenFramesSpec = { kind: 'teenFrames', ask: 'shows', n: 14, cards: [4, 15, 14] }
    mount(only(question(spec, { line: 'k-teens/shows-14' }, 'kTeens')))
    await advance(100)
    // every card has two frames; the ones alone sit in the bottom one, under an empty ten
    expect(cards().map((c) => c.querySelectorAll('[data-filled]').length)).toEqual([4, 15, 14])
    expect([...cards()[0].querySelectorAll('[data-filled]')].map((c) => Number(c.getAttribute('data-cell')))).toEqual([10, 11, 12, 13])
    expectTextBudget(container, 0)
    await advance(4000)
    said.length = 0
    tap(cards()[0])
    await until(() => said.includes('Now you try!'))
    expect(said).toEqual(['4!', "Hmm, let's look again.", 'One, two, three, four.', "That's only four. There's no full ten!", 'Now you try!'])
    await until(() => phase() === 'ask')
    await advance(3000)
    said.length = 0
    tap(cards()[1])
    await until(() => said.includes('Now you try!'))
    expect(said).toEqual(['15!', "Hmm, let's look again.", 'A full ten!', '11!', '12!', '13!', '14!', '15!', 'Ten and five more: fifteen.', 'Now you try!'])
    await until(() => phase() === 'ask')
    tap(cards()[2])
    await until(() => phase() === 'praise')
  })

  it('"Twelve, thirteen, fourteen. What comes next?": the numbers lit as said; a miss counts on to the blank', async () => {
    const spec: TenFramesSpec = { kind: 'teenFrames', ask: 'next', n: 15, cards: [16, 15, 14] }
    mount(only(question(spec, { line: 'k-teens/next-12' }, 'kTeens')))
    await advance(100)
    expect(asked()[0].marks.map((m) => [m.target, m.cue])).toEqual([
      ['teen-tile-0', undefined],
      ['teen-tile-1', 'thirteen'],
      ['teen-tile-2', 'fourteen'],
      ['teen-tile-3', 'What'],
    ])
    expectTextBudget(container, 0)
    await advance(5000)
    said.length = 0
    tap(cards()[2])
    await until(() => said.includes('Now you try!'))
    expect(said).toEqual(['14!', "Hmm, let's look again.", "Let's count on.", '12!', '13!', '14!', '15!', 'Now you try!'])
  })
})

describe('Fill the frames (buildTeen)', () => {
  const MAKE: BuildSpec = { kind: 'buildTeen', n: 12 }
  const count = () => Number(q('[data-build]')!.getAttribute('data-build-count'))
  const cell = (i: number) => q(`[data-guide="build-frames"] [data-cell="${i}"]`)

  it('the number, two empty frames and ✓; each tap puts the next counter in and says the count; nothing to read', async () => {
    mount(only(question(MAKE, { line: 'k-teens/make-12' }, 'kTeens')))
    await advance(100)
    expect(asked()[0].text).toBe('Make twelve: a full ten and two more! Then tap the check.')
    expect(asked()[0].marks.map((m) => [m.target, m.cue])).toEqual([
      ['build-number', undefined],
      ['build-frames', 0.3],
      ['build-check', 'check'],
    ])
    expectTextBudget(container, 0)
    await advance(5000)
    // ✓ with nothing in: nothing sent
    tap(q('[data-guide="build-check"]'))
    await advance(300)
    expect(phase()).toBe('ask')
    said.length = 0
    // a tap anywhere fills the next box in order
    tap(cell(17))
    tap(cell(3))
    expect(count()).toBe(2)
    await advance(1500)
    expect(said).toContain('2!')
    // a tap on a counter takes the last one out; ↩ one back; ⟲ all
    tap(cell(0))
    expect(count()).toBe(1)
    tap(q('[aria-label="Undo"]'))
    expect(count()).toBe(0)
    for (let i = 0; i < 5; i++) tap(cell(i))
    tap(q('[aria-label="Start over"]'))
    expect(count()).toBe(0)
    // no timer sends it
    await advance(30000)
    expect(phase()).toBe('ask')
  })

  it('a miss: the help fills a full ten and counts on; the next try starts with the ten; rings from the second miss; never failing out', async () => {
    mount(only(question(MAKE, { line: 'k-teens/make-12' }, 'kTeens')))
    await advance(5000)
    for (let i = 0; i < 11; i++) tap(cell(i))
    said.length = 0
    tap(q('[data-guide="build-check"]'))
    await until(() => said.includes('Now you try!'))
    expect(said).toEqual(["Hmm, let's look again.", "Let's fill a full ten.", 'A full ten!', '11!', '12!', 'Ten and two more: twelve.', 'Now you try!'])
    await until(() => phase() === 'ask')
    // the next try: a full ten in place, no rings yet
    expect(count()).toBe(10)
    expect(qa('[data-ghost]')).toHaveLength(0)
    // a second miss (too many): rings show where the ones go
    await advance(5000)
    for (let i = 10; i < 15; i++) tap(cell(i))
    tap(q('[data-guide="build-check"]'))
    await until(() => phase() === 'oops')
    await until(() => phase() === 'ask')
    expect(count()).toBe(10)
    expect(qa('[data-ghost]')).toHaveLength(2)
    // a third miss, and still another try
    tap(q('[data-guide="build-check"]'))
    await until(() => phase() === 'oops')
    await until(() => phase() === 'ask')
    await advance(4000)
    tap(cell(10))
    tap(cell(11))
    tap(q('[data-guide="build-check"]'))
    await until(() => phase() === 'praise')
    expect(q('[data-build]')!.getAttribute('data-state')).toBe('right')
  })
})

// ── whole stages, and the K Daily Challenge ──────────────────────────────────

describe('the stages, played through', () => {
  it.each(['division-dunes', 'place-value-plateau'])('%s: every stage to its end, answered right, three stars', async (zoneId) => {
    for (const stage of zoneStages((await import('../../../curriculum')).getZone(zoneId)!, 0)) {
      let result: GameResult | null = null
      const n = Number(stage.params?.questionCount)
      mount(createProvider(stage.providerConfig), (r) => (result = r), n)
      for (let i = 0; i < n; i++) {
        await until(() => phase() === 'ask' && !!q('[data-activity]'))
        await advance(6000)
        expectTextBudget(container, 0)
        await answerRight()
        await until(() => phase() !== 'ask' || result !== null)
      }
      await until(() => result !== null)
      expect(result, stage.id).toEqual({ stars: 3, score: n * 10, correct: n, total: n })
      act(() => root.render(<></>))
    }
  }, 120_000)

  it('the K Daily Challenge plays Number Dunes and Ten Frame Plateau through their first stages', async () => {
    const days = Array.from({ length: 90 }, (_, d) => localDayKey(new Date(2026, 0, 1 + d)))
    for (const zoneId of ['division-dunes', 'place-value-plateau']) {
      const day = days.find((d) => pickTodaysChallenge(0, d).zone.id === zoneId)!
      expect(day, zoneId).toBeDefined()
      const { zone, stage } = pickTodaysChallenge(0, day)
      const idx = zoneStages(zone, 0).findIndex((s) => s.id === stage.id)
      let result: GameResult | null = null
      mount(createProvider(effectiveConfigForStage(stage, idx, 0)), (r) => (result = r), DAILY_QUESTION_COUNT)
      for (let i = 0; i < DAILY_QUESTION_COUNT; i++) {
        await until(() => phase() === 'ask' && !!q('[data-activity]'))
        await advance(6000)
        await answerRight()
        await until(() => phase() !== 'ask' || result !== null)
      }
      await until(() => result !== null)
      expect(result).toMatchObject({ total: DAILY_QUESTION_COUNT, correct: DAILY_QUESTION_COUNT })
      act(() => root.render(<></>))
    }
  }, 120_000)
})

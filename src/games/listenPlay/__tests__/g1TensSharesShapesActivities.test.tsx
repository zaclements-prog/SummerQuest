import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import GuideLayer from '../../../guide/GuideLayer'
import { getGuideSnapshot, resetGuideForTests, subscribeGuide } from '../../../guide/store'
import { createProvider } from '../../../lib/providers'
import { seededRng } from '../../../lib/random'
import { getZone, zoneStages } from '../../../curriculum'
import { useProgress } from '../../../store/progress'
import { expectTextBudget } from '../../../test/textBudget'
import type { GameResult } from '../../../screens/GameRunner'
import type { ProblemProvider } from '../../../lib/problem'
import { voiceText } from '../../../voice/registry'
import type { VoiceRef } from '../../../voice/types'
import ListenPlay from '../ListenPlay'
import type { ListenProblem } from '../types'
import { tensAnswer, type BuildTensSpec, type TensSpec } from '../activities/tensSpecs'
import type { ShareTapSpec } from '../activities/shareTapSpec'
import { snapAnswer, type SnapSpec } from '../activities/snapSpec'

/**
 * 1st grade's activities (Tens Plateau, Fair Share Falls, Shape Grove) in the
 * real Listen & Play shell: asked aloud with the right things lit, at most a
 * couple of words to read (the 1st-grade budget is 3), a right answer
 * praised, a miss → "let's look again" → the activity's own help (blocks
 * counted by tens and on by ones, two fourths making a half, the gap that a
 * piece fits) → "Now you try!", and never failing out. Then every 1st-grade
 * stage of the three zones, played to its stars.
 */

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
// (each test plays whole questions through the shell: plenty of fake time, and real time on a busy machine)
vi.setConfig({ testTimeout: 60000 })

const FAKE = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] as const
/** The 1st-grade screens' budget of printed words (the phase-2b text rule: ≤ 3 outside the content). */
const G1_WORDS = 3

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
async function until(ok: () => boolean, ms = 40000) {
  for (let t = 0; t < ms && !ok(); t += 50) await advance(50)
  expect(ok()).toBe(true)
}

const q = <T extends Element = HTMLElement>(sel: string) => container.querySelector<T>(sel)
const qa = (sel: string) => [...container.querySelectorAll<HTMLElement>(sel)]
const cards = () => qa('button[data-guide^="lp-card-"]') as HTMLButtonElement[]
const phase = () => q('[data-listen-play]')!.getAttribute('data-phase')
const tap = (el: Element | null) =>
  act(() => {
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
function question(spec: TensSpec | BuildTensSpec | ShareTapSpec | SnapSpec, speech: VoiceRef, topic = 'g1Tens'): ListenProblem {
  const answer = spec.kind === 'shareTap' ? spec.ask : spec.kind === 'snap' ? snapAnswer(spec) : tensAnswer(spec)
  const options = spec.kind === 'tens' || spec.kind === 'snap' ? [...spec.cards] : []
  return { id: `g1q-${serial++}`, prompt: voiceText(speech), options, answer, topic, speech, activity: spec }
}
const only = (p: ListenProblem): ProblemProvider => ({ topic: p.topic, next: () => ({ ...p, id: `${p.id}-${serial++}` }) })

/** Answer whatever is on screen, right: a card (the dev marker), a share, or blocks on the mat. */
async function answerRight() {
  const right = q('[data-guide^="lp-card-"]:has([data-correct])')
  if (right) return tap(right)
  const region = q('[data-share-region][data-correct]')
  if (region) return tap(region)
  const build = q('[data-tens-build]')!
  const want = Number(build.getAttribute('data-tens-build'))
  for (let r = Number(build.getAttribute('data-tens-rods')); r < Math.floor(want / 10); r++) {
    tap(q('[data-guide="tens-add-rod"]'))
    await advance(60)
  }
  for (let o = Number(build.getAttribute('data-tens-ones')); o < want % 10; o++) {
    tap(q('[data-guide="tens-add-cube"]'))
    await advance(60)
  }
  tap(q('[data-guide="tens-check"]'))
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: [...FAKE] })
  vi.spyOn(Math, 'random').mockImplementation(seededRng('g1-activities'))
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

// ── Tens Plateau ─────────────────────────────────────────────────────────────

describe('Tens and ones (tens)', () => {
  it('"How many?": rods and cubes, numeral cards; a miss counts the tens and on the ones, then another try', async () => {
    const spec: TensSpec = { kind: 'tens', ask: 'howMany', n: 47, cards: [74, 47, 57], scaffold: true }
    let result: GameResult | null = null
    mount(only(question(spec, { line: 'g1-tens/howMany' })), (r) => (result = r), 3)
    await advance(100)
    const blocks = () => q('[data-guide="tens-picture"] [data-blocks]')!
    expect([blocks().getAttribute('data-tens'), blocks().getAttribute('data-ones')]).toEqual(['4', '7'])
    expect(cards().map((c) => c.getAttribute('aria-label'))).toEqual(['74', '47', '57'])
    expectTextBudget(container, 0)
    expect(asked()[0].text).toBe('How many? Count the tens, then the ones.')
    await advance(4000)
    said.length = 0
    tap(cards()[0])
    await until(() => said.includes('Now you try!'))
    expect(said).toEqual(['74!', "Hmm, let's look again.", 'Ten, twenty, thirty, forty.', '41!', '42!', '43!', '44!', '45!', '46!', '47!', 'Four tens and seven ones: forty-seven.', 'Now you try!'])
    expect(blocks().querySelectorAll('[data-rod][data-marked]')).toHaveLength(4)
    expect(blocks().querySelectorAll('[data-cube][data-marked]')).toHaveLength(7)
    expectTextBudget(container, 0)
    await until(() => phase() === 'ask')
    expect(cards()[0].getAttribute('data-state')).toBe('tried')
    tap(cards()[1])
    await until(() => phase() === 'praise')
    for (let i = 0; i < 2; i++) {
      await until(() => phase() === 'ask')
      await advance(3000)
      await answerRight()
      await until(() => phase() !== 'ask')
    }
    await until(() => result !== null)
    expect(result).toEqual({ stars: 2, score: 20, correct: 2, total: 3 })
  })

  it('"Which one shows 36?": base-ten cards; a miss counts the card that was tapped', async () => {
    const spec: TensSpec = { kind: 'tens', ask: 'shows', n: 36, cards: [63, 36, 46] }
    mount(only(question(spec, { template: 'g1-tens/shows', slots: { n: 36 } })))
    await advance(100)
    expect(cards().map((c) => c.querySelector('[data-blocks]')!.getAttribute('data-blocks'))).toEqual(['63', '36', '46'])
    expectTextBudget(container, 0)
    await advance(4000)
    said.length = 0
    tap(cards()[0])
    await until(() => said.includes('Now you try!'))
    expect(said.slice(0, 3)).toEqual(['63!', "Hmm, let's look again.", 'Ten, twenty, thirty, forty, fifty, sixty.'])
    expect(said).toContain('Six tens and three ones: sixty-three.')
    expect(cards()[0].querySelectorAll('[data-rod][data-marked]')).toHaveLength(6)
  })

  it('"How many tens are in 47?": a miss brings the blocks in and counts them', async () => {
    const spec: TensSpec = { kind: 'tens', ask: 'tensIn', n: 47, cards: [7, 4, 40] }
    mount(only(question(spec, { template: 'g1-tens/tensIn', slots: { n: 47 } })))
    await advance(100)
    expect(q('[data-tens="tensIn"]')!.hasAttribute('data-revealed')).toBe(false)
    await advance(4000)
    said.length = 0
    tap(cards()[2])
    await until(() => said.includes('Now you try!'))
    expect(said).toContain('Four tens and seven ones: forty-seven.')
    expect(q('[data-tens="tensIn"]')!.hasAttribute('data-revealed')).toBe(true)
    await until(() => phase() === 'ask')
    tap(cards()[1])
    await until(() => phase() === 'praise')
  })

  it('ten more: a rod rolls in on "Ten more"; a miss counts the blocks: "The ones stay the same."', async () => {
    const spec: TensSpec = { kind: 'tens', ask: 'tenMore', n: 34, cards: [35, 44, 24] }
    mount(only(question(spec, { template: 'g1-tens/tenMore', slots: { n: 34 } })))
    await advance(100)
    const blocks = () => q('[data-guide="tens-picture"] [data-blocks]')!
    expect(blocks().getAttribute('data-blocks')).toBe('34')
    await until(() => !!q('[data-moved]'))
    expect(blocks().getAttribute('data-blocks')).toBe('44')
    expect(qa('.tq-rod-in')).toHaveLength(1)
    expect(q('[data-change]')!.getAttribute('data-change')).toBe('+10')
    expectTextBudget(container, 0)
    await advance(3000)
    said.length = 0
    tap(cards()[0])
    await until(() => said.includes('Now you try!'))
    expect(said.slice(-3)).toEqual(['Four tens and four ones: forty-four.', 'The ones stay the same. Only the tens change!', 'Now you try!'])
  })

  it('which is bigger: each number named as it lights; a miss shows the blocks, the tens first', async () => {
    const spec: TensSpec = { kind: 'tens', ask: 'bigger', n: 14, m: 41, cards: [14, 41] }
    mount(only(question(spec, { line: 'g1-tens/bigger' })))
    await advance(100)
    expect(asked().map((l) => l.text)).toEqual(['Which number is bigger? Tap it.', '14!', '41!', ''])
    expect(q('[data-tens="bigger"]')!.hasAttribute('data-revealed')).toBe(false)
    await advance(5000)
    said.length = 0
    tap(cards()[0])
    await until(() => said.includes('Now you try!'))
    expect(said).toEqual(['14!', "Hmm, let's look again.", 'Look at the tens first.', 'One ten and four ones: fourteen.', 'Four tens and one one: forty-one.', 'More tens is bigger!', 'Now you try!'])
    expect(q('[data-tens="bigger"]')!.hasAttribute('data-revealed')).toBe(true)
    expectTextBudget(container, 0)
  })

  it('the sign: > < = cards under "53 ☐ 35"; a miss compares the tens and says which way the sign opens; the right one lands in the box', async () => {
    const spec: TensSpec = { kind: 'tens', ask: 'sign', n: 53, m: 35, cards: ['>', '<', '='] }
    mount(only(question(spec, { line: 'g1-tens/sign' })))
    await advance(100)
    expect(qa('[data-sign]').map((s) => s.getAttribute('data-sign'))).toEqual(['>', '<', '='])
    expectTextBudget(container, 0)
    await advance(5000)
    said.length = 0
    tap(cards()[1])
    await until(() => said.includes('Now you try!'))
    expect(said).toEqual(['Less than!', "Hmm, let's look again.", 'Look at the tens first.', 'Five tens and three ones: fifty-three.', 'Three tens and five ones: thirty-five.', 'More tens is bigger!', 'The open side faces the bigger number.', 'Now you try!'])
    await until(() => phase() === 'ask')
    tap(cards()[0])
    await until(() => phase() === 'praise')
    expect(q('[data-tens="sign"]')!.getAttribute('data-placed')).toBe('>')
  })

  it('what comes next past one hundred: a miss counts on, each number lit', async () => {
    const spec: TensSpec = { kind: 'tens', ask: 'next', n: 101, cards: [102, 101, 100] }
    mount(only(question(spec, { line: 'g1-tens/next-98' })))
    await advance(100)
    expect(asked()[0].marks.map((m) => [m.target, m.cue])).toEqual([
      ['tens-tile-0', undefined],
      ['tens-tile-1', 'ninety-nine'],
      ['tens-tile-2', 'one hundred'],
      ['tens-tile-3', 'What'],
    ])
    await advance(5000)
    said.length = 0
    tap(cards()[0])
    await until(() => said.includes('Now you try!'))
    expect(said).toEqual(['102!', "Hmm, let's look again.", "Let's count on.", '98!', '99!', '100!', '101!', 'Now you try!'])
  })
})

describe('Make the number (buildTens)', () => {
  const SPEC: BuildTensSpec = { kind: 'buildTens', n: 36 }

  it('rods and cubes onto the mat, the running count said; a wrong ✓ builds it together, then the tens stay for the next try', async () => {
    mount(only(question(SPEC, { template: 'g1-tens/makeIt', slots: { n: 36 } })))
    await advance(100)
    // asked: just the number (the tens and ones would say what to tap)
    expect(asked()[0].text).toBe('Make 36! Then tap the check.')
    expect(asked()[0].marks.map((m) => m.target)).toEqual(['tens-number', 'tens-check'])
    expectTextBudget(container, 0)
    await advance(6000)
    const mat = () => q('[data-tens-build]')!
    for (let i = 0; i < 2; i++) tap(q('[data-guide="tens-add-rod"]'))
    for (let i = 0; i < 3; i++) tap(q('[data-guide="tens-add-cube"]'))
    expect([mat().getAttribute('data-tens-rods'), mat().getAttribute('data-tens-ones')]).toEqual(['2', '3'])
    // a block on the mat goes back when it is tapped
    tap(q('[data-mat-cube="2"]'))
    expect(mat().getAttribute('data-tens-ones')).toBe('2')
    await advance(1500)
    said.length = 0
    tap(q('[data-guide="tens-check"]'))
    await until(() => said.includes('Now you try!'))
    expect(said).toEqual(["Hmm, let's look again.", "Let's make it together.", 'Ten, twenty, thirty.', '31!', '32!', '33!', '34!', '35!', '36!', 'Three tens and six ones: thirty-six.', 'Now you try!'])
    await until(() => phase() === 'ask')
    // the next try starts with the tens in place, and is asked with its tens and ones, as help
    expect([mat().getAttribute('data-tens-rods'), mat().getAttribute('data-tens-ones')]).toEqual(['3', '0'])
    expect(asked()[0].text).toBe('Make thirty-six: three tens and six ones! Then tap the check.')
    expect(asked()[0].marks.map((m) => m.target)).toEqual(['tens-number', 'tens-add-rod', 'tens-add-cube', 'tens-check'])
    await answerRight()
    await until(() => phase() === 'praise')
  })

  it('a tenth cube snaps the ten cubes into a rod: "Ten ones make a ten!"', async () => {
    mount(only(question({ kind: 'buildTens', n: 24 }, { line: 'g1-tens/make-24' })))
    await advance(6000)
    said.length = 0
    for (let i = 0; i < 10; i++) {
      tap(q('[data-guide="tens-add-cube"]'))
      await advance(400)
    }
    const mat = q('[data-tens-build]')!
    expect([mat.getAttribute('data-tens-rods'), mat.getAttribute('data-tens-ones')]).toEqual(['1', '0'])
    await advance(2000)
    expect(said).toContain('Ten ones make a ten!')
  })
})

// ── Fair Share Falls ─────────────────────────────────────────────────────────

describe('Tap the half (shareTap)', () => {
  it('a pizza cut into a half and two fourths; a fourth tapped for the half: the fourths light together, then the half', async () => {
    const spec: ShareTapSpec = { kind: 'shareTap', thing: 'pizza', turn: 90, ask: 'half' }
    mount(only(question(spec, { template: 'g1-shares/tapHalf', slots: { thing: 'pizza' } }, 'g1Shares')))
    await advance(100)
    const regions = () => qa('[data-share-region]')
    expect(regions().map((r) => r.getAttribute('data-role'))).toEqual(['half', 'fourth', 'fourth'])
    expectTextBudget(container, 0)
    expect(asked()[0].text).toBe('Tap the half of the pizza.')
    await advance(4000)
    said.length = 0
    tap(regions()[2])
    await until(() => said.includes('Now you try!'))
    expect(said).toEqual(['A fourth!', "Hmm, let's look again.", 'Two fourths make one half.', 'This share is one half.', 'Now you try!'])
    await until(() => phase() === 'ask')
    expect(regions()[2].getAttribute('data-state')).toBe('tried')
    tap(regions()[0])
    await until(() => phase() === 'praise')
    expect(regions()[0].getAttribute('data-state')).toBe('right')
  })

  it('"Tap a fourth": either fourth is right; the half tapped first gets "That share is a half…"', async () => {
    const spec: ShareTapSpec = { kind: 'shareTap', thing: 'cake', turn: 0, ask: 'fourth' }
    mount(only(question(spec, { template: 'g1-shares/tapFourth', slots: { thing: 'cake' } }, 'g1Shares')))
    await advance(4000)
    expect(qa('[data-share-region][data-correct]').map((r) => r.getAttribute('data-share-region'))).toEqual(['1', '2'])
    said.length = 0
    tap(qa('[data-share-region]')[0])
    await until(() => said.includes('Now you try!'))
    expect(said).toContain('That share is a half. It is one of two equal shares.')
    await until(() => phase() === 'ask')
    tap(qa('[data-share-region]')[1])
    await until(() => phase() === 'praise')
  })
})

describe('Fair Share Falls and Shape Grove cards (the shell, with drawings)', () => {
  it('"Which pizza is cut in half?": a wrong card gets its word before we try again; nothing to read', async () => {
    const p = createProvider({ kind: 'g1Shares', mode: 'halvesFourths' }) as unknown as { next(): ListenProblem }
    const first = p.next()
    mount(only(first))
    await advance(100)
    expect(cards()).toHaveLength(3)
    expectTextBudget(container, 0)
    await advance(4000)
    said.length = 0
    const wrong = cards().findIndex((c) => !c.querySelector('[data-correct]'))
    tap(cards()[wrong])
    await until(() => said.includes('Now you try!'))
    expect(said[0]).toBe("Hmm, let's look again.")
    expect(['Those shares are not the same size.', 'That one has four equal shares. Those are fourths.']).toContain(said[1])
  })

  it('"Is the blue share a half or a fourth?": the only printed words are the two on the cards, each named as it lights', async () => {
    const p = createProvider({ kind: 'g1Shares', mode: 'size' }) as unknown as { next(): ListenProblem }
    const first = p.next()
    expect(first.subtopic).toBe('nameShare')
    mount(only(first))
    await advance(100)
    expect(cards().map((c) => c.textContent)).toEqual(['half', 'fourth'])
    expectTextBudget(container, 2)
    expect(asked()[0].marks.map((m) => [m.target, m.cue])).toEqual([
      ['lp-picture', undefined],
      ['lp-card-0', 'a half'],
      ['lp-card-1', 'a fourth'],
    ])
  })

  it('"Which one is still a triangle?": an open one tapped: "That one is not closed. It has an opening."', async () => {
    let first: ListenProblem
    const p = createProvider({ kind: 'g1Shapes', mode: 'attributes' }) as unknown as { next(): ListenProblem }
    do first = p.next()
    while (!/still a triangle/.test(first.prompt) || !first.options.some((o) => String(o).includes('-open-')))
    mount(only(first))
    await advance(4000)
    expectTextBudget(container, 0)
    said.length = 0
    tap(cards()[first.options.findIndex((o) => String(o).includes('-open-'))])
    await until(() => said.includes('Now you try!'))
    expect(said).toEqual(["Hmm, let's look again.", 'That one is not closed. It has an opening.', 'Now you try!'])
  })
})

// ── Shape Grove ──────────────────────────────────────────────────────────────

describe('Put shapes together (snap)', () => {
  it('"Which piece finishes the square?": a wrong piece, the gap glows and the piece that fits shows in it; the right one snaps in', async () => {
    const spec: SnapSpec = { kind: 'snap', ask: 'fill', recipe: 'square2tri', cards: ['circle', 'triangle', 'square'] }
    mount(only(question(spec, { template: 'g1-shapes/fill', slots: { shape: 'square' } }, 'g1Shapes')))
    await advance(100)
    expect(cards().map((c) => c.querySelector('[data-piece]')?.getAttribute('data-piece') ?? 'circle')).toEqual(['circle', 'triangle', 'square'])
    expectTextBudget(container, 0)
    await advance(4000)
    said.length = 0
    tap(cards()[0])
    await until(() => said.includes('Now you try!'))
    expect(said).toEqual(['circle!', "Hmm, let's look again.", 'Look at the gap: three sides and three corners. A triangle fits!', 'Now you try!'])
    await until(() => phase() === 'ask')
    tap(cards()[1])
    await until(() => phase() === 'praise')
    expect(q('[data-snap="fill"]')!.hasAttribute('data-filled')).toBe(true)
  })

  it('"Two squares snap together. What shape do they make?": they slide together on its words; a miss names the rectangle', async () => {
    const spec: SnapSpec = { kind: 'snap', ask: 'makes', recipe: 'rect2sq', cards: ['square', 'rectangle', 'triangle'] }
    mount(only(question(spec, { line: 'g1-shapes/makes-rect2sq' }, 'g1Shapes')))
    await advance(100)
    expect(q('[data-snap="makes"]')!.hasAttribute('data-together')).toBe(false)
    await until(() => !!q('[data-snap="makes"][data-together]'))
    await advance(3000)
    said.length = 0
    tap(cards()[0])
    await until(() => said.includes('Now you try!'))
    expect(said).toEqual(['square!', "Hmm, let's look again.", 'Two long sides, two short sides, and four square corners: a rectangle!', 'Now you try!'])
  })
})

// ── every 1st-grade stage, played through ───────────────────────────────────

describe('every 1st-grade stage of Tens Plateau, Fair Share Falls and Shape Grove', () => {
  // (Listen & Play's own: Tens Plateau's Gobble Garden is its own game)
  const STAGES = ['place-value-plateau', 'fraction-falls', 'geometry-grove'].flatMap((z) =>
    zoneStages(getZone(z)!, 1)
      .filter((s) => s.gameId === 'listenPlay')
      .map((s) => ({ zone: z, stage: s })),
  )

  it.each(STAGES.map((x) => [x.stage.id, x]))('%s: right every time → three stars, never more than three words to read', async (_id, { stage }) => {
    let result: GameResult | null = null
    const count = Number(stage.params?.questionCount)
    mount(createProvider(stage.providerConfig), (r) => (result = r), count)
    for (let i = 0; i < count; i++) {
      await until(() => phase() === 'ask')
      await advance(2500)
      expectTextBudget(container, G1_WORDS)
      await answerRight()
      await until(() => phase() !== 'ask')
    }
    await until(() => result !== null)
    expect(result).toEqual({ stars: 3, score: count * 10, correct: count, total: count })
  }, 120_000)
})

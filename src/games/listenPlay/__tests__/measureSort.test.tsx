import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import GuideLayer from '../../../guide/GuideLayer'
import { getGuideSnapshot, resetGuideForTests, subscribeGuide } from '../../../guide/store'
import { createProvider } from '../../../lib/providers'
import { makeKMeasureProvider, measureSpeech, type MeasureSpec } from '../../../lib/providers/kMeasure'
import { RULE_LINE, type SortSpec } from '../../../lib/providers/kSort'
import { seededRng } from '../../../lib/random'
import { pickTodaysChallenge, DAILY_QUESTION_COUNT } from '../../../lib/daily'
import { localDayKey } from '../../../lib/dates'
import { effectiveConfigForStage } from '../../../lib/gradeTiers'
import { getZone, zoneStages } from '../../../curriculum'
import { useProgress } from '../../../store/progress'
import { expectTextBudget } from '../../../test/textBudget'
import type { GameResult } from '../../../screens/GameRunner'
import type { ProblemProvider } from '../../../lib/problem'
import { voiceText } from '../../../voice/registry'
import ListenPlay from '../ListenPlay'
import type { ListenProblem } from '../types'

/**
 * Measure Marsh's `measure` and Sorting Delta's `sort` activities in the real
 * Listen & Play shell: asked aloud with their parts lit, a miss gets "let's
 * look again", the activity's own help and "Now you try!", the child carries
 * on, and a round always ends with stars (never failing out). Nothing to read.
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
  for (let left = ms; left > 0 && !ok(); left -= 50) await advance(50)
  expect(ok()).toBe(true)
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

const q = <T extends Element = HTMLElement>(sel: string) => container.querySelector<T & HTMLElement>(sel)
const phase = () => q('[data-listen-play]')!.getAttribute('data-phase')
const click = (el: Element | null) => {
  expect(el).not.toBeNull()
  act(() => (el as HTMLElement).click())
}
const TRY_AGAIN = voiceText({ line: 'ui/tryAgain' })
const YOUR_TURN = voiceText({ line: 'listen/yourTurn' })
const line = (id: string) => voiceText({ line: id })

beforeEach(() => {
  vi.useFakeTimers({ toFake: [...FAKE] })
  vi.spyOn(Math, 'random').mockImplementation(seededRng('measure-sort'))
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

/** A provider that asks this measure question (a fresh copy each time). */
function measuring(spec: MeasureSpec): ProblemProvider {
  let n = 0
  return {
    topic: 'kMeasure',
    next: (): ListenProblem => {
      const speech = measureSpeech(spec)
      return { id: `m${n++}`, topic: 'kMeasure', prompt: voiceText(speech), options: [], answer: spec.answer === 0 ? 'first' : 'second', speech, skill: { id: 'k-measure-length', label: 'longer and shorter' }, activity: { ...spec } }
    },
  }
}

const thing = (k: number) => q(`[data-guide="measure-obj-${k}"]`)

describe('the measure activity (Measure Marsh)', () => {
  const snakes: MeasureSpec = { kind: 'measure', attr: 'length', ask: 'more', thing: 'snake', sizes: [8, 5], colors: [0, 3], answer: 0 }

  it('asks which is longer with both things lit, then the hand glides over them; nothing to read', async () => {
    mount(measuring(snakes), 3)
    await advance(100)
    const run = getGuideSnapshot().run!
    expect(run.lines[0].text).toBe('Which snake is longer? Tap it!')
    expect(run.lines[0].marks.map((m) => [m.target, m.cue, m.hand])).toEqual([
      [['measure-obj-0', 'measure-obj-1'], undefined, null],
      [['measure-obj-0', 'measure-obj-1'], 'Tap', 'sweep'],
    ])
    expect(q('[data-activity="measure"]')).not.toBeNull()
    expect(q('[data-measure="length"][data-measure-ready]')).not.toBeNull()
    expect(q('[data-guide="measure-start"]')).not.toBeNull()
    expectTextBudget(container, 0)
  })

  it('a wrong tap: "let’s look again", a word about it, the method with the start line and the ends lit, then "Now you try!"', async () => {
    let result: GameResult | null = null
    mount(measuring(snakes), 3, (r) => (result = r))
    await advance(3000)
    said.length = 0
    click(thing(1))
    expect(thing(1)!.getAttribute('data-state')).toBe('look')
    await until(() => phase() === 'ask', 30000)
    expect(said).toEqual([TRY_AGAIN, line('k-measure/isShorter'), line('k-measure/helpLength'), YOUR_TURN, 'Which snake is longer? Tap it!'])
    // the dashed line where the short one stops, and the long one's extra bit
    expect(q('.measure-marker')).not.toBeNull()
    expect(thing(1)!.getAttribute('data-state')).toBe('tried')
    // the tried one rests aside: tapping it again does nothing
    click(thing(1))
    expect(phase()).toBe('ask')
    click(thing(0))
    await advance(200)
    expect(thing(0)!.getAttribute('data-state')).toBe('right')
    for (let i = 0; i < 2; i++) {
      await until(() => phase() === 'ask' && !!thing(0) && thing(0)!.getAttribute('data-state') === 'idle', 20000)
      await advance(2500)
      click(thing(0))
    }
    await until(() => result !== null, 20000)
    // never failing out: the missed one costs its star, the round still ends with stars
    expect(result).toMatchObject({ total: 3, correct: 2, stars: 2 })
  })

  it('out of line: "Let’s line them up at the start!" slides them into line, and they can’t be tapped before', async () => {
    const outOfLine: MeasureSpec = { kind: 'measure', attr: 'length', ask: 'less', thing: 'pencil', sizes: [7, 5], starts: [0, 4], colors: [1, 4], answer: 1 }
    mount(measuring(outOfLine), 3)
    await advance(100)
    const run = getGuideSnapshot().run!
    expect(run.lines.map((l) => l.text)).toEqual([line('k-measure/lineUp'), 'Which pencil is shorter? Tap it!'])
    expect(run.lines[0].marks[0].target).toBe('measure-start')
    expect(q('[data-measure-ready]')).toBeNull()
    // too soon: not lined up yet, so the tap is ignored
    click(thing(1))
    expect(phase()).toBe('ask')
    expect(said).toEqual([line('k-measure/lineUp')])
    await until(() => !!q('[data-measure-ready]'), 10000)
    await advance(1500)
    click(thing(1))
    await advance(100)
    expect(phase()).toBe('praise')
  })

  it('heights: "Let’s stand them on the same ground!", and the help lights the ground, then the tops', async () => {
    const raised: MeasureSpec = { kind: 'measure', attr: 'height', ask: 'more', thing: 'tower', sizes: [4, 7], starts: [5, 0], colors: [0, 3], answer: 1 }
    mount(measuring(raised), 3)
    await advance(100)
    expect(getGuideSnapshot().run!.lines.map((l) => l.text)).toEqual([line('k-measure/sameGround'), 'Which tower is taller? Tap it!'])
    await until(() => !!q('[data-measure-ready]'), 10000)
    await advance(2500)
    said.length = 0
    click(thing(0))
    await until(() => phase() === 'ask', 30000)
    expect(said.slice(0, 4)).toEqual([TRY_AGAIN, line('k-measure/isShorter'), line('k-measure/helpHeight'), YOUR_TURN])
    expectTextBudget(container, 0)
  })

  it('a scale tips as "Look at the scale!" is said; big but light gets "Big things can be light!"', async () => {
    const balloon: MeasureSpec = {
      kind: 'measure',
      attr: 'weight',
      ask: 'more',
      items: [
        { pic: '🎈', size: 1.3 },
        { pic: 'rock', size: 0.5 },
      ],
      colors: [0, 3],
      answer: 1,
      bigLight: 0,
    }
    mount(measuring(balloon), 3)
    await advance(100)
    const run = getGuideSnapshot().run!
    expect(run.lines.map((l) => l.text)).toEqual([line('k-measure/lookScale'), 'Which one is heavier? Tap it!'])
    expect(run.lines[0].marks[0].target).toBe('measure-scale')
    await until(() => !!q('[data-measure-ready]'), 10000)
    await advance(2500)
    said.length = 0
    click(thing(0))
    await until(() => phase() === 'ask', 30000)
    expect(said.slice(0, 5)).toEqual([TRY_AGAIN, line('k-measure/isLighter'), line('k-measure/bigLight'), line('k-measure/helpWeight'), YOUR_TURN])
    click(thing(1))
    await advance(100)
    expect(phase()).toBe('praise')
    expectTextBudget(container, 0)
  })
})

/** A provider that asks this sort question (a fresh copy each time). */
function sorting(spec: SortSpec): ProblemProvider {
  let n = 0
  return {
    topic: 'kSort',
    next: (): ListenProblem => ({
      id: `s${n++}`,
      topic: 'kSort',
      prompt: voiceText(RULE_LINE[spec.rule]),
      options: [],
      answer: 'x',
      speech: RULE_LINE[spec.rule],
      skill: { id: 'k-sort', label: 'sorting into groups' },
      activity: { ...spec },
    }),
  }
}

const item = (i: number) => q(`[data-guide="sort-item-${i}"]`)
const box = (b: number) => q(`[data-guide="sort-box-${b}"]`)
const card = (j: number) => q(`[data-guide="sort-card-${j}"]`)
const step = () => q('[data-sort-step]')!.getAttribute('data-sort-step')

describe('the sort activity (Sorting Delta)', () => {
  const farm: SortSpec = {
    kind: 'sort',
    rule: 'kind',
    groups: ['animals', 'food'],
    items: [
      { pic: '🐷', box: 0 },
      { pic: '🍇', box: 1 },
      { pic: '🐸', box: 0 },
      { pic: '🍪', box: 1 },
      { pic: '🐮', box: 0 },
    ],
    countBox: 0,
    countCards: [2, 3, 4],
    more: true,
  }

  it('asks: the rule, each box named as it lights up, then the tray; nothing to read', async () => {
    mount(sorting(farm), 3)
    await advance(100)
    const run = getGuideSnapshot().run!
    expect(run.lines.map((l) => l.text)).toEqual(["Let's sort! Look at the boxes.", 'Animals!', 'Food!', 'Put each one in its box!'])
    expect(run.lines.map((l) => l.marks[0].target)).toEqual(['sort-boxes', 'sort-box-0', 'sort-box-1', 'sort-tray'])
    expect(step()).toBe('sort')
    // the boxes show pictures, never a word
    expect(box(0)!.textContent).toContain('🐶')
    expect(box(1)!.textContent).toContain('🍎')
    expectTextBudget(container, 0)
  })

  it('a wrong box bounces the thing back with a word about it, the hand carries it to its box; then count, then which has more', async () => {
    let result: GameResult | null = null
    mount(sorting(farm), 1, (r) => (result = r))
    await advance(6000)
    said.length = 0
    // the pig into the food box: back to the tray
    click(item(0))
    expect(item(0)!.hasAttribute('data-selected')).toBe(true)
    click(box(1))
    await advance(400)
    expect(item(0)!.hasAttribute('data-placed')).toBe(false)
    await until(() => phase() === 'ask', 30000)
    expect(said.slice(0, 3)).toEqual([TRY_AGAIN, line('k-sort/is-animals'), YOUR_TURN])
    // the re-ask is short: the boxes were named already
    expect(said[3]).toBe(line('k-sort/putEach'))
    // sort them all (tap the thing, then its box)
    for (const [i, it] of farm.items.entries()) {
      click(item(i))
      click(box(it.box))
      await advance(100)
      expect(item(i)!.hasAttribute('data-placed')).toBe(true)
    }
    await advance(300)
    expect(step()).toBe('count')
    expect(getGuideSnapshot().run!.lines[0].text).toBe(line('k-sort/howMany'))
    expect(getGuideSnapshot().run!.lines[0].marks[0].target).toBe('sort-box-0')
    expectTextBudget(container, 0)
    // a wrong count: the box's things are counted aloud, each lighting up
    said.length = 0
    click(card(0))
    // (the card says its number first)
    await until(() => phase() === 'oops', 10000)
    await until(() => phase() === 'ask', 30000)
    expect(said).toEqual(['2!', TRY_AGAIN, "Let's count together.", 'One, two, three.', YOUR_TURN, line('k-sort/howMany')])
    click(card(1))
    await until(() => step() === 'more', 10000)
    await advance(200)
    expect(getGuideSnapshot().run!.lines[0].text).toBe(line('k-sort/whichMore'))
    // which has more: the food box isn't it
    said.length = 0
    click(box(1))
    await until(() => phase() === 'ask', 30000)
    expect(said.slice(0, 3)).toEqual([TRY_AGAIN, "Let's count each group.", 'One, two, three.'])
    expect(said).toContain('One, two.')
    said.length = 0
    click(box(0))
    expect(box(0)!.getAttribute('data-state')).toBe('right')
    // the box's name, the praise, and on to the next question
    await until(() => said.includes(line('ui/greatJob')), 10000)
    expect(said[0]).toBe('Animals!')
    await until(() => step() === 'sort' && said.includes("Let's sort! Look at the boxes."), 10000)
    expect(result).toBeNull()
  })
})

/** Play a stage's real provider to the end through the dev answer markers, as the bot does. */
async function playThrough(provider: ProblemProvider, count: number): Promise<GameResult> {
  let result: GameResult | null = null
  mount(provider, count, (r) => (result = r))
  for (let guard = 0; guard < 4000 && !result; guard++) {
    await advance(100)
    if (phase() !== 'ask') continue
    const act0 = q('[data-activity]')?.getAttribute('data-activity')
    if (act0 === 'measure') {
      if (!q('[data-measure-ready]')) continue
      const right = q('[data-guide^="measure-obj-"]:has([data-correct])')
      if (right) click(right)
    } else if (act0 === 'sort') {
      const s = step()
      if (s === 'sort') {
        const next = [...container.querySelectorAll<HTMLElement>('[data-sort-item]:not([data-placed])')][0]
        if (next) {
          click(next)
          click(box(Number(next.getAttribute('data-sort-box'))))
        }
      } else if (s === 'count') {
        const right = q('[data-guide^="sort-card-"]:has([data-correct])')
        if (right && !right.hasAttribute('aria-disabled')) click(right)
      } else if (s === 'more') {
        const right = q('[data-guide^="sort-box-"]:has([data-correct])')
        if (right) click(right)
      }
    }
  }
  expect(result).not.toBeNull()
  return result!
}

describe('every Measure Marsh and Sorting Delta stage, played to the end in the real shell', () => {
  for (const [zoneId, ids] of [
    ['measurement-marsh', ['k-measure-1', 'k-measure-2', 'k-measure-3']],
    ['data-delta', ['k-sort-1', 'k-sort-2', 'k-sort-3']],
  ] as const) {
    for (const [idx, id] of ids.entries()) {
      it(`${id}: every question right first time is three stars`, async () => {
        const stage = zoneStages(getZone(zoneId)!, 0)[idx]
        expect(stage.id).toBe(id)
        const n = Number(stage.params?.questionCount)
        const r = await playThrough(createProvider(effectiveConfigForStage(stage, idx, 0)), n)
        expect(r).toMatchObject({ total: n, correct: n, stars: 3 })
      }, 60_000)
    }
  }

  it('…and in the K Daily Challenge (five questions), both zones play their first stage', async () => {
    const days = Array.from({ length: 120 }, (_, d) => localDayKey(new Date(2026, 0, 1 + d)))
    for (const zoneId of ['measurement-marsh', 'data-delta']) {
      const day = days.find((d) => pickTodaysChallenge(0, d).zone.id === zoneId)!
      expect(day, zoneId).toBeDefined()
      const { zone, stage } = pickTodaysChallenge(0, day)
      expect(stage.id).toBe(zoneId === 'data-delta' ? 'k-sort-1' : 'k-measure-1')
      const idx = zoneStages(zone, 0).findIndex((s) => s.id === stage.id)
      const r = await playThrough(createProvider(effectiveConfigForStage(stage, idx, 0)), DAILY_QUESTION_COUNT)
      expect(r).toMatchObject({ total: DAILY_QUESTION_COUNT, correct: DAILY_QUESTION_COUNT })
      act(() => root.render(<></>))
    }
  }, 90_000)

  it('the measure questions are said the way the provider says them', () => {
    const p = makeKMeasureProvider({ mode: 'mix' })
    for (let i = 0; i < 12; i++) {
      const x = p.next()
      expect(x.prompt).toBe(voiceText(x.speech!))
    }
  })
})

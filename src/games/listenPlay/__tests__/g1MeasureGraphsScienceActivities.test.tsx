import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import GuideLayer from '../../../guide/GuideLayer'
import { getGuideSnapshot, resetGuideForTests, subscribeGuide } from '../../../guide/store'
import { clockSpeech, digital, lengthOrderSpeech, stringLine, timeHow, timeName, timeSays, unitsSpeech, type ClockSpec, type LengthOrderSpec, type UnitsSpec } from '../../../lib/providers/g1Measure'
import { graphQuestion, topicLine, type GraphSpec } from '../../../lib/providers/g1Graphs'
import { isLineId, rowLineId } from '../../../voice/packs/g1-graphs'
import { seededRng } from '../../../lib/random'
import { useProgress } from '../../../store/progress'
import { expectTextBudget } from '../../../test/textBudget'
import type { GameResult } from '../../../screens/GameRunner'
import type { ProblemProvider } from '../../../lib/problem'
import type { ListenActivitySpec } from '../types'
import { voiceText } from '../../../voice/registry'
import type { VoiceRef } from '../../../voice/types'
import ListenPlay from '../ListenPlay'
import type { ListenProblem } from '../types'

/**
 * The 1st-grade activities in the real Listen & Play shell: Measure Marsh's
 * `lengthOrder`, `units` and `clockMatch`, and Graph Delta's `graph`. Each is
 * asked aloud with its parts lit; a miss gets "let's look again", the
 * activity's own help and "Now you try!"; the child carries on, and a round
 * always ends with stars (never failing out). Nothing to read but numerals.
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
async function until(ok: () => boolean, ms = 30000) {
  for (let left = ms; left > 0 && !ok(); left -= 50) await advance(50)
  expect(ok()).toBe(true)
}
/** A wrong try: wait for "let's look again" and the help, until the child's turn comes back. */
async function throughHelp(ms = 40000) {
  await until(() => phase() === 'oops', 10000)
  await until(() => phase() === 'ask', ms)
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
const text = (ref: VoiceRef) => voiceText(ref)
const line = (id: string) => voiceText({ line: id })
const num = (n: number) => voiceText({ template: 'listen/number', slots: { n } })
const TRY_AGAIN = line('ui/tryAgain')
const YOUR_TURN = line('listen/yourTurn')
const lines = () => getGuideSnapshot().run?.lines.map((l) => l.text) ?? []

beforeEach(() => {
  vi.useFakeTimers({ toFake: [...FAKE] })
  vi.spyOn(Math, 'random').mockImplementation(seededRng('g1-activities'))
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

/** A provider that asks this activity question, a fresh copy each time. */
function asking<S extends ListenActivitySpec>(spec: S, speech: VoiceRef, answer: string | number, topic = 'g1Measure'): ProblemProvider {
  let n = 0
  return {
    topic,
    next: (): ListenProblem => ({ id: `q${n++}`, topic, prompt: voiceText(speech), options: [], answer, speech, skill: { id: 'g1-measure-order', label: 'x' }, activity: structuredClone(spec) }),
  }
}

// ── lengthOrder ───────────────────────────────────────────────────────────────

const lo = (i: number) => q(`[data-guide="lo-obj-${i}"]`)

describe('the lengthOrder activity (Measure Marsh)', () => {
  const pencils: LengthOrderSpec = { kind: 'lengthOrder', mode: 'order', thing: 'pencil', sizes: [5, 9, 2], colors: [0, 3, 1], ask: 'long', answer: [1, 0, 2] }

  it('asks to put them in order with all three lit; tapped in order, each says its number; nothing to read', async () => {
    let result: GameResult | null = null
    mount(asking(pencils, lengthOrderSpeech(pencils), '1-0-2'), 3, (r) => (result = r))
    await advance(100)
    const run = getGuideSnapshot().run!
    expect(run.lines[0].text).toBe('Put the pencils in order. Tap the longest one first!')
    expect(run.lines[0].marks.map((m) => [m.target, m.cue, m.hand])).toEqual([
      [['lo-obj-0', 'lo-obj-1', 'lo-obj-2'], undefined, null],
      [['lo-obj-0', 'lo-obj-1', 'lo-obj-2'], 'Tap', 'sweep'],
    ])
    expect(q('[data-length-order="order"][data-lo-ready]')).not.toBeNull()
    expectTextBudget(container, 0)
    await advance(3500)
    for (const [k, i] of [1, 0, 2].entries()) {
      click(lo(i))
      await advance(80)
      expect(said.at(-1)).toBe(num(k + 1))
      expect(lo(i)!.getAttribute('data-state')).toBe('done')
      await advance(1500)
    }
    expect(phase()).toBe('praise')
    // its numbers stay at the ends (numerals only)
    expect([...container.querySelectorAll('svg text')].map((t) => t.textContent)).toEqual(['1', '2', '3'])
    expectTextBudget(container, 0)
    for (let r = 0; r < 2; r++) {
      await until(() => phase() === 'ask' && q('[data-lo-done="0"]') !== null, 20000)
      await advance(3500)
      for (const i of [1, 0, 2]) {
        click(lo(i))
        await advance(1500)
      }
    }
    await until(() => result !== null)
    expect(result).toMatchObject({ total: 3, correct: 3, stars: 3 })
  })

  it('out of order: "let’s look again", the method with the ends marked, the one that comes next lit, then "Now you try!"; the numbers placed stay', async () => {
    let result: GameResult | null = null
    mount(asking(pencils, lengthOrderSpeech(pencils), '1-0-2'), 3, (r) => (result = r))
    await advance(3500)
    click(lo(1))
    await advance(1500)
    said.length = 0
    click(lo(2)) // the shortest, but the middle one comes next
    expect(lo(2)!.getAttribute('data-state')).toBe('look')
    await until(() => phase() === 'ask', 30000)
    expect(said).toEqual([TRY_AGAIN, line('k-measure/helpLength'), line('g1-measure/longestLeft'), YOUR_TURN, line('g1-measure/whichNext')])
    const help = getGuideSnapshot().run!
    expect(help.lines[0].marks.map((m) => m.target)).toEqual([['lo-obj-0', 'lo-obj-2'], ['lo-obj-0', 'lo-obj-2']])
    expect(q('[data-lo-done="1"]')).not.toBeNull()
    expect(q('.measure-marker path[stroke-dasharray]')).not.toBeNull()
    await advance(2500)
    click(lo(0))
    await advance(1500)
    click(lo(2))
    await advance(1500)
    expect(phase()).toBe('praise')
    for (let r = 0; r < 2; r++) {
      await until(() => phase() === 'ask' && q('[data-lo-done="0"]') !== null, 20000)
      await advance(3500)
      for (const i of [1, 0, 2]) {
        click(lo(i))
        await advance(1500)
      }
    }
    await until(() => result !== null)
    // never failing out: the missed one costs its star, the round still ends with stars
    expect(result).toMatchObject({ total: 3, correct: 2, stars: 2 })
  })

  it('out of line: "Let’s line them up at the start!" first, and no tap counts before they are', async () => {
    const trains: LengthOrderSpec = { kind: 'lengthOrder', mode: 'order', thing: 'train', sizes: [3, 7, 5], starts: [6, 0, 3], colors: [0, 3, 1], ask: 'short', answer: [0, 2, 1] }
    mount(asking(trains, lengthOrderSpeech(trains), '0-2-1'), 3)
    await advance(100)
    expect(lines()).toEqual([line('k-measure/lineUp'), 'Put the trains in order. Tap the shortest one first!'])
    expect(q('[data-lo-ready]')).toBeNull()
    click(lo(0))
    expect(q('[data-lo-done="0"]')).not.toBeNull()
    await until(() => !!q('[data-lo-ready]'), 10000)
    await advance(3000)
    click(lo(0))
    await advance(80)
    expect(q('[data-lo-done="1"]')).not.toBeNull()
  })

  it('through a string: the string lies along one, hangs beside the other, then "So which one is longer?"; the help walks it again', async () => {
    const ribbons: LengthOrderSpec = { kind: 'lengthOrder', mode: 'third', thing: 'ribbon', sizes: [7, 4], string: 5, colors: [2, 4], ask: 'long', answer: [0] }
    let result: GameResult | null = null
    mount(asking(ribbons, lengthOrderSpeech(ribbons), '0'), 3, (r) => (result = r))
    await advance(100)
    expect(lines()).toEqual([
      "Which ribbon is longer? They are far apart. Let's use a string!",
      text(stringLine(ribbons, 0)),
      text(stringLine(ribbons, 1)),
      line('g1-measure/soLonger'),
    ])
    expect(lines()[1]).toBe('The string is shorter than this ribbon.')
    expect(lines()[2]).toBe('The string is longer than this ribbon.')
    // too soon: the string hasn't been to both
    click(lo(0))
    expect(phase()).toBe('ask')
    await until(() => !!q('[data-lo-ready]'), 30000)
    expect(q('[data-guide="lo-string"]')).not.toBeNull()
    await advance(2500)
    said.length = 0
    click(lo(1))
    await until(() => phase() === 'ask', 30000)
    expect(said).toEqual([TRY_AGAIN, text({ template: 'g1-measure/thirdHelpLonger', slots: { thing: 'ribbon' } }), YOUR_TURN, line('g1-measure/soLonger')])
    await advance(2500)
    click(lo(0))
    await advance(200)
    expect(phase()).toBe('praise')
    expectTextBudget(container, 0)
    for (let r = 0; r < 2; r++) {
      await until(() => phase() === 'ask' && !!q('[data-lo-ready]'), 40000)
      await advance(2500)
      click(lo(0))
      await advance(300)
    }
    await until(() => result !== null)
    expect(result).toMatchObject({ total: 3, correct: 2 })
  })
})

// ── units ─────────────────────────────────────────────────────────────────────

const ucard = (j: number) => q(`[data-guide="units-card-${j}"]`)

describe('the units activity (Measure Marsh)', () => {
  const laid: UnitsSpec = { kind: 'units', thing: 'snake', unit: 'clip', n: 4, lay: false, color: 2, cards: [3, 4, 5] }

  it('laid already: "How many paper clips long is the snake?", the snake and its clips lit, then the cards; a wrong card counts them together', async () => {
    let result: GameResult | null = null
    mount(asking(laid, unitsSpeech(laid), 4), 3, (r) => (result = r))
    await advance(100)
    const run = getGuideSnapshot().run!
    expect(run.lines[0].text).toBe('How many paper clips long is the snake?')
    expect(run.lines[0].marks.map((m) => m.target)).toEqual([['units-thing', 'units-row'], ['units-card-0', 'units-card-1', 'units-card-2']])
    expect(container.querySelectorAll('[data-units-unit]')).toHaveLength(4)
    expectTextBudget(container, 0)
    await advance(3000)
    said.length = 0
    click(ucard(0))
    await throughHelp()
    expect(said).toEqual([num(3), TRY_AGAIN, line('listen/countTogether'), line('listen/count4'), YOUR_TURN, 'How many paper clips long is the snake?'])
    expect(ucard(0)!.getAttribute('data-state')).toBe('tried')
    await advance(2500)
    click(ucard(1))
    await advance(1200)
    expect(phase()).toBe('praise')
    for (let r = 0; r < 2; r++) {
      await until(() => phase() === 'ask' && !!ucard(1) && ucard(1)!.getAttribute('data-state') === 'idle', 20000)
      await advance(2500)
      click(ucard(1))
      await advance(1500)
    }
    await until(() => result !== null)
    expect(result).toMatchObject({ total: 3, correct: 2, stars: 2 })
  })

  it('laying them: "Lay paper clips end to end. Tap the box to add one!"; at the end, "It reaches the end!" and the cards', async () => {
    const lay: UnitsSpec = { ...laid, unit: 'cube', lay: true, n: 3, cards: [2, 3, 4] }
    mount(asking(lay, unitsSpeech(lay), 3), 3)
    await advance(100)
    expect(lines()).toEqual(['How many cubes long is the snake?', line('g1-measure/layCubes')])
    expect(getGuideSnapshot().run!.lines[1].marks.map((m) => [m.target, m.hand])).toEqual([
      ['units-row', null],
      ['units-box', 'tap'],
    ])
    expect(q('[data-units-step="lay"]')).not.toBeNull()
    await advance(5000)
    for (let i = 0; i < 3; i++) {
      click(q('[data-guide="units-box"]'))
      await advance(400)
    }
    expect(q('[data-units-laid="3"][data-units-step="count"]')).not.toBeNull()
    expect(q('[data-guide="units-box"]')).toBeNull()
    await advance(100)
    expect(lines()).toEqual([line('g1-measure/reachesEnd'), 'How many cubes long is the snake?'])
    expectTextBudget(container, 0)
    await advance(4000)
    click(ucard(1))
    await advance(1200)
    expect(phase()).toBe('praise')
  })
})

// ── clockMatch ────────────────────────────────────────────────────────────────

const ccard = (j: number) => q(`[data-guide="clock-card-${j}"]`)

describe('the clockMatch activity (Measure Marsh)', () => {
  const readHalf: ClockSpec = { kind: 'clockMatch', mode: 'read', time: { hour: 3, half: true }, cards: [{ hour: 4, half: true }, { hour: 3, half: true }, { hour: 3, half: false }] }

  it('read: "What time is it?", the clock lit then the digital cards; the clock’s hour hand sits halfway between 3 and 4', async () => {
    mount(asking(readHalf, clockSpeech(readHalf), digital(readHalf.time)), 3)
    await advance(100)
    const run = getGuideSnapshot().run!
    expect(run.lines[0].text).toBe('What time is it? Tap it!')
    expect(run.lines[0].marks.map((m) => [m.target, m.cue, m.hand])).toEqual([
      ['clock-picture', undefined, null],
      [['clock-card-0', 'clock-card-1', 'clock-card-2'], 'Tap', 'sweep'],
    ])
    // the analog clock: the long hand straight down, the short hand at 105° (half way from 3 to 4)
    const hands = [...q('[data-guide="clock-picture"]')!.querySelectorAll('svg line[stroke-width="6.5"], svg line[stroke-width="4.5"]')]
    const angle = (l: Element) => (Math.atan2(Number(l.getAttribute('x2')) - 50, 50 - Number(l.getAttribute('y2'))) * 180) / Math.PI
    expect(hands.map((l) => Math.round((angle(l) + 360) % 360))).toEqual([105, 180])
    // the digital cards show their times (numerals only)
    expect([...container.querySelectorAll('[data-guide^="clock-card-"] svg text')].map((t) => t.textContent).filter(Boolean)).toEqual(['4:30', '3:30', '3:00'])
    expectTextBudget(container, 0)
  })

  it('a wrong card says its time, then "let’s look again", what it shows and the method with the hands lit, then "Now you try!"', async () => {
    let result: GameResult | null = null
    mount(asking(readHalf, clockSpeech(readHalf), digital(readHalf.time)), 3, (r) => (result = r))
    await advance(3000)
    said.length = 0
    click(ccard(0))
    await throughHelp()
    expect(said).toEqual([text(timeName({ hour: 4, half: true })), TRY_AGAIN, text(timeSays({ hour: 4, half: true })), text(timeHow(readHalf.time)), YOUR_TURN, 'What time is it? Tap it!'])
    expect(text(timeHow(readHalf.time))).toBe('The long hand points down to 6. The short hand is just past 3, halfway to the next number. It is half past 3!')
    expect(ccard(0)!.getAttribute('data-state')).toBe('tried')
    await advance(2500)
    click(ccard(1))
    await advance(1500)
    expect(phase()).toBe('praise')
    for (let r = 0; r < 2; r++) {
      await until(() => phase() === 'ask' && ccard(1)?.getAttribute('data-state') === 'idle', 20000)
      await advance(2500)
      click(ccard(1))
      await advance(1500)
    }
    await until(() => result !== null)
    expect(result).toMatchObject({ total: 3, correct: 2, stars: 2 })
  })

  it('the help lights the long hand, then the short hand, on their words', async () => {
    mount(asking(readHalf, clockSpeech(readHalf), digital(readHalf.time)), 3)
    await advance(3000)
    click(ccard(2))
    let marks: unknown[] = []
    await until(() => {
      const run = getGuideSnapshot().run
      const how = run?.lines.find((l) => l.text === text(timeHow(readHalf.time)))
      if (how) marks = how.marks.map((m) => [m.target, m.cue])
      return !!how
    }, 30000)
    expect(marks).toEqual([
      ['clock-picture', undefined],
      ['clock-long', 'long hand'],
      ['clock-short', 'short hand'],
      ['clock-picture', 'It is'],
    ])
  })

  it('show: a digital clock and clock cards; say: the time only said, three big clocks', async () => {
    const show: ClockSpec = { kind: 'clockMatch', mode: 'show', time: { hour: 7, half: false }, cards: [{ hour: 7, half: true }, { hour: 8, half: false }, { hour: 7, half: false }] }
    mount(asking(show, clockSpeech(show), digital(show.time)), 3)
    await advance(100)
    expect(lines()[0]).toBe("Tap the clock that shows 7 o'clock.")
    expect(q('[data-guide="clock-picture"] svg text')!.textContent).toBe('7:00')
    expect(container.querySelectorAll('[data-guide^="clock-card-"] svg circle').length).toBeGreaterThanOrEqual(3)
    expectTextBudget(container, 0)
    act(() => root.render(<></>))
    resetGuideForTests()
    const say: ClockSpec = { ...show, mode: 'say' }
    mount(asking(say, clockSpeech(say), digital(say.time)), 3)
    await advance(100)
    expect(q('[data-guide="clock-picture"]')).toBeNull()
    expect(getGuideSnapshot().run!.lines[0].marks.map((m) => [m.target, m.cue])).toEqual([[['clock-card-0', 'clock-card-1', 'clock-card-2'], 'Tap']])
    await advance(3000)
    click(ccard(2))
    await advance(1500)
    expect(phase()).toBe('praise')
  })
})

// ── graph ─────────────────────────────────────────────────────────────────────

const pick = (i: number) => q(`[data-guide="graph-pick-${i}"]`)
const row = (r: number) => q(`[data-guide="graph-row-${r}"]`)
const gcard = (j: number) => q(`[data-guide="graph-card-${j}"]`)
const gstep = () => q('[data-graph-step]')!.getAttribute('data-graph-step')

describe('the graph activity (Graph Delta)', () => {
  const fruit: GraphSpec = { kind: 'graph', topic: 'fruit', rows: ['apples', 'bananas', 'grapes'], counts: [3, 1, 2], style: 'picture', tray: [0, 2, 1, 0, 2, 0], ask: 'howMany', about: [0], cards: [2, 3, 4] }

  it('make it: the topic, each row named as it lights up, "Put each one in its row!"; then the question and the cards', async () => {
    let result: GameResult | null = null
    mount(asking(fruit, graphQuestion(fruit), 3, 'g1Graphs'), 3, (r) => (result = r))
    await advance(100)
    expect(lines()).toEqual([text(topicLine('fruit')), line(rowLineId('apples')), line(rowLineId('bananas')), line(rowLineId('grapes')), line('g1-graphs/putInRow')])
    expect(getGuideSnapshot().run!.lines.slice(1, 4).map((l) => l.marks[0].target)).toEqual(['graph-row-0', 'graph-row-1', 'graph-row-2'])
    expect(gstep()).toBe('build')
    // the rows are marked with pictures (never a word)
    expectTextBudget(container, 0)
    await advance(8000)
    // tap a pick, then its row: it goes into the row's next cell
    fruit.tray!.forEach((r, i) => {
      click(pick(i))
      click(row(r))
    })
    expect(gstep()).toBe('ask')
    await advance(100)
    expect(lines()).toEqual(['How many friends like apples?'])
    expect(getGuideSnapshot().run!.lines[0].marks.map((m) => m.target)).toEqual([['graph-row-0'], ['graph-card-0', 'graph-card-1', 'graph-card-2']])
    expectTextBudget(container, 0)
    await advance(3000)
    click(gcard(1))
    await advance(1500)
    expect(phase()).toBe('praise')
    expect(result).toBeNull()
  })

  it('a pick in the wrong row bounces back: "let’s look again", what it is, the hand carries it to its row; then the shorter ask', async () => {
    mount(asking(fruit, graphQuestion(fruit), 3, 'g1Graphs'), 3)
    await advance(9000)
    said.length = 0
    click(pick(0))
    click(row(1)) // an apple in the banana row
    await until(() => phase() === 'ask', 30000)
    expect(said).toEqual([TRY_AGAIN, line(isLineId('apples')), YOUR_TURN, line('g1-graphs/putInRow')])
    expect(pick(0)!.hasAttribute('data-placed')).toBe(false)
    const help = getGuideSnapshot()
    expect(help.run!.lines[0].text).toBe(line('g1-graphs/putInRow'))
    click(pick(0))
    click(row(0))
    expect(pick(0)!.hasAttribute('data-placed')).toBe(true)
  })

  it('a wrong count: the row is counted aloud together, each picture lit with its number', async () => {
    const read: GraphSpec = { ...fruit, tray: undefined, ask: 'inAll', about: undefined, cards: [5, 6, 7] }
    mount(asking(read, graphQuestion(read), 6, 'g1Graphs'), 3)
    await advance(100)
    // a graph made already: the topic, "Look at the graph!", the rows named, then the question
    expect(lines()).toEqual([text(topicLine('fruit')), line('g1-graphs/lookGraph'), line(rowLineId('apples')), line(rowLineId('bananas')), line(rowLineId('grapes')), 'How many friends in all?'])
    // the pictures are drawn in the rows: three apples, a banana, two grapes
    expect([...container.querySelectorAll('[data-graph-step] > svg text')].map((t) => t.textContent).join('')).toBe('🍎🍎🍎🍌🍇🍇')
    await advance(12000)
    said.length = 0
    click(gcard(0))
    await throughHelp()
    expect(said).toEqual([num(5), TRY_AGAIN, line('g1-graphs/countAll'), line('listen/count6'), YOUR_TURN, 'How many friends in all?'])
    await advance(2500)
    click(gcard(1))
    await advance(1500)
    expect(phase()).toBe('praise')
  })

  it('the most: tap its row (it says its name); a wrong row: count each row, then "The longest row has the most!"', async () => {
    const most: GraphSpec = { kind: 'graph', topic: 'pets', rows: ['dogs', 'cats', 'fish'], counts: [2, 5, 3], style: 'tally', ask: 'most' }
    mount(asking(most, graphQuestion(most), 'cats', 'g1Graphs'), 3)
    await advance(100)
    expect(lines()).toEqual([text(topicLine('pets')), line('g1-graphs/lookTally'), line(rowLineId('dogs')), line(rowLineId('cats')), line(rowLineId('fish')), line('g1-graphs/most')])
    expect(q('[data-guide="graph-cards"]')).toBeNull()
    await advance(12000)
    said.length = 0
    click(row(0))
    await throughHelp()
    expect(said).toEqual([line(rowLineId('dogs')), TRY_AGAIN, line('listen/countEach'), line('listen/count2'), line('listen/count5'), line('listen/count3'), line('g1-graphs/longestRow'), YOUR_TURN, line('g1-graphs/most')])
    expect(row(0)!.getAttribute('data-state')).toBe('tried')
    await advance(2500)
    click(row(1))
    await advance(1500)
    expect(phase()).toBe('praise')
    expect(row(1)!.getAttribute('data-state')).toBe('right')
    expectTextBudget(container, 0)
  })

  it('how many more: a wrong card, then the rows matched up one with one and the ones with no match counted', async () => {
    const more: GraphSpec = { kind: 'graph', topic: 'treats', rows: ['cookies', 'cake', 'donuts'], counts: [5, 2, 4], style: 'picture', ask: 'more', about: [0, 1], cards: [3, 5, 4] }
    mount(asking(more, graphQuestion(more), 3, 'g1Graphs'), 3)
    await advance(100)
    expect(lines().at(-1)).toBe('How many more friends like cookies than cake?')
    await advance(14000)
    said.length = 0
    click(gcard(1)) // 5: the bigger row's own count
    await throughHelp()
    expect(said).toEqual([num(5), TRY_AGAIN, line('g1-graphs/matchUp'), line('g1-graphs/extraOnes'), line('listen/count3'), YOUR_TURN, 'How many more friends like cookies than cake?'])
    // the match lines (one per pair) and the glow on the extra ones
    expect(container.querySelectorAll('path[stroke="#4aa6d6"]')).toHaveLength(2)
    expect(q('[data-guide="graph-extra"]')).not.toBeNull()
    await advance(2500)
    click(gcard(0))
    await advance(1500)
    expect(phase()).toBe('praise')
  })
})

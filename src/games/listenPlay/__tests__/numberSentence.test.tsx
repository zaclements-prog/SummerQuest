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
import ListenPlay from '../ListenPlay'
import type { ListenProblem } from '../types'
import { actTaps, type NumberSentenceSpec } from '../activities/numberSentenceSpec'

/**
 * The `numberSentence` activity (1st grade: Adding Mesa, Take-Away Dunes) in
 * the real Listen & Play shell: the sentence is asked with it lit, the
 * strategy's hint with the picture lit; a question to act out waits for the
 * child (count on, move into the ten, take away, hop back, fill) before the
 * cards open; a right card writes its number into the sentence; a miss gets
 * its word, the strategy done slowly line by line, and another try; never a
 * timer, never failing out, nothing to read but the numbers and signs.
 */

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
// (fake timers keep these quick, but a busy machine can still take a while over many steps)
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
  for (let t = 0; t < ms && !ok(); t += 50) await advance(50)
  expect(ok()).toBe(true)
}

const q = <T extends Element = HTMLElement>(sel: string) => container.querySelector<T>(sel)
const qa = (sel: string) => [...container.querySelectorAll<HTMLElement>(sel)]
const root$ = () => q('[data-number-sentence]')!
const isOpen = () => !!q('[data-ns-open]')
const isActing = () => !!q('[data-ns-acting]')
const done = () => Number(root$()?.getAttribute('data-ns-done') ?? -1)
const phase = () => q('[data-listen-play]')!.getAttribute('data-phase')
const cards = () => qa('button[data-guide^="lp-card-"]')
const rightCard = () => cards().find((c) => c.querySelector('[data-correct]'))!
const wrongCard = () => cards().find((c) => !c.querySelector('[data-correct]') && c.getAttribute('data-state') !== 'tried')!
/** A tap (SVG groups too: jsdom gives them no `click()`). */
const tap = (el: Element | null) =>
  act(() => {
    el!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  })

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

/** The first question of this kind from a real provider (seeded), as a provider that keeps asking a fresh copy of it. */
function firstOf(config: Parameters<typeof createProvider>[0], pick: (s: NumberSentenceSpec, i: number) => boolean): { p: ListenProblem; provider: ProblemProvider } {
  const make = createProvider(config)
  make.reset?.()
  for (let i = 0; i < 60; i++) {
    const p = make.next() as ListenProblem
    if (pick(p.activity as NumberSentenceSpec, i % 6)) {
      let n = 0
      return { p, provider: { topic: p.topic, next: () => ({ ...p, id: `${p.id}-${n++}` }) } }
    }
  }
  throw new Error('no such question')
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: [...FAKE] })
  vi.spyOn(Math, 'random').mockImplementation(seededRng('number-sentence'))
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

/** Do the strategy (tap whatever the picture offers) until it is done. */
async function actItOut(times: number) {
  for (let k = 0; k < times; k++) {
    const el = q('[data-ns-tap]')
    expect(el, `tap ${k + 1} of ${times}`).not.toBeNull()
    tap(el)
    await advance(600)
  }
}

describe('count on (Adding Mesa)', () => {
  it('asks with the sentence lit, hints with the picture lit, then waits for the child to count on before the cards open', async () => {
    const { p, provider } = firstOf({ kind: 'g1Adding', mode: 'countOn' }, (_s, i) => i === 0)
    const s = p.activity as NumberSentenceSpec
    expect(s.model.kind).toBe('countOn')
    mount(provider)
    await advance(80)
    const run = getGuideSnapshot().run!
    expect(run.lines.map((l) => l.marks[0]?.target)).toEqual(['ns-sentence', 'ns-model', 'ns-model'])
    expect(run.lines[2].marks[0].hand).toBe('tap')
    expect(q('[data-activity="numberSentence"]')).not.toBeNull()
    // the sentence and the picture: nothing to read but numbers and signs
    expect(q('[data-guide="ns-sentence"] svg')!.getAttribute('aria-label')).toBe(s.sentence.join(' '))
    expectTextBudget(container, 0)
    // the cards wait while the strategy is acted out
    await until(isActing)
    expect(isOpen()).toBe(false)
    expect(cards().every((c) => c.getAttribute('aria-disabled') === 'true')).toBe(true)
    const m = s.model.kind === 'countOn' ? s.model : null!
    said.length = 0
    await actItOut(m.on)
    // each dot is counted on from the start: "nine!", "ten!" …
    expect(said.slice(0, m.on)).toEqual(Array.from({ length: m.on }, (_, i) => `${m.start + i + 1}!`))
    expect(done()).toBe(m.on)
    await until(isOpen)
    expect(cards().some((c) => c.getAttribute('aria-disabled') === 'true')).toBe(false)
    tap(rightCard())
    await until(() => !!q('[data-ns-solved]'))
    // the answer is written into the sentence
    await until(() => phase() === 'praise' || phase() === 'loading' || phase() === 'ask')
  })

  it('a miss: look again, the word about the card, the strategy line by line, "Now you try!", the tried card aside; never failing out', async () => {
    let result: GameResult | null = null
    const { p, provider } = firstOf({ kind: 'g1Adding', mode: 'countOn' }, (_s, i) => i === 4)
    const s = p.activity as NumberSentenceSpec
    expect(s.act).toBeUndefined()
    mount(provider, (r) => (result = r), 3)
    await until(isOpen)
    const wrong = wrongCard()
    const wrongAt = cards().indexOf(wrong)
    said.length = 0
    tap(wrong)
    await until(() => phase() === 'ask' && said.includes('Now you try!'), 60000)
    // look again, the card's word (if it has one), then the help's own lines, in order
    const look = said.indexOf("Hmm, let's look again.")
    expect(look).toBeGreaterThanOrEqual(0)
    const note = p.notes?.[wrongAt]
    if (note) expect(said[look + 1]).toBe(voiceText(note))
    const from = look + (note ? 2 : 1)
    expect(said.slice(from, from + s.help.length)).toEqual(s.help.map((b) => voiceText(b.voice)))
    expect(said[from + s.help.length]).toBe('Now you try!')
    // the dots were counted on by the help
    if (s.model.kind === 'countOn') expect(done()).toBe(s.model.on)
    expect(cards()[wrongAt].getAttribute('data-state')).toBe('tried')
    // the question again, then right twice more: two first-try stars of three
    for (let k = 0; k < 3; k++) {
      await until(isOpen)
      tap(rightCard())
      await until(() => !!q('[data-ns-solved]') || result !== null)
      await until(() => result !== null || (phase() === 'ask' && !q('[data-ns-solved]')), 20000)
    }
    expect(result).toMatchObject({ correct: 2, total: 3 })
  })
})

describe('every strategy picture', () => {
  const CASES: { label: string; config: Parameters<typeof createProvider>[0]; at: number; kind: string }[] = [
    { label: 'turn-around rows', config: { kind: 'g1Adding', mode: 'countOn' }, at: 3, kind: 'rows' },
    { label: 'a double', config: { kind: 'g1Adding', mode: 'facts' }, at: 0, kind: 'rows' },
    { label: 'make ten (acted)', config: { kind: 'g1Adding', mode: 'facts' }, at: 1, kind: 'makeTen' },
    { label: 'take away (acted)', config: { kind: 'g1Subtract', mode: 'takeAway' }, at: 0, kind: 'takeAway' },
    { label: 'count back (acted)', config: { kind: 'g1Subtract', mode: 'takeAway' }, at: 2, kind: 'countBack' },
    { label: 'think addition (acted)', config: { kind: 'g1Subtract', mode: 'think' }, at: 0, kind: 'parts' },
    { label: 'the missing part', config: { kind: 'g1Subtract', mode: 'think' }, at: 1, kind: 'parts' },
    { label: 'a fact family', config: { kind: 'g1Subtract', mode: 'think' }, at: 2, kind: 'family' },
  ]

  it.each(CASES)('$label: drawn, acted out or tapped, answered; the help runs; nothing to read', async ({ config, at, kind }) => {
    const { p, provider } = firstOf(config, (_s, i) => i === at)
    const s = p.activity as NumberSentenceSpec
    expect(s.model.kind).toBe(kind)
    mount(provider)
    await advance(100)
    expect(root$().getAttribute('data-number-sentence')).toBe(kind)
    expectTextBudget(container, 0)
    if (s.act) {
      await until(isActing)
      await actItOut(actTaps(s.model))
    }
    await until(isOpen)
    expectTextBudget(container, 0)
    if (kind === 'family') {
      // the house: four sentences, the asked one lit as the question is said
      expect(qa('[data-sentence]')).toHaveLength(4)
      expect(q('[data-guide="ns-sentence"]')!.getAttribute('data-sentence')).toBe(String(s.model.kind === 'family' ? s.model.blank : -1))
    }
    if (!s.act && kind !== 'family' && kind !== 'rows') {
      // the picture is there to use: a tap does the next step of the strategy
      const before = done()
      tap(q('[data-ns-tap]'))
      await advance(400)
      expect(done()).toBe(before + 1)
    }
    if (kind === 'rows') {
      // tap to count: the counter gets its number
      tap(q('[data-counter="0"] [data-ns-tap]'))
      await advance(300)
      expect(q('[data-counter="0"] .lp-badge')).not.toBeNull()
    }
    // a miss runs the help to the end and asks again
    said.length = 0
    tap(wrongCard())
    await until(() => phase() === 'ask' && said.includes('Now you try!'), 60000)
    const help = s.help.map((b) => voiceText(b.voice))
    const from = said.indexOf(help[0])
    expect(from).toBeGreaterThan(0)
    expect(said.slice(from, from + help.length)).toEqual(help)
    await until(isOpen)
    tap(rightCard())
    await until(() => !!q('[data-ns-solved]'))
  })
})

describe('a real 1st-grade round', () => {
  it.each(['multiplication-mesa', 'division-dunes'])('%s: its first stage, played through with every first try right, earns three stars', async (zoneId) => {
    const stage = zoneStages(getZone(zoneId)!, 1)[0]
    let result: GameResult | null = null
    mount(createProvider(stage.providerConfig), (r) => (result = r), 6)
    for (let k = 0; k < 6 && result === null; k++) {
      await until(() => isActing() || isOpen(), 30000)
      if (isActing()) {
        for (let n = 0; n < 30 && !isOpen() && q('[data-ns-tap]'); n++) {
          tap(q('[data-ns-tap]'))
          await advance(600)
        }
      }
      await until(isOpen)
      expectTextBudget(container, 0)
      tap(rightCard())
      await until(() => result !== null || !q('[data-ns-open]') || !!q('[data-ns-solved]'))
      await until(() => result !== null || (phase() === 'ask' && !q('[data-ns-solved]')), 20000)
    }
    await until(() => result !== null)
    expect(result).toEqual({ stars: 3, score: 60, correct: 6, total: 6 })
  })
})

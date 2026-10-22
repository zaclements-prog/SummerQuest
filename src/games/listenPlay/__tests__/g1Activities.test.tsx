import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import GuideLayer from '../../../guide/GuideLayer'
import { getGuideSnapshot, resetGuideForTests, subscribeGuide } from '../../../guide/store'
import { makeG1ReadingProvider } from '../../../lib/providers/g1Reading'
import { makeG1WritingProvider } from '../../../lib/providers/g1Writing'
import { seededRng } from '../../../lib/random'
import { useProgress } from '../../../store/progress'
import { expectTextBudget, visibleWords } from '../../../test/textBudget'
import type { GameResult } from '../../../screens/GameRunner'
import type { ProblemProvider } from '../../../lib/problem'
import ListenPlay from '../ListenPlay'
import type { ListenProblem } from '../types'
import type { ReadAlongSpec } from '../activities/readAlongSpec'
import type { TilesSpec } from '../activities/tilesSpec'
import { soundsText, type G1Word } from '../../../voice/packs/g1-phonics'

/**
 * Word Reef's and Writing Workshop's 1st-grade activities in the real Listen &
 * Play shell: `readAlong` (read a word, fill the middle letter, read along a
 * sentence) and `tiles` (spell a word, build a sentence). A miss gets "let's
 * look again", the activity's own help (each letter or word lighting as it is
 * said), "Now you try!" and another try; never failing out. The text budget:
 * the only print is what is being read or built (`[data-ra-text]`, the tiles),
 * and nothing else on screen is a word to read.
 */

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const FAKE = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] as const

let container: HTMLDivElement
let root: Root
let said: string[]
let unsubscribe: () => void
/** Every piece of print lit while the narrator spoke, in order (unit index, or "all"). */
let litLog: string[]

async function advance(ms: number) {
  for (let left = ms; left > 0; left -= 50) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(Math.min(50, left))
    })
    const lit = [...container.querySelectorAll('[data-unit][data-lit]')].map((e) => e.getAttribute('data-unit')!)
    const tag = lit.length > 1 ? 'all' : lit[0]
    if (tag !== undefined && litLog.at(-1) !== tag) litLog.push(tag)
  }
}
async function until(ok: () => boolean, ms = 30000) {
  for (let t = 0; t < ms && !ok(); t += 50) await advance(50)
  expect(ok()).toBe(true)
}

const q = <T extends Element = HTMLElement>(sel: string) => container.querySelector<T>(sel)
const cards = () => [...container.querySelectorAll<HTMLButtonElement>('button[data-guide^="lp-card-"]')]
const rightCard = () => cards().find((c) => c.querySelector('[data-correct]'))!
const phase = () => q('[data-listen-play]')!.getAttribute('data-phase')
const click = (el: Element) => act(() => (el as HTMLElement).click())

/** What a child would have to read OUTSIDE the content (the print being read, the tiles being placed). */
function wordsOutsideContent(): string[] {
  const clone = container.cloneNode(true) as HTMLElement
  clone.querySelectorAll('[data-ra-text], [data-tiles] button[data-tile], [data-tiles] button[data-slot], [data-guide^="lp-card-"]').forEach((n) => n.remove())
  return visibleWords(clone)
}

function mount(provider: ProblemProvider, count = 1, onComplete: (r: GameResult) => void = () => {}) {
  act(() =>
    root.render(
      <>
        <GuideLayer />
        <ListenPlay provider={provider} params={{ questionCount: count }} onComplete={onComplete} onExit={() => {}} />
      </>,
    ),
  )
}

/** Answer every question left in the round with its right card (a round is at least three). */
async function rightToTheEnd(done: () => boolean) {
  for (let k = 0; k < 40 && !done(); k++) {
    await until(() => done() || (phase() === 'ask' && !!rightCard()), 30000)
    if (done()) break
    click(rightCard())
    await advance(2500)
  }
  await until(done, 30000)
}

/** A provider that asks these questions in turn. */
const these = (...ps: ListenProblem[]): ProblemProvider => {
  let i = 0
  return {
    topic: ps[0].topic,
    next: () => {
      const n = i++
      return { ...ps[Math.min(n, ps.length - 1)], id: `${ps[0].id}#${n}` }
    },
  }
}

/** The first question of a mode that passes `ok` (seeded). */
function first(mode: Parameters<typeof makeG1ReadingProvider>[0] & object, ok: (q: ListenProblem) => boolean = () => true, skip = 0): ListenProblem {
  const p = makeG1ReadingProvider(mode)
  for (let i = 0; i < skip; i++) p.next()
  for (let i = 0; i < 60; i++) {
    const x = p.next()
    if (ok(x)) return x
  }
  throw new Error('no such question')
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
  litLog = []
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

describe('readAlong: Read a word', { timeout: 60_000 }, () => {
  it('prints the word (in Andika) and three pictures; asks without ever saying the word; nothing else to read', async () => {
    const item = first({ mode: 'decode' })
    mount(these(item))
    await advance(100)
    expect(q('[data-guide="lp-activity"]')!.getAttribute('data-activity')).toBe('readAlong')
    expect(q('[data-ra-text]')!.textContent).toBe(item.answer)
    expect(cards()).toHaveLength(3)
    expect(wordsOutsideContent()).toEqual([])
    // the 1st-grade budget: the word itself (its letters lit one by one) is the only print
    expect(visibleWords(container).join('')).toBe(String(item.answer))
    await advance(6000)
    expect(said[0]).toBe('Read the word. Then tap its picture.')
    for (const s of said) expect(s.toLowerCase()).not.toMatch(new RegExp(`\\b${item.answer}\\b`))
    const run = getGuideSnapshot().run!
    expect(run.lines[0].marks.map((m) => m.target)).toEqual(['ra-text', ['lp-card-0', 'lp-card-1', 'lp-card-2']])
  })

  it('a miss: the card is named, "let\'s look again", the word sounded out letter by letter, then another try (never failing out)', async () => {
    const item = first({ mode: 'decode' })
    const spec = item.activity as ReadAlongSpec
    let result: GameResult | null = null
    mount(these(item), 3, (r) => (result = r))
    await advance(6000)
    const wrong = cards().findIndex((c) => !c.querySelector('[data-correct]'))
    said.length = 0
    litLog.length = 0
    click(cards()[wrong])
    await until(() => said.includes(soundsText(item.answer as G1Word)))
    expect(said[0]).toBe(`${item.options[wrong]}!`)
    expect(said).toContain("Hmm, let's look again.")
    expect(said).toContain("Let's sound it out.")
    await until(() => phase() === 'ask', 30000)
    // each letter lit in turn as its sound was said, then the whole word
    expect(litLog).toEqual([...spec.units.map((_, i) => String(i)), 'all'])
    expect(said).toContain('Now you try!')
    expect(cards()[wrong].dataset.state).toBe('tried')
    // a second miss is still no failing out
    const other = cards().findIndex((c, i) => i !== wrong && !c.querySelector('[data-correct]'))
    click(cards()[other])
    await until(() => phase() === 'oops')
    await until(() => phase() === 'ask', 30000)
    click(rightCard())
    await rightToTheEnd(() => result !== null)
    expect(result).toMatchObject({ correct: 2, total: 3, stars: 2 })
  })
})

describe('readAlong: the middle letter', { timeout: 60_000 }, () => {
  it('the picture, c _ t, three vowel tiles; the right one drops into the gap', async () => {
    const item = first({ mode: 'vowels' }, (x) => x.subtopic === 'middle')
    const spec = item.activity as ReadAlongSpec
    let result: GameResult | null = null
    mount(these(item), 3, (r) => (result = r))
    await advance(100)
    expect(q('[data-guide="ra-picture"]')).not.toBeNull()
    expect(q('[data-guide="ra-gap"]')!.hasAttribute('data-filled')).toBe(false)
    expect(q('[data-ra-text]')!.textContent!.replace(/\u00a0/g, '_')).toBe(`${spec.units[0]}_${spec.units[2]}`)
    expect(wordsOutsideContent()).toEqual([])
    // the letter tiles are what is being learned (letters, free)
    for (const w of visibleWords(container)) expect(w.length).toBeLessThanOrEqual(1)
    await advance(6000)
    expect(getGuideSnapshot().run!.lines[0].marks.map((m) => m.target)).toEqual(['ra-picture', 'ra-gap', ['lp-card-0', 'lp-card-1', 'lp-card-2']])
    click(rightCard())
    await advance(1500)
    expect(q('[data-guide="ra-gap"]')!.hasAttribute('data-filled')).toBe(true)
    expect(q('[data-guide="ra-gap"]')!.textContent).toBe(item.answer)
    await rightToTheEnd(() => result !== null)
    expect(result).toMatchObject({ correct: 3, total: 3, stars: 3 })
  })
})

describe('readAlong: Read along', { timeout: 60_000 }, () => {
  it('reads the sentence with each word lighting as it is said, then asks, then names the cards', async () => {
    const item = first({ mode: 'sentences' })
    const spec = item.activity as ReadAlongSpec
    mount(these(item))
    await advance(100)
    expect(container.querySelector('[data-ra-text]')!.textContent).toBe(item.prompt.replace(/ /g, ''))
    expect(visibleWords(container.querySelector('[data-ra-text]')!).join(' ')).toBe(item.prompt.replace(/[.!]$/, ''))
    expect(wordsOutsideContent()).toEqual([])
    await advance(9000)
    expect(said[0]).toBe(item.prompt)
    expect(litLog.slice(0, spec.units.length)).toEqual(spec.units.map((_, i) => String(i)))
    expect(said[1]).toMatch(/^(Who|What|Where) .+\?$/)
    expect(said.slice(2, 5).map((s) => s.toLowerCase())).toEqual(spec.cards.map((c) => `${c.value}!`))
  })

  it('a miss: "Let\'s read it again." with the words lighting; the word that answers stays marked; a short re-ask', async () => {
    const item = first({ mode: 'sentences' })
    const spec = item.activity as ReadAlongSpec
    mount(these(item))
    await advance(9000)
    const wrong = cards().findIndex((c) => !c.querySelector('[data-correct]'))
    said.length = 0
    click(cards()[wrong])
    await until(() => said.includes("Let's read it again."))
    litLog.length = 0
    await until(() => phase() === 'ask', 30000)
    expect(litLog.slice(0, spec.units.length)).toEqual(spec.units.map((_, i) => String(i)))
    expect(q(`[data-unit="${spec.key}"]`)!.hasAttribute('data-key')).toBe(true)
    await advance(3000)
    // the re-ask: just the question (the help has just read it)
    const at = said.lastIndexOf('Now you try!')
    expect(said[at + 1]).toMatch(/\?$/)
    expect(wordsOutsideContent()).toEqual([])
  })
})

describe('tiles: Spell it', { timeout: 60_000 }, () => {
  const spellItem = (skip = 0) => {
    const p = makeG1WritingProvider({ mode: 'spell' })
    for (let i = 0; i < skip; i++) p.next()
    return p.next()
  }
  const tile = (ch: string) => [...container.querySelectorAll<HTMLButtonElement>('button[data-tile]')].find((b) => b.dataset.tile === ch && !b.hasAttribute('data-used'))!
  const slots = () => [...container.querySelectorAll<HTMLButtonElement>('button[data-slot]')]

  it('the picture, a slot per letter, the tiles; a tap drops a tile in (saying its name) and a slot tap sends it back', async () => {
    const item = spellItem()
    const spec = item.activity as TilesSpec
    mount(these(item))
    await advance(5000)
    expect(said[0]).toBe(item.prompt)
    expect(q('[data-guide="tiles-picture"]')).not.toBeNull()
    expect(slots()).toHaveLength(3)
    expect(wordsOutsideContent()).toEqual([])
    said.length = 0
    click(tile(spec.units[0]))
    await advance(1200)
    expect(slots()[0].getAttribute('aria-label')).toBe(spec.units[0])
    expect(said).toContain(`${spec.units[0].toUpperCase()}!`)
    click(slots()[0])
    await advance(200)
    expect(slots()[0].getAttribute('aria-label')).toBe('empty')
  })

  it('a wrong spelling: the wrong slots wobble, "let\'s spell it together", each slot lights as its sound is said, the wrong tiles go back', async () => {
    const item = spellItem(2)
    const spec = item.activity as TilesSpec
    mount(these(item))
    await advance(5000)
    // the right first letter, then two wrong ones
    const extras = spec.tiles.filter((t) => !spec.units.includes(t))
    click(tile(spec.units[0]))
    click(tile(extras[0]))
    said.length = 0
    click(tile(extras[1]))
    await advance(600)
    expect(slots().filter((s) => s.hasAttribute('data-wrong')).length).toBe(2)
    const lit: number[] = []
    for (let k = 0; k < 400 && phase() !== 'ask'; k++) {
      await advance(50)
      const i = slots().findIndex((s) => s.hasAttribute('data-lit'))
      if (i >= 0 && lit.at(-1) !== i) lit.push(i)
    }
    expect(said.filter((x) => !/^[A-Z]!$/.test(x)).slice(0, 4)).toEqual(["Hmm, let's look again.", "Let's spell it together.", soundsText(item.answer as G1Word), 'Now you try!'])
    expect(lit).toEqual([0, 1, 2])
    // the right letter stays; the others went back
    expect(slots().map((s) => s.getAttribute('aria-label'))).toEqual([spec.units[0], 'empty', 'empty'])
    said.length = 0
    click(tile(spec.units[1]))
    click(tile(spec.units[2]))
    // built: the word is said, then the praise
    await until(() => phase() === 'praise' || phase() === 'loading', 30000)
    expect(said).toContain(`${String(item.answer)}!`)
  })
})

describe('tiles: Build a sentence', { timeout: 60_000 }, () => {
  const sentenceItem = (skip: number) => {
    const p = makeG1WritingProvider({ mode: 'sentence' })
    for (let i = 0; i < skip; i++) p.next()
    return p.next()
  }
  const tiles = () => [...container.querySelectorAll<HTMLButtonElement>('button[data-tile]')]
  const tile = (t: string) => tiles().find((b) => b.dataset.tile === t && !b.hasAttribute('data-used'))!
  const slots = () => [...container.querySelectorAll<HTMLButtonElement>('button[data-slot]')]

  it('word tiles and the period; only the tiles are print; built right, it is read back with each slot lighting', async () => {
    const item = sentenceItem(0)
    const spec = item.activity as TilesSpec
    mount(these(item))
    await advance(6000)
    expect(said[0]).toBe(item.prompt)
    expect(slots()).toHaveLength(spec.units.length)
    expect(wordsOutsideContent()).toEqual([])
    expect(visibleWords(container).sort()).toEqual(spec.tiles.filter((t) => t !== '.').sort())
    said.length = 0
    for (const u of spec.units) click(tile(u))
    const lit: number[] = []
    for (let k = 0; k < 200 && phase() === 'ask'; k++) {
      await advance(50)
      const i = slots().findIndex((s) => s.hasAttribute('data-lit'))
      if (i >= 0 && lit.at(-1) !== i) lit.push(i)
    }
    expect(phase()).toBe('praise')
    expect(said[0]).toBe(item.answer)
    expect(lit.slice(0, spec.units.length - 1)).toEqual(spec.units.slice(0, -1).map((_, i) => i))
    expect(q('[data-guide="tiles-slots"]')!.hasAttribute('data-right')).toBe(true)
  })

  it('starting with the small-letter word is a miss: the rule is said, the sentence read, then another try', async () => {
    const item = sentenceItem(2)
    const spec = item.activity as TilesSpec
    const small = spec.tiles.find((t) => !spec.units.includes(t))!
    expect(small).toBe(spec.units[0].toLowerCase())
    mount(these(item))
    await advance(6000)
    said.length = 0
    click(tile(small))
    for (const u of spec.units.slice(1)) click(tile(u))
    await until(() => phase() === 'ask' && said.includes('Now you try!'), 30000)
    expect(said.slice(0, 3)).toEqual(["Hmm, let's look again.", 'A sentence starts with a capital letter. It ends with a period.', item.answer])
    // the small-letter word went back; the rest stayed
    expect(slots()[0].getAttribute('aria-label')).toBe('empty')
    expect(slots().slice(1).map((s) => s.getAttribute('aria-label'))).toEqual(spec.units.slice(1).map((u) => (u === '.' ? '.' : u)))
    expectTextBudget(container, spec.tiles.length)
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import GuideLayer from '../../guide/GuideLayer'
import { getGuideSnapshot, resetGuideForTests } from '../../guide/store'
import { getZone, zoneStages } from '../../curriculum'
import type { GradeLevel } from '../../lib/gradeTiers'
import { seededRng } from '../../lib/random'
import { useProgress } from '../../store/progress'
import { expectTextBudget, visibleWords } from '../../test/textBudget'
import TutorScreen from '../../screens/TutorScreen'
import TutorIndex from '../../screens/TutorIndex'
import LessonComplete from '../ui/LessonComplete'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const FAKE = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] as const

let container: HTMLDivElement
let root: Root

/** Let time pass in small steps, each its own act(), so React renders and runs effects between them. */
async function advance(ms: number) {
  for (let left = ms; left > 0; left -= 50) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(Math.min(50, left))
    })
  }
}

function PlayRoute() {
  const { zoneId, stageId } = useParams()
  return <div data-play={`${zoneId}/${stageId}`} />
}

function mount(path: string) {
  act(() =>
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <GuideLayer />
        <Routes>
          <Route path="/tutor" element={<TutorIndex />} />
          <Route path="/tutor/:lessonId" element={<TutorScreen />} />
          <Route path="/play/:zoneId/:stageId" element={<PlayRoute />} />
        </Routes>
      </MemoryRouter>,
    ),
  )
}

const setGrade = (grade: GradeLevel) => useProgress.setState({ player: { emoji: '🦊', color: '#f97316', name: 'Kit', grade }, soundEnabled: false })

/** What a child would have to read here, leaving out the optional words (off unless a grown-up turns them on). */
function wordsToRead(): string[] {
  const clone = container.cloneNode(true) as HTMLElement
  clone.querySelectorAll('[data-lesson-caption]').forEach((n) => n.remove())
  return visibleWords(clone)
}
function expectNothingToRead() {
  const clone = container.cloneNode(true) as HTMLElement
  clone.querySelectorAll('[data-lesson-caption]').forEach((n) => n.remove())
  expectTextBudget(clone, 0)
}

const button = (label: string) => container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
const cards = () => [...container.querySelectorAll<HTMLButtonElement>('button[data-guide^="lesson-card-"]')]
const rightCard = () => cards().find((c) => c.querySelector('[data-correct]'))!
const wrongCard = () => cards().find((c) => !c.querySelector('[data-correct]') && c.dataset.state !== 'tried')!
const click = (el: HTMLElement | null) => act(() => el!.click())

/** Tell the current step through (the K pace's silent timeline), so its check comes in. */
const tellStep = () => advance(9000)

beforeEach(() => {
  vi.useFakeTimers({ toFake: [...FAKE] })
  vi.spyOn(Math, 'random').mockImplementation(seededRng('listen-lesson'))
  resetGuideForTests()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  resetGuideForTests()
  document.body.innerHTML = ''
  try {
    localStorage.removeItem('sq-listen-captions')
  } catch {
    // no storage
  }
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('the listen-mode lesson (K–1)', () => {
  it('has nothing to read: the stage, 🔊, ↺ and a big ▶', async () => {
    setGrade(0)
    mount('/tutor/kCounting')
    await advance(300)
    expect(container.querySelector('[data-listen-lesson]')).not.toBeNull()
    expect(button('Say it again')).not.toBeNull()
    expect(button('Watch again')).not.toBeNull()
    expect(button('Next')).not.toBeNull()
    expectNothingToRead()
    await tellStep()
    // the told step: apples and their numbers (numerals are free)
    expect(container.querySelector('[data-guide="lesson-stage"] svg')).not.toBeNull()
    expectNothingToRead()
  })

  it('brings the "your turn" in once the step is told: picture cards, asked aloud, the guide on the cards', async () => {
    setGrade(0)
    mount('/tutor/kCounting')
    await advance(100)
    click(button('Next'))
    click(button('Next'))
    await advance(300)
    expect(cards()).toHaveLength(0)
    await tellStep()
    expect(cards()).toHaveLength(3)
    for (const c of cards()) expect(c.querySelector('svg')).not.toBeNull()
    expectNothingToRead()
    expect(button('Next')!.disabled).toBe(true)
    const run = getGuideSnapshot().run!
    expect(run.lines[0].text).toBe('How many fish? Tap the number.')
    const targets = run.lines[0].marks.map((m) => m.target)
    expect(targets[0]).toBe('lesson-stage')
    expect(targets.at(-1)).toEqual(['lesson-card-0', 'lesson-card-1', 'lesson-card-2'])
    // the right card: a happy pop, and ▶ opens
    click(rightCard())
    await advance(3000)
    expect(rightCard().dataset.state).toBe('right')
    expect(button('Next')!.disabled).toBe(false)
    expectNothingToRead()
  })

  it('a wrong pick: look again, count the stage together, try again (the tried card rests aside)', async () => {
    setGrade(0)
    mount('/tutor/kCounting')
    await advance(100)
    click(button('Next'))
    click(button('Next'))
    await tellStep()
    const wrong = wrongCard()
    click(wrong)
    let sawCountAlong = false
    for (let k = 0; k < 40 && wrong.dataset.state !== 'tried'; k++) {
      await advance(250)
      const s = getGuideSnapshot()
      const line = s.run?.lines[s.line]
      if (line?.text.startsWith('One, two') && line.marks[0]?.target === 'lesson-stage') sawCountAlong = true
    }
    expect(sawCountAlong).toBe(true)
    expect(wrong.dataset.state).toBe('tried')
    expect(button('Next')!.disabled).toBe(true)
    expect(container.querySelector('[data-listen-check]')!.getAttribute('data-phase')).toBe('ask')
  })

  it('letters: the only things on screen to read are the letters themselves', async () => {
    setGrade(0)
    mount('/tutor/kLetters')
    await tellStep()
    for (const w of wordsToRead()) expect(w).toMatch(/^[A-Za-z]$/)
    click(button('Next'))
    await tellStep()
    expect(cards()).toHaveLength(3)
    const shown = wordsToRead()
    expect(shown.length).toBeGreaterThan(0)
    for (const w of shown) expect(w).toMatch(/^[A-Za-z]$/)
    expect(getGuideSnapshot().run!.lines[0].text).toBe('Tap little b!')
  })

  it('shows the words only when a grown-up turns them on', async () => {
    setGrade(0)
    mount('/tutor/kShapes')
    await advance(300)
    expect(container.querySelector('[data-lesson-caption]')).toBeNull()
    click(button('Show the words'))
    await advance(100)
    const caption = container.querySelector('[data-lesson-caption]')!
    expect(visibleWords(caption).join(' ')).toContain('This is a triangle')
    expectNothingToRead()
    expect(localStorage.getItem('sq-listen-captions')).toBe('1')
    click(button('Hide the words'))
    expect(container.querySelector('[data-lesson-caption]')).toBeNull()
  })

  it('finishes with stars, ↺ and ▶ only, says what to do, and practices in the band', async () => {
    setGrade(0)
    mount('/tutor/kLetters')
    await advance(100)
    click(button('Next')) // names → bigLittle
    await tellStep()
    click(rightCard())
    await advance(3000)
    click(button('Next')) // → sounds
    click(button('Next')) // → yourTurn
    await tellStep()
    const named = getGuideSnapshot().run!.lines[0]
    expect(named.text).toBe('Banana. Apple. Fish. Which one starts like ball?')
    expect(named.marks.map((m) => m.target)).toEqual(['lesson-card-0', 'lesson-card-1', 'lesson-card-2', ['lesson-card-0', 'lesson-card-1', 'lesson-card-2']])
    click(rightCard())
    await advance(3000)
    click(button('Finish'))
    await advance(1600)
    const done = container.querySelector('[aria-label="Lesson complete"]')!
    expect(done).not.toBeNull()
    expectTextBudget(done, 0)
    const s = getGuideSnapshot()
    expect(s.run?.lines[0].text).toBe('You did it! Tap the arrow to play.')
    expect(s.run?.lines[0].marks[0].target).toBe('lesson-done-next')
    expect(useProgress.getState().lessonsDone.kLetters).toBeDefined()
    // no countdown: it waits for the child
    await advance(8000)
    expect(container.querySelector('[data-play]')).toBeNull()
    click(button("Let's play"))
    await advance(100)
    const [zoneId, stageId] = container.querySelector('[data-play]')!.getAttribute('data-play')!.split('/')
    expect(zoneId).toBe('reading-reef')
    expect(zoneStages(getZone(zoneId)!, 0).map((st) => st.id)).toContain(stageId)
  })

  it('the lesson-complete card for listen mode has no words; the reading one is unchanged', () => {
    const noop = () => {}
    act(() => root.render(<LessonComplete listen title="Letters" emoji="🔤" ideas={4} reduced onPractice={noop} onReplay={noop} />))
    expectTextBudget(container, 0)
    act(() => root.render(<LessonComplete title="Division" emoji="➗" ideas={3} reduced onPractice={noop} onReplay={noop} />))
    expect(container.textContent).toContain('You learned 3 big ideas in Division')
    expect(container.textContent).toContain("Let's practice!")
  })
})

describe('the lesson picker', () => {
  it("K–1: a big picture per lesson, nothing to read, and the narrator says what to do", async () => {
    setGrade(0)
    mount('/tutor')
    await advance(900)
    const links = [...container.querySelectorAll<HTMLAnchorElement>('a[data-guide^="lesson-pick-"]')]
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/tutor/kCounting', '/tutor/kShapes', '/tutor/kLetters', '/tutor/kRhymes', '/tutor/kTracing'])
    // no words: the letters lesson's picture shows letter tiles, and that's all
    for (const w of visibleWords(container)) expect(w).toMatch(/^[A-Za-z]$/)
    const pictures = container.cloneNode(true) as HTMLElement
    pictures.querySelectorAll('svg').forEach((n) => n.remove())
    expectTextBudget(pictures, 0)
    expect(getGuideSnapshot().run?.lines[0].text).toBe('Pick a lesson to watch. Tap a picture!')
  })

  it('grades 2–5: the reading picker with the eleven lessons, as before', async () => {
    for (const g of [3, 5] as GradeLevel[]) {
      setGrade(g)
      mount('/tutor')
      await advance(100)
      expect(container.querySelector('[data-listen-index]')).toBeNull()
      const hrefs = [...container.querySelectorAll('a[href^="/tutor/"]')].map((a) => a.getAttribute('href'))
      expect(hrefs).toHaveLength(11)
      expect(hrefs).not.toContain('/tutor/kCounting')
      expect(container.textContent).toContain('lessons mastered')
      act(() => root.render(<></>))
    }
  })
})

describe('grades 2–5 lessons', () => {
  it('keep the reading player', async () => {
    setGrade(3)
    mount('/tutor/division')
    await advance(300)
    expect(container.querySelector('[data-listen-lesson]')).toBeNull()
    expect(container.textContent).toContain('Step 1 of 3')
    expect(container.textContent).toContain('Division is sharing fairly')
  })

  it('a K–1 lesson opened by any grade is told the voice-first way', async () => {
    setGrade(3)
    mount('/tutor/kCounting')
    await advance(300)
    expect(container.querySelector('[data-listen-lesson]')).not.toBeNull()
  })
})

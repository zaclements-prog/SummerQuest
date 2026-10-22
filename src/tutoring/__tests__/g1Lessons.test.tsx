import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import GuideLayer from '../../guide/GuideLayer'
import { getGuideSnapshot, resetGuideForTests } from '../../guide/store'
import { getZone, zoneStages } from '../../curriculum'
import type { GradeLevel } from '../../lib/gradeTiers'
import { seededRng } from '../../lib/random'
import { petById } from '../../lib/pets/catalog'
import { petStatus } from '../../lib/pets/growth'
import { useProgress } from '../../store/progress'
import { visibleWords } from '../../test/textBudget'
import { voiceText, VOICE_PACKS } from '../../voice/registry'
import TutorScreen from '../../screens/TutorScreen'
import TutorIndex from '../../screens/TutorIndex'
import LessonPoster from '../ui/LessonPoster'
import { g1Lessons, getLesson, lessonsFor, zoneLessonFor } from '../lessons'
import { practiceHref } from '../lessonLinks'
import { sceneFor } from '../motion/scenes'
import { phraseIndex } from '../motion/cues'
import { SKILLS } from '../skills'

/**
 * The 1st-grade voice lessons (phase-2b contract): Word Reef's g1Reading and
 * Writing Workshop's g1Writing. About four steps with motion scenes, two
 * picture-card "your turn" checks each, nothing to read but the letters and
 * words being learned; each practises its zone's first 1st-grade stage and
 * hatches its zone's pet. Counting Towers keeps kindergarten's kTowers.
 */

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const CONTRACT = {
  g1Reading: { zoneId: 'reading-reef', practiceStageId: 'g1-vowels-1', pet: 'octopus' },
  g1Writing: { zoneId: 'writing-workshop', practiceStageId: 'g1-trace-1', pet: 'dragonet' },
} as const

const words = (s: string) => s.split(/\s+/).filter(Boolean)

describe('the 1st-grade lessons (data)', () => {
  it.each(Object.entries(CONTRACT))('%s: band g1, its zone, its practice stage (the zone’s first 1st-grade stage), registered skills', (id, c) => {
    const l = getLesson(id)!
    expect(g1Lessons).toContain(l)
    expect(l).toMatchObject({ band: 'g1', zoneId: c.zoneId, practiceStageId: c.practiceStageId })
    expect(zoneStages(getZone(c.zoneId)!, 1)[0].id).toBe(c.practiceStageId)
    for (const sk of l.skillIds) expect(SKILLS[sk], sk).toMatchObject({ zoneId: c.zoneId, lessonId: id })
    expect(practiceHref(l, undefined, 1)).toBe(`/play/${c.zoneId}/${c.practiceStageId}`)
    // 1st grade gets it for the zone; kindergarten keeps its own
    expect(zoneLessonFor(c.zoneId, 1)).toBe(l)
    expect(zoneLessonFor(c.zoneId, 0)?.band).toBe('k1')
    expect(lessonsFor(0).map((x) => x.id)).not.toContain(id)
    expect(lessonsFor(3).map((x) => x.id)).not.toContain(id)
  })

  it.each(Object.keys(CONTRACT))('%s: about four short steps, each with a scene; told for six-year-olds', (id) => {
    const l = getLesson(id)!
    expect(l.steps.length).toBeGreaterThanOrEqual(3)
    expect(l.steps.length).toBeLessThanOrEqual(5)
    expect(new Set(l.steps.map((s) => s.id)).size).toBe(l.steps.length)
    for (const s of l.steps) {
      const key = `${id}/${s.id}`
      expect(sceneFor(id, s.id), `${key} has no scene`).toBeDefined()
      expect(s.narration, key).not.toMatch(/\d/)
      expect(words(s.narration).length, key).toBeLessThanOrEqual(24)
      for (const sentence of s.narration.split(/[.!?]+/).filter((x) => x.trim())) expect(words(sentence).length, `${key}: "${sentence.trim()}"`).toBeLessThanOrEqual(12)
      expect(s.body, key).toBeUndefined()
    }
  })

  it.each(Object.keys(CONTRACT))('%s: two picture-card "your turn" checks, asked aloud, every card named', (id) => {
    const l = getLesson(id)!
    const checks = l.steps.filter((s) => s.check).map((s) => s.check!)
    expect(checks).toHaveLength(2)
    for (const c of checks) {
      expect(c.pictures!.map((p) => p.value)).toEqual(c.options)
      expect(c.options).toContain(c.answer)
      expect(new Set(c.options).size).toBe(c.options.length)
      expect(c.options.length).toBeGreaterThanOrEqual(2)
      expect(c.options.length).toBeLessThanOrEqual(3)
      expect(voiceText(c.speech!)).toBe(c.question)
      // the question is a k-lessons line (the pack's lesson list)
      const ref = c.speech as { line: string }
      expect(VOICE_PACKS['k-lessons'].lines[ref.line.slice('k-lessons/'.length)]).toBe(c.question)
      for (const p of c.pictures!) expect(() => voiceText(p.speech!)).not.toThrow()
      for (const n of c.namedAt ?? []) {
        expect(c.options).toContain(n.option)
        expect(phraseIndex(c.question, n.cue)).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('g1Reading teaches the middle sound, letter teams, sounding out and reading along; g1Writing the lines, a little a, spelling, capital and period', () => {
    const told = (id: string) => getLesson(id)!.steps.map((s) => s.narration).join(' ')
    for (const w of ['middle', 'team up', 'S and H say shh', 'Sound it out', 'read along', 'each word lights up']) expect(told('g1Reading')).toContain(w)
    for (const w of ['Little letters live on the lines', 'Tall ones touch the top line', 'dashed line', 'Around like a C', 'spell a word', 'capital letter', 'period']) expect(told('g1Writing')).toContain(w)
    const [mid, team] = getLesson('g1Reading')!.steps.filter((s) => s.check).map((s) => s.check!)
    expect([mid.answer, team.answer]).toEqual(['map', 'ship'])
    const [tail, sentence] = getLesson('g1Writing')!.steps.filter((s) => s.check).map((s) => s.check!)
    expect([tail.answer, sentence.answer]).toEqual(['g', 'The'])
    expect(sentence.pictures!.map((p) => (p.picture as { text: string }).text)).toEqual(['the', 'The', 'dog'])
  })

  it('each hatches its zone’s pet (the octopus, the dragonet); Counting Towers keeps kindergarten’s lesson (the dragon)', () => {
    for (const [id, c] of Object.entries(CONTRACT)) {
      const pet = petById(c.pet)!
      expect(pet.lessonIds).toContain(id)
      expect(petStatus(pet, {}, { [id]: 1 }, 1).stage).toBe('baby')
    }
    expect(zoneLessonFor('tower-battlefront', 1)?.id).toBe('kTowers')
    expect(practiceHref(getLesson('kTowers')!, undefined, 1)).toBe('/play/tower-battlefront/g1-towers-1')
    expect(petById('dragon')!.lessonIds).toEqual(['kTowers'])
  })
})

// ── the lessons played, as a 1st grader ──────────────────────────────────────

const FAKE = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] as const
let container: HTMLDivElement
let root: Root

async function advance(ms: number) {
  for (let left = ms; left > 0; left -= 50) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(Math.min(50, left))
    })
  }
}

function mount(path: string) {
  act(() =>
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <GuideLayer />
        <Routes>
          <Route path="/tutor" element={<TutorIndex />} />
          <Route path="/tutor/:lessonId" element={<TutorScreen />} />
        </Routes>
      </MemoryRouter>,
    ),
  )
}
const setGrade = (grade: GradeLevel) => useProgress.setState({ player: { emoji: '🦊', color: '#f97316', name: 'Kit', grade }, soundEnabled: false })
const button = (label: string) => container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
const cards = () => [...container.querySelectorAll<HTMLButtonElement>('button[data-guide^="lesson-card-"]')]

/** The words on screen outside the stage's content (the lesson's scene, its cards) and the optional captions. */
function chromeWords(): string[] {
  const clone = container.cloneNode(true) as HTMLElement
  clone.querySelectorAll('[data-lesson-caption], [data-guide="lesson-stage"], [data-guide^="lesson-card-"]').forEach((n) => n.remove())
  return visibleWords(clone)
}

describe('the 1st-grade lessons, played', { timeout: 60_000 }, () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: [...FAKE] })
    vi.spyOn(Math, 'random').mockImplementation(seededRng('g1-lessons'))
    resetGuideForTests()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })
  afterEach(() => {
    act(() => root.unmount())
    resetGuideForTests()
    document.body.innerHTML = ''
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it.each(Object.keys(CONTRACT))('%s: told the voice-first way; only the letters and words being learned are print; the checks are picture cards', async (id) => {
    setGrade(1)
    mount(`/tutor/${id}`)
    await advance(300)
    expect(container.querySelector('[data-listen-lesson]')).not.toBeNull()
    const l = getLesson(id)!
    // the content a stage may print: the words of the narration, sounds and letters
    const allowed = new Set(l.steps.flatMap((s) => s.narration.toLowerCase().match(/[a-z]+/g) ?? []).concat(['sh', 'c', 'a', 't', 's', 'h', 'i', 'p', 'g', 'b', 'the', 'dog', 'ran', 'mat']))
    for (let i = 0; i < l.steps.length; i++) {
      await advance(9500)
      expect(chromeWords(), `${id} step ${i}`).toEqual([])
      for (const w of visibleWords(container.querySelector('[data-guide="lesson-stage"]')!)) expect(allowed.has(w.toLowerCase()), `${id} step ${i}: "${w}"`).toBe(true)
      if (l.steps[i].check) {
        expect(cards().length).toBe(l.steps[i].check!.options.length)
        expect(getGuideSnapshot().run!.lines[0].text).toBe(l.steps[i].check!.question)
        const right = cards().find((c) => c.querySelector('[data-correct]'))!
        act(() => right.click())
        await advance(3000)
      }
      const next = button('Next') ?? button('Finish')
      expect(next).not.toBeNull()
      act(() => next!.click())
      await advance(300)
    }
    await advance(1600)
    expect(container.querySelector('[aria-label="Lesson complete"]')).not.toBeNull()
    expect(useProgress.getState().lessonsDone[id]).toBeDefined()
  })

  it('the 1st-grade lesson picker offers its own lessons (and kindergarten’s for the other zones), as pictures', async () => {
    setGrade(1)
    mount('/tutor')
    await advance(900)
    const hrefs = [...container.querySelectorAll<HTMLAnchorElement>('a[data-guide^="lesson-pick-"]')].map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/tutor/g1Reading')
    expect(hrefs).toContain('/tutor/g1Writing')
    expect(hrefs).toContain('/tutor/kTowers')
    expect(hrefs).not.toContain('/tutor/kLetters')
    expect(hrefs).not.toContain('/tutor/kTracing')
    // the posters' print: single letters only
    for (const w of visibleWords(container)) expect(w).toMatch(/^[A-Za-z]$/)
  })

  it('the posters draw their own motif (no fallback emoji)', () => {
    for (const id of Object.keys(CONTRACT)) {
      act(() => root.render(<LessonPoster id={id} emoji="?" reduced />))
      expect(container.querySelector('svg')).not.toBeNull()
      expect(container.textContent).not.toContain('?')
      for (const w of visibleWords(container)) expect(w).toMatch(/^[a-z]$/)
    }
  })
})

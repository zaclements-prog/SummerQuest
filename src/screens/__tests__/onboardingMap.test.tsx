import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import AvatarCreate from '../AvatarCreate'
import WorldMap from '../WorldMap'
import { useProgress } from '../../store/progress'
import { getZone, zoneStages, zoneTitle } from '../../curriculum'
import { getGuideSnapshot, resetGuideForTests } from '../../guide/store'
import { findNextTarget } from '../../lib/continueTarget'
import type { GradeLevel } from '../../lib/gradeTiers'

/*
 * Playtest fixes on the real screens (jsdom): the K–1 avatar setup can't be
 * undone by a stray tap, the voice never re-asks for a pick already made, the
 * grade question is unambiguous; the map's "Continue" and names.
 */

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root
const at = { path: '' }
function Where() {
  const { pathname } = useLocation()
  useEffect(() => {
    at.path = pathname
  })
  return null
}
function render(url: string, el: React.ReactNode, routePath: string) {
  act(() =>
    root.render(
      <MemoryRouter initialEntries={[url]}>
        <Where />
        <Routes>
          <Route path={routePath} element={el} />
          <Route path="*" element={null} />
        </Routes>
      </MemoryRouter>,
    ),
  )
}
const tick = async (ms: number) => {
  for (let left = ms; left > 0; left -= 100) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(Math.min(100, left))
    })
  }
}
const q = <T extends Element = HTMLElement>(sel: string) => container.querySelector<T>(sel)
const qa = (sel: string) => [...container.querySelectorAll<HTMLElement>(sel)]
const click = (el: Element | null) => act(() => (el as HTMLElement).click())
const byText = (sel: string, text: string) => qa(sel).find((b) => b.textContent?.includes(text)) ?? null
const lines = () => getGuideSnapshot().run?.lines.map((l) => (l.voice && 'line' in l.voice ? l.voice.line : null)) ?? []
const targets = () => getGuideSnapshot().run?.lines.flatMap((l) => l.marks.map((m) => m.target)) ?? []
// (by attribute, not a CSS selector: jsdom's selectors trip on emoji)
const radio = (label: string) => qa('[role="radio"]').find((e) => e.getAttribute('aria-label') === label) ?? null
const gradeRadios = () => qa('[role="radio"]').filter((e) => /grade$|^Kindergarten$/.test(e.getAttribute('aria-label') ?? ''))
const begin = () => byText('button', 'Begin adventure')

beforeEach(() => {
  vi.useFakeTimers()
  resetGuideForTests()
  localStorage.clear()
  useProgress.getState().resetPlayer()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  resetGuideForTests()
  vi.useRealTimers()
})

describe('AvatarCreate: the K–1 setup trap', () => {
  it('K: once picked, the grade grid folds away (no card under the hand), with room under Begin for the hand', async () => {
    render('/avatar', <AvatarCreate />, '/avatar')
    click(radio('Kindergarten'))
    expect(gradeRadios()).toHaveLength(0)
    expect(q('[data-grade-folded]')!.textContent).toContain('Finished K · going into 1st')
    // the room under Begin comes after it on the page
    const room = q('[data-begin-room]')!
    expect(room).not.toBeNull()
    expect(begin()!.compareDocumentPosition(room) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    click(radio('Character 🐼'))
    await tick(3000)
    click(radio('Sky'))
    await tick(3000)
    expect(lines()).toEqual(['k-nav/tapBegin'])
    expect(targets()).toEqual(['avatar-begin'])
    // the only rocket is Begin: the name field's button is a plain OK that doesn't start
    expect(qa('button').filter((b) => b.textContent?.includes('🚀'))).toEqual([begin()])
    click(byText('button', 'OK'))
    expect(useProgress.getState().player).toBeNull()
    click(begin())
    expect(useProgress.getState().player).toMatchObject({ emoji: '🐼', grade: 0, name: 'Panda' })
  })

  it('K: a stray tap on "Change grade" or a K–1 card never undoes the setup', async () => {
    render('/avatar', <AvatarCreate />, '/avatar')
    click(radio('Kindergarten'))
    click(radio('Character 🐼'))
    await tick(3000)
    click(radio('Sky'))
    await tick(3000)
    click(byText('button', 'Change grade'))
    expect(gradeRadios().length).toBeGreaterThan(1)
    click(radio('1st grade'))
    // folded again; the name is still the animal's and Begin still starts
    expect(gradeRadios()).toHaveLength(0)
    expect(q<HTMLInputElement>('#explorer-name')!.placeholder).toBe('Panda')
    click(begin())
    expect(useProgress.getState().player).toMatchObject({ emoji: '🐼', color: '#38bdf8', grade: 1, name: 'Panda' })
  })

  it('1st grade: an animal picked before the grade is not asked for again', async () => {
    render('/avatar', <AvatarCreate />, '/avatar')
    click(radio('Character 🦁'))
    click(radio('1st grade'))
    expect(lines()).toEqual(['k-nav/pickColor'])
    expect(lines()).not.toContain('k-nav/pickAnimal')
  })

  it('1st grade: animal and color picked before the grade go straight to Begin', async () => {
    render('/avatar', <AvatarCreate />, '/avatar')
    click(radio('Character 🦁'))
    click(radio('Berry'))
    click(radio('1st grade'))
    expect(lines()).toEqual(['k-nav/tapBegin'])
    expect(targets()).toEqual(['avatar-begin'])
  })

  it('the grade question asks which grade the child just finished; each card says the grade they go into', () => {
    render('/avatar', <AvatarCreate />, '/avatar')
    expect(container.textContent).toContain('Which grade did your child just finish?')
    expect(container.textContent).not.toContain('What grade are you finishing?')
    expect(radio('3rd grade')!.textContent).toContain('going into 4th')
    expect(radio('2nd grade')!.textContent).toContain('going into 3rd')
  })

  it('grades 2–5: the grid stays open after a pick, and Go! still begins', async () => {
    render('/avatar', <AvatarCreate />, '/avatar')
    click(radio('3rd grade'))
    expect(q('[data-grade-folded]')).toBeNull()
    expect(q('[data-begin-room]')).toBeNull()
    expect(radio('3rd grade')!.getAttribute('aria-checked')).toBe('true')
    const input = q<HTMLInputElement>('#explorer-name')!
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'Ava')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    click(byText('button', 'Go!'))
    expect(useProgress.getState().player).toMatchObject({ name: 'Ava', grade: 3 })
    await tick(500)
  })
})

describe('WorldMap', () => {
  function player(grade: GradeLevel, zones: Record<string, unknown> = {}) {
    useProgress.setState({ player: { emoji: '🦊', color: '#fb923c', name: 'Zoe', grade }, ownedCreatures: ['fox'], activeCreature: 'fox', zones } as never)
  }
  const cleared = (zoneId: string, grade: GradeLevel, stars: number) => ({
    zoneId,
    stages: Object.fromEntries(zoneStages(getZone(zoneId)!, grade).map((s) => [s.id, { stageId: s.id, stars, bestScore: 1, attempts: 1 }])),
  })

  it('grade 3: "Continue your quest" skips a place whose stages are all cleared (Mesa 1 star each)', () => {
    player(3, { 'multiplication-mesa': cleared('multiplication-mesa', 3, 1) })
    render('/map', <WorldMap />, '/map')
    const next = findNextTarget(useProgress.getState().zones, 3)!
    expect(next.zoneId).not.toBe('multiplication-mesa')
    expect(byText('a', 'Continue your quest')!.getAttribute('href')).toBe(`/zone/${next.zoneId}`)
    expect(container.textContent).toContain(`Next up: ${getZone(next.zoneId)!.title}`)
  })

  it('grade 3: every name is drawn after every medal (no star chip can cover a name)', () => {
    player(3)
    render('/map', <WorldMap />, '/map')
    const medals = qa('[data-map-medal]')
    const names = qa('[data-map-label]')
    expect(medals.length).toBeGreaterThanOrEqual(12)
    expect(names).toHaveLength(medals.length)
    const lastMedal = medals[medals.length - 1]
    for (const n of names) expect(lastMedal.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // the names are mouse/finger targets only; each place is announced once, by its medal link
    for (const n of names) expect(n.getAttribute('aria-hidden')).toBe('true')
    expect(names.every((n) => n.querySelector('a')?.getAttribute('tabindex') === '-1')).toBe(true)
  })

  it('1st grade: "Next up" says the 1st-grade name of the place, never Multiplication Mesa', () => {
    player(1)
    render('/map', <WorldMap />, '/map')
    const next = findNextTarget({}, 1)!
    const name = zoneTitle(getZone(next.zoneId)!, 1)
    expect(container.textContent).toContain(`Next up: ${name}`)
    expect(container.textContent).not.toContain('Multiplication Mesa')
  })
})

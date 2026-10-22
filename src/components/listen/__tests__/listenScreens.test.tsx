import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createRef, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Vector3 } from 'three'
import AvatarCreate from '../../../screens/AvatarCreate'
import ZoneDetail from '../../../screens/ZoneDetail'
import WorldMap from '../../../screens/WorldMap'
import WorldHud from '../../../world/WorldHud'
import { ListenQuitDialog } from '../ListenQuitDialog'
import { useProgress } from '../../../store/progress'
import { useWorldUi } from '../../../world/useWorldUi'
import { curriculum, getZone, type Stage } from '../../../curriculum'
import { getGuideSnapshot, resetGuideForTests } from '../../../guide/store'
import type { GradeLevel } from '../../../lib/gradeTiers'

/*
 * K–1 navigation on the real screens (jsdom: no 3D). Grades 2–5 must render
 * exactly what they did before: these check the classic markup is still there
 * and none of the K–1 parts are; the pixel-for-pixel check is the screenshot
 * diff in the PR notes. The pilot's K–1 stage sets are hung on the real zones.
 */

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const PILOT: Record<string, string[]> = {
  'multiplication-mesa': ['k-count-1', 'k-count-parade', 'k-count-3'],
  'geometry-grove': ['k-shapes-1', 'k-shapes-2', 'k-shapes-3'],
  'reading-reef': ['k-letters-1', 'k-letters-2', 'k-letters-3'],
}
const KINDS: Stage['kind'][] = ['concept', 'practice', 'mastery']
const kStage = (id: string, i: number): Stage => ({
  id,
  kind: KINDS[i],
  title: `Title of ${id}`,
  description: 'A paragraph a five-year-old cannot read.',
  gameId: 'listenPlay',
  providerConfig: { kind: 'multiplication', factorMin: 1, factorMax: 2 },
  starsToEarn: 3,
})
const original = new Map(curriculum.zones.map((z) => [z, z.stagesByBand]))
function setPilot(on: boolean) {
  for (const z of curriculum.zones) delete z.stagesByBand
  if (on) for (const [zoneId, ids] of Object.entries(PILOT)) getZone(zoneId)!.stagesByBand = { k1: ids.map(kStage) }
}
afterAll(() => {
  for (const [z, sets] of original) if (sets) z.stagesByBand = sets
})

let container: HTMLDivElement
let root: Root
/** The router's current path (written by <Where /> after each render). */
const at = { path: '' }
function Where() {
  const { pathname } = useLocation()
  useEffect(() => {
    at.path = pathname
  })
  return null
}
function render(url: string, el: React.ReactNode, routePath = '*') {
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
/** The voice line ids the guide is saying in its current run. */
const lines = () => getGuideSnapshot().run?.lines.map((l) => (l.voice && 'line' in l.voice ? l.voice.line : null)) ?? []
const targets = () => getGuideSnapshot().run?.lines.flatMap((l) => l.marks.map((m) => m.target)) ?? []
/** Every caption the guide has said since `spy` started. */
let said: string[] = []
let poll: ReturnType<typeof setInterval> | undefined

function player(grade: GradeLevel, extra: Record<string, unknown> = {}) {
  useProgress.getState().resetPlayer()
  useProgress.setState({ player: { emoji: '🦊', color: '#fb923c', name: 'Zoe', grade }, ownedCreatures: ['fox'], activeCreature: 'fox', ...extra })
}

beforeEach(() => {
  vi.useFakeTimers()
  resetGuideForTests()
  localStorage.clear()
  setPilot(true)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  said = []
  // collect what the narrator says (the guide's captions), to check the name never comes up
  poll = setInterval(() => {
    const s = getGuideSnapshot()
    const t = s.run?.lines[s.line]?.text
    if (t && said[said.length - 1] !== t) said.push(t)
  }, 20)
})

afterEach(() => {
  act(() => root.unmount())
  clearInterval(poll)
  container.remove()
  resetGuideForTests()
  useWorldUi.setState({ activeNpc: null, panel: null })
  vi.useRealTimers()
})

// ── onboarding ──────────────────────────────────────────────────────────────

describe('AvatarCreate', () => {
  beforeEach(() => useProgress.getState().resetPlayer())
  // (by attribute, not a CSS selector: jsdom's selectors trip on emoji)
  const radio = (label: string) => qa('[role="radio"]').find((e) => e.getAttribute('aria-label') === label) ?? null
  const begin = () => byText('button', 'Begin adventure')

  it('K: the voice walks through animal → color → Begin; the name is optional and defaults to the animal', async () => {
    render('/avatar', <AvatarCreate />, '/avatar')
    expect(lines()).toEqual([])
    click(radio('Kindergarten'))
    expect(lines()).toEqual(['k-nav/pickAnimal'])
    expect(targets()).toEqual(['avatar-animals'])
    expect(q('[data-guide="say-again"]')).not.toBeNull()
    // the name is now for grown-ups, and optional
    expect(container.textContent).toContain('grown-ups, if you like')
    expect(q<HTMLInputElement>('#explorer-name')!.placeholder).toBe('Fox')

    click(radio('Character 🐼'))
    expect(lines()).toEqual(['k-nav/animal-panda'])
    await tick(3000)
    expect(lines()).toEqual(['k-nav/pickColor'])
    expect(targets()).toEqual(['avatar-colors'])

    click(radio('Sky'))
    expect(lines()).toEqual(['k-nav/color-blue'])
    await tick(3000)
    expect(lines()).toEqual(['k-nav/tapBegin'])
    expect(targets()).toEqual(['avatar-begin'])
    expect(q('[data-guide="avatar-begin"]')).toBe(begin())

    click(begin())
    expect(useProgress.getState().player).toMatchObject({ emoji: '🐼', color: '#38bdf8', name: 'Panda', grade: 0 })
    expect(at.path).toBe('/world')
  })

  it('K: a name a grown-up types is kept, and the voice never says it', async () => {
    render('/avatar', <AvatarCreate />, '/avatar')
    click(radio('1st grade'))
    const input = q<HTMLInputElement>('#explorer-name')!
    act(() => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      set.call(input, 'Zoe')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    click(radio('Character 🦁'))
    await tick(3000)
    click(radio('Berry'))
    await tick(3000)
    click(begin())
    expect(useProgress.getState().player).toMatchObject({ name: 'Zoe', grade: 1, emoji: '🦁' })
    expect(said.length).toBeGreaterThan(3)
    for (const t of said) expect(t).not.toMatch(/zoe/i)
  })

  it('grades 2–5 as before: no voice, and Begin needs a typed name', async () => {
    render('/avatar', <AvatarCreate />, '/avatar')
    click(radio('3rd grade'))
    click(radio('Character 🐼'))
    await tick(1500)
    expect(getGuideSnapshot().run).toBeNull()
    expect(q('[data-guide="say-again"]')).toBeNull()
    expect(container.textContent).toContain("What's your name?")
    expect(q<HTMLInputElement>('#explorer-name')!.placeholder).toBe('Type your name')
    click(begin())
    expect(useProgress.getState().player).toBeNull()
    expect(container.textContent).toContain('Type your name first to begin!')
    await tick(800)
  })
})

// ── zone page ───────────────────────────────────────────────────────────────

describe('ZoneDetail', () => {
  it('K: three picture buttons with stars, no paragraphs; the welcome points at the next stage', async () => {
    player(0, { zones: { 'multiplication-mesa': { zoneId: 'multiplication-mesa', stages: { 'k-count-1': { stageId: 'k-count-1', stars: 2, bestScore: 1, attempts: 1 } } } }, petsSeen: { lion: 'baby' } })
    render('/zone/multiplication-mesa', <ZoneDetail />, '/zone/:zoneId')
    expect(qa('[data-stage]').map((b) => b.dataset.stage)).toEqual(PILOT['multiplication-mesa'])
    expect(container.textContent).toContain('Counting Mesa')
    expect(container.textContent).not.toContain('A paragraph')
    expect(container.textContent).not.toContain(getZone('multiplication-mesa')!.description)
    expect(container.textContent).not.toContain('Step 1')
    expect(lines()).toEqual(['k-nav/welcome-multiplication-mesa'])
    expect(targets()).toEqual(['stage-k-count-parade'])
    // the third is locked: it says "Play this one first!" and points at the next one
    const third = q('[data-stage="k-count-3"]')!
    expect(third.hasAttribute('data-locked')).toBe(true)
    click(third)
    expect(lines()).toEqual(['k-nav/playThisFirst'])
    expect(targets()).toEqual(['stage-k-count-parade'])
    expect(at.path).toBe('/zone/multiplication-mesa')
    // a tap says the title, then the stage starts
    click(q('[data-stage="k-count-1"]'))
    expect(lines()).toEqual(['k-nav/stage-k-count-1'])
    expect(at.path).toBe('/zone/multiplication-mesa')
    await tick(3000)
    expect(at.path).toBe('/play/multiplication-mesa/k-count-1')
  })

  it('K: a zone with no K–1 set is still sleeping: nothing to enter, and the voice says so', () => {
    player(0)
    render('/zone/division-dunes', <ZoneDetail />, '/zone/:zoneId')
    expect(q('[data-sleeping]')).not.toBeNull()
    expect(qa('[data-stage]')).toHaveLength(0)
    expect(qa('button').filter((b) => /Play|Battle/.test(b.textContent ?? ''))).toHaveLength(0)
    expect(lines()).toEqual(['k-nav/sleeping'])
  })

  it('grade 3 as before: the steps with their words and Play buttons', () => {
    player(3)
    render('/zone/multiplication-mesa', <ZoneDetail />, '/zone/:zoneId')
    const zone = getZone('multiplication-mesa')!
    expect(container.textContent).toContain(zone.title)
    expect(container.textContent).toContain(zone.description)
    expect(container.textContent).toContain('Step 1')
    expect(byText('button', '▶ Play')).not.toBeNull()
    expect(qa('[data-stage]')).toHaveLength(0)
    expect(q('[data-guide="say-again"]')).toBeNull()
    expect(getGuideSnapshot().run).toBeNull()
  })
})

// ── map ─────────────────────────────────────────────────────────────────────

describe('WorldMap', () => {
  it('K: open places stand out, sleeping ones doze; a tap says the name (and goes) or that it sleeps', async () => {
    player(0)
    render('/map', <WorldMap />, '/map')
    expect(q('[data-listen-map]')).not.toBeNull()
    expect(qa('[data-guide^="map-"][data-sleeping]')).toHaveLength(9)
    expect(qa('[data-guide^="map-"]:not([data-sleeping])').map((b) => b.dataset.guide).sort()).toEqual(Object.keys(PILOT).map((id) => `map-${id}`).sort())
    expect(container.textContent).not.toContain('Continue your quest')
    await tick(500)
    expect(lines()).toEqual(['k-nav/mapHelp'])
    expect(targets()).toEqual(['map-multiplication-mesa'])

    click(q('[data-guide="map-division-dunes"]'))
    expect(lines()).toEqual(['k-nav/sleeping'])
    await tick(4000)
    expect(at.path).toBe('/map')

    click(q('[data-guide="map-reading-reef"]'))
    expect(lines()).toEqual(['k-nav/name-reading-reef'])
    await tick(2000)
    expect(at.path).toBe('/zone/reading-reef')
  })

  it('grade 3 as before: every place a link, the quick links, no voice', async () => {
    player(3)
    render('/map', <WorldMap />, '/map')
    expect(q('[data-listen-map]')).toBeNull()
    expect(qa('[data-guide^="map-"]')).toHaveLength(0)
    expect(container.textContent).toContain('Continue your quest')
    expect(container.textContent).toContain('Tap a place on the island to start a quest')
    expect(qa('a[href^="/zone/"]').length).toBeGreaterThanOrEqual(12)
    await tick(1000)
    expect(getGuideSnapshot().run).toBeNull()
  })
})

// ── World HUD and panel ─────────────────────────────────────────────────────

describe('World HUD', () => {
  const posRef = createRef<Vector3>() as React.RefObject<Vector3>
  ;(posRef as { current: Vector3 }).current = new Vector3(0, 0, 0)
  const near = (zoneId: string, label: string, hub?: 'schoolhouse' | 'library') =>
    act(() => useWorldUi.getState().setActiveNpc({ areaId: hub ?? zoneId, zoneId, hub, label }))

  it('K: icon buttons, the first-visit tour (map, pets, home), once', async () => {
    player(0)
    render('/world', <WorldHud posRef={posRef} />, '/world')
    expect(q('[data-listen-hud]')).not.toBeNull()
    for (const id of ['hud-map', 'hud-pets', 'hud-home', 'say-again']) expect(q(`[data-guide="${id}"]`), id).not.toBeNull()
    expect(container.textContent).not.toContain('Tap or hold to walk')
    await tick(1400)
    expect(lines()).toEqual(['k-nav/worldHello', 'k-nav/tourMap', 'k-nav/tourPets', 'k-nav/tourHome', 'k-nav/tourWalk'])
    expect(targets()).toEqual(['hud-map', 'hud-pets', 'hud-home'])
    expect(useProgress.getState().toursSeen).toEqual(['world'])
  })

  it('K: walking up to an open gateway says its welcome; its star opens the picture panel', async () => {
    player(0, { toursSeen: ['world'] })
    render('/world', <WorldHud posRef={posRef} />, '/world')
    near('multiplication-mesa', 'Multiplication Mesa')
    expect(lines()).toEqual(['k-nav/welcome-multiplication-mesa'])
    expect(targets()).toEqual(['world-visit'])
    const star = q('[data-guide="world-visit"]')!
    expect(star.hasAttribute('data-sleeping')).toBe(false)
    click(star)
    expect(useWorldUi.getState().panel?.zoneId).toBe('multiplication-mesa')
    expect(q('[data-listen-panel]')).not.toBeNull()
    expect(qa('[data-stage]').map((b) => b.dataset.stage)).toEqual(PILOT['multiplication-mesa'])
    expect(lines()).toEqual(['k-nav/welcome-multiplication-mesa'])
    expect(targets()).toEqual(['stage-k-count-1'])
    expect(container.textContent).not.toContain(getZone('multiplication-mesa')!.description)
  })

  it('K: the Schoolhouse offers the K–1 lessons as pictures', () => {
    player(0, { toursSeen: ['world'] })
    render('/world', <WorldHud posRef={posRef} />, '/world')
    near('', 'Schoolhouse', 'schoolhouse')
    expect(lines()).toEqual(['k-nav/lessonTime'])
    click(q('[data-guide="world-visit"]'))
    expect(qa('[data-guide^="lesson-"]').map((b) => b.dataset.guide)).toEqual([
      'lesson-kCounting',
      'lesson-kShapes',
      'lesson-kLetters',
      'lesson-kRhymes',
      'lesson-kTracing',
      // (K complete, phase 2a)
      'lesson-kAddTake',
      'lesson-kStoryMath',
      'lesson-kCompare',
      'lesson-kTeens',
      'lesson-kMeasure',
      'lesson-kSorting',
      'lesson-kScience',
      'lesson-kTowers',
    ])
    expect(lines()).toEqual(['k-lessons/pickLesson'])
    click(q('[data-guide="lesson-kShapes"]'))
    expect(at.path).toBe('/tutor/kShapes')
  })

  it('K: a sleeping gateway says so and never opens', () => {
    player(0, { toursSeen: ['world'] })
    render('/world', <WorldHud posRef={posRef} />, '/world')
    near('division-dunes', 'Division Dunes')
    expect(lines()).toEqual(['k-nav/sleeping'])
    const zzz = q('[data-guide="world-visit"]')!
    expect(zzz.hasAttribute('data-sleeping')).toBe(true)
    click(zzz)
    expect(useWorldUi.getState().panel).toBeNull()
    expect(lines()).toEqual(['k-nav/sleeping'])
    // the keyboard's E can't get in either
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' })))
    expect(useWorldUi.getState().panel).toBeNull()
  })

  it('grade 3 as before: the word buttons, "Tap to visit", the reading panel; no voice', async () => {
    player(3)
    render('/world', <WorldHud posRef={posRef} />, '/world')
    expect(q('[data-listen-hud]')).toBeNull()
    expect(byText('a', 'Map')).not.toBeNull()
    expect(byText('a', 'Pets')).not.toBeNull()
    expect(container.textContent).toContain('Tap or hold to walk')
    near('division-dunes', 'Division Dunes')
    expect(byText('button', 'Tap to visit Division Dunes')).not.toBeNull()
    click(byText('button', 'Tap to visit'))
    expect(useWorldUi.getState().panel?.zoneId).toBe('division-dunes')
    expect(container.textContent).toContain(getZone('division-dunes')!.description)
    expect(byText('button', 'More about this zone')).not.toBeNull()
    await tick(2000)
    expect(getGuideSnapshot().run).toBeNull()
    expect(useProgress.getState().toursSeen).toEqual([])
  })
})

// ── Quit? ───────────────────────────────────────────────────────────────────

describe('ListenQuitDialog', () => {
  it('asks out loud; ↺ keeps playing, ✓ leaves', async () => {
    const leave = vi.fn()
    const stay = vi.fn()
    render('/play/x/y', <ListenQuitDialog open onLeave={leave} onStay={stay} />, '/play/x/y')
    await tick(400)
    expect(lines()).toEqual(['k-nav/quitAsk'])
    expect(targets()).toEqual([['quit-stay', 'quit-leave']])
    const dialog = document.querySelector('[data-listen-quit]')!
    expect(dialog.textContent?.trim()).toBe('🚪') // nothing to read
    click(document.querySelector('[data-guide="quit-stay"]'))
    expect(stay).toHaveBeenCalledTimes(1)
    click(document.querySelector('[data-guide="quit-leave"]'))
    expect(leave).toHaveBeenCalledTimes(1)
  })
})

// ── 1st grade (phase 2b): Tens Plateau, Fair Share Falls, Shape Grove ──────

describe('ZoneDetail, 1st grade (phase 2b)', () => {
  /** Put a zone's real stage sets back (the pilot stand-ins replace them before each test). */
  const real = (zoneId: string) => {
    const z = getZone(zoneId)!
    z.stagesByBand = original.get(z)
  }

  it('Tens Plateau, Fair Share Falls and Shape Grove: their 1st-grade picture buttons, name and welcome; no paragraphs', () => {
    for (const [zoneId, title, welcome, ids] of [
      ['place-value-plateau', 'Tens Plateau', 'k-nav/welcome-g1-place-value-plateau', ['g1-tens-1', 'g1-tens-2', 'g1-tens-3']],
      ['fraction-falls', 'Fair Share Falls', 'k-nav/welcome-g1-fraction-falls', ['g1-shares-1', 'g1-shares-2', 'g1-shares-3']],
      ['geometry-grove', 'Shape Grove', 'k-nav/welcome-geometry-grove', ['g1-shapes-1', 'g1-shapes-2', 'g1-shapes-3']],
    ] as const) {
      real(zoneId)
      player(1)
      resetGuideForTests()
      render(`/zone/${zoneId}`, <ZoneDetail />, '/zone/:zoneId')
      expect(qa('[data-stage]').map((b) => b.dataset.stage), zoneId).toEqual(ids)
      expect(container.textContent).toContain(title)
      expect(container.textContent).not.toContain(getZone(zoneId)!.description)
      expect(lines(), zoneId).toEqual([welcome])
      expect(targets(), zoneId).toEqual([`stage-${ids[0]}`])
      // the second and third wait for the one before
      expect(qa('[data-stage][data-locked]').map((b) => b.dataset.stage)).toEqual(ids.slice(1))
      act(() => root.render(<></>))
    }
  })

  it('kindergarten still sees Ten Frame Plateau and Add-and-Take Falls there', () => {
    for (const [zoneId, title, first] of [
      ['place-value-plateau', 'Ten Frame Plateau', 'k-teens-1'],
      ['fraction-falls', 'Add-and-Take Falls', 'k-addsub-1'],
    ] as const) {
      real(zoneId)
      player(0)
      resetGuideForTests()
      render(`/zone/${zoneId}`, <ZoneDetail />, '/zone/:zoneId')
      expect(qa('[data-stage]')[0].dataset.stage).toBe(first)
      expect(container.textContent).toContain(title)
      expect(lines()).toEqual([`k-nav/welcome-${zoneId}`])
      act(() => root.render(<></>))
    }
  })
})

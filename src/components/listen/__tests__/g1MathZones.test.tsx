import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ZoneDetail from '../../../screens/ZoneDetail'
import { getZone, zoneStages, zoneTitle } from '../../../curriculum'
import { useProgress } from '../../../store/progress'
import { getGuideSnapshot, resetGuideForTests } from '../../../guide/store'
import { stagePicture, stageVoice } from '../../../lib/listenNav'
import { voiceText } from '../../../voice/registry'
import { expectTextBudget } from '../../../test/textBudget'

/*
 * 1st grade (phase 2b): the zone pages of Adding Mesa, Take-Away Dunes and
 * Story Woods for a 1st grader. The zone's 1st-grade name is the only text;
 * three picture buttons, each said aloud; the welcome names the zone.
 */

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root
const qa = (sel: string) => [...container.querySelectorAll<HTMLElement>(sel)]

beforeEach(() => {
  vi.useFakeTimers()
  resetGuideForTests()
  localStorage.clear()
  useProgress.getState().resetPlayer()
  useProgress.setState({ player: { emoji: '🦁', color: '#fb923c', name: 'Lion', grade: 1 }, ownedCreatures: ['fox'], activeCreature: 'fox' })
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

const ZONES = [
  { id: 'multiplication-mesa', title: 'Adding Mesa', welcome: 'k-nav/welcome-g1-multiplication-mesa', stages: ['g1-add-1', 'g1-add-parade', 'g1-add-3'], said: ['Count on!', 'Critter Parade!', 'Doubles and tens!'] },
  { id: 'division-dunes', title: 'Take-Away Dunes', welcome: 'k-nav/welcome-g1-division-dunes', stages: ['g1-sub-1', 'g1-sub-parade', 'g1-sub-3'], said: ['Take away!', 'Critter Parade!', 'Think addition!'] },
  // (Story Woods keeps its name: the kindergarten welcome)
  { id: 'word-problem-woods', title: 'Story Woods', welcome: 'k-nav/welcome-word-problem-woods', stages: ['g1-woods-1', 'g1-woods-2', 'g1-woods-3'], said: ['Bigger stories!', 'Mystery numbers!', 'Story puzzles!'] },
]

describe('1st grade: Adding Mesa, Take-Away Dunes and Story Woods zone pages', () => {
  for (const z of ZONES) {
    it(`${z.title}: its name, three picture buttons said aloud, the welcome, nothing else to read`, () => {
      const zone = getZone(z.id)!
      expect(zoneTitle(zone, 1)).toBe(z.title)
      const set = zoneStages(zone, 1)
      expect(set.map((s) => s.id)).toEqual(z.stages)
      expect(set.map((s) => voiceText(stageVoice(s.id)!))).toEqual(z.said)
      // each its own picture (the parade keeps the paw), never the generic ones
      for (const s of set) expect(stagePicture(s), s.id).not.toMatch(/^[💡⚡🏆⭐]$/u)
      expect(new Set(set.map((s) => stagePicture(s))).size).toBe(3)

      act(() =>
        root.render(
          <MemoryRouter initialEntries={[`/zone/${z.id}`]}>
            <Routes>
              <Route path="/zone/:zoneId" element={<ZoneDetail />} />
            </Routes>
          </MemoryRouter>,
        ),
      )
      act(() => vi.advanceTimersByTime(800))
      expect(container.querySelector('h1')!.textContent!.trim()).toBe(z.title)
      expect(qa('[data-stage]').map((b) => b.dataset.stage)).toEqual(z.stages)
      // the first is open; the other two wait for a star on the one before
      expect(qa('[data-stage]').map((b) => b.hasAttribute('data-locked'))).toEqual([false, true, true])
      const said = getGuideSnapshot().run?.lines.map((l) => (l.voice && 'line' in l.voice ? l.voice.line : '')) ?? []
      expect(said).toContain(z.welcome)
      expect(voiceText({ line: z.welcome })).toBe(`${z.title}! Tap a star to play!`)
      const page = container.cloneNode(true) as HTMLElement
      page.querySelectorAll('h1').forEach((h) => h.remove())
      expectTextBudget(page, 0)
    })
  }
})

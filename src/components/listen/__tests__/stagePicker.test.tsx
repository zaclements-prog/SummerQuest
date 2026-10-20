import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ZoneDetail from '../../../screens/ZoneDetail'
import { ListenStagePicker } from '../ListenStagePicker'
import { getZone, zoneStages, type Stage, type Zone } from '../../../curriculum'
import { useProgress } from '../../../store/progress'
import { getGuideSnapshot, resetGuideForTests } from '../../../guide/store'
import { stagePickerColumns, stagePicture, stageVoice } from '../../../lib/listenNav'
import { voiceText } from '../../../voice/registry'
import { expectTextBudget } from '../../../test/textBudget'

/*
 * Letter Reef's eight K stages on the stage picker (the K zone page and the
 * World panel share it), and any count from three to eight: even rows, every
 * button a picture with its stars and its title said aloud.
 */

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root
const qa = (sel: string) => [...container.querySelectorAll<HTMLElement>(sel)]

function player(grade: 0 | 3, stars: Record<string, number> = {}) {
  useProgress.getState().resetPlayer()
  useProgress.setState({
    player: { emoji: '🦊', color: '#fb923c', name: 'Zoe', grade },
    ownedCreatures: ['fox'],
    activeCreature: 'fox',
    petsSeen: { octopus: 'adult' },
    zones: { 'reading-reef': { zoneId: 'reading-reef', stages: Object.fromEntries(Object.entries(stars).map(([id, n]) => [id, { stageId: id, stars: n, bestScore: 1, attempts: 1 }])) } },
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  resetGuideForTests()
  localStorage.clear()
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

const REEF = ['k-letters-1', 'k-rhyme-1', 'k-letters-2', 'k-syllables-1', 'k-letters-3', 'k-rhyme-2', 'k-blend-1', 'k-sight-1']

describe('Letter Reef’s eight K stages', () => {
  it('each has its own picture and a title said aloud (k-nav)', () => {
    const set = zoneStages(getZone('reading-reef')!, 0)
    expect(set.map((s) => s.id)).toEqual(REEF)
    const pics = set.map((s) => stagePicture(s))
    for (const [i, p] of pics.entries()) expect(p, set[i].id).not.toMatch(/^[💡⚡🏆⭐]$/u)
    expect(new Set(pics).size).toBe(8)
    expect(set.map((s) => voiceText(stageVoice(s.id)!))).toEqual([
      'Find the letter!',
      'Rhyme time!',
      'Big and little letters!',
      'Clap the parts!',
      'First sounds!',
      'Finish the rhyme!',
      'Sound it out!',
      'Word hunt!',
    ])
  })

  it('the K zone page: eight picture buttons in two rows of four, ⭐ n/24, no paragraphs', () => {
    player(0, { 'k-letters-1': 3, 'k-rhyme-1': 2, 'k-letters-2': 1 })
    act(() =>
      root.render(
        <MemoryRouter initialEntries={['/zone/reading-reef']}>
          <Routes>
            <Route path="/zone/:zoneId" element={<ZoneDetail />} />
          </Routes>
        </MemoryRouter>,
      ),
    )
    expect(qa('[data-stage]').map((b) => b.dataset.stage)).toEqual(REEF)
    expect(container.querySelector('[data-cols]')!.getAttribute('data-cols')).toBe('4')
    expect(container.querySelector('[aria-label="6 of 24 stars"]')).not.toBeNull()
    // the first four are open (each after a star on the one before), the rest wait
    expect(qa('[data-stage]').map((b) => b.hasAttribute('data-locked'))).toEqual([false, false, false, false, true, true, true, true])
    // the hand points at the next stage to play: Clap the parts
    expect(getGuideSnapshot().run?.lines[0].marks.map((m) => m.target)).toEqual(['stage-k-syllables-1'])
    // the zone's name is the only text ("Letter Reef"): no paragraphs, no stage titles
    expect(container.textContent).not.toContain(getZone('reading-reef')!.description)
    const page = container.cloneNode(true) as HTMLElement
    page.querySelectorAll('h1').forEach((h) => h.remove())
    expectTextBudget(page, 0)
  })
})

describe('the stage picker for any count from three to eight', () => {
  const zoneWith = (n: number): Zone => {
    const base = getZone('reading-reef')!
    const stages: Stage[] = Array.from({ length: n }, (_, i) => ({ ...zoneStages(base, 0)[i], id: `t-${n}-${i}` }))
    return { ...base, id: `test-${n}`, stagesByBand: { k1: stages } }
  }

  it('rows come out even: one row up to four, then rows of three (5, 6) or four (7, 8)', () => {
    expect([3, 4, 5, 6, 7, 8].map(stagePickerColumns)).toEqual([3, 4, 3, 3, 4, 4])
    expect(stagePickerColumns(1)).toBe(1)
  })

  it('more than three share the row evenly (never under 64 px); three keep the pilot’s look', () => {
    player(0)
    for (const n of [3, 4, 5, 6, 7, 8]) {
      for (const size of ['md', 'lg'] as const) {
        act(() => root.render(<ListenStagePicker zone={zoneWith(n)} onPlay={() => {}} size={size} />))
        const group = container.querySelector<HTMLElement>('[role="group"]')!
        const buttons = qa('[data-stage]')
        expect(buttons, `${n} ${size}`).toHaveLength(n)
        expect(group.dataset.cols).toBe(String(stagePickerColumns(n)))
        if (n > 3) {
          expect(group.style.getPropertyValue('--cols')).toBe(String(stagePickerColumns(n)))
          expect(group.className).toContain('flex-wrap')
          for (const b of buttons) expect(b.className, `${n} ${size}`).toContain('min-w-16')
        } else {
          expect(group.className).not.toContain('flex-wrap')
          for (const b of buttons) expect(b.className).toMatch(size === 'lg' ? /min-w-\[7\.5rem\]/ : /min-w-24/)
        }
        // every button: a picture and three stars, nothing to read
        for (const b of buttons) expect(b.querySelectorAll('svg').length, `${n}`).toBeGreaterThanOrEqual(3)
        expectTextBudget(container, 0)
      }
    }
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { getGuideSnapshot, resetGuideForTests, subscribeGuide } from '../../../guide/store'
import { useProgress } from '../../../store/progress'
import { usePetUi } from '../../../lib/pets/usePetUi'
import { PETS } from '../../../lib/pets/catalog'
import { getZone } from '../../../curriculum'
import { lineText } from '../../../voice/registry'
import type { GradeLevel } from '../../../lib/gradeTiers'
import { useListenSay } from '../useListenSay'

// the 3D bits (three.js) stay out of jsdom: the pet appears at once
vi.mock('../../../platform/gl/GLCanvas', () => ({ default: () => null }))
vi.mock('../../../pets/PetLineup', () => ({ default: () => null, LINEUP_SLOT_SHARE: 0.3 }))
vi.mock('framer-motion', async (orig) => ({ ...(await orig<typeof import('framer-motion')>()), useReducedMotion: () => true }))

import PetMomentCard from '../../../pets/PetMomentCard'
import PetMoments from '../../../pets/PetMoments'
import PetsScreen from '../../../screens/PetsScreen'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/**
 * The K–1 reward moments are said out loud (listen mode only): the badge
 * card, a hatch ("It's a baby lion!"), the "Your pets grew!" summary, and
 * the pet card's picture buttons say where they go before going.
 */

let container: HTMLDivElement
let root: Root
let said: string[]
let unsub: () => void

const setGrade = (grade: GradeLevel) => useProgress.setState({ player: { emoji: '🦊', color: '#f97316', name: 'Kit', grade } })
const tick = (ms: number) => act(() => vi.advanceTimersByTime(ms))

beforeEach(() => {
  vi.useFakeTimers()
  resetGuideForTests()
  useProgress.getState().resetPlayer()
  usePetUi.setState({ lessonCompleteOpen: false, momentOpen: false })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  said = []
  let serial = -1
  unsub = subscribeGuide(() => {
    const s = getGuideSnapshot()
    if (s.run && s.lineSerial !== serial) {
      serial = s.lineSerial
      const t = s.run.lines[s.line].text
      if (t) said.push(t)
    }
  })
})

afterEach(() => {
  unsub()
  act(() => root.unmount())
  container.remove()
  resetGuideForTests()
  vi.useRealTimers()
})

function Card({ open }: { open: boolean }) {
  useListenSay(open, { line: 'k-nav/newBadge' })
  return null
}

describe('reward moments, said out loud for K–1', () => {
  it('useListenSay: says its line when the card opens, in listen mode only', () => {
    setGrade(0)
    act(() => root.render(<Card open={false} />))
    expect(said).toEqual([])
    act(() => root.render(<Card open />))
    expect(said).toEqual(['You got a new badge!'])
    act(() => root.render(<Card open={false} />))
    setGrade(3)
    act(() => root.render(<Card open />))
    expect(said).toEqual(['You got a new badge!'])
  })

  it('every pet has its "It\'s a baby …!" line', () => {
    for (const p of PETS) expect(lineText(`k-nav/baby-${p.creatureId}`), p.creatureId).toMatch(/^It's a baby .+!$/)
  })

  it('a hatch: "Your egg hatched!" then what came out ("It\'s a baby lion!")', () => {
    setGrade(0)
    act(() => root.render(<PetMomentCard moment={{ creatureId: 'lion', from: 'egg', to: 'baby' }} onDone={() => {}} onBecome={() => {}} />))
    tick(4000)
    expect(said.slice(0, 2)).toEqual(['Your egg hatched!', "It's a baby lion!"])
  })

  it('the "Your pets grew!" summary is said for K–1, and silent for grade 3', () => {
    for (const grade of [0, 3] as GradeLevel[]) {
      said.length = 0
      useProgress.getState().resetPlayer()
      setGrade(grade)
      for (const zoneId of ['multiplication-mesa', 'fraction-falls', 'reading-reef', 'data-delta']) useProgress.getState().awardStage(zoneId, getZone(zoneId)!.stages[0].id, 1, 5)
      act(() =>
        root.render(
          <MemoryRouter key={grade} initialEntries={['/map']}>
            <PetMoments />
          </MemoryRouter>,
        ),
      )
      tick(1500)
      expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Your pets grew!')
      expect(said.includes('Look! Your pets grew!')).toBe(grade === 0)
      act(() => root.render(<></>))
    }
  })

  it("the pet card's place button says where it goes, then goes", async () => {
    setGrade(0)
    // the lion's place has stars (its egg hatched), so its button is there
    useProgress.getState().awardStage('multiplication-mesa', 'k-count-1', 1, 5)
    act(() =>
      root.render(
        <MemoryRouter initialEntries={['/pets?pet=lion']}>
          <Routes>
            <Route path="/pets" element={<PetsScreen />} />
            <Route path="/zone/:zoneId" element={<div data-zone-page="" />} />
          </Routes>
        </MemoryRouter>,
      ),
    )
    tick(100)
    said.length = 0
    const go = container.querySelector<HTMLButtonElement>('button[aria-label^="Go to"]')!
    act(() => go.click())
    tick(100)
    expect(said).toEqual(["Let's go!"])
    expect(container.querySelector('[data-zone-page]')).toBeNull()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000)
    })
    expect(said.slice(0, 2), said.join(' | ')).toEqual(["Let's go!", 'Counting Mesa!'])
    expect(container.querySelector('[data-zone-page]')).not.toBeNull()
  })
})

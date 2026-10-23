import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import PetMoments from '../PetMoments'
import { useProgress } from '../../store/progress'
import { usePetUi } from '../../lib/pets/usePetUi'
import { getZone } from '../../curriculum'

// React's act() warns unless this flag is set in non-RTL environments.
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

function render(path: string) {
  act(() =>
    root.render(
      <MemoryRouter key={path} initialEntries={[path]}>
        <PetMoments />
      </MemoryRouter>,
    ),
  )
}
const tick = (ms: number) => act(() => vi.advanceTimersByTime(ms))
const dialog = () => document.querySelector('[role="dialog"]')

/** Stars in four zones: four pets hatch (more than three → one summary card). */
function hatchFour() {
  for (const zoneId of ['multiplication-mesa', 'fraction-falls', 'reading-reef', 'data-delta']) {
    useProgress.getState().awardStage(zoneId, getZone(zoneId)!.stages[0].id, 1, 5)
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  useProgress.getState().resetPlayer()
  useProgress.setState({ player: { emoji: '🦊', color: '#fb923c', name: 'Sam', grade: 3 }, ownedCreatures: ['fox'], activeCreature: 'fox' })
  usePetUi.setState({ lessonCompleteOpen: false, momentOpen: false })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.useRealTimers()
})

describe('PetMoments', () => {
  it('waits for a calm screen: never mid-game', () => {
    hatchFour()
    render('/play/fraction-falls/frac-concept')
    tick(5000)
    expect(dialog()).toBeNull()
    expect(usePetUi.getState().momentOpen).toBe(false)
  })

  it('more than three waiting: one summary card, and dismissing marks them all seen', () => {
    hatchFour()
    render('/map')
    tick(400)
    expect(dialog()).toBeNull() // lets the screen settle first
    tick(1000)
    expect(dialog()?.getAttribute('aria-label')).toBe('Your pets grew!')
    expect(container.textContent).toContain('4 pets hatched or grew')
    expect(usePetUi.getState().momentOpen).toBe(true)
    const yay = [...container.querySelectorAll('button')].find((b) => b.textContent?.includes('Yay'))!
    act(() => yay.click())
    expect(useProgress.getState().petsSeen).toMatchObject({ lion: 'baby', frog: 'baby', octopus: 'baby', fox: 'baby' })
    tick(3000)
    expect(dialog()).toBeNull()
    expect(usePetUi.getState().momentOpen).toBe(false)
  })

  it('waits for another dialog (a zone celebration) to close first', () => {
    hatchFour()
    const other = document.createElement('div')
    other.setAttribute('aria-modal', 'true')
    document.body.appendChild(other)
    render('/zone/fraction-falls')
    tick(4000)
    expect(dialog()).toBeNull()
    other.remove()
    tick(700)
    expect(dialog()).not.toBeNull()
  })

  it("in a lesson, only over its complete card", () => {
    hatchFour()
    render('/tutor/fractions')
    tick(4000)
    expect(dialog()).toBeNull()
    act(() => usePetUi.getState().setLessonCompleteOpen(true))
    tick(1000)
    expect(dialog()).toBeNull() // gives the card's own fanfare a moment
    tick(1000)
    expect(dialog()).not.toBeNull()
  })

  it('on a 3D screen, waits until its view is up', () => {
    hatchFour()
    render('/home')
    tick(4000)
    expect(dialog()).toBeNull() // still loading the room
    const main = document.createElement('main')
    main.appendChild(document.createElement('canvas'))
    document.body.appendChild(main)
    tick(700)
    expect(dialog()).not.toBeNull()
    main.remove()
  })

  it('two waiting: one summary card, not one pop-up per screen', () => {
    for (const zoneId of ['multiplication-mesa', 'fraction-falls']) {
      useProgress.getState().awardStage(zoneId, getZone(zoneId)!.stages[0].id, 1, 5)
    }
    render('/zone/fraction-falls')
    tick(1400)
    expect(dialog()?.getAttribute('aria-label')).toBe('Your pets grew!')
    expect(container.textContent).toContain('2 pets hatched or grew')
  })

  it('marked seen as soon as it shows, so a later screen never replays it', () => {
    hatchFour()
    render('/map')
    tick(1400)
    expect(dialog()).not.toBeNull()
    // not dismissed (the child walked off) — but already seen
    expect(useProgress.getState().petsSeen).toMatchObject({ lion: 'baby', frog: 'baby', octopus: 'baby', fox: 'baby' })
    render('/zone/fraction-falls')
    tick(5000)
    expect(dialog()).toBeNull()
  })

  it('never pops up over a screen the child has started using', () => {
    hatchFour()
    render('/zone/fraction-falls')
    tick(300)
    act(() => {
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    })
    tick(5000)
    expect(dialog()).toBeNull()
    expect(useProgress.getState().petsSeen.lion).toBeUndefined() // still waiting for the next screen
  })

  it('closing another dialog first (a badge pop-up) still lets it show', () => {
    hatchFour()
    const other = document.createElement('div')
    other.setAttribute('aria-modal', 'true')
    const ok = document.createElement('button')
    other.appendChild(ok)
    document.body.appendChild(other)
    render('/map')
    tick(2000)
    act(() => {
      ok.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    })
    other.remove()
    tick(1000)
    expect(dialog()).not.toBeNull()
  })

  it('nothing waiting, nothing shown', () => {
    render('/world')
    tick(5000)
    expect(dialog()).toBeNull()
  })
})

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useGuideTimer } from '../CloudKeeperSpheres.guide'

/**
 * Sphere Keeper's hint arrow: each leg of Drip's guided journey schedules an
 * arrow for a hesitating kid. A quick kid used to finish the leg before it
 * fired, and the stale timer then lit the previous leg's sphere during the
 * next leg (or an arrow in Puff's unguided journey). One pending arrow at a
 * time: scheduling or cancelling drops the old one, and so does unmounting.
 */

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root
let api: ReturnType<typeof useGuideTimer<string>>
const shown: string[] = []

function Probe({ onApi }: { onApi: (a: typeof api) => void }) {
  const timer = useGuideTimer<string>((to) => shown.push(to))
  useEffect(() => {
    onApi(timer)
  }, [onApi, timer])
  return null
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  vi.setSystemTime(new Date('2026-07-01T10:00:00'))
  shown.length = 0
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<Probe
        onApi={(a) => {
          api = a
        }}
      />))
})

afterEach(() => {
  act(() => root.unmount())
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('Sphere Keeper guide arrow', () => {
  it('a quick leg: the old leg’s arrow never fires into the next leg', () => {
    api.schedule(3500, 'atmosphere') // leg 2 starts
    vi.advanceTimersByTime(1200) // the kid enters the cloud at once
    api.cancel()
    vi.advanceTimersByTime(1500) // the leg plays out, leg 3 starts
    api.schedule(3500, 'hydrosphere')
    vi.advanceTimersByTime(3000)
    expect(shown).toEqual([]) // before the fix: ['atmosphere'] here, the sphere Drip is already in
    vi.advanceTimersByTime(600)
    expect(shown).toEqual(['hydrosphere'])
  })

  it('scheduling replaces the pending arrow; the last journey leg’s timer does not reach the next journey', () => {
    api.schedule(3500, 'biosphere') // Drip's last leg
    api.cancel() // the station is entered; Puff's journey (unguided) schedules nothing
    vi.advanceTimersByTime(10000)
    expect(shown).toEqual([])
    api.schedule(1300, 'geosphere') // a miss: the arrow after a beat
    api.schedule(500, 'hydrosphere')
    vi.advanceTimersByTime(2000)
    expect(shown).toEqual(['hydrosphere'])
  })

  it('a hesitating kid still gets the arrow; unmounting (Quit, Play again) drops a pending one', () => {
    api.schedule(500, 'atmosphere')
    vi.advanceTimersByTime(500)
    expect(shown).toEqual(['atmosphere'])
    api.schedule(3500, 'geosphere')
    act(() => root.unmount())
    vi.advanceTimersByTime(5000)
    expect(shown).toEqual(['atmosphere'])
    root = createRoot(container) // (afterEach unmounts again)
  })
})

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import CatalogDrawer from '../CatalogDrawer'
import { useProgress } from '../../../store/progress'
import { useHomeUi } from '../../useHomeUi'
import { HOME_ITEMS } from '../../../lib/home/catalog'
import { ACCESSORIES } from '../../../lib/home/accessories'

/** The Decorate shop: every card has a picture, buying takes two taps, and a bought item goes straight to placing. */

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root
const q = (sel: string) => container.querySelector<HTMLButtonElement>(sel)
const click = (el: HTMLElement | null) => act(() => el!.click())

beforeEach(() => {
  useProgress.getState().resetPlayer()
  useProgress.getState().setAvatar({ emoji: '🦊', color: '#f97316', name: 'T', grade: 3 })
  useProgress.setState({ coins: 500, soundEnabled: false })
  useHomeUi.getState().setMode('decorate')
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter><CatalogDrawer onHide={() => {}} /></MemoryRouter>))
})

afterEach(() => {
  act(() => root.unmount())
  document.body.innerHTML = ''
})

describe('the Decorate shop', () => {
  it('every item and outfit has a picture', () => {
    for (const it of [...HOME_ITEMS, ...ACCESSORIES]) expect(it.emoji, it.id).toMatch(/\p{Extended_Pictographic}/u)
  })

  it('a price tap asks first; the second tap buys and starts placing', () => {
    const price = () => q('button[aria-label^="Chair:"]') ?? q('button[aria-label^="Yes, buy the Chair"]')
    click(price())
    expect(useProgress.getState().coins).toBe(500)
    expect(price()!.textContent).toBe('Buy for 100? ✓')
    click(price())
    expect(useProgress.getState().coins).toBe(400)
    expect(useProgress.getState().ownedHomeItems.chair).toBe(1)
    expect(useHomeUi.getState().placingItemId).toBe('chair')
  })

  it('asking on another card moves the question there; nothing is spent', () => {
    click(q('button[aria-label^="Chair:"]'))
    click(q('button[aria-label^="Floor Lamp:"]'))
    expect(q('button[aria-label^="Chair:"]')!.textContent).toContain('100')
    expect(q('button[aria-label^="Yes, buy the Floor Lamp"]')).not.toBeNull()
    expect(useProgress.getState().coins).toBe(500)
  })

  it('an outfit: two taps buy it and put it on', () => {
    click([...container.querySelectorAll<HTMLButtonElement>('button[role=tab]')].find((b) => /Style/.test(b.textContent ?? ''))!)
    click(q('button[aria-label^="Ball Cap:"]'))
    expect(useProgress.getState().ownedAccessories).not.toContain('cap')
    click(q('button[aria-label^="Yes, buy the Ball Cap"]'))
    expect(useProgress.getState().ownedAccessories).toContain('cap')
    expect(useProgress.getState().equippedAccessories.head).toBe('cap')
  })
})

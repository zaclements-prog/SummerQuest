// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import WorldPanel from '../WorldPanel'
import { useProgress } from '../../store/progress'
import { emptySchoolPet } from '../../lib/pets/schoolPet'
import { getGuideSnapshot, resetGuideForTests } from '../../guide/store'
import type { GradeLevel } from '../../lib/gradeTiers'
import { localDayKey } from '../../lib/dates'

/* The Schoolhouse's raven in its in-world panel: the classic card (2–5) and the voice-first pictures (K–1). */

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root
const launched: string[] = []
const NPC = { areaId: 'schoolhouse', label: 'Schoolhouse', hub: 'schoolhouse' as const }

function show(grade: GradeLevel) {
  useProgress.setState({ player: { emoji: '🦊', color: '#f97316', name: 'T', grade } })
  act(() => {
    root.render(
      <MemoryRouter>
        <WorldPanel npc={NPC} onLaunch={(p) => launched.push(p)} onClose={() => {}} />
      </MemoryRouter>,
    )
  })
}

beforeEach(() => {
  localStorage.clear()
  useProgress.getState().resetPlayer()
  resetGuideForTests()
  launched.length = 0
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('the Schoolhouse raven', () => {
  it('2–5: the egg and how to hatch it, then the raven with its progress; 🐾 opens it on the Pets page', () => {
    show(3)
    expect(container.textContent).toContain('Raven egg')
    expect(container.textContent).toContain("Play 3 more 🌟 Daily Challenges, or clear a 🎯 skill on This Week's Focus, to hatch it!")
    act(() => useProgress.setState({ schoolPet: { ...emptySchoolPet(), clears: 1, dailies: 1, hatched: true } }))
    expect(container.textContent).toContain('Baby Raven')
    expect(container.textContent).toContain('3 more 🌟 Daily Challenges or 🎯 cleared skills to grow!')
    const see = [...container.querySelectorAll('button')].find((b) => b.textContent?.includes('See'))!
    act(() => see.click())
    expect(launched).toEqual(['/pets?pet=raven'])
  })

  it('2–5: an emptied list this week says so', () => {
    useProgress.setState({ schoolPet: { ...emptySchoolPet(), rewardDay: localDayKey() } })
    show(3)
    expect(container.textContent).toContain('You cleared everything on your list this week')
  })

  it('K–1: the egg is a picture that says how it hatches', () => {
    show(0)
    const egg = container.querySelector('[data-guide="school-pet"]') as HTMLButtonElement
    expect(egg.getAttribute('aria-label')).toBe('Raven egg')
    act(() => egg.click())
    expect(getGuideSnapshot().run?.lines[0].text).toBe('This is the Schoolhouse egg. Play the daily challenge, or practice the tricky ones, to hatch it!')
  })
})

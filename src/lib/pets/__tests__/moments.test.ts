import { describe, it, expect } from 'vitest'
import { isCalmRoute, nextMomentShow, MAX_QUEUED_MOMENTS } from '../moments'
import type { PetMoment } from '../growth'

describe('calm moments for pet celebrations', () => {
  it('the hub screens are calm', () => {
    for (const p of ['/world', '/map', '/home', '/pets', '/tutor', '/zone/fraction-falls', '/world/']) {
      expect(isCalmRoute(p, false), p).toBe(true)
    }
  })

  it('never mid-game or mid-lesson', () => {
    for (const p of ['/play/fraction-falls/frac-concept', '/daily', '/tutor/fractions', '/', '/avatar', '/parent', '/badges']) {
      expect(isCalmRoute(p, false), p).toBe(false)
    }
  })

  it("a lesson's complete card is calm", () => {
    expect(isCalmRoute('/tutor/fractions', true)).toBe(true)
    // …but the flag means nothing in a game
    expect(isCalmRoute('/play/fraction-falls/frac-concept', true)).toBe(false)
  })
})

describe('queueing celebrations', () => {
  const m = (id: string): PetMoment => ({ creatureId: id, from: 'egg', to: 'baby' })

  it('one waiting: its own celebration', () => {
    expect(nextMomentShow([])).toBeNull()
    expect(nextMomentShow([m('frog')])).toEqual({ kind: 'one', moment: m('frog') })
  })

  it('several waiting become one summary (not one pop-up per screen)', () => {
    expect(MAX_QUEUED_MOMENTS).toBe(1)
    const two = [m('frog'), m('lion')]
    expect(nextMomentShow(two)).toEqual({ kind: 'summary', moments: two })
    const many = ['frog', 'lion', 'owl', 'fox'].map(m)
    expect(nextMomentShow(many)).toEqual({ kind: 'summary', moments: many })
  })
})

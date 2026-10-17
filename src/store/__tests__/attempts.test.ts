import { describe, it, expect, beforeEach } from 'vitest'
import { useProgress } from '../progress'

beforeEach(() => useProgress.getState().resetPlayer())

describe('recordAttempt', () => {
  it('appends an attempt with id + timestamp', () => {
    useProgress.getState().recordAttempt({
      zoneId: 'multiplication-mesa', topic: 'multiplication',
      skillId: 'mult-f6_9', skillLabel: '6–9× facts', correct: false,
    })
    const a = useProgress.getState().attempts
    expect(a).toHaveLength(1)
    expect(a[0].skillId).toBe('mult-f6_9')
    expect(a[0].correct).toBe(false)
    expect(typeof a[0].at).toBe('number')
    expect(a[0].id.length).toBeGreaterThan(0)
  })
  it('caps history at 2000 (keeps newest)', () => {
    // Seed 1995 attempts in one write (recording 2000+ one by one re-serializes the
    // whole persisted store each time — quadratic, and slow on a busy machine),
    // then record across the cap.
    const seeded = Array.from({ length: 1995 }, (_, i) => ({
      id: `seed${i}`, at: i, zoneId: 'z', topic: 't', skillId: `s${i}`, skillLabel: 'x', correct: true,
    }))
    useProgress.setState({ attempts: seeded })
    const rec = useProgress.getState().recordAttempt
    for (let i = 1995; i < 2010; i++)
      rec({ zoneId: 'z', topic: 't', skillId: `s${i}`, skillLabel: 'x', correct: true })
    const a = useProgress.getState().attempts
    expect(a).toHaveLength(2000)
    expect(a[0].skillId).toBe('s10') // the 10 oldest dropped
    expect(a[a.length - 1].skillId).toBe('s2009')
  })
  it('resetPlayer clears attempts', () => {
    useProgress.getState().recordAttempt({ zoneId: 'z', topic: 't', skillId: 's', skillLabel: 'x', correct: true })
    useProgress.getState().resetPlayer()
    expect(useProgress.getState().attempts).toHaveLength(0)
  })
})

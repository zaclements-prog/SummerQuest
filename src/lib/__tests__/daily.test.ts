import { describe, it, expect } from 'vitest'
import { pickTodaysChallenge } from '../daily'
import { localDayKey } from '../dates'

describe('daily challenge pick', () => {
  it('never lands on a writing (no answer options) stage, over a full year', () => {
    const start = new Date(2026, 0, 1)
    const zonesSeen = new Set<string>()
    for (let d = 0; d < 366; d++) {
      const day = localDayKey(new Date(start.getFullYear(), 0, 1 + d))
      const { zone, stage } = pickTodaysChallenge(3, day)
      expect(stage.gameId).not.toBe('writingPad')
      expect(stage.providerConfig.kind).not.toBe('writingPrompt')
      zonesSeen.add(zone.id)
    }
    expect(zonesSeen.has('writing-workshop')).toBe(false)
    expect(zonesSeen.size).toBeGreaterThan(5)
  })

  it('is stable within a day', () => {
    expect(pickTodaysChallenge(3, '2026-10-13')).toEqual(pickTodaysChallenge(3, '2026-10-13'))
  })

  it('K–1 only picks a zone that is open to K–1, and plays its K stage', () => {
    const open = new Set(['multiplication-mesa', 'geometry-grove', 'reading-reef'])
    for (const grade of [0, 1] as const) {
      const zonesSeen = new Set<string>()
      for (let d = 0; d < 120; d++) {
        const { zone, stage } = pickTodaysChallenge(grade, localDayKey(new Date(2026, 0, 1 + d)))
        expect(open.has(zone.id)).toBe(true)
        expect(stage.id).toMatch(/^k-/)
        zonesSeen.add(zone.id)
      }
      expect(zonesSeen.size).toBe(open.size)
    }
  })

  it('grades 2–4 still pick across the whole map', () => {
    const zonesSeen = new Set<string>()
    for (let d = 0; d < 120; d++) {
      const { zone, stage } = pickTodaysChallenge(2, localDayKey(new Date(2026, 0, 1 + d)))
      expect(stage.id).not.toMatch(/^k-/)
      zonesSeen.add(zone.id)
    }
    expect(zonesSeen.size).toBeGreaterThan(5)
  })
})

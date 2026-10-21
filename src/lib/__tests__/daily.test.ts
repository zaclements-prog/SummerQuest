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
    const open = new Set([
      'multiplication-mesa',
      'geometry-grove',
      'reading-reef',
      'writing-workshop',
      // (K complete, phase 2a)
      'division-dunes',
      'place-value-plateau',
    ])
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

  it('K–1: Writing Workshop plays its first stage in the daily (a trace round), never a writing pad', () => {
    for (let d = 0; d < 120; d++) {
      const { zone, stage } = pickTodaysChallenge(0, localDayKey(new Date(2026, 0, 1 + d)))
      if (zone.id === 'writing-workshop') expect(stage.id).toBe('k-trace-1')
      if (zone.id === 'multiplication-mesa') expect(stage.id).toBe('k-count-1')
      // (K complete, phase 2a: each zone's first stage, played through its number activities)
      if (zone.id === 'division-dunes') expect(stage.id).toBe('k-dunes-1')
      if (zone.id === 'place-value-plateau') expect(stage.id).toBe('k-teens-1')
      expect(stage.gameId).toBe('listenPlay')
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

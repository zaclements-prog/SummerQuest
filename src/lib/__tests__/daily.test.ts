import { describe, it, expect } from 'vitest'
import { pickTodaysChallenge } from '../daily'
import { localDayKey } from '../dates'
import { createProvider } from '../providers'
import { effectiveConfigForStage } from '../gradeTiers'
import type { ListenProblem } from '../../games/listenPlay/types'

/** 1st grade's own first stage, by zone (phase-2b contract): what 1st grade plays in the daily there. */
const G1_FIRST: Record<string, string> = {
  // Measure Marsh, Graph Delta, Sky Summit
  'measurement-marsh': 'g1-measure-1',
  'data-delta': 'g1-graphs-1',
  'science-summit': 'g1-science-1',
}

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
      'fraction-falls',
      'word-problem-woods',
      'division-dunes',
      'place-value-plateau',
      'measurement-marsh',
      'data-delta',
      'science-summit',
      'tower-battlefront',
    ])
    for (const grade of [0, 1] as const) {
      const zonesSeen = new Set<string>()
      for (let d = 0; d < 120; d++) {
        const { zone, stage } = pickTodaysChallenge(grade, localDayKey(new Date(2026, 0, 1 + d)))
        expect(open.has(zone.id)).toBe(true)
        // (1st grade plays its own set where a zone has one: G1_FIRST)
        expect(stage.id).toMatch(grade === 1 && G1_FIRST[zone.id] ? /^g1-/ : /^k-/)
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
      // (K complete, phase 2a: the first stage of each, a mathStory round)
      if (zone.id === 'fraction-falls') expect(stage.id).toBe('k-addsub-1')
      if (zone.id === 'word-problem-woods') expect(stage.id).toBe('k-woods-1')
      // (K complete, phase 2a: each zone's first stage, played through its number activities)
      if (zone.id === 'division-dunes') expect(stage.id).toBe('k-dunes-1')
      if (zone.id === 'place-value-plateau') expect(stage.id).toBe('k-teens-1')
      // (Counting Towers' first stage is the tower game; the K daily plays its counting questions in Listen & Play)
      if (zone.id === 'tower-battlefront') expect(stage.id).toBe('k-towers-1')
      else expect(stage.gameId).toBe('listenPlay')
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

  it('K–1: Counting Towers and Nature Summit play picture questions in the daily (Listen & Play)', () => {
    const seen = new Set<string>()
    for (let d = 0; d < 366; d++) {
      const { zone, stage } = pickTodaysChallenge(0, localDayKey(new Date(2026, 0, 1 + d)))
      if (zone.id !== 'tower-battlefront' && zone.id !== 'science-summit') continue
      seen.add(zone.id)
      const q = createProvider(effectiveConfigForStage(stage, 0, 0)).next() as ListenProblem
      expect(q.speech, stage.id).toBeDefined()
      expect(q.pictureOptions?.map((o) => o.value), stage.id).toEqual(q.options)
      expect(q.activity, stage.id).toBeUndefined()
    }
    expect([...seen].sort()).toEqual(['science-summit', 'tower-battlefront'])
  })

  it('1st grade plays its own first stage where a zone has a 1st-grade set, and kindergarten its K one', () => {
    const seen = new Set<string>()
    for (let d = 0; d < 366; d++) {
      const day = localDayKey(new Date(2026, 0, 1 + d))
      const g1 = pickTodaysChallenge(1, day)
      if (G1_FIRST[g1.zone.id]) {
        seen.add(g1.zone.id)
        expect(g1.stage.id).toBe(G1_FIRST[g1.zone.id])
        expect(g1.stage.gameId).toBe('listenPlay')
        const q = createProvider(effectiveConfigForStage(g1.stage, 0, 1)).next() as ListenProblem
        expect(q.speech, g1.stage.id).toBeDefined()
      }
      const k = pickTodaysChallenge(0, day)
      if (G1_FIRST[k.zone.id]) expect(k.stage.id).toMatch(/^k-/)
    }
    expect([...seen].sort()).toEqual(['data-delta', 'measurement-marsh', 'science-summit'])
  })
})

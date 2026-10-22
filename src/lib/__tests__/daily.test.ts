import { describe, it, expect } from 'vitest'
import { pickTodaysChallenge } from '../daily'
import { localDayKey } from '../dates'
import { createProvider } from '../providers'
import { effectiveConfigForStage } from '../gradeTiers'
import type { ListenProblem } from '../../games/listenPlay/types'

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
        // (1st grade plays its own stage where a zone has a 1st-grade set: phase 2b)
        expect(stage.id).toMatch(grade === 0 ? /^k-/ : /^(k|g1)-/)
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

  it('1st grade: Word Reef, Writing Workshop and Counting Towers play their own first stage (phase 2b)', () => {
    const FIRST: Record<string, string> = {
      'reading-reef': 'g1-vowels-1',
      'writing-workshop': 'g1-trace-1',
      'tower-battlefront': 'g1-towers-1',
    }
    const seen = new Set<string>()
    for (let d = 0; d < 366; d++) {
      const { zone, stage } = pickTodaysChallenge(1, localDayKey(new Date(2026, 0, 1 + d)))
      if (!(zone.id in FIRST)) continue
      seen.add(zone.id)
      expect(stage.id).toBe(FIRST[zone.id])
      // the daily plays it in Listen & Play: a spoken question (towers' are cards; the others' may be an activity)
      const q = createProvider(effectiveConfigForStage(stage, 0, 1)).next() as ListenProblem
      expect(q.speech, stage.id).toBeDefined()
      if (zone.id === 'tower-battlefront') expect(q.pictureOptions?.map((o) => o.value)).toEqual(q.options)
    }
    expect([...seen].sort()).toEqual(Object.keys(FIRST).sort())
    // kindergarten keeps its own
    for (let d = 0; d < 120; d++) expect(pickTodaysChallenge(0, localDayKey(new Date(2026, 0, 1 + d))).stage.id).toMatch(/^k-/)
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
})

// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import {
  effectiveConfig,
  effectiveConfigForStage,
  pickLevel,
  GRADE_TIERS,
  GRADE_LEVELS,
  GRADE_LABEL,
  GRADE_SHORT_LABEL,
  isGradeLevel,
  type GradeLevel,
  type Tier,
} from '../gradeTiers'
import { curriculum, zoneStages } from '../../curriculum'
import type { Stage } from '../../curriculum/types'
import { createProvider } from '../providers'
import { QUESTIONS as GEO } from '../providers/geometry'
import { CHARTS } from '../providers/dataGraph'
import { PASSAGES as READING } from '../providers/readingComprehension'
import { PASSAGES as SCIENCE } from '../providers/science'

const stage = (providerConfig: Stage['providerConfig']): Stage =>
  ({ id: 'x', providerConfig } as Stage)

describe('effectiveConfig per grade', () => {
  it('scales multiplication factors by grade', () => {
    const cfg = { kind: 'multiplication', factorMin: 2, factorMax: 10 } as const
    expect(effectiveConfig(cfg, 2)).toMatchObject({ factorMin: 2, factorMax: 5 })
    expect(effectiveConfig(cfg, 3)).toMatchObject({ factorMin: 2, factorMax: 10 })
    expect(effectiveConfig(cfg, 4)).toMatchObject({ factorMin: 3, factorMax: 12 })
  })

  it('caps division answers inside the tier', () => {
    const cfg = { kind: 'division', divisorMin: 2, divisorMax: 10, quotientMin: 2, quotientMax: 10 } as const
    const g2 = effectiveConfig(cfg, 2)
    expect(g2).toMatchObject({ divisorMax: 5, quotientMax: 5 })
    const g4 = effectiveConfig(cfg, 4)
    expect(g4).toMatchObject({ divisorMax: 12, quotientMax: 12 })
  })

  it('widens fractions and place value with grade', () => {
    expect(effectiveConfig({ kind: 'fractionEquivalence', maxDenominator: 12 }, 2))
      .toMatchObject({ maxDenominator: 8 })
    expect(effectiveConfig({ kind: 'fractionEquivalence', maxDenominator: 12 }, 4))
      .toMatchObject({ maxDenominator: 16 })
    expect(effectiveConfig({ kind: 'placeValueIdentify', maxPlace: 10000 }, 2))
      .toMatchObject({ maxPlace: 1000 })
    expect(effectiveConfig({ kind: 'placeValueIdentify', maxPlace: 10000 }, 4))
      .toMatchObject({ maxPlace: 100000 })
  })

  it('routes grade-2 word problems to add/subtract', () => {
    const cfg = { kind: 'wordProblem', topic: 'mixed' } as const
    expect(effectiveConfig(cfg, 2)).toMatchObject({ topic: 'addSubtract' })
    expect(effectiveConfig(cfg, 3)).toMatchObject({ topic: 'mixed' })
  })

  it('picks bank level per stage index (keeps the zone ramp)', () => {
    const cfg = { kind: 'geometry', level: 3 } as const
    expect(effectiveConfig(cfg, 4, 0)).toMatchObject({ level: 3 })
    expect(effectiveConfig(cfg, 4, 1)).toMatchObject({ level: 4 })
    expect(effectiveConfig(cfg, 3, 2)).toMatchObject({ level: 4 })
  })

  it('leaves writing prompts alone', () => {
    const cfg = { kind: 'writingPrompt', writingKind: 'story' } as const
    expect(effectiveConfig(cfg, 2)).toEqual(cfg)
  })

  it('keeps grove orders inside the grade for every host (the Daily Challenge too)', async () => {
    // the Daily Challenge plays a zone's first stage — Times Grove's orders for
    // Multiplication Mesa — and used to serve 2nd graders 6-row orders
    // K–2 plant ≤ 5, 3rd ≤ 6, 4th and 5th the whole 7 × 7 field
    const GROVE_MAX: Record<GradeLevel, number> = { 0: 5, 1: 5, 2: 5, 3: 6, 4: 7, 5: 7 }
    for (const g of GRADE_LEVELS) {
      const maxFactor = GROVE_MAX[g]
      const cfg = effectiveConfig({ kind: 'multiplicationGrove' }, g)
      expect(cfg).toMatchObject({ maxFactor })
      const provider = createProvider(cfg)
      for (let i = 0; i < 40; i++) {
        const p = await provider.next()
        const v = p.visual?.kind === 'array' ? p.visual : null
        expect(Math.max(v!.rows, v!.cols)).toBeLessThanOrEqual(maxFactor)
      }
    }
  })

  it('is total over every stage × grade (never drops a kind)', () => {
    for (const zone of curriculum.zones)
      GRADE_LEVELS.forEach((g) =>
        zoneStages(zone, g).forEach((s, i) => {
          const out = effectiveConfigForStage(s, i, g)
          expect(out.kind).toBe(s.providerConfig.kind)
        }),
      )
  })

  it('defaults a missing profile grade to 4 (pre-grade save behavior)', () => {
    const cfg = { kind: 'multiplication', factorMin: 2, factorMax: 10 } as const
    expect(effectiveConfigForStage(stage(cfg), 0, null)).toMatchObject({ factorMax: 12 })
  })
})

describe('grades K–5', () => {
  it('knows every grade from kindergarten (0) to 5th, with labels', () => {
    expect(GRADE_LEVELS).toEqual([0, 1, 2, 3, 4, 5])
    for (const g of GRADE_LEVELS) {
      expect(isGradeLevel(g)).toBe(true)
      expect(GRADE_LABEL[g]).toBeTruthy()
      expect(GRADE_SHORT_LABEL[g]).toBeTruthy()
    }
    expect(GRADE_LABEL[0]).toBe('Kindergarten')
    expect(GRADE_SHORT_LABEL[0]).toBe('K')
    expect(GRADE_LABEL[5]).toBe('5th grade')
    for (const bad of [-1, 6, 2.5, '3', null, undefined, NaN]) expect(isGradeLevel(bad)).toBe(false)
  })

  // Each numeric knob, in "harder is bigger" order.
  const knobs = (t: Tier): number[] => [
    t.multMin, t.multMax, t.divMin, t.divMax, t.fracEquivMaxDenom, t.fracCompareMaxDenom,
    t.pvIdentifyMaxPlace, t.pvRoundMaxPlace, t.pvRoundTo, ...t.bankLevels,
  ]

  it('never gets easier as the grade goes up (K–1 easiest, 5th at least 4th)', () => {
    for (const g of GRADE_LEVELS.slice(1)) {
      const lower = knobs(GRADE_TIERS[(g - 1) as GradeLevel])
      const here = knobs(GRADE_TIERS[g])
      here.forEach((v, i) => expect(v, `grade ${g} knob #${i}`).toBeGreaterThanOrEqual(lower[i]))
    }
  })

  it('gives K and 1st the easiest knobs and keeps them on add/subtract stories', () => {
    for (const g of [0, 1] as const) {
      const k = knobs(GRADE_TIERS[g])
      for (const other of GRADE_LEVELS) knobs(GRADE_TIERS[other]).forEach((v, i) => expect(k[i]).toBeLessThanOrEqual(v))
      expect(GRADE_TIERS[g].wpTopic).toBe('addSubtract')
      expect(effectiveConfig({ kind: 'multiplicationGrove' }, g)).toMatchObject({ maxFactor: 5 })
    }
  })

  it('serves 5th grade the bank ladder one level up (level 5 falls back to 4 until it is written)', () => {
    expect(effectiveConfig({ kind: 'readingComprehension', level: 3 }, 5, 2)).toMatchObject({ level: 5 })
    expect(pickLevel(5, READING.map((p) => p.level))).toBe(4)
    expect(effectiveConfig({ kind: 'placeValueIdentify', maxPlace: 10000 }, 5)).toMatchObject({ maxPlace: 100000 })
  })
})

describe('pickLevel (bank fallback)', () => {
  it('takes the requested level when stocked', () => {
    expect(pickLevel(3, [2, 3, 4])).toBe(3)
  })
  it('falls back to the nearest EASIER stocked level', () => {
    // only 3/4 authored so far → a grade-2 ask for geometry serves level 3
    expect(pickLevel(2, [3, 3, 4])).toBe(3)
  })
  it('prefers the nearest easy, not the furthest', () => {
    expect(pickLevel(4, [2, 3])).toBe(3)
  })
  it('falls back upward when only harder levels exist', () => {
    expect(pickLevel(2, [3])).toBe(3)
  })
})

describe('every bank-backed stage has a non-empty pool for every grade', () => {
  const banks: Record<string, { items: Array<{ level: number }>; kind: string }> = {
    geometry: { items: GEO, kind: 'geometry' },
    dataGraph: { items: CHARTS, kind: 'dataGraph' },
    reading: { items: READING, kind: 'readingComprehension' },
    science: { items: SCIENCE, kind: 'science' },
  }
  for (const [name, { items, kind }] of Object.entries(banks)) {
    for (const g of GRADE_LEVELS) {
      it(`${name} serves grade ${g}`, () => {
        const levels = items.map((i) => i.level)
        const chosen = pickLevel(GRADE_TIERS[g].bankLevels[0], levels)
        expect(items.filter((i) => i.level === chosen).length).toBeGreaterThan(0)
        void kind
      })
    }
  }
})

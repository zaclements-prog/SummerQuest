// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import {
  effectiveConfig,
  effectiveConfigForStage,
  pickLevel,
  GRADE_TIERS,
  GRADE_LEVELS,
} from '../gradeTiers'
import { curriculum } from '../../curriculum'
import type { Stage } from '../../curriculum/types'
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

  it('is total over every stage × grade (never drops a kind)', () => {
    for (const zone of curriculum.zones)
      zone.stages.forEach((s, i) =>
        GRADE_LEVELS.forEach((g) => {
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

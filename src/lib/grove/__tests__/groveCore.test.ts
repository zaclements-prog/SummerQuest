import { describe, expect, it } from 'vitest'
import {
  FIELD,
  FINALE_POINTS,
  GROUP_PLURAL,
  GROVE_ROUNDS,
  ORDER_POINTS,
  factorPairs,
  fieldOrigin,
  groupWord,
  groveBadHint,
  groveCandidates,
  groveChant,
  groveMaxFactor,
  groveStarThresholds,
  groveStars,
  groveWinLine,
  isCommittable,
  judgePlanting,
  parseGroveRound,
  planGroveRun,
  plantPoints,
  plantedShape,
  shapeForTotal,
  skipCount,
  tileAt,
  tileCenter,
  waysToPlant,
} from '../groveCore'
import { GROVE_ORDERS, groveOrdersFor } from '../../providers/multiplicationGrove'
import { seededRng } from '../../random'

describe('groveCandidates', () => {
  it('returns the target plot first, then two siblings that share one dimension', () => {
    const [target, wide, deep] = groveCandidates(3, 4)
    expect(target).toEqual({ rows: 3, cols: 4, total: 12 })
    expect(wide).toEqual({ rows: 3, cols: 5, total: 15 })
    expect(deep).toEqual({ rows: 4, cols: 4, total: 16 })
  })

  it('keeps all three totals distinct, including square targets', () => {
    for (const [a, b] of [[3, 3], [4, 4], [5, 5], [2, 2]] as const) {
      const c = groveCandidates(a, b)
      expect(new Set(c.map((s) => s.total)).size).toBe(3)
    }
  })

  it('every sibling is a real integer grid with the right product', () => {
    for (let a = 2; a <= 6; a++) {
      for (let b = 2; b <= 6; b++) {
        for (const s of groveCandidates(a, b)) {
          expect(Number.isInteger(s.rows)).toBe(true)
          expect(Number.isInteger(s.cols)).toBe(true)
          expect(s.rows).toBeGreaterThanOrEqual(1)
          expect(s.cols).toBeGreaterThanOrEqual(1)
          expect(s.total).toBe(s.rows * s.cols)
        }
      }
    }
  })

  it('rejects degenerate shapes', () => {
    expect(() => groveCandidates(0, 4)).toThrow(/bad grove shape/)
    expect(() => groveCandidates(3, 0)).toThrow(/bad grove shape/)
  })
})

describe('shapeForTotal', () => {
  it('maps each option total to its plot', () => {
    const c = groveCandidates(3, 4)
    expect(shapeForTotal(c, 12)).toEqual({ rows: 3, cols: 4, total: 12 })
    expect(shapeForTotal(c, 15)).toEqual({ rows: 3, cols: 5, total: 15 })
    expect(shapeForTotal(c, 16)).toEqual({ rows: 4, cols: 4, total: 16 })
  })

  it('throws on an orphan total', () => {
    expect(() => shapeForTotal(groveCandidates(3, 4), 9)).toThrow(/no grove shape/)
  })
})

describe('groveChant', () => {
  it('counts one group per crossed row and lands on the total', () => {
    expect(groveChant(3, 4, 1)).toBe('1 four…')
    expect(groveChant(3, 4, 2)).toBe('1 four, 2 fours…')
    expect(groveChant(3, 4, 3)).toBe('1 four, 2 fours, 3 fours — 12!')
  })

  it('pluralizes group sizes', () => {
    expect(groveChant(2, 3, 2)).toBe('1 three, 2 threes — 6!')
    expect(groveChant(2, 2, 1)).toBe('1 two…')
  })

  it('falls back to digits for unfamiliar group sizes', () => {
    expect(groupWord(10)).toBe('10s')
    expect(GROUP_PLURAL[4]).toBe('fours')
  })

  it('throws when chanting more rows than the plot has', () => {
    expect(() => groveChant(3, 4, 4)).toThrow(/chant row/)
  })
})

describe('groveWinLine', () => {
  it('speaks the chant, the order and the total', () => {
    expect(groveWinLine(3, 4)).toContain('1 four, 2 fours, 3 fours — 12!')
    expect(groveWinLine(3, 4)).toContain('3 rows of 4 — 12 trees!')
  })

  it('adds the commutativity beat only for non-square plots', () => {
    expect(groveWinLine(3, 4)).toContain('4 rows of 3 would plant the same 12')
    expect(groveWinLine(4, 3)).toContain('3 rows of 4 would plant the same 12')
    expect(groveWinLine(4, 4)).not.toContain('would plant the same')
  })
})

describe('groveBadHint', () => {
  it('names the shape you actually walked', () => {
    expect(groveBadHint({ rows: 3, cols: 5, total: 15 })).toContain('3 rows of 5 — that many is 15')
  })
})

describe('parseGroveRound', () => {
  it('builds a round from an array-visual problem and checks the answer', () => {
    const r = parseGroveRound({
      prompt: 'Plant 3 rows of 4 apple trees.',
      answer: 12,
      visual: { kind: 'array', rows: 3, cols: 4 },
    })
    expect(r.shape.total).toBe(12)
    expect(r.siblings).toHaveLength(3)
  })

  it('rejects problems without an array visual or a matching answer', () => {
    expect(() => parseGroveRound({ prompt: 'x', answer: 12 })).toThrow(/array visual/)
    expect(() =>
      parseGroveRound({ prompt: 'x', answer: 15, visual: { kind: 'array', rows: 3, cols: 4 } }),
    ).toThrow(/does not match/)
  })
})

describe('stars', () => {
  it('gives the arena/forge 20/60/100% shape for any round count', () => {
    expect(groveStarThresholds(5)).toEqual([1, 3, 5])
    expect(groveStarThresholds(6)).toEqual([2, 4, 6])
  })

  it('maps first-try clears to stars', () => {
    expect(groveStars(0, 5)).toBe(0)
    expect(groveStars(1, 5)).toBe(1)
    expect(groveStars(3, 5)).toBe(2)
    expect(groveStars(5, 5)).toBe(3)
  })
})

describe('constants', () => {
  it('exposes five rounds', () => {
    expect(GROVE_ROUNDS).toBe(5)
  })
})

// ── the fun pass: planting the array yourself ───────────────────────────────

describe('the field', () => {
  it('is centred, with the seed bag (0,0) at the top-left', () => {
    const [x0, z0] = fieldOrigin()
    expect(x0).toBeCloseTo(-((FIELD.cols - 1) / 2) * FIELD.pitch)
    expect(tileCenter(0, 0)).toEqual([x0, z0])
    const [x, z] = tileCenter(FIELD.rows - 1, FIELD.cols - 1)
    expect(x).toBeCloseTo(-x0)
    expect(z).toBeCloseTo(-z0)
    // rows grow toward the camera (+z), columns to the right (+x)
    expect(tileCenter(2, 0)[1]).toBeGreaterThan(tileCenter(1, 0)[1])
    expect(tileCenter(0, 2)[0]).toBeGreaterThan(tileCenter(0, 1)[0])
  })

  it('finds the tile under a point, and nothing off the field', () => {
    for (let r = 0; r < FIELD.rows; r++)
      for (let c = 0; c < FIELD.cols; c++) {
        const [x, z] = tileCenter(r, c)
        expect(tileAt(x, z, null)).toEqual({ r, c })
      }
    const [x0, z0] = fieldOrigin()
    expect(tileAt(x0 - FIELD.pitch, z0, null)).toBeNull()
    expect(tileAt(x0, z0 + FIELD.pitch * FIELD.rows, null)).toBeNull()
  })

  it('has hysteresis: near a border the previous tile holds until clearly crossed', () => {
    const [x, z] = tileCenter(2, 2)
    const border = x + FIELD.pitch / 2
    expect(tileAt(border + 0.02, z, null)).toEqual({ r: 2, c: 3 })
    expect(tileAt(border + 0.02, z, { r: 2, c: 2 })).toEqual({ r: 2, c: 2 })
    expect(tileAt(border + 0.3, z, { r: 2, c: 2 })).toEqual({ r: 2, c: 3 })
    // and the same going back
    expect(tileAt(border - 0.02, z, { r: 2, c: 3 })).toEqual({ r: 2, c: 3 })
    expect(tileAt(border - 0.3, z, { r: 2, c: 3 })).toEqual({ r: 2, c: 2 })
  })

  it('plants the rectangle from the seed bag to the kid, inclusive', () => {
    expect(plantedShape({ r: 2, c: 3 })).toEqual({ rows: 3, cols: 4 })
    expect(plantedShape({ r: 0, c: 0 })).toEqual({ rows: 1, cols: 1 })
    expect(plantedShape(null)).toBeNull()
  })

  it('a single row or column is still being laid out — it never roots', () => {
    expect(isCommittable({ rows: 1, cols: 4 })).toBe(false)
    expect(isCommittable({ rows: 3, cols: 1 })).toBe(false)
    expect(isCommittable(null)).toBe(false)
    expect(isCommittable({ rows: 2, cols: 2 })).toBe(true)
  })
})

describe('judgePlanting', () => {
  const order = { kind: 'order' as const, rows: 3, cols: 4, total: 12 }
  it('exact, turned (commutativity — still right) or wrong', () => {
    expect(judgePlanting(order, { rows: 3, cols: 4 })).toBe('exact')
    expect(judgePlanting(order, { rows: 4, cols: 3 })).toBe('turned')
    expect(judgePlanting(order, { rows: 2, cols: 6 })).toBe('wrong') // same total, not the order
    expect(judgePlanting(order, { rows: 3, cols: 5 })).toBe('wrong')
  })
  it('a square order is never "turned"', () => {
    expect(judgePlanting({ kind: 'order', rows: 4, cols: 4, total: 16 }, { rows: 4, cols: 4 })).toBe('exact')
  })
  it('missing-number orders need the given rows and the total', () => {
    const t = { kind: 'missing' as const, rows: 3, cols: 5, total: 15 }
    expect(judgePlanting(t, { rows: 3, cols: 5 })).toBe('exact')
    expect(judgePlanting(t, { rows: 5, cols: 3 })).toBe('turned')
    expect(judgePlanting(t, { rows: 3, cols: 4 })).toBe('wrong')
  })
  it('"any equal rows" accepts every arrangement of the total', () => {
    const t = { kind: 'total' as const, rows: 3, cols: 4, total: 12 }
    for (const [rows, cols] of factorPairs(12)) expect(judgePlanting(t, { rows, cols })).toBe('exact')
    expect(judgePlanting(t, { rows: 3, cols: 5 })).toBe('wrong')
    expect(judgePlanting(t, { rows: 1, cols: 12 })).toBe('wrong')
  })
})

describe('factorPairs / skipCount', () => {
  it('lists the arrangements that fit the field', () => {
    expect(factorPairs(12)).toEqual([
      [2, 6],
      [3, 4],
      [4, 3],
      [6, 2],
    ])
    expect(factorPairs(16)).toEqual([[4, 4]]) // 2 × 8 doesn't fit a 7-wide field
    expect(factorPairs(13)).toEqual([])
  })
  it('chants the running total row by row', () => {
    expect(skipCount(3, 4)).toEqual([4, 8, 12])
    expect(skipCount(5, 6)).toEqual([6, 12, 18, 24, 30])
    expect(skipCount(0, 4)).toEqual([])
  })
})

describe('groveMaxFactor', () => {
  it('grade tiers keep orders inside the grade', () => {
    expect(groveMaxFactor(2)).toBe(5)
    expect(groveMaxFactor(3)).toBe(6)
    expect(groveMaxFactor(4)).toBe(7)
    expect(groveMaxFactor(undefined)).toBe(7)
  })
  it('gives kindergarten and 1st grade the smallest orders, 5th grade the whole field', () => {
    // (an unknown grade used to fall through to the hardest, 7)
    expect(groveMaxFactor(0)).toBe(5)
    expect(groveMaxFactor(1)).toBe(5)
    expect(groveMaxFactor(5)).toBe(7)
    expect(groveMaxFactor(null)).toBe(7) // no profile: 4th grade, the default
  })
})

describe('planGroveRun', () => {
  const runs = (n: number, maxFactor: number) =>
    Array.from({ length: 40 }, (_, i) => planGroveRun(n, groveOrdersFor(maxFactor), seededRng(`grove-run:${n}:${maxFactor}:${i}`)))

  it('6 orders: two labelled warm-ups, the middle cycles kinds, a giant finale', () => {
    for (const plan of runs(6, 6)) {
      expect(plan).toHaveLength(6)
      expect(plan.map((t) => t.labels)).toEqual([true, true, false, false, false, false])
      expect(plan[5].kind).toBe('finale')
      expect(plan[5].base).toBe(FINALE_POINTS)
      expect(plan[0].base).toBe(ORDER_POINTS)
      expect(plan.slice(2, 5).map((t) => t.kind)).toEqual(['order', 'total', 'missing'])
    }
  })

  it('escalates: warm-ups are small, the finale is the biggest order of the run', () => {
    for (const plan of runs(6, 6)) {
      const totals = plan.map((t) => t.total)
      expect(Math.max(...totals)).toBe(plan[5].total)
      // the finale's total is its own: no earlier order already planted it
      expect(totals.filter((t) => t === plan[5].total)).toHaveLength(1)
      expect(plan[0].total).toBeLessThanOrEqual(12)
      expect(plan[5].total).toBeGreaterThanOrEqual(24)
    }
  })

  it('every task fits the field and the grade', () => {
    for (const mf of [5, 6, 7]) {
      for (const plan of runs(6, mf)) {
        for (const t of plan) {
          expect(t.total).toBe(t.rows * t.cols)
          expect(Math.max(t.rows, t.cols)).toBeLessThanOrEqual(mf)
          expect(t.rows).toBeGreaterThanOrEqual(2)
          expect(t.cols).toBeGreaterThanOrEqual(2)
          expect(t.par).toBeGreaterThan(0)
        }
      }
    }
  })

  it('"any equal rows" tasks always have two really different shapes (not just a turn)', () => {
    let seen = 0
    for (const mf of [5, 6, 7])
      for (const plan of runs(6, mf))
        for (const t of plan.filter((x) => x.kind === 'total')) {
          seen++
          expect(waysToPlant(t.total)).toBeGreaterThanOrEqual(2)
        }
    expect(seen).toBeGreaterThan(0)
  })

  it('waysToPlant counts a turned array once', () => {
    expect(waysToPlant(12)).toBe(2) // 2 × 6, 3 × 4
    expect(waysToPlant(30)).toBe(1) // 5 × 6 only on a 7-wide field
    expect(waysToPlant(16)).toBe(1)
    expect(waysToPlant(7)).toBe(0)
  })

  it('handles short and long runs', () => {
    expect(planGroveRun(1, GROVE_ORDERS).map((t) => t.kind)).toEqual(['finale'])
    expect(planGroveRun(2, GROVE_ORDERS).map((t) => t.labels)).toEqual([true, false])
    expect(planGroveRun(9, GROVE_ORDERS)).toHaveLength(9)
    expect(() => planGroveRun(3, [])).toThrow()
  })
})

describe('plantPoints', () => {
  it('base + bloom-clock bonus × streak', () => {
    const t = { base: 100, par: 20 }
    expect(plantPoints({ task: t, elapsed: 0, streak: 1 }).points).toBe(160)
    expect(plantPoints({ task: t, elapsed: 10, streak: 1 }).points).toBe(130)
    expect(plantPoints({ task: t, elapsed: 99, streak: 1 }).points).toBe(100)
    expect(plantPoints({ task: t, elapsed: 99, streak: 5 }).points).toBe(200)
  })
})

import { describe, expect, it } from 'vitest'
import {
  GROUP_PLURAL,
  GROVE_ROUNDS,
  groupWord,
  groveBadHint,
  groveCandidates,
  groveChant,
  groveStarThresholds,
  groveStars,
  groveWinLine,
  parseGroveRound,
  shapeForTotal,
} from '../groveCore'

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

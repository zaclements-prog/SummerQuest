import { describe, expect, it } from 'vitest'
import { ALL_GLYPHS, DIGITS, LETTERS, LETTER_FAMILIES, SAMPLE_SPACING, STROKE_PHRASES, WARMUPS, WARMUP_FAMILIES, glyph } from '../glyphs'
import { dist, movesPath, pointAlong, sampleMoves, A, L, M } from '../geometry'

/**
 * The hand-authored ball-and-stick glyphs: every one in its box, every
 * stroke with a start and evenly spaced samples, in school order.
 */

describe('the tracing glyphs', () => {
  it('are the warm-ups, 0–9 and A–Z', () => {
    expect(WARMUPS.map((g) => g.id)).toEqual(['down', 'across', 'slantRight', 'slantLeft', 'circle', 'curve', 'zigzag', 'wave'])
    expect(DIGITS.map((g) => g.id)).toEqual('0123456789'.split(''))
    expect(LETTERS.map((g) => g.id)).toEqual('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''))
    expect(glyph('letter', 'B').strokes).toHaveLength(3)
    expect(() => glyph('letter', 'b')).toThrow()
  })

  it('the letter families cover A–Z once each, and the warm-up families every warm-up', () => {
    const fam = Object.values(LETTER_FAMILIES).flat()
    expect([...fam].sort()).toEqual(LETTERS.map((g) => g.id))
    expect(LETTER_FAMILIES.straight).toEqual(['L', 'T', 'I', 'E', 'F', 'H'])
    expect(Object.values(WARMUP_FAMILIES).flat().sort()).toEqual(WARMUPS.map((g) => g.id).sort())
  })

  it('every glyph has strokes, each with a start and an end, inside the box', () => {
    for (const g of ALL_GLYPHS) {
      expect(g.strokes.length, g.id).toBeGreaterThan(0)
      expect(g.strokes.length, g.id).toBeLessThanOrEqual(4)
      for (const [i, s] of g.strokes.entries()) {
        const key = `${g.id} stroke ${i + 1}`
        expect(s.start, key).toEqual(s.sampled.pts[0])
        expect(s.end, key).toEqual(s.sampled.pts.at(-1))
        expect(s.sampled.length, key).toBeGreaterThan(20)
        for (const p of s.sampled.pts) {
          expect(p.x, key).toBeGreaterThanOrEqual(5)
          expect(p.x, key).toBeLessThanOrEqual(95)
          expect(p.y, key).toBeGreaterThanOrEqual(5)
          expect(p.y, key).toBeLessThanOrEqual(97)
        }
        expect(STROKE_PHRASES[s.say], key).toBeDefined()
        expect(s.path, key).toMatch(/^M [\d.]+ [\d.]+/)
      }
    }
  })

  it('samples every stroke evenly (about 2 units apart along it, no gaps, no doubles)', () => {
    for (const g of ALL_GLYPHS)
      for (const s of g.strokes) {
        const { pts, at } = s.sampled
        for (let i = 1; i < pts.length; i++) {
          // evenly along the stroke…
          expect(at[i] - at[i - 1], g.id).toBeGreaterThan(SAMPLE_SPACING * 0.85)
          expect(at[i] - at[i - 1], g.id).toBeLessThan(SAMPLE_SPACING * 1.15)
          // …so never two on one spot (a sharp corner brings two a little closer across it)
          const d = dist(pts[i - 1], pts[i])
          expect(d, g.id).toBeGreaterThan(SAMPLE_SPACING * 0.25)
          expect(d, g.id).toBeLessThanOrEqual(SAMPLE_SPACING * 1.15)
        }
        expect(at.at(-1)).toBeCloseTo(s.sampled.length, 6)
      }
  })

  it('letters and numerals stand on the writing lines (top 10, base 90); warm-ups float free', () => {
    for (const g of [...DIGITS, ...LETTERS]) {
      expect(g.lines, g.id).toBe(true)
      const ys = g.strokes.flatMap((s) => s.sampled.pts.map((p) => p.y))
      expect(Math.min(...ys), g.id).toBeCloseTo(10, 0)
      // (Q's tail dips below the base line)
      if (g.id !== 'Q') expect(Math.max(...ys), g.id).toBeCloseTo(90, 0)
    }
    for (const g of WARMUPS) expect(g.lines).toBe(false)
  })

  it('in school order: strokes start at the top or on the left, lines go down and to the right', () => {
    for (const g of ALL_GLYPHS)
      for (const [i, s] of g.strokes.entries()) {
        const key = `${g.id} stroke ${i + 1}`
        const { start, end } = s
        if (dist(start, end) < 1) continue // a circle ends where it began
        // never a stroke drawn from the bottom up (U goes up, but it starts at the top)
        expect(start.y <= end.y + 0.01 || start.y <= 12, key).toBe(true)
        // a flat line runs left to right
        if (Math.abs(start.y - end.y) < 0.5) expect(start.x, key).toBeLessThan(end.x)
      }
    // the first stroke of a straight letter is the big line down from the top
    for (const id of LETTER_FAMILIES.straight) expect(glyph('letter', id).strokes[0].say).toBe('bigDown')
  })

  it('circles and C-curves go counter-clockwise from about two o’clock', () => {
    for (const [kind, id] of [
      ['letter', 'O'],
      ['letter', 'C'],
      ['letter', 'G'],
      ['letter', 'Q'],
      ['digit', '0'],
      ['warmup', 'circle'],
      ['warmup', 'curve'],
    ] as const) {
      const s = glyph(kind, id).strokes[0]
      // starts up and to the right of the middle…
      expect(s.start.x, id).toBeGreaterThan(60)
      expect(s.start.y, id).toBeLessThan(30)
      // …and heads up and left (counter-clockwise on screen)
      const { dir } = pointAlong(s.sampled, 3)
      expect(dir.x, id).toBeLessThan(0)
      expect(dir.y, id).toBeLessThan(0)
    }
  })

  it('strokes are continuous: no jumps between their samples', () => {
    for (const g of ALL_GLYPHS) for (const s of g.strokes) for (let i = 1; i < s.sampled.pts.length; i++) expect(dist(s.sampled.pts[i - 1], s.sampled.pts[i])).toBeLessThan(3)
  })

  it('finds the sharp corners (an arrow goes after each) and not the smooth joins', () => {
    expect(glyph('letter', 'V').strokes[0].sampled.corners).toHaveLength(1)
    expect(glyph('letter', 'W').strokes[0].sampled.corners).toHaveLength(3)
    expect(glyph('letter', 'Z').strokes[0].sampled.corners).toHaveLength(2)
    expect(glyph('letter', 'U').strokes[0].sampled.corners).toHaveLength(0)
    expect(glyph('letter', 'S').strokes[0].sampled.corners).toHaveLength(0)
    expect(glyph('digit', '4').strokes[0].sampled.corners).toHaveLength(1)
  })
})

describe('tracing geometry', () => {
  it('a line, an arc, and an arc that starts away from the pen (a line to it first)', () => {
    const line = sampleMoves([L(0, 0, 10, 0)], 2)
    expect(line.length).toBeCloseTo(10)
    expect(line.pts).toHaveLength(6)
    const arc = sampleMoves([A(0, 0, 10, 10, 0, 90)], 2)
    expect(arc.length).toBeCloseTo((Math.PI * 10) / 2, 1)
    expect(arc.pts[0].x).toBeCloseTo(10)
    expect(arc.pts.at(-1)!.y).toBeCloseTo(-10) // 90° is up (y down)
    const joined = sampleMoves([M(10, 30), A(0, 0, 10, 10, 0, 90)], 2)
    expect(joined.length).toBeCloseTo(30 + (Math.PI * 10) / 2, 1)
  })

  it('draws exact arcs for the guide, counter-clockwise as sweep 0', () => {
    expect(movesPath([A(50, 50, 40, 40, 0, 90)])).toBe('M 90 50 A 40 40 0 0 0 50 10')
    expect(movesPath([A(50, 50, 40, 40, 90, 0)])).toBe('M 50 10 A 40 40 0 0 1 90 50')
    // a whole circle in quarter turns
    expect(movesPath([A(50, 50, 40, 40, 0, 360)]).match(/A /g)).toHaveLength(4)
    expect(movesPath([L(10, 10, 10, 90, 50, 90)])).toBe('M 10 10 L 10 90 L 50 90')
  })
})

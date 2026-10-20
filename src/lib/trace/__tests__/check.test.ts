import { describe, expect, it } from 'vitest'
import { checkTrace, densify, tolerancesFor, TOLERANCE } from '../check'
import { ALL_GLYPHS, glyph } from '../glyphs'
import type { Pt, SampledStroke } from '../geometry'

/**
 * The forgiving trace check, on synthetic traces: the path itself passes,
 * a wobbly or slightly-off finger passes, and the wrong way, a scribble, a
 * half stroke or a start far from the green dot don't.
 */

/** A finger following the stroke, `every` units between pointer events. */
const follow = (st: SampledStroke, every = 1, f: (p: Pt, i: number) => Pt = (p) => p): Pt[] => {
  const step = Math.max(1, Math.round(every / 2))
  const out = st.pts.filter((_, i) => i % step === 0).map(f)
  out.push(f(st.pts[st.pts.length - 1], st.pts.length - 1))
  return out
}
const shift = (dx: number, dy: number) => (p: Pt) => ({ x: p.x + dx, y: p.y + dy })
/** A small deterministic wobble (a five-year-old's hand), up to `amp` units across. */
const wobble = (amp: number) => (p: Pt, i: number) => ({ x: p.x + amp * Math.sin(i * 0.9), y: p.y + amp * Math.cos(i * 1.3) })

const strokes = ALL_GLYPHS.flatMap((g) => g.strokes.map((s, i) => ({ key: `${g.kind} ${g.id} #${i + 1}`, st: s.sampled })))

describe('the trace check: what passes', () => {
  it('the exact path, for every stroke of every glyph, sparse or dense', () => {
    for (const { key, st } of strokes) {
      expect(checkTrace(st, follow(st)), key).toMatchObject({ ok: true, miss: null })
      expect(checkTrace(st, follow(st, 8)).ok, `${key} (fast)`).toBe(true)
    }
  })

  it('a small wobble or a finger a little off the line', () => {
    for (const { key, st } of strokes) {
      expect(checkTrace(st, follow(st, 2, wobble(5))).ok, `${key} wobble`).toBe(true)
      expect(checkTrace(st, follow(st, 2, shift(7, -6))).ok, `${key} offset`).toBe(true)
    }
  })

  it('starting a little before the dot, cutting a corner, or overshooting the end a bit', () => {
    const L1 = glyph('letter', 'L').strokes[0].sampled
    expect(checkTrace(L1, [{ x: 30, y: 2 }, ...follow(L1)]).ok).toBe(true)
    expect(checkTrace(L1, [...follow(L1), { x: 33, y: 98 }]).ok).toBe(true)
    const V = glyph('letter', 'V').strokes[0].sampled
    // round the bottom of the V 6 units early
    const cut = follow(V).map((p) => (p.y > 84 ? { x: p.x, y: 84 } : p))
    expect(checkTrace(V, cut).ok).toBe(true)
  })

  it('a short stroke needs a fingertip of room even when drawn small', () => {
    const tol = tolerancesFor(1.5) // a 150 px drawing
    expect(tol.near).toBeGreaterThan(TOLERANCE.near)
    expect(tolerancesFor(5).near).toBe(TOLERANCE.near)
    const bar = glyph('letter', 'E').strokes[1].sampled
    expect(checkTrace(bar, follow(bar, 2, shift(0, 18)), tol).ok).toBe(true)
    expect(checkTrace(bar, follow(bar, 2, shift(0, 18))).ok).toBe(false)
  })
})

describe('the trace check: what doesn’t (and why)', () => {
  it('the wrong way along a line: it starts at the far end', () => {
    for (const { key, st } of strokes) {
      if (Math.hypot(st.pts[0].x - st.pts.at(-1)!.x, st.pts[0].y - st.pts.at(-1)!.y) < 30) continue
      expect(checkTrace(st, [...follow(st)].reverse()), key).toMatchObject({ ok: false, miss: 'start' })
    }
  })

  it('the wrong way round a circle, from the right dot', () => {
    for (const [kind, id] of [
      ['letter', 'O'],
      ['digit', '0'],
      ['warmup', 'circle'],
    ] as const) {
      const st = glyph(kind, id).strokes[0].sampled
      // start on the dot, then go round the other way (clockwise)
      const backwards = [st.pts[0], ...[...st.pts].reverse()]
      expect(checkTrace(st, backwards), id).toMatchObject({ ok: false })
      expect(checkTrace(st, backwards).coverage, id).toBeLessThan(0.3)
    }
  })

  it('up from the dot instead of down', () => {
    const st = glyph('warmup', 'down').strokes[0].sampled
    const up = Array.from({ length: 40 }, (_, i) => ({ x: 50, y: 12 - i * 2 }))
    expect(checkTrace(st, up)).toMatchObject({ ok: false, miss: 'wander' })
  })

  it('a scribble that starts on the dot', () => {
    for (const { key, st } of strokes) {
      const s = st.pts[0]
      const scribble = Array.from({ length: 60 }, (_, i) => ({ x: s.x + 30 * Math.sin(i * 1.7) + i * 0.5, y: s.y + 28 * Math.abs(Math.cos(i * 1.1)) }))
      expect(checkTrace(st, scribble).ok, key).toBe(false)
    }
  })

  it('half a stroke (or a tap on the dot)', () => {
    for (const { key, st } of strokes) {
      const half = st.pts.slice(0, Math.floor(st.pts.length * 0.55))
      expect(checkTrace(st, half), key).toMatchObject({ ok: false, miss: 'short' })
      expect(checkTrace(st, [st.pts[0]]), key).toMatchObject({ ok: false, miss: 'short' })
    }
  })

  it('starting far from the green dot', () => {
    for (const { key, st } of strokes) {
      const p0 = st.pts[0]
      const away = follow(st, 2, shift(0, 0)).map((p) => p)
      away.unshift({ x: p0.x + 26, y: p0.y + 14 })
      expect(checkTrace(st, away), key).toMatchObject({ ok: false, miss: 'start' })
    }
  })

  it('going far off the path for a long way on the way', () => {
    const st = glyph('letter', 'L').strokes[0].sampled
    // half way down, a long loop out to the right and back
    const pts = follow(st)
    const mid = Math.floor(pts.length / 2)
    const loop = Array.from({ length: 30 }, (_, i) => ({ x: pts[mid].x + 40 * Math.sin((i / 29) * Math.PI), y: pts[mid].y }))
    expect(checkTrace(st, [...pts.slice(0, mid), ...loop, ...pts.slice(mid)])).toMatchObject({ ok: false, miss: 'wander' })
  })

  it('nothing, or garbage, never throws', () => {
    const st = glyph('letter', 'B').strokes[1].sampled
    expect(checkTrace(st, []).ok).toBe(false)
    expect(checkTrace(st, [{ x: NaN, y: 3 }]).ok).toBe(false)
    expect(densify([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 }])).toHaveLength(11)
  })
})

import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import VisualRenderer from '../VisualRenderer'
import type { ProblemVisual } from '../../lib/problem'
import { createProvider } from '../../lib/providers'
import { seededRng } from '../../lib/random'

/**
 * 5th grade's question pictures (Measurement Marsh, Geometry Grove, Data
 * Delta): the prism, the coordinate plane and the line plot draw what they're
 * given, at every size, and fit a 1024 × 528 tablet's question column.
 */

afterEach(() => vi.restoreAllMocks())

const svgSize = (html: string) => {
  const m = /<svg width="(\d+)" height="(\d+)"/.exec(html)!
  return { w: Number(m[1]), h: Number(m[2]) }
}

describe('5th-grade visuals', () => {
  it('a prism draws one face trio per box, or every outside cube face; labels name each edge', () => {
    const one: ProblemVisual = { kind: 'prism', boxes: [{ l: 4, w: 3, h: 2 }], unit: 'cm', labels: 'edges' }
    const html = renderToStaticMarkup(<VisualRenderer visual={one} />)
    expect((html.match(/<polygon/g) ?? []).length).toBe(3)
    for (const t of ['4 cm', '3 cm', '2 cm']) expect(html).toContain(t)
    // unit cubes: top 4×3 + front-left 4×2 + front-right 3×2 faces
    const cubes = renderToStaticMarkup(<VisualRenderer visual={{ ...one, cubes: true, labels: 'none' }} />)
    expect((cubes.match(/<polygon/g) ?? []).length).toBe(12 + 8 + 6)
    expect(cubes).not.toContain('cm')
    const base = renderToStaticMarkup(<VisualRenderer visual={{ ...one, labels: 'base' }} />)
    expect(base).toContain('Base area B = 12 sq cm')
    const two = renderToStaticMarkup(<VisualRenderer visual={{ kind: 'prism', boxes: [{ l: 2, w: 3, h: 4 }, { l: 3, w: 3, h: 1 }], unit: 'ft' }} />)
    expect((two.match(/<polygon/g) ?? []).length).toBe(6)
    for (const t of ['2 ft', '3 ft', '4 ft', '1 ft']) expect(two).toContain(t)
  })

  it('a coordinate plane numbers its axes by the step and labels every point', () => {
    const v: ProblemVisual = { kind: 'coordPlane', xMax: 10, yMax: 10, points: [{ x: 3, y: 5, label: 'A' }, { x: 0, y: 7, label: 'B' }] }
    const html = renderToStaticMarkup(<VisualRenderer visual={v} />)
    expect((html.match(/<circle/g) ?? []).length).toBe(2)
    expect(html).toContain('>A<')
    expect(html).toContain('>B<')
    const scaled = renderToStaticMarkup(<VisualRenderer visual={{ kind: 'coordPlane', xMax: 15, yMax: 45, xStep: 3, yStep: 9, points: [{ x: 3, y: 9 }], line: true, xLabel: 'Pattern A', yLabel: 'Pattern B' }} />)
    for (const n of ['>9<', '>18<', '>45<', '>15<', 'Pattern A', 'Pattern B']) expect(scaled).toContain(n)
  })

  it('a line plot stacks one X per measurement and writes its ticks as fractions in simplest form', () => {
    const v: ProblemVisual = { kind: 'linePlot', denominator: 8, min: 0, max: 8, counts: [0, 0, 1, 2, 3, 2, 1, 1, 0], title: 'Sprouts', unit: 'Inches' }
    const html = renderToStaticMarkup(<VisualRenderer visual={v} />)
    expect((html.match(/<path d="M/g) ?? []).length).toBe(10)
    // 2/8 is written 1/4, 4/8 is 1/2
    expect(html).not.toContain('>2</text><line')
    expect(html).toContain('Sprouts')
  })

  it('every picture the 5th-grade stages draw fits a 1024 × 528 question column (small) and a 600-wide phone (medium)', () => {
    for (const kind of ['g5Measure', 'g5Geometry', 'g5Data'] as const) {
      vi.spyOn(Math, 'random').mockImplementation(seededRng(`fit:${kind}`))
      const p = createProvider({ kind, mode: 'mixed' } as never)
      for (let i = 0; i < 120; i++) {
        const v = (p.next() as { visual?: ProblemVisual }).visual
        if (!v) continue
        const sm = svgSize(renderToStaticMarkup(<VisualRenderer visual={v} size="sm" />))
        const md = svgSize(renderToStaticMarkup(<VisualRenderer visual={v} size="md" />))
        expect(sm.w, JSON.stringify(v)).toBeLessThanOrEqual(440)
        expect(sm.h, JSON.stringify(v)).toBeLessThanOrEqual(260)
        expect(md.w, JSON.stringify(v)).toBeLessThanOrEqual(540)
        expect(md.h, JSON.stringify(v)).toBeLessThanOrEqual(340)
      }
      vi.restoreAllMocks()
    }
  }, 60_000)
})

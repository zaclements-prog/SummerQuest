import { describe, it, expect } from 'vitest'
import groveSrc from '../../../games/TimesGrove.tsx?raw'
import lazySrc from '../../../games/lazyGames.tsx?raw'
import { AREA_PLOT, POSTS, POST_R, areaStars, areaStepProblem, planAreaRun, plotRects, postAt, stepAsk } from '../areaCore'
import { FIELD_HALF } from '../../../games/TimesGrove.layout'
import { seededRng } from '../../random'
import { curriculum, zoneStages } from '../../../curriculum'
import { SKILLS } from '../../../tutoring/skills'

/*
 * Times Grove's 5th-grade area-model mode: every order's plots, posts and
 * totals worked out again; and grades 2–4's grove left alone (its stage never
 * asks for the mode, and the 2–4 module doesn't know it exists).
 */

describe('the area-model grove (grade 5)', () => {
  it('plans a warm-up, 2-digit by 2-digit orders and a 3-digit by 2-digit finale; every post set has one right number', () => {
    for (let seed = 0; seed < 120; seed++) {
      const run = planAreaRun(3, seededRng(`area-${seed}`))
      expect(run.map((o) => o.kind)).toEqual(['warm', 'main', 'finale'])
      for (const o of run) {
        const { a, b, rows, cols, cells, total } = o.model
        expect(String(b)).toHaveLength(2)
        expect(String(a)).toHaveLength(o.kind === 'finale' ? 3 : 2)
        expect(String(a)).not.toContain('0')
        expect(rows.reduce((x, y) => x + y, 0)).toBe(a)
        expect(cols.reduce((x, y) => x + y, 0)).toBe(b)
        expect(total).toBe(a * b)
        expect(o.steps).toHaveLength(rows.length * cols.length + 1)
        o.steps.forEach((st, k) => {
          const want = st.kind === 'cell' ? rows[st.i] * cols[st.j] : a * b
          expect(st.answer).toBe(want)
          if (st.kind === 'cell') expect(cells[st.i][st.j]).toBe(want)
          expect(st.posts).toHaveLength(3)
          expect(new Set(st.posts).size).toBe(3)
          expect(st.posts.filter((p) => p === want)).toHaveLength(1)
          for (const p of st.posts) expect(Number.isInteger(p) && p > 0).toBe(true)
          expect(k === o.steps.length - 1).toBe(st.kind === 'total')
          const prob = areaStepProblem(o, st, 'x')
          expect(prob.options.filter((x) => x === prob.answer)).toHaveLength(1)
          expect(SKILLS[prob.skill!.id]).toBeDefined()
          expect(stepAsk(o, st)).toMatch(/^[\d,]+ × [\d,]+ = \?$/)
        })
      }
    }
  }, 30_000)

  it('the plots tile the plot area; the posts stand on the field below them, apart', () => {
    const run = planAreaRun(3, seededRng('rects'))
    for (const o of run) {
      const r = plotRects(o.model)
      expect(r[0][0][0]).toBeCloseTo(AREA_PLOT.x0)
      expect(r[r.length - 1][r[0].length - 1][1]).toBeCloseTo(AREA_PLOT.x1)
      expect(r[r.length - 1][0][3]).toBeCloseTo(AREA_PLOT.z1)
    }
    for (const [x, z] of POSTS) {
      expect(Math.abs(x)).toBeLessThan(FIELD_HALF)
      expect(Math.abs(z)).toBeLessThan(FIELD_HALF)
      expect(z - POST_R).toBeGreaterThan(AREA_PLOT.z1)
    }
    expect(postAt(POSTS[1][0], POSTS[1][1])).toBe(1)
    expect(postAt(0, 1.15)).toBeNull()
    expect(areaStars(17, 17)).toBe(3)
    expect(areaStars(0, 17)).toBe(0)
  })

  it('grades 2–4 keep their grove: no mode on their stage, and the 2–4 module never loads the area mode', () => {
    const mesa = curriculum.zones.find((z) => z.id === 'multiplication-mesa')!
    for (const g of [2, 3, 4] as const) {
      const grove = zoneStages(mesa, g).find((s) => s.gameId === 'timesGrove')!
      expect(grove.id).toBe('mult-concept')
      expect(grove.params?.mode).toBeUndefined()
    }
    const g5 = zoneStages(mesa, 5).find((s) => s.gameId === 'timesGrove')!
    expect(g5.id).toBe('g5-mult-1')
    expect(g5.params?.mode).toBe('area')
    expect(groveSrc).not.toMatch(/area/i)
    // the host picks the module by the stage's mode
    expect(lazySrc).toMatch(/props\.params\?\.mode === 'area' \? <TimesGroveAreaGame/)
  })
})

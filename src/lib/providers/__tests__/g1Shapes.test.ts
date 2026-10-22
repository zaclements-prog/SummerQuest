import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeG1ShapesProvider, ROLLS, STACKS, type G1ShapesMode } from '../g1Shapes'
import { seededRng } from '../../random'
import type { ListenProblem } from '../../../games/listenPlay/types'
import { FLAT_CORNERS, FLAWED, G1_FLATS, allShapeArt, boxArtName, flatSides, parseShapeArt, shapeArtName, SHAPE_TURNS } from '../../../games/listenPlay/g1ShapesArt'
import { DECOYS, MAKES_CARDS, RECIPE, RECIPES, bbox, decoyPiece, isSnapSpec, snapLines, type Pt } from '../../../games/listenPlay/activities/snapSpec'
import { DRAWINGS } from '../../../games/listenPlay/drawings'
import { stagePicture } from '../../listenNav'
import { voiceText } from '../../../voice/registry'
import { G1_SOLID_THINGS } from '../../../voice/packs/g1-shapes'
import { SKILLS } from '../../../tutoring/skills'
import { g1ShapesProblems, oldEmoji } from './g1Checks'

/**
 * Shape Grove, 1st grade (1.G.1–2): the drawings (closed, open, curved; any
 * colour, size and turn), the pieces that snap together, the solids that roll
 * and stack, and many seeds of every stage, worked out again from the
 * pictures (./g1Checks).
 */

afterEach(() => vi.restoreAllMocks())
// (many seeds of every stage: a busy machine needs more than the default 5 s)
vi.setConfig({ testTimeout: 60000 })

const area = (pts: readonly Pt[]) => Math.abs(pts.reduce((s, p, i) => s + p[0] * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * p[1], 0)) / 2
const side = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1])

describe('the shape drawings', () => {
  it('every drawing is in the art registry under its name, and the name reads back', () => {
    const all = allShapeArt()
    for (const a of all) {
      const name = shapeArtName(a)
      expect(DRAWINGS[name], name).toBeDefined()
      expect(parseShapeArt(name), name).toEqual(a)
    }
    for (let c = 0; c < 8; c++) expect(DRAWINGS[boxArtName(c)]).toBeDefined()
    // never turned 45°: a square turned half way reads as a "diamond"
    for (const t of SHAPE_TURNS) expect(Math.abs(t) % 90).not.toBe(45)
    // only shapes with straight sides (and the circle) are drawn open; only straight-sided ones curved
    for (const s of FLAWED.curved) expect(flatSides(s)).toBeGreaterThan(0)
  })

  it('the flat shapes have the sides they are named for', () => {
    expect(G1_FLATS.map((s) => [s, flatSides(s)])).toEqual([
      ['triangle', 3],
      ['rightTriangle', 3],
      ['thinTriangle', 3],
      ['square', 4],
      ['rectangle', 4],
      ['trapezoid', 4],
      ['pentagon', 5],
      ['hexagon', 6],
      ['circle', 0],
      ['oval', 0],
    ])
    const sq = FLAT_CORNERS.square!
    const sides = sq.map((p, i) => side(p, sq[(i + 1) % 4]))
    expect(Math.max(...sides) - Math.min(...sides)).toBeLessThan(0.01)
    const rect = FLAT_CORNERS.rectangle!
    expect(side(rect[0], rect[1]) / side(rect[1], rect[2])).toBeGreaterThan(1.8) // plainly not a square
  })
})

describe('the pieces that snap together', () => {
  it('each recipe’s two pieces make its shape exactly, without overlapping', () => {
    for (const r of RECIPES) {
      const def = RECIPE[r]
      const both = area(def.placed) + area(def.gap)
      const pts = [...def.placed, ...def.gap]
      // the shape they make is the convex hull of their corners; their areas add up to it
      const hull = (() => {
        const u = [...new Map(pts.map((p) => [`${p[0]},${p[1]}`, p])).values()].sort((a, b) => a[0] - b[0] || a[1] - b[1])
        const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
        const lo: Pt[] = []
        for (const p of u) {
          while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop()
          lo.push(p)
        }
        const up: Pt[] = []
        for (const p of [...u].reverse()) {
          while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop()
          up.push(p)
        }
        return [...lo.slice(0, -1), ...up.slice(0, -1)]
      })()
      expect(Math.abs(area(hull) - both) / both, r).toBeLessThan(0.01)
      const sides = { square: 4, rectangle: 4, triangle: 3, hexagon: 6, trapezoid: 4, circle: 0 }[def.makes]
      expect(hull.length, r).toBe(sides)
      // the gap is the piece its name says
      expect(def.gap.length, r).toBe({ triangle: 3, square: 4, rectangle: 4, trapezoid: 4, hexagon: 6, circle: 0 }[def.gapShape])
      // the decoys are other shapes (and never the gap's)
      for (const d of DECOYS[r]) {
        expect(d, r).not.toBe(def.gapShape)
        const piece = decoyPiece(d)
        if (piece) expect(piece.length === def.gap.length && Math.abs(area(piece) - area(def.gap)) < 1, `${r}: decoy ${d}`).toBe(false)
      }
      expect(MAKES_CARDS[r][0]).toBe(def.makes)
      expect(new Set(MAKES_CARDS[r]).size).toBe(3)
      const b = bbox(pts)
      expect(b.x0 >= -1 && b.x1 <= 161 && b.y0 >= -1 && b.y1 <= 121, r).toBe(true)
    }
  })

  it('a square from two triangles, a rectangle from two squares (the contract’s examples)', () => {
    expect([RECIPE.square2tri.gapShape, RECIPE.square2tri.makes]).toEqual(['triangle', 'square'])
    expect([RECIPE.rect2sq.gapShape, RECIPE.rect2sq.makes]).toEqual(['square', 'rectangle'])
    expect([RECIPE.bigTri.gapShape, RECIPE.bigTri.makes]).toEqual(['triangle', 'triangle'])
  })
})

describe('solids that roll and stack', () => {
  it('a sphere rolls, a cube and a box stack, a cylinder does both (the cone is never asked)', () => {
    expect(ROLLS).toEqual({ sphere: true, cylinder: true, cube: false, box: false })
    expect(STACKS).toEqual({ sphere: false, cylinder: true, cube: true, box: true })
  })

  it('things shaped like them are emoji every tablet draws', () => {
    for (const things of Object.values(G1_SOLID_THINGS)) for (const t of things) expect(oldEmoji(t.emoji), t.emoji).toBe(true)
  })

  it('the 1st-grade stage buttons’ pictures are emoji every tablet draws', () => {
    for (const id of ['g1-tens-1', 'g1-tens-2', 'g1-tens-3', 'g1-shares-1', 'g1-shares-2', 'g1-shares-3', 'g1-shapes-1', 'g1-shapes-2', 'g1-shapes-3']) {
      const pic = stagePicture({ id, kind: 'concept' })
      expect(pic, id).not.toBe('💡')
      expect(oldEmoji(pic), `${id}: ${pic}`).toBe(true)
    }
  })
})

const MODES: G1ShapesMode[] = ['attributes', 'compose', 'solids']

function round(mode: G1ShapesMode, seed: string, n = 12): ListenProblem[] {
  vi.spyOn(Math, 'random').mockImplementation(seededRng(seed))
  const p = makeG1ShapesProvider({ mode })
  return Array.from({ length: n }, () => p.next())
}

describe.each(MODES)('Shape Grove (1st grade) provider: %s', (mode) => {
  it('every question is right and fair over many seeds (worked out again from the pictures)', () => {
    for (let s = 0; s < 40; s++) {
      for (const q of round(mode, `g1shapes:${mode}:${s}`)) {
        expect(g1ShapesProblems(q), `${q.prompt} ${JSON.stringify(q.options)}`).toEqual([])
        expect(SKILLS[q.skill!.id], q.skill?.id).toBeDefined()
      }
    }
  })

  it('everything is said: the question, every card, every note, the snap help, the praise; nothing printed', () => {
    for (let s = 0; s < 10; s++) {
      for (const q of round(mode, `g1shapes-voice:${mode}:${s}`)) {
        expect(voiceText(q.speech!)).toBe(q.prompt)
        for (const c of q.pictureOptions ?? []) {
          if (c.speech) voiceText(c.speech)
          expect(c.picture.kind, q.prompt).not.toBe('word')
        }
        for (const n of q.notes ?? []) if (n) voiceText(n)
        for (const p of q.praise ?? []) voiceText(p)
        if (isSnapSpec(q.activity)) for (const ref of snapLines(q.speech, q.activity)) voiceText(ref)
      }
    }
  })

  it('never puts the answer in the same place three times running', () => {
    for (let s = 0; s < 10; s++) {
      const at = round(mode, `g1shapes-place:${mode}:${s}`, 30).map((q) => q.options.indexOf(q.answer))
      for (let i = 2; i < at.length; i++) expect(at[i] === at[i - 1] && at[i] === at[i - 2], `positions ${at.slice(i - 2, i + 1)}`).toBe(false)
    }
  })
})

describe('Shape Grove (1st grade): what changes and what doesn’t', () => {
  it('"Still a …?": the right card is turned or small (any colour); every card its own colour', () => {
    for (let s = 0; s < 30; s++) {
      for (const q of round('attributes', `still:${s}`).filter((x) => x.subtopic === 'still')) {
        const arts = q.pictureOptions!.map((c) => parseShapeArt((c.picture as { name: string }).name)!)
        const right = arts[q.options.indexOf(q.answer)]
        expect(right.turn !== 0 || right.small, q.prompt).toBe(true)
        expect(new Set(arts.map((a) => a.color)).size).toBe(arts.length)
        // and the wrong ones break what makes it that shape: open, curved, other sides, or stretched
        for (const a of arts) if (a !== right) expect(a.flaw || a.shape !== right.shape || a.shape === 'rectangle', JSON.stringify(a)).toBeTruthy()
      }
    }
  })

  it('the stages: attributes, then snapping shapes together, then solids', () => {
    const kinds = (mode: G1ShapesMode) => round(mode, `plan:${mode}`, 6).map((q) => q.subtopic)
    expect(kinds('attributes')).toEqual(['still', 'still', 'sides', 'still', 'noCorners', 'sides'])
    expect(kinds('compose')).toEqual(['fill', 'makes', 'fill', 'makes', 'fill', 'makes'])
    expect(kinds('solids')).toEqual(['roll', 'likeShape', 'stack', 'rollStack', 'still', 'stackNoRoll'])
  })
})
